const admin = require('firebase-admin');
const db = admin.firestore();

class AdminController {
  // Get all users with essential information only
  static async getAllUsers(req, res) {
    try {
      console.log('👥 Admin fetching all users (simplified)');
      
      const { limit = 50, offset = 0 } = req.query;
      
      const usersSnapshot = await db.collection('users')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .get();
      
      const users = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        
        // Get user's active sessions and device info
        let deviceInfo = null;
        let isActive = false;
        
        try {
          const sessionsSnapshot = await db.collection('sessions')
            .where('user_id', '==', doc.id)
            .where('is_active', '==', true)
            .limit(1)
            .get();
          
          if (!sessionsSnapshot.empty) {
            const sessionData = sessionsSnapshot.docs[0].data();
            deviceInfo = sessionData.device_info || null;
            isActive = true;
          }
        } catch (sessionError) {
          console.error('❌ Error fetching session for user:', doc.id, sessionError);
        }
        
        users.push({
          id: doc.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          device_info: deviceInfo,
          is_active: isActive,
          created_at: userData.created_at,
          last_login: userData.last_login || null
        });
      }
      
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: users,
          total: users.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  // Get specific user details (essential info only)
  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      console.log('👤 Admin fetching user details (simplified):', userId);
      
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const userData = userDoc.data();
      
      // Get user's active session and device info
      let deviceInfo = null;
      let isActive = false;
      
      try {
        const sessionsSnapshot = await db.collection('sessions')
          .where('user_id', '==', userId)
          .where('is_active', '==', true)
          .limit(1)
          .get();
        
        if (!sessionsSnapshot.empty) {
          const sessionData = sessionsSnapshot.docs[0].data();
          deviceInfo = sessionData.device_info || null;
          isActive = true;
        }
      } catch (sessionError) {
        console.error('❌ Error fetching session for user:', userId, sessionError);
      }
      
      res.json({
        success: true,
        data: {
          id: userId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          device_info: deviceInfo,
          is_active: isActive,
          created_at: userData.created_at,
          last_login: userData.last_login || null
        }
      });
      
    } catch (error) {
      console.error('❌ Get user details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Update user status (activate/deactivate)
  static async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      
      console.log('🔄 Admin updating user status:', userId, 'to:', status);
      
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active, inactive, or suspended'
        });
      }
      
      await db.collection('users').doc(userId).update({
        status: status,
        updated_at: new Date().toISOString()
      });
      
      // If deactivating user, also deactivate their sessions
      if (status === 'inactive' || status === 'suspended') {
        await db.collection('sessions')
          .where('user_id', '==', userId)
          .where('is_active', '==', true)
          .get()
          .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.update(doc.ref, {
                is_active: false,
                ended_at: new Date().toISOString()
              });
            });
            return batch.commit();
          });
      }
      
      res.json({
        success: true,
        message: `User status updated to ${status} successfully`
      });
      
    } catch (error) {
      console.error('❌ Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all deposit transactions
  static async getAllDeposits(req, res) {
    try {
      console.log('💰 Admin fetching all deposit transactions');
      
      const { limit = 50, offset = 0, status } = req.query;
      
      // Get all transactions and filter in code (to avoid index issues)
      const transactionsSnapshot = await db.collection('transactions')
        .get();
      
      const deposits = [];
      
      for (const doc of transactionsSnapshot.docs) {
        const transactionData = doc.data();
        
        // Filter for deposits only
        if (transactionData.particular !== 'Deposit') {
          continue;
        }
        
        // Filter by status if provided
        if (status && transactionData.status !== status) {
          continue;
        }
        
        // Get user information
        let userInfo = null;
        try {
          const userDoc = await db.collection('users').doc(transactionData.user_id).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userInfo = {
              name: userData.name,
              email: userData.email,
              phone: userData.phone
            };
          }
        } catch (userError) {
          console.error('❌ Error fetching user for transaction:', doc.id, userError);
        }
        
        deposits.push({
          id: doc.id,
          transaction_id: transactionData.transaction_id,
          user_id: transactionData.user_id,
          user_info: userInfo,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          payment_details: transactionData.payment_details,
          utr_number: transactionData.utr_number,
          phone_number: transactionData.phone_number,
          status: transactionData.status,
          particular: transactionData.particular,
          created_at: transactionData.created_at,
          updated_at: transactionData.updated_at
        });
        
        // Limit results
        if (deposits.length >= parseInt(limit)) {
          break;
        }
      }
      
      res.json({
        success: true,
        message: 'Deposit transactions retrieved successfully',
        data: {
          deposits: deposits,
          total: deposits.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching deposit transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deposit transactions',
        error: error.message
      });
    }
  }

  // Get all withdrawal transactions
  static async getAllWithdrawals(req, res) {
    try {
      console.log('💸 Admin fetching all withdrawal transactions');
      
      const { limit = 50, offset = 0, status } = req.query;
      
      let query = db.collection('transactions')
        .where('particular', '==', 'Withdraw');
      
      // Filter by status if provided
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const withdrawalsSnapshot = await query
        .limit(parseInt(limit))
        .get();
      
      const withdrawals = [];
      
      for (const doc of withdrawalsSnapshot.docs) {
        const transactionData = doc.data();
        
        // Get user information
        let userInfo = null;
        try {
          const userDoc = await db.collection('users').doc(transactionData.user_id).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userInfo = {
              name: userData.name,
              email: userData.email,
              phone: userData.phone
            };
          }
        } catch (userError) {
          console.error('❌ Error fetching user for transaction:', doc.id, userError);
        }
        
        withdrawals.push({
          id: doc.id,
          transaction_id: transactionData.transaction_id,
          user_id: transactionData.user_id,
          user_info: userInfo,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          payment_details: transactionData.payment_details,
          utr_number: transactionData.utr_number,
          phone_number: transactionData.phone_number,
          status: transactionData.status,
          particular: transactionData.particular,
          created_at: transactionData.created_at,
          updated_at: transactionData.updated_at
        });
      }
      
      res.json({
        success: true,
        message: 'Withdrawal transactions retrieved successfully',
        data: {
          withdrawals: withdrawals,
          total: withdrawals.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching withdrawal transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal transactions',
        error: error.message
      });
    }
  }

  // Update deposit transaction status (pending -> received)
  static async updateDepositStatus(req, res) {
    try {
      console.log('🔄 Admin updating deposit transaction status');
      
      const { transactionId } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'received', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: pending, received, or rejected'
        });
      }
      
      // Get transaction
      const transactionDoc = await db.collection('transactions').doc(transactionId).get();
      
      if (!transactionDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const transactionData = transactionDoc.data();
      
      // Verify it's a deposit transaction
      if (transactionData.particular !== 'Deposit') {
        return res.status(400).json({
          success: false,
          message: 'This endpoint only works for deposit transactions'
        });
      }
      
      // Update transaction status
      await db.collection('transactions').doc(transactionId).update({
        status: status,
        updated_at: new Date().toISOString()
      });
      
      // If status is 'received', update user wallet balance and generate wallet number if first deposit
      if (status === 'received') {
        try {
          console.log(`🔍 Checking wallet for user: ${transactionData.user_id}`);
          const walletRef = db.collection('wallets').doc(transactionData.user_id);
          const walletDoc = await walletRef.get();
          
          console.log(`🔍 Wallet exists: ${walletDoc.exists}`);
          
          if (walletDoc.exists) {
            const walletData = walletDoc.data();
            console.log(`🔍 Current wallet data:`, {
              wallet_number: walletData.wallet_number,
              balance: walletData.balance,
              total_deposited: walletData.total_deposited
            });
            
            // Check if this is the first deposit (no wallet number yet)
            const isFirstDeposit = !walletData.wallet_number || walletData.wallet_number === '';
            console.log(`🔍 Is first deposit: ${isFirstDeposit}`);
            
            // Prepare wallet update data
            const updateData = {
              balance: walletData.balance + transactionData.amount,
              total_deposited: (walletData.total_deposited || 0) + transactionData.amount,  // Use same field name
              updated_at: new Date().toISOString()
            };
            
            // Generate wallet number only for first deposit
            if (isFirstDeposit) {
              updateData.wallet_number = await AdminController.generateWalletNumber(transactionData.user_id);
              console.log(`🔍 Generated new wallet number: ${updateData.wallet_number}`);
            }
            
            await walletRef.update(updateData);
            
            console.log(`💰 Wallet updated for user ${transactionData.user_id}:`, {
              amount_added: transactionData.amount,
              new_balance: updateData.balance,
              total_deposited: updateData.total_deposited,  // Use same field name
              wallet_number_generated: isFirstDeposit
            });
          } else {
            console.log(`🔍 Creating new wallet for user: ${transactionData.user_id}`);
            // Create wallet if it doesn't exist
            const walletNumber = await AdminController.generateWalletNumber(transactionData.user_id);
            await walletRef.set({
              user_id: transactionData.user_id,
              wallet_number: walletNumber,
              balance: transactionData.amount,
              total_deposited: transactionData.amount,  // Use same field name as Wallet model
              user_name: 'User',  // Add user_name field
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            console.log(`💰 New wallet created for user ${transactionData.user_id}:`, {
              wallet_number: walletNumber,
              initial_balance: transactionData.amount
            });
          }
        } catch (walletError) {
          console.error('❌ Error updating wallet:', walletError);
          // Continue with transaction update even if wallet update fails
          console.log('⚠️ Transaction status updated but wallet update failed');
        }
      }
      
      res.json({
        success: true,
        message: `Deposit transaction status updated to ${status}`,
        data: {
          transaction_id: transactionId,
          new_status: status,
          amount: transactionData.amount
        }
      });
      
    } catch (error) {
      console.error('❌ Error updating deposit status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update deposit status',
        error: error.message
      });
    }
  }

  // Update withdrawal transaction status
  static async updateWithdrawalStatus(req, res) {
    try {
      console.log('🔄 Admin updating withdrawal transaction status');
      
      const { transactionId } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'processing', 'completed', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: pending, processing, completed, or rejected'
        });
      }
      
      // Get transaction
      const transactionDoc = await db.collection('transactions').doc(transactionId).get();
      
      if (!transactionDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const transactionData = transactionDoc.data();
      
      // Verify it's a withdrawal transaction
      if (transactionData.particular !== 'Withdraw') {
        return res.status(400).json({
          success: false,
          message: 'This endpoint only works for withdrawal transactions'
        });
      }
      
      // Update transaction status
      await db.collection('transactions').doc(transactionId).update({
        status: status,
        updated_at: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: `Withdrawal transaction status updated to ${status}`,
        data: {
          transaction_id: transactionId,
          new_status: status,
          amount: transactionData.amount
        }
      });
      
    } catch (error) {
      console.error('❌ Error updating withdrawal status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update withdrawal status',
        error: error.message
      });
    }
  }

  // Helper method to generate unique wallet number
  static async generateWalletNumber(userId) {
    try {
      // Generate wallet number with prefix and user ID
      const timestamp = Date.now().toString().slice(-6);
      const userSuffix = userId.slice(-4);
      const walletNumber = `WLT${timestamp}${userSuffix}`;
      
      // Check if wallet number already exists (very unlikely but just in case)
      const existingWallet = await db.collection('wallets')
        .where('wallet_number', '==', walletNumber)
        .get();
      
      if (!existingWallet.empty) {
        // If exists, generate again with different timestamp
        return this.generateWalletNumber(userId);
      }
      
      return walletNumber;
    } catch (error) {
      console.error('❌ Error generating wallet number:', error);
      // Fallback to simple timestamp
      return `WLT${Date.now()}`;
    }
  }
}

module.exports = AdminController;
