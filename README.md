# Color Backend API

A clean, structured Node.js backend with Firebase integration for user registration and authentication.

## 📁 Project Structure

```
color_backend/
├── src/
│   ├── controllers/
│   │   └── AuthController.js    # Authentication logic
│   ├── models/
│   │   └── User.js             # User model and Firestore operations
│   ├── routes/
│   │   └── auth.js             # Authentication routes
│   ├── middleware/
│   │   └── auth.js             # JWT and validation middleware
│   ├── config/
│   │   └── firebase.js         # Firebase configuration
│   └── utils/                  # Utility functions
├── server.js                   # Main server file
├── service-account-key.json    # Firebase service account
└── package.json
```

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Start the Server
```bash
npm run dev
```

## 🔐 API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "9637999542",
  "password": "Rohit9595",
  "device_info": {
    "app_version": "1.0.0",
    "app_build_number": "1",
    "timestamp": "2023-12-25T12:34:56.789Z",
    "platform": "Android",
    "device_model": "Pixel 6",
    "device_brand": "Google",
    "device_manufacturer": "Google",
    "android_version": "13",
    "android_sdk": 33,
    "device_id": "1234567890abcdef"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "firebase-document-id",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9637999542",
    "token": "jwt-token",
    "created_at": "2023-12-25T12:34:56.789Z"
  }
}
```

#### POST `/api/auth/login`
Login existing user with email

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Rohit9595",
  "device_info": {
    "app_version": "1.0.0",
    "platform": "Android"
  }
}
```

#### POST `/api/auth/login-phone`
Login existing user with phone number

**Request Body:**
```json
{
  "phone": "9637999542",
  "password": "Rohit9595"
}
```

**Response (for both login endpoints):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": "firebase-document-id",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9637999542",
    "token": "jwt-token",
    "session_id": "session-32-char-string",
    "profile_completed": false
  }
}
```

#### POST `/api/auth/logout`
Logout user from current session

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "session_id": "session-32-char-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### POST `/api/auth/logout-all`
Logout user from all devices

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

#### GET `/api/auth/sessions`
Get all active sessions for user

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": "session-32-char-string",
      "user_id": "firebase-document-id",
      "device_info": {...},
      "login_timestamp": "2023-12-25T12:34:56.789Z",
      "last_activity": "2023-12-25T13:45:67.890Z",
      "expires_at": "2024-01-01T12:34:56.789Z"
    }
  ]
}
```

#### GET `/api/auth/profile`
Get user profile (requires JWT token)

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### Payment Routes (`/api/payment`)

#### POST `/api/payment/bank`
Create or update bank details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "bank_name": "State Bank of India",
  "account_holder_name": "Rohit Vishwakarma",
  "account_number": "1234567890123456",
  "phone_number": "9637999542",
  "ifsc_code": "SBIN0001234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank details created successfully",
  "action": "created"
}
```

#### GET `/api/payment/bank`
Get bank details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bank-document-id",
    "user_id": "user-id",
    "bank_name": "State Bank of India",
    "account_holder_name": "Rohit Vishwakarma",
    "phone_number": "9637999542",
    "ifsc_code": "SBIN0001234",
    "masked_account_number": "************3456",
    "is_verified": false,
    "created_at": "2025-02-25T12:34:56.789Z"
  }
}
```

#### DELETE `/api/payment/bank/:bank_id`
Delete bank details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Bank details deleted successfully"
}
```

#### POST `/api/payment/upi`
Create or update UPI details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "upi_name": "Rohit Vishwakarma",
  "phone_number": "9637999542",
  "upi_id": "rohitvishwakarma@paytm",
  "confirm_upi_id": "rohitvishwakarma@paytm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "UPI details created successfully",
  "action": "created"
}
```

#### GET `/api/payment/upi`
Get UPI details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "upi-document-id",
    "user_id": "user-id",
    "upi_name": "Rohit Vishwakarma",
    "phone_number": "9637999542",
    "upi_id": "rohitvishwakarma@paytm",
    "is_verified": false,
    "created_at": "2025-02-25T12:34:56.789Z"
  }
}
```

#### DELETE `/api/payment/upi/:upi_id`
Delete UPI details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "UPI details deleted successfully"
}
```

