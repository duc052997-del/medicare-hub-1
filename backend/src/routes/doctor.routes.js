// routes/doctor.routes.js
//   GET /api/doctors/featured   - lay danh sach bac si noi bat (UC005)
// TODO (task rieng cung sprint): GET /api/doctors, GET /api/doctors/:id/schedule

const express = require('express');
const router = express.Router();

const { getFeaturedDoctors } = require('../controllers/doctor.controller');

router.get('/featured', getFeaturedDoctors);

module.exports = router;
