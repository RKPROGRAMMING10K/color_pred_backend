# Withdrawal Notification System Documentation

## 📱 Complete User Withdrawal Notification Flow

### 🔄 End-to-End Journey

#### **Step 1: User Creates Withdrawal Request**
```bash
POST /api/withdraw/create
Headers:
  Authorization: Bearer <user_jwt_token>
  Content-Type: application/json

Body:
{
  "amount": 1000,
  "payment_method": "Bank Transfer"  // or "UPI"
}
```

#### **Step 2: Admin Gets Instant Notification**
All admins with FCM tokens receive:
```
Title: "New Withdrawal Request"
Body: "Rohit Vishwakarma has requested a withdrawal of ₹1000 via Bank Transfer"
```

#### **Step 3: Admin Updates Status**
```bash
PUT /api/admin/withdrawals/:transactionId/status
Headers:
  Authorization: Bearer <admin_jwt_token>
  Content-Type: application/json

Body:
{
  "status": "processing"  // or "completed" or "rejected"
}
```

#### **Step 4: User Gets Status Update Notification**
User receives notification based on status:

**Processing:**
```
Title: "Withdrawal Processing"
Body: "Your withdrawal of ₹1000 is now being processed."
```

**Completed:**
```
Title: "Withdrawal Completed"
Body: "Your withdrawal of ₹1000 has been completed successfully!"
```

**Rejected:**
```
Title: "Withdrawal Rejected"
Body: "Your withdrawal request of ₹1000 has been rejected. Please contact support."
```

---

## 🔧 Technical Implementation

### FCM Data Payload Sent to User
```json
{
  "userId": "BGqIl4dRmzst1Mo0EwV",
  "type": "withdrawal_status",
  "transactionId": "TXNABC123DEF456",
  "amount": "1000",
  "status": "completed",
  "timestamp": "2026-02-27T12:30:00.000Z"
}
```

### FCM Data Payload Sent to Admin
```json
{
  "type": "new_withdrawal",
  "amount": "1000",
  "userName": "Rohit Vishwakarma",
  "paymentMethod": "Bank Transfer",
  "transactionId": "TXNABC123DEF456",
  "adminName": "Admin"
}
```

---

## 📋 User Requirements

### 1. FCM Token Must Be Saved
User needs to include FCM token during login:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "device_info": "iPhone 14",
  "fcm_token": "user_fcm_token_here"
}
```

### 2. Alternative FCM Token Save
If not saved during login, can be saved separately:
```bash
POST /api/auth/fcm-token
Headers:
  Authorization: Bearer <user_jwt_token>

Body:
{
  "fcm_token": "user_fcm_token_here"
}
```

### 3. Test FCM Notification
```bash
POST /api/auth/test-notification
Headers:
  Authorization: Bearer <user_jwt_token>
