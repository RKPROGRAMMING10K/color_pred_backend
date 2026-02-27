const admin = require('firebase-admin');

class FCMService {
  // Send notification to a specific user
  static async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      console.log(`📱 Sending FCM notification to user: ${userId}`);
      
      // Get user's FCM token from Firestore
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (!userDoc.exists) {
        console.log(`❌ User not found: ${userId}`);
        return { success: false, message: 'User not found' };
      }
      
      const userData = userDoc.data();
      const fcmToken = userData.fcm_token;
      
      if (!fcmToken) {
        console.log(`❌ No FCM token found for user: ${userId}`);
        return { success: false, message: 'No FCM token found for user' };
      }
      
      // Prepare notification message
      const message = {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
          sound: 'default',
          badge: '1'
        },
        data: {
          userId: userId,
          type: data.type || 'general',
          transactionId: data.transactionId || '',
          amount: data.amount || '',
          status: data.status || '',
          timestamp: new Date().toISOString(),
          ...data
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true
            }
          }
        }
      };
      
      // Send the message
      const response = await admin.messaging().send(message);
      console.log(`✅ FCM notification sent successfully to user ${userId}:`, response);
      
      return { 
        success: true, 
        messageId: response,
        userId: userId,
        title: title,
        body: body
      };
      
    } catch (error) {
      console.error(`❌ Error sending FCM notification to user ${userId}:`, error);
      
      // Handle specific FCM errors
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log(`🔄 Removing invalid FCM token for user: ${userId}`);
        await admin.firestore()
          .collection('users')
          .doc(userId)
          .update({ fcm_token: null });
      }
      
      return { 
        success: false, 
        error: error.message,
        userId: userId
      };
    }
  }

  // Get all admin FCM tokens
  static async getAdminFcmTokens() {
    try {
      console.log('🔍 Getting admin FCM tokens');
      
      const adminsSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .where('is_active', '==', true)
        .get();
      
      const adminTokens = [];
      
      for (const doc of adminsSnapshot.docs) {
        const adminData = doc.data();
        if (adminData.fcm_token) {
          adminTokens.push({
            userId: doc.id,
            fcmToken: adminData.fcm_token,
            name: adminData.name || 'Admin'
          });
        }
      }
      
      console.log(`📱 Found ${adminTokens.length} admin FCM tokens`);
      return adminTokens;
      
    } catch (error) {
      console.error('❌ Error getting admin FCM tokens:', error);
      return [];
    }
  }

  // Send notification to all admins
  static async sendNotificationToAdmins(title, body, data = {}) {
    try {
      console.log('📱 Sending FCM notification to all admins');
      
      const adminTokens = await this.getAdminFcmTokens();
      
      if (adminTokens.length === 0) {
        console.log('❌ No admin FCM tokens found');
        return { success: false, message: 'No admin FCM tokens found' };
      }
      
      const results = [];
      
      for (const admin of adminTokens) {
        const message = {
          token: admin.fcmToken,
          notification: {
            title: title,
            body: body,
            sound: 'default',
            badge: '1'
          },
          data: {
            type: data.type || 'admin_general',
            userId: admin.userId,
            adminName: admin.name,
            timestamp: new Date().toISOString(),
            ...data
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                contentAvailable: true
              }
            }
          }
        };
        
        try {
          const response = await admin.messaging().send(message);
          results.push({
            success: true,
            adminId: admin.userId,
            adminName: admin.name,
            messageId: response
          });
          console.log(`✅ FCM notification sent to admin ${admin.name}:`, response);
        } catch (error) {
          results.push({
            success: false,
            adminId: admin.userId,
            adminName: admin.name,
            error: error.message
          });
          console.error(`❌ Error sending FCM to admin ${admin.name}:`, error);
          
          // Remove invalid token
          if (error.code === 'messaging/registration-token-not-registered') {
            await admin.firestore()
              .collection('users')
              .doc(admin.userId)
              .update({ fcm_token: null });
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`📱 FCM notifications sent to ${successCount}/${adminTokens.length} admins`);
      
      return {
        success: successCount > 0,
        totalAdmins: adminTokens.length,
        successfulNotifications: successCount,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Error sending FCM to admins:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Send withdrawal status notification
  static async sendWithdrawalStatusNotification(userId, status, amount, transactionId) {
    const statusMessages = {
      'pending': {
        title: 'Withdrawal Request Received',
        body: `Your withdrawal request of ₹${amount} has been received and is pending review.`
      },
      'processing': {
        title: 'Withdrawal Processing',
        body: `Your withdrawal of ₹${amount} is now being processed.`
      },
      'completed': {
        title: 'Withdrawal Completed',
        body: `Your withdrawal of ₹${amount} has been completed successfully!`
      },
      'rejected': {
        title: 'Withdrawal Rejected',
        body: `Your withdrawal request of ₹${amount} has been rejected. Please contact support.`
      }
    };
    
    const message = statusMessages[status];
    if (!message) {
      console.log(`❌ Unknown withdrawal status: ${status}`);
      return { success: false, message: 'Unknown withdrawal status' };
    }
    
    return await this.sendNotificationToUser(userId, message.title, message.body, {
      type: 'withdrawal_status',
      transactionId: transactionId,
      amount: amount.toString(),
      status: status
    });
  }
  
  // Send deposit status notification
  static async sendDepositStatusNotification(userId, status, amount, transactionId) {
    const statusMessages = {
      'pending': {
        title: 'Deposit Request Received',
        body: `Your deposit request of ₹${amount} has been received and is pending review.`
      },
      'received': {
        title: 'Deposit Received',
        body: `Your deposit of ₹${amount} has been received and added to your wallet!`
      },
      'rejected': {
        title: 'Deposit Rejected',
        body: `Your deposit request of ₹${amount} has been rejected. Please contact support.`
      }
    };
    
    const message = statusMessages[status];
    if (!message) {
      console.log(`❌ Unknown deposit status: ${status}`);
      return { success: false, message: 'Unknown deposit status' };
    }
    
    return await this.sendNotificationToUser(userId, message.title, message.body, {
      type: 'deposit_status',
      transactionId: transactionId,
      amount: amount.toString(),
      status: status
    });
  }

  // Send new withdrawal request notification to admins
  static async sendNewWithdrawalNotificationToAdmins(amount, userName, paymentMethod, transactionId) {
    return await this.sendNotificationToAdmins(
      'New Withdrawal Request',
      `${userName} has requested a withdrawal of ₹${amount} via ${paymentMethod}`,
      {
        type: 'new_withdrawal',
        amount: amount.toString(),
        userName: userName,
        paymentMethod: paymentMethod,
        transactionId: transactionId
      }
    );
  }

  // Send new deposit request notification to admins
  static async sendNewDepositNotificationToAdmins(amount, userName, paymentMethod, transactionId) {
    return await this.sendNotificationToAdmins(
      'New Deposit Request',
      `${userName} has made a deposit of ₹${amount} via ${paymentMethod}`,
      {
        type: 'new_deposit',
        amount: amount.toString(),
        userName: userName,
        paymentMethod: paymentMethod,
        transactionId: transactionId
      }
    );
  }
  
  // Test FCM service
  static async testNotification(userId) {
    try {
      console.log('🧪 Testing FCM notification for user:', userId);
      
      // Get user's FCM token from Firestore
      const admin = require('firebase-admin');
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (!userDoc.exists) {
        console.log(`❌ User not found: ${userId}`);
        return { success: false, message: 'User not found' };
      }
      
      const userData = userDoc.data();
      const fcmToken = userData.fcm_token;
      
      if (!fcmToken) {
        console.log(`❌ No FCM token found for user: ${userId}`);
        return { success: false, message: 'No FCM token found for user' };
      }
      
      console.log(`📱 Found FCM token for user ${userId}: ${fcmToken.substring(0, 20)}...`);
      
      // For testing, if the token looks like a demo/test token, simulate success
      if (fcmToken.includes('test') || fcmToken.includes('demo') || fcmToken.length < 100) {
        console.log('🧪 Detected test/demo FCM token, simulating successful notification');
        return {
          success: true,
          messageId: 'test_msg_' + Date.now(),
          userId: userId,
          title: 'Test Notification',
          body: 'This is a test notification from Color Prediction App (SIMULATED)',
          note: 'This was a simulated success because the token appears to be a test token'
        };
      }
      
      // For real FCM tokens, attempt actual delivery
      return await this.sendNotificationToUser(
        userId, 
        'Test Notification', 
        'This is a test notification from Color Prediction App',
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );
      
    } catch (error) {
      console.error('❌ Test notification error:', error);
      return {
        success: false,
        error: error.message,
        userId: userId
      };
    }
  }
}

module.exports = FCMService;
