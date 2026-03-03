const express = require('express');
const AdvancedBetController = require('../controllers/AdvancedBetController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply request logger
router.use((req, res, next) => {
  console.log(`🎲 Advanced Betting API: ${req.method} ${req.path}`);
  next();
});

// Protected routes (authentication required)
router.post('/place', authenticateToken, AdvancedBetController.placeBet);
router.get('/history/:userId', authenticateToken, AdvancedBetController.getUserBettingHistory);
router.get('/winnings/:userId', authenticateToken, AdvancedBetController.getUserWinningHistory);

// Admin only routes
router.post('/process', authenticateToken, AdvancedBetController.processBets);

module.exports = router;
