const baileysManager = require('../services/baileysManager');
const fs = require('fs');
const path = require('path');

exports.setupSessions = async (req, res) => {
  try {
    console.log('🚀 Setting up WhatsApp Bridge Backend...');
    
    const results = {
      sessionsDir: false,
      cleanedSessions: 0,
      envVars: {},
      gitignore: false
    };
    
    // 1. Create sessions directory
    const sessionsDir = './sessions';
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
      console.log('✅ Created sessions directory');
      results.sessionsDir = 'created';
    } else {
      console.log('ℹ️ Sessions directory already exists');
      results.sessionsDir = 'exists';
    }
    
    // 2. Clean any existing corrupted sessions
    try {
      const files = fs.readdirSync(sessionsDir);
      if (files.length > 0) {
        console.log(`🧹 Found ${files.length} existing session(s), cleaning...`);
        files.forEach(file => {
          const filePath = path.join(sessionsDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`   Cleaned session: ${file}`);
            results.cleanedSessions++;
          }
        });
        console.log('✅ All existing sessions cleaned');
      } else {
        console.log('ℹ️ No existing sessions to clean');
      }
    } catch (error) {
      console.log('⚠️ Error cleaning sessions:', error.message);
    }
    
    // 3. Check environment variables
    console.log('🔧 Checking environment variables...');
    const requiredEnvVars = [
      'EDGE_UPDATE_STATUS_URL',
      'SUPABASE_KEY',
      'SUPABASE_URL',
      'PORT'
    ];
    
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: ${process.env[varName].substring(0, 20)}...`);
        results.envVars[varName] = 'present';
      } else {
        console.log(`❌ ${varName}: Missing`);
        results.envVars[varName] = 'missing';
      }
    });
    
    // 4. Create .gitignore for sessions if it doesn't exist
    const gitignorePath = './.gitignore';
    let gitignoreContent = '';
    
    try {
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      }
      
      if (!gitignoreContent.includes('sessions/')) {
        const newGitignore = gitignoreContent + '\n# WhatsApp session files\nsessions/\n*.session\n';
        fs.writeFileSync(gitignorePath, newGitignore);
        console.log('✅ Updated .gitignore to exclude session files');
        results.gitignore = 'updated';
      } else {
        console.log('ℹ️ .gitignore already configured for sessions');
        results.gitignore = 'exists';
      }
    } catch (error) {
      console.log('⚠️ Error updating .gitignore:', error.message);
      results.gitignore = 'error';
    }
    
    console.log('🎉 Setup complete! Backend is ready.');
    
    res.json({
      success: true,
      message: 'Setup completed successfully',
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Setup failed',
      details: error.message
    });
  }
};

function getUserId(req) {
  return req?.params?.userId || req?.query?.userId || req?.body?.userId;
}

exports.startSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ startSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.startSession(userId);
    console.log(`✅ Session started for ${userId}`);
    res.json({ success: true, message: 'Session started' });
  } catch (error) {
    console.error('❌ Error in startSession:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

exports.stopSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ stopSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.stopSession(userId);
    console.log(`✅ Session stopped for ${userId}`);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('❌ Error in stopSession:', error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};

// ✅ New: Restart Session
exports.restartSession = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ restartSession: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await baileysManager.restartSession(userId);
    console.log(`✅ Session restarted for ${userId}`);
    res.json({ success: true, message: 'Session restarted' });
  } catch (error) {
    console.error('❌ Error in restartSession:', error);
    res.status(500).json({ error: 'Failed to restart session' });
  }
};

exports.getStatus = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getStatus: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const status = baileysManager.getStatus(userId);
    console.log(`ℹ️ Status for ${userId}: ${status}`);
    res.json({ userId, connected: status });
  } catch (error) {
    console.error('❌ Error in getStatus:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

exports.getQR = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getQR: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const qr = baileysManager.getQR(userId);
    console.log(`ℹ️ QR fetched for ${userId}`);
    res.json({ userId, qr });
  } catch (error) {
    console.error('❌ Error in getQR:', error);
    res.status(500).json({ error: 'Failed to get QR' });
  }
};

exports.getQRStatus = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.error('❌ getQRStatus: Missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const connected = baileysManager.getStatus(userId);
    const qr = baileysManager.getQR(userId);
    console.log(`ℹ️ QRStatus for ${userId}: connected=${connected}`);
    res.json({ userId, connected, qr });
  } catch (error) {
    console.error('❌ Error in getQRStatus:', error);
    res.status(500).json({ error: 'Failed to get QR status' });
  }
};

// ✅ NEW: Send Message endpoint for AI responses
exports.sendMessage = async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    console.error('❌ sendMessage: Missing userId or message');
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  try {
    await baileysManager.sendMessage(userId, message);
    console.log(`✅ Message sent to WhatsApp for ${userId}`);
    res.json({ success: true, message: 'Message sent via WhatsApp' });
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
