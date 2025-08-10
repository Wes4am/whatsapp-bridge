const { useMultiFileAuthState, makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const supabaseClient = require('./supabaseClient');

const logger = pino();
const userSessions = new Map();

// Configuration constants
const MAX_RETRY_ATTEMPTS = 2; // Reduced retries
const RETRY_DELAY = 3000; // 3 seconds
const QR_TIMEOUT = 30000; // 30 seconds for QR generation

// Ensure sessions directory exists
function ensureSessionsDirectory() {
  const sessionsDir = './sessions';
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
    logger.info('📁 Created sessions directory');
  }
}

// Clean corrupted session files
async function cleanSession(userId) {
  const sessionPath = `./sessions/${userId}`;
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      logger.info(`🧹 Cleaned corrupted session files for ${userId}`);
    }
  } catch (error) {
    logger.error(`Failed to clean session for ${userId}:`, error);
  }
}

async function startSession(userId) {
  logger.info(`🚀 Starting session for ${userId}`);
  
  // Ensure sessions directory exists
  ensureSessionsDirectory();
  
  // Force stop any existing session
  if (userSessions.has(userId)) {
    logger.warn(`Existing session found for ${userId}, stopping before restart`);
    await stopSession(userId);
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
      sessionCorrupted: false,
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
        session.sessionCorrupted = false;
        await updateSupabaseStatus(userId, 'connected');
        logger.info(`✅ WhatsApp connected for ${userId}`);
      }

      if (connection === 'close') {
        session.connected = false;
        session.qr = null;
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        logger.warn(`Connection closed for ${userId}, status: ${statusCode}`);
        
        // Handle different disconnect reasons
        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          // Session is corrupted/invalid - clean it and start fresh
          logger.warn(`❌ Session corrupted for ${userId} (status: ${statusCode}) - cleaning session`);
          session.sessionCorrupted = true;
          await cleanSession(userId);
          await updateSupabaseStatus(userId, 'disconnected');
          userSessions.delete(userId);
          
        } else if (statusCode !== DisconnectReason.connectionClosed && session.retryCount < MAX_RETRY_ATTEMPTS) {
          // Retry for other connection issues
          session.retryCount++;
          logger.warn(`Reconnecting for ${userId} (attempt ${session.retryCount}/${MAX_RETRY_ATTEMPTS})`);
          
          const delay = RETRY_DELAY * session.retryCount;
          setTimeout(() => {
            if (userSessions.has(userId)) {
              startSession(userId);
            }
          }, delay);
          
        } else {
          // Max retries reached or permanent disconnect
          await updateSupabaseStatus(userId, 'disconnected');
          userSessions.delete(userId);
          logger.warn(`❌ Session closed permanently for ${userId}`);
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

    // Set timeout for QR generation
    setTimeout(() => {
      const session = userSessions.get(userId);
      if (session && !session.connected && !session.qr) {
        logger.warn(`⚠️ No QR generated within ${QR_TIMEOUT}ms for ${userId}`);
      }
    }, QR_TIMEOUT);

  } catch (error) {
    logger.error(`Failed to start session for ${userId}:`, error);
    // If session creation fails, clean it and try once more
    await cleanSession(userId);
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
  
  // Clean any corrupted session data first
  await cleanSession(userId);
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
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!edgeFunctionUrl) {
    logger.warn('⚠️ No EDGE_UPDATE_STATUS_URL configured - skipping status update');
    return;
  }

  if (!supabaseKey) {
    logger.warn('⚠️ No SUPABASE_KEY configured - skipping status update');
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
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        }
      });
      
      logger.info(`✅ Updated status in Supabase for ${userId}: ${status} (Status: ${response.status})`);
      return;
    } catch (error) {
      attempts++;
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        attempt: attempts
      };
      
      logger.error(`❌ Attempt ${attempts} - Failed to update status in Supabase for ${userId}:`, errorDetails);
      
      if (attempts < maxRetries) {
        const delay = 1000 * attempts;
        logger.info(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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

// Utility function to clean all sessions (for debugging)
async function cleanAllSessions() {
  try {
    const sessionsDir = './sessions';
    if (fs.existsSync(sessionsDir)) {
      fs.rmSync(sessionsDir, { recursive: true, force: true });
      logger.info('🧹 Cleaned all session files');
    }
    ensureSessionsDirectory();
  } catch (error) {
    logger.error('Failed to clean all sessions:', error);
  }
}

// Get session info for debugging
function getSessionInfo(userId) {
  const session = userSessions.get(userId);
  if (!session) return null;
  
  return {
    connected: session.connected,
    hasQR: !!session.qr,
    retryCount: session.retryCount,
    lastQRTime: session.lastQRTime,
    sessionCorrupted: session.sessionCorrupted
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
  cleanAllSessions,
  cleanSession
};
