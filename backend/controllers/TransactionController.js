const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');

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
    const adminId = req.user.userId;

    if (!['accept', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
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

    ResponseHelper.success(res, null,
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
      (rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) as remaining_amount
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

module.exports = TransactionController;