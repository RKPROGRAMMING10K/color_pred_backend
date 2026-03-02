const Bet = require('../models/Bet');

class BetController {
  // Create a new bet
  static async createBet(req, res) {
    try {
      console.log('💰 Creating new bet');
      
      const { user_id, game_type, period_id, quantity, amount, color } = req.body;

      // Validate required fields
      if (!user_id || !game_type || !period_id || !quantity || !amount || !color) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id, game_type, period_id, quantity, amount, color'
        });
      }

      // Create bet
      const result = await Bet.createBet({
        user_id,
        game_type,
        period_id,
        quantity: parseInt(quantity),
        amount: parseFloat(amount),
        color
      });

      res.status(201).json({
        success: true,
        message: 'Bet created successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Create bet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bet',
        error: error.message
      });
    }
  }

  // Get user's betting history
  static async getUserBets(req, res) {
    try {
      console.log('📊 Getting user bets');
      
      const { user_id } = req.params;
      const { game_type, limit } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await Bet.getUserBets(user_id, game_type, limit ? parseInt(limit) : 50);

      res.json({
        success: true,
        message: 'User bets retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get user bets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user bets',
        error: error.message
      });
    }
  }

  // Get bets for a specific period
  static async getPeriodBets(req, res) {
    try {
      console.log('🎮 Getting period bets');
      
      const { game_type, period_id } = req.params;

      if (!game_type || !period_id) {
        return res.status(400).json({
          success: false,
          message: 'Game type and period ID are required'
        });
      }

      const result = await Bet.getPeriodBets(game_type, period_id);

      res.json({
        success: true,
        message: 'Period bets retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get period bets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get period bets',
        error: error.message
      });
    }
  }

  // Update bet status (when game result is known)
  static async updateBetStatus(req, res) {
    try {
      console.log('🔄 Updating bet status');
      
      const { bet_id } = req.params;
      const { game_result, payout_amount } = req.body;

      if (!bet_id) {
        return res.status(400).json({
          success: false,
          message: 'Bet ID is required'
        });
      }

      const result = await Bet.updateBetStatus(bet_id, game_result, payout_amount);

      res.json({
        success: true,
        message: 'Bet status updated successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Update bet status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bet status',
        error: error.message
      });
    }
  }

  // Get betting statistics
  static async getBettingStatistics(req, res) {
    try {
      console.log('📈 Getting betting statistics');
      
      const { user_id } = req.params;
      const { game_type } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await Bet.getBettingStatistics(user_id, game_type);

      res.json({
        success: true,
        message: 'Betting statistics retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get betting statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get betting statistics',
        error: error.message
      });
    }
  }

  // Get all bets (admin)
  static async getAllBets(req, res) {
    try {
      console.log('📊 Getting all bets (admin)');
      
      const { game_type, limit, offset } = req.query;
      const admin = require('firebase-admin');
      const db = admin.firestore();
      let query = db.collection('bets').orderBy('created_at', 'desc');

      if (game_type) {
        query = query.where('game_type', '==', game_type);
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      }

      if (offset) {
        query = query.offset(parseInt(offset));
      }

      const snapshot = await query.get();
      const bets = [];

      snapshot.forEach(doc => {
        const bet = doc.data();
        bets.push({
          bet_id: doc.id,
          user_id: bet.user_id,
          game_type: bet.game_type,
          period_id: bet.period_id,
          quantity: bet.quantity,
          amount: bet.amount,
          color: bet.color,
          status: bet.status,
          payout: bet.payout || 0,
          created_at: bet.created_at?.toDate?.toISOString() || bet.created_at,
          updated_at: bet.updated_at?.toDate?.toISOString() || bet.updated_at
        });
      });

      res.json({
        success: true,
        message: 'All bets retrieved successfully',
        data: {
          bets,
          total_count: bets.length,
          game_type: game_type
        }
      });

    } catch (error) {
      console.error('❌ Get all bets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get all bets',
        error: error.message
      });
    }
  }

  // Process game result and update all bets for that period
  static async processGameResult(req, res) {
    try {
      console.log('🎮 Processing game result');
      
      const { game_type, period_id, result, payout_multiplier = 2 } = req.body;

      if (!game_type || !period_id || !result) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: game_type, period_id, result'
        });
      }

      // Get all bets for this period
      const Bet = require('../models/Bet');
      const periodBets = await Bet.getPeriodBets(game_type, period_id);

      if (periodBets.data.bets.length === 0) {
        return res.json({
          success: true,
          message: 'No bets found for this period',
          data: {
            game_type,
            period_id,
            result,
            total_bets: 0,
            total_payout: 0
          }
        });
      }

      // Update all bets for this period
      const updatedBets = [];
      let totalPayout = 0;

      for (const bet of periodBets.data.bets) {
        const payoutAmount = bet.color.toLowerCase() === result.toLowerCase() ? 
          (bet.amount * bet.quantity * payout_multiplier) : 0;
        
        await Bet.updateBetStatus(bet.bet_id, result, payoutAmount);
        
        updatedBets.push({
          bet_id: bet.bet_id,
          user_id: bet.user_id,
          color: bet.color,
          quantity: bet.quantity,
          amount: bet.amount,
          status: bet.color.toLowerCase() === result.toLowerCase() ? 'won' : 'lost',
          payout: payoutAmount
        });

        totalPayout += payoutAmount;
      }

      res.json({
        success: true,
        message: 'Game result processed successfully',
        data: {
          game_type,
          period_id,
          result,
          payout_multiplier,
          total_bets: periodBets.data.bets.length,
          total_payout: totalPayout,
          updated_bets: updatedBets
        }
      });

    } catch (error) {
      console.error('❌ Process game result error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process game result',
        error: error.message
      });
    }
  }
}

module.exports = BetController;
