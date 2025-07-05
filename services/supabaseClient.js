const axios = require('axios');
const { SUPABASE_URL, SUPABASE_KEY } = require('../config');
const logger = require('pino')();

async function getWebhookURL(userId) {
  try {
    const { data } = await axios.get(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (data && data.length > 0) return data[0].webhook_url;
    return null;
  } catch (error) {
    logger.error('Failed to fetch webhook from Supabase', error);
    return null;
  }
}

async function updateStatus(userId, status) {
  try {
    await axios.patch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,  // Changed from 'users' to 'profiles'
      { whatsapp_status: status },
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`Updated status for ${userId} to ${status}`);
  } catch (error) {
    logger.error('Failed to update status in Supabase', error);
  }
}

async function forwardMessageToWebhook(userId, message) {
  try {
    logger.info(`📨 Forwarding message to webhook relay for user: ${userId}`);

    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/whatsapp-webhook-relay`,
      {
        userId,
        message
      },
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Message forwarded to relay successfully`);
    return response.data;
  } catch (error) {
    logger.error('❌ Failed to forward message to relay:', error?.response?.data || error.message);
    return null;
  }
}

module.exports = {
  getWebhookURL,
  updateStatus,
  forwardMessageToWebhook
};
