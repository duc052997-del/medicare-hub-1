// [UC006-BE] POST /api/appointments      - dat lich kham
// [UC007-BE] GET  /api/appointments/my   - xem lich su dat lich

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { createAppointment, getMyAppointments } = require('../controllers/appointment.controller');

router.post('/', verifyToken, requireRole('PATIENT'), createAppointment);
router.get('/my', verifyToken, requireRole('PATIENT'), getMyAppointments);

module.exports = router;