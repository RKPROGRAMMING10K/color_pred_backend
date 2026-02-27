# FCM Integration for Next.js Admin Website

## 📱 Adding FCM to Next.js Admin Website - Complete Guide

### ✅ Step 1: Firebase Setup

#### **Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" → Create new project
3. Enter project name → Enable Google Analytics → Create project

#### **Add Web App**
1. In Firebase Console, click "Add app" → Web icon
2. Enter app nickname → Register app
3. Copy Firebase configuration object:
   ```javascript
   apiKey: "your-api-key"
   authDomain: "your-project.firebaseapp.com"
   projectId: "your-project-id"
   storageBucket: "your-project.appspot.com"
   messagingSenderId: "your-sender-id"
   appId: "your-app-id"
   measurementId: "your-measurement-id"
   ```

#### **Get VAPID Key**
1. Go to Project Settings → Cloud Messaging
2. Scroll to "Web configuration" section
3. Click "Generate key pair"
4. Copy the VAPID public key (needed for web notifications)

---

### ✅ Step 2: Install Firebase in Next.js

#### **Install Dependencies**
```bash
npm install firebase
```

#### **Create Firebase Configuration**
Create `utils/firebase.js`:
```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, app };
```

---

### ✅ Step 3: Request Notification Permission

#### **Create FCM Service**
Create `utils/fcmService.js`:
```javascript
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';

export class FCMService {
  // Request permission and get token
  static async requestPermissionAndGetToken() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: 'your-vapid-key-here'
        });
        
        console.log('📱 FCM Token:', token);
        return token;
      } else {
        console.log('❌ Notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  // Listen for foreground messages
  static listenForMessages(callback) {
    return onMessage(messaging, (payload) => {
      console.log('📱 Received foreground message:', payload);
      
      // Show notification in foreground
      if (payload.notification) {
        this.showNotification(payload.notification.title, payload.notification.body, payload.data);
      }
      
      // Call custom callback
      if (callback) callback(payload);
    });
  }

  // Show browser notification
  static showNotification(title, body, data = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data,
        requireInteraction: true
      });
    }
  }
}
```

---

### ✅ Step 4: Integrate with Admin Login

#### **Update Login Component**
In your admin login page/component:

```javascript
import { FCMService } from '../utils/fcmService';

const AdminLogin = () => {
  const handleLogin = async (email, password) => {
    try {
      // Request notification permission and get FCM token
      const fcmToken = await FCMService.requestPermissionAndGetToken();
      
      // Login with FCM token
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          fcm_token: fcmToken // Include FCM token
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Save admin token and user data
        localStorage.setItem('adminToken', data.data.token);
        
        // Set up message listener
        FCMService.listenForMessages(handleNotification);
        
        // Redirect to admin dashboard
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleNotification = (payload) => {
    // Handle incoming notifications
    console.log('Admin notification received:', payload);
    
    // Refresh dashboard data
    refreshDashboard();
    
    // Show alert or update UI
    if (payload.data.type === 'new_withdrawal') {
      alert('New withdrawal request received!');
    } else if (payload.data.type === 'new_deposit') {
      alert('New deposit request received!');
    }
  };

  return (
    // Your login form JSX
  );
};
```

---

### ✅ Step 5: Service Worker Setup

#### **Create Service Worker**
Create `public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

// Initialize messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Received background message:', payload);
  
  const notification = payload.notification;
  const notificationTitle = notification.title;
  const notificationOptions = {
    body: notification.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data.type === 'new_withdrawal') {
    event.waitUntil(
      clients.openWindow('/admin/withdrawals')
    );
  } else if (event.notification.data.type === 'new_deposit') {
    event.waitUntil(
      clients.openWindow('/admin/deposits')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/admin/dashboard')
    );
  }
});
```

#### **Register Service Worker**
In your `_app.js` or main layout:
```javascript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service worker registered:', registration);
      })
      .catch((error) => {
        console.error('❌ Service worker registration failed:', error);
      });
  }
}, []);
```

---

## 🔧 Admin FCM Endpoints

### ✅ Save FCM Token During Login
```
POST /api/auth/login
{
  "email": "rvn276@gmail.com",
  "password": "Rohit9595",
  "fcm_token": "admin_website_fcm_token"
}
```

### ✅ Alternative FCM Token Save
```
POST /api/auth/fcm-token
{
  "fcm_token": "admin_website_fcm_token"
}
```

### ✅ Test Admin Notification
```
POST /api/auth/test-notification
Authorization: Bearer <admin_jwt_token>
```

---

## 📱 What Admin Will Receive

