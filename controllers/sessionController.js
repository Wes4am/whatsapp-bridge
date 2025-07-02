const baileysManager = require('../services/baileysManager');

exports.startSession = async (req, res) => {
  const userId = req.params?.userId || req.body?.userId;
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
  const userId = req.params?.userId || req.body?.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    await baileysManager.stopSession(userId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};

exports.getStatus = (reqOrUserId, res) => {
  try {
    let userId;

    if (typeof reqOrUserId === 'string') {
      // Called as getStatus(userId)
      userId = reqOrUserId;
    } else {
      // Called as Express handler
      userId = reqOrUserId.params?.userId || reqOrUserId.query?.userId;
    }

    if (!userId) {
      if (res) return res.status(400).json({ error: 'userId required' });
      throw new Error('userId required');
    }

    const connected = baileysManager.getStatus(userId);

    if (res) {
      return res.json({ userId, connected });
    } else {
      return connected;
    }
  } catch (error) {
    console.error(error);
    if (res) {
      res.status(500).json({ error: 'Failed to get status' });
    } else {
      throw error;
    }
  }
};

exports.getQR = (reqOrUserId, res) => {
  try {
    let userId;

    if (typeof reqOrUserId === 'string') {
      userId = reqOrUserId;
    } else {
      userId = reqOrUserId.params?.userId || reqOrUserId.query?.userId;
    }

    if (!userId) {
      if (res) return res.status(400).json({ error: 'userId required' });
      throw new Error('userId required');
    }

    const qr = baileysManager.getQR(userId);

    if (res) {
      return res.json({ userId, qr });
    } else {
      return qr;
    }
  }
