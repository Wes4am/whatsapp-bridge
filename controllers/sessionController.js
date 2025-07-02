const baileysManager = require('../services/baileysManager');

// ✅ Start session (generate new QR)
exports.startSession = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    await baileysManager.startSession(userId);
    const qr = baileysManager.getQR(userId);
    res.json({ success: true, message: 'Session started', connected: false, qr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

// ✅ Stop session (logout WhatsApp)
exports.stopSession = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    await baileysManager.stopSession(userId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};

// ✅ Get connection status
exports.getStatus = (req, res) => {
  const userId = req.params.userId;
  const connected = baileysManager.getStatus(userId);
  res.json({ userId, connected });
};

// ✅ Get QR code (for dashboard polling)
exports.getQR = (req, res) => {
  const userId = req.params.userId;
  const connected = baileysManager.getStatus(userId);
  const qr = baileysManager.getQR(userId);
  res.json({ userId, connected, qr });
};
