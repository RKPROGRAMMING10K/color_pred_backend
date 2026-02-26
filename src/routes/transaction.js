const express = require('express');
const TransactionController = require('../controllers/TransactionController');
const { authenticateToken, requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Transaction Routes (all protected)
router.post('/create', authenticateToken, TransactionController.createTransaction);
router.get('/list', authenticateToken, TransactionController.getUserTransactions);
router.get('/details/:transaction_id', authenticateToken, TransactionController.getTransactionDetails);
router.put('/status/:transaction_id', authenticateToken, TransactionController.updateTransactionStatus);

// Wallet Routes (all protected)
router.get('/wallet', authenticateToken, TransactionController.getWalletDetails);
router.get('/wallet/balance', authenticateToken, TransactionController.getWalletBalance);

module.exports = router;
