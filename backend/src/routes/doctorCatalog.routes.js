// routes/doctorCatalog.routes.js
// [UC005-BE]
//   GET /api/doctors              - danh sách bác sĩ, lọc theo chuyên khoa
//   GET /api/doctors/:id/schedule - lịch trống theo ngày của 1 bác sĩ
//
// File riêng, gắn cùng prefix '/doctors' với doctor.routes.js (phần "bác sĩ
// nổi bật" của đồng đội) ngay trong routes/index.js - không sửa trực tiếp
// vào doctor.routes.js để tránh đụng code khi 2 người cùng merge.

const express = require('express');
const router = express.Router();

const { getDoctors, getDoctorSchedule } = require('../controllers/doctorCatalog.controller');

router.get('/', getDoctors);
router.get('/:id/schedule', getDoctorSchedule);

module.exports = router;