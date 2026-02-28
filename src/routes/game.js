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
router.get('/history/all', GameController.getAllGameHistory);

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
    console.log('📱 APK sending game history data');
    
    const { game_type } = req.params;
    const { event, data } = req.body;
    
    // Validate game type
    const validGameTypes = ['30sec', '1min', '3min', '5min'];
    if (!validGameTypes.includes(game_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
      });
    }

    // Validate required fields
    if (!event || !data || !data.history || !Array.isArray(data.history)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: event, data.history'
      });
    }

    const GameHistory = require('../models/GameHistory');
    let storedResults = [];

    // Process each history item
    for (const historyItem of data.history) {
      // Validate history item
      if (!historyItem.period_id || !historyItem.result || !historyItem.number || !historyItem.color) {
        console.log('⚠️ Skipping invalid history item:', historyItem);
        continue;
      }

      // Check if period already exists
      const existingPeriod = await GameHistory.getPeriod(game_type, historyItem.period_id);
      if (existingPeriod) {
        console.log(`⚠️ Period ${historyItem.period_id} already exists, skipping`);
        continue;
      }

      // Create game period data
      const gameData = {
        game_type,
        period_id: historyItem.period_id,
        number: historyItem.number,
        color: historyItem.color, // Store exactly as APK sends
        result: historyItem.result, // Store exactly as APK sends
        big_small: historyItem.big_small || GameHistory.getBigSmallFromNumber(historyItem.number),
        timestamp: historyItem.timestamp || new Date().toISOString(),
        is_completed: historyItem.is_completed !== false
      };

      // Save to database
      const result = await GameHistory.createGamePeriod(gameData);
      storedResults.push(result.data);
      
      console.log(`📱 Stored: ${game_type} - ${historyItem.period_id} - ${historyItem.result} (${historyItem.number})`);
    }

    // Broadcast update to SSE clients
    if (req.gameHistorySSE && storedResults.length > 0) {
      // Get updated history and broadcast
      const updatedHistory = await GameHistory.getGameHistory(game_type, 100);
      await req.gameHistorySSE.broadcastGameHistoryUpdate(game_type, updatedHistory.data);
    }

    res.json({
      success: true,
      message: `APK game history processed successfully. Stored ${storedResults.length} periods.`,
      data: {
        game_type,
        stored_count: storedResults.length,
        periods: storedResults
      }
    });

  } catch (error) {
    console.error('❌ APK game history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process APK game history',
      error: error.message
    });
  }
});

module.exports = router;
