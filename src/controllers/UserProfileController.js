const UserProfile = require('../models/UserProfile');

class UserProfileController {
  // Get user profile
  static async getUserProfile(req, res) {
    try {
      console.log('👤 Getting user profile');
      
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await UserProfile.getUserProfile(user_id);

      res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: error.message
      });
    }
  }

  // Update user profile
  static async updateUserProfile(req, res) {
    try {
      console.log('📝 Updating user profile');
      
      const { user_id } = req.params;
      const updateData = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await UserProfile.updateUserProfile(user_id, updateData);

      res.json({
        success: true,
        message: 'User profile updated successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user profile',
        error: error.message
      });
    }
  }

  // Get user balance
  static async getUserBalance(req, res) {
    try {
      console.log('💰 Getting user balance');
      
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await UserProfile.getUserBalance(user_id);

      res.json({
        success: true,
        message: 'User balance retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Get user balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user balance',
        error: error.message
      });
    }
  }

  // Update user balance
  static async updateUserBalance(req, res) {
    try {
      console.log('💰 Updating user balance');
      
      const { user_id } = req.params;
      const { amount, type } = req.body;

      if (!user_id || !amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id, amount, type'
        });
      }

      if (!['add', 'subtract'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be add or subtract'
        });
      }

      const result = await UserProfile.updateUserBalance(user_id, parseFloat(amount), type);

      res.json({
        success: true,
        message: 'User balance updated successfully',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Update balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user balance',
        error: error.message
      });
    }
  }

  // Get user statistics (comprehensive)
  static async getUserStatistics(req, res) {
    try {
      console.log('📊 Getting user statistics');
      
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Get user profile
      const UserProfile = require('../models/UserProfile');
      const profileResult = await UserProfile.getUserProfile(user_id);
      const profile = profileResult.data;

      // Get betting statistics
      const Bet = require('../models/Bet');
      const bettingStats = await Bet.getBettingStatistics(user_id);

      res.json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: {
          user_id: user_id,
          profile: {
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            balance: profile.balance,
            is_active: profile.is_active,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          },
          betting: bettingStats.data,
          summary: {
            total_winnings: bettingStats.data.total_payout || 0,
            total_losses: bettingStats.data.total_amount - (bettingStats.data.total_payout || 0),
            net_profit: (bettingStats.data.total_payout || 0) - (bettingStats.data.total_amount - (bettingStats.data.total_payout || 0)),
            total_bets: bettingStats.data.total_bets || 0,
            win_rate: bettingStats.data.win_rate || 0
          }
        }
      });

    } catch (error) {
      console.error('❌ Get user statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }
}

module.exports = UserProfileController;
