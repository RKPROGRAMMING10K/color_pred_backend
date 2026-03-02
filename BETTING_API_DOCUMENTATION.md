# Betting API Documentation

## 💰 Betting System API

### ✅ Overview
Complete betting system for game predictions with real-time processing and payout calculations.

---

## 🔌 API Endpoints

### ✅ 1. Create Bet
**POST** `/api/bet/create`

#### **Request Body:**
```json
{
  "user_id": "user123",
  "game_type": "30sec",
  "period_id": "20260228001",
  "quantity": 2,
  "amount": 100,
  "color": "red"
}
```

#### **Response:**
```json
{
  "success": true,
  "message": "Bet created successfully",
  "data": {
    "bet_id": "bet123",
    "user_id": "user123",
    "game_type": "30sec",
    "period_id": "20260228001",
    "quantity": 2,
    "amount": 100,
    "color": "red",
    "status": "pending",
    "created_at": "2026-03-02T10:30:00.000Z"
  }
}
```

---

### ✅ 2. Get User Bets
**GET** `/api/bet/user/:user_id`

#### **Query Parameters:**
```
?game_type=30sec  // Optional: Filter by game type
?limit=50         // Optional: Limit number of results
```

#### **Response:**
```json
{
  "success": true,
  "message": "User bets retrieved successfully",
  "data": {
    "bets": [
      {
        "bet_id": "bet123",
        "user_id": "user123",
        "game_type": "30sec",
        "period_id": "20260228001",
        "quantity": 2,
        "amount": 100,
        "color": "red",
        "status": "pending",
        "payout": 0,
        "created_at": "2026-03-02T10:30:00.000Z"
      }
    ],
    "total_count": 1,
    "game_type": "30sec"
  }
}
```

---

### ✅ 3. Get Period Bets
**GET** `/api/bet/period/:game_type/:period_id`

#### **Response:**
```json
{
  "success": true,
  "message": "Period bets retrieved successfully",
  "data": {
    "bets": [
      {
        "bet_id": "bet123",
        "user_id": "user123",
        "game_type": "30sec",
        "period_id": "20260228001",
        "quantity": 2,
        "amount": 100,
        "color": "red",
        "status": "pending",
        "payout": 0
      }
    ],
    "total_bets": 1,
    "total_amount": 200,
    "game_type": "30sec",
    "period_id": "20260228001"
  }
}
```

---

### ✅ 4. Get Betting Statistics
**GET** `/api/bet/statistics/:user_id`

#### **Query Parameters:**
```
?game_type=30sec  // Optional: Filter by game type
```

#### **Response:**
```json
{
  "success": true,
  "message": "Betting statistics retrieved successfully",
  "data": {
    "total_bets": 10,
    "total_amount": 5000,
    "total_won": 3,
    "total_lost": 7,
    "total_payout": 1200,
    "win_rate": "30.00",
    "user_id": "user123",
    "game_type": "30sec"
  }
}
```

---

### ✅ 5. Process Game Result (Admin)
**POST** `/api/bet/process-result`

#### **Request Body:**
```json
{
  "game_type": "30sec",
  "period_id": "20260228001",
  "result": "red",
  "payout_multiplier": 2
}
```

#### **Response:**
```json
{
  "success": true,
  "message": "Game result processed successfully",
  "data": {
    "game_type": "30sec",
    "period_id": "20260228001",
    "result": "red",
    "payout_multiplier": 2,
    "total_bets": 5,
    "total_payout": 800,
    "updated_bets": [
      {
        "bet_id": "bet123",
        "user_id": "user123",
        "color": "red",
        "quantity": 2,
        "amount": 100,
        "status": "won",
        "payout": 400
      },
      {
        "bet_id": "bet124",
        "user_id": "user456",
        "color": "green",
        "quantity": 1,
        "amount": 50,
        "status": "lost",
        "payout": 0
      }
    ]
  }
}
```

---

### ✅ 6. Update Bet Status (Admin)
**PUT** `/api/bet/update/:bet_id`

#### **Request Body:**
```json
{
  "game_result": "red",
  "payout_amount": 400
}
```

---

### ✅ 7. Get All Bets (Admin)
**GET** `/api/bet/admin/all`

#### **Query Parameters:**
```
?game_type=30sec  // Optional: Filter by game type
?limit=100         // Optional: Limit results
?offset=0          // Optional: Pagination offset
```

---

## 📊 Database Structure

### ✅ Bets Collection:
```
bets/
├── {bet_id}
│   ├── user_id: string
│   ├── game_type: string
│   ├── period_id: string
│   ├── quantity: number
│   ├── amount: number
│   ├── color: string
│   ├── status: string (pending/won/lost)
│   ├── payout: number
│   ├── created_at: timestamp
│   └── updated_at: timestamp
```

---

## 🎯 Business Logic

### ✅ Bet Validation:
- **Required Fields**: user_id, game_type, period_id, quantity, amount, color
- **Valid Colors**: red, green, violet
- **Amount**: Must be > 0
- **Quantity**: Must be > 0
- **Duplicate Check**: One bet per user per period

### ✅ Payout Calculation:
```
Payout = (Amount × Quantity) × Multiplier
- Win: Full payout
- Loss: 0 payout
- Default Multiplier: 2x
```

### ✅ Status Flow:
```
pending → won/lost → payout calculated
```

---

## 🔐 Authentication

### ✅ Protected Routes:
- **Create Bet**: Requires authentication
- **User Statistics**: Requires authentication
- **Process Result**: Admin only
- **Update Status**: Admin only
- **All Bets**: Admin only

### ✅ Public Routes:
- **User Bets**: Public (for user history display)
- **Period Bets**: Public (for game statistics)

---

## 📱 Client Implementation

### ✅ Flutter Example:
```dart
class BettingService {
  static Future<void> placeBet({
    required String userId,
    required String gameType,
    required String periodId,
    required int quantity,
    required double amount,
    required String color,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('https://your-api.com/api/bet/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'user_id': userId,
          'game_type': gameType,
          'period_id': periodId,
          'quantity': quantity,
          'amount': amount,
          'color': color,
        }),
      );

      final data = json.decode(response.body);
      if (data['success']) {
        print('✅ Bet placed successfully');
        print('Bet ID: ${data['data']['bet_id']}');
      } else {
        print('❌ Failed to place bet: ${data['message']}');
      }
    } catch (e) {
      print('❌ Error: $e');
    }
  }

  static Future<List<dynamic>> getUserBets(String userId, {String? gameType}) async {
    try {
      String url = 'https://your-api.com/api/bet/user/$userId';
      if (gameType != null) {
        url += '?game_type=$gameType';
      }

      final response = await http.get(Uri.parse(url));
      final data = json.decode(response.body);
      
      if (data['success']) {
        return data['data']['bets'];
      } else {
        throw Exception(data['message']);
      }
    } catch (e) {
      print('❌ Error: $e');
      rethrow;
    }
  }
}
```

---

## 🚀 Testing

### ✅ Create Bet:
```bash
curl -X POST https://your-api.com/api/bet/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user123",
    "game_type": "30sec",
    "period_id": "20260228001",
    "quantity": 2,
    "amount": 100,
    "color": "red"
  }'
```

### ✅ Get User Bets:
```bash
curl https://your-api.com/api/bet/user/user123?game_type=30sec&limit=10
```

### ✅ Process Game Result:
```bash
curl -X POST https://your-api.com/api/bet/process-result \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "game_type": "30sec",
    "period_id": "20260228001",
    "result": "red",
    "payout_multiplier": 2
  }'
```

---

**Complete betting system with real-time processing and automatic payouts!** 💰✨
