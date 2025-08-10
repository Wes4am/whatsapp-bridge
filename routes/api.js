const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// ✅ Setup endpoint (NEW - add this line)
router.post('/setup', sessionController.setupSessions);

// ✅ Get QR and Status together
router.get('/:userId/qr-status', sessionController.getQRStatus);

// ✅ Start Session (connect)
router.post('/:userId/connect', sessionController.startSession);

// ✅ Stop Session (disconnect)
router.post('/:userId/disconnect', sessionController.stopSession);

// ✅ Restart Session
router.post('/:userId/restart', sessionController.restartSession);

// ✅ Get only Status
router.get('/:userId/status', sessionController.getStatus);

// ✅ Get only QR
router.get('/:userId/qr', sessionController.getQR);

// ✅ Receives a Message
router.post('/send-message', sessionController.sendMessage);

module.exports = router;
