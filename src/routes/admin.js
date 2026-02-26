const express = require('express');
const AdminController = require('../controllers/AdminController');
const { requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin token required'
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Verify admin role
    if (!decoded.isAdmin || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired admin token'
    });
  }
};

// Admin Routes (all require admin authentication)
router.get('/users', authenticateAdmin, AdminController.getAllUsers);
router.get('/users/:userId', authenticateAdmin, AdminController.getUserDetails);
router.put('/users/:userId/status', authenticateAdmin, AdminController.updateUserStatus);

// Transaction Management Routes
router.get('/deposits', authenticateAdmin, AdminController.getAllDeposits);
router.get('/withdrawals', authenticateAdmin, AdminController.getAllWithdrawals);
router.put('/deposits/:transactionId/status', authenticateAdmin, AdminController.updateDepositStatus);
router.put('/withdrawals/:transactionId/status', authenticateAdmin, AdminController.updateWithdrawalStatus);

module.exports = router;
