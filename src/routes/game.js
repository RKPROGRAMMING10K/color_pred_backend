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

// Test endpoint to simulate APK sending game result
router.post('/apk-result/:game_type', async (req, res) => {
  try {
    console.log('📱 Simulating APK game result');
    
    const { game_type } = req.params;
    const { number, period_id } = req.body;
    
    // Validate game type
    const validGameTypes = ['30sec', '1min', '3min', '5min'];
    if (!validGameTypes.includes(game_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
      });
    }

    // Validate number
    if (typeof number !== 'number' || number < 0 || number > 9) {
      return res.status(400).json({
        success: false,
        message: 'Number must be between 0 and 9'
      });
    }

    // Use provided period_id or generate one
    const finalPeriodId = period_id || require('../models/GameHistory').generatePeriodId(game_type);

    // Get result and color from number
    const GameHistory = require('../models/GameHistory');
    const resultData = GameHistory.getResultFromNumber(number);

    // Create game period data (as if coming from APK)
    const gameData = {
      game_type,
      period_id: finalPeriodId,
      number,
      color: resultData.color,
      result: resultData.result,
      big_small: resultData.big_small,
      timestamp: new Date().toISOString(),
      is_completed: true
    };

    // Save to database (this is what the APK would trigger)
    const result = await GameHistory.createGamePeriod(gameData);

    // Broadcast update to SSE clients (real-time updates)
    if (req.gameHistorySSE) {
      await req.gameHistorySSE.broadcastGameHistoryUpdate(game_type, result.data);
    }

    console.log(`📱 APK result stored: ${game_type} - ${finalPeriodId} - ${resultData.result} (${number})`);

    res.json({
      success: true,
      message: 'APK game result stored successfully',
      data: result.data
    });

  } catch (error) {
    console.error('❌ APK result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store APK game result',
      error: error.message
    });
  }
});

module.exports = router;
