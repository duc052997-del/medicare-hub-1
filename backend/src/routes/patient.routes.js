// UC009: API-13 GET va API-14 PUT /api/auth/profile.
// Hop dong cho phep Patient/Admin dang nhap, chi truy cap ho so cua minh.
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { getMyProfile, updateMyProfile } = require('../controllers/patient.controller');

router.get('/profile', verifyToken, requireRole('PATIENT', 'ADMIN'), getMyProfile);
router.put('/profile', verifyToken, requireRole('PATIENT', 'ADMIN'), updateMyProfile);

module.exports = router;
