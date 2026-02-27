const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken, requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// User Registration
router.post('/register', AuthController.register);

// User Login with Email
router.post('/login', AuthController.login);

// User Login with Phone
router.post('/login-phone', AuthController.loginWithPhone);

// Get User Profile (protected)
router.get('/profile', authenticateToken, AuthController.getProfile);

// User Logout (protected)
router.post('/logout', authenticateToken, AuthController.logout);

// Logout from all devices (protected)
router.post('/logout-all', authenticateToken, AuthController.logoutAll);

// Get active sessions (protected)
router.get('/sessions', authenticateToken, AuthController.getActiveSessions);

// Get sessions grouped by device type (protected)
router.get('/sessions/devices', authenticateToken, AuthController.getSessionsByDevice);

// Check if user has active session on current device (protected)
router.post('/sessions/check-device', authenticateToken, AuthController.checkDeviceSession);

// Logout from specific device (protected)
router.post('/sessions/logout-device', authenticateToken, AuthController.logoutFromDevice);

// Save FCM Token (protected)
router.post('/fcm-token', authenticateToken, AuthController.saveFcmToken);

// Test FCM Notification (protected)
router.post('/test-notification', authenticateToken, AuthController.testNotification);

module.exports = router;
