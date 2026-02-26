const BankDetails = require('../models/BankDetails');
const UpiDetails = require('../models/UpiDetails');

class PaymentController {
  // Create or update bank details
  static async saveBankDetails(req, res) {
    try {
      console.log('🏦 Save bank details request received:', req.body);
      
      const userId = req.user.userId;
      const { bank_name, account_holder_name, account_number, phone_number, ifsc_code } = req.body;

      // Verify user_id in request matches authenticated user
      if (req.body.user_id && req.body.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: User ID mismatch'
        });
      }

      const bankData = {
        bank_name,
        account_holder_name,
        account_number,
        phone_number,
        ifsc_code
      };

      const result = await BankDetails.createOrUpdate(userId, bankData);

      res.status(result.action === 'created' ? 201 : 200).json({
        success: true,
        message: result.message,
        action: result.action
      });

    } catch (error) {
      console.error('❌ Save bank details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get bank details
  static async getBankDetails(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('🏦 Get bank details request for user:', userId);

      const bankDetails = await BankDetails.findByUserId(userId);
      
      if (!bankDetails) {
        return res.status(404).json({
          success: false,
          message: 'Bank details not found'
        });
      }

      // Remove sensitive data for security
      const { account_number, ...safeBankDetails } = bankDetails;
      
      // Mask account number for display (show only last 4 digits)
      const maskedAccount = account_number.replace(/\d(?=\d{4})/g, '*');
      
      res.json({
        success: true,
        data: {
          ...safeBankDetails,
          masked_account_number: maskedAccount
        }
      });

    } catch (error) {
      console.error('❌ Get bank details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete bank details
  static async deleteBankDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { bank_id } = req.params;
      
      console.log('🗑️ Delete bank details request:', bank_id);

      const result = await BankDetails.delete(userId, bank_id);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Delete bank details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Create or update UPI details
  static async saveUpiDetails(req, res) {
    try {
      console.log('📱 Save UPI details request received:', req.body);
      
      const userId = req.user.userId;
      const { upi_name, phone_number, upi_id, confirm_upi_id } = req.body;

      // Verify user_id in request matches authenticated user
      if (req.body.user_id && req.body.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: User ID mismatch'
        });
      }

      const upiData = {
        upi_name,
        phone_number,
        upi_id,
        confirm_upi_id
      };

      const result = await UpiDetails.createOrUpdate(userId, upiData);

      res.status(result.action === 'created' ? 201 : 200).json({
        success: true,
        message: result.message,
        action: result.action
      });

    } catch (error) {
      console.error('❌ Save UPI details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get UPI details
  static async getUpiDetails(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('📱 Get UPI details request for user:', userId);

      const upiDetails = await UpiDetails.findByUserId(userId);
      
      if (!upiDetails) {
        return res.status(404).json({
          success: false,
          message: 'UPI details not found'
        });
      }

      // Remove sensitive confirm_upi_id for security
      const { confirm_upi_id, ...safeUpiDetails } = upiDetails;
      
      res.json({
        success: true,
        data: safeUpiDetails
      });

    } catch (error) {
      console.error('❌ Get UPI details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete UPI details
  static async deleteUpiDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { upi_id } = req.params;
      
      console.log('🗑️ Delete UPI details request:', upi_id);

      const result = await UpiDetails.delete(userId, upi_id);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Delete UPI details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get all payment methods for user
  static async getPaymentMethods(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('💳 Get all payment methods for user:', userId);

      const [bankDetails, upiDetails] = await Promise.all([
        BankDetails.findByUserId(userId),
        UpiDetails.findByUserId(userId)
      ]);

      const paymentMethods = {
        bank_details: null,
        upi_details: null
      };

      if (bankDetails) {
        const { account_number, ...safeBankDetails } = bankDetails;
        const maskedAccount = account_number.replace(/\d(?=\d{4})/g, '*');
        paymentMethods.bank_details = {
          ...safeBankDetails,
          masked_account_number: maskedAccount
        };
      }

      if (upiDetails) {
        const { confirm_upi_id, ...safeUpiDetails } = upiDetails;
        paymentMethods.upi_details = safeUpiDetails;
      }

      res.json({
        success: true,
        data: paymentMethods
      });

    } catch (error) {
      console.error('❌ Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;
