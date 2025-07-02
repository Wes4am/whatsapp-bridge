const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// ✅ Get QR and Status together
router.get('/:userId/qr-status', sessionController.getQRStatus);

// ✅ Start Session (connect)
router.post('/:userId/connect', sessionController.startSession);

// ✅ Stop Session (disconnect)
router.post('/:userId/disconnect', sessionController.stopSession);

// ✅ Get only Status
router.get('/:userId/status', sessionController.getStatus);

// ✅ Get only QR
router.get('/:userId/qr', sessionController.getQR);

module.exports = router;
