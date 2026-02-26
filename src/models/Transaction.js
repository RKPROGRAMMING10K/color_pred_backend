const admin = require('firebase-admin');

let db;

// Initialize Firestore database lazily
const getDb = () => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

class Transaction {
  constructor(transactionData) {
    this.user_id = transactionData.user_id;
    this.payment_method = transactionData.payment_method;
    this.amount = transactionData.amount;
    this.utr_number = transactionData.utr_number;
    this.phone_number = transactionData.phone_number;
    this.particular = transactionData.particular || 'Deposit'; // Deposit or Withdraw
    this.transaction_id = Transaction.generateTransactionId();
    this.status = 'pending'; // pending, received, rejected
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      user_id: this.user_id,
      payment_method: this.payment_method,
      amount: this.amount,
      utr_number: this.utr_number,
      phone_number: this.phone_number,
      particular: this.particular,
      transaction_id: this.transaction_id,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Generate unique transaction ID
  static generateTransactionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TXN';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create new transaction
  static async create(userId, transactionData) {
    try {
      // Validate input data
      const validation = this.validateTransactionData(transactionData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const transaction = new Transaction({
        user_id: userId,
        payment_method: transactionData.payment_method,
        amount: transactionData.amount,
        utr_number: transactionData.utr_number,
        phone_number: transactionData.phone_number,
        particular: transactionData.particular
      });

      const docRef = await getDb().collection('transactions').add(transaction.toFirestore());
      
      console.log('✅ Transaction created:', transaction.transaction_id, 'for user:', userId);
      return {
        success: true,
        transaction_id: transaction.transaction_id,
        document_id: docRef.id,
        message: 'Transaction created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  // Get transactions by user ID
  static async findByUserId(userId, limit = 50) {
    try {
      const snapshot = await getDb().collection('transactions')
        .where('user_id', '==', userId)
        .limit(limit)
        .get();

      const transactions = [];
      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort in memory by created_at (most recent first)
      transactions.sort((a, b) => {
        const aTime = new Date(a.created_at || 0);
        const bTime = new Date(b.created_at || 0);
        return bTime - aTime;
      });

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  // Get transaction by transaction ID
  static async findByTransactionId(transactionId) {
    try {
      const snapshot = await getDb().collection('transactions')
        .where('transaction_id', '==', transactionId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Failed to find transaction: ${error.message}`);
    }
  }

  // Update transaction status
  static async updateStatus(transactionId, status) {
    try {
      const transaction = await this.findByTransactionId(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      await getDb().collection('transactions').doc(transaction.id).update({
        status: status,
        updated_at: new Date().toISOString(),
        firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Transaction status updated:', transactionId, 'to:', status);
      return {
        success: true,
        message: `Transaction status updated to ${status}`
      };
    } catch (error) {
      throw new Error(`Failed to update transaction status: ${error.message}`);
    }
  }

  // Validate transaction data
  static validateTransactionData(transactionData) {
    const errors = [];
    
    if (!transactionData.payment_method) {
      errors.push('Payment method is required');
    } else {
      // Allow different payment methods for deposits vs withdrawals
      const validPaymentMethods = ['UPI-QR', 'PaytmX QR', 'Bank Transfer', 'UPI Transfer'];
      if (!validPaymentMethods.includes(transactionData.payment_method)) {
        errors.push('Payment method must be UPI-QR, PaytmX QR, Bank Transfer, or UPI Transfer');
      }
    }
    
    if (!transactionData.amount || parseFloat(transactionData.amount) <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (!transactionData.utr_number || transactionData.utr_number.trim().length < 6) {
      // Allow auto-generated UTR for withdrawals (starts with AUTO-)
      if (!transactionData.utr_number.startsWith('AUTO-')) {
        errors.push('UTR number must be at least 6 characters long');
      }
    }
    
    if (!transactionData.phone_number || transactionData.phone_number === 'AUTO') {
      // Allow AUTO for withdrawals (auto-generated)
    } else if (!/^\d{10}$/.test(transactionData.phone_number.trim())) {
      errors.push('Valid 10-digit phone number is required');
    }
    
    if (!transactionData.particular) {
      errors.push('Particular field is required');
    } else if (!['Deposit', 'Withdraw'].includes(transactionData.particular)) {
      errors.push('Particular must be Deposit or Withdraw');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Transaction;
