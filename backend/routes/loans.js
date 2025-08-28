const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const UserModel = require('../models/UserModel');
const LoanCalculator = require('../models/LoanCalculator');

const router = express.Router();

// Removed: Use /users/loans/eligibility/:userId instead

// Get loan calculation for specific amount
router.post('/calculate', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.user_id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ القرض مطلوب ويجب أن يكون أكبر من صفر'
      });
    }

    // Get user balance for simple calculation
    const user = await UserModel.getUserById(userId);
    const userBalance = user.current_balance || 0;

    const calculation = LoanCalculator.calculateLoanTerms(userBalance, amount);

    res.json({
      success: true,
      calculation
    });

  } catch (error) {
    console.error('Loan calculation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Request a new loan - RACE CONDITION SAFE VERSION
router.post('/request', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { amount, installmentMonths } = req.body;
    const userId = req.user.user_id;

    console.log(`🔐 Safe loan request started for user ${userId}, amount: ${amount}`);

    // Validate input
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ القرض مطلوب'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    // Check maximum loan limit (10,000 KWD system cap)
    const SYSTEM_MAX_LOAN = 10000;
    if (amount > SYSTEM_MAX_LOAN) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المطلوب يتجاوز الحد الأقصى للنظام (${SYSTEM_MAX_LOAN.toLocaleString()} دينار)`
      });
    }

    // Start transaction with explicit locking
    await connection.beginTransaction();
    console.log('🔒 Transaction started with locking');

    // CRITICAL: Lock user record to prevent concurrent requests
    const [userResults] = await connection.execute(
      'SELECT user_id, balance, is_blocked, joining_fee_approved, registration_date FROM users WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (userResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = userResults[0];
    const userBalance = parseFloat(user.balance || 0);

    console.log(`🔍 User locked: ${userId}, balance: ${userBalance}`);

    // CRITICAL: Check for active loans with lock to prevent race conditions
    const [activeLoanResults] = await connection.execute(
      'SELECT COUNT(*) as count FROM requested_loan WHERE user_id = ? AND status IN ("pending", "approved") AND loan_closed_date IS NULL FOR UPDATE',
      [userId]
    );

    const activeLoansCount = activeLoanResults[0].count;
    console.log(`🎯 Active loans check: ${activeLoansCount} loans found`);

    // Immediate eligibility checks with locked data
    if (activeLoansCount > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'يوجد قرض نشط أو معلق بالفعل. لا يمكن طلب قرض إضافي'
      });
    }

    if (user.is_blocked === 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'الحساب محظور - لا يمكن طلب قرض'
      });
    }

    if (user.joining_fee_approved !== 'approved') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'رسوم الانضمام غير معتمدة - لا يمكن طلب قرض'
      });
    }

    if (userBalance < 500) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `الرصيد أقل من 500 دينار (الرصيد الحالي: ${userBalance.toFixed(3)} د.ك)`
      });
    }

    // Check one year registration
    const registrationDate = new Date(user.registration_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (registrationDate > oneYearAgo) {
      const daysRemaining = Math.ceil((registrationDate - oneYearAgo) / (1000 * 60 * 60 * 24));
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `لم يمض عام على التسجيل (باقي ${daysRemaining} يوم)`
      });
    }

    // Check 30-day rule since last closure
    const [lastClosureResults] = await connection.execute(
      'SELECT loan_closed_date FROM requested_loan WHERE user_id = ? AND loan_closed_date IS NOT NULL ORDER BY loan_closed_date DESC LIMIT 1',
      [userId]
    );
    
    if (lastClosureResults.length > 0) {
      const lastClosure = new Date(lastClosureResults[0].loan_closed_date);
      const daysSince = Math.floor((new Date() - lastClosure) / (1000 * 60 * 60 * 24));
      
      if (daysSince < 30) {
        const daysUntilNextLoan = 30 - daysSince;
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `لم يمر 30 يوم على إغلاق آخر قرض (باقي ${daysUntilNextLoan} يوم)`
        });
      }
    }

    // Check if amount doesn't exceed user's maximum based on balance
    const maxLoanAmount = Math.min(userBalance * 3, SYSTEM_MAX_LOAN);
    if (amount > maxLoanAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `المبلغ المطلوب يتجاوز الحد الأقصى المسموح لك (${maxLoanAmount.toLocaleString()} دينار)`
      });
    }

    // Calculate installment using centralized calculator
    let monthlyInstallment, period;
    try {
      const installmentData = new LoanCalculator().calculateInstallment(amount, userBalance);
      monthlyInstallment = installmentData.amount;
      
      console.log(`💰 Installment calculated: ${monthlyInstallment} KWD`);
      
      // Calculate period automatically: period = loanAmount / installment (minimum 6 months)
      period = Math.max(Math.ceil(amount / monthlyInstallment), 6);
      
    } catch (error) {
      console.error('Calculation error:', error);
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: 'خطأ في حساب القسط الشهري. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني'
      });
    }

    // Validate calculated installment
    if (monthlyInstallment <= 0) {
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: 'خطأ في حساب القسط الشهري. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني'
      });
    }

    // FINAL CHECK: Re-verify no active loans immediately before insert
    const [finalCheckResults] = await connection.execute(
      'SELECT COUNT(*) as count FROM requested_loan WHERE user_id = ? AND status IN ("pending", "approved") AND loan_closed_date IS NULL',
      [userId]
    );

    if (finalCheckResults[0].count > 0) {
      await connection.rollback();
      console.log(`❌ Race condition detected! User ${userId} has ${finalCheckResults[0].count} active loans`);
      return res.status(400).json({
        success: false,
        message: 'تم اكتشاف طلب قرض آخر مُرسل بنفس الوقت. لا يمكن طلب قروض متعددة'
      });
    }

    // Insert loan request - this will be blocked by our database constraint if somehow multiple get through
    const [result] = await connection.execute(`
      INSERT INTO requested_loan 
      (user_id, loan_amount, installment_amount, status, request_date)
      VALUES (?, ?, ?, 'pending', NOW())
    `, [
      userId,
      amount,
      monthlyInstallment
    ]);

    // Commit the transaction
    await connection.commit();
    
    console.log(`✅ Loan request ${result.insertId} created successfully for user ${userId}`);

    res.json({
      success: true,
      message: 'تم إرسال طلب القرض بنجاح. في انتظار موافقة الإدارة',
      loanRequest: {
        id: result.insertId,
        amount,
        installmentMonths: period,
        monthlyInstallment: monthlyInstallment.toFixed(3),
        status: 'pending'
      }
    });

  } catch (error) {
    // Rollback transaction on any error
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    
    console.error('Safe loan request error:', error);
    
    // Check if it's a database constraint violation (our safety net)
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('idx_one_active_loan_per_user')) {
      return res.status(400).json({
        success: false,
        message: 'يوجد قرض نشط بالفعل. لا يمكن طلب قروض متعددة'
      });
    }
    
    // Check if it's our custom trigger error
    if (error.sqlState === '45000') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'خطأ في النظام. يرجى المحاولة مرة أخرى'
    });
  } finally {
    // Always release the connection
    if (connection) {
      connection.release();
    }
  }
});

// Get user's loan history
router.get('/history/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const loans = await UserModel.getUserLoanHistory(userId);

    res.json({
      success: true,
      loans
    });

  } catch (error) {
    console.error('Get loan history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get active loan details
router.get('/active/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [activeLoans] = await pool.execute(`
      SELECT rl.*, u.Aname as admin_name,
             (rl.loan_amount - COALESCE(paid.total_paid, 0)) as remaining_amount,
             COALESCE(paid.total_paid, 0) as paid_amount
      FROM requested_loan rl
      LEFT JOIN users u ON rl.admin_id = u.user_id
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan 
        WHERE status = 'accepted'
        GROUP BY target_loan_id
      ) paid ON rl.loan_id = paid.target_loan_id
      WHERE rl.user_id = ? AND rl.status = 'approved' 
        AND (COALESCE(paid.total_paid, 0) < rl.loan_amount)
      ORDER BY rl.approval_date DESC
      LIMIT 1
    `, [userId]);

    const activeLoan = activeLoans[0] || null;

    res.json({
      success: true,
      activeLoan
    });

  } catch (error) {
    console.error('Get active loan error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Make loan payment
router.post('/payment', verifyToken, async (req, res) => {
  try {
    const { amount, memo } = req.body;
    const userId = req.user.user_id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر'
      });
    }

    // Check if user has an active loan
    const [activeLoans] = await pool.execute(
      'SELECT loan_id, loan_amount, installment_amount FROM requested_loan WHERE user_id = ? AND status = "approved" LIMIT 1',
      [userId]
    );

    if (activeLoans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد قرض نشط لتسديده'
      });
    }

    const activeLoan = activeLoans[0];

    // Get user's current balance for calculation
    const [users] = await pool.execute(
      'SELECT balance FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    const userBalance = users[0].balance || 0;

    // Calculate remaining loan balance
    const [paidAmountResult] = await pool.execute(`
      SELECT COALESCE(SUM(credit), 0) as total_paid 
      FROM loan 
      WHERE target_loan_id = ? AND status = 'accepted'
    `, [activeLoan.loan_id]);
    
    const totalPaid = parseFloat(paidAmountResult[0].total_paid || 0);
    const remainingBalance = parseFloat(activeLoan.loan_amount) - totalPaid;

    // Use installment_amount from database (admin can modify this)
    const minInstallment = Math.max(parseFloat(activeLoan.installment_amount) || 20, 20);

    // Special handling for final payment - allow remaining balance even if below minimum
    const effectiveMinimum = remainingBalance <= minInstallment ? remainingBalance : minInstallment;

    // Validate payment amount
    if (amount < effectiveMinimum) {
      return res.status(400).json({
        success: false,
        message: `المبلغ أقل من الحد الأدنى المطلوب (${effectiveMinimum.toFixed(3)} دينار)`
      });
    }

    // Prevent overpayment
    if (amount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `المبلغ أكبر من المتبقي من القرض (${remainingBalance.toFixed(3)} دينار)`
      });
    }

    // Get current user balance
    const user = await UserModel.getUserById(userId);

    // Get the first available admin user
    const [adminUsers] = await pool.execute(`
      SELECT user_id FROM users WHERE user_type = 'admin' ORDER BY user_id LIMIT 1
    `);
    
    if (adminUsers.length === 0) {
      throw new Error('لا يوجد مدير متاح لمعالجة الطلب');
    }
    
    const adminId = adminUsers[0].user_id;

    // Insert payment record (pending admin approval)
    const [result] = await pool.execute(`
      INSERT INTO loan 
      (target_loan_id, user_id, credit, memo, status, admin_id)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `, [
      activeLoan.loan_id,
      userId,
      amount,
      memo || 'تسديد قسط القرض',
      adminId
    ]);

    res.json({
      success: true,
      message: 'تم إرسال طلب تسديد القسط. في انتظار موافقة الإدارة',
      payment: {
        id: result.insertId,
        amount,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Loan payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get loan payment history
router.get('/payments/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [payments] = await pool.execute(`
      SELECT l.*, rl.loan_amount, u.Aname as admin_name
      FROM loan l
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      LEFT JOIN users u ON l.admin_id = u.user_id
      WHERE l.user_id = ? AND l.target_loan_id IS NOT NULL
      ORDER BY l.date DESC
    `, [userId]);

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Real-time loan calculation endpoint for frontend calculator  
router.post('/calculate-realtime', verifyToken, async (req, res) => {
  try {
    const { requestedAmount } = req.body;
    const userId = req.user.user_id;

    // Check basic eligibility first
    const eligibility = await UserModel.checkLoanEligibility(userId);
    
    if (!eligibility.eligible) {
      return res.json({
        success: true,
        eligible: false,
        reason: eligibility.reason,
        details: eligibility
      });
    }

    // Get user balance for simple calculation
    const user = await UserModel.getUserById(userId);
    const userBalance = user.current_balance || 0;

    // Calculate loan terms using simple calculation
    const loanTerms = LoanCalculator.calculateLoanTerms(userBalance, requestedAmount);

    res.json({
      success: true,
      eligible: loanTerms.eligible,
      loanTerms: {
        ...loanTerms,
        userBalance: userBalance
      },
      eligibility
    });

  } catch (error) {
    console.error('Loan calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حساب القرض: ' + error.message
    });
  }
});

// Removed duplicate routes - see above for the actual implementations

// Cancel pending loan payment (user can only cancel their own pending payments)
router.delete('/cancel-payment/:paymentId', verifyToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const userId = req.user.user_id;

    console.log(`User ${userId} attempting to cancel loan payment ${paymentId}`);

    // Get payment details and verify ownership
    const [payments] = await pool.execute(
      'SELECT * FROM loan WHERE loan_id = ?',
      [paymentId]
    );
    
    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الدفعة غير موجودة'
      });
    }

    const payment = payments[0];

    // Check ownership
    if (payment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإلغاء هذه الدفعة'
      });
    }

    // Check if payment is pending
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء الدفعة إلا إذا كانت معلقة'
      });
    }

    // Delete the pending payment
    const [result] = await pool.execute(
      'DELETE FROM loan WHERE loan_id = ?',
      [paymentId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'فشل في إلغاء الدفعة'
      });
    }

    console.log(`✅ Loan payment ${paymentId} cancelled by user ${userId}`);
    
    res.json({
      success: true,
      message: 'تم إلغاء الدفعة بنجاح'
    });

  } catch (error) {
    console.error('Cancel loan payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel pending loan request (user can only cancel their own pending requests)
router.delete('/cancel-request/:loanId', verifyToken, async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const userId = req.user.user_id;

    console.log(`User ${userId} attempting to cancel loan request ${loanId}`);

    // Get loan request details and verify ownership
    const [loanRequests] = await pool.execute(
      'SELECT * FROM requested_loan WHERE loan_id = ?',
      [loanId]
    );
    
    if (loanRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'طلب القرض غير موجود'
      });
    }

    const loanRequest = loanRequests[0];

    // Check ownership
    if (loanRequest.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإلغاء هذا الطلب'
      });
    }

    // Check if loan request is pending
    if (loanRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء طلب القرض إلا إذا كان معلقًا'
      });
    }

    // Delete the pending loan request
    const [result] = await pool.execute(
      'DELETE FROM requested_loan WHERE loan_id = ?',
      [loanId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'فشل في إلغاء طلب القرض'
      });
    }

    console.log(`✅ Loan request ${loanId} cancelled by user ${userId}`);
    
    res.json({
      success: true,
      message: 'تم إلغاء طلب القرض بنجاح'
    });

  } catch (error) {
    console.error('Cancel loan request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;