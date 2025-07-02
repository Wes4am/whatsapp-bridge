const baileysManager = require('../services/baileysManager');

exports.getQR = async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const qrData = await baileysManager.getQR(userId);
    if (!qrData) {
      return res.status(404).json({ error: 'QR not found or session already connected' });
    }

    res.json({
      userId,
      qr: qrData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
};
