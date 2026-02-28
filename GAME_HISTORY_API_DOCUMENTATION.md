# Game History API Documentation

## 🎮 Game History WebSocket API

### ✅ Overview
Real-time game history updates using WebSocket for multiple game types (30sec, 1min, 3min, 5min).

### ✅ WebSocket Connection
```
WebSocket URL: ws://localhost:8080/ws-game-history
Production: wss://your-domain.com:8080/ws-game-history
```

---

## 🔌 WebSocket Events

### ✅ 1. Connection Established
**Server → Client**
```json
{
  "event": "connection_established",
  "data": {
    "clientId": "client_abc123_1640736000000",
    "message": "Connected to Game History WebSocket",
    "available_game_types": ["30sec", "1min", "3min", "5min"]
  }
}
```

### ✅ 2. Authentication
**Client → Server**
```json
{
  "event": "authenticate",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Server → Client (Success)**
```json
{
  "event": "authentication_success",
  "data": {
    "userId": "BGqIl4idRmzst1Mo0EwV",
    "email": "user@example.com",
    "message": "Authentication successful"
  }
}
```

**Server → Client (Error)**
```json
{
  "event": "error",
  "data": {
    "message": "Authentication failed",
    "timestamp": "2026-02-28T06:00:00.000Z"
  }
}
```

### ✅ 3. Subscribe to Game History
**Client → Server**
```json
{
  "event": "subscribe_game",
  "data": {
    "game_type": "30sec"
  }
}
```

**Server → Client (Success)**
```json
{
  "event": "subscription_success",
  "data": {
    "game_type": "30sec",
    "message": "Subscribed to 30sec game history"
  }
}
```

### ✅ 4. Game History Update
**Server → Client**
```json
{
  "event": "game_history_update",
  "data": {
    "game_type": "30sec",
    "history": [
      {
        "period_id": "20260228001",
        "result": "green",
        "number": 2,
        "color": "#10B981",
        "big_small": "small",
        "timestamp": "2026-02-28T06:00:30Z",
        "is_completed": true
      },
      {
        "period_id": "20260228000",
        "result": "red",
        "number": 7,
        "color": "#EF4444",
        "big_small": "big",
        "timestamp": "2026-02-28T05:59:30Z",
        "is_completed": true
      }
    ],
    "statistics": {
      "total_periods": 150,
      "green_count": 58,
      "red_count": 72,
      "violet_count": 20,
      "green_percentage": 38.67,
      "red_percentage": 48.00,
      "violet_percentage": 13.33
    },
    "new_period": {
      "period_id": "20260228001",
      "result": "green",
      "number": 2,
      "color": "#10B981",
      "big_small": "small",
      "timestamp": "2026-02-28T06:00:30Z",
      "is_completed": true
    }
  }
}
```

### ✅ 5. Get Game History (Manual Request)
**Client → Server**
```json
{
  "event": "get_game_history",
  "data": {
    "game_type": "1min"
  }
}
```

**Server → Client**
```json
{
  "event": "game_history_update",
  "data": {
    "game_type": "1min",
    "history": [...],
    "statistics": {...}
  }
}
```

### ✅ 6. Unsubscribe from Game
**Client → Server**
```json
{
  "event": "unsubscribe_game",
  "data": {
    "game_type": "30sec"
  }
}
```

**Server → Client**
```json
{
  "event": "unsubscription_success",
  "data": {
    "game_type": "30sec",
    "message": "Unsubscribed from 30sec game history"
  }
}
```

---

## 🌐 REST API Endpoints

### ✅ Public Endpoints (No Authentication Required)

#### **Get Game History**
```
GET /api/game/history/:game_type?limit=100
```

**Response:**
```json
{
  "success": true,
  "message": "Game history retrieved successfully",
  "data": {
    "game_type": "30sec",
    "history": [
      {
        "period_id": "20260228001",
        "result": "green",
        "number": 2,
        "color": "#10B981",
        "big_small": "small",
        "timestamp": "2026-02-28T06:00:30Z",
        "is_completed": true
      }
    ],
    "statistics": {
      "total_periods": 100,
      "green_count": 38,
      "red_count": 48,
      "violet_count": 14,
      "green_percentage": 38.00,
      "red_percentage": 48.00,
      "violet_percentage": 14.00
    },
    "total_records": 100
  }
}
```

#### **Get Latest Period**
```
GET /api/game/latest/:game_type
```

#### **Get Current Period Info**
```
GET /api/game/current/:game_type
```

**Response:**
```json
{
  "success": true,
  "message": "Current period info retrieved successfully",
  "data": {
    "game_type": "30sec",
    "current_period_id": "20260228002",
    "latest_completed_period": {
      "period_id": "20260228001",
      "result": "green",
      "number": 2,
      "color": "#10B981",
      "big_small": "small",
      "timestamp": "2026-02-28T06:00:30Z",
      "is_completed": true
    },
    "time_until_next_period": 15000,
    "current_period_time": 15000,
    "period_duration": 30000,
    "next_period_time": "2026-02-28T06:01:00.000Z"
  }
}
```

#### **Get All Game Statistics**
```
GET /api/game/statistics/all
```

**Response:**
```json
{
  "success": true,
  "message": "All game statistics retrieved successfully",
  "data": {
    "30sec": {
      "total_periods": 150,
      "green_count": 58,
      "red_count": 72,
      "violet_count": 20,
      "green_percentage": 38.67,
      "red_percentage": 48.00,
      "violet_percentage": 13.33
    },
    "1min": {...},
    "3min": {...},
    "5min": {...}
  }
}
```

---

### ✅ Protected Endpoints (Authentication Required)

#### **Create Game Period**
```
POST /api/game/period
Authorization: Bearer <jwt_token>
Content-Type: application/json

