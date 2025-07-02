const baileysManager = require('../services/baileysManager');

// ✅ Utility: extract userId
function getUserId(req) {
  return req?.params?.userId || req?.query?.userId || req?.body?.userId;
}

// ✅ Start WhatsApp Session
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

// ✅ Stop WhatsApp Session
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

// ✅ Get WhatsApp Connection Status
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

// ✅ Get QR Code
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

// ✅ Get Combined QR + Status
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
