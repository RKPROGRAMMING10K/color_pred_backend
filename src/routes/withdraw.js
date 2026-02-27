const express = require('express');
const WithdrawController = require('../controllers/WithdrawController');
const { authenticateToken, requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Withdrawal Routes (all protected)
router.post('/create', authenticateToken, WithdrawController.createWithdrawal);
router.get('/', authenticateToken, WithdrawController.getWithdrawals);
router.get('/:transaction_id', authenticateToken, WithdrawController.getWithdrawalDetails);

module.exports = router;
