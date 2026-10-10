// config/env.config.js
// Gom biến môi trường về 1 chỗ và kiểm tra ngay lúc khởi động server.

require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',

  CORS_ORIGIN: process.env.CORS_ORIGIN || '',

  isProduction: process.env.NODE_ENV === 'production'
};

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];

const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !env[key]);

  if (missing.length > 0) {
    console.error(
      `[env] Thiếu biến môi trường bắt buộc: ${missing.join(', ')}\n` +
        '[env] Copy file .env.example thành .env rồi điền đầy đủ giá trị.'
    );
    process.exit(1);
  }

  if (env.JWT_SECRET === 'your_secret_key_here') {
    console.warn(
      '[env] JWT_SECRET đang là giá trị mặc định trong .env.example, nhớ đổi sang chuỗi bí mật thật.'
    );
  }
};

module.exports = { env, validateEnv };
