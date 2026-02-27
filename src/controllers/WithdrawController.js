const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const BankDetails = require('../models/BankDetails');
const UpiDetails = require('../models/UpiDetails');
const FCMService = require('../services/FCMService');

class WithdrawController {
  // Create withdrawal request (user provides amount and payment method)
  static async createWithdrawal(req, res) {
    try {
      console.log('💸 Create withdrawal request received:', req.body);
      
      const userId = req.user.userId;
      const { amount, payment_method } = req.body;

      // Validate amount
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Validate payment method
      if (!payment_method || (payment_method !== 'Bank Transfer' && payment_method !== 'UPI')) {
        return res.status(400).json({
          success: false,
          message: 'Payment method must be either "Bank Transfer" or "UPI"'
        });
      }

      // Get user's payment details based on payment method
      let paymentDetails = null;

      if (payment_method === 'Bank Transfer') {
        // Get bank details
        const bankDetails = await BankDetails.findByUserId(userId);
        if (!bankDetails) {
          return res.status(400).json({
            success: false,
            message: 'No bank details found. Please add bank details first.'
          });
        }
        paymentDetails = bankDetails;
      } else if (payment_method === 'UPI') {
        // Get UPI details
        const upiDetails = await UpiDetails.findByUserId(userId);
        if (!upiDetails) {
          return res.status(400).json({
            success: false,
            message: 'No UPI details found. Please add UPI details first.'
          });
        }
        paymentDetails = upiDetails;
      }

      // Create withdrawal transaction
      const transactionData = {
        payment_method: payment_method,
        amount: parseFloat(amount),
        utr_number: 'AUTO-' + Date.now(), // Auto-generated for withdrawals
        phone_number: paymentDetails.phone_number || 'AUTO',
        particular: 'Withdraw'
      };

      const result = await Transaction.create(userId, transactionData);
      
      console.log('🔍 Transaction creation result:', result);

      // Get user details for response
      const userDoc = await require('firebase-admin').firestore()
        .collection('users').doc(userId).get();
      const userData = userDoc.data();

      // Prepare payment details response based on method
      let paymentDetailsResponse = {};
      
      if (payment_method === 'Bank Transfer') {
        paymentDetailsResponse = {
          type: 'Bank',
          bank_name: paymentDetails.bank_name,
          account_holder_name: paymentDetails.account_holder_name,
          account_number: paymentDetails.account_number,
          ifsc_code: paymentDetails.ifsc_code,
          phone_number: paymentDetails.phone_number
        };
      } else if (payment_method === 'UPI') {
        paymentDetailsResponse = {
          type: 'UPI',
          upi_name: paymentDetails.upi_name,
          upi_id: paymentDetails.upi_id,
          phone_number: paymentDetails.phone_number
        };
      }

      res.status(201).json({
        success: true,
        message: 'Withdrawal request created successfully',
        data: {
          transaction_id: result.transaction_id,
          status: 'pending',
          payment_method: payment_method,
          amount: parseFloat(amount),
          particular: 'Withdraw',
          payment_details: paymentDetailsResponse,
          created_at: new Date().toISOString(),
          user_name: userData.name
        }
      });

      // Send notification to admins after response
      console.log(`📱 Sending withdrawal notification to admins for user: ${userData.name}`);
      const adminNotificationResult = await FCMService.sendNewWithdrawalNotificationToAdmins(
        parseFloat(amount),
        userData.name,
        payment_method,
        result.transaction_id
      );
      
      console.log(`📱 Admin notification result:`, adminNotificationResult);

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

      // Enhance withdrawals with payment details
      const enhancedWithdrawals = await Promise.all(withdrawals.map(async (withdrawal) => {
        let paymentDetails = {};
        
        if (withdrawal.payment_method === 'Bank Transfer') {
          const bankDetails = await BankDetails.findByUserId(userId);
          if (bankDetails) {
            paymentDetails = {
              type: 'Bank',
              bank_name: bankDetails.bank_name,
              account_holder_name: bankDetails.account_holder_name,
              account_number: bankDetails.account_number,
              ifsc_code: bankDetails.ifsc_code,
              phone_number: bankDetails.phone_number
            };
          }
        } else if (withdrawal.payment_method === 'UPI') {
          const upiDetails = await UpiDetails.findByUserId(userId);
          if (upiDetails) {
            paymentDetails = {
              type: 'UPI',
              upi_name: upiDetails.upi_name,
              upi_id: upiDetails.upi_id,
              phone_number: upiDetails.phone_number
            };
          }
        }

        return {
          ...withdrawal,
          payment_details: paymentDetails
        };
      }));

      res.json({
        success: true,
        data: enhancedWithdrawals,
        count: enhancedWithdrawals.length
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
