const { useMultiFileAuthState, makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const supabaseClient = require('./supabaseClient');

const logger = pino();
const userSessions = new Map();

async function startSession(userId) {
  // 🔥 Force stop any existing session
  if (userSessions.has(userId)) {
    logger.warn(`Existing session found for ${userId}, stopping before restart`);
    await stopSession(userId);
  }

  const sessionPath = `./sessions/${userId}`;
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  userSessions.set(userId, {
    sock,
    qr: null,
    connected: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const session = userSessions.get(userId);
    if (!session) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qr = await QRCode.toDataURL(qr);
      logger.info(`✅ QR generated for ${userId}`);
    }

    if (connection === 'open') {
      session.connected = true;
      session.qr = null;
      await updateSupabaseStatus(userId, 'connected');
      logger.info(`✅ WhatsApp connected for ${userId}`);
    }

    if (connection === 'close') {
      session.connected = false;
      session.qr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        logger.warn(`Reconnecting for ${userId}`);
        startSession(userId);
      } else {
        await updateSupabaseStatus(userId, 'disconnected');
        userSessions.delete(userId);
        logger.warn(`❌ Session closed for ${userId}`);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages || !m.messages[0]) return;
    const message = m.messages[0];
    if (message.key.fromMe) return;

    const webhookUrl = await supabaseClient.getWebhookURL(userId);
    if (!webhookUrl) {
      logger.warn(`No webhook found for ${userId}`);
      return;
    }

    const payload = {
      from: message.key.remoteJid,
      text: message.message.conversation || '',
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(webhookUrl, payload);
      logger.info(`✅ Forwarded message for ${userId} to webhook`);
    } catch (error) {
      logger.error(`❌ Failed to send to webhook for ${userId}`, error);
    }
  });
}

async function stopSession(userId) {
  const session = userSessions.get(userId);
  if (session) {
    try {
      await session.sock.logout();
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

// ✅ Extra utility to force a restart
async function restartSession(userId) {
  await stopSession(userId);
  await startSession(userId);
}

function getStatus(userId) {
  const session = userSessions.get(userId);
  return session ? session.connected : false;
}

function getQR(userId) {
  const session = userSessions.get(userId);
  return session ? session.qr : null;
}

async function updateSupabaseStatus(userId, status) {
  const edgeFunctionUrl = process.env.EDGE_UPDATE_STATUS_URL;
  if (!edgeFunctionUrl) {
    logger.warn('No EDGE_UPDATE_STATUS_URL configured');
    return;
  }

  try {
    await axios.post(edgeFunctionUrl, { userId, status });
    logger.info(`✅ Updated status in Supabase for ${userId}: ${status}`);
  } catch (error) {
    logger.error(`❌ Failed to update status in Supabase for ${userId}`, error);
  }
}

module.exports = {
  startSession,
  stopSession,
  restartSession,
  getStatus,
  getQR,
};
