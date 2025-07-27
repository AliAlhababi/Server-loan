const DatabaseService = require('../services/DatabaseService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');
const { closeLoan, getLoansEligibleForClosure, autoCloseFullyPaidLoans } = require('../database/update-loan-status');

class LoanManagementController {
  static loanAction = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { action } = req.body;
    
    console.log(`💰 Admin ${action}ing loan ${loanId}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const affectedRows = await DatabaseService.update('requested_loan',
      { status },
      { loan_id: loanId }
    );

    if (affectedRows === 0) {
      return ResponseHelper.notFound(res, 'طلب القرض غير موجود');
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
}

module.exports = LoanManagementController;