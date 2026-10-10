// server.js
// File gốc để chạy server backend (Node.js + Express).

const express = require('express');
const cors = require('cors');

const { env, validateEnv } = require('./config/env.config');

// Thiếu biến môi trường bắt buộc thì dừng server ngay tại đây
validateEnv();

const routes = require('./routes');
const { fail } = require('./utils/response');

const app = express();

// CORS: chỉ cho phép origin của frontend (khai báo trong .env)
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : {}));

// Middlewares chung. Giới hạn dung lượng body cho gọn, form đăng nhập rất nhẹ.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Route test cho biết server sống hay chết
app.get('/', (req, res) => {
  res.json({ message: 'Quan Ly Phong Kham API is running...' });
});

// Gắn toàn bộ route API vào prefix /api
app.use('/api', routes);

// Gọi sai đường dẫn
app.use((req, res) => {
  return fail(res, 404, 'Không tìm thấy đường dẫn API này');
});

// Bắt mọi lỗi lọt ra ngoài controller (vd: JSON gửi lên bị sai cú pháp)
app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    return fail(res, 400, 'Dữ liệu gửi lên không đúng định dạng JSON');
  }
  console.error('[server]', error);
  return fail(res, 500, 'Đã có lỗi xảy ra, vui lòng thử lại sau');
});

app.listen(env.PORT, () => {
  console.log(`Server dang chay tai http://localhost:${env.PORT}`);
});
