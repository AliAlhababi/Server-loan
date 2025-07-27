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

// Request a new loan
router.post('/request', verifyToken, async (req, res) => {
  try {
    const { amount, installmentMonths } = req.body;
    const userId = req.user.user_id;

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

    if (installmentMonths && installmentMonths <= 0) {
      return res.status(400).json({
        success: false,
        message: 'عدد الأقساط يجب أن يكون أكبر من صفر'
      });
    }

    // Check eligibility
    const eligibility = await UserModel.checkLoanEligibility(userId);
    
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: `لا يمكنك طلب قرض: ${eligibility.reason}`
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

    // Check if amount doesn't exceed user's maximum based on balance
    if (amount > eligibility.maxLoanAmount) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المطلوب يتجاوز الحد الأقصى المسموح لك (${eligibility.maxLoanAmount.toLocaleString()} دينار)`
      });
    }

    // Get system attributes
    const [attributes] = await pool.execute(
      'SELECT attribute_name, attribute_value FROM attribute WHERE attribute_name IN (?, ?, ?)',
      ['max_loan_amount', 'loan_ratio', 'min_installment']
    );

    const systemConfig = {};
    attributes.forEach(attr => {
      systemConfig[attr.attribute_name] = attr.attribute_value;
    });

    // Check maximum loan limit
    if (amount > (systemConfig.max_loan_amount || SYSTEM_MAX_LOAN)) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المطلوب يتجاوز الحد الأقصى للنظام (${systemConfig.max_loan_amount || SYSTEM_MAX_LOAN} دينار)`
      });
    }

    // Get user balance for calculation
    const user = await UserModel.getUserById(userId);
    const userBalance = user.balance || 0;
    
    console.log(`User data for loan calculation:`, { userId, balance: user.balance, userBalance });
    
    // Use the same calculation logic as dashboard calculator
    // Use the centralized LoanCalculator for consistent calculations
    
    let monthlyInstallment, period;
    try {
      // Check if user balance is valid for calculation
      if (userBalance <= 0) {
        throw new Error('Invalid user balance for installment calculation');
      }
      
      // Use LoanCalculator for consistent installment calculation
      const installmentData = new LoanCalculator().calculateInstallment(amount, userBalance);
      monthlyInstallment = installmentData.amount;
      
      console.log(`Loan calculation: Amount=${amount}, Balance=${userBalance}`);
      console.log(`Installment calculation: ${installmentData.baseAmount} → ${monthlyInstallment}`);
      
      // Calculate period automatically: period = loanAmount / installment (no maximum cap)
      period = Math.max(Math.ceil(amount / monthlyInstallment), 6); // minimum 6 months
      
    } catch (error) {
      console.error('Calculation error:', error);
      // Fallback to simple calculation
      monthlyInstallment = Math.max(amount / 24, 20);
      period = 24;
    }

    // Validate calculated installment before inserting
    if (monthlyInstallment <= 0) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في حساب القسط الشهري. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني'
      });
    }

    // Insert loan request
    const [result] = await pool.execute(`
      INSERT INTO requested_loan 
      (user_id, loan_amount, installment_amount, status)
      VALUES (?, ?, ?, 'pending')
    `, [
      userId,
      amount,
      monthlyInstallment
    ]);

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
    console.error('Request loan error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
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

    // Calculate minimum required payment using LoanCalculator for consistency
    const installmentData = new LoanCalculator().calculateInstallment(activeLoan.loan_amount, userBalance);
    const minInstallment = installmentData.amount;

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

module.exports = router;