const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

class GameHistoryWebSocket {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, userId, subscriptions }
    this.gameSubscriptions = new Map(); // gameType -> Set of clientIds
    this.init();
  }

  init() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({ 
      port: process.env.WS_PORT || 8080,
      path: '/ws-game-history'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('🎮 Game History WebSocket Server started on port:', process.env.WS_PORT || 8080);
  }

  async handleConnection(ws, req) {
    const clientId = this.generateClientId();
    
    console.log('🔗 New WebSocket connection:', clientId);

    // Store client connection
    this.clients.set(clientId, {
      ws: ws,
      userId: null,
      authenticated: false,
      subscriptions: new Set()
    });

    // Handle messages from client
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(clientId, data);
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
        this.sendError(clientId, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    // Handle connection error
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    this.sendMessage(clientId, {
      event: 'connection_established',
      data: {
        clientId: clientId,
        message: 'Connected to Game History WebSocket',
        available_game_types: ['30sec', '1min', '3min', '5min']
      }
    });
  }

  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { event, data } = message;

    switch (event) {
      case 'authenticate':
        await this.handleAuthentication(clientId, data);
        break;
      
      case 'subscribe_game':
        await this.handleGameSubscription(clientId, data);
        break;
      
      case 'unsubscribe_game':
        await this.handleGameUnsubscription(clientId, data);
        break;
      
      case 'get_game_history':
        await this.handleGetGameHistory(clientId, data);
        break;
      
      default:
        this.sendError(clientId, 'Unknown event: ' + event);
    }
  }

  async handleAuthentication(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { token } = data;
      
      if (!token) {
        return this.sendError(clientId, 'Authentication token required');
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Update client with user info
      client.userId = decoded.userId;
      client.authenticated = true;
      client.email = decoded.email;

      console.log('✅ Client authenticated:', clientId, 'User:', decoded.userId);

      this.sendMessage(clientId, {
        event: 'authentication_success',
        data: {
          userId: decoded.userId,
          email: decoded.email,
          message: 'Authentication successful'
        }
      });

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      this.sendError(clientId, 'Authentication failed');
    }
  }

  async handleGameSubscription(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      return this.sendError(clientId, 'Authentication required');
    }

    const { game_type } = data;
    
    if (!game_type || !['30sec', '1min', '3min', '5min'].includes(game_type)) {
      return this.sendError(clientId, 'Invalid game_type. Must be one of: 30sec, 1min, 3min, 5min');
    }

    // Add subscription
    client.subscriptions.add(game_type);
    
    // Update game subscriptions map
    if (!this.gameSubscriptions.has(game_type)) {
      this.gameSubscriptions.set(game_type, new Set());
    }
    this.gameSubscriptions.get(game_type).add(clientId);

    console.log('📊 Client subscribed to game:', clientId, 'Game:', game_type);

    // Send current game history for this game type
    const gameHistory = await this.getGameHistory(game_type);
    
    this.sendMessage(clientId, {
      event: 'game_history_update',
      data: {
        game_type: game_type,
        history: gameHistory.history,
        statistics: gameHistory.statistics
      }
    });

    this.sendMessage(clientId, {
      event: 'subscription_success',
      data: {
        game_type: game_type,
        message: `Subscribed to ${game_type} game history`
      }
    });
  }

  async handleGameUnsubscription(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { game_type } = data;
    
    if (!game_type) {
      return this.sendError(clientId, 'game_type required');
    }

    // Remove subscription
    client.subscriptions.delete(game_type);
    
    // Update game subscriptions map
    if (this.gameSubscriptions.has(game_type)) {
      this.gameSubscriptions.get(game_type).delete(clientId);
      
      // Clean up empty subscription sets
      if (this.gameSubscriptions.get(game_type).size === 0) {
        this.gameSubscriptions.delete(game_type);
      }
    }

    console.log('📊 Client unsubscribed from game:', clientId, 'Game:', game_type);

    this.sendMessage(clientId, {
      event: 'unsubscription_success',
      data: {
        game_type: game_type,
        message: `Unsubscribed from ${game_type} game history`
      }
    });
  }

  async handleGetGameHistory(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      return this.sendError(clientId, 'Authentication required');
    }

    const { game_type } = data;
    
    if (!game_type || !['30sec', '1min', '3min', '5min'].includes(game_type)) {
      return this.sendError(clientId, 'Invalid game_type. Must be one of: 30sec, 1min, 3min, 5min');
    }

    const gameHistory = await this.getGameHistory(game_type);
    
    this.sendMessage(clientId, {
      event: 'game_history_update',
      data: {
        game_type: game_type,
        history: gameHistory.history,
        statistics: gameHistory.statistics
      }
    });
  }

  async getGameHistory(gameType) {
    try {
      const db = admin.firestore();
      const historyRef = db.collection('game_history')
        .doc(gameType)
        .collection('periods')
        .orderBy('timestamp', 'desc')
        .limit(100); // Get last 100 periods

      const snapshot = await historyRef.get();
      
      const history = [];
      let greenCount = 0, redCount = 0, violetCount = 0;

      snapshot.forEach(doc => {
        const period = doc.data();
        history.push({
          period_id: period.period_id,
          result: period.result,
          number: period.number,
          color: period.color,
          timestamp: period.timestamp,
          is_completed: period.is_completed || true
        });

        // Count statistics
        if (period.result === 'green') greenCount++;
        else if (period.result === 'red') redCount++;
        else if (period.result === 'violet') violetCount++;
      });

      const totalPeriods = history.length;
      const statistics = {
        total_periods: totalPeriods,
        green_count: greenCount,
        red_count: redCount,
        violet_count: violetCount,
        green_percentage: totalPeriods > 0 ? (greenCount / totalPeriods * 100).toFixed(2) : 0,
        red_percentage: totalPeriods > 0 ? (redCount / totalPeriods * 100).toFixed(2) : 0,
        violet_percentage: totalPeriods > 0 ? (violetCount / totalPeriods * 100).toFixed(2) : 0
      };

      return { history, statistics };

    } catch (error) {
      console.error('❌ Error getting game history:', error);
      return { history: [], statistics: this.getEmptyStatistics() };
    }
  }

  getEmptyStatistics() {
    return {
      total_periods: 0,
      green_count: 0,
      red_count: 0,
      violet_count: 0,
      green_percentage: 0,
      red_percentage: 0,
      violet_percentage: 0
    };
  }

  // Public method to broadcast game history updates
  async broadcastGameHistoryUpdate(gameType, newPeriodData) {
    if (!this.gameSubscriptions.has(gameType)) {
      console.log('ℹ️ No subscribers for game type:', gameType);
      return;
    }

    const subscribers = this.gameSubscriptions.get(gameType);
    const gameHistory = await this.getGameHistory(gameType);

    console.log('📡 Broadcasting game history update for:', gameType, 'to', subscribers.size, 'clients');

    subscribers.forEach(clientId => {
      this.sendMessage(clientId, {
        event: 'game_history_update',
        data: {
          game_type: gameType,
          history: gameHistory.history,
          statistics: gameHistory.statistics,
          new_period: newPeriodData // Include the new period data
        }
      });
    });
  }

  sendMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Error sending message to client:', clientId, error);
    }
  }

  sendError(clientId, errorMessage) {
    this.sendMessage(clientId, {
      event: 'error',
      data: {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log('🔌 Client disconnected:', clientId, 'User:', client.userId || 'unauthenticated');

    // Remove from all game subscriptions
    client.subscriptions.forEach(gameType => {
      if (this.gameSubscriptions.has(gameType)) {
        this.gameSubscriptions.get(gameType).delete(clientId);
        
        // Clean up empty subscription sets
        if (this.gameSubscriptions.get(gameType).size === 0) {
          this.gameSubscriptions.delete(gameType);
        }
      }
    });

    // Remove client
    this.clients.delete(clientId);
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Get server stats
  getStats() {
    return {
      total_connections: this.clients.size,
      authenticated_connections: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      game_subscriptions: {
        '30sec': this.gameSubscriptions.get('30sec')?.size || 0,
        '1min': this.gameSubscriptions.get('1min')?.size || 0,
        '3min': this.gameSubscriptions.get('3min')?.size || 0,
        '5min': this.gameSubscriptions.get('5min')?.size || 0
      }
    };
  }
}

module.exports = GameHistoryWebSocket;
