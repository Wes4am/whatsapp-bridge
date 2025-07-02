require('dotenv').config();

module.exports = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  EDGE_UPDATE_STATUS_URL: process.env.EDGE_UPDATE_STATUS_URL,
};
