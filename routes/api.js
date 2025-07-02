const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/sessionController');
const qrController = require('../controllers/qrController');

// Start Session
router.post('/start-session', sessionController.startSession);

// Stop Session
router.post('/stop-session', sessionController.stopSession);

// Get Status
router.get('/status/:userId', sessionController.getStatus);

// Get QR
router.get('/qr/:userId', qrController.getQR);

module.exports = router;