Body:
{
  "game_type": "30sec",
  "number": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Game period created successfully",
  "data": {
    "game_type": "30sec",
    "period_id": "20260228002",
    "number": 2,
    "color": "#10B981",
    "result": "green",
    "big_small": "small",
    "timestamp": "2026-02-28T06:01:00.000Z",
    "is_completed": true
  }
}
```

---

### ✅ Admin Only Endpoints

#### **Update Game Period**
```
PUT /api/game/period/:game_type/:period_id
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

Body:
{
  "number": 5,
  "color": "#8B5CF6",
  "result": "violet",
  "big_small": "big"
}
```

#### **Delete Game Period**
```
DELETE /api/game/period/:game_type/:period_id
Authorization: Bearer <admin_jwt_token>
```

---

## 🎯 Game Types and Rules

### ✅ Supported Game Types
- **30sec** - Period every 30 seconds
- **1min** - Period every 1 minute
- **3min** - Period every 3 minutes
- **5min** - Period every 5 minutes

### ✅ Number to Result Mapping
```
0 → violet, #8B5CF6, small
1 → green, #10B981, small
2 → green, #10B981, small
3 → green, #10B981, small
4 → green, #10B981, small
5 → violet, #8B5CF6, big
6 → red, #EF4444, big
7 → red, #EF4444, big
8 → red, #EF4444, big
9 → red, #EF4444, big
```

### ✅ Period ID Format
```
Format: YYYYMMDDDNNN
Example: 20260228001
- YYYY: Year (2026)
- MM: Month (02)
- DD: Day (28)
- NNN: Period number (001)
```

---

## 📱 Client Implementation Examples

### ✅ JavaScript WebSocket Client
```javascript
class GameHistoryClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.authenticated = false;
    this.subscriptions = new Set();
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8080/ws-game-history');

    this.ws.onopen = () => {
      console.log('Connected to Game History WebSocket');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      // Implement reconnection logic
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    const { event, data } = message;

    switch (event) {
      case 'connection_established':
        this.clientId = data.clientId;
        console.log('Client ID:', this.clientId);
        break;

      case 'authentication_success':
        this.authenticated = true;
        console.log('Authenticated as:', data.userId);
        break;

      case 'game_history_update':
        this.onGameHistoryUpdate(data);
        break;

      case 'error':
        console.error('Server error:', data.message);
        break;
    }
  }

  authenticate(token) {
    this.send({
      event: 'authenticate',
      data: { token }
    });
  }

  subscribeToGame(gameType) {
    if (!this.authenticated) {
      console.error('Must authenticate first');
      return;
    }

    this.send({
      event: 'subscribe_game',
      data: { game_type: gameType }
    });

    this.subscriptions.add(gameType);
  }

  unsubscribeFromGame(gameType) {
    this.send({
      event: 'unsubscribe_game',
      data: { game_type: gameType }
    });

    this.subscriptions.delete(gameType);
  }

  getGameHistory(gameType) {
    this.send({
      event: 'get_game_history',
      data: { game_type: gameType }
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onGameHistoryUpdate(data) {
    console.log(`Game history update for ${data.game_type}:`, data);
    
    // Update UI with new history and statistics
    this.updateUI(data);
  }

  updateUI(data) {
    // Implement your UI update logic here
    // Update history list, statistics, etc.
  }
}

// Usage
const client = new GameHistoryClient();
client.connect();

// After connection, authenticate and subscribe
client.ws.onopen = () => {
  // Authenticate with your JWT token
  client.authenticate('your_jwt_token_here');
  
  // Subscribe to game types
  client.subscribeToGame('30sec');
  client.subscribeToGame('1min');
};
```

### ✅ Flutter WebSocket Client
```dart
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';

class GameHistoryWebSocket {
  late WebSocketChannel _channel;
  String? _clientId;
  bool _authenticated = false;
  final Set<String> _subscriptions = {};

  Future<void> connect() async {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('ws://localhost:8080/ws-game-history'),
      );

      _channel.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onError: (error) {
          print('WebSocket error: $error');
        },
        onDone: () {
          print('WebSocket disconnected');
          // Implement reconnection logic
        },
      );

      print('Connected to Game History WebSocket');
    } catch (e) {
      print('Failed to connect: $e');
    }
  }

  void _handleMessage(String message) {
    final data = json.decode(message);
    final event = data['event'];
    final eventData = data['data'];

    switch (event) {
      case 'connection_established':
        _clientId = eventData['clientId'];
        print('Client ID: $_clientId');
        break;

      case 'authentication_success':
        _authenticated = true;
        print('Authenticated as: ${eventData['userId']}');
        break;

      case 'game_history_update':
        _onGameHistoryUpdate(eventData);
        break;

      case 'error':
        print('Server error: ${eventData['message']}');
        break;
    }
  }

  void authenticate(String token) {
    _send({
      'event': 'authenticate',
      'data': {'token': token},
    });
  }

  void subscribeToGame(String gameType) {
    if (!_authenticated) {
      print('Must authenticate first');
      return;
    }

    _send({
      'event': 'subscribe_game',
      'data': {'game_type': gameType},
    });

    _subscriptions.add(gameType);
  }

  void unsubscribeFromGame(String gameType) {
    _send({
      'event': 'unsubscribe_game',
      'data': {'game_type': gameType},
    });

    _subscriptions.remove(gameType);
  }

  void getGameHistory(String gameType) {
    _send({
      'event': 'get_game_history',
      'data': {'game_type': gameType},
    });
  }

  void _send(Map<String, dynamic> message) {
    if (_channel != null) {
      _channel.sink.add(json.encode(message));
    }
  }

  void _onGameHistoryUpdate(Map<String, dynamic> data) {
    print('Game history update for ${data['game_type']}: $data');
    
    // Update UI with new history and statistics
    _updateUI(data);
  }

  void _updateUI(Map<String, dynamic> data) {
    // Implement your UI update logic here
    // Update history list, statistics, etc.
  }

  void disconnect() {
    _channel.sink.close();
  }
}

