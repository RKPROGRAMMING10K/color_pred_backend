# Advanced Betting API Documentation

## 🎲 Advanced Betting System

### ✅ Overview
Complete betting system with wallet integration, automatic win/loss calculation, and comprehensive betting history tracking.

---

## 🔌 API Endpoints

### ✅ 1. Place Bet
**POST** `/api/advanced-bet/place`

#### **Number Bet Request:**
```json
{
  "gameType": "30sec",
  "period": "202603001",
  "betType": "number",
  "betValue": "5",
  "amount": 100,
  "quantity": 5,
  "multiplier": "X5",
  "totalBetAmount": 500,
  "userId": "user123",
  "timestamp": "2026-03-03T10:30:00.000Z"
}
```

#### **Color Bet Request:**
```json
{
  "gameType": "1min",
  "period": "202603002",
  "betType": "color",
  "betValue": "red",
  "amount": 10,
  "quantity": 1,
  "multiplier": "X1",
  "totalBetAmount": 10,
  "userId": "user123",
  "timestamp": "2026-03-03T10:31:00.000Z"
}
```

#### **Big/Small Bet Request:**
```json
{
  "gameType": "3min",
  "period": "202603003",
  "betType": "size",
  "betValue": "big",
  "amount": 1000,
  "quantity": 10,
  "multiplier": "X10",
  "totalBetAmount": 10000,
  "userId": "user123",
  "timestamp": "2026-03-03T10:33:00.000Z"
}
```

#### **Response:**
```json
{
  "success": true,
  "message": "Bet placed successfully",
  "data": {
    "betId": "bet123",
    "gameType": "30sec",
    "period": "202603001",
    "betType": "number",
    "betValue": "5",
    "amount": 100,
    "quantity": 5,
    "multiplier": "X5",
    "totalBetAmount": 500,
    "userId": "user123",
    "status": "pending",
    "timestamp": "2026-03-03T10:30:00.000Z"
  }
}
```

---

### ✅ 2. Process Bets for Period
**POST** `/api/advanced-bet/process`

#### **Request Body:**
```json
{
  "gameType": "30sec",
  "period": "202603001",
  "gameResult": {
    "number": 7,
    "color": "green",
    "big_small": "Small"
  }
}
```

#### **Response:**
```json
{
  "success": true,
  "message": "Bets processed successfully",
  "data": {
    "processedBets": [
      {
        "betId": "bet123",
        "userId": "user123",
        "betType": "number",
        "betValue": "7",
        "totalBetAmount": 500,
        "status": "won",
        "resultAmount": 2500,
        "isWin": true
      },
      {
        "betId": "bet124",
        "userId": "user456",
        "betType": "color",
        "betValue": "red",
        "totalBetAmount": 100,
        "status": "lost",
        "resultAmount": 0,
        "isWin": false
      }
    ],
    "totalPayout": 2500,
    "totalBets": 2
  }
}
```

---

### ✅ 3. Get User Betting History
**GET** `/api/advanced-bet/history/:userId`

#### **Query Parameters:**
```
?gameType=30sec  // Optional: Filter by game type
?limit=50         // Optional: Limit number of results
```

#### **Response:**
```json
{
  "success": true,
  "message": "Betting history retrieved successfully",
  "data": {
    "bets": [
      {
        "betId": "bet123",
        "gameType": "30sec",
        "period": "202603001",
        "betType": "number",
        "betValue": "5",
        "amount": 100,
        "quantity": 5,
        "multiplier": "X5",
        "totalBetAmount": 500,
        "status": "lost",
        "resultAmount": 0,
        "timestamp": "2026-03-03T10:30:00.000Z",
        "processedAt": "2026-03-03T10:30:30.000Z"
      }
    ],
    "totalBets": 1,
    "gameType": "30sec"
  }
}
```

---

### ✅ 4. Get User Winning History
**GET** `/api/advanced-bet/winnings/:userId`

#### **Query Parameters:**
```
?gameType=30sec  // Optional: Filter by game type
?limit=50         // Optional: Limit number of results
```

#### **Response:**
```json
{
  "success": true,
  "message": "Winning history retrieved successfully",
  "data": {
    "winnings": [
      {
        "winId": "win123",
        "userId": "user123",
        "gameType": "30sec",
        "period": "202603001",
        "betType": "number",
        "betValue": "7",
        "betAmount": 500,
        "winAmount": 2500,
        "multiplier": "X5",
        "gameResult": {
          "number": 7,
          "color": "green",
          "big_small": "Small"
        },
        "timestamp": "2026-03-03T10:30:30.000Z"
      }
    ],
    "totalWinnings": 1,
    "totalWinAmount": 2500,
    "gameType": "30sec"
  }
}
```

---

## 📊 Database Structure

### ✅ Advanced Bets Collection:
```
advanced_bets/{bet_id}/
├── gameType: string
├── period: string
├── betType: string (number/color/size)
├── betValue: string
├── amount: number
├── quantity: number
├── multiplier: string
├── totalBetAmount: number
├── userId: string
├── status: string (pending/won/lost)
├── resultAmount: number
├── timestamp: timestamp
└── processedAt: timestamp
```

