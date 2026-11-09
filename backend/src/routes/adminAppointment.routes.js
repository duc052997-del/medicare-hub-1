// [UC011-BE] Phia Admin cua quan ly lich hen (mount duoi /api/admin)
// GET   /api/admin/appointments                      - API-25
// PATCH /api/admin/appointments/:id/status           - API-26
// POST  /api/admin/appointments/:id/medical-record   - API-27

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const {
  listAppointments,
  updateAppointmentStatus,
  completeAppointmentWithRecord,
} = require('../controllers/adminAppointment.controller');

// Khong dung router.use(verifyToken, requireRole('ADMIN')) o cap router vi
// router nay duoc mount chung prefix /admin voi uc010/uc012 - gan middleware
// thang vao tung route de khong anh huong den cac route khong lien quan.
router.get('/appointments', verifyToken, requireRole('ADMIN'), listAppointments);
router.patch('/appointments/:id/status', verifyToken, requireRole('ADMIN'), updateAppointmentStatus);
router.post('/appointments/:id/medical-record', verifyToken, requireRole('ADMIN'), completeAppointmentWithRecord);

module.exports = router;