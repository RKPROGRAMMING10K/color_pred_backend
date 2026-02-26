const admin = require('firebase-admin');

let db;

// Initialize Firestore database lazily
const getDb = () => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

class BankDetails {
  constructor(bankData) {
    this.user_id = bankData.user_id;
    this.bank_name = bankData.bank_name;
    this.account_holder_name = bankData.account_holder_name;
    this.account_number = bankData.account_number;
    this.phone_number = bankData.phone_number;
    this.ifsc_code = bankData.ifsc_code;
    this.is_verified = false;
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      user_id: this.user_id,
      bank_name: this.bank_name,
      account_holder_name: this.account_holder_name,
      account_number: this.account_number,
      phone_number: this.phone_number,
      ifsc_code: this.ifsc_code,
      is_verified: this.is_verified,
      created_at: this.created_at,
      updated_at: this.updated_at,
      firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Create or update bank details
  static async createOrUpdate(userId, bankData) {
    try {
      // Validate input data
      const validation = this.validateBankData(bankData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if user already has bank details
      const existingDetails = await this.findByUserId(userId);
      
      const bankDetails = new BankDetails({
        user_id: userId,
        bank_name: bankData.bank_name.trim(),
        account_holder_name: bankData.account_holder_name.trim(),
        account_number: bankData.account_number.trim(),
        phone_number: bankData.phone_number.trim(),
        ifsc_code: bankData.ifsc_code.trim().toUpperCase()
      });

      if (existingDetails) {
        // Update existing details
        await getDb().collection('bank_details').doc(existingDetails.id).update({
          ...bankDetails.toFirestore(),
          updated_at: new Date().toISOString(),
          firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Bank details updated for user:', userId);
        return {
          success: true,
          action: 'updated',
          message: 'Bank details updated successfully'
        };
      } else {
        // Create new details
        const docRef = await getDb().collection('bank_details').add(bankDetails.toFirestore());
        
        console.log('✅ Bank details created for user:', userId);
        return {
          success: true,
          action: 'created',
          bank_id: docRef.id,
          message: 'Bank details created successfully'
        };
      }
    } catch (error) {
      throw new Error(`Failed to save bank details: ${error.message}`);
    }
  }

  // Find bank details by user ID
  static async findByUserId(userId) {
    try {
      const snapshot = await getDb().collection('bank_details')
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
      throw new Error(`Failed to find bank details: ${error.message}`);
    }
  }

  // Delete bank details
  static async delete(userId, bankId) {
    try {
      // Verify the bank details belong to the user
      const bankDoc = await getDb().collection('bank_details').doc(bankId).get();
      
      if (!bankDoc.exists) {
        throw new Error('Bank details not found');
      }

      const bankData = bankDoc.data();
      if (bankData.user_id !== userId) {
        throw new Error('Unauthorized to delete these bank details');
      }

      await getDb().collection('bank_details').doc(bankId).delete();
      
      console.log('🗑️ Bank details deleted for user:', userId);
      return {
        success: true,
        message: 'Bank details deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete bank details: ${error.message}`);
    }
  }

  // Validate bank details data
  static validateBankData(bankData) {
    const errors = [];
    
    if (!bankData.bank_name || bankData.bank_name.trim().length < 3) {
      errors.push('Bank name must be at least 3 characters long');
    }
    
    if (!bankData.account_holder_name || bankData.account_holder_name.trim().length < 3) {
      errors.push('Account holder name must be at least 3 characters long');
    }
    
    if (!bankData.account_number || !/^\d{10,20}$/.test(bankData.account_number.trim())) {
      errors.push('Account number must be 10-20 digits');
    }
    
    if (!bankData.phone_number || !/^[6-9]\d{9}$/.test(bankData.phone_number.trim())) {
      errors.push('Valid 10-digit phone number is required');
    }
    
    if (!bankData.ifsc_code || !/^[A-Z]{4}0\d{6}$/.test(bankData.ifsc_code.trim().toUpperCase())) {
      errors.push('Valid IFSC code is required (e.g., SBIN0001234)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = BankDetails;
