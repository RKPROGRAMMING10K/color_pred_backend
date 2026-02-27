const express = require('express');
const AdminAuthController = require('../controllers/AdminAuthController');
const { requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Admin Auth Routes
router.post('/login', AdminAuthController.adminLogin);
router.post('/login/custom-token', AdminAuthController.adminLoginWithCustomToken);
router.post('/verify', AdminAuthController.verifyAdminToken);
router.post('/logout', AdminAuthController.adminLogout);
router.post('/logout-all', AdminAuthController.adminLogoutAll);

module.exports = router;
