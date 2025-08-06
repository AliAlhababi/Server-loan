const DatabaseService = require('../services/DatabaseService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');
const { closeLoan, getLoansEligibleForClosure, autoCloseFullyPaidLoans } = require('../database/update-loan-status');
const emailService = require('../services/emailService');

class LoanManagementController {
  static loanAction = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { action } = req.body;
    const adminId = req.user.user_id;
    
    console.log(`💰 Admin ${adminId} ${action}ing loan ${loanId}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    // Verify admin has access to this loan's user
    const loanQuery = `
      SELECT rl.loan_id, rl.user_id, u.approved_by_admin_id 
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      WHERE rl.loan_id = ? AND u.approved_by_admin_id = ?
    `;
    
    const loanResults = await DatabaseService.executeQuery(loanQuery, [loanId, adminId]);
    
    if (loanResults.length === 0) {
      return ResponseHelper.error(res, 'ليس لديك صلاحية للتعامل مع هذا الطلب', 403);
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const affectedRows = await DatabaseService.update('requested_loan',
      { status, admin_id: adminId },
      { loan_id: loanId }
    );

    if (affectedRows === 0) {
      return ResponseHelper.notFound(res, 'طلب القرض غير موجود');
    }

    // Send email notification to user
    try {
      // Get loan details with user info for email
      const loanDetailsQuery = `
        SELECT rl.*, u.Aname as full_name, u.email, admin.Aname as admin_name
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        LEFT JOIN users admin ON rl.admin_id = admin.user_id
        WHERE rl.loan_id = ?
      `;
      
      const loanDetailsResults = await DatabaseService.executeQuery(loanDetailsQuery, [loanId]);
      
      if (loanDetailsResults.length > 0) {
        const loan = loanDetailsResults[0];
        
        // Calculate loan data for email
        const loanData = {
          loanAmount: loan.loan_amount,
          installmentAmount: loan.installment_amount,
          numberOfInstallments: Math.ceil(loan.loan_amount / loan.installment_amount),
          requestDate: loan.request_date,
          notes: loan.notes
        };
        
        // Send email notification
        await emailService.sendLoanStatusEmail(
          loan.email,
          loan.full_name,
          loanData,
          status,
          loan.admin_name || 'الإدارة'
        );
        
        console.log(`✅ Loan status email sent to ${loan.email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send loan status email:', emailError);
      // Don't fail the request if email fails
    }
    
    ResponseHelper.success(res, null,
      action === 'approve' ? 'تم اعتماد القرض' : 'تم رفض القرض'
    );
  });

  static getLoanDetails = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    console.log(`💰 Admin requesting details for loan ${loanId}`);
    
    const query = `
      SELECT rl.*, u.Aname as full_name, u.balance
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      WHERE rl.loan_id = ?
    `;
    
    const results = await DatabaseService.executeQuery(query, [loanId]);
    
    if (results.length === 0) {
      return ResponseHelper.notFound(res, 'طلب القرض غير موجود');
    }
    
    ResponseHelper.success(res, { loan: results[0] }, 'تم جلب تفاصيل القرض بنجاح');
  });

  static getLoanPayments = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    console.log(`💰 Admin requesting payments for loan ${loanId}`);
    
    const query = `
      SELECT l.*, admin.Aname as admin_name
      FROM loan l
      LEFT JOIN users admin ON l.admin_id = admin.user_id
      WHERE l.target_loan_id = ?
      ORDER BY l.date DESC
    `;
    
    const payments = await DatabaseService.executeQuery(query, [loanId]);
    
    ResponseHelper.success(res, { payments }, 'تم جلب مدفوعات القرض بنجاح');
  });

  static getPendingLoans = asyncHandler(async (req, res) => {
    const query = `
      SELECT rl.*, u.Aname as full_name, u.user_type, u.balance as current_balance
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      WHERE rl.status = 'pending'
      ORDER BY rl.request_date ASC
    `;

    const loans = await DatabaseService.executeQuery(query);
    ResponseHelper.success(res, { loans }, 'تم جلب طلبات القروض المعلقة بنجاح');
  });

  static getAllLoans = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting all loans...');
    
    const query = `
      SELECT rl.*, u.Aname as full_name, u.user_type, u.balance as current_balance
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      ORDER BY rl.request_date DESC
    `;

    const loans = await DatabaseService.executeQuery(query);
    console.log(`💰 Found ${loans.length} loans`);

    ResponseHelper.success(res, { loans }, 'تم جلب جميع طلبات القروض بنجاح');
  });

  static closeLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const success = await closeLoan(loanId, new Date());
    
    ResponseHelper.success(res, { success },
      success ? 'تم إغلاق القرض بنجاح' : 'القرض غير موجود أو تم إغلاقه بالفعل'
    );
  });

  static getLoansEligibleForClosure = asyncHandler(async (req, res) => {
    const eligibleLoans = await getLoansEligibleForClosure();
    ResponseHelper.success(res, { loans: eligibleLoans }, 'تم جلب القروض المؤهلة للإغلاق بنجاح');
  });

  static autoCloseLoans = asyncHandler(async (req, res) => {
    const closedCount = await autoCloseFullyPaidLoans();
    ResponseHelper.success(res, { closedCount },
      `تم إغلاق ${closedCount} قرض بشكل تلقائي`
    );
  });

  static getLoanStats = asyncHandler(async (req, res) => {
    const [pending, approved, rejected, closed] = await Promise.all([
      DatabaseService.count('requested_loan', { status: 'pending' }),
      DatabaseService.count('requested_loan', { status: 'approved' }),
      DatabaseService.count('requested_loan', { status: 'rejected' }),
      DatabaseService.count('requested_loan', { status: 'closed' })
    ]);

    const stats = {
      pending,
      approved,
      rejected,
      closed,
      total: pending + approved + rejected + closed
    };

    ResponseHelper.success(res, { stats }, 'تم جلب إحصائيات القروض بنجاح');
  });

  // Test endpoint for debugging
  static testError = asyncHandler(async (req, res) => {
    console.log('🧪 Test error endpoint called');
    throw new Error('Test error for debugging');
  });

  // Add new loan
  static addLoan = asyncHandler(async (req, res) => {
    const { userId, originalAmount, remainingAmount, monthlyInstallment, status, notes, requestDate } = req.body;
    const adminId = req.user.user_id;

    console.log('💰 Adding new loan with data:', {
      userId,
      originalAmount,
      remainingAmount,
      monthlyInstallment,
      status,
      notes,
      requestDate,
      adminId
    });

    // Validation
    if (!userId || !originalAmount || originalAmount <= 0) {
      return ResponseHelper.error(res, 'يرجى تقديم بيانات صحيحة للقرض', 400);
    }

    if (remainingAmount > originalAmount) {
      return ResponseHelper.error(res, 'المبلغ المتبقي لا يمكن أن يكون أكبر من المبلغ الأصلي', 400);
    }

    const { pool } = require('../config/database');
    const LoanCalculator = require('../models/LoanCalculator');
    
    let userCheck;
    try {
      // Check if user exists and get balance
      console.log('🔍 Checking user exists:', userId);
      [userCheck] = await pool.execute('SELECT user_id, balance FROM users WHERE user_id = ?', [userId]);
      if (userCheck.length === 0) {
        console.log('❌ User not found:', userId);
        return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
      }
      console.log('✅ User found:', userCheck[0]);
    } catch (dbError) {
      console.error('❌ Database error checking user:', dbError);
      throw dbError;
    }

    const user = userCheck[0];
    let finalInstallment = monthlyInstallment;

    // Calculate installment automatically if not provided
    if (!monthlyInstallment || monthlyInstallment <= 0) {
      const calculator = new LoanCalculator();
      const installmentData = calculator.calculateInstallment(originalAmount, user.balance);
      finalInstallment = installmentData.amount;
      console.log(`💰 Auto-calculated installment: ${finalInstallment} KWD for loan ${originalAmount} KWD`);
    } else if (monthlyInstallment < 20) {
      return ResponseHelper.error(res, 'الحد الأدنى للقسط الشهري هو 20 د.ك', 400);
    }

    // Insert the loan
    const [result] = await pool.execute(`
      INSERT INTO requested_loan (user_id, loan_amount, installment_amount, status, request_date, admin_id, notes, approval_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      originalAmount,
      finalInstallment,
      status,
      requestDate,
      adminId,
      notes || null,
      status === 'approved' ? new Date() : null
    ]);

    // If there's a remaining amount less than original, create payment records
    if (remainingAmount < originalAmount) {
      const paidAmount = originalAmount - remainingAmount;
      
      // Create a payment record for the already paid amount
      await pool.execute(`
        INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        result.insertId,
        paidAmount,
        'مبلغ مسدد مسبقاً عند إضافة القرض',
        'accepted',
        new Date(),
        adminId
      ]);
    }

    ResponseHelper.success(res, { loanId: result.insertId }, 'تم إضافة القرض بنجاح');
  });

  // Update existing loan
  static updateLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { loanAmount, installmentAmount, status, requestDate, notes, remainingAmount } = req.body;
    const adminId = req.user.user_id;

    // Validation
    if (!loanAmount || loanAmount <= 0) {
      return ResponseHelper.error(res, 'يرجى تقديم مبلغ قرض صحيح', 400);
    }

    if (remainingAmount !== undefined && (remainingAmount < 0 || remainingAmount > loanAmount)) {
      return ResponseHelper.error(res, 'المبلغ المتبقي يجب أن يكون بين 0 ومبلغ القرض', 400);
    }

    const { pool } = require('../config/database');
    const LoanCalculator = require('../models/LoanCalculator');
    
    // Check if loan exists and get current payments + user balance
    const [loanCheck] = await pool.execute(`
      SELECT rl.loan_id, rl.user_id, u.balance,
             COALESCE(SUM(l.credit), 0) as total_paid
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      LEFT JOIN loan l ON rl.loan_id = l.target_loan_id AND l.status = 'accepted'
      WHERE rl.loan_id = ?
      GROUP BY rl.loan_id, rl.user_id, u.balance
    `, [loanId]);
    
    if (loanCheck.length === 0) {
      return ResponseHelper.error(res, 'القرض غير موجود', 404);
    }

    const loan = loanCheck[0];
    const currentPaid = parseFloat(loan.total_paid);
    let finalInstallment = installmentAmount;

    // Calculate installment automatically if not provided
    if (!installmentAmount || installmentAmount <= 0) {
      const calculator = new LoanCalculator();
      const installmentData = calculator.calculateInstallment(loanAmount, loan.balance);
      finalInstallment = installmentData.amount;
      console.log(`💰 Auto-calculated installment for update: ${finalInstallment} KWD for loan ${loanAmount} KWD`);
    } else if (installmentAmount < 20) {
      return ResponseHelper.error(res, 'الحد الأدنى للقسط الشهري هو 20 د.ك', 400);
    }

    // Start transaction for complex operations
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update the loan basic info
      await connection.execute(`
        UPDATE requested_loan 
        SET loan_amount = ?, installment_amount = ?, status = ?, request_date = ?, notes = ?, admin_id = ?,
            approval_date = CASE WHEN status != 'approved' AND ? = 'approved' THEN NOW() ELSE approval_date END
        WHERE loan_id = ?
      `, [loanAmount, finalInstallment, status, requestDate, notes, adminId, status, loanId]);

      // Handle remaining amount adjustment if provided
      if (remainingAmount !== undefined) {
        const targetPaid = loanAmount - remainingAmount;
        const paidDifference = targetPaid - currentPaid;

        if (Math.abs(paidDifference) > 0.001) { // Only if there's a meaningful difference
          if (paidDifference > 0) {
            // Need to add more payment
            await connection.execute(`
              INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              loan.user_id,
              loanId,
              paidDifference,
              'تعديل المبلغ المتبقي - إضافة دفعة',
              'accepted',
              new Date(),
              adminId
            ]);
          } else {
            // Need to reduce payment (negative payment record)
            await connection.execute(`
              INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              loan.user_id,
              loanId,
              paidDifference, // This will be negative
              'تعديل المبلغ المتبقي - تعديل دفعة',
              'accepted',
              new Date(),
              adminId
            ]);
          }
        }
      }

      await connection.commit();
      ResponseHelper.success(res, {}, 'تم تحديث القرض والمبلغ المتبقي بنجاح');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // Delete loan
  static deleteLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { pool } = require('../config/database');
    
    // Check if loan exists
    const [loanCheck] = await pool.execute('SELECT loan_id, user_id FROM requested_loan WHERE loan_id = ?', [loanId]);
    if (loanCheck.length === 0) {
      return ResponseHelper.error(res, 'القرض غير موجود', 404);
    }

    const loan = loanCheck[0];

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete related loan payments first (due to foreign key constraints)
      await connection.execute('DELETE FROM loan WHERE target_loan_id = ?', [loanId]);
      
      // Delete the loan
      await connection.execute('DELETE FROM requested_loan WHERE loan_id = ?', [loanId]);
      
      await connection.commit();
      
      ResponseHelper.success(res, {}, 'تم حذف القرض وجميع المدفوعات المرتبطة به بنجاح');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
}

module.exports = LoanManagementController;