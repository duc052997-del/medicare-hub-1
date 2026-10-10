// routes/auth.routes.js
// Khai báo đường dẫn API:
//   POST /api/auth/register   (UC001)
//   POST /api/auth/login      (UC002)
//   GET  /api/auth/me
//   POST /api/auth/logout     (UC003)

const express = require('express');
const router = express.Router();

const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/register', register);
router.post('/login', loginLimiter, login);

router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);

module.exports = router;
