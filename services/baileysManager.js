const { useMultiFileAuthState, makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const supabaseClient = require('./supabaseClient');

const logger = pino();
const userSessions = new Map();

// Add configuration constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 3000; // 3 seconds
const QR_TIMEOUT = 30000; // 30 seconds for QR generation

async function startSession(userId) {
  logger.info(`🚀 Starting session for ${userId}`);
  
  // 🔥 Force stop any existing session
  if (userSessions.has(userId)) {
    logger.warn(`Existing session found for ${userId}, stopping before restart`);
    await stopSession(userId);
    // Add delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const sessionPath = `./sessions/${userId}`;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      // Better connection settings
      browser: ['WhatsApp Bridge', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      emitOwnEvents: false,
      markOnlineOnConnect: false,
    });

    userSessions.set(userId, {
      sock,
      qr: null,
      connected: false,
      retryCount: 0,
      lastQRTime: null,
    });

    sock.ev.on('connection.update', async (update) => {
      const session = userSessions.get(userId);
      if (!session) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          session.qr = await QRCode.toDataURL(qr);
          session.lastQRTime = Date.now();
          logger.info(`✅ QR generated for ${userId}`);
        } catch (qrError) {
          logger.error(`Failed to generate QR for ${userId}:`, qrError);
        }
      }

      if (connection === 'open') {
        session.connected = true;
        session.qr = null;
        session.retryCount = 0;
        await updateSupabaseStatus(userId, 'connected');
        logger.info(`✅ WhatsApp connected for ${userId}`);
      }

      if (connection === 'close') {
        session.connected = false;
        session.qr = null;
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        logger.warn(`Connection closed for ${userId}, status: ${statusCode}, shouldReconnect: ${shouldReconnect}`);
        
        if (shouldReconnect && session.retryCount < MAX_RETRY_ATTEMPTS) {
          session.retryCount++;
          logger.warn(`Reconnecting for ${userId} (attempt ${session.retryCount}/${MAX_RETRY_ATTEMPTS})`);
          
          // Add exponential backoff
          const delay = RETRY_DELAY * Math.pow(2, session.retryCount - 1);
          setTimeout(() => {
            if (userSessions.has(userId)) {
              startSession(userId);
            }
          }, delay);
        } else {
          await updateSupabaseStatus(userId, 'disconnected');
          userSessions.delete(userId);
          
          if (statusCode === DisconnectReason.loggedOut) {
            logger.warn(`❌ User logged out: ${userId}`);
          } else {
            logger.warn(`❌ Session closed after max retries for ${userId}`);
          }
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      if (!m.messages || !m.messages[0]) return;
      const message = m.messages[0];
      if (message.key.fromMe) return;

      try {
        await supabaseClient.forwardMessageToWebhook(userId, message);
        logger.info(`✅ Forwarded message to webhook relay for ${userId}`);
      } catch (error) {
        logger.error(`❌ Failed to forward message to webhook relay for ${userId}`, error);
      }
    });

    // Set a timeout for QR generation
    setTimeout(() => {
      const session = userSessions.get(userId);
      if (session && !session.connected && !session.qr) {
        logger.warn(`⚠️ No QR generated within ${QR_TIMEOUT}ms for ${userId}`);
      }
    }, QR_TIMEOUT);

  } catch (error) {
    logger.error(`Failed to start session for ${userId}:`, error);
    userSessions.delete(userId);
    throw error;
  }
}

async function stopSession(userId) {
  const session = userSessions.get(userId);
  if (session) {
    try {
      if (session.sock && session.sock.logout) {
        await session.sock.logout();
      }
    } catch (error) {
      logger.warn(`⚠️ Error while logging out for ${userId}: ${error.message}`);
    }
    userSessions.delete(userId);
    await updateSupabaseStatus(userId, 'disconnected');
    logger.info(`✅ Logged out and cleared session for ${userId}`);
  } else {
    logger.info(`ℹ️ No active session found for ${userId} to stop`);
  }
}

async function restartSession(userId) {
  logger.info(`🔄 Restarting session for ${userId}`);
  await stopSession(userId);
  // Add delay before restarting
  await new Promise(resolve => setTimeout(resolve, 3000));
  await startSession(userId);
}

function getStatus(userId) {
  const session = userSessions.get(userId);
  return session ? session.connected : false;
}

function getQR(userId) {
  const session = userSessions.get(userId);
  if (!session) return null;
  
  // Check if QR is still valid (expires after 2 minutes)
  if (session.qr && session.lastQRTime) {
    const isExpired = (Date.now() - session.lastQRTime) > 120000; // 2 minutes
    if (isExpired) {
      session.qr = null;
      logger.info(`QR expired for ${userId}`);
      return null;
    }
  }
  
  return session.qr;
}

async function updateSupabaseStatus(userId, status) {
  const edgeFunctionUrl = process.env.EDGE_UPDATE_STATUS_URL;
  if (!edgeFunctionUrl) {
    logger.warn('⚠️ No EDGE_UPDATE_STATUS_URL configured - skipping status update');
    return;
  }

  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await axios.post(edgeFunctionUrl, { 
        userId, 
        status 
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      logger.info(`✅ Updated status in Supabase for ${userId}: ${status}`);
      return;
    } catch (error) {
      attempts++;
      logger.error(`❌ Attempt ${attempts} - Failed to update status in Supabase for ${userId}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: edgeFunctionUrl
      });
      
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
  
  logger.error(`❌ All ${maxRetries} attempts failed to update Supabase status for ${userId}`);
}

async function sendMessage(userId, message) {
  const session = userSessions.get(userId);
  if (!session || !session.sock) {
    throw new Error(`No active session for user ${userId}`);
  }

  if (!session.connected) {
    throw new Error(`Session for user ${userId} is not connected`);
  }

  try {
    // Validate message structure
    if (!message || !message.to || !message.body || !message.body.text) {
      throw new Error('Invalid message structure. Expected: { to: string, body: { text: string } }');
    }

    await session.sock.sendMessage(message.to, { text: message.body.text });
    logger.info(`✅ Message sent successfully for ${userId}`);
  } catch (error) {
    logger.error(`❌ Failed to send message for ${userId}:`, error);
    throw error;
  }
}

// Add utility function to get session info
function getSessionInfo(userId) {
  const session = userSessions.get(userId);
  if (!session) return null;
  
  return {
    connected: session.connected,
    hasQR: !!session.qr,
    retryCount: session.retryCount,
    lastQRTime: session.lastQRTime
  };
}

module.exports = {
  startSession,
  stopSession,
  restartSession,
  getStatus,
  getQR,
  sendMessage,
  getSessionInfo,
};
