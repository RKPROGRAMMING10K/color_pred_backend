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
  
  // Test FCM service
  static async testNotification(userId) {
    return await this.sendNotificationToUser(
      userId, 
      'Test Notification', 
      'This is a test notification from Color Prediction App',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
  }
}

module.exports = FCMService;
