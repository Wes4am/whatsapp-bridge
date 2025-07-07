const baileysManager = require('../services/baileysManager');

function getUserId(req) {
  return req?.params?.userId || req?.query?.userId || req?.body?.userId;
}

exports.startSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ startSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.startSession(userId);
    console.log(`✅ Session started for ${userId}`);
    res.json({ success: true, message: 'Session started' });
  } catch (error) {
    console.error('❌ Error in startSession:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

exports.stopSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ stopSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.stopSession(userId);
    console.log(`✅ Session stopped for ${userId}`);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('❌ Error in stopSession:', error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};

// ✅ New: Restart Session
exports.restartSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ restartSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.restartSession(userId);
    console.log(`✅ Session restarted for ${userId}`);
    res.json({ success: true, message: 'Session restarted' });
  } catch (error) {
    console.error('❌ Error in restartSession:', error);
    res.status(500).json({ error: 'Failed to restart session' });
  }
};

exports.getStatus = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getStatus: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const status = baileysManager.getStatus(userId);
    console.log(`ℹ️ Status for ${userId}: ${status}`);
    res.json({ userId, connected: status });
  } catch (error) {
    console.error('❌ Error in getStatus:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

exports.getQR = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getQR: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const qr = baileysManager.getQR(userId);
    console.log(`ℹ️ QR fetched for ${userId}`);
    res.json({ userId, qr });
  } catch (error) {
    console.error('❌ Error in getQR:', error);
    res.status(500).json({ error: 'Failed to get QR' });
  }
};

exports.getQRStatus = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getQRStatus: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const connected = baileysManager.getStatus(userId);
    const qr = baileysManager.getQR(userId);
    console.log(`ℹ️ QRStatus for ${userId}: connected=${connected}`);
    res.json({ userId, connected, qr });
  } catch (error) {
    console.error('❌ Error in getQRStatus:', error);
    res.status(500).json({ error: 'Failed to get QR status' });
  }
};

// ✅ NEW: Send Message endpoint for AI responses
exports.sendMessage = async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    console.error('❌ sendMessage: Missing userId or message');
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  try {
    await baileysManager.sendMessage(userId, message);
    console.log(`✅ Message sent to WhatsApp for ${userId}`);
    res.json({ success: true, message: 'Message sent via WhatsApp' });
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
