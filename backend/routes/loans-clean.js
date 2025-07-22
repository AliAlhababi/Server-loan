const express = require('express');
const router = express.Router();
const LoanController = require('../controllers/LoanController');
const LoanValidator = require('../validators/LoanValidator');
const { handleAsyncError } = require('../utils/ResponseHelper');
const { verifyToken } = require('../middleware/auth');

const loanController = new LoanController();

// Request a new loan
router.post('/request',
  verifyToken,
  LoanValidator.validateLoanRequestInput,
  handleAsyncError((req, res) => loanController.requestLoan(req, res))
);

// Calculate loan terms
router.post('/calculate',
  LoanValidator.validateLoanCalculationInput,
  handleAsyncError((req, res) => loanController.calculateLoanTerms(req, res))
);

// Check loan eligibility for current user
router.get('/eligibility',
  verifyToken,
  handleAsyncError((req, res) => loanController.checkLoanEligibility(req, res))
);

// Get user's loan history
router.get('/history',
  verifyToken,
  handleAsyncError((req, res) => loanController.getUserLoanHistory(req, res))
);

// Get active loan for specific user
router.get('/active/:userId',
  verifyToken,
  handleAsyncError((req, res) => loanController.getActiveLoan(req, res))
);

// Process loan payment
router.post('/payment',
  verifyToken,
  LoanValidator.validateLoanPaymentInput,
  handleAsyncError((req, res) => loanController.processLoanPayment(req, res))
);

// Get user's loan payment history
router.get('/payments',
  verifyToken,
  handleAsyncError((req, res) => loanController.getUserLoanPayments(req, res))
);

// Frontend calculator integration endpoints
router.post('/calculate-from-amount',
  LoanValidator.validateLoanCalculationInput,
  handleAsyncError((req, res) => loanController.calculateFromLoanAmount(req, res))
);

router.post('/calculate-from-balance',
  LoanValidator.validateLoanCalculationInput,
  handleAsyncError((req, res) => loanController.calculateFromBalance(req, res))
);

module.exports = router;