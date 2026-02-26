const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase
const initializeFirebase = () => {
  try {
    const serviceAccountPath = path.join(__dirname, '../../service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase initialized successfully');
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
