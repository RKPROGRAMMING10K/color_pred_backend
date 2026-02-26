const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const BankDetails = require('../models/BankDetails');
const UpiDetails = require('../models/UpiDetails');

class WithdrawController {
  // Create withdrawal request (user only provides amount)
  static async createWithdrawal(req, res) {
    try {
      console.log('💸 Create withdrawal request received:', req.body);
      
      const userId = req.user.userId;
      const { amount } = req.body;

      // Validate amount
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Get user's payment details (bank or UPI)
      let paymentDetails = null;
      let paymentMethod = '';

      // Try to get bank details first
      const bankDetails = await BankDetails.findByUserId(userId);
      if (bankDetails) {
        paymentDetails = bankDetails;
        paymentMethod = 'Bank Transfer';
      } else {
        // Try to get UPI details
        const upiDetails = await UpiDetails.findByUserId(userId);
        if (upiDetails) {
          paymentDetails = upiDetails;
          paymentMethod = 'UPI Transfer';
        } else {
          return res.status(400).json({
            success: false,
            message: 'No payment details found. Please add bank or UPI details first.'
          });
        }
      }

      // Create withdrawal transaction
      const transactionData = {
        payment_method: paymentMethod,
        amount: parseFloat(amount),
        utr_number: 'AUTO-' + Date.now(), // Auto-generated for withdrawals
        phone_number: paymentDetails.phone_number || 'AUTO',
        particular: 'Withdraw'
      };

      const result = await Transaction.create(userId, transactionData);

      // Get user details for response
      const userDoc = await require('firebase-admin').firestore()
        .collection('users').doc(userId).get();
      const userData = userDoc.data();

      res.status(201).json({
        success: true,
        message: 'Withdrawal request created successfully',
        data: {
          transaction_id: result.transaction_id,
          status: 'pending',
          payment_method: paymentMethod,
          amount: parseFloat(amount),
          particular: 'Withdraw',
          payment_details: {
            type: bankDetails ? 'Bank' : 'UPI',
            details: bankDetails ? {
              bank_name: bankDetails.bank_name,
              account_holder_name: bankDetails.account_holder_name,
              masked_account_number: bankDetails.masked_account_number,
              ifsc_code: bankDetails.ifsc_code
            } : {
              upi_name: upiDetails.upi_name,
              upi_id: upiDetails.upi_id
            }
          },
          created_at: new Date().toISOString(),
          user_name: userData.name
        }
      });

    } catch (error) {
      console.error('❌ Create withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get withdrawal requests for user
  static async getWithdrawals(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50 } = req.query;
      
      console.log('📋 Get withdrawals for user:', userId);

      // Get transactions with particular = 'Withdraw'
      const transactions = await Transaction.findByUserId(userId, parseInt(limit));
      const withdrawals = transactions.filter(tx => tx.particular === 'Withdraw');

      res.json({
        success: true,
        data: withdrawals,
        count: withdrawals.length
      });

    } catch (error) {
      console.error('❌ Get withdrawals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get withdrawal details
  static async getWithdrawalDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { transaction_id } = req.params;
      
      console.log('🔍 Get withdrawal details:', transaction_id);

      const transaction = await Transaction.findByTransactionId(transaction_id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      // Verify transaction belongs to user and is a withdrawal
      if (transaction.user_id !== userId || transaction.particular !== 'Withdraw') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this withdrawal'
        });
      }

      res.json({
        success: true,
        data: transaction
      });

    } catch (error) {
      console.error('❌ Get withdrawal details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = WithdrawController;
