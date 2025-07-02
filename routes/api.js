const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/sessionController');

// Get QR and Status together
router.get('/:userId/qr-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const connected = sessionController.getStatus(userId);
    const qr = sessionController.getQR(userId);
    res.json({ connected, qr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Session (connect)
router.post('/:userId/connect', async (req, res) => {
  try {
    const { userId } = req.params;
    await sessionController.startSession({ body: { userId } }, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop Session (disconnect)
router.post('/:userId/disconnect', async (req, res) => {
  try {
    const { userId } = req.params;
    await sessionController.stopSession({ body: { userId } }, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get only Status
router.get('/:userId/status', (req, res) => {
  try {
    const { userId } = req.params;
    const connected = sessionController.getStatus(userId);
    res.json({ connected });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