```

---

## 📱 Mobile App Implementation

### Flutter/Dart Example

#### Initialize Firebase Messaging
```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static Future<void> initialize() async {
    // Request permission
    await FirebaseMessaging.instance.requestPermission();
    
    // Get FCM token
    final fcmToken = await FirebaseMessaging.instance.getToken();
    print('FCM Token: $fcmToken');
    
    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen(_handleMessage);
    
    // Listen for background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
  }
  
  static void _handleMessage(RemoteMessage message) {
    final data = message.data;
    
    if (data['type'] == 'withdrawal_status') {
      final String status = data['status'];
      final String amount = data['amount'];
      final String transactionId = data['transactionId'];
      
      // Show local notification
      _showLocalNotification(
        title: message.notification?.title ?? 'Withdrawal Update',
        body: message.notification?.body ?? 'Your withdrawal status has changed',
        payload: {
          'type': 'withdrawal_status',
          'transactionId': transactionId,
          'status': status,
          'amount': amount
        }
      );
      
      // Update UI
      _updateWithdrawalStatus(transactionId, status);
      _refreshWithdrawalList();
      _showStatusDialog(status, amount);
    }
  }
  
  static Future<void> _showLocalNotification(
    String title, 
    String body, 
    Map<String, String> payload
  ) async {
    // Implementation using flutter_local_notifications
    // Show notification and handle user tap
  }
}
```

#### Save FCM Token on Login
```dart
Future<void> login(String email, String password) async {
  try {
    // Get FCM token
    final fcmToken = await FirebaseMessaging.instance.getToken();
    
    // Login with FCM token
    final response = await http.post(
      Uri.parse('https://color-pred-backend.onrender.com/api/auth/login'),
      body: {
        'email': email,
        'password': password,
        'fcm_token': fcmToken,
        'device_info': 'Flutter App',
      },
    );
    
    final data = json.decode(response.body);
    if (data['success']) {
      // Save JWT token and user data
      await _saveUserData(data['data']);
      
      // Initialize notifications
      await NotificationService.initialize();
    }
  } catch (e) {
    print('Login error: $e');
  }
}
```

#### Handle Withdrawal Notifications
```dart
void _handleWithdrawalNotification(RemoteMessage message) {
  final status = message.data['status'];
  final amount = message.data['amount'];
  final transactionId = message.data['transactionId'];
  
  // Show appropriate UI feedback
  Color backgroundColor;
  String messageText;
  
  switch (status) {
    case 'completed':
      backgroundColor = Colors.green;
      messageText = 'Withdrawal Completed: ₹$amount';
      break;
    case 'processing':
      backgroundColor = Colors.orange;
      messageText = 'Withdrawal Processing: ₹$amount';
      break;
    case 'rejected':
      backgroundColor = Colors.red;
      messageText = 'Withdrawal Rejected: ₹$amount';
      break;
    default:
      backgroundColor = Colors.blue;
      messageText = 'Withdrawal Update: ₹$amount';
  }
  
  // Show snackbar
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(messageText),
      backgroundColor: backgroundColor,
      duration: Duration(seconds: 3),
      action: SnackBarAction(
        label: 'View Details',
        onPressed: () => _navigateToWithdrawalDetails(transactionId),
      ),
    ),
  );
  
  // Refresh withdrawal list
  _refreshWithdrawals();
}
```

---

## 🎯 Complete API Endpoints

### User Endpoints

#### Create Withdrawal
```bash
POST /api/withdraw/create
{
  "amount": 1000,
  "payment_method": "Bank Transfer"
}
```

#### Get Withdrawals
```bash
GET /api/withdraw/
Authorization: Bearer <user_jwt_token>
```

#### Get Withdrawal Details
```bash
GET /api/withdraw/:transaction_id
Authorization: Bearer <user_jwt_token>
```

#### Save FCM Token
```bash
POST /api/auth/fcm-token
{
  "fcm_token": "user_fcm_token"
}
```

#### Test Notification
```bash
POST /api/auth/test-notification
```

### Admin Endpoints

#### Update Withdrawal Status
```bash
PUT /api/admin/withdrawals/:transactionId/status
{
  "status": "completed"  // pending, processing, completed, rejected
}
```

#### Get All Withdrawals
```bash
GET /api/admin/withdrawals
Authorization: Bearer <admin_jwt_token>
```

---

## 🔍 Debugging & Testing

### Check FCM Token Status
```bash
# Test user notification
POST /api/auth/test-notification
Authorization: Bearer <user_jwt_token>

# Expected response
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": {
    "success": true,
    "messageId": "msg123456",
    "userId": "user123",
    "title": "Test Notification",
    "body": "This is a test notification"
  }
}
```

### Check Transaction Status
```bash
# Get withdrawal details
GET /api/withdraw/TXNABC123
Authorization: Bearer <user_jwt_token>

# Expected response
{
  "success": true,
  "data": {
    "transaction_id": "TXNABC123",
    "payment_method": "Bank Transfer",
    "amount": 1000,
    "status": "completed",
    "payment_details": {
      "type": "Bank",
      "bank_name": "State Bank of India",
      "account_holder_name": "Rohit Vishwakarma",
      "account_number": "1234567890123456",
      "ifsc_code": "SBIN0001234"
    },
    "created_at": "2026-02-27T12:30:00.000Z"
  }
}
```

### Admin Status Update
```bash
# Update withdrawal status
PUT /api/admin/withdrawals/TXNABC123/status
{
  "status": "completed"
}

