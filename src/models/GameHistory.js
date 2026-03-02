const admin = require('firebase-admin');
const db = admin.firestore();

class GameHistory {
  constructor(gameData) {
    this.game_type = gameData.game_type;
    this.period_id = gameData.period_id;
    this.number = gameData.number;
    this.color = gameData.color;
    this.result = gameData.result;
    this.big_small = gameData.big_small;
    this.timestamp = gameData.timestamp || new Date().toISOString();
    this.is_completed = gameData.is_completed !== false; // Default to true
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      game_type: this.game_type,
      period_id: this.period_id,
      number: this.number,
      color: this.color,
      result: this.result,
      big_small: this.big_small,
      timestamp: this.timestamp,
      is_completed: this.is_completed,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Create new game period
  static async createGamePeriod(gameData) {
    try {
      const { game_type, period_id, number, color, result, big_small } = gameData;

      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}. Must be one of: ${validGameTypes.join(', ')}`);
      }

      // Validate required fields
      if (!period_id || !number || !color || !result || !big_small) {
        throw new Error('Missing required fields: period_id, number, color, result, big_small');
      }

      // No color validation - store whatever APK sends

      // Check if period already exists
      const existingPeriod = await db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .doc(period_id)
        .get();

      if (existingPeriod.exists) {
        throw new Error(`Period ${period_id} already exists for game type ${game_type}`);
      }

      // Create game period
      const gamePeriod = new GameHistory({
        game_type,
        period_id,
        number,
        color,
        result,
        big_small,
        timestamp: new Date().toISOString(),
        is_completed: true
      });

      // Save to Firestore
      const periodRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .doc(period_id);

      await periodRef.set(gamePeriod.toFirestore());

      console.log(`✅ Game period created: ${game_type} - ${period_id} - ${result} (${number})`);

      // Auto-cleanup: Keep only latest 50 records (delete oldest 10 when reaching 60)
      await this.cleanupOldRecords(game_type);

      return {
        success: true,
        data: {
          game_type,
          period_id,
          number,
          color,
          result,
          big_small,
          timestamp: gamePeriod.timestamp,
          is_completed: true
        }
      };

    } catch (error) {
      console.error('❌ Error creating game period:', error);
      throw error;
    }
  }

  // Get game history for a specific game type
  static async getGameHistory(game_type, limit = 100) {
    try {
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}`);
      }

      const historyRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      const snapshot = await historyRef.get();
      
      const history = [];
      let greenCount = 0, redCount = 0, violetCount = 0;

      snapshot.forEach(doc => {
        const period = doc.data();
        history.push({
          period_id: period.period_id,
          result: period.result,
          number: period.number,
          color: period.color,
          big_small: period.big_small,
          timestamp: period.timestamp,
          is_completed: period.is_completed || true
        });

        // Count statistics
        if (period.result === 'green') greenCount++;
        else if (period.result === 'red') redCount++;
        else if (period.result === 'violet') violetCount++;
      });

      const totalPeriods = history.length;
      const statistics = {
        total_periods: totalPeriods,
        green_count: greenCount,
        red_count: redCount,
        violet_count: violetCount,
        green_percentage: totalPeriods > 0 ? parseFloat((greenCount / totalPeriods * 100).toFixed(2)) : 0,
        red_percentage: totalPeriods > 0 ? parseFloat((redCount / totalPeriods * 100).toFixed(2)) : 0,
        violet_percentage: totalPeriods > 0 ? parseFloat((violetCount / totalPeriods * 100).toFixed(2)) : 0
      };

