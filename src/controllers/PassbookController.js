const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

class PassbookController {
  // Get user passbook transactions
  static async getUserPassbook(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50, offset = 0 } = req.query;
      
      console.log('📖 Get user passbook request for user:', userId);

      // Get all user transactions
      let transactions = await Transaction.findByUserId(userId, parseInt(limit) + 100); // Get more to calculate balance
      
      // Sort by created_at descending (newest first)
      transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Get current wallet balance
      let currentBalance = 0;
      try {
        const walletInfo = await Wallet.getBalance(userId);
        if (walletInfo) {
          currentBalance = walletInfo.balance;
        }
      } catch (walletError) {
        console.error('❌ Error fetching wallet balance:', walletError);
        // Continue with 0 balance if wallet not found
      }

      // Calculate running balance for each transaction
      const passbookTransactions = [];
      let runningBalance = currentBalance;

      // Process transactions in reverse order (oldest first) to calculate balance
      const sortedTransactions = [...transactions].reverse();
      
      for (const transaction of sortedTransactions) {
        const date = new Date(transaction.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        const time = new Date(transaction.created_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        });

        let amount = transaction.amount;
        let particular = transaction.particular;
        
        // For withdrawals, show as negative amount
        if (particular === 'Withdraw') {
          amount = -Math.abs(amount);
        }

        passbookTransactions.push({
          date: date,
          time: time,
          particular: particular,
          amount: Math.abs(amount), // Always show positive amount in response
          type: particular.toLowerCase(), // 'deposit' or 'withdraw'
          balance: runningBalance,
          transaction_id: transaction.transaction_id,
          status: transaction.status,
          payment_method: transaction.payment_method
        });

        // Update running balance
        if (particular === 'Deposit' && transaction.status === 'received') {
          runningBalance -= amount;
        } else if (particular === 'Withdraw' && (transaction.status === 'completed' || transaction.status === 'received')) {
          runningBalance += Math.abs(amount);
        }
      }

      // Reverse back to show newest first
      passbookTransactions.reverse();

      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedTransactions = passbookTransactions.slice(startIndex, endIndex);

      res.json({
        success: true,
        message: 'Passbook transactions retrieved successfully',
        data: {
          transactions: paginatedTransactions,
          current_balance: currentBalance,
          total_transactions: passbookTransactions.length,
          showing_from: startIndex + 1,
          showing_to: Math.min(endIndex, passbookTransactions.length),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: endIndex < passbookTransactions.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Get passbook error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get passbook summary
  static async getPassbookSummary(req, res) {
    try {
      const userId = req.user.userId;
      
      console.log('📊 Get passbook summary for user:', userId);

      // Get all transactions
      const transactions = await Transaction.findByUserId(userId, 1000);
      
      // Calculate totals
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let pendingDeposits = 0;
      let pendingWithdrawals = 0;

      transactions.forEach(transaction => {
        if (transaction.particular === 'Deposit') {
          if (transaction.status === 'received') {
            totalDeposits += transaction.amount;
          } else if (transaction.status === 'pending') {
            pendingDeposits += transaction.amount;
          }
        } else if (transaction.particular === 'Withdraw') {
          if (transaction.status === 'completed' || transaction.status === 'received') {
            totalWithdrawals += transaction.amount;
          } else if (transaction.status === 'pending') {
            pendingWithdrawals += transaction.amount;
          }
        }
      });

      // Get current wallet balance
      let currentBalance = 0;
      try {
        const walletInfo = await Wallet.getBalance(userId);
        if (walletInfo) {
          currentBalance = walletInfo.balance;
        }
      } catch (walletError) {
        console.error('❌ Error fetching wallet balance:', walletError);
      }

      res.json({
        success: true,
        message: 'Passbook summary retrieved successfully',
        data: {
          current_balance: currentBalance,
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          pending_deposits: pendingDeposits,
          pending_withdrawals: pendingWithdrawals,
          total_transactions: transactions.length
        }
      });

    } catch (error) {
      console.error('❌ Get passbook summary error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = PassbookController;
