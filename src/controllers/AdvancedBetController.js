const AdvancedBet = require('../models/AdvancedBet');

class AdvancedBetController {
  // Place bet (number, color, size)
  static async placeBet(req, res) {
    try {
      const betData = req.body;
      const result = await AdvancedBet.placeBet(betData);
      
      res.status(201).json({
        success: true,
        message: 'Bet placed successfully',
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to place bet',
        error: error.message
      });
    }
  }

  // Process bets for period
  static async processBets(req, res) {
    try {
      const { gameType, period, gameResult } = req.body;
      const result = await AdvancedBet.processBetsForPeriod(gameType, period, gameResult);
      
      res.json({
        success: true,
        message: 'Bets processed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process bets',
        error: error.message
      });
    }
  }

  // Get user betting history
  static async getUserBettingHistory(req, res) {
    try {
      const { userId } = req.params;
      const { gameType, limit } = req.query;
      const result = await AdvancedBet.getUserBettingHistory(userId, gameType, limit);
      
      res.json({
        success: true,
        message: 'Betting history retrieved successfully',
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get betting history',
        error: error.message
      });
    }
  }

  // Get user winning history
  static async getUserWinningHistory(req, res) {
    try {
      const { userId } = req.params;
      const { gameType, limit } = req.query;
      const result = await AdvancedBet.getUserWinningHistory(userId, gameType, limit);
      
      res.json({
        success: true,
        message: 'Winning history retrieved successfully',
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get winning history',
        error: error.message
      });
    }
  }
}

module.exports = AdvancedBetController;