      return {
        success: true,
        data: {
          game_type,
          history,
          statistics,
          total_records: totalPeriods
        }
      };

    } catch (error) {
      console.error('❌ Error getting game history:', error);
      throw error;
    }
  }

  // Get latest period for a game type
  static async getLatestPeriod(game_type) {
    try {
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}`);
      }

      const latestRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .orderBy('timestamp', 'desc')
        .limit(1);

      const snapshot = await latestRef.get();
      
      if (snapshot.empty) {
        return {
          success: true,
          data: null
        };
      }

      const period = snapshot.docs[0].data();
      
      return {
        success: true,
        data: {
          period_id: period.period_id,
          result: period.result,
          number: period.number,
          color: period.color,
          big_small: period.big_small,
          timestamp: period.timestamp,
          is_completed: period.is_completed || true
        }
      };

    } catch (error) {
      console.error('❌ Error getting latest period:', error);
      throw error;
    }
  }

  // Update game period (for corrections or completion status)
  static async updateGamePeriod(game_type, period_id, updateData) {
    try {
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}`);
      }

      const periodRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .doc(period_id);

      const periodDoc = await periodRef.get();
      
      if (!periodDoc.exists) {
        throw new Error(`Period ${period_id} not found for game type ${game_type}`);
      }

      // Validate update data
      const allowedFields = ['number', 'color', 'result', 'big_small', 'is_completed'];
      const updates = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

      await periodRef.update(updates);

      console.log(`✅ Game period updated: ${game_type} - ${period_id}`);

      return {
        success: true,
        data: {
          game_type,
          period_id,
          updated_fields: Object.keys(updates),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error updating game period:', error);
      throw error;
    }
  }

  // Delete game period (admin only)
  static async deleteGamePeriod(game_type, period_id) {
    try {
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}`);
      }

      const periodRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .doc(period_id);

      const periodDoc = await periodRef.get();
      
      if (!periodDoc.exists) {
        throw new Error(`Period ${period_id} not found for game type ${game_type}`);
      }

      await periodRef.delete();

      console.log(`🗑️ Game period deleted: ${game_type} - ${period_id}`);

      return {
        success: true,
        data: {
          game_type,
          period_id,
          deleted_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error deleting game period:', error);
      throw error;
    }
  }

  // Get statistics for all game types
  static async getAllGameStatistics() {
    try {
      const gameTypes = ['30sec', '1min', '3min', '5min'];
      const allStats = {};

      for (const gameType of gameTypes) {
        const historyData = await this.getGameHistory(gameType, 1000); // Get more for accurate stats
        allStats[gameType] = historyData.data.statistics;
      }

      return {
        success: true,
        data: allStats
      };

    } catch (error) {
      console.error('❌ Error getting all game statistics:', error);
      throw error;
    }
  }

  // Generate period ID based on game type and current time
  static generatePeriodId(game_type) {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    
    let periodNumber;
    
    switch (game_type) {
      case '30sec':
        // Period changes every 30 seconds
        periodNumber = Math.floor(now.getTime() / 30000);
        break;
      case '1min':
        // Period changes every minute
        periodNumber = Math.floor(now.getTime() / 60000);
        break;
      case '3min':
        // Period changes every 3 minutes
        periodNumber = Math.floor(now.getTime() / 180000);
        break;
      case '5min':
        // Period changes every 5 minutes
        periodNumber = Math.floor(now.getTime() / 300000);
        break;
      default:
        throw new Error(`Invalid game_type: ${game_type}`);
    }

    return `${dateStr}${periodNumber.toString().padStart(3, '0')}`;
  }

  // Get color and result based on number
  static getResultFromNumber(number) {
    if (number === 0) {
      return {
        result: 'violet',
        color: '#8B5CF6',
        big_small: 'small'
      };
    } else if (number === 5) {
      return {
        result: 'violet',
        color: '#8B5CF6',
        big_small: 'big'
      };
    } else if (number >= 1 && number <= 4) {
      return {
        result: 'green',
        color: '#10B981',
        big_small: 'small'
      };
    } else if (number >= 6 && number <= 9) {
      return {
        result: 'red',
        color: '#EF4444',
        big_small: 'big'
      };
    } else {
      throw new Error(`Invalid number: ${number}. Must be between 0 and 9.`);
    }
  }

  // Get big_small based on number
  static getBigSmallFromNumber(number) {
    if (number >= 0 && number <= 4) {
      return 'small';
    } else if (number >= 5 && number <= 9) {
      return 'big';
    } else {
      throw new Error(`Invalid number: ${number}. Must be between 0 and 9.`);
    }
  }

  // Get specific period
  static async getPeriod(game_type, period_id) {
    try {
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        throw new Error(`Invalid game_type: ${game_type}`);
      }

      const periodRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .doc(period_id);

      const doc = await periodRef.get();
      
      if (!doc.exists) {
        return null;
      }

      const period = doc.data();
      return {
        period_id: period.period_id,
        result: period.result,
        number: period.number,
        color: period.color,
        big_small: period.big_small,
        timestamp: period.timestamp,
        is_completed: period.is_completed || true
      };

    } catch (error) {
      console.error('❌ Error getting period:', error);
      throw error;
    }
  }

  // Auto-cleanup: Keep only latest 50 records, delete oldest 10 when reaching 60
  static async cleanupOldRecords(game_type) {
    try {
      console.log(`🧹 Checking cleanup for ${game_type}...`);

      // Get all records ordered by timestamp (oldest first)
      const allRecordsRef = db
        .collection('game_history')
        .doc(game_type)
        .collection('periods')
        .orderBy('timestamp', 'asc'); // Oldest first

      const snapshot = await allRecordsRef.get();
      const totalRecords = snapshot.size;

      console.log(`📊 ${game_type}: Current records = ${totalRecords}`);

      // If we have more than 60 records, delete the oldest ones to keep only 50
      if (totalRecords > 60) {
        const recordsToDelete = totalRecords - 50; // Delete oldest records to keep 50
        console.log(`🗑️ ${game_type}: Deleting ${recordsToDelete} oldest records to maintain 50 latest`);

        // Get the oldest records to delete
        const oldestRecords = snapshot.docs.slice(0, recordsToDelete);
        
        // Delete in batches
        const batch = db.batch();
        oldestRecords.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ ${game_type}: Cleanup completed. Deleted ${recordsToDelete} records, kept 50 latest`);
      } else {
        console.log(`✅ ${game_type}: No cleanup needed. Current: ${totalRecords}, Limit: 60`);
      }

    } catch (error) {
      console.error(`❌ Error during cleanup for ${game_type}:`, error);
      // Don't throw error - cleanup failure shouldn't break the main functionality
    }
  }
}

module.exports = GameHistory;