### ✅ New Withdrawal Request
```
Title: "New Withdrawal Request"
Body: "Rohit Vishwakarma has requested a withdrawal of ₹1000 via Bank Transfer"
Data: {
  "type": "new_withdrawal",
  "amount": "1000",
  "userName": "Rohit Vishwakarma",
  "paymentMethod": "Bank Transfer",
  "transactionId": "TXNABC123"
}
```

### ✅ New Deposit Request
```
Title: "New Deposit Request"
Body: "Rohit Vishwakarma has made a deposit of ₹1000 via UPI-QR"
Data: {
  "type": "new_deposit",
  "amount": "1000",
  "userName": "Rohit Vishwakarma",
  "paymentMethod": "UPI-QR",
  "transactionId": "TXNDEF456"
}
```

---

## 🎯 Implementation Flow

### ✅ Admin Login Process
1. Admin enters email/password on Next.js website
2. Website requests notification permission from browser
3. Website gets FCM token from Firebase
4. Website sends login request with FCM token to backend
5. Backend saves FCM token to admin's user document
6. Admin is logged in and ready to receive notifications

### ✅ Notification Reception
1. User creates withdrawal/deposit request
2. Backend sends FCM notification to all admin FCM tokens
3. Admin website receives notification (foreground or background)
4. Browser shows notification popup
5. Admin dashboard updates automatically
6. Admin can click notification to view details

---

## 🔧 Key Requirements

### ✅ Browser Requirements
- **HTTPS required** (mandatory for FCM on web)
- Modern browser (Chrome, Firefox, Safari, Edge)
- User must grant notification permission
- Service worker must be registered

### ✅ Firebase Requirements
- Firebase project with Cloud Messaging enabled
- Web app configured in Firebase
- VAPID key generated
- Server key (for backend, already configured)

### ✅ Backend Requirements
- Admin users must have `role: 'admin'` in their user document
- Admin users must have `fcm_token` field populated
- Admin users must be `is_active: true`

---

## 🚀 Testing Steps

### ✅ Step 1: Test FCM Token
1. Login to admin website
2. Check browser console for FCM token
3. Verify token is saved to backend (check user document)
4. Use browser dev tools to check service worker status

### ✅ Step 2: Test Notification
1. Use `POST /api/auth/test-notification` endpoint
2. Check if admin website receives notification
3. Verify notification appears in browser
4. Test both foreground and background notifications

### ✅ Step 3: Test Real Scenario
1. Create a withdrawal request from mobile app
2. Check if admin website gets notification
3. Verify admin dashboard updates automatically
4. Test clicking notification to navigate to details

---

## 🎯 Benefits

### ✅ Real-time Updates
- Instant notifications for new withdrawal/deposit requests
- No need to refresh the admin dashboard
- Better user experience for admins
- Faster response time to user requests

### ✅ Multi-device Support
- Multiple admins can receive notifications simultaneously
- Works on desktop and mobile browsers
- Background notifications when website is not active
- Cross-platform compatibility

### ✅ Professional Experience
- Modern notification system
- Improved admin efficiency
- Better customer service (faster processing)
- Enhanced user trust and satisfaction

---

## 🔧 Troubleshooting

### ✅ Common Issues

#### **Notifications Not Working**
- Check if site is served over HTTPS
- Verify notification permission is granted
- Check browser console for errors
- Ensure service worker is registered

#### **FCM Token Not Generated**
- Check VAPID key is correct
- Verify Firebase project configuration
- Check browser compatibility
- Ensure no ad-blockers are blocking

#### **Background Notifications Not Working**
- Verify service worker is properly registered
- Check service worker console for errors
- Ensure browser supports background sync
- Test with different browsers

### ✅ Debug Commands
```javascript
// Check notification permission
console.log('Notification permission:', Notification.permission);

// Check service worker registration
navigator.serviceWorker.getRegistrations().then(console.log);

// Test FCM token
FCMService.requestPermissionAndGetToken().then(console.log);
```

---

## 📋 Deployment Checklist

### ✅ Before Deployment
- [ ] Firebase project created and configured
- [ ] VAPID key generated
- [ ] HTTPS certificate configured
- [ ] Service worker file in public folder
- [ ] FCM service implemented
- [ ] Login updated with FCM token

### ✅ After Deployment
- [ ] Test notification permission flow
- [ ] Verify FCM token generation
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Verify admin dashboard updates
- [ ] Test notification click handling

---

**Your Next.js admin website will receive real-time notifications whenever users create withdrawal or deposit requests!** 🎯📱✨

This guide provides everything needed to implement FCM in your admin website, from Firebase setup to testing and troubleshooting.
