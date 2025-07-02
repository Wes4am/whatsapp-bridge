require('dotenv').config();
const express = require('express');
const logger = require('pino')();
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Bridge Server running on port ${PORT}`);
});
