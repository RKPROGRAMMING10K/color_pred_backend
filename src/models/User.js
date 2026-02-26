const admin = require('firebase-admin');
const db = admin.firestore();

class User {
  constructor(userData) {
    this.name = userData.name;
    this.email = userData.email;
    this.phone = userData.phone;
    this.password = userData.password; // In production, hash this password
    this.device_info = userData.device_info;
    this.registration_timestamp = userData.registration_timestamp || new Date().toISOString();
    this.created_at = admin.firestore.FieldValue.serverTimestamp();
    this.updated_at = admin.firestore.FieldValue.serverTimestamp();
    this.is_active = true;
    this.profile_completed = false;
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      name: this.name,
      email: this.email,
      phone: this.phone,
      password: this.password, // Store hashed password in production
      device_info: this.device_info,
      registration_timestamp: this.registration_timestamp,
      created_at: this.created_at,
      updated_at: this.updated_at,
      is_active: this.is_active,
      profile_completed: this.profile_completed
    };
  }

  // Create user document in Firestore
  static async create(userData) {
    try {
      const user = new User(userData);
      const userRef = await db.collection('users').add(user.toFirestore());
      
      return {
        success: true,
        user_id: userRef.id,
        message: 'User created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const snapshot = await db.collection('users')
        .where('email', '==', email)
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
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  // Find user by phone
  static async findByPhone(phone) {
    try {
      const snapshot = await db.collection('users')
        .where('phone', '==', phone)
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
      throw new Error(`Failed to find user by phone: ${error.message}`);
    }
  }

  // Get user by ID
  static async findById(userId) {
    try {
      const doc = await db.collection('users').doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  // Validate user data
  static validateRegistrationData(userData) {
    const errors = [];
    
    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email is required');
    }
    
    if (!userData.phone || !this.isValidPhone(userData.phone)) {
      errors.push('Valid phone number is required');
    }
    
    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (!userData.device_info) {
      errors.push('Device information is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Email validation
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation (basic validation for Indian phone numbers)
  static isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
}

module.exports = User;
