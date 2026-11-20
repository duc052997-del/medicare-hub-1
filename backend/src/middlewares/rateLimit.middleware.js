// middlewares/rateLimit.middleware.js
// Giới hạn số lần gọi API trong 1 khoảng thời gian, chống dò mật khẩu (brute-force).

const { fail } = require('../utils/response');

const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits) {
      if (value.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const email = (req.body && req.body.email ? String(req.body.email) : '')
      .trim()
      .toLowerCase();
    const key = `${req.ip}|${email}`;

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const seconds = Math.ceil((entry.resetAt - now) / 1000);
      const waitText =
        seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
      res.set('Retry-After', String(seconds));
      return fail(res, 429, `${message}, vui lòng thử lại sau ${waitText}`);
    }

    return next();
  };
};

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Bạn đã thử đăng nhập sai quá nhiều lần'
});

module.exports = { createRateLimiter, loginLimiter };
