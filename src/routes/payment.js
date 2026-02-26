const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { authenticateToken, requestLogger } = require('../middleware/auth');

const router = express.Router();

// Apply request logger to all routes
router.use(requestLogger);

// Bank Details Routes (all protected)
router.post('/bank', authenticateToken, PaymentController.saveBankDetails);
router.get('/bank', authenticateToken, PaymentController.getBankDetails);
router.delete('/bank/:bank_id', authenticateToken, PaymentController.deleteBankDetails);

// UPI Details Routes (all protected)
router.post('/upi', authenticateToken, PaymentController.saveUpiDetails);
router.get('/upi', authenticateToken, PaymentController.getUpiDetails);
router.delete('/upi/:upi_id', authenticateToken, PaymentController.deleteUpiDetails);

// Get all payment methods (protected)
router.get('/methods', authenticateToken, PaymentController.getPaymentMethods);

module.exports = router;
