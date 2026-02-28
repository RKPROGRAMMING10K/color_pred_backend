const GameHistory = require('../models/GameHistory');

class GameController {
  // Create new game period
  static async createGamePeriod(req, res) {
    try {
      console.log('🎮 Creating new game period');
      
      const { game_type, number } = req.body;
      
      // Validate required fields
      if (!game_type || number === undefined) {
        return res.status(400).json({
          success: false,
          message: 'game_type and number are required'
        });
      }

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

      // Generate period ID
      const period_id = GameHistory.generatePeriodId(game_type);

      // Get result and color from number
      const resultData = GameHistory.getResultFromNumber(number);

      // Create game period data
      const gameData = {
        game_type,
        period_id,
        number,
        color: resultData.color,
        result: resultData.result,
        big_small: resultData.big_small
      };

      // Save to database
      const result = await GameHistory.createGamePeriod(gameData);

      // Broadcast update to WebSocket clients
      if (req.gameHistoryWS) {
        await req.gameHistoryWS.broadcastGameHistoryUpdate(game_type, result.data);
      }

      // Broadcast update to SSE clients
      if (req.gameHistorySSE) {
        await req.gameHistorySSE.broadcastGameHistoryUpdate(game_type, result.data);
      }

      res.status(201).json({
        success: true,
        message: 'Game period created successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Create game period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create game period',
        error: error.message
      });
    }
  }

  // Get game history
  static async getGameHistory(req, res) {
    try {
      console.log('📊 Getting game history');
      
      const { game_type } = req.params;
      const { limit = 100 } = req.query;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Validate limit
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 1000'
        });
      }

      // Get game history
      const result = await GameHistory.getGameHistory(game_type, parsedLimit);

      res.json({
        success: true,
        message: 'Game history retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get game history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get game history',
        error: error.message
      });
    }
  }

  // Get latest period
  static async getLatestPeriod(req, res) {
    try {
      console.log('🔍 Getting latest period');
      
      const { game_type } = req.params;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Get latest period
      const result = await GameHistory.getLatestPeriod(game_type);

      res.json({
        success: true,
        message: 'Latest period retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get latest period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get latest period',
        error: error.message
      });
    }
  }

  // Update game period (admin only)
  static async updateGamePeriod(req, res) {
    try {
      console.log('✏️ Updating game period');
      
      const { game_type, period_id } = req.params;
      const updateData = req.body;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Validate update data
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Update data is required'
        });
      }

      // Update game period
      const result = await GameHistory.updateGamePeriod(game_type, period_id, updateData);

      // Broadcast update to WebSocket clients
      if (req.gameHistoryWS) {
        // Get updated history and broadcast
        const updatedHistory = await GameHistory.getGameHistory(game_type, 100);
        await req.gameHistoryWS.broadcastGameHistoryUpdate(game_type, updatedHistory.data.history[0]);
      }

      // Broadcast update to SSE clients
      if (req.gameHistorySSE) {
        // Get updated history and broadcast
        const updatedHistory = await GameHistory.getGameHistory(game_type, 100);
        await req.gameHistorySSE.broadcastGameHistoryUpdate(game_type, updatedHistory.data.history[0]);
      }

      res.json({
        success: true,
        message: 'Game period updated successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Update game period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update game period',
        error: error.message
      });
    }
  }

  // Delete game period (admin only)
  static async deleteGamePeriod(req, res) {
    try {
      console.log('🗑️ Deleting game period');
      
      const { game_type, period_id } = req.params;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Delete game period
      const result = await GameHistory.deleteGamePeriod(game_type, period_id);

      // Broadcast update to WebSocket clients
      if (req.gameHistoryWS) {
        // Get updated history and broadcast
        const updatedHistory = await GameHistory.getGameHistory(game_type, 100);
        await req.gameHistoryWS.broadcastGameHistoryUpdate(game_type, null);
      }

      // Broadcast update to SSE clients
      if (req.gameHistorySSE) {
        // Get updated history and broadcast
        const updatedHistory = await GameHistory.getGameHistory(game_type, 100);
        await req.gameHistorySSE.broadcastGameHistoryUpdate(game_type, null);
      }

      res.json({
        success: true,
        message: 'Game period deleted successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Delete game period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete game period',
        error: error.message
      });
    }
  }

  // Get all game statistics
  static async getAllGameStatistics(req, res) {
    try {
      console.log('📈 Getting all game statistics');

      // Get all statistics
      const result = await GameHistory.getAllGameStatistics();

      res.json({
        success: true,
        message: 'All game statistics retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get all game statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get all game statistics',
        error: error.message
      });
    }
  }

  // Get current period info
  static async getCurrentPeriod(req, res) {
    try {
      console.log('⏰ Getting current period info');
      
      const { game_type } = req.params;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Generate current period ID
      const currentPeriodId = GameHistory.generatePeriodId(game_type);
      
      // Get latest completed period
      const latestResult = await GameHistory.getLatestPeriod(game_type);
      
      // Calculate time until next period
      const now = new Date();
      let nextPeriodTime, periodDuration;
      
      switch (game_type) {
        case '30sec':
          periodDuration = 30000; // 30 seconds
          nextPeriodTime = new Date(Math.ceil(now.getTime() / periodDuration) * periodDuration);
          break;
        case '1min':
          periodDuration = 60000; // 1 minute
          nextPeriodTime = new Date(Math.ceil(now.getTime() / periodDuration) * periodDuration);
          break;
        case '3min':
          periodDuration = 180000; // 3 minutes
          nextPeriodTime = new Date(Math.ceil(now.getTime() / periodDuration) * periodDuration);
          break;
        case '5min':
          periodDuration = 300000; // 5 minutes
          nextPeriodTime = new Date(Math.ceil(now.getTime() / periodDuration) * periodDuration);
          break;
      }

      const timeUntilNext = nextPeriodTime.getTime() - now.getTime();
      const currentPeriodTime = periodDuration - timeUntilNext;

      res.json({
        success: true,
        message: 'Current period info retrieved successfully',
        data: {
          game_type,
          current_period_id: currentPeriodId,
          latest_completed_period: latestResult.data,
          time_until_next_period: Math.max(0, timeUntilNext),
          current_period_time: currentPeriodTime,
          period_duration: periodDuration,
          next_period_time: nextPeriodTime.toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Get current period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get current period info',
        error: error.message
      });
    }
  }

  // Simulate game result (for testing)
  static async simulateGameResult(req, res) {
    try {
      console.log('🎲 Simulating game result');
      
      const { game_type } = req.params;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Generate random number
      const randomNumber = Math.floor(Math.random() * 10);
      
      // Create game period
      const result = await this.createGamePeriod({
        ...req,
        body: {
          game_type,
          number: randomNumber
        }
      });

      res.json({
        success: true,
        message: 'Game result simulated successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Simulate game result error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to simulate game result',
        error: error.message
      });
    }
  }
}

module.exports = GameController;
