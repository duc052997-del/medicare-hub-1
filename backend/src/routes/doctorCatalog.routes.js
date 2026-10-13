// routes/doctorCatalog.routes.js
// [UC005-BE]
//   GET /api/doctors              - danh sach bac si (loc theo chuyen khoa)
//   GET /api/doctors/:id/schedule - lich trong theo bac si

const express = require('express');
const router = express.Router();

const { getDoctors, getDoctorSchedule } = require('../controllers/doctorCatalog.controller');

router.get('/', getDoctors);
router.get('/:id/schedule', getDoctorSchedule);

module.exports = router;