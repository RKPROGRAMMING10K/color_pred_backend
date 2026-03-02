const admin = require('firebase-admin');

class Bet {
  constructor(data) {
    this.user_id = data.user_id;
    this.game_type = data.game_type;
    this.period_id = data.period_id;
    this.quantity = data.quantity;
    this.amount = data.amount;
    this.color = data.color;
    this.status = data.status || 'pending'; // pending, won, lost
    this.payout = data.payout || 0;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Convert to Firestore format
  toFirestore() {
    return {
      user_id: this.user_id,
      game_type: this.game_type,
      period_id: this.period_id,
      quantity: this.quantity,
      amount: this.amount,
      color: this.color,
      status: this.status,
      payout: this.payout,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Create a new bet
  static async createBet(betData) {
    try {
      const db = admin.firestore();
      
      // Validate required fields
      if (!betData.user_id || !betData.game_type || !betData.period_id || 
          !betData.quantity || !betData.amount || !betData.color) {
        throw new Error('Missing required fields: user_id, game_type, period_id, quantity, amount, color');
      }

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(betData.game_type)) {
        throw new Error(`Invalid game_type: ${betData.game_type}`);
      }

      // Validate color
      const validColors = ['red', 'green', 'violet'];
      if (!validColors.includes(betData.color.toLowerCase())) {
        throw new Error(`Invalid color: ${betData.color}. Must be red, green, or violet`);
      }

      // Validate amount
      if (betData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate quantity
      if (betData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Check if bet already exists for this user and period
      const existingBet = await db
        .collection('bets')
        .where('user_id', '==', betData.user_id)
        .where('period_id', '==', betData.period_id)
        .where('game_type', '==', betData.game_type)
        .limit(1)
        .get();

      if (!existingBet.empty) {
        throw new Error('Bet already exists for this period');
      }

      // Create bet object
      const bet = new Bet({
        user_id: betData.user_id,
        game_type: betData.game_type,
        period_id: betData.period_id,
        quantity: betData.quantity,
        amount: betData.amount,
        color: betData.color.toLowerCase(),
        status: 'pending'
      });

      // Save to Firestore
      const betRef = db.collection('bets').doc();
      await betRef.set(bet.toFirestore());

      console.log(`✅ Bet created: ${betData.user_id} - ${betData.game_type} - ${betData.period_id} - ${betData.color} (${betData.quantity} x ${betData.amount})`);

      return {
        success: true,
        data: {
          bet_id: betRef.id,
          user_id: bet.user_id,
          game_type: bet.game_type,
          period_id: bet.period_id,
          quantity: bet.quantity,
          amount: bet.amount,
          color: bet.color,
          status: 'pending',
          created_at: bet.created_at
        }
      };

    } catch (error) {
      console.error('❌ Error creating bet:', error);
      throw error;
    }
  }

  // Get user's bets
  static async getUserBets(userId, gameType = null, limit = 50) {
    try {
      const db = admin.firestore();
      let query = db
        .collection('bets')
        .where('user_id', '==', userId)
        .orderBy('created_at', 'desc');

      if (gameType) {
        query = query.where('game_type', '==', gameType);
      }

      if (limit) {
        query = query.limit(limit);
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

      return {
        success: true,
        data: {
          bets,
          total_count: bets.length,
          game_type: gameType
        }
      };

    } catch (error) {
      console.error('❌ Error getting user bets:', error);
      throw error;
    }
  }

  // Get bets for a specific period
  static async getPeriodBets(gameType, periodId) {
    try {
      const db = admin.firestore();
      const snapshot = await db
        .collection('bets')
        .where('game_type', '==', gameType)
        .where('period_id', '==', periodId)
        .orderBy('created_at', 'desc')
        .get();

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

      return {
        success: true,
        data: {
          bets,
          total_bets: bets.length,
          total_amount: bets.reduce((sum, bet) => sum + (bet.amount * bet.quantity), 0),
          game_type: gameType,
          period_id: periodId
        }
      };

    } catch (error) {
      console.error('❌ Error getting period bets:', error);
      throw error;
    }
  }

  // Update bet status (when game result is known)
  static async updateBetStatus(betId, gameResult, payoutAmount = 0) {
    try {
      const db = admin.firestore();
      const betRef = db.collection('bets').doc(betId);
      const betDoc = await betRef.get();

      if (!betDoc.exists) {
        throw new Error('Bet not found');
      }

      const bet = betDoc.data();
      const newStatus = bet.color.toLowerCase() === gameResult.toLowerCase() ? 'won' : 'lost';
      const finalPayout = newStatus === 'won' ? payoutAmount : 0;

      await betRef.update({
        status: newStatus,
        payout: finalPayout,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Bet updated: ${betId} - ${newStatus} - Payout: ${finalPayout}`);

      return {
        success: true,
        data: {
          bet_id: betId,
          previous_status: bet.status,
          new_status: newStatus,
          payout: finalPayout,
          game_result: gameResult
        }
      };

    } catch (error) {
      console.error('❌ Error updating bet status:', error);
      throw error;
    }
  }

  // Get betting statistics
  static async getBettingStatistics(userId = null, gameType = null) {
    try {
      const db = admin.firestore();
      let query = db.collection('bets');

      if (userId) {
        query = query.where('user_id', '==', userId);
      }

      if (gameType) {
        query = query.where('game_type', '==', gameType);
      }

      const snapshot = await query.get();
      const bets = [];
      let totalAmount = 0;
      let totalWon = 0;
      let totalLost = 0;
      let totalPayout = 0;

      snapshot.forEach(doc => {
        const bet = doc.data();
        bets.push(bet);
        totalAmount += bet.amount * bet.quantity;
        
        if (bet.status === 'won') {
          totalWon++;
          totalPayout += bet.payout || 0;
        } else if (bet.status === 'lost') {
          totalLost++;
        }
      });

      return {
        success: true,
        data: {
          total_bets: bets.length,
          total_amount: totalAmount,
          total_won: totalWon,
          total_lost: totalLost,
          total_payout: totalPayout,
          win_rate: bets.length > 0 ? ((totalWon / bets.length) * 100).toFixed(2) : 0,
          user_id: userId,
          game_type: gameType
        }
      };

    } catch (error) {
      console.error('❌ Error getting betting statistics:', error);
      throw error;
    }
  }
}

module.exports = Bet;
