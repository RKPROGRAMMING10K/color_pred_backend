const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  // User Registration
  static async register(req, res) {
    try {
      console.log('📝 Registration request received:', req.body);
      
      // Validate input data
      const validation = User.validateRegistrationData(req.body);
      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const { name, email, phone, password, device_info } = req.body;

      // Check if user already exists by email
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        console.log('❌ User already exists with email:', email);
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Check if user already exists by phone
      const existingUserByPhone = await User.findByPhone(phone);
      if (existingUserByPhone) {
        console.log('❌ User already exists with phone:', phone);
        return res.status(409).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }

      // Hash password (in production)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Prepare user data
      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\s/g, ''),
        password: hashedPassword,
        device_info: {
          ...device_info,
          timestamp: device_info.timestamp || new Date().toISOString()
        },
        registration_timestamp: new Date().toISOString()
      };

      // Create user in Firebase
      const result = await User.create(userData);
      
      console.log('✅ User registered successfully:', result.user_id);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result.user_id, 
          email: userData.email 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Return success response
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user_id: result.user_id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          token: token,
          created_at: userData.registration_timestamp
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // User Login with Email
  static async login(req, res) {
    try {
      console.log('🔐 Email login request received:', req.body);
      
      const { email, password, device_info, fcm_token } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      return await AuthController.completeLogin(user, password, device_info, req, res, fcm_token);

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // User Login with Phone
  static async loginWithPhone(req, res) {
    try {
      console.log('📱 Phone login request received:', req.body);
      
      const { phone, password, device_info, fcm_token } = req.body;

      // Validate input
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and password are required'
        });
      }

      // Clean phone number (remove spaces)
      const cleanPhone = phone.replace(/\s/g, '');

      // Find user by phone
      const user = await User.findByPhone(cleanPhone);
      if (!user) {
        console.log('❌ User not found with phone:', cleanPhone);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      return await AuthController.completeLogin(user, password, device_info, req, res, fcm_token);

    } catch (error) {
      console.error('❌ Phone login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Helper method to complete login process
  static async completeLogin(user, password, device_info, req, res, fcm_token = null) {
    try {
      // Check if user is active
      if (!user.is_active) {
        console.log('❌ User account is inactive:', user.email || user.phone);
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', user.email || user.phone);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user has active session on this device
      if (device_info) {
        const deviceSession = await require('../models/Session').hasActiveSessionOnDevice(user.id, device_info);
        if (deviceSession.hasActiveSession) {
          console.log('🔄 User already has active session on this device, updating...');
          
          // Update existing session activity instead of creating new one
          await require('../models/Session').updateActivity(deviceSession.session_id);
          
          // Generate JWT token
          const token = jwt.sign(
            { 
              userId: user.id, 
              email: user.email,
              phone: user.phone
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
          );

          // Update device info and last login
          const updateData = {
            device_info: device_info,
            last_login: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
            updated_at: require('firebase-admin').firestore.FieldValue.serverTimestamp()
          };

          // Save FCM token if provided
          if (fcm_token && fcm_token.trim()) {
            updateData.fcm_token = fcm_token.trim();
            console.log('📱 FCM token saved during session update for user:', user.id);
          }

          await require('firebase-admin').firestore()
            .collection('users')
            .doc(user.id)
            .update(updateData);

          console.log('✅ User session updated successfully:', user.id);

          return res.json({
            success: true,
            message: 'Login successful (session updated)',
            data: {
              user_id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              token: token,
              session_id: deviceSession.session_id,
              profile_completed: user.profile_completed
            }
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          phone: user.phone
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Create new session
      const sessionData = {
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_completed: user.profile_completed
      };

      const sessionResult = await Session.create(sessionData, device_info);

      // Update device info and last login if provided
      const updateData = {
        last_login: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
        updated_at: require('firebase-admin').firestore.FieldValue.serverTimestamp()
      };

      if (device_info) {
        updateData.device_info = device_info;
      }

      // Save FCM token if provided
      if (fcm_token && fcm_token.trim()) {
        updateData.fcm_token = fcm_token.trim();
        console.log('📱 FCM token saved during login for user:', user.id);
      }

      await require('firebase-admin').firestore()
        .collection('users')
        .doc(user.id)
        .update(updateData);

      console.log('✅ User logged in successfully:', user.id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          token: token,
          session_id: sessionResult.session_id,
          profile_completed: user.profile_completed
        }
      });

    } catch (error) {
      console.error('❌ Complete login error:', error);
      throw error;
    }
  }

  // Get User Profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove sensitive data
      const { password, ...userProfile } = user;

      res.json({
        success: true,
        data: userProfile
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // User Logout
  static async logout(req, res) {
    try {
      const { session_id } = req.body;
      
      if (!session_id) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      // Verify session exists and belongs to the user
      const session = await Session.findById(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or expired'
        });
      }

      // Verify session belongs to the authenticated user
      if (session.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Invalid session'
        });
      }

      // Destroy the session
      await Session.destroy(session_id);

      console.log('✅ User logged out successfully:', req.user.userId);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Logout from all devices
  static async logoutAll(req, res) {
    try {
      const userId = req.user.userId;
      
      // Destroy all sessions for the user
      await Session.destroyAllForUser(userId);

      console.log('✅ User logged out from all devices:', userId);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('❌ Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get active sessions for user
  static async getActiveSessions(req, res) {
    try {
      const userId = req.user.userId;
      
      const sessions = await Session.getActiveSessionsForUser(userId);

      res.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      console.error('❌ Get active sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get sessions grouped by device type
  static async getSessionsByDevice(req, res) {
    try {
      const userId = req.user.userId;
      
      const deviceGroups = await Session.getSessionsByDeviceType(userId);

      res.json({
        success: true,
        data: deviceGroups
      });

    } catch (error) {
      console.error('❌ Get sessions by device error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Check if user has active session on current device
  static async checkDeviceSession(req, res) {
    try {
      const userId = req.user.userId;
      const { device_info } = req.body;

      if (!device_info) {
        return res.status(400).json({
          success: false,
          message: 'Device information is required'
        });
      }

      const deviceSession = await Session.hasActiveSessionOnDevice(userId, device_info);

      res.json({
        success: true,
        data: deviceSession
      });

    } catch (error) {
      console.error('❌ Check device session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Logout from specific device
  static async logoutFromDevice(req, res) {
    try {
      const userId = req.user.userId;
      const { device_fingerprint } = req.body;

      if (!device_fingerprint) {
        return res.status(400).json({
          success: false,
          message: 'Device fingerprint is required'
        });
      }

      const success = await Session.logoutFromDevice(userId, device_fingerprint);

      if (success) {
        res.json({
          success: true,
          message: 'Logged out from device successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No active session found for this device'
        });
      }

    } catch (error) {
      console.error('❌ Logout from device error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Save FCM Token
  static async saveFcmToken(req, res) {
    try {
      console.log('📱 Saving FCM token for user:', req.user.userId);
      
      const userId = req.user.userId;
      const { fcm_token } = req.body;

      // Validate FCM token
      if (!fcm_token || fcm_token.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'FCM token is required'
        });
      }

      // Update user's FCM token in Firestore
      const admin = require('firebase-admin');
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .update({
          fcm_token: fcm_token.trim(),
          updated_at: new Date().toISOString()
        });

      console.log(`✅ FCM token saved for user: ${userId}`);

      res.json({
        success: true,
        message: 'FCM token saved successfully'
      });

    } catch (error) {
      console.error('❌ Save FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save FCM token',
        error: error.message
      });
    }
  }

  // Test FCM Notification
  static async testNotification(req, res) {
    try {
      console.log('🧪 Testing FCM notification for user:', req.user.userId);
      
      const userId = req.user.userId;
      const FCMService = require('../services/FCMService');

      const result = await FCMService.testNotification(userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Test notification sent successfully',
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to send test notification',
          error: result.message
        });
      }

    } catch (error) {
      console.error('❌ Test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;
