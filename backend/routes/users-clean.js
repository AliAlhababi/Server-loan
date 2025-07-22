const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const UserValidator = require('../validators/UserValidator');
const { handleAsyncError } = require('../utils/ResponseHelper');
const { verifyToken, verifyTokenOptional } = require('../middleware/auth');

const userController = new UserController();

// Get user dashboard data
router.get('/dashboard/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getUserDashboard(req, res))
);

// Update user profile
router.put('/profile',
  verifyToken,
  UserValidator.validateProfileUpdateInput,
  handleAsyncError((req, res) => userController.updateUserProfile(req, res))
);

// Get user transaction history
router.get('/transactions/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getUserTransactions(req, res))
);

// Get user loan payment history
router.get('/loan-payments/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getUserLoanPayments(req, res))
);

// Request deposit
router.post('/deposit',
  verifyToken,
  UserValidator.validateDepositRequestInput,
  handleAsyncError((req, res) => userController.requestDeposit(req, res))
);

// Get subscription status
router.get('/subscription/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getSubscriptionStatus(req, res))
);

// Get financial summary
router.get('/financial-summary/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getFinancialSummary(req, res))
);

// Check loan eligibility
router.get('/loan-eligibility/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.checkLoanEligibility(req, res))
);

// Get active loan details
router.get('/active-loan/:userId',
  verifyTokenOptional,
  UserValidator.validateUserIdParam,
  handleAsyncError((req, res) => userController.getActiveLoanDetails(req, res))
);

module.exports = router;