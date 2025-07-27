const express = require('express');
const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const UserModel = require('../models/UserModel');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user transactions
router.get('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const transactions = await UserModel.getUserTransactions(userId);

  ResponseHelper.success(res, { transactions }, 'تم جلب المعاملات بنجاح');
}));

// Request deposit (subscription payment)
router.post('/deposit', verifyToken, asyncHandler(async (req, res) => {
  const { amount, memo } = req.body;
  const userId = req.user.user_id;

  console.log('Deposit request:', { userId, amount, memo });

  if (!amount || amount <= 0) {
    return ResponseHelper.error(res, 'مبلغ الإيداع مطلوب ويجب أن يكون أكبر من صفر', 400);
  }

  // Check if user exists
  await UserService.checkUserExists(userId);

  // Get first available admin
  const admin = await UserService.getFirstAdmin();

  // Insert deposit request (pending admin approval)
  const depositData = {
    user_id: userId,
    credit: amount,
    memo: memo || 'إيداع اشتراك',
    status: 'pending',
    admin_id: admin.user_id,
    date: new Date()
  };

  const result = await DatabaseService.create('transaction', depositData);
  console.log('Deposit inserted with ID:', result.insertId);

  ResponseHelper.created(res, {
    id: result.insertId,
    amount,
    status: 'pending'
  }, 'تم إرسال طلب الإيداع. في انتظار موافقة الإدارة');
}));

// Request transaction (general)
router.post('/request-transaction', verifyToken, asyncHandler(async (req, res) => {
  const { amount, memo, type } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0 || !type) {
    return ResponseHelper.error(res, 'مبلغ المعاملة ونوعها مطلوبان', 400);
  }

  let credit = 0;
  let debit = 0;
  let finalMemo = memo || '';

  if (type === 'deposit') {
    credit = amount;
    finalMemo = finalMemo || 'طلب إيداع';
  } else if (type === 'withdrawal') {
    debit = amount;
    finalMemo = finalMemo || 'طلب سحب';
  } else {
    return ResponseHelper.error(res, 'نوع المعاملة غير صحيح', 400);
  }

  const transactionData = {
    user_id: userId,
    credit,
    debit,
    memo: finalMemo,
    status: 'pending',
    date: new Date(),
    transaction_type: type
  };

  await DatabaseService.create('transaction', transactionData);

  ResponseHelper.created(res, null, 'تم إرسال طلب المعاملة بنجاح، سيتم مراجعته من قبل الإدارة');
}));

// Request deposit (subscription payment) - Alternative endpoint
router.post('/request-deposit', verifyToken, asyncHandler(async (req, res) => {
  const { amount, memo } = req.body;
  const userId = req.user.userId;

  if (!amount || amount <= 0) {
    return ResponseHelper.error(res, 'مبلغ الإيداع مطلوب', 400);
  }

  const transactionData = {
    user_id: userId,
    credit: amount,
    memo: memo || 'دفع اشتراك',
    status: 'pending',
    date: new Date(),
    transaction_type: 'subscription'
  };

  await DatabaseService.create('transaction', transactionData);

  ResponseHelper.created(res, null, 'تم إرسال طلب الإيداع بنجاح، سيتم مراجعته من قبل الإدارة');
}));

// Get subscription status
router.get('/subscription-status/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = await UserService.getUserWithBalance(userId);
  
  // Use the same logic as in UserModel.checkLoanEligibility for consistency
  const requiredAmount = 240; // Minimum 240 KWD for all users
  
  // Get subscription payments using the same query as in UserModel
  const { pool } = require('../config/database');
  const [subscriptionResults] = await pool.execute(
    'SELECT COALESCE(SUM(credit), 0) as total_paid FROM transaction WHERE user_id = ? AND status = "accepted" AND credit > 0 AND date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)',
    [userId]
  );

  const totalPaid = parseFloat(subscriptionResults[0].total_paid || 0);
  const isValid = totalPaid >= requiredAmount;
  const timeValid = totalPaid > 0;

  ResponseHelper.success(res, {
    status: {
      valid: isValid,
      timeValid: timeValid,
      totalPaid: totalPaid,
      requiredAmount: requiredAmount,
      completionPercentage: Math.min((totalPaid / requiredAmount) * 100, 100)
    }
  }, 'تم جلب حالة الاشتراك بنجاح');
}));

module.exports = router;