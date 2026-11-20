// routes/medicalRecord.routes.js
// UC008 - Xem hồ sơ bệnh án, đơn thuốc (API-11, API-12)

const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const {
  getMyMedicalRecords,
  getMedicalRecordDetail,
} = require('../controllers/medicalRecord.controller');

// Cả 2 API đều chỉ dành cho Patient đã đăng nhập (đúng cột "Quyền truy cập"
// trong hợp đồng API-11/API-12).
router.get('/', verifyToken, requireRole('PATIENT'), getMyMedicalRecords);
router.get('/:id', verifyToken, requireRole('PATIENT'), getMedicalRecordDetail);

module.exports = router;