const admin = require('firebase-admin');

let db;

// Initialize Firestore database lazily
const getDb = () => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

class Wallet {
  constructor(walletData) {
    this.user_id = walletData.user_id;
    this.wallet_number = walletData.wallet_number;
    this.balance = walletData.balance || 0;
    this.total_deposited = walletData.total_deposited || 0;
    this.user_name = walletData.user_name || 'Unknown';
    this.is_active = walletData.is_active !== false; // Default to true
    this.created_at = walletData.created_at || new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      user_id: this.user_id,
      wallet_number: this.wallet_number,
      balance: this.balance,
      total_deposited: this.total_deposited,
      user_name: this.user_name,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Generate unique 16-digit wallet number
  static generateWalletNumber() {
    // Generate 16 digits starting with non-zero
    let walletNumber = Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
    return walletNumber.toString();
  }

  // Create or get wallet for user
  static async createOrGet(userId, userData) {
    try {
      // Check if wallet already exists
      const existingWallet = await this.findByUserId(userId);
      
      if (existingWallet) {
        return {
          success: true,
          action: 'existing',
          wallet: existingWallet
        };
      }

      // Generate new wallet number
      let walletNumber;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        walletNumber = this.generateWalletNumber();
        const existing = await this.findByWalletNumber(walletNumber);
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique wallet number');
      }

      const wallet = new Wallet({
        user_id: userId,
        wallet_number: walletNumber,
        balance: 0,
        total_deposited: 0,
        user_name: userData.name || 'Unknown',
        is_active: true
      });

      // Use user ID as document ID for consistency
      const docRef = getDb().collection('wallets').doc(userId);
      await docRef.set(wallet.toFirestore());
      
      console.log('✅ Wallet created:', walletNumber, 'for user:', userData.name);
      return {
        success: true,
        action: 'created',
        wallet: {
          id: userId, // Use user ID as the wallet ID
          ...wallet.toFirestore()
        }
      };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  // Find wallet by user ID
  static async findByUserId(userId) {
    try {
      const snapshot = await getDb().collection('wallets')
        .where('user_id', '==', userId)
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
      throw new Error(`Failed to find wallet: ${error.message}`);
    }
  }

  // Find wallet by wallet number
  static async findByWalletNumber(walletNumber) {
    try {
      const snapshot = await getDb().collection('wallets')
        .where('wallet_number', '==', walletNumber)
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
      throw new Error(`Failed to find wallet by number: ${error.message}`);
    }
  }

  // Update wallet balance (add funds)
  static async addFunds(userId, amount) {
    try {
      const wallet = await this.findByUserId(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      const newTotalDeposited = parseFloat(wallet.total_deposited) + parseFloat(amount);

      await getDb().collection('wallets').doc(wallet.id).update({
        balance: newBalance,
        total_deposited: newTotalDeposited,
        updated_at: new Date().toISOString(),
        firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('💰 Funds added to wallet:', userId, 'amount:', amount);
      return {
        success: true,
        new_balance: newBalance,
        message: `₹${amount} added to wallet successfully`
      };
    } catch (error) {
      throw new Error(`Failed to add funds: ${error.message}`);
    }
  }

  // Get wallet details with user info
  static async getWalletDetails(userId) {
    try {
      const wallet = await this.findByUserId(userId);
      if (!wallet) {
        return null;
      }

      // Get user details
      const userDoc = await getDb().collection('users').doc(userId).get();
      const userData = userDoc.data();

      return {
        ...wallet,
        user_name: userData?.name || 'Unknown'
      };
    } catch (error) {
      throw new Error(`Failed to get wallet details: ${error.message}`);
    }
  }

  // Get wallet balance only
  static async getBalance(userId) {
    try {
      const wallet = await this.findByUserId(userId);
      if (!wallet) {
        return null;
      }

      return {
        balance: parseFloat(wallet.balance),
        wallet_number: wallet.wallet_number,
        user_name: wallet.user_name
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}

module.exports = Wallet;
