const DatabaseService = require('../services/DatabaseService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');
const { closeLoan, getLoansEligibleForClosure, autoCloseFullyPaidLoans } = require('../database/update-loan-status');
const emailService = require('../services/emailService');
const UserModel = require('../models/UserModel');

class LoanManagementController {
  static loanAction = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { action, adminOverride } = req.body; // Add adminOverride option
    const adminId = req.user.user_id;
    
    console.log(`💰 Admin ${adminId} ${action}ing loan ${loanId}${adminOverride ? ' (ADMIN OVERRIDE)' : ''}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    // Verify admin has access to this loan's user
    // Admin ID 1 is the main admin and can approve all loans
    let loanQuery, queryParams;

    if (adminId === 1) {
      // Main admin can approve all loans
      loanQuery = `
        SELECT rl.loan_id, rl.user_id, u.approved_by_admin_id, u.Aname as user_name
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        WHERE rl.loan_id = ?
      `;
      queryParams = [loanId];
    } else {
      // Other admins can only approve loans for users they approved
      loanQuery = `
        SELECT rl.loan_id, rl.user_id, u.approved_by_admin_id, u.Aname as user_name
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        WHERE rl.loan_id = ? AND u.approved_by_admin_id = ?
      `;
      queryParams = [loanId, adminId];
    }

    const loanResults = await DatabaseService.executeQuery(loanQuery, queryParams);

    if (loanResults.length === 0) {
      return ResponseHelper.error(res, 'ليس لديك صلاحية للتعامل مع هذا الطلب', 403);
    }

    const loan = loanResults[0];
    const userId = loan.user_id;

    // SECURITY FIX: Check loan eligibility before approval
    if (action === 'approve') {
      console.log(`🔍 Checking loan eligibility for user ${userId} before approval...`);

      // Pass the loan ID to exclude it from active loan check (fixes circular logic error)
      const eligibility = await UserModel.checkLoanEligibility(userId, loanId);
      
      if (!eligibility.eligible && !adminOverride) {
        console.log(`❌ User ${userId} not eligible for loan:`, eligibility.reasons);
        
        // Log the violation attempt
        console.log(`🚨 SECURITY ALERT: Admin ${adminId} attempted to approve ineligible loan ${loanId} for user ${userId} (${loan.user_name})`);
        console.log(`🚨 Eligibility failures: ${eligibility.reasons.join(', ')}`);
        console.log(`🚨 Messages: ${eligibility.messages.join(', ')}`);
        
        return ResponseHelper.error(res, 
          `المستخدم غير مؤهل للقرض: ${eligibility.messages.join('، ')}. استخدم "تجاوز إداري" إذا كان ضرورياً.`, 
          400,
          { 
            eligibilityFailures: eligibility.reasons,
            eligibilityMessages: eligibility.messages,
            canOverride: true
          }
        );
      }
      
      if (adminOverride && !eligibility.eligible) {
        // Log admin override for audit trail
        console.log(`⚠️  ADMIN OVERRIDE: Admin ${adminId} overriding eligibility for loan ${loanId}`);
        console.log(`⚠️  Overridden failures: ${eligibility.reasons.join(', ')}`);
        
        // Insert audit log for admin override
        try {
          await DatabaseService.create('admin_overrides', {
            admin_id: adminId,
            user_id: userId,
            loan_id: loanId,
            override_type: 'loan_eligibility',
            original_failures: eligibility.reasons.join(','),
            override_reason: 'Admin manual override during loan approval',
            created_at: new Date()
          });
        } catch (auditError) {
          console.error('Failed to log admin override:', auditError);
          // Continue with approval but log the error
        }
      }
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
    // Enhanced query that detects multiple pending loans per user
    const query = `
      SELECT rl.*, u.Aname as full_name, u.user_type, u.balance as current_balance,
             COALESCE(paid_summary.total_paid, 0) as total_paid,
             ROUND(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) as remaining_amount,
             -- Add warning flags for multiple loans
             (SELECT COUNT(*) FROM requested_loan rl2 
              WHERE rl2.user_id = rl.user_id AND rl2.status = 'pending') as user_pending_loans_count,
             (SELECT GROUP_CONCAT(rl3.loan_id ORDER BY rl3.request_date) 
              FROM requested_loan rl3 
              WHERE rl3.user_id = rl.user_id AND rl3.status = 'pending' AND rl3.loan_id != rl.loan_id) as other_pending_loan_ids
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan 
        WHERE status = 'accepted'
        GROUP BY target_loan_id
      ) paid_summary ON rl.loan_id = paid_summary.target_loan_id
      WHERE rl.status = 'pending'
      ORDER BY 
        -- Show multiple loan cases first (critical alerts)
        (SELECT COUNT(*) FROM requested_loan rl2 WHERE rl2.user_id = rl.user_id AND rl2.status = 'pending') DESC,
        rl.request_date ASC
    `;

    const loans = await DatabaseService.executeQuery(query);
    
    // Detect and flag users with multiple pending loans
    const multipleLoanUsers = [];
    const processedUsers = new Set();
    
    loans.forEach(loan => {
      if (loan.user_pending_loans_count > 1 && !processedUsers.has(loan.user_id)) {
        multipleLoanUsers.push({
          user_id: loan.user_id,
          user_name: loan.full_name,
          pending_count: loan.user_pending_loans_count,
          loan_ids: [loan.loan_id, ...(loan.other_pending_loan_ids ? loan.other_pending_loan_ids.split(',').map(id => parseInt(id)) : [])],
          total_requested_amount: 0 // Will be calculated below
        });
        processedUsers.add(loan.user_id);
      }
    });
    
    // Calculate total requested amounts for multiple loan users
    for (const user of multipleLoanUsers) {
      user.total_requested_amount = loans
        .filter(loan => loan.user_id === user.user_id)
        .reduce((sum, loan) => sum + parseFloat(loan.loan_amount), 0);
    }
    
    console.log(`🚨 Found ${multipleLoanUsers.length} users with multiple pending loans:`, multipleLoanUsers);
    
    ResponseHelper.success(res, { 
      loans, 
      multipleLoanAlerts: multipleLoanUsers,
      hasMultipleLoanIssues: multipleLoanUsers.length > 0
    }, 'تم جلب طلبات القروض المعلقة بنجاح');
  });

  static getAllLoans = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting all loans...');
    
    const query = `
      SELECT rl.*, u.Aname as full_name, u.user_type, u.balance as current_balance,
             admin.Aname as admin_name,
             COALESCE(paid_summary.total_paid, 0) as total_paid,
             ROUND(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) as remaining_amount
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      LEFT JOIN users admin ON rl.admin_id = admin.user_id
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan 
        WHERE status = 'accepted'
        GROUP BY target_loan_id
      ) paid_summary ON rl.loan_id = paid_summary.target_loan_id
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
      return ResponseHelper.error(res, 'القرض لا يمكن أن يكون أكبر من المبلغ الأصلي', 400);
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
      return ResponseHelper.error(res, 'القرض يجب أن يكون بين 0 ومبلغ القرض', 400);
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
              'تعديل القرض - إضافة دفعة',
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
              'تعديل القرض - تعديل دفعة',
              'accepted',
              new Date(),
              adminId
            ]);
          }
        }
      }

      await connection.commit();
      ResponseHelper.success(res, {}, 'تم تحديث القرض بنجاح');
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

  // Get multiple loan alerts for admin dashboard
  static getMultipleLoanAlerts = asyncHandler(async (req, res) => {
    console.log('🚨 Admin requesting multiple loan alerts...');
    
    const query = `
      SELECT 
        u.user_id,
        u.Aname as user_name,
        u.balance as current_balance,
        COUNT(rl.loan_id) as pending_loan_count,
        GROUP_CONCAT(rl.loan_id ORDER BY rl.request_date) as loan_ids,
        GROUP_CONCAT(rl.loan_amount ORDER BY rl.request_date) as loan_amounts,
        GROUP_CONCAT(DATE_FORMAT(rl.request_date, '%Y-%m-%d %H:%i') ORDER BY rl.request_date) as request_dates,
        SUM(rl.loan_amount) as total_requested_amount,
        MIN(rl.request_date) as first_request_date,
        MAX(rl.request_date) as last_request_date,
        -- Time difference between first and last request in minutes
        TIMESTAMPDIFF(MINUTE, MIN(rl.request_date), MAX(rl.request_date)) as time_span_minutes
      FROM users u
      JOIN requested_loan rl ON u.user_id = rl.user_id
      WHERE rl.status = 'pending'
      GROUP BY u.user_id, u.Aname, u.balance
      HAVING COUNT(rl.loan_id) > 1
      ORDER BY 
        COUNT(rl.loan_id) DESC,  -- Most loans first
        time_span_minutes ASC,   -- Shortest time span first (likely race conditions)
        first_request_date ASC
    `;

    const alerts = await DatabaseService.executeQuery(query);
    
    // Process alerts to add helpful metadata
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      loan_ids_array: alert.loan_ids.split(',').map(id => parseInt(id)),
      loan_amounts_array: alert.loan_amounts.split(',').map(amount => parseFloat(amount)),
      request_dates_array: alert.request_dates.split(','),
      is_likely_race_condition: alert.time_span_minutes <= 5, // Requests within 5 minutes
      severity: alert.pending_loan_count >= 3 ? 'critical' : 'high',
      max_loan_allowed: Math.min(parseFloat(alert.current_balance) * 3, 10000)
    }));
    
    console.log(`🚨 Found ${alerts.length} users with multiple pending loans`);
    
    ResponseHelper.success(res, { 
      alerts: processedAlerts,
      total_affected_users: alerts.length,
      critical_cases: processedAlerts.filter(a => a.severity === 'critical').length,
      likely_race_conditions: processedAlerts.filter(a => a.is_likely_race_condition).length
    }, 'تم جلب تنبيهات القروض المتعددة بنجاح');
  });

  // Add new loan payment (Admin only)
  static addLoanPayment = asyncHandler(async (req, res) => {
    const { loanId, userId, amount, memo, status } = req.body;
    const adminId = req.user.user_id;

    // Validation
    if (!loanId || !userId || !amount || amount <= 0) {
      return ResponseHelper.error(res, 'يرجى تقديم بيانات صحيحة للدفعة', 400);
    }

    const { pool } = require('../config/database');

    // Check if loan exists
    const [loanCheck] = await pool.execute('SELECT loan_id, loan_amount FROM requested_loan WHERE loan_id = ?', [loanId]);
    if (loanCheck.length === 0) {
      return ResponseHelper.error(res, 'القرض غير موجود', 404);
    }

    // Check if user exists
    const [userCheck] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (userCheck.length === 0) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    // Insert loan payment
    const [result] = await pool.execute(`
      INSERT INTO loan (target_loan_id, user_id, credit, memo, status, admin_id, date)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [loanId, userId, amount, memo || 'دفعة قرض', status || 'accepted', adminId]);

    ResponseHelper.success(res, { paymentId: result.insertId }, 'تم إضافة دفعة القرض بنجاح');
  });

  // Update loan payment (Admin only)
  static updateLoanPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { amount, memo, status } = req.body;
    const adminId = req.user.user_id;

    // Validation
    if (!amount || amount <= 0) {
      return ResponseHelper.error(res, 'يرجى تقديم مبلغ صحيح للدفعة', 400);
    }

    const { pool } = require('../config/database');

    // Check if payment exists
    const [paymentCheck] = await pool.execute('SELECT * FROM loan WHERE loan_id = ?', [paymentId]);
    if (paymentCheck.length === 0) {
      return ResponseHelper.error(res, 'الدفعة غير موجودة', 404);
    }

    const currentPayment = paymentCheck[0];

    // Update loan payment
    await pool.execute(`
      UPDATE loan 
      SET credit = ?, memo = ?, status = ?, admin_id = ?
      WHERE loan_id = ?
    `, [amount, memo || currentPayment.memo, status || currentPayment.status, adminId, paymentId]);

    ResponseHelper.success(res, {}, 'تم تحديث دفعة القرض بنجاح');
  });

  // Delete loan payment (Admin only)
  static deleteLoanPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { pool } = require('../config/database');

    // Check if payment exists
    const [paymentCheck] = await pool.execute('SELECT * FROM loan WHERE loan_id = ?', [paymentId]);
    if (paymentCheck.length === 0) {
      return ResponseHelper.error(res, 'الدفعة غير موجودة', 404);
    }

    // Delete loan payment
    await pool.execute('DELETE FROM loan WHERE loan_id = ?', [paymentId]);

    ResponseHelper.success(res, {}, 'تم حذف دفعة القرض بنجاح');
  });

  // Create loan with override capability (Admin only - from user details page)
  static createLoanWithOverride = asyncHandler(async (req, res) => {
    try {
      const { userId, loanAmount, installmentAmount, loanStatus, overrideReason } = req.body;
      const adminId = req.user.user_id;

      console.log(`🔐 Admin ${adminId} creating loan for user ${userId}, amount: ${loanAmount}, installment: ${installmentAmount}, status: ${loanStatus || 'approved'}`);

    // Validation
    if (!userId || !loanAmount || !installmentAmount) {
      return ResponseHelper.error(res, 'يرجى تقديم جميع البيانات المطلوبة', 400);
    }

    if (loanAmount <= 0 || installmentAmount <= 0) {
      return ResponseHelper.error(res, 'المبلغ والقسط يجب أن يكونا أكبر من صفر', 400);
    }

    // Step 1: Check eligibility
    const eligibility = await UserModel.checkLoanEligibility(userId);

    // Step 2: Get user info
    const user = await UserModel.getUserById(userId);
    if (!user) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    // Step 2.5: Validate loan amount doesn't exceed maximum (even with override)
    const maxLoan = Math.min(user.balance * 3, 10000);
    if (loanAmount > maxLoan) {
      console.log(`❌ Loan amount ${loanAmount} exceeds maximum ${maxLoan} for user ${userId}`);
      return ResponseHelper.error(res,
        `مبلغ القرض يتجاوز الحد الأقصى المسموح. الحد الأقصى: ${maxLoan.toFixed(3)} دينار`,
        400,
        {
          maxLoan,
          requestedAmount: loanAmount,
          userBalance: user.balance
        }
      );
    }

    // Step 3: Validate override reason if needed
    if (!eligibility.eligible && !overrideReason) {
      console.log(`❌ User ${userId} not eligible and no override reason provided`);
      return ResponseHelper.error(res,
        'يجب إدخال سبب التجاوز الإداري', 400, {
          eligibilityFailures: eligibility.reasons,
          eligibilityMessages: eligibility.messages,
          requiresOverride: true
        }
      );
    }

    // Step 4: Create loan request with chosen status (approved or pending)
    const status = loanStatus || 'approved'; // Default to approved for backward compatibility
    const isApproved = status === 'approved';

    const loanData = {
      user_id: userId,
      loan_amount: loanAmount,
      installment_amount: installmentAmount,
      status: status,
      request_date: new Date(),
      approval_date: isApproved ? new Date() : null,
      admin_id: isApproved ? adminId : null,
      admin_override: !eligibility.eligible ? 1 : 0,
      override_reason: !eligibility.eligible ? overrideReason : null,
      notes: !eligibility.eligible
        ? `قرض ${isApproved ? 'معتمد' : 'معلق'} بتجاوز إداري: ${overrideReason}`
        : (isApproved ? `قرض معتمد من الإدارة` : `طلب قرض من الإدارة`)
    };

    const loanResult = await DatabaseService.create('requested_loan', loanData);
    const loanId = loanResult.insertId;

    console.log(`✅ Loan ${loanId} created for user ${userId} by admin ${adminId}`);

    // Step 5: Log override if eligibility failed
    if (!eligibility.eligible) {
      try {
        await DatabaseService.create('admin_overrides', {
          admin_id: adminId,
          user_id: userId,
          loan_id: loanId,
          override_type: 'loan_creation',
          failed_requirements: eligibility.reasons.join(','),
          override_reason: overrideReason,
          created_at: new Date()
        });

        console.log(`⚠️  ADMIN OVERRIDE LOGGED: Admin ${adminId} created loan ${loanId} for user ${userId}`);
        console.log(`⚠️  Failed requirements: ${eligibility.reasons.join(', ')}`);
        console.log(`⚠️  Reason: ${overrideReason}`);
      } catch (auditError) {
        console.error('❌ Failed to log admin override:', auditError);
        // Continue - don't fail loan creation if audit log fails
      }
    }

    // Step 6: Send email notification to user (only if approved)
    if (isApproved) {
      try {
        const adminUser = await UserModel.getUserById(adminId);
        const numberOfInstallments = Math.ceil(loanAmount / installmentAmount);

        await emailService.sendLoanStatusEmail(
          user.email,
          user.Aname,
          {
            loanAmount,
            installmentAmount,
            numberOfInstallments,
            requestDate: new Date(),
            notes: loanData.notes
          },
          'approved',
          adminUser?.Aname || 'الإدارة'
        );

        console.log(`✅ Loan approval email sent to ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send loan approval email:', emailError);
        // Don't fail the request if email fails
      }
    }

      const message = isApproved
        ? 'تم إنشاء القرض واعتماده بنجاح'
        : 'تم إنشاء طلب القرض بنجاح - يحتاج موافقة لاحقاً';

      ResponseHelper.success(res, { loanId, status }, message);
    } catch (error) {
      console.error('❌ Error in createLoanWithOverride:', error);
      console.error('Stack:', error.stack);
      return ResponseHelper.error(res, `خطأ في إنشاء القرض: ${error.message}`, 500);
    }
  });
}

module.exports = LoanManagementController;