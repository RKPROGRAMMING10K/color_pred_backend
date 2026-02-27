# Logout API Documentation

## 🚪 User & Admin Logout APIs

### ✅ User Logout Endpoints

#### **1. User Logout (Single Session)**
```
POST /api/auth/logout
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

Body:
{
  "session_id": "session_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {
    "session_id": "session_1234567890",
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "logout_timestamp": "2026-02-27T12:55:00.000Z"
  }
}
```

#### **2. User Logout (All Devices)**
```
POST /api/auth/logout-all
Authorization: Bearer <user_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully",
  "data": {
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "logout_timestamp": "2026-02-27T12:55:00.000Z"
  }
}
```

---

### ✅ Admin Logout Endpoints

#### **1. Admin Logout (Single Session)**
```
POST /api/admin/auth/logout
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

Body:
{
  "session_id": "admin_session_1234567890",
  "logout_all": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin logout successful",
  "data": {
    "admin_id": "admin_user_id_123",
    "logout_timestamp": "2026-02-27T12:55:00.000Z",
    "sessions_cleared": true
  }
}
```

#### **2. Admin Logout (All Devices)**
```
POST /api/admin/auth/logout-all
Authorization: Bearer <admin_jwt_token>
```

**OR**

```
POST /api/admin/auth/logout
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

Body:
{
  "logout_all": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin logged out from all devices successfully",
  "data": {
    "admin_id": "admin_user_id_123",
    "logout_timestamp": "2026-02-27T12:55:00.000Z"
  }
}
```

---

## 🔧 Session Management

### ✅ What Happens on Logout

#### **User Logout:**
1. **Session Verification** - Validates session exists and belongs to user
2. **Session Destruction** - Marks session as inactive in Firestore
3. **Logout Timestamp** - Records when user logged out
4. **Optional FCM Clear** - Can clear FCM token (commented out by default)

#### **Admin Logout:**
1. **Session Cleanup** - Attempts to destroy admin sessions (if they exist)
2. **JWT Invalidation** - Client-side token removal
3. **Logout Timestamp** - Records when admin logged out
4. **Graceful Fallback** - Works even if admin doesn't use sessions

---

## 📋 Session Document Structure

### ✅ Before Logout (Active Session)
```json
{
  "user_id": "BGqIl4idRmzst1Mo0EwV",
  "user_data": {
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "name": "Rohit Vishwakarma",
    "email": "rkvsk73@gmail.com",
    "phone": "9637999542"
  },
  "device_info": {
    "device_fingerprint": "abc123",
    "device_id": "abc123",
    "login_timestamp": "2026-02-27T10:00:00.000Z"
  },
  "login_timestamp": "2026-02-27T10:00:00.000Z",
  "last_activity": "2026-02-27T12:00:00.000Z",
  "is_active": true,
  "expires_at": "2026-03-06T10:00:00.000Z",
  "created_at": "2026-02-27T10:00:00.000Z",
  "updated_at": "2026-02-27T12:00:00.000Z"
}
```

### ✅ After Logout (Inactive Session)
```json
{
  "user_id": "BGqIl4idRmzst1Mo0EwV",
  "user_data": { ... },
  "device_info": { ... },
  "login_timestamp": "2026-02-27T10:00:00.000Z",
  "last_activity": "2026-02-27T12:00:00.000Z",
  "is_active": false,
  "logout_timestamp": "2026-02-27T12:55:00.000Z",
  "expires_at": "2026-03-06T10:00:00.000Z",
  "created_at": "2026-02-27T10:00:00.000Z",
  "updated_at": "2026-02-27T12:55:00.000Z"
}
```

---

## 🎯 Implementation Details

### ✅ Session Model Methods Used

#### **Session.findById(sessionId)**
- Finds session by document ID
- Checks if session is expired
- Returns null if session doesn't exist or is expired

#### **Session.destroy(sessionId)**
- Marks specific session as inactive
- Sets logout_timestamp
- Updates updated_at timestamp

#### **Session.destroyAllForUser(userId)**
- Finds all active sessions for user
- Marks all sessions as inactive in batch
- Sets logout_timestamp for all sessions