#### GET `/api/payment/methods`
Get all payment methods for user

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bank_details": {
      "id": "bank-document-id",
      "bank_name": "State Bank of India",
      "account_holder_name": "Rohit Vishwakarma",
      "masked_account_number": "************3456",
      "ifsc_code": "SBIN0001234"
    },
    "upi_details": {
      "id": "upi-document-id",
      "upi_name": "Rohit Vishwakarma",
      "upi_id": "rohitvishwakarma@paytm"
    }
  }
}
```

### Transaction Routes (`/api/transaction`)

#### POST `/api/transaction/create`
Create new transaction

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "payment_method": "UPI-QR",
  "amount": 500,
  "utr_number": "123456789012",
  "phone_number": "9876543210",
  "particular": "Deposit"
}
```

**Particular Options:** `Deposit` or `Withdraw` (defaults to `Deposit` if not provided)

**Response (First Transaction):**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction_id": "TXN1234567890AB",
    "status": "pending",
    "payment_method": "UPI-QR",
    "amount": 500,
    "utr_number": "123456789012",
    "phone_number": "9876543210",
    "particular": "Deposit",
    "created_at": "2026-02-26T10:30:00.000Z",
    "wallet": {
      "wallet_number": "1234567890123456",
      "user_name": "John Doe",
      "message": "Wallet created on first deposit"
    }
  }
}
```

**Response (Subsequent Transaction):**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction_id": "TXN1234567890CD",
    "status": "pending",
    "payment_method": "UPI-QR",
    "amount": 1000,
    "utr_number": "987654321098",
    "phone_number": "9876543210",
    "particular": "Withdraw",
    "created_at": "2026-02-26T10:35:00.000Z"
  }
}
```

#### GET `/api/transaction/list`
Get user transactions

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50)
- `status` (optional): Filter by status (pending, received, rejected)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "document-id",
      "user_id": "user-id",
      "transaction_id": "TXN1234567890AB",
      "payment_method": "UPI-QR",
      "amount": 500,
      "utr_number": "123456789012",
      "phone_number": "9876543210",
      "particular": "Deposit",
      "status": "pending",
      "created_at": "2026-02-26T10:30:00.000Z",
      "updated_at": "2026-02-26T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET `/api/transaction/details/:transaction_id`
Get transaction details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "document-id",
    "user_id": "user-id",
    "transaction_id": "TXN1234567890AB",
    "payment_method": "UPI-QR",
    "amount": 500,
    "utr_number": "123456789012",
    "phone_number": "9876543210",
    "particular": "Deposit",
    "status": "pending",
    "created_at": "2026-02-26T10:30:00.000Z",
    "updated_at": "2026-02-26T10:30:00.000Z"
  }
}
```

#### PUT `/api/transaction/status/:transaction_id`
Update transaction status (Admin function)

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "received"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction status updated to received",
  "data": {
    "transaction_id": "TXN1234567890AB",
    "status": "received",
    "updated_at": "2026-02-26T10:40:00.000Z",
    "wallet_update": {
      "new_balance": 500,
      "message": "₹500 added to wallet successfully"
    }
  }
}
```

#### GET `/api/transaction/wallet`
Get wallet details

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (User without transactions):**
```json
{
  "success": true,
  "data": {
    "wallet_number": "0000000000000000",
    "balance": 0,
    "total_deposited": 0,
    "user_name": "User",
    "is_active": false,
    "expiry": "00",
    "message": "Default wallet - Make a deposit to activate"
  }
}
```

**Response (User with active wallet):**
```json
{
  "success": true,
  "data": {
    "wallet_number": "1234567890123456",
    "balance": 500,
    "total_deposited": 500,
    "user_name": "John Doe",
    "is_active": true,
    "expiry": "00"
  }
}
```

#### GET `/api/transaction/wallet/balance`
Get wallet balance only

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (User without transactions):**
```json
{
  "success": true,
  "data": {
    "balance": 0,
    "wallet_number": "0000000000000000",
    "expiry": "00",
    "user_name": "Jane Smith",
    "message": "Default wallet - Make a deposit to activate"
  }
}
```

**Response (User with active wallet):**
```json
{
  "success": true,
  "data": {
    "balance": 500,
    "wallet_number": "1234567890123456",
    "expiry": "00"
  }
}
```

### Health Check Routes

#### GET `/health`
Server health status

#### GET `/firebase-status`
Firebase connection status

## 🔥 Firebase Collections

