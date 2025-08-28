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
      pendingLoanPayments,
      pendingFamilyDelegations,
      pendingTickets,
      banksSummary
    ] = await Promise.all([
      DatabaseService.count('users'),
      DatabaseService.count('requested_loan', { status: 'pending' }),
      DatabaseService.count('transaction', { status: 'pending' }),
      DatabaseService.count('loan', { status: 'pending' }),
      DatabaseService.count('family_delegations', { delegation_status: 'pending' }),
      this.getPendingTicketsCount(),
      this.getBanksSummary()
    ]);

    console.log('Dashboard stats:', {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments,
      pendingFamilyDelegations,
      pendingTickets,
      banksSummary
    });

    const stats = {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments,
      pendingFamilyDelegations,
      pendingTickets,
      totalBanks: banksSummary.totalBanks,
      totalBanksBalance: banksSummary.totalBalance,
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

  static async getPendingTicketsCount() {
    try {
      const { pool } = require('../config/database');
      const [result] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM tickets 
        WHERE status = 'open'
      `);
      return result[0].count;
    } catch (error) {
      console.error('Error counting pending tickets:', error);
      return 0;
    }
  }

  static async getBanksSummary() {
    const { pool } = require('../config/database');
    
    try {
      const [result] = await pool.execute(`
        SELECT 
          COUNT(*) as total_banks,
          COALESCE(SUM(balance), 0) as total_balance
        FROM banks 
        WHERE is_active = 1
      `);

      return {
        totalBanks: result[0].total_banks,
        totalBalance: parseFloat(result[0].total_balance)
      };
    } catch (error) {
      console.error('Error getting banks summary:', error);
      return {
        totalBanks: 0,
        totalBalance: 0
      };
    }
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

  static getFinancialSummary = asyncHandler(async (req, res) => {
    console.log('💰 Admin requesting financial summary...');
    
    try {
      // Calculate total subscriptions from all user balances
      const subscriptionsQuery = `
        SELECT COALESCE(SUM(balance), 0) as totalSubscriptions
        FROM users
      `;
      
      // Calculate total active loans remaining amount (exactly like سجل مدفوعات القروض)
      const activeLoansQuery = `
        SELECT 
          ROUND(COALESCE(SUM(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)), 0)) as totalActiveLoansRemaining
        FROM requested_loan rl
        LEFT JOIN (
          SELECT 
            target_loan_id,
            SUM(credit) as total_paid
          FROM loan 
          WHERE status = 'accepted'
          GROUP BY target_loan_id
        ) paid_summary ON rl.loan_id = paid_summary.target_loan_id
        WHERE rl.status = 'approved'
        AND ROUND(rl.loan_amount - COALESCE(paid_summary.total_paid, 0)) > 0
      `;
      
      // Execute queries in parallel
      const [
        subscriptionsResult,
        activeLoansResult,
        banksSummary
      ] = await Promise.all([
        DatabaseService.executeQuery(subscriptionsQuery),
        DatabaseService.executeQuery(activeLoansQuery),
        this.getBanksSummary()
      ]);
      
      const financialData = {
        totalSubscriptions: parseFloat(subscriptionsResult[0]?.totalSubscriptions || 0),
        totalActiveLoansRemaining: parseFloat(activeLoansResult[0]?.totalActiveLoansRemaining || 0),
        totalBanks: banksSummary.totalBanks,
        totalBanksBalance: banksSummary.totalBalance
      };
      
      // Simple calculation: Total user balances - Active loans remaining
      const calculatedBalance = financialData.totalSubscriptions - financialData.totalActiveLoansRemaining;
      
      // Debug logging to identify the issue
      console.log('🔍 Financial calculation debug:');
      console.log('- Total Subscriptions:', financialData.totalSubscriptions);
      console.log('- Total Active Loans Remaining:', financialData.totalActiveLoansRemaining);
      console.log('- Calculated Balance:', calculatedBalance);
      console.log('- Expected: 252290 - 236965 =', 252290 - 236965);
      
      financialData.calculatedBalance = calculatedBalance;
      financialData.banksDifference = financialData.totalBanksBalance - calculatedBalance;
      
      console.log('Financial summary data:', financialData);
      
      ResponseHelper.success(res, { data: financialData }, 'تم جلب الملخص المالي بنجاح');
      
    } catch (error) {
      console.error('Error calculating financial summary:', error);
      throw error;
    }
  });
}

module.exports = DashboardController;