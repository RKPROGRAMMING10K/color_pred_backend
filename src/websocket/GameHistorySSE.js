const express = require('express');

class GameHistorySSE {
  constructor() {
    this.clients = new Map(); // gameType -> Set of response objects
  }

  // Add SSE endpoint to your existing routes
  addSSEEndpoint(app) {
    // SSE endpoint for game history updates
    app.get('/api/game/sse/:game_type', (req, res) => {
      const { game_type } = req.params;
      
      // Validate game type
      const validGameTypes = ['30sec', '1min', '3min', '5min'];
      if (!validGameTypes.includes(game_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid game_type. Must be one of: ${validGameTypes.join(', ')}`
        });
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      console.log(`🔗 SSE client connected to ${game_type}`);

      // Add client to the game type subscription
      if (!this.clients.has(game_type)) {
        this.clients.set(game_type, new Set());
      }
      this.clients.get(game_type).add(res);

      // Send initial data
      this.sendToClient(res, {
        event: 'connected',
        data: {
          game_type: game_type,
          message: 'Connected to game history updates',
          timestamp: new Date().toISOString()
        }
      });

      // Send current game history
      this.sendCurrentHistory(game_type, res);

      // Handle client disconnect
      req.on('close', () => {
        console.log(`🔌 SSE client disconnected from ${game_type}`);
        if (this.clients.has(game_type)) {
          this.clients.get(game_type).delete(res);
          if (this.clients.get(game_type).size === 0) {
            this.clients.delete(game_type);
          }
        }
      });

      req.on('aborted', () => {
        console.log(`🔌 SSE client aborted from ${game_type}`);
        if (this.clients.has(game_type)) {
          this.clients.get(game_type).delete(res);
        }
      });
    });

    // Health check for SSE
    app.get('/api/game/sse-status', (req, res) => {
      const status = {};
      this.clients.forEach((clients, gameType) => {
        status[gameType] = clients.size;
      });

      res.json({
        success: true,
        data: {
          total_connections: Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.size, 0),
          connections_per_game: status
        }
      });
    });
  }

  async sendCurrentHistory(gameType, res) {
    try {
      const GameHistory = require('../models/GameHistory');
      const result = await GameHistory.getGameHistory(gameType, 50);
      
      this.sendToClient(res, {
        event: 'game_history_update',
        data: result.data
      });
    } catch (error) {
      console.error('❌ Error sending current history:', error);
    }
  }

  // Broadcast game history update to all SSE clients for a game type
  async broadcastGameHistoryUpdate(gameType, data) {
    if (!this.clients.has(gameType)) {
      console.log(`ℹ️ No SSE clients for game type: ${gameType}`);
      return;
    }

    const clients = this.clients.get(gameType);
    console.log(`📡 Broadcasting SSE update for ${gameType} to ${clients.size} clients`);

    const message = {
      event: 'game_history_update',
      data: {
        game_type: gameType,
        history: data.history,
        statistics: data.statistics,
        new_period: data,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all clients (handle disconnected clients)
    const disconnectedClients = [];
    clients.forEach(client => {
      try {
        this.sendToClient(client, message);
      } catch (error) {
        console.error('❌ Error sending to SSE client:', error);
        disconnectedClients.push(client);
      }
    });

    // Remove disconnected clients
    disconnectedClients.forEach(client => {
      clients.delete(client);
    });

    if (clients.size === 0) {
      this.clients.delete(gameType);
    }
  }

  sendToClient(res, message) {
    if (res.destroyed || res.writableEnded) {
      return;
    }

    try {
      res.write(`event: ${message.event}\n`);
      res.write(`data: ${JSON.stringify(message.data)}\n\n`);
    } catch (error) {
      console.error('❌ Error writing to SSE client:', error);
      throw error;
    }
  }

  // Get connection stats
  getStats() {
    const stats = {
      total_connections: 0,
      connections_per_game: {}
    };

    this.clients.forEach((clients, gameType) => {
      stats.connections_per_game[gameType] = clients.size;
      stats.total_connections += clients.size;
    });

    return stats;
  }
}

module.exports = GameHistorySSE;