### Users Collection Structure
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "9637999542",
  "password": "hashed-password",
  "device_info": { ... },
  "registration_timestamp": "2023-12-25T12:34:56.789Z",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "is_active": true,
  "profile_completed": false
}
```

### Sessions Collection Structure
```json
{
  "session_id": "32-char-string",
  "user_id": "firebase-document-id",
  "user_data": {
    "user_id": "firebase-document-id",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9637999542",
    "profile_completed": false
  },
  "device_info": { ... },
  "login_timestamp": "2023-12-25T12:34:56.789Z",
  "last_activity": "2023-12-25T13:45:67.890Z",
  "is_active": true,
  "expires_at": "2024-01-01T12:34:56.789Z",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Bank Details Collection Structure
```json
{
  "user_id": "firebase-document-id",
  "bank_name": "State Bank of India",
  "account_holder_name": "Rohit Vishwakarma",
  "account_number": "1234567890123456",
  "phone_number": "9637999542",
  "ifsc_code": "SBIN0001234",
  "is_verified": false,
  "created_at": "2025-02-25T12:34:56.789Z",
  "updated_at": "2025-02-25T12:34:56.789Z"
}
```

### UPI Details Collection Structure
```json
{
  "user_id": "firebase-document-id",
  "upi_name": "Rohit Vishwakarma",
  "phone_number": "9637999542",
  "upi_id": "rohitvishwakarma@paytm",
  "confirm_upi_id": "rohitvishwakarma@paytm",
  "is_verified": false,
  "created_at": "2025-02-25T12:34:56.789Z",
  "updated_at": "2025-02-25T12:34:56.789Z"
}
```

### Transactions Collection Structure
```json
{
  "user_id": "firebase-document-id",
  "payment_method": "UPI-QR",
  "amount": 500,
  "utr_number": "123456789012",
  "phone_number": "9876543210",
  "particular": "Deposit",
  "transaction_id": "TXN1234567890AB",
  "status": "pending",
  "created_at": "2026-02-26T10:30:00.000Z",
  "updated_at": "2026-02-26T10:30:00.000Z"
}
```

### Wallets Collection Structure
```json
{
  "user_id": "firebase-document-id",
  "wallet_number": "1234567890123456",
  "balance": 500,
  "total_deposited": 500,
  "user_name": "John Doe",
  "is_active": true,
  "created_at": "2026-02-26T10:30:00.000Z",
  "updated_at": "2026-02-26T10:30:00.000Z"
}
```

## **🔗 Wallet-User Relationship**

### **How Wallet is Linked to User:**

1. **Primary Link**: `user_id` field in wallet document
2. **User Identification**: 
   - `user_name` - Full name of the wallet owner for display purposes

### **API Responses Include User Details:**

#### **Active Wallet Response:**
```json
{
  "success": true,
  "data": {
    "wallet_number": "3965368581780817",
    "balance": 0,
    "total_deposited": 0,
    "user_name": "New User",
    "is_active": true,
    "expiry": "00"
  }
}
```

#### **Default Wallet Response:**
```json
{
  "success": true,
  "data": {
    "wallet_number": "0000000000000000",
    "balance": 0,
    "total_deposited": 0,
    "user_name": "Jane Smith",
    "is_active": false,
    "expiry": "00",
    "message": "Default wallet - Make a deposit to activate"
  }
}
```

## 🔧 Features

- ✅ Clean MVC architecture
- ✅ Firebase Firestore integration
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Session management
- ✅ Device tracking and fingerprinting
- ✅ Payment details management (Bank & UPI)
- ✅ Transaction management with UTR tracking
- ✅ Wallet system with auto-generation
- ✅ First deposit wallet creation
- ✅ Admin transaction status control
- ✅ Input validation
- ✅ Data security (masked sensitive info)
- ✅ User-specific data access
- ✅ Error handling
- ✅ Request logging
- ✅ WebSocket support

## 🌐 Server URLs

- **Express Server**: `http://localhost:3000`
- **WebSocket Server**: `ws://localhost:8080`
- **API Base URL**: `http://localhost:3000/api`

## 📱 Usage Example

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9637999542",
    "password": "password123",
    "device_info": {
      "app_version": "1.0.0",
      "platform": "Android"
    }
  }'

# Login with phone
curl -X POST http://localhost:3000/api/auth/login-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9637999542",
    "password": "password123"
  }'

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"session_id": "<session_id>"}'
```
