const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase
const initializeFirebase = () => {
  try {
    // Use environment variable for service account
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase initialized successfully using environment variables');
    }
    
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  db: initializeFirebase()
};
