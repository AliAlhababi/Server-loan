const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const UserValidator = require('../validators/UserValidator');
const LoanValidator = require('../validators/LoanValidator');
const { handleAsyncError } = require('../utils/ResponseHelper');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const adminController = new AdminController();

// Admin dashboard
router.get('/dashboard',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getDashboard(req, res))
);

// User Management Endpoints
router.post('/register-user',
  verifyToken,
  verifyAdmin,
  UserValidator.validateUserRegistrationInput,
  handleAsyncError((req, res) => adminController.registerUser(req, res))
);

router.get('/users',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getAllUsers(req, res))
);

router.get('/users/:userId',
  verifyToken,
  verifyAdmin,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => adminController.getUserDetails(req, res))
);

router.put('/joining-fee-action/:userId',
  verifyToken,
  verifyAdmin,
  UserValidator.validateUserIdParam,
  UserValidator.validateUserActionInput,
  handleAsyncError((req, res) => adminController.updateJoiningFeeStatus(req, res))
);

router.put('/block-user/:userId',
  verifyToken,
  verifyAdmin,
  UserValidator.validateUserIdParam,
  UserValidator.validateUserActionInput,
  handleAsyncError((req, res) => adminController.updateUserBlockStatus(req, res))
);

router.put('/user/:userId/registration-date',
  verifyToken,
  verifyAdmin,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => adminController.updateUserRegistrationDate(req, res))
);

// Loan Management Endpoints
router.get('/all-loans',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getAllLoans(req, res))
);

router.put('/loan/:loanId/action',
  verifyToken,
  verifyAdmin,
  LoanValidator.validateLoanActionInput,
  handleAsyncError((req, res) => adminController.processLoanAction(req, res))
);

// Transaction Management Endpoints
router.get('/all-transactions',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getAllTransactions(req, res))
);

router.put('/transaction/:transactionId/action',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.processTransactionAction(req, res))
);

// Report Endpoints
router.get('/reports/users',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getUsersReport(req, res))
);

router.get('/reports/loans',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getLoansReport(req, res))
);

router.get('/reports/transactions',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getTransactionsReport(req, res))
);

router.get('/reports/financial-summary',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getFinancialSummary(req, res))
);

router.get('/reports/monthly',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getMonthlyReport(req, res))
);

router.get('/reports/active-loans',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.getActiveLoansReport(req, res))
);

// System Management Endpoints
router.get('/export-data',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.exportSystemData(req, res))
);

router.post('/test-email',
  verifyToken,
  verifyAdmin,
  handleAsyncError((req, res) => adminController.testEmail(req, res))
);

module.exports = router;