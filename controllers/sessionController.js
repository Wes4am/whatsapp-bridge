const baileysManager = require('../services/baileysManager');

// ✅ Start WhatsApp Session
exports.startSession = async (req, res) => {
  try {
    const userId = req?.params?.userId;
    if (!userId) {
      console.error('❌ startSession: Missing userId in path params');
      return res.status(400).json({ error: 'Missing userId in path' });
    }

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
  try {
    const userId = req?.params?.userId;
    if (!userId) {
      console.error('❌ stopSession: Missing userId in path params');
      return res.status(400).json({ error: 'Missing userId in path' });
    }

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
  try {
    const userId = req?.params?.userId;
    if (!userId) {
      console.error('❌ getStatus: Missing userId in path params');
      return res.status(400).json({ error: 'Missing userId in path' });
    }

    const status = baileysManager.getStatus(userId);
    console.log(`ℹ️ Status for ${userId}: ${status}`);
    res.json({ userId, connected: status });

  } catch (error) {
    console.error('❌ Error in getStatus:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

// ✅ Get QR Code for WhatsApp Connection
exports.getQR = (req, res) => {
  try {
    const userId = req?.params?.userId;
    if (!userId) {
      console.error('❌ getQR: Missing userId in path params');
      return res.status(400).json({ error: 'Missing userId in path' });
    }

    const qr = baileysManager.getQR(userId);
    console.log(`ℹ️ QR fetched for ${userId}`);
    res.json({ userId, qr });

  } catch (error) {
    console.error('❌ Error in getQR:', error);
    res.status(500).json({ error: 'Failed to get QR' });
  }
};
