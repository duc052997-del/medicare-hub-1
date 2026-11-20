// routes/home.routes.js
//   GET /api/home   - lay thong tin gioi thieu phong kham (UC004)

const express = require('express');
const router = express.Router();

const { getClinicIntro } = require('../controllers/home.controller');

router.get('/', getClinicIntro);

module.exports = router;
