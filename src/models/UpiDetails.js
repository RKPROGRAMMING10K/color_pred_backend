const admin = require('firebase-admin');

let db;

// Initialize Firestore database lazily
const getDb = () => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

class UpiDetails {
  constructor(upiData) {
    this.user_id = upiData.user_id;
    this.upi_name = upiData.upi_name;
    this.phone_number = upiData.phone_number;
    this.upi_id = upiData.upi_id;
    this.confirm_upi_id = upiData.confirm_upi_id;
    this.is_verified = false;
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      user_id: this.user_id,
      upi_name: this.upi_name,
      phone_number: this.phone_number,
      upi_id: this.upi_id,
      confirm_upi_id: this.confirm_upi_id,
      is_verified: this.is_verified,
      created_at: this.created_at,
      updated_at: this.updated_at,
      firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Create or update UPI details
  static async createOrUpdate(userId, upiData) {
    try {
      // Validate input data
      const validation = this.validateUpiData(upiData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if user already has UPI details
      const existingDetails = await this.findByUserId(userId);
      
      const upiDetails = new UpiDetails({
        user_id: userId,
        upi_name: upiData.upi_name.trim(),
        phone_number: upiData.phone_number.trim(),
        upi_id: upiData.upi_id.trim().toLowerCase(),
        confirm_upi_id: upiData.confirm_upi_id.trim().toLowerCase()
      });

      if (existingDetails) {
        // Update existing details
        await getDb().collection('upi_details').doc(existingDetails.id).update({
          ...upiDetails.toFirestore(),
          updated_at: new Date().toISOString(),
          firestore_timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ UPI details updated for user:', userId);
        return {
          success: true,
          action: 'updated',
          message: 'UPI details updated successfully'
        };
      } else {
        // Create new details
        const docRef = await getDb().collection('upi_details').add(upiDetails.toFirestore());
        
        console.log('✅ UPI details created for user:', userId);
        return {
          success: true,
          action: 'created',
          upi_id: docRef.id,
          message: 'UPI details created successfully'
        };
      }
    } catch (error) {
      throw new Error(`Failed to save UPI details: ${error.message}`);
    }
  }

  // Find UPI details by user ID
  static async findByUserId(userId) {
    try {
      const snapshot = await getDb().collection('upi_details')
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
      throw new Error(`Failed to find UPI details: ${error.message}`);
    }
  }

  // Delete UPI details
  static async delete(userId, upiId) {
    try {
      // Verify the UPI details belong to the user
      const upiDoc = await getDb().collection('upi_details').doc(upiId).get();
      
      if (!upiDoc.exists) {
        throw new Error('UPI details not found');
      }

      const upiData = upiDoc.data();
      if (upiData.user_id !== userId) {
        throw new Error('Unauthorized to delete these UPI details');
      }

      await getDb().collection('upi_details').doc(upiId).delete();
      
      console.log('🗑️ UPI details deleted for user:', userId);
      return {
        success: true,
        message: 'UPI details deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete UPI details: ${error.message}`);
    }
  }

  // Validate UPI details data
  static validateUpiData(upiData) {
    const errors = [];
    
    if (!upiData.upi_name || upiData.upi_name.trim().length < 3) {
      errors.push('UPI name must be at least 3 characters long');
    }
    
    if (!upiData.phone_number || !/^[6-9]\d{9}$/.test(upiData.phone_number.trim())) {
      errors.push('Valid 10-digit phone number is required');
    }
    
    if (!upiData.upi_id || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiData.upi_id.trim())) {
      errors.push('Valid UPI ID is required (e.g., username@paytm)');
    }
    
    if (!upiData.confirm_upi_id || upiData.confirm_upi_id.trim() !== upiData.upi_id.trim()) {
      errors.push('UPI ID and confirm UPI ID must match');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = UpiDetails;
