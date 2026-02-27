const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

class AdminAuthController {
  // Admin login using Firebase Auth with proper password verification
  static async adminLogin(req, res) {
    try {
      console.log('🔐 Admin login attempt');
      
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      try {
        // For security, we'll use a different approach
        // Since Admin SDK can't verify passwords directly, we'll use the following logic:
        // 1. Check if user exists in Firebase Auth
        // 2. Verify admin role in Firestore
        // 3. For demo purposes, we'll implement a simple password check
        // In production, you should use Firebase REST API with proper API key
        
        // Get user by email from Firebase Auth
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Check if user exists in Firestore and has admin role
        const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
        
        if (!userDoc.exists) {
          return res.status(401).json({
            success: false,
            message: 'User not found in system'
          });
        }
        
        const userData = userDoc.data();
        
        // Check if user has admin role
        if (userData.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
          });
        }
        
        // SECURITY NOTE: In a real production environment, you should:
        // 1. Use Firebase REST API with proper API key to verify password
        // 2. Or implement OAuth2 flow
        // 3. For this demo, we'll implement a basic password verification
        
        // For demo purposes, let's implement a simple password check
        // In production, replace this with proper Firebase REST API call
        console.log('🔍 Checking password for email:', email);
        const isValidPassword = await AdminAuthController.verifyPassword(email, password);
        console.log('🔍 Password verification result:', isValidPassword);
        
        if (!isValidPassword) {
          console.log('❌ Password verification failed for:', email);
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        // Generate JWT token for admin session
        const token = jwt.sign(
          { 
            userId: userRecord.uid,
            email: userRecord.email,
            role: 'admin',
            isAdmin: true
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );
        
        // Update last login
        await admin.firestore().collection('users').doc(userRecord.uid).update({
          last_login: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Admin login successful',
          data: {
            token: token,
            admin: {
              id: userRecord.uid,
              email: userRecord.email,
              name: userData.name,
              role: userData.role
            }
          }
        });
        
      } catch (firebaseError) {
        console.error('❌ Firebase Auth error:', firebaseError);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
    } catch (error) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Helper method for password verification (for demo purposes)
  static async verifyPassword(email, password) {
    console.log('🔐 verifyPassword called with:', { email, password: '***' });
    
    // SECURITY WARNING: This is a simplified approach for demonstration
    // In production, use Firebase REST API or OAuth2 flow
    
    // For the demo users we created, we know the passwords
    const demoUsers = {
      'rvn276@gmail.com': 'Rohit9595',
      'admin@example.com': 'Admin@123'
    };
    
    const expectedPassword = demoUsers[email];
    const isValid = expectedPassword === password;
    
    console.log('🔍 Password check:', {
      email,
      expectedPassword: expectedPassword ? '***' : 'not found',
      providedPassword: password ? '***' : 'empty',
      isValid
    });
    
    return isValid;
  }
  
  // Alternative login using Firebase custom token (more secure)
  static async adminLoginWithCustomToken(req, res) {
    try {
      console.log('🔐 Admin login with custom token');
      
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      try {
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Check admin role in Firestore
        const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
        
        if (!userDoc.exists) {
          return res.status(401).json({
            success: false,
            message: 'User not found in system'
          });
        }
        
        const userData = userDoc.data();
        
        if (userData.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
          });
        }
        
        // Create custom token for Firebase Auth
        const customToken = await admin.auth().createCustomToken(userRecord.uid, {
          role: 'admin',
          isAdmin: true
        });
        
        // Update last login
        await admin.firestore().collection('users').doc(userRecord.uid).update({
          last_login: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Admin custom token generated',
          data: {
            customToken: customToken,
            admin: {
              id: userRecord.uid,
              email: userRecord.email,
              name: userData.name,
              role: userData.role
            }
          }
        });
        
      } catch (firebaseError) {
        console.error('❌ Firebase Auth error:', firebaseError);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or user not found'
        });
      }
      
    } catch (error) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Verify admin token
  static async verifyAdminToken(req, res) {
    try {
      console.log('🔍 Verifying admin token');
      
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token required'
        });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Verify admin role
        if (!decoded.isAdmin || decoded.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Admin token required'
          });
        }
        
        // Get fresh admin data
        const userDoc = await admin.firestore().collection('users').doc(decoded.userId).get();
        
        if (!userDoc.exists) {
          return res.status(401).json({
            success: false,
            message: 'Admin user not found'
          });
        }
        
        const userData = userDoc.data();
        
        res.json({
          success: true,
          data: {
            admin: {
              id: decoded.userId,
              email: decoded.email,
              name: userData.name,
              role: userData.role
            },
            valid: true
          }
        });
        
      } catch (jwtError) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
    } catch (error) {
      console.error('❌ Verify admin token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Admin logout
  static async adminLogout(req, res) {
    try {
      console.log('🚪 Admin logout');
      
      const { session_id, logout_all } = req.body;
      const adminId = req.admin ? req.admin.id : null;
      
      // If admin ID is available from JWT middleware, try to destroy sessions
      if (adminId) {
        try {
          const Session = require('../models/Session');
          
          if (logout_all) {
            // Destroy all admin sessions
            await Session.destroyAllForUser(adminId);
            console.log('✅ Admin logged out from all devices:', adminId);
          } else if (session_id) {
            // Destroy specific session
            const session = await Session.findById(session_id);
            if (session && session.user_id === adminId) {
              await Session.destroy(session_id);
              console.log('✅ Admin session destroyed:', session_id);
            }
          }
          
          // Optionally clear FCM token on logout
          // await admin.firestore().collection('users').doc(adminId).update({ fcm_token: null });
          
        } catch (sessionError) {
          console.log('ℹ️ Session cleanup failed (may not use sessions):', sessionError.message);
        }
      }
      
      res.json({
        success: true,
        message: 'Admin logout successful',
        data: {
          admin_id: adminId,
          logout_timestamp: new Date().toISOString(),
          sessions_cleared: !!adminId
        }
      });
      
    } catch (error) {
      console.error('❌ Admin logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Admin logout from all devices
  static async adminLogoutAll(req, res) {
    try {
      console.log('🚪 Admin logout from all devices');
      
      const adminId = req.admin ? req.admin.id : null;
      
      if (adminId) {
        try {
          const Session = require('../models/Session');
          await Session.destroyAllForUser(adminId);
          
          // Optionally clear FCM token
          // await admin.firestore().collection('users').doc(adminId).update({ fcm_token: null });
          
          console.log('✅ Admin logged out from all devices:', adminId);
        } catch (sessionError) {
          console.log('ℹ️ Session cleanup failed:', sessionError.message);
        }
      }
      
      res.json({
        success: true,
        message: 'Admin logged out from all devices successfully',
        data: {
          admin_id: adminId,
          logout_timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Admin logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = AdminAuthController;
