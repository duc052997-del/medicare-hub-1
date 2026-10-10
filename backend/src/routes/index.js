// routes/index.js
// Gom tất cả route con lại, để server.js chỉ cần import 1 file này.

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const homeRoutes = require('./home.routes');
const doctorRoutes = require('./doctor.routes');
const doctorCatalogRoutes = require('./doctorCatalog.routes'); // [UC005-BE]
// const patientRoutes = require('./patient.routes');
// const appointmentRoutes = require('./appointment.routes');

router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
router.use('/doctors', doctorRoutes);
router.use('/doctors', doctorCatalogRoutes); // [UC005-BE] cung prefix /doctors, khac file
// router.use('/patients', patientRoutes);
// router.use('/appointments', appointmentRoutes);

module.exports = router;