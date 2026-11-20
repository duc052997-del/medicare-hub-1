const router = require('express').Router();
const {verifyToken, requireRole} = require('../middlewares/auth.middleware');
const c = require('../controllers/uc012.controller');
router.use(verifyToken, requireRole('ADMIN'));
router.get('/patients', c.list);
router.get('/patients/:id', c.detail);
module.exports = router;
