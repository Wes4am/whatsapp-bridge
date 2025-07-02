const baileysManager = require('../services/baileysManager');

exports.startSession = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    await baileysManager.startSession(userId);
    res.json({ success: true, message: 'Session started' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

exports.stopSession = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    await baileysManager.stopSession(userId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};

exports.getStatus = (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const status = baileysManager.getStatus(userId);
    res.json({ userId, connected: status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

exports.getQR = (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const qr = baileysManager.getQR(userId);
    res.json({ userId, qr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get QR' });
  }
};