### ✅ User Wallets Collection:
```
user_wallets/{user_id}/
├── balance: number
├── lastUpdated: timestamp
```

### ✅ Wallet Transactions Collection:
```
wallet_transactions/{transaction_id}/
├── userId: string
├── type: string (bet/win/loss)
├── amount: number
├── balance: number
├── description: string
├── betId: string
├── timestamp: timestamp
```

### ✅ Winning History Collection:
```
winning_history/{win_id}/
├── userId: string
├── gameType: string
├── period: string
├── betType: string
├── betValue: string
├── betAmount: number
├── winAmount: number
├── multiplier: string
├── gameResult: object
├── timestamp: timestamp
```

---

## 🎯 Business Logic

### ✅ Bet Validation:
- **Required Fields**: gameType, period, betType, betValue, amount, quantity, multiplier, totalBetAmount, userId
- **Valid Bet Types**: number, color, size
- **Valid Game Types**: 30sec, 1min, 3min, 5min
- **Balance Check**: Sufficient balance required
- **Duplicate Check**: One bet per user per period

### ✅ Win Calculation Logic:
```javascript
// Number Bet
if (betType === 'number') {
  return betValue === gameResult.number;
}

// Color Bet
if (betType === 'color') {
  return betValue.toLowerCase() === gameResult.color.toLowerCase();
}

// Size Bet
if (betType === 'size') {
  return betValue.toLowerCase() === gameResult.big_small.toLowerCase();
}
```

### ✅ Payout Calculation:
```
Win Amount = Total Bet Amount × Multiplier
- Number Bet: X5 multiplier
- Color Bet: X1 multiplier
- Size Bet: X10 multiplier
```

---

## 💰 Wallet Operations

### ✅ Automatic Balance Management:
1. **Place Bet**: Deduct totalBetAmount from wallet
2. **Win**: Add winAmount to wallet
3. **Loss**: No balance change (already deducted)

### ✅ Transaction Recording:
- Every balance change creates a transaction record
- Transaction types: bet, win, loss
- Includes betId for reference

---

## 🎮 Game Result Processing

### ✅ Example Scenario:
```
Game Result: 202603001, 7, Small, green

User Bet 1: 202603001, 7, Small, green
- Bet Type: number (7)
- Status: WIN
- Payout: 500 × X5 = 2500

User Bet 2: 202603001, 5, big, green/violet
- Bet Type: number (5)
- Status: LOSE
- Payout: 0

User Bet 3: 202603001, 7, Small, green
- Bet Type: size (Small)
- Status: WIN
- Payout: 1000 × X10 = 10000

User Bet 4: 202603001, 7, Small, green
- Bet Type: color (green)
- Status: WIN
- Payout: 100 × X1 = 100
```

---

## 📱 Client Implementation

### ✅ Flutter Example:
```dart
class AdvancedBettingService {
  static Future<void> placeBet({
    required String gameType,
    required String period,
    required String betType,
    required String betValue,
    required double amount,
    required int quantity,
    required String multiplier,
    required String userId,
  }) async {
    try {
      final totalBetAmount = amount * quantity;
      
      final response = await http.post(
        Uri.parse('https://your-api.com/api/advanced-bet/place'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'gameType': gameType,
          'period': period,
          'betType': betType,
          'betValue': betValue,
          'amount': amount,
          'quantity': quantity,
          'multiplier': multiplier,
          'totalBetAmount': totalBetAmount,
          'userId': userId,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      final data = json.decode(response.body);
      if (data['success']) {
        print('✅ Bet placed successfully');
        print('Bet ID: ${data['data']['betId']}');
      } else {
        print('❌ Failed to place bet: ${data['message']}');
      }
    } catch (e) {
      print('❌ Error: $e');
    }
  }

  static Future<List<dynamic>> getBettingHistory(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('https://your-api.com/api/advanced-bet/history/$userId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      
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

### ✅ Place Number Bet:
```bash
curl -X POST https://your-api.com/api/advanced-bet/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "30sec",
    "period": "202603001",
    "betType": "number",
    "betValue": "5",
    "amount": 100,
    "quantity": 5,
    "multiplier": "X5",
    "totalBetAmount": 500,
    "userId": "user123"
  }'
```

### ✅ Process Game Result:
```bash
curl -X POST https://your-api.com/api/advanced-bet/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "30sec",
    "period": "202603001",
    "gameResult": {
      "number": 5,
      "color": "red",
      "big_small": "Small"
    }
  }'
```

---

## 🔐 Security Features

### ✅ Transaction Safety:
- **Atomic Operations**: All wallet updates use Firestore transactions
- **Balance Validation**: Double-check balance before deduction
- **Duplicate Prevention**: One bet per user per period
- **Audit Trail**: Complete transaction history

### ✅ Data Integrity:
- **Timestamp Tracking**: All operations timestamped
- **Status Updates**: Bet status automatically updated
- **Winning Records**: Separate winning history collection
- **Error Handling**: Comprehensive error management

---

**Complete advanced betting system with automatic wallet management and win/loss calculation!** 🎲✨