---

## 🔍 Error Handling

### ✅ Common Error Responses

#### **Session Not Found**
```json
{
  "success": false,
  "message": "Session not found or expired"
}
```

#### **Invalid Session**
```json
{
  "success": false,
  "message": "Invalid session"
}
```

#### **Session ID Required**
```json
{
  "success": false,
  "message": "Session ID is required"
}
```

#### **Unauthorized**
```json
{
  "success": false,
  "message": "Access denied"
}
```

---

## 🛡️ Security Features

### ✅ Session Validation
- Verifies session belongs to authenticated user
- Checks session expiration
- Prevents cross-user session manipulation

### ✅ Batch Operations
- Uses Firestore batch writes for multiple session updates
- Ensures atomic operations
- Reduces database calls

### ✅ Logging
- Comprehensive logout logging
- Tracks user/admin activity
- Helps with debugging and auditing

---

## 📱 Mobile App Integration

### ✅ Flutter/Dart Example

#### **User Logout**
```dart
Future<void> logout(String sessionId) async {
  try {
    final response = await http.post(
      Uri.parse('https://color-pred-backend.onrender.com/api/auth/logout'),
      headers: {
        'Authorization': 'Bearer $userToken',
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'session_id': sessionId,
      }),
    );

    final data = json.decode(response.body);
    if (data['success']) {
      // Clear local storage
      await clearUserData();
      
      // Navigate to login
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => LoginScreen()),
        (route) => false,
      );
    }
  } catch (e) {
    print('Logout error: $e');
  }
}
```

#### **Logout All Devices**
```dart
Future<void> logoutAllDevices() async {
  try {
    final response = await http.post(
      Uri.parse('https://color-pred-backend.onrender.com/api/auth/logout-all'),
      headers: {
        'Authorization': 'Bearer $userToken',
      },
    );

    final data = json.decode(response.body);
    if (data['success']) {
      // Clear all local data
      await clearAllUserData();
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Logged out from all devices')),
      );
    }
  } catch (e) {
    print('Logout all error: $e');
  }
}
```

---

## 🌐 Web App Integration

### ✅ JavaScript Example

#### **User Logout**
```javascript
async function logout(sessionId) {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    const data = await response.json();
    if (data.success) {
      // Clear local storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      
      // Redirect to login
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}
```

#### **Admin Logout**
```javascript
async function adminLogout() {
  try {
    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.success) {
      // Clear admin data
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      
      // Redirect to admin login
      window.location.href = '/admin/login';
    }
  } catch (error) {
    console.error('Admin logout error:', error);
  }
}
```

---

## 🧪 Testing the APIs

### ✅ Test User Logout
```bash
# Logout single session
curl -X POST https://color-pred-backend.onrender.com/api/auth/logout \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "YOUR_SESSION_ID"}'

# Logout all devices
curl -X POST https://color-pred-backend.onrender.com/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

### ✅ Test Admin Logout
```bash
# Admin logout
curl -X POST https://color-pred-backend.onrender.com/api/admin/auth/logout \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logout_all": true}'

# Admin logout all devices
curl -X POST https://color-pred-backend.onrender.com/api/admin/auth/logout-all \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## 📊 Monitoring & Analytics

### ✅ Logout Metrics to Track
- Logout frequency per user
- Session duration
- Multi-device usage patterns
- Failed logout attempts
- Admin logout patterns

### ✅ Security Monitoring
- Suspicious logout patterns
- Multiple failed logout attempts
- Session hijacking attempts
- Unusual device combinations

---

## 🎯 Best Practices

### ✅ For Users
- Always call logout API when user logs out
- Clear local storage after successful logout
- Handle network errors gracefully
- Show loading states during logout

### ✅ For Admins
- Implement session timeout
- Log all admin activities
- Use HTTPS for all logout requests
- Validate admin permissions before logout

### ✅ For Backend
- Use batch operations for multiple sessions
- Implement proper error handling
- Log all logout activities
- Clean up expired sessions periodically

---

**These logout APIs provide secure session management for both users and admins, ensuring proper cleanup of sessions and maintaining security standards.** 🚪✨
