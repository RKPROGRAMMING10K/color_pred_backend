const express = require('express');
const GameController = require('../controllers/GameController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use((req, res, next) => {
  console.log(`🎮 Game API: ${req.method} ${req.path}`);
  next();
});

// Public routes (no authentication required for game history)
router.get('/history/:game_type', GameController.getGameHistory);
router.get('/latest/:game_type', GameController.getLatestPeriod);
router.get('/current/:game_type', GameController.getCurrentPeriod);
router.get('/statistics/all', GameController.getAllGameStatistics);

// Protected routes (authentication required)
router.post('/period', authenticateToken, GameController.createGamePeriod);

// Admin only routes
router.put('/period/:game_type/:period_id', authenticateToken, requireAdmin, GameController.updateGamePeriod);
router.delete('/period/:game_type/:period_id', authenticateToken, requireAdmin, GameController.deleteGamePeriod);

// Testing routes (remove in production)
router.post('/simulate/:game_type', GameController.simulateGameResult);

module.exports = router;
