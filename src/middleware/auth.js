const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

// JWT Authentication Middleware with Session Validation
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user has an active session
    const activeSessions = await Session.getActiveSessionsForUser(decoded.userId);
    
    if (activeSessions.length === 0) {
      console.log('❌ No active session found for user:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }

    // Update last activity for the session
    await Session.updateActivity(activeSessions[0].session_id);

    req.user = decoded;
    req.session = activeSessions[0]; // Add session info to request
    console.log('✅ Token and session validated for user:', decoded.userId);
    next();
    
  } catch (err) {
    console.log('❌ Invalid token:', err.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Request Logger Middleware
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📨 ${timestamp} - ${req.method} ${req.path}`);
  console.log('📋 Request body:', req.body);
  next();
};

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Validation Middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      console.log('❌ Validation error:', error.details);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requestLogger,
  errorHandler,
  validateRequest
};
