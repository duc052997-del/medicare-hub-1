// utils/helper.js
// Các hàm dùng chung trong toàn bộ backend: format ngày tháng, tạo token...

const jwt = require('jsonwebtoken');
const { env } = require('../config/env.config');

// Format ngày tháng kiểu dd/mm/yyyy
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Tạo JWT token cho phiên đăng nhập (UC002 - bước 7)
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

module.exports = { formatDate, generateToken };
