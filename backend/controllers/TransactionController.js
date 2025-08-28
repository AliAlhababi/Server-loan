const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const emailService = require('../services/emailService');

class TransactionController {
  static getPendingTransactions = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting pending transactions...');
    
    const query = `
      SELECT t.*, u.Aname as full_name
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.status = 'pending'
      ORDER BY t.date DESC
    `;
    
    const transactions = await DatabaseService.executeQuery(query);
    console.log(`💳 Found ${transactions.length} pending transactions`);
    
    ResponseHelper.success(res, { transactions }, 'تم جلب المعاملات المعلقة بنجاح');
  });

  static getAllTransactions = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting all transactions...');
    
    const query = `
      SELECT t.*, u.Aname as full_name
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      ORDER BY t.date DESC
    `;
    
    const transactions = await DatabaseService.executeQuery(query);
    console.log(`💳 Found ${transactions.length} transactions`);
    
    ResponseHelper.success(res, { transactions }, 'تم جلب جميع المعاملات بنجاح');
  });

  static transactionAction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user.user_id;

    if (!['accept', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    // Verify admin has access to this transaction's user
    const transactionQuery = `
      SELECT t.transaction_id, t.user_id, u.approved_by_admin_id 
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.transaction_id = ? AND u.approved_by_admin_id = ?
    `;
    
    const transactionResults = await DatabaseService.executeQuery(transactionQuery, [transactionId, adminId]);
    
    if (transactionResults.length === 0) {
      return ResponseHelper.error(res, 'ليس لديك صلاحية للتعامل مع هذه المعاملة', 403);
    }

    // Update transaction status
    const affectedRows = await DatabaseService.update('transaction',
      { 
        status: action === 'accept' ? 'accepted' : 'rejected',
        admin_id: adminId
      },
      { transaction_id: transactionId }
    );

    if (affectedRows === 0) {
      return ResponseHelper.notFound(res, 'المعاملة غير موجودة');
    }

    // If accepted, update user balance
    if (action === 'accept') {
      const transaction = await DatabaseService.findById('transaction', transactionId, 'transaction_id');
      
      if (transaction) {
        const { user_id, credit, debit } = transaction;
        const balanceChange = (credit || 0) - (debit || 0);
        
        await UserService.updateUserBalance(user_id, balanceChange, 'add');
      }
    }

    // Send email notification to user
    try {
      // Get transaction details with user info for email
      const transactionDetailsQuery = `
        SELECT t.*, u.Aname as full_name, u.email, admin.Aname as admin_name
        FROM transaction t
        JOIN users u ON t.user_id = u.user_id
        LEFT JOIN users admin ON t.admin_id = admin.user_id
        WHERE t.transaction_id = ?
      `;
      
      const transactionDetailsResults = await DatabaseService.executeQuery(transactionDetailsQuery, [transactionId]);
      
      if (transactionDetailsResults.length > 0) {
        const transaction = transactionDetailsResults[0];
        
        // Prepare transaction data for email
        const transactionData = {
          amount: (transaction.credit || 0) - (transaction.debit || 0),
          transaction_type: transaction.transaction_type,
          memo: transaction.memo,
          date: transaction.date
        };

        // Calculate total subscriptions if this is a subscription transaction
        let totalSubscriptions = null;
        if (action === 'accept' && transaction.transaction_type === 'subscription') {
          const subscriptionQuery = `
            SELECT SUM(credit) as total_subscriptions
            FROM transaction 
            WHERE user_id = ? AND transaction_type = 'subscription' AND status = 'accepted'
          `;
          const subscriptionResults = await DatabaseService.executeQuery(subscriptionQuery, [transaction.user_id]);
          totalSubscriptions = parseFloat(subscriptionResults[0]?.total_subscriptions || 0).toFixed(3);
        }
        
        // Send email notification
        await emailService.sendTransactionStatusEmail(
          transaction.email,
          transaction.full_name,
          transactionData,
          action === 'accept' ? 'accepted' : 'rejected',
          transaction.admin_name || 'الإدارة',
          totalSubscriptions
        );
        
        console.log(`✅ Transaction status email sent to ${transaction.email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send transaction status email:', emailError);
      // Don't fail the request if email fails
    }

    ResponseHelper.success(res, null,
      action === 'accept' ? 'تم قبول المعاملة' : 'تم رفض المعاملة'
    );
  });

  static loanPaymentAction = asyncHandler(async (req, res) => {
    const { loanPaymentId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user.user_id;

    // Support both 'approve'/'reject' and 'accept'/'reject' actions
    const normalizedAction = action === 'approve' ? 'accept' : action === 'reject' ? 'reject' : action;

    if (!['accept', 'reject'].includes(normalizedAction)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    console.log(`🔍 Admin ${adminId} attempting to ${normalizedAction} loan payment #${loanPaymentId}`);

    // Verify admin has access to this payment's user
    const accessQuery = `
      SELECT l.loan_id, l.user_id, u.approved_by_admin_id 
      FROM loan l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.loan_id = ? AND u.approved_by_admin_id = ?
    `;
    
    const accessResults = await DatabaseService.executeQuery(accessQuery, [loanPaymentId, adminId]);
    
    if (accessResults.length === 0) {
      return ResponseHelper.error(res, 'ليس لديك صلاحية للتعامل مع هذه الدفعة', 403);
    }

    // Get payment details before updating
    const paymentQuery = `
      SELECT l.*, rl.loan_amount, rl.user_id
      FROM loan l
      JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      WHERE l.loan_id = ?
    `;
    const paymentResults = await DatabaseService.executeQuery(paymentQuery, [loanPaymentId]);
    
    if (paymentResults.length === 0) {
      return ResponseHelper.notFound(res, 'دفعة القرض غير موجودة');
    }

    const payment = paymentResults[0];

    // Update loan payment status (loan table uses 'loan_id' as primary key)
    const affectedRows = await DatabaseService.update('loan',
      { 
        status: normalizedAction === 'accept' ? 'accepted' : 'rejected',
        admin_id: adminId
      },
      { loan_id: loanPaymentId }
    );

    if (affectedRows === 0) {
      return ResponseHelper.notFound(res, 'دفعة القرض غير موجودة');
    }

    // If approved, check if loan is fully paid and auto-close it
    if (normalizedAction === 'accept') {
      console.log(`✅ Loan payment #${loanPaymentId} approved by admin #${adminId}`);
      
      // Check if loan is fully paid
      const totalPaidQuery = `
        SELECT SUM(credit) as total_paid
        FROM loan
        WHERE target_loan_id = ? AND status = 'accepted'
      `;
      const totalPaidResults = await DatabaseService.executeQuery(totalPaidQuery, [payment.target_loan_id]);
      const totalPaid = parseFloat(totalPaidResults[0]?.total_paid || 0);
      const loanAmount = parseFloat(payment.loan_amount || 0);
      
      console.log(`💰 Loan #${payment.target_loan_id}: ${totalPaid.toFixed(3)} paid of ${loanAmount.toFixed(3)}`);
      console.log(`💰 Auto-closure check: ${totalPaid} >= ${loanAmount} = ${totalPaid >= loanAmount}`);
      
      // Auto-close loan if fully paid (with safety check)
      if (totalPaid >= loanAmount && loanAmount > 0) {
        // Double-check: ensure we're not closing incorrectly
        if (totalPaid >= loanAmount) {
          await DatabaseService.update('requested_loan',
            { 
              loan_closed_date: new Date()
            },
            { loan_id: payment.target_loan_id }
          );
          console.log(`🔒 Loan #${payment.target_loan_id} automatically closed - fully paid (${totalPaid.toFixed(3)}/${loanAmount.toFixed(3)})`);
        }
      } else if (totalPaid >= loanAmount) {
        console.log(`⚠️  Warning: Would have closed loan incorrectly (${totalPaid}/${loanAmount})`);
      }
    }

    // Send email notification to user
    try {
      // Get payment details with user info for email
      const paymentDetailsQuery = `
        SELECT l.*, rl.loan_amount, rl.loan_id as target_loan_id, 
               u.Aname as full_name, u.email, admin.Aname as admin_name
        FROM loan l
        JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        JOIN users u ON l.user_id = u.user_id
        LEFT JOIN users admin ON l.admin_id = admin.user_id
        WHERE l.loan_id = ?
      `;
      
      const paymentDetailsResults = await DatabaseService.executeQuery(paymentDetailsQuery, [loanPaymentId]);
      
      if (paymentDetailsResults.length > 0) {
        const payment = paymentDetailsResults[0];
        
        // Prepare payment data for email
        const paymentData = {
          amount: payment.credit,
          memo: payment.memo,
          date: payment.date
        };

        // Calculate loan summary for email
        let loanSummary = null;
        if (normalizedAction === 'accept') {
          const totalPaidQuery = `
            SELECT SUM(credit) as total_paid
            FROM loan
            WHERE target_loan_id = ? AND status = 'accepted'
          `;
          const totalPaidResults = await DatabaseService.executeQuery(totalPaidQuery, [payment.target_loan_id]);
          const totalPaid = parseFloat(totalPaidResults[0]?.total_paid || 0);
          const loanAmount = parseFloat(payment.loan_amount || 0);
          const remainingAmount = Math.max(0, loanAmount - totalPaid);
          const completionPercentage = loanAmount > 0 ? Math.round((totalPaid / loanAmount) * 100) : 0;
          
          loanSummary = {
            totalLoan: loanAmount.toFixed(3),
            totalPaid: totalPaid.toFixed(3),
            remainingAmount: remainingAmount.toFixed(3),
            completionPercentage: completionPercentage,
            isCompleted: totalPaid >= loanAmount,
            nextInstallment: remainingAmount > 0 ? Math.min(remainingAmount, payment.installment_amount || 20).toFixed(3) : '0.000'
          };
        }
        
        // Send email notification
        await emailService.sendLoanPaymentStatusEmail(
          payment.email,
          payment.full_name,
          paymentData,
          normalizedAction === 'accept' ? 'accepted' : 'rejected',
          payment.admin_name || 'الإدارة',
          loanSummary
        );
        
        console.log(`✅ Loan payment status email sent to ${payment.email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send loan payment status email:', emailError);
      // Don't fail the request if email fails
    }

    // Return updated loan summary for WhatsApp notification if approved
    let responseData = null;
    if (normalizedAction === 'accept') {
      // Get updated loan summary
      const updatedSummaryQuery = `
        SELECT 
          l.credit as payment_amount,
          rl.loan_amount,
          COALESCE(paid_summary.total_paid, 0) as total_paid_for_loan,
          ROUND(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) as remaining_amount
        FROM loan l
        JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        LEFT JOIN (
          SELECT target_loan_id, SUM(credit) as total_paid
          FROM loan
          WHERE status = 'accepted'
          GROUP BY target_loan_id
        ) paid_summary ON l.target_loan_id = paid_summary.target_loan_id
        WHERE l.loan_id = ?
      `;
      
      try {
        const summaryResults = await DatabaseService.executeQuery(updatedSummaryQuery, [loanPaymentId]);
        if (summaryResults.length > 0) {
          responseData = {
            loanSummary: summaryResults[0]
          };
        }
      } catch (summaryError) {
        console.error('Error fetching updated loan summary:', summaryError);
      }
    }

    ResponseHelper.success(res, responseData,
      normalizedAction === 'accept' ? 'تم قبول دفعة القرض' : 'تم رفض دفعة القرض'
    );
  });

  static getPendingLoanPayments = asyncHandler(async (req, res) => {
    const query = `
      SELECT l.*, u.Aname as full_name, rl.loan_amount, rl.installment_amount
      FROM loan l
      JOIN users u ON l.user_id = u.user_id
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      WHERE l.status = 'pending' AND l.target_loan_id IS NOT NULL
      ORDER BY l.date DESC
    `;

    const loanPayments = await DatabaseService.executeQuery(query);
    ResponseHelper.success(res, { loanPayments }, 'تم جلب دفعات القروض المعلقة بنجاح');
  });

  static getTransactionStats = asyncHandler(async (req, res) => {
    const [pendingTransactions, pendingLoanPayments, acceptedTransactions, rejectedTransactions] = await Promise.all([
      DatabaseService.count('transaction', { status: 'pending' }),
      DatabaseService.count('loan', { status: 'pending' }),
      DatabaseService.count('transaction', { status: 'accepted' }),
      DatabaseService.count('transaction', { status: 'rejected' })
    ]);

    const stats = {
      pendingTransactions,
      pendingLoanPayments,
      totalPending: pendingTransactions + pendingLoanPayments,
      accepted: acceptedTransactions,
      rejected: rejectedTransactions
    };

    ResponseHelper.success(res, { stats }, 'تم جلب إحصائيات المعاملات بنجاح');
  });

  static getTransactionDetails = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    
    const query = `
      SELECT t.*, u.Aname as user_name, a.Aname as admin_name
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN users a ON t.admin_id = a.user_id
      WHERE t.transaction_id = ?
    `;

    const results = await DatabaseService.executeQuery(query, [transactionId]);
    
    if (results.length === 0) {
      return ResponseHelper.notFound(res, 'المعاملة غير موجودة');
    }

    ResponseHelper.success(res, { transaction: results[0] }, 'تم جلب تفاصيل المعاملة بنجاح');
  });
}

// Get all loan payments for admin overview
TransactionController.getAllLoanPayments = asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      l.loan_id,
      l.user_id,
      u.Aname as user_name,
      l.target_loan_id,
      rl.loan_amount,
      rl.installment_amount,
      l.credit as payment_amount,
      l.memo,
      l.status,
      l.date as payment_date,
      admin.Aname as admin_name,
      COALESCE(paid_summary.total_paid, 0) as total_paid_for_loan,
      ROUND(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) as remaining_amount
    FROM loan l
    JOIN users u ON l.user_id = u.user_id
    JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
    LEFT JOIN users admin ON l.admin_id = admin.user_id
    LEFT JOIN (
      SELECT target_loan_id, SUM(credit) as total_paid
      FROM loan
      WHERE status = 'accepted'
      GROUP BY target_loan_id
    ) paid_summary ON l.target_loan_id = paid_summary.target_loan_id
    ORDER BY l.date DESC
  `;

  const loanPayments = await DatabaseService.executeQuery(query);

  ResponseHelper.success(res, { 
    loanPayments,
    total: loanPayments.length 
  }, 'تم جلب جميع مدفوعات القروض بنجاح');
});

// Add new transaction (Admin only)
TransactionController.addTransaction = asyncHandler(async (req, res) => {
  const { userId, amount, type, memo, transactionType, status } = req.body;
  const adminId = req.user.user_id;

  // Validation
  if (!userId || !amount || amount <= 0 || !type) {
    return ResponseHelper.error(res, 'يرجى تقديم بيانات صحيحة للمعاملة', 400);
  }

  const { pool } = require('../config/database');

  // Check if user exists
  const [userCheck] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [userId]);
  if (userCheck.length === 0) {
    return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
  }

  let credit = 0;
  let debit = 0;

  if (type === 'credit') {
    credit = amount;
  } else if (type === 'debit') {
    debit = amount;
  } else {
    return ResponseHelper.error(res, 'نوع المعاملة يجب أن يكون credit أو debit', 400);
  }

  // Insert transaction
  const [result] = await pool.execute(`
    INSERT INTO transaction (user_id, credit, debit, memo, status, transaction_type, admin_id, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `, [userId, credit, debit, memo || '', status || 'accepted', transactionType || 'subscription', adminId]);

  // If transaction is accepted and affects balance, update user balance
  if ((status || 'accepted') === 'accepted') {
    const balanceChange = credit - debit;
    await pool.execute(
      'UPDATE users SET balance = balance + ? WHERE user_id = ?',
      [balanceChange, userId]
    );
  }

  ResponseHelper.success(res, { transactionId: result.insertId }, 'تم إضافة المعاملة بنجاح');
});

// Update transaction (Admin only)
TransactionController.updateTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { amount, type, memo, transactionType, status } = req.body;
  const adminId = req.user.user_id;

  // Validation
  if (!amount || amount <= 0 || !type) {
    return ResponseHelper.error(res, 'يرجى تقديم بيانات صحيحة للمعاملة', 400);
  }

  const { pool } = require('../config/database');

  // Get current transaction
  const [currentTx] = await pool.execute('SELECT * FROM transaction WHERE transaction_id = ?', [transactionId]);
  if (currentTx.length === 0) {
    return ResponseHelper.error(res, 'المعاملة غير موجودة', 404);
  }

  const oldTx = currentTx[0];

  let credit = 0;
  let debit = 0;

  if (type === 'credit') {
    credit = amount;
  } else if (type === 'debit') {
    debit = amount;
  } else {
    return ResponseHelper.error(res, 'نوع المعاملة يجب أن يكون credit أو debit', 400);
  }

  // Start transaction for balance updates
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // If old transaction was accepted, reverse its balance effect
    if (oldTx.status === 'accepted') {
      const oldBalanceChange = (parseFloat(oldTx.credit) || 0) - (parseFloat(oldTx.debit) || 0);
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE user_id = ?',
        [oldBalanceChange, oldTx.user_id]
      );
    }

    // Update transaction
    await connection.execute(`
      UPDATE transaction 
      SET credit = ?, debit = ?, memo = ?, transaction_type = ?, status = ?, admin_id = ?
      WHERE transaction_id = ?
    `, [credit, debit, memo || oldTx.memo, transactionType || oldTx.transaction_type, status || oldTx.status, adminId, transactionId]);

    // If new transaction status is accepted, apply new balance effect
    if ((status || oldTx.status) === 'accepted') {
      const newBalanceChange = credit - debit;
      await connection.execute(
        'UPDATE users SET balance = balance + ? WHERE user_id = ?',
        [newBalanceChange, oldTx.user_id]
      );
    }

    await connection.commit();
    ResponseHelper.success(res, {}, 'تم تحديث المعاملة بنجاح');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Delete transaction (Admin only)
TransactionController.deleteTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { pool } = require('../config/database');

  // Get transaction details before deletion
  const [transactions] = await pool.execute('SELECT * FROM transaction WHERE transaction_id = ?', [transactionId]);
  if (transactions.length === 0) {
    return ResponseHelper.error(res, 'المعاملة غير موجودة', 404);
  }

  const transaction = transactions[0];

  // Start transaction for balance updates
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // If transaction was accepted, reverse its balance effect
    if (transaction.status === 'accepted') {
      const balanceChange = (parseFloat(transaction.credit) || 0) - (parseFloat(transaction.debit) || 0);
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE user_id = ?',
        [balanceChange, transaction.user_id]
      );
    }

    // Delete transaction
    await connection.execute('DELETE FROM transaction WHERE transaction_id = ?', [transactionId]);

    await connection.commit();
    ResponseHelper.success(res, {}, 'تم حذف المعاملة بنجاح');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = TransactionController;