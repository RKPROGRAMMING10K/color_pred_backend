# Logout API Documentation - Session Deletion

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
  "message": "Session deleted successfully",
  "data": {
    "session_id": "session_1234567890",
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "logout_timestamp": "2026-02-27T12:55:00.000Z",
    "action": "session_deleted"
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
  "message": "All sessions deleted successfully",
  "data": {
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "logout_timestamp": "2026-02-27T12:55:00.000Z",
    "action": "all_sessions_deleted"
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
    "sessions_deleted": true,
    "action": "logout_successful"
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
    "logout_timestamp": "2026-02-27T12:55:00.000Z",
    "action": "all_sessions_deleted"
  }
}
```

---

## 🔧 Session Management - Complete Deletion

### ✅ What Happens on Logout

#### **User Logout:**
1. **Session Verification** - Validates session exists and belongs to user
2. **Session Deletion** - **Completely deletes** the session document from Firestore
3. **Logout Timestamp** - Records when user logged out
4. **Optional FCM Clear** - Can clear FCM token (commented out by default)

#### **Admin Logout:**
1. **Session Deletion** - **Deletes** admin session documents (if they exist)
2. **JWT Invalidation** - Client-side token removal
3. **Logout Timestamp** - Records when admin logged out
4. **Graceful Fallback** - Works even if admin doesn't use sessions

---

## 📋 Session Document Behavior

### ✅ Before Logout (Session Exists)
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

### ✅ After Logout (Session Document Deleted)
```json
// The entire session document is completely deleted from Firestore
// No trace of the session remains in the database
```

---

## 🎯 Implementation Details

### ✅ Session Model Methods Used

#### **Session.findById(sessionId)**
- Finds session by document ID
- Checks if session is expired
- Returns null if session doesn't exist or is expired

#### **Session.destroy(sessionId)**
- **Completely deletes** the session document from Firestore
- Uses `sessionRef.delete()` instead of update
- Logs successful deletion

#### **Session.destroyAllForUser(userId)**
- Finds all session documents for user
- **Deletes all session documents** in batch operation
- Returns count of deleted sessions

#### **Session.getActiveSessionsForUser(userId)**
- Gets all existing sessions (since deleted sessions are gone)
- Filters out expired sessions only
- Returns only non-expired sessions

---

## 🔍 Key Benefits of Session Deletion

### ✅ Advantages Over Inactive Marking

#### **1. Cleaner Database**
- No accumulation of inactive session documents
- Reduced storage usage
- Better query performance

#### **2. Simplified Logic**
- No need to check `is_active` field
- All existing sessions are automatically active
- Easier to debug and maintain

#### **3. Security Benefits**
- No session data remains after logout
- Complete removal of sensitive session information
- Reduced attack surface

#### **4. Automatic Cleanup**
- New sessions created on login
- Old sessions completely removed on logout
- No manual cleanup required

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

#### **No Sessions Found**
```json
{
  "success": true,
  "message": "All sessions deleted successfully",
  "data": {
    "user_id": "BGqIl4idRmzst1Mo0EwV",
    "logout_timestamp": "2026-02-27T12:55:00.000Z",
    "action": "all_sessions_deleted"
  }
}
```

---

## 🛡️ Security Features

### ✅ Session Validation
- Verifies session belongs to authenticated user
- Checks session expiration
- Prevents cross-user session manipulation

### ✅ Batch Operations
- Uses Firestore batch writes for multiple session deletions
- Ensures atomic operations
- Reduces database calls

### ✅ Complete Data Removal
- Session documents completely deleted
- No residual data left behind
- Enhanced privacy and security

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
      
      print('Session deleted: ${data['data']['action']}');
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
        SnackBar(content: Text('All sessions deleted')),
      );
      
      print('All sessions deleted: ${data['data']['action']}');
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
      
      console.log('Session deleted:', data.data.action);
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
      
      console.log('Admin logout:', data.data.action);
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
- Session deletion frequency per user
- Session duration before deletion
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
- Use batch operations for multiple session deletions
- Implement proper error handling
- Log all logout activities
- Monitor session deletion patterns

---

## 🔄 Login Flow After Session Deletion

### ✅ New Session Creation
1. **User Logs In** → New session document created
2. **Previous Sessions** → Already deleted from previous logout
3. **Active Sessions** → Only current session exists
4. **Clean State** → No inactive sessions in database

### ✅ Benefits
- **No Session Conflicts** - Only active sessions exist
- **Clean Database** - No accumulation of old sessions
- **Better Performance** - Fewer documents to query
- **Enhanced Security** - Complete session removal

---

**These logout APIs now completely delete session documents instead of just marking them inactive, providing a cleaner and more secure session management system!** 🚪✨
