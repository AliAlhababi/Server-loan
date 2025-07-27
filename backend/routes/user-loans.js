const express = require('express');
const UserModel = require('../models/UserModel');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user loan eligibility
router.get('/eligibility/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const eligibilityResult = await UserModel.checkLoanEligibility(userId);
  
  // Return the complete eligibility data from UserModel
  ResponseHelper.success(res, {
    eligibility: eligibilityResult
  }, 'تم فحص أهلية القرض بنجاح');
}));

// Get user loan payments
router.get('/payments/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const loanPayments = await UserModel.getUserLoanPayments(userId);

  ResponseHelper.success(res, { loanPayments }, 'تم جلب تسديدات القروض بنجاح');
}));

// Get user loan history
router.get('/history/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const limit = parseInt(req.query.limit) || 50;
  
  const loanHistory = await UserModel.getUserLoanHistory(userId, limit);

  ResponseHelper.success(res, { loans: loanHistory }, 'تم جلب تاريخ القروض بنجاح');
}));

module.exports = router;