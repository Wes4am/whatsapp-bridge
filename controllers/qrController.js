const baileysManager = require('../services/baileysManager');

exports.startSession = async (req, res) => {
  const { userId } = req.body;
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

exports.getStatus = (req, res) => {
  const userId = req.params.userId;
  const status = baileysManager.getStatus(userId);
  res.json({ userId, connected: status });
};