# Expected response
{
  "success": true,
  "message": "Withdrawal transaction status updated to completed",
  "data": {
    "transaction_id": "TXNABC123",
    "new_status": "completed",
    "amount": 1000,
    "payment_method": "Bank Transfer",
    "payment_details": { ... },
    "user_id": "user123",
    "fcm_notification": {
      "success": true,
      "messageId": "msg789012",
      "userId": "user123",
      "title": "Withdrawal Completed",
      "body": "Your withdrawal of ₹1000 has been completed successfully!"
    }
  }
}
```

---

## 🚀 Notification Flow Summary

### User Side Flow
1. **Login with FCM token** → Token saved to user document
2. **Create withdrawal request** → Admin gets notified instantly
3. **Wait for admin action** → Receive real-time status updates
4. **Get notifications** → Automatic UI updates and alerts

### Admin Side Flow
1. **Login with FCM token** → Token saved to admin document
2. **Receive withdrawal requests** → Real-time notifications on all admin devices
3. **Process withdrawals** → Update status (pending → processing → completed/rejected)
4. **User gets notified** → Automatic status update notifications

---

## 📱 Mobile App Checklist

### ✅ Required Implementation
- [ ] Firebase Messaging SDK integration
- [ ] FCM token generation and saving
- [ ] Foreground message handling
- [ ] Background message handling
- [ ] Local notification display
- [ ] UI updates on notification
- [ ] Navigation to withdrawal details
- [ ] Error handling for failed notifications

### ✅ User Experience
- [ ] Show withdrawal status changes in real-time
- [ ] Display appropriate notification colors (green for completed, orange for processing, red for rejected)
- [ ] Allow users to tap notifications to view details
- [ ] Refresh withdrawal list automatically
- [ ] Show loading states during status updates

---

## 🔧 Backend Configuration

### Environment Variables
```env
FIREBASE_SERVICE_ACCOUNT=<firebase_service_account_json>
JWT_SECRET=<jwt_secret_key>
PORT=3000
NODE_ENV=production
```

### Firebase Project Setup
- Firebase Cloud Messaging enabled
- Service account key configured
- App registration completed
- Web/API key generated

---

## 📊 Monitoring & Analytics

### Notification Metrics
- Delivery success rate
- Open rate
- Click-through rate
- Error rate (invalid tokens, network issues)

### Transaction Metrics
- Withdrawal request volume
- Processing time
- Completion rate
- Rejection rate

### User Engagement
- Notification opt-in rate
- App opens from notifications
- Withdrawal status check frequency

---

## 🎯 Best Practices

### Security
- Always validate JWT tokens
- Use HTTPS for all API calls
- Never expose sensitive data in notifications
- Implement rate limiting for notification endpoints

### Performance
- Cache FCM tokens efficiently
- Batch notifications when possible
- Use appropriate notification priorities
- Implement retry logic for failed notifications

### User Experience
- Send notifications at appropriate times
- Provide clear and actionable messages
- Allow users to manage notification preferences
- Handle notification permissions gracefully

---

## 📞 Support & Troubleshooting

### Common Issues
1. **Notifications not received**
   - Check FCM token is saved
   - Verify app has notification permissions
   - Check network connectivity

2. **Invalid FCM token errors**
   - Token automatically cleaned up
   - User needs to re-login to get new token

3. **Delayed notifications**
   - Check Firebase project settings
   - Verify server deployment status
   - Check network latency

### Debug Commands
```bash
# Check user FCM token
GET /api/auth/profile
Authorization: Bearer <user_jwt_token>

# Test notification delivery
POST /api/auth/test-notification
Authorization: Bearer <user_jwt_token>

# Check transaction status
GET /api/withdraw/:transaction_id
Authorization: Bearer <user_jwt_token>
```

---

**This documentation covers the complete withdrawal notification system from user request to final notification delivery.** 🎯📱✨
