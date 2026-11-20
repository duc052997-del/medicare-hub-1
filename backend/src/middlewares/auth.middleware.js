// middlewares/auth.middleware.js
// Middleware check token JWT trước khi cho vào các route cần đăng nhập.

const jwt = require('jsonwebtoken');
const { env } = require('../config/env.config');
const { fail } = require('../utils/response');
const tokenBlacklist = require('../utils/tokenBlacklist');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' '); // format: "Bearer <token>"

  if (!token || scheme !== 'Bearer') {
    return fail(res, 401, 'Không tìm thấy token, vui lòng đăng nhập');
  }

  if (tokenBlacklist.isBlacklisted(token)) {
    return fail(res, 401, 'Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại', {
      code: 'TOKEN_REVOKED'
    });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    req.token = token;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', {
        code: 'TOKEN_EXPIRED'
      });
    }
    return fail(res, 401, 'Token không hợp lệ', { code: 'TOKEN_INVALID' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return fail(res, 403, 'Bạn không có quyền truy cập chức năng này');
  }
  return next();
};

module.exports = { verifyToken, requireRole };
