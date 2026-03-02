const admin = require('firebase-admin');

class UserProfile {
  constructor(data) {
    this.user_id = data.user_id;
    this.name = data.name || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.balance = data.balance || 0;
    this.total_winnings = data.total_winnings || 0;
    this.total_losses = data.total_losses || 0;
    this.total_bets = data.total_bets || 0;
    this.is_active = data.is_active !== false;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Convert to Firestore format
  toFirestore() {
    return {
      user_id: this.user_id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      balance: this.balance,
      total_winnings: this.total_winnings,
      total_losses: this.total_losses,
      total_bets: this.total_bets,
      is_active: this.is_active,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const db = admin.firestore();
      
      const userDoc = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Get betting statistics
      const Bet = require('./Bet');
      const bettingStats = await Bet.getBettingStatistics(userId);

      return {
        success: true,
        data: {
          user_id: userId,
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          balance: userData.balance || 0,
          total_winnings: bettingStats.data.total_payout || 0,
          total_losses: bettingStats.data.total_amount - (bettingStats.data.total_payout || 0),
          total_bets: bettingStats.data.total_bets || 0,
          win_rate: bettingStats.data.win_rate || 0,
          is_active: userData.is_active !== false,
          created_at: userData.created_at?.toDate?.toISOString() || userData.created_at,
          updated_at: userData.updated_at?.toDate?.toISOString() || userData.updated_at
        }
      };

    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    try {
      const db = admin.firestore();
      
      const userDoc = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      // Validate update data
      const allowedFields = ['name', 'phone', 'is_active'];
      const updates = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Update user document
      await userDoc.ref.update({
        ...updates,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ User profile updated: ${userId}`);

      // Get updated profile
      return await this.getUserProfile(userId);

    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Update user balance
  static async updateUserBalance(userId, amount, type = 'add') {
    try {
      const db = admin.firestore();
      
      const userDoc = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;

      let newBalance;
      if (type === 'add') {
        newBalance = currentBalance + amount;
      } else if (type === 'subtract') {
        if (currentBalance < amount) {
          throw new Error('Insufficient balance');
        }
        newBalance = currentBalance - amount;
      } else {
        throw new Error('Invalid type. Must be add or subtract');
      }

      await userDoc.ref.update({
        balance: newBalance,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Balance updated: ${userId} - ${type}: ${amount} → ${newBalance}`);

      return {
        success: true,
        data: {
          user_id: userId,
          previous_balance: currentBalance,
          new_balance: newBalance,
          amount: amount,
          type: type
        }
      };

    } catch (error) {
      console.error('❌ Error updating balance:', error);
      throw error;
    }
  }

  // Get user balance
  static async getUserBalance(userId) {
    try {
      const db = admin.firestore();
      
      const userDoc = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      return {
        success: true,
        data: {
          user_id: userId,
          balance: userData.balance || 0,
          updated_at: userData.updated_at?.toDate?.toISOString() || userData.updated_at
        }
      };

    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw error;
    }
  }
}

module.exports = UserProfile;
