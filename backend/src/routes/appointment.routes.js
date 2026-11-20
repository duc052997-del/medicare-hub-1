// [UC006-BE] POST  /api/appointments                 - dat lich kham
// [UC007-BE] GET   /api/appointments/my              - xem lich su dat lich
// [UC011-BE] GET   /api/appointments/:id             - xem chi tiet lich hen (API-20)
// [UC011-BE] PATCH /api/appointments/:id/reschedule  - doi lich (API-21)
// [UC011-BE] PATCH /api/appointments/:id/cancel      - huy lich (API-22)

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const {
  createAppointment,
  getMyAppointments,
  getAppointmentDetail,
  rescheduleAppointment,
  cancelAppointment,
} = require('../controllers/appointment.controller');

router.post('/', verifyToken, requireRole('PATIENT'), createAppointment);

// LUU Y: /my phai khai bao TRUOC /:id, neu khong chu "my" bi hieu la id.
router.get('/my', verifyToken, requireRole('PATIENT'), getMyAppointments);
router.get('/:id', verifyToken, requireRole('PATIENT'), getAppointmentDetail);
router.patch('/:id/reschedule', verifyToken, requireRole('PATIENT'), rescheduleAppointment);
router.patch('/:id/cancel', verifyToken, requireRole('PATIENT'), cancelAppointment);

module.exports = router;