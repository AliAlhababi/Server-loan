const express = require('express');
const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = express.Router();

// Get user dashboard data (optimized with single query)
router.get('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  // Optimized dashboard query with JOINs - include only truly active loans (approved but not fully paid)
  const dashboardQuery = `
    SELECT 
      u.user_id, u.Aname, u.user_type, u.balance, u.registration_date,
      rl.loan_id, rl.loan_amount, rl.installment_amount, rl.status as loan_status,
      rl.approval_date, rl.request_date,
      COALESCE(paid.total_paid, 0) as paid_amount,
      (rl.loan_amount - COALESCE(paid.total_paid, 0)) as remaining_amount
    FROM users u
    LEFT JOIN requested_loan rl ON u.user_id = rl.user_id 
      AND rl.status = 'approved' 
      AND rl.loan_closed_date IS NULL 
      AND COALESCE((
        SELECT SUM(credit) 
        FROM loan 
        WHERE target_loan_id = rl.loan_id AND status = 'accepted'
      ), 0) < rl.loan_amount
    LEFT JOIN (
      SELECT target_loan_id, SUM(credit) as total_paid
      FROM loan 
      WHERE status = 'accepted'
      GROUP BY target_loan_id
    ) paid ON rl.loan_id = paid.target_loan_id
    WHERE u.user_id = ?
    LIMIT 1
  `;

  const results = await DatabaseService.executeQuery(dashboardQuery, [userId]);

  if (results.length === 0) {
    return ResponseHelper.notFound(res, 'المستخدم غير موجود');
  }

  const userData = results[0];

  // Get recent transactions separately (small query)
  const recentTransactions = await DatabaseService.executeQuery(`
    SELECT * FROM transaction 
    WHERE user_id = ? 
    ORDER BY date DESC 
    LIMIT 5
  `, [userId]);

  const dashboardData = {
    user: {
      user_id: userData.user_id,
      name: userData.Aname,
      user_type: userData.user_type,
      balance: userData.balance || 0,
      maxLoanAmount: UserService.calculateMaxLoanAmount(userData.balance),
      registration_date: userData.registration_date
    },
    activeLoan: userData.loan_id ? {
      loan_id: userData.loan_id,
      loan_amount: userData.loan_amount,
      installment_amount: userData.installment_amount,
      status: userData.loan_status,
      approval_date: userData.approval_date,
      request_date: userData.request_date,
      paid_amount: userData.paid_amount,
      remaining_amount: userData.remaining_amount
    } : null,
    recentTransactions
  };

  ResponseHelper.success(res, { dashboard: dashboardData }, 'تم جلب بيانات لوحة التحكم بنجاح');
}));

// Self-service password reset
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, phone, newPassword } = req.body;

  // Validation
  if (!email || !phone || !newPassword) {
    return ResponseHelper.error(res, 'البريد الإلكتروني ورقم الهاتف وكلمة المرور الجديدة مطلوبة', 400);
  }

  if (newPassword.length < 1) {
    return ResponseHelper.error(res, 'كلمة المرور مطلوبة', 400);
  }

  // Check if user exists with matching email and phone
  const query = 'SELECT user_id, Aname, email, phone FROM users WHERE email = ? AND phone = ?';
  const users = await DatabaseService.executeQuery(query, [email, phone]);

  if (users.length === 0) {
    return ResponseHelper.notFound(res, 'لم يتم العثور على مستخدم بهذا البريد الإلكتروني ورقم الهاتف');
  }

  const user = users[0];

  // Reset password
  await UserService.resetPassword(user.user_id, newPassword);

  // Log the password reset activity
  const admin = await UserService.getFirstAdmin();
  
  const logData = {
    user_id: user.user_id,
    balance: 0, // Just for logging
    credit: 0,
    debit: 0,
    memo: 'إعادة تعيين كلمة المرور بواسطة المستخدم',
    status: 'accepted',
    admin_id: admin.user_id,
    date: new Date()
  };

  await DatabaseService.create('transaction', logData);

  ResponseHelper.success(res, {
    user: {
      name: user.Aname,
      email: user.email
    }
  }, `تم إعادة تعيين كلمة المرور بنجاح للمستخدم ${user.Aname}`);
}));

module.exports = router;