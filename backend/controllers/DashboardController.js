const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');

class DashboardController {
  static getDashboardStats = asyncHandler(async (req, res) => {
    console.log('📊 Admin requesting dashboard stats...');
    
    // Use Promise.all for better performance
    const [
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments
    ] = await Promise.all([
      DatabaseService.count('users'),
      DatabaseService.count('requested_loan', { status: 'pending' }),
      DatabaseService.count('transaction', { status: 'pending' }),
      DatabaseService.count('loan', { status: 'pending' })
    ]);

    console.log('Dashboard stats:', {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments
    });

    const stats = {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments,
      pendingTransactions: pendingSubscriptions + pendingLoanPayments, // Keep for backward compatibility
      pendingRegistrations: 0 // Keep for frontend compatibility
    };

    console.log('✅ Dashboard stats compiled:', stats);

    ResponseHelper.success(res, { stats }, 'تم جلب إحصائيات لوحة التحكم بنجاح');
  });

  static getDetailedStats = asyncHandler(async (req, res) => {
    const [userStats, loanStats, transactionStats] = await Promise.all([
      UserService.getUserStats(),
      this.getLoanStatsData(),
      this.getTransactionStatsData()
    ]);

    const detailedStats = {
      users: userStats,
      loans: loanStats,
      transactions: transactionStats,
      summary: {
        totalUsers: userStats.total,
        activeLoans: loanStats.approved,
        pendingActions: loanStats.pending + transactionStats.totalPending
      }
    };

    ResponseHelper.success(res, { stats: detailedStats }, 'تم جلب الإحصائيات التفصيلية بنجاح');
  });

  static async getLoanStatsData() {
    const [pending, approved, rejected, closed] = await Promise.all([
      DatabaseService.count('requested_loan', { status: 'pending' }),
      DatabaseService.count('requested_loan', { status: 'approved' }),
      DatabaseService.count('requested_loan', { status: 'rejected' }),
      DatabaseService.count('requested_loan', { status: 'closed' })
    ]);

    return { pending, approved, rejected, closed, total: pending + approved + rejected + closed };
  }

  static async getTransactionStatsData() {
    const [pendingTransactions, pendingLoanPayments, accepted, rejected] = await Promise.all([
      DatabaseService.count('transaction', { status: 'pending' }),
      DatabaseService.count('loan', { status: 'pending' }),
      DatabaseService.count('transaction', { status: 'accepted' }),
      DatabaseService.count('transaction', { status: 'rejected' })
    ]);

    return {
      pendingTransactions,
      pendingLoanPayments,
      totalPending: pendingTransactions + pendingLoanPayments,
      accepted,
      rejected
    };
  }

  static getRecentActivity = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent loans, transactions, and user registrations
    const [recentLoans, recentTransactions, recentUsers] = await Promise.all([
      DatabaseService.executeQuery(`
        SELECT 'loan' as type, rl.loan_id as id, rl.request_date as date, 
               u.Aname as user_name, rl.loan_amount as amount, rl.status
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        ORDER BY rl.request_date DESC
        LIMIT ?
      `, [limit]),
      
      DatabaseService.executeQuery(`
        SELECT 'transaction' as type, t.transaction_id as id, t.date, 
               u.Aname as user_name, t.credit as amount, t.status
        FROM transaction t
        JOIN users u ON t.user_id = u.user_id
        WHERE t.credit > 0
        ORDER BY t.date DESC
        LIMIT ?
      `, [limit]),
      
      DatabaseService.executeQuery(`
        SELECT 'user' as type, user_id as id, registration_date as date,
               Aname as user_name, NULL as amount, 'registered' as status
        FROM users
        ORDER BY registration_date DESC
        LIMIT ?
      `, [limit])
    ]);

    // Combine and sort by date
    const allActivity = [...recentLoans, ...recentTransactions, ...recentUsers]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    ResponseHelper.success(res, { activity: allActivity }, 'تم جلب النشاط الأخير بنجاح');
  });
}

module.exports = DashboardController;