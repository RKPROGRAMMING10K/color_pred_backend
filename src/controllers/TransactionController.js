const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const FCMService = require('../services/FCMService');

class TransactionController {
  // Create new transaction (Deposit only)
  static async createTransaction(req, res) {
    try {
      console.log('💰 Create deposit transaction request received:', req.body);
      
      const userId = req.user.userId;
      const { payment_method, amount, utr_number, phone_number } = req.body;

      // Create transaction (always Deposit for this endpoint)
      const transactionData = {
        payment_method,
        amount,
        utr_number,
        phone_number,
        particular: 'Deposit' // Force Deposit for this endpoint
      };

      const result = await Transaction.create(userId, transactionData);

      // Don't create wallet during transaction creation
      // Wallet will be created when admin updates status to 'received'
      
      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: {
          transaction_id: result.transaction_id,
          document_id: result.document_id,
          status: 'pending'
        }
      });

      // Send notification to admins after response
      // Get user details for notification
      try {
        const userDoc = await require('firebase-admin').firestore()
          .collection('users')
          .doc(userId)
          .get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log(`📱 Sending deposit notification to admins for user: ${userData.name}`);
          
          const adminNotificationResult = await FCMService.sendNewDepositNotificationToAdmins(
            amount,
            userData.name,
            payment_method,
            result.transaction_id
          );
          
          console.log(`📱 Admin notification result:`, adminNotificationResult);
        }
      } catch (userError) {
        console.error('❌ Error getting user details for admin notification:', userError);
      }

    } catch (error) {
      console.error('❌ Create transaction error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get user transactions
  static async getUserTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50, status } = req.query;
      
      console.log('📋 Get transactions request for user:', userId);

      let transactions = await Transaction.findByUserId(userId, parseInt(limit));

      // Filter by status if provided
      if (status) {
        transactions = transactions.filter(tx => tx.status === status);
      }

      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });

    } catch (error) {
      console.error('❌ Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get transaction details
  static async getTransactionDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { transaction_id } = req.params;
      
      console.log('🔍 Get transaction details:', transaction_id);

      const transaction = await Transaction.findByTransactionId(transaction_id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify transaction belongs to user
      if (transaction.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this transaction'
        });
      }

      res.json({
        success: true,
        data: transaction
      });

    } catch (error) {
      console.error('❌ Get transaction details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update transaction status (Admin only - for now, but we'll implement proper admin auth later)
  static async updateTransactionStatus(req, res) {
    try {
      const { transaction_id } = req.params;
      const { status } = req.body;
      
      console.log('🔄 Update transaction status:', transaction_id, 'to:', status);

      // Validate status
      if (!['pending', 'received', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be pending, received, or rejected'
        });
      }

      // Get transaction details before updating
      const transaction = await Transaction.findByTransactionId(transaction_id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Update transaction status
      await Transaction.updateStatus(transaction_id, status);

      // If status is 'received', add funds to wallet
      let walletUpdate = null;
      if (status === 'received') {
        try {
          const walletResult = await Wallet.addFunds(transaction.user_id, transaction.amount);
          walletUpdate = {
            new_balance: walletResult.new_balance,
            message: walletResult.message
          };
        } catch (walletError) {
          console.error('❌ Failed to add funds to wallet:', walletError);
          // Don't fail the transaction update, but log the wallet error
        }
      }

      res.json({
        success: true,
        message: `Transaction status updated to ${status}`,
        data: {
          transaction_id: transaction_id,
          status: status,
          updated_at: new Date().toISOString(),
          ...(walletUpdate && { wallet_update: walletUpdate })
        }
      });

    } catch (error) {
      console.error('❌ Update transaction status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get wallet details
  static async getWalletDetails(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('💼 Get wallet details for user:', userId);

      const walletDetails = await Wallet.getWalletDetails(userId);
      
      if (!walletDetails) {
        // Get user details for default wallet response
        let actualUserName = "User";
        try {
          const userDoc = await require('firebase-admin').firestore()
            .collection('users').doc(userId).get();
          const userData = userDoc.data();
          actualUserName = userData.name || "User";
        } catch (userError) {
          console.error('❌ Failed to get user details:', userError);
        }

        // Return default wallet info with actual user name
        return res.json({
          success: true,
          data: {
            wallet_number: "0000000000000000",
            balance: 0,
            total_deposited: 0,
            user_name: actualUserName,
            is_active: false,
            expiry: "00",
            message: "Default wallet - Make a deposit to activate"
          }
        });
      }

      res.json({
        success: true,
        data: {
          wallet_number: walletDetails.wallet_number,
          balance: parseFloat(walletDetails.balance),
          total_deposited: parseFloat(walletDetails.total_deposited),
          user_name: walletDetails.user_name,
          is_active: walletDetails.is_active,
          expiry: "00" // Default expiry for now
        }
      });

    } catch (error) {
      console.error('❌ Get wallet details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get wallet balance only
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('💰 Get wallet balance for user:', userId);

      const balanceInfo = await Wallet.getBalance(userId);
      
      if (!balanceInfo) {
        // Get user details for default wallet response
        let actualUserName = "User";
        try {
          const userDoc = await require('firebase-admin').firestore()
            .collection('users').doc(userId).get();
          const userData = userDoc.data();
          actualUserName = userData.name || "User";
        } catch (userError) {
          console.error('❌ Failed to get user details:', userError);
        }

        // Return default wallet info with actual user name
        return res.json({
          success: true,
          data: {
            balance: 0,
            wallet_number: "0000000000000000",
            expiry: "00",
            user_name: actualUserName,
            message: "Default wallet - Make a deposit to activate"
          }
        });
      }

      res.json({
        success: true,
        data: {
          balance: balanceInfo.balance,
          wallet_number: balanceInfo.wallet_number,
          user_name: balanceInfo.user_name,
          expiry: "00" // Default expiry for now
        }
      });

    } catch (error) {
      console.error('❌ Get wallet balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = TransactionController;
