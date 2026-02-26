const express = require('express');
const PassbookController = require('../controllers/PassbookController');
const { authenticateToken, requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Passbook Routes (all protected)
router.get('/transactions', authenticateToken, PassbookController.getUserPassbook);
router.get('/summary', authenticateToken, PassbookController.getPassbookSummary);

module.exports = router;
