const admin = require('firebase-admin');

class AdvancedBet {
  constructor(data) {
    this.gameType = data.gameType;
    this.period = data.period;
    this.betType = data.betType; // number, color, size
    this.betValue = data.betValue;
    this.amount = data.amount;
    this.quantity = data.quantity;
    this.multiplier = data.multiplier;
    this.totalBetAmount = data.totalBetAmount;
    this.userId = data.userId;
    this.status = data.status || 'pending'; // pending, won, lost
    this.resultAmount = data.resultAmount || 0;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.processedAt = data.processedAt || null;
  }

  // Convert to Firestore format
  toFirestore() {
    return {
      gameType: this.gameType,
      period: this.period,
      betType: this.betType,
      betValue: this.betValue,
      amount: this.amount,
      quantity: this.quantity,
      multiplier: this.multiplier,
      totalBetAmount: this.totalBetAmount,
      userId: this.userId,
      status: this.status,
      resultAmount: this.resultAmount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: this.processedAt ? admin.firestore.Timestamp.fromDate(new Date(this.processedAt)) : null
    };
  }

  // Place a new bet and deduct from wallet
  static async placeBet(betData) {
    try {
      const db = admin.firestore();
      
      // Validate required fields
      const requiredFields = ['gameType', 'period', 'betType', 'betValue', 'amount', 'quantity', 'multiplier', 'totalBetAmount', 'userId'];
      for (const field of requiredFields) {
        if (!betData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate bet type
      const validBetTypes = ['number', 'color', 'size'];
      if (!validBetTypes.includes(betData.betType)) {
        throw new Error(`Invalid betType: ${betData.betType}. Must be number, color, or size`);
      }

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(betData.gameType)) {
        throw new Error(`Invalid gameType: ${betData.gameType}`);
      }

      // Check if user has sufficient balance
      const userWallet = await this.getUserWallet(betData.userId);
      if (userWallet.balance < betData.totalBetAmount) {
        throw new Error(`Insufficient balance. Required: ${betData.totalBetAmount}, Available: ${userWallet.balance}`);
      }

      // Check if bet already exists for this period and user
      const existingBet = await db
        .collection('advanced_bets')
        .where('userId', '==', betData.userId)
        .where('period', '==', betData.period)
        .where('gameType', '==', betData.gameType)
        .limit(1)
        .get();

      if (!existingBet.empty) {
        throw new Error('Bet already exists for this period');
      }

      // Create bet object
      const bet = new AdvancedBet(betData);

      // Start transaction for atomic operations
      await db.runTransaction(async (transaction) => {
        // Deduct amount from user wallet
        const walletRef = db.collection('user_wallets').doc(betData.userId);
        const walletDoc = await transaction.get(walletRef);
        
        if (!walletDoc.exists) {
          throw new Error('User wallet not found');
        }

        const currentBalance = walletDoc.data().balance || 0;
        if (currentBalance < betData.totalBetAmount) {
          throw new Error('Insufficient balance during transaction');
        }

        const newBalance = currentBalance - betData.totalBetAmount;
        transaction.update(walletRef, {
          balance: newBalance,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create bet record
        const betRef = db.collection('advanced_bets').doc();
        transaction.set(betRef, bet.toFirestore());

        // Create transaction record
        const transactionRef = db.collection('wallet_transactions').doc();
        transaction.set(transactionRef, {
          userId: betData.userId,
          type: 'bet',
          amount: -betData.totalBetAmount,
          balance: newBalance,
          description: `Bet placed on ${betData.gameType} - ${betData.period}`,
          betId: betRef.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      console.log(`✅ Bet placed: ${betData.userId} - ${betData.gameType} - ${betData.period} - ${betData.betType}:${betData.betValue} (${betData.totalBetAmount})`);

      return {
        success: true,
        data: {
          betId: betRef.id,
          gameType: betData.gameType,
          period: betData.period,
          betType: betData.betType,
          betValue: betData.betValue,
          amount: betData.amount,
          quantity: betData.quantity,
          multiplier: betData.multiplier,
          totalBetAmount: betData.totalBetAmount,
          userId: betData.userId,
          status: 'pending',
          timestamp: bet.timestamp
        }
      };

    } catch (error) {
      console.error('❌ Error placing bet:', error);
      throw error;
    }
  }

  // Process bets for a specific period based on game result
  static async processBetsForPeriod(gameType, period, gameResult) {
    try {
      const db = admin.firestore();
      
      console.log(`🎮 Processing bets for ${gameType} - ${period} - Result: ${JSON.stringify(gameResult)}`);

      // Get all pending bets for this period
      const betsSnapshot = await db
        .collection('advanced_bets')
        .where('gameType', '==', gameType)
        .where('period', '==', period)
        .where('status', '==', 'pending')
        .get();

      if (betsSnapshot.empty) {
        console.log(`⚠️ No pending bets found for ${gameType} - ${period}`);
        return { success: true, processedBets: [], totalPayout: 0 };
      }

      const processedBets = [];
      let totalPayout = 0;

      // Process each bet
      await db.runTransaction(async (transaction) => {
        for (const betDoc of betsSnapshot.docs) {
          const bet = betDoc.data();
          const isWin = this.checkBetWin(bet, gameResult);
          const resultAmount = isWin ? this.calculateWinAmount(bet) : 0;

          // Update bet status
          const betRef = db.collection('advanced_bets').doc(betDoc.id);
          transaction.update(betRef, {
            status: isWin ? 'won' : 'lost',
            resultAmount: resultAmount,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update user wallet
          const walletRef = db.collection('user_wallets').doc(bet.userId);
          const walletDoc = await transaction.get(walletRef);
          
          if (walletDoc.exists) {
            const currentBalance = walletDoc.data().balance || 0;
            const newBalance = currentBalance + resultAmount;
            
            transaction.update(walletRef, {
              balance: newBalance,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create transaction record
            const transactionRef = db.collection('wallet_transactions').doc();
            transaction.set(transactionRef, {
              userId: bet.userId,
              type: isWin ? 'win' : 'loss',
              amount: resultAmount,
              balance: newBalance,
              description: `Bet ${isWin ? 'won' : 'lost'} on ${gameType} - ${period}`,
              betId: betDoc.id,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create winning history record
            if (isWin) {
              const winHistoryRef = db.collection('winning_history').doc();
              transaction.set(winHistoryRef, {
                userId: bet.userId,
                gameType: gameType,
                period: period,
                betType: bet.betType,
                betValue: bet.betValue,
                betAmount: bet.totalBetAmount,
                winAmount: resultAmount,
                multiplier: bet.multiplier,
                gameResult: gameResult,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            }

            totalPayout += resultAmount;
          }

          processedBets.push({
            betId: betDoc.id,
            userId: bet.userId,
            betType: bet.betType,
            betValue: bet.betValue,
            totalBetAmount: bet.totalBetAmount,
            status: isWin ? 'won' : 'lost',
            resultAmount: resultAmount,
            isWin: isWin
          });
        }
      });

      console.log(`✅ Processed ${processedBets.length} bets for ${gameType} - ${period}, Total Payout: ${totalPayout}`);

      return {
        success: true,
        processedBets,
        totalPayout,
        totalBets: processedBets.length
      };

    } catch (error) {
      console.error('❌ Error processing bets:', error);
      throw error;
    }
  }

  // Check if bet wins based on game result
  static checkBetWin(bet, gameResult) {
    const { betType, betValue } = bet;
    const { number, color, big_small } = gameResult;

    switch (betType) {
      case 'number':
        return betValue === number.toString();
      
      case 'color':
        // Handle violet (which is both red and green)
        if (betValue.toLowerCase() === 'violet') {
          return color.toLowerCase() === 'violet';
        }
        return betValue.toLowerCase() === color.toLowerCase();
      
      case 'size':
        return betValue.toLowerCase() === big_small.toLowerCase();
      
      default:
        return false;
    }
  }

  // Calculate win amount based on bet type and multiplier
  static calculateWinAmount(bet) {
    const multiplier = parseFloat(bet.multiplier.replace('X', ''));
    return bet.totalBetAmount * multiplier;
  }

  // Get user wallet
  static async getUserWallet(userId) {
    try {
      const db = admin.firestore();
      const walletDoc = await db.collection('user_wallets').doc(userId).get();
      
      if (!walletDoc.exists) {
        // Create wallet if doesn't exist
        await db.collection('user_wallets').doc(userId).set({
          balance: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        return { balance: 0 };
      }

      return {
        balance: walletDoc.data().balance || 0,
        lastUpdated: walletDoc.data().lastUpdated?.toDate?.toISOString() || walletDoc.data().lastUpdated
      };
    } catch (error) {
      console.error('❌ Error getting user wallet:', error);
      throw error;
    }
  }

  // Get user's betting history
  static async getUserBettingHistory(userId, gameType = null, limit = 50) {
    try {
      const db = admin.firestore();
      let query = db
        .collection('advanced_bets')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc');

      if (gameType) {
        query = query.where('gameType', '==', gameType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      const bets = [];

      snapshot.forEach(doc => {
        const bet = doc.data();
        bets.push({
          betId: doc.id,
          gameType: bet.gameType,
          period: bet.period,
          betType: bet.betType,
          betValue: bet.betValue,
          amount: bet.amount,
          quantity: bet.quantity,
          multiplier: bet.multiplier,
          totalBetAmount: bet.totalBetAmount,
          status: bet.status,
          resultAmount: bet.resultAmount || 0,
          timestamp: bet.timestamp?.toDate?.toISOString() || bet.timestamp,
          processedAt: bet.processedAt?.toDate?.toISOString() || bet.processedAt
        });
      });

      return {
        success: true,
        data: {
          bets,
          totalBets: bets.length,
          gameType: gameType
        }
      };

    } catch (error) {
      console.error('❌ Error getting user betting history:', error);
      throw error;
    }
  }

  // Get user's winning history
  static async getUserWinningHistory(userId, gameType = null, limit = 50) {
    try {
      const db = admin.firestore();
      let query = db
        .collection('winning_history')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc');

      if (gameType) {
        query = query.where('gameType', '==', gameType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      const winnings = [];

      snapshot.forEach(doc => {
        const win = doc.data();
        winnings.push({
          winId: doc.id,
          userId: win.userId,
          gameType: win.gameType,
          period: win.period,
          betType: win.betType,
          betValue: win.betValue,
          betAmount: win.betAmount,
          winAmount: win.winAmount,
          multiplier: win.multiplier,
          gameResult: win.gameResult,
          timestamp: win.timestamp?.toDate?.toISOString() || win.timestamp
        });
      });

      return {
        success: true,
        data: {
          winnings,
          totalWinnings: winnings.length,
          totalWinAmount: winnings.reduce((sum, win) => sum + win.winAmount, 0),
          gameType: gameType
        }
      };

    } catch (error) {
      console.error('❌ Error getting user winning history:', error);
      throw error;
    }
  }
}

module.exports = AdvancedBet;