// Usage
final wsClient = GameHistoryWebSocket();
await wsClient.connect();

// After connection, authenticate and subscribe
wsClient.authenticate('your_jwt_token_here');
wsClient.subscribeToGame('30sec');
wsClient.subscribeToGame('1min');
```

---

## 🧪 Testing the APIs

### ✅ Test WebSocket Connection
```javascript
// Node.js test client
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080/ws-game-history');

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  // Authenticate
  ws.send(JSON.stringify({
    event: 'authenticate',
    data: {
      token: 'your_jwt_token_here'
    }
  }));
  
  // Subscribe to game
  ws.send(JSON.stringify({
    event: 'subscribe_game',
    data: {
      game_type: '30sec'
    }
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});
```

### ✅ Test REST API
```bash
# Get game history
curl -X GET "http://localhost:4001/api/game/history/30sec?limit=10"

# Get current period info
curl -X GET "http://localhost:4001/api/game/current/30sec"

# Get all statistics
curl -X GET "http://localhost:4001/api/game/statistics/all"

# Create game period (authenticated)
curl -X POST "http://localhost:4001/api/game/period" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"game_type": "30sec", "number": 2}'
```

---

## 📊 WebSocket Server Stats

### ✅ Get Server Statistics
You can get WebSocket server stats by accessing the instance:

```javascript
// In your server code
const stats = gameHistoryWS.getStats();
console.log(stats);

// Output:
{
  total_connections: 150,
  authenticated_connections: 142,
  game_subscriptions: {
    "30sec": 45,
    "1min": 38,
    "3min": 32,
    "5min": 27
  }
}
```

---

## 🔧 Environment Variables

```env
# WebSocket port (optional, defaults to 8080)
WS_PORT=8080

# JWT secret (required for authentication)
JWT_SECRET=your_jwt_secret_here

# Firebase service account (required)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

## 🎯 Best Practices

### ✅ WebSocket Best Practices
- Always authenticate before subscribing
- Handle connection errors gracefully
- Implement reconnection logic
- Unsubscribe from games when not needed
- Close connection when app closes

### ✅ Performance Tips
- Limit history requests to reasonable amounts
- Use pagination for large history sets
- Cache statistics on client side
- Batch multiple game subscriptions

### ✅ Security Considerations
- Always validate JWT tokens
- Use HTTPS/WSS in production
- Rate limit WebSocket connections
- Validate all incoming data

---

**This Game History API provides real-time updates for multiple game types with comprehensive WebSocket and REST API support!** 🎮✨
