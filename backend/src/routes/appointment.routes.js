// UC007 - GET /api/appointments/my
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { getMyAppointments } = require('../controllers/appointment.controller');

// Luon khai bao /my truoc cac route dong /:id (neu them sau nay).
router.get('/my', verifyToken, requireRole('PATIENT'), getMyAppointments);

module.exports = router;
