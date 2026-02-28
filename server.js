const express = require('express');
const path = require('path');

// Import Firebase config
const { initializeFirebase } = require('./src/config/firebase');

// Import routes
const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payment');
const transactionRoutes = require('./src/routes/transaction');
const withdrawRoutes = require('./src/routes/withdraw');
const adminRoutes = require('./src/routes/admin');
const adminAuthRoutes = require('./src/routes/adminAuth');
const passbookRoutes = require('./src/routes/passbook');
const gameRoutes = require('./src/routes/game');

// Import middleware
const { requestLogger, errorHandler } = require('./src/middleware/auth');

// Import WebSocket (for local development) and SSE (for Render)
const GameHistoryWebSocket = require('./src/websocket/GameHistoryWebSocket');
const GameHistorySSE = require('./src/websocket/GameHistorySSE');

const app = express();
const PORT = process.env.PORT || 4001;

// Initialize Firebase
let db;
try {
  db = initializeFirebase();
  console.log('📊 Firestore database connected');
  
  // Test the connection
  db.collection('connections').add({
    timestamp: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
    status: 'server_started'
  }).then(doc => {
    console.log(`🔥 Firebase connection test successful - Document ID: ${doc.id}`);
  }).catch(error => {
    console.error('❌ Firebase connection test failed:', error);
  });
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

// WebSocket Server (temporarily disabled for testing)
// const wss = new WebSocket.Server({ port: 8082 });

// wss.on('connection', (ws) => {
//   console.log('🔌 WebSocket client connected');
  
//   ws.on('message', async (message) => {
//     try {
//       const data = JSON.parse(message);
//       console.log('📨 Received message:', data);
      
//       // Store message in Firebase if connected
//       if (db) {
//         await db.collection('messages').add({
//           text: data.text,
//           timestamp: admin.firestore.FieldValue.serverTimestamp()
//         });
//       }
      
//       // Broadcast to all clients
//       wss.clients.forEach(client => {
//         if (client.readyState === WebSocket.OPEN) {
//           client.send(JSON.stringify(data));
//         }
//       });
      
//     } catch (error) {
//       console.error('❌ WebSocket error:', error);
//     }
//   });
  
//   ws.on('close', () => {
//     console.log('🔌 WebSocket client disconnected');
//   });
  
//   ws.on('error', (error) => {
//     console.error('❌ WebSocket error:', error);
//   });
// });

console.log('🔌 WebSocket server disabled for testing');

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/passbook', passbookRoutes);
app.use('/api/game', gameRoutes);

// Health check endpoint with FCM status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    firebase: db ? 'connected' : 'disconnected',
    fcm: 'enabled',
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  });
});

app.get('/firebase-status', (req, res) => {
  res.json({
    firebase: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Middleware to pass WebSocket/SSE instance to controllers
app.use((req, res, next) => {
  req.gameHistoryWS = gameHistoryWS;
  req.gameHistorySSE = gameHistorySSE;
  next();
});

// Error handling middleware
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Initialize WebSocket/SSE based on environment
let gameHistoryWS = null;
let gameHistorySSE = null;

// Check if running on Render (production)
const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID;

if (isRender) {
  // Use SSE for Render compatibility
  try {
    gameHistorySSE = new GameHistorySSE();
    gameHistorySSE.addSSEEndpoint(app);
    console.log('🌊 Game History SSE initialized for Render');
  } catch (error) {
    console.error('❌ Failed to initialize SSE:', error);
  }
} else {
  // Use WebSocket for local development
  try {
    gameHistoryWS = new GameHistoryWebSocket();
    console.log('🎮 Game History WebSocket initialized for local development');
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
  }
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  
  if (isRender) {
    console.log(`🌊 SSE endpoints: https://your-app.onrender.com/api/game/sse/:game_type`);
    console.log(`📊 SSE status: https://your-app.onrender.com/api/game/sse-status`);
  } else {
    console.log(`🎮 WebSocket server running on port ${process.env.WS_PORT || 8080}`);
  }
  
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔥 Firebase status: http://localhost:${PORT}/firebase-status`);
  console.log(`🎮 Game API: http://localhost:${PORT}/api/game`);
  console.log(` Auth endpoints: http://localhost:${PORT}/api/auth`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
});
