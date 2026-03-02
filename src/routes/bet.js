const express = require('express');
const BetController = require('../controllers/BetController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use((req, res, next) => {
  console.log(`💰 Betting API: ${req.method} ${req.path}`);
  next();
});

// Public routes (no authentication required)
router.get('/user/:user_id', BetController.getUserBets);
router.get('/period/:game_type/:period_id', BetController.getPeriodBets);

// Protected routes (authentication required)
router.post('/create', authenticateToken, BetController.createBet);
router.get('/statistics/:user_id', authenticateToken, BetController.getBettingStatistics);

// Admin only routes
router.put('/update/:bet_id', authenticateToken, requireAdmin, BetController.updateBetStatus);
router.post('/process-result', authenticateToken, requireAdmin, BetController.processGameResult);
router.get('/admin/all', authenticateToken, requireAdmin, BetController.getAllBets);

module.exports = router;
