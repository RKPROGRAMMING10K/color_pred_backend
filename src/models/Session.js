const admin = require('firebase-admin');
const db = admin.firestore();

class Session {
  constructor(sessionData) {
    this.session_id = sessionData.session_id;
    this.user_id = sessionData.user_id;
    this.user_data = sessionData.user_data;
    this.device_info = sessionData.device_info || {};
    this.login_timestamp = sessionData.login_timestamp || new Date().toISOString();
    this.last_activity = sessionData.last_activity || new Date().toISOString();
    this.is_active = sessionData.is_active !== false; // Default to true
    this.expires_at = sessionData.expires_at || this.calculateExpiry();
  }

  // Calculate session expiry (7 days from login)
  calculateExpiry() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    return expiryDate.toISOString();
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      user_id: this.user_id,
      user_data: this.user_data,
      device_info: this.device_info,
      login_timestamp: this.login_timestamp,
      last_activity: this.last_activity,
      is_active: this.is_active,
      expires_at: this.expires_at,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  // Create new session
  static async create(userData, deviceInfo = {}) {
    try {
      const sessionId = this.generateSessionId();
      
      // Create a device fingerprint for identification
      const deviceFingerprint = this.createDeviceFingerprint(deviceInfo);
      
      const sessionData = {
        session_id: sessionId,
        user_id: userData.user_id,
        user_data: {
          user_id: userData.user_id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          profile_completed: userData.profile_completed
        },
        device_info: {
          ...deviceInfo,
          device_fingerprint: deviceFingerprint,
          device_id: deviceInfo.device_id || deviceFingerprint,
          login_timestamp: new Date().toISOString()
        },
        login_timestamp: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      const session = new Session(sessionData);
      const sessionRef = await db.collection('sessions').doc(sessionId);
      await sessionRef.set(session.toFirestore());

      console.log('✅ Session created:', sessionId, 'for device:', deviceFingerprint);
      return {
        success: true,
        session_id: sessionId,
        session_data: sessionData
      };
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  // Find session by ID
  static async findById(sessionId) {
    try {
      const doc = await db.collection('sessions').doc(sessionId).get();
      
      if (!doc.exists) {
        return null;
      }

      const sessionData = doc.data();
      
      // Check if session is expired
      if (sessionData.expires_at && new Date(sessionData.expires_at) < new Date()) {
        console.log('⏰ Session expired:', sessionId);
        await this.destroy(sessionId);
        return null;
      }

      // Check if session is active
      if (!sessionData.is_active) {
        console.log('🚫 Session inactive:', sessionId);
        return null;
      }

      return {
        session_id: doc.id,
        ...sessionData
      };
    } catch (error) {
      throw new Error(`Failed to find session: ${error.message}`);
    }
  }

  // Update session activity
  static async updateActivity(sessionId) {
    try {
      const sessionRef = db.collection('sessions').doc(sessionId);
      await sessionRef.update({
        last_activity: new Date().toISOString(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('🔄 Session activity updated:', sessionId);
      return true;
    } catch (error) {
      console.error('❌ Failed to update session activity:', error);
      return false;
    }
  }

  // Destroy session (logout)
  static async destroy(sessionId) {
    try {
      const sessionRef = db.collection('sessions').doc(sessionId);
      await sessionRef.update({
        is_active: false,
        logout_timestamp: new Date().toISOString(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('🗑️ Session destroyed:', sessionId);
      return true;
    } catch (error) {
      throw new Error(`Failed to destroy session: ${error.message}`);
    }
  }

  // Destroy all sessions for a user
  static async destroyAllForUser(userId) {
    try {
      const snapshot = await db.collection('sessions')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          is_active: false,
          logout_timestamp: new Date().toISOString(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`🗑️ All sessions destroyed for user: ${userId}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to destroy all sessions for user: ${error.message}`);
    }
  }

  // Get active sessions for user
  static async getActiveSessionsForUser(userId) {
    try {
      // Simple query without ordering to avoid index issues
      const snapshot = await db.collection('sessions')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      const sessions = [];
      snapshot.forEach(doc => {
        sessions.push({
          session_id: doc.id,
          ...doc.data()
        });
      });

      // Sort in memory by last_activity (most recent first)
      sessions.sort((a, b) => {
        const aTime = new Date(a.last_activity || 0);
        const bTime = new Date(b.last_activity || 0);
        return bTime - aTime;
      });

      return sessions;
    } catch (error) {
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }
  }

  // Update session activity
  static async updateActivity(sessionId) {
    try {
      await db.collection('sessions').doc(sessionId).update({
        last_activity: new Date().toISOString(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('🔄 Session activity updated:', sessionId);
    } catch (error) {
      console.error('❌ Failed to update session activity:', error);
    }
  }

  // Clean up expired sessions
  static async cleanupExpired() {
    try {
      const now = new Date();
      const snapshot = await db.collection('sessions')
        .where('expires_at', '<', now.toISOString())
        .where('is_active', '==', true)
        .get();

      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          is_active: false,
          logout_timestamp: new Date().toISOString(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`🧹 Cleaned up ${snapshot.size} expired sessions`);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  // Generate unique session ID
  static generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create device fingerprint for unique identification
  static createDeviceFingerprint(deviceInfo) {
    const fingerprint = [
      deviceInfo.platform || 'unknown',
      deviceInfo.device_model || 'unknown',
      deviceInfo.device_brand || 'unknown',
      deviceInfo.device_manufacturer || 'unknown',
      deviceInfo.android_version || 'unknown',
      deviceInfo.android_sdk || 'unknown',
      deviceInfo.app_version || 'unknown'
    ].join('|');

    // Create hash of the fingerprint string
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16);
  }

  // Check if user has active session on specific device
  static async hasActiveSessionOnDevice(userId, deviceInfo) {
    try {
      const deviceFingerprint = this.createDeviceFingerprint(deviceInfo);
      
      const snapshot = await db.collection('sessions')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      for (const doc of snapshot.docs) {
        const sessionData = doc.data();
        if (sessionData.device_info && sessionData.device_info.device_fingerprint === deviceFingerprint) {
          return {
            hasActiveSession: true,
            session_id: doc.id,
            session_data: sessionData
          };
        }
      }

      return { hasActiveSession: false };
    } catch (error) {
      console.error('Error checking device session:', error);
      return { hasActiveSession: false };
    }
  }

  // Get sessions by device type
  static async getSessionsByDeviceType(userId) {
    try {
      const snapshot = await db.collection('sessions')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      const deviceGroups = {};
      snapshot.forEach(doc => {
        const session = {
          session_id: doc.id,
          ...doc.data()
        };
        
        const deviceType = session.device_info?.platform || 'unknown';
        if (!deviceGroups[deviceType]) {
          deviceGroups[deviceType] = [];
        }
        deviceGroups[deviceType].push(session);
      });

      return deviceGroups;
    } catch (error) {
      throw new Error(`Failed to get sessions by device type: ${error.message}`);
    }
  }

  // Logout from specific device
  static async logoutFromDevice(userId, deviceFingerprint) {
    try {
      const snapshot = await db.collection('sessions')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      let loggedOutCount = 0;
      const batch = db.batch();
      
      snapshot.forEach(doc => {
        const sessionData = doc.data();
        if (sessionData.device_info && sessionData.device_info.device_fingerprint === deviceFingerprint) {
          batch.update(doc.ref, {
            is_active: false,
            logout_timestamp: new Date().toISOString(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          loggedOutCount++;
        }
      });

      await batch.commit();
      console.log(`📱 Logged out from device ${deviceFingerprint}: ${loggedOutCount} sessions`);
      
      return loggedOutCount > 0;
    } catch (error) {
      throw new Error(`Failed to logout from device: ${error.message}`);
    }
  }
}

module.exports = Session;
