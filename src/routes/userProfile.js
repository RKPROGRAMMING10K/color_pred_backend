const express = require('express');
const UserProfileController = require('../controllers/UserProfileController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use((req, res, next) => {
  console.log(`👤 User Profile API: ${req.method} ${req.path}`);
  next();
});

// Protected routes (authentication required)
router.get('/profile/:user_id', authenticateToken, UserProfileController.getUserProfile);
router.put('/profile/:user_id', authenticateToken, UserProfileController.updateUserProfile);
router.get('/balance/:user_id', authenticateToken, UserProfileController.getUserBalance);
router.put('/balance/:user_id', authenticateToken, UserProfileController.updateUserBalance);
router.get('/statistics/:user_id', authenticateToken, UserProfileController.getUserStatistics);

module.exports = router;
