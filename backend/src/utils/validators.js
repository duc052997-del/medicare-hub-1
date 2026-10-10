// utils/validators.js
// Các hằng số và hàm kiểm tra dùng chung cho UC001, UC002...
// Đặt ở đây để mỗi UC không phải tự khai báo lại.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt chỉ dùng 72 byte đầu của mật khẩu, nên chặn luôn ở mức này
const MAX_PASSWORD_LENGTH = 72;
const SALT_ROUNDS = 10;

const normalizeEmail = (email) => email.trim().toLowerCase();
const isValidEmail = (email) => EMAIL_REGEX.test(email);

module.exports = {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SALT_ROUNDS,
  normalizeEmail,
  isValidEmail
};
