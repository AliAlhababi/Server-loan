const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', verifyToken, requireAdmin, adminController.getDashboardStats);

// Get pending loan requests
router.get('/pending-loans', verifyToken, requireAdmin, adminController.getPendingLoans);

// Get all loans (pending, approved, rejected)
router.get('/all-loans', verifyToken, requireAdmin, adminController.getAllLoans);

// Get pending transactions
router.get('/pending-transactions', verifyToken, requireAdmin, adminController.getPendingTransactions);

// Get pending loan payments
router.get('/pending-loan-payments', verifyToken, requireAdmin, adminController.getPendingLoanPayments);

// Get all loan payments (new endpoint)
router.get('/all-loan-payments', verifyToken, requireAdmin, adminController.getAllLoanPayments);

// Get all transactions
router.get('/all-transactions', verifyToken, requireAdmin, adminController.getAllTransactions);

// Get all users for admin management
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);

// User management endpoints
router.post('/register-user', verifyToken, requireAdmin, adminController.registerUser);
router.put('/block-user/:userId', verifyToken, requireAdmin, adminController.toggleBlockUser);
router.put('/joining-fee-action/:userId', verifyToken, requireAdmin, adminController.joiningFeeAction);
router.get('/user-details/:userId', verifyToken, requireAdmin, adminController.getUserDetails);
router.put('/update-user/:userId', verifyToken, requireAdmin, adminController.updateUser);

// Loan repair endpoints
router.post('/fix-loan-installments', verifyToken, requireAdmin, adminController.fixLoanInstallments);

// Loan management endpoints
router.post('/loan-action/:loanId', verifyToken, requireAdmin, adminController.loanAction);
router.get('/loan-details/:loanId', verifyToken, requireAdmin, adminController.getLoanDetails);

// Loan closure endpoints
router.post('/close-loan/:loanId', verifyToken, requireAdmin, adminController.closeLoan);
router.get('/loans-eligible-for-closure', verifyToken, requireAdmin, adminController.getLoansEligibleForClosure);
router.post('/auto-close-loans', verifyToken, requireAdmin, adminController.autoCloseLoans);

// Transaction approval endpoints
router.post('/transaction-action/:transactionId', verifyToken, requireAdmin, adminController.transactionAction);
router.post('/loan-payment-action/:loanPaymentId', verifyToken, requireAdmin, adminController.loanPaymentAction);

module.exports = router;

