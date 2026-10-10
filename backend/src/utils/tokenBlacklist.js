// utils/tokenBlacklist.js
// Lưu các token đã đăng xuất (UC003) để chặn dùng lại, dù JWT vốn stateless.
// Lưu trong bộ nhớ, đủ cho đồ án / 1 server.

const blacklist = new Map();

const add = (token, expiresAtSeconds) => {
  const expiresAtMs = expiresAtSeconds ? expiresAtSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  blacklist.set(token, expiresAtMs);
};

const isBlacklisted = (token) => {
  const expiresAtMs = blacklist.get(token);
  if (!expiresAtMs) return false;

  if (expiresAtMs <= Date.now()) {
    blacklist.delete(token);
    return false;
  }
  return true;
};

setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAtMs] of blacklist) {
    if (expiresAtMs <= now) blacklist.delete(token);
  }
}, 10 * 60 * 1000).unref();

module.exports = { add, isBlacklisted };
