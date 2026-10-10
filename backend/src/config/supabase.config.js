// config/supabase.config.js
// Kết nối tới Supabase. Backend dùng SERVICE ROLE KEY nên bỏ qua RLS -> bắt
// buộc phải bật RLS cho bảng users để client không đọc trực tiếp được bảng này.

const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env.config');

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
