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

// Debug FCM Status (protected)
router.get('/debug-fcm', authenticateToken, AuthController.debugFcmStatus);

// Test FCM Direct (protected) - bypass any potential issues
router.post('/test-fcm-direct', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const FCMService = require('../services/FCMService');
    
    console.log('🧪 Direct FCM test for user:', userId);
    
    // Get user's FCM token directly
    const admin = require('firebase-admin');
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    const fcmToken = userData.fcm_token;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'No FCM token found for user'
      });
    }
    
    console.log('📱 FCM Token found:', fcmToken.substring(0, 20) + '...');
    console.log('🔍 Token length:', fcmToken.length);
    console.log('🔍 Token type:', fcmToken.includes('APA91b') ? 'REAL_FCM' : 'TEST_TOKEN');
    
    // Test with the FCM service
    const result = await FCMService.testNotification(userId);
    
    res.json({
      success: true,
      message: 'Direct FCM test completed',
      data: {
        userId: userId,
        fcmTokenLength: fcmToken.length,
        fcmTokenPreview: fcmToken.substring(0, 20) + '...',
        tokenType: fcmToken.includes('APA91b') ? 'REAL_FCM' : 'TEST_TOKEN',
        testResult: result
      }
    });
    
  } catch (error) {
    console.error('❌ Direct FCM test error:', error);
    res.status(500).json({
      success: false,
      message: 'Direct FCM test failed',
      error: error.message
    });
  }
});

module.exports = router;
