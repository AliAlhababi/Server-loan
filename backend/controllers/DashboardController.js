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
      banksSummary
    ] = await Promise.all([
      DatabaseService.count('users'),
      DatabaseService.count('requested_loan', { status: 'pending' }),
      DatabaseService.count('transaction', { status: 'pending' }),
      DatabaseService.count('loan', { status: 'pending' }),
      DatabaseService.count('family_delegations', { delegation_status: 'pending' }),
      this.getBanksSummary()
    ]);

    console.log('Dashboard stats:', {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments,
      pendingFamilyDelegations,
      banksSummary
    });

    const stats = {
      totalUsers,
      pendingLoans,
      pendingSubscriptions,
      pendingLoanPayments,
      pendingFamilyDelegations,
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
      
      // Calculate total active loans remaining amount
      const activeLoansQuery = `
        SELECT 
          COALESCE(SUM(rl.loan_amount - COALESCE(loan_payments.total_paid, 0)), 0) as totalActiveLoansRemaining
        FROM requested_loan rl
        LEFT JOIN (
          SELECT 
            target_loan_id,
            SUM(credit) as total_paid
          FROM loan 
          WHERE status = 'accepted'
          GROUP BY target_loan_id
        ) loan_payments ON rl.loan_id = loan_payments.target_loan_id
        WHERE rl.status = 'approved'
        AND (rl.loan_amount - COALESCE(loan_payments.total_paid, 0)) > 0
      `;
      
      // Calculate total pending loans
      const pendingLoansQuery = `
        SELECT COALESCE(SUM(loan_amount), 0) as totalPendingLoans
        FROM requested_loan
        WHERE status = 'pending'
      `;
      
      // Calculate total fees paid (10 KWD joining fees)
      const feesPaidQuery = `
        SELECT COALESCE(SUM(t.credit), 0) as totalFeesPaid
        FROM transaction t
        WHERE t.status = 'accepted' 
        AND t.transaction_type = 'subscription'
        AND t.credit = 10.00
      `;
      
      // Execute all queries in parallel
      const [
        subscriptionsResult,
        activeLoansResult,
        pendingLoansResult,
        feesPaidResult,
        banksSummary
      ] = await Promise.all([
        DatabaseService.executeQuery(subscriptionsQuery),
        DatabaseService.executeQuery(activeLoansQuery),
        DatabaseService.executeQuery(pendingLoansQuery),
        DatabaseService.executeQuery(feesPaidQuery),
        this.getBanksSummary()
      ]);
      
      const financialData = {
        totalSubscriptions: parseFloat(subscriptionsResult[0]?.totalSubscriptions || 0),
        totalActiveLoansRemaining: parseFloat(activeLoansResult[0]?.totalActiveLoansRemaining || 0),
        totalPendingLoans: parseFloat(pendingLoansResult[0]?.totalPendingLoans || 0),
        totalFeesPaid: parseFloat(feesPaidResult[0]?.totalFeesPaid || 0),
        totalBanks: banksSummary.totalBanks,
        totalBanksBalance: banksSummary.totalBalance
      };
      
      // Calculate the theoretical balance (subscriptions - active loans - pending loans + fees)
      const calculatedBalance = financialData.totalSubscriptions - 
                              financialData.totalActiveLoansRemaining - 
                              financialData.totalPendingLoans + 
                              financialData.totalFeesPaid;
      
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