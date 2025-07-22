const UserService = require('./UserService');
const LoanService = require('./LoanService');
const TransactionService = require('./TransactionService');
const UserRepository = require('../repositories/UserRepository');
const LoanRepository = require('../repositories/LoanRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const LoanPaymentRepository = require('../repositories/LoanPaymentRepository');

class AdminService {
  constructor() {
    this.userService = new UserService();
    this.loanService = new LoanService();
    this.transactionService = new TransactionService();
    this.userRepository = new UserRepository();
    this.loanRepository = new LoanRepository();
    this.transactionRepository = new TransactionRepository();
    this.loanPaymentRepository = new LoanPaymentRepository();
  }

  async getDashboardStats() {
    try {
      const [userStats, loanStats, transactionStats] = await Promise.all([
        this.userService.getUserStats(),
        this.loanService.getLoanStats(),
        this.transactionService.getTransactionStats()
      ]);

      return {
        users: userStats,
        loans: loanStats.loans,
        loanPayments: loanStats.payments,
        transactions: transactionStats.general,
        monthly: {
          loans: loanStats.monthly,
          transactions: transactionStats.monthly
        }
      };

    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات لوحة التحكم: ' + error.message);
    }
  }

  async getAllUsersReport() {
    try {
      const users = await this.userService.getAllUsers(200);
      const stats = await this.userService.getUserStats();

      return {
        users,
        statistics: stats
      };

    } catch (error) {
      throw new Error('خطأ في جلب تقرير المستخدمين: ' + error.message);
    }
  }

  async getAllLoansReport() {
    try {
      const loans = await this.loanService.getAllLoans(200);
      const stats = await this.loanService.getLoanStats();

      return {
        loans,
        statistics: stats.loans
      };

    } catch (error) {
      throw new Error('خطأ في جلب تقرير القروض: ' + error.message);
    }
  }

  async getAllTransactionsReport() {
    try {
      const transactions = await this.transactionService.getAllTransactions(200);
      const stats = await this.transactionService.getTransactionStats();

      return {
        transactions,
        statistics: stats.general
      };

    } catch (error) {
      throw new Error('خطأ في جلب تقرير المعاملات: ' + error.message);
    }
  }

  async getFinancialSummaryReport() {
    try {
      const [userStats, loanStats, transactionStats, loanPaymentStats] = await Promise.all([
        this.userRepository.getUserStats(),
        this.loanRepository.getLoanStats(),
        this.transactionRepository.getTransactionStats(),
        this.loanPaymentRepository.getLoanPaymentStats()
      ]);

      // Calculate financial health metrics
      const totalSystemBalance = await this.userRepository.executeQuery(
        'SELECT SUM(balance) as total_balance FROM users WHERE user_type != "admin"'
      );

      const summary = {
        users: {
          total: userStats.total_users,
          employees: userStats.employees,
          students: userStats.students,
          blocked: userStats.blocked_users,
          approvedFees: userStats.approved_fees
        },
        loans: {
          total: loanStats.total_loans,
          pending: loanStats.pending_loans,
          approved: loanStats.approved_loans,
          rejected: loanStats.rejected_loans,
          totalApprovedAmount: parseFloat(loanStats.total_approved_amount || 0),
          averageLoanAmount: parseFloat(loanStats.average_loan_amount || 0)
        },
        transactions: {
          total: transactionStats.total_transactions,
          pending: transactionStats.pending_transactions,
          accepted: transactionStats.accepted_transactions,
          rejected: transactionStats.rejected_transactions,
          totalCredits: parseFloat(transactionStats.total_credits || 0),
          totalDebits: parseFloat(transactionStats.total_debits || 0)
        },
        loanPayments: {
          total: loanPaymentStats.total_payments,
          pending: loanPaymentStats.pending_payments,
          accepted: loanPaymentStats.accepted_payments,
          totalPaidAmount: parseFloat(loanPaymentStats.total_paid_amount || 0)
        },
        financial: {
          totalSystemBalance: parseFloat(totalSystemBalance[0]?.total_balance || 0),
          netTransactionFlow: parseFloat(transactionStats.total_credits || 0) - parseFloat(transactionStats.total_debits || 0),
          outstandingLoans: parseFloat(loanStats.total_approved_amount || 0) - parseFloat(loanPaymentStats.total_paid_amount || 0)
        }
      };

      return summary;

    } catch (error) {
      throw new Error('خطأ في جلب التقرير المالي الشامل: ' + error.message);
    }
  }

  async getMonthlyReport() {
    try {
      const [monthlyLoanStats, monthlyTransactionStats] = await Promise.all([
        this.loanRepository.getMonthlyLoanStats(),
        this.transactionRepository.getMonthlyTransactionStats()
      ]);

      // Get monthly user registrations
      const monthlyUserStats = await this.userRepository.executeQuery(`
        SELECT COUNT(*) as current_month_registrations
        FROM users 
        WHERE YEAR(registration_date) = YEAR(CURDATE()) 
          AND MONTH(registration_date) = MONTH(CURDATE())
          AND user_type != 'admin'
      `);

      return {
        loans: monthlyLoanStats,
        transactions: monthlyTransactionStats,
        users: {
          registrations: parseInt(monthlyUserStats[0]?.current_month_registrations || 0)
        }
      };

    } catch (error) {
      throw new Error('خطأ في جلب التقرير الشهري: ' + error.message);
    }
  }

  async getActiveLoansReport() {
    try {
      const activeLoans = await this.loanRepository.findLoansByStatus('approved', 100);
      
      // Get payment details for each active loan
      const loansWithPayments = await Promise.all(
        activeLoans.map(async (loan) => {
          const totalPaid = await this.loanPaymentRepository.getTotalPaidForLoan(loan.loan_id);
          const remainingAmount = loan.requested_amount - totalPaid;
          
          return {
            ...loan,
            total_paid: totalPaid,
            remaining_amount: remainingAmount,
            payment_progress: totalPaid / loan.requested_amount * 100,
            is_completed: remainingAmount <= 0
          };
        })
      );

      // Calculate summary statistics
      const totalActiveLoans = loansWithPayments.length;
      const totalLoanAmount = loansWithPayments.reduce((sum, loan) => sum + loan.requested_amount, 0);
      const totalPaidAmount = loansWithPayments.reduce((sum, loan) => sum + loan.total_paid, 0);
      const totalRemainingAmount = loansWithPayments.reduce((sum, loan) => sum + Math.max(0, loan.remaining_amount), 0);
      const completedLoans = loansWithPayments.filter(loan => loan.is_completed).length;

      return {
        loans: loansWithPayments,
        summary: {
          totalActiveLoans,
          completedLoans,
          inProgressLoans: totalActiveLoans - completedLoans,
          totalLoanAmount,
          totalPaidAmount,
          totalRemainingAmount,
          averageCompletionRate: totalActiveLoans > 0 ? (totalPaidAmount / totalLoanAmount * 100) : 0
        }
      };

    } catch (error) {
      throw new Error('خطأ في جلب تقرير القروض النشطة: ' + error.message);
    }
  }

  async processLoanAction(loanId, action, adminId, reason = null) {
    try {
      if (action === 'approve') {
        return await this.loanService.approveLoan(loanId, adminId);
      } else if (action === 'reject') {
        if (!reason) {
          throw new Error('سبب الرفض مطلوب');
        }
        return await this.loanService.rejectLoan(loanId, adminId, reason);
      } else {
        throw new Error('إجراء غير صحيح');
      }
    } catch (error) {
      throw new Error('خطأ في معالجة طلب القرض: ' + error.message);
    }
  }

  async processTransactionAction(transactionId, action, adminId) {
    try {
      if (action === 'approve') {
        return await this.transactionService.approveTransaction(transactionId, adminId);
      } else if (action === 'reject') {
        return await this.transactionService.rejectTransaction(transactionId, adminId);
      } else {
        throw new Error('إجراء غير صحيح');
      }
    } catch (error) {
      throw new Error('خطأ في معالجة المعاملة: ' + error.message);
    }
  }

  async getUserDetails(userId) {
    try {
      const [user, transactions, loanHistory, loanPayments, subscriptionStatus, activeLoan] = await Promise.all([
        this.userService.getUserById(userId),
        this.userService.getUserTransactions(userId, 20),
        this.loanService.getUserLoanHistory(userId),
        this.loanService.getUserLoanPayments(userId, 20),
        this.transactionService.getUserSubscriptionStatus(userId),
        this.loanService.getActiveLoanDetails(userId)
      ]);

      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      return {
        user,
        transactions,
        loanHistory,
        loanPayments,
        subscriptionStatus,
        activeLoan,
        financialSummary: await this.transactionService.getUserFinancialSummary(userId)
      };

    } catch (error) {
      throw new Error('خطأ في جلب تفاصيل المستخدم: ' + error.message);
    }
  }

  async exportSystemData() {
    try {
      const [users, loans, transactions, loanPayments] = await Promise.all([
        this.userRepository.findAllUsers(1000),
        this.loanRepository.findAllLoans(1000),
        this.transactionRepository.findAllTransactions(1000),
        this.loanPaymentRepository.findAllLoanPayments(1000)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        summary: {
          totalUsers: users.length,
          totalLoans: loans.length,
          totalTransactions: transactions.length,
          totalLoanPayments: loanPayments.length
        },
        data: {
          users,
          loans,
          transactions,
          loanPayments
        }
      };

      return exportData;

    } catch (error) {
      throw new Error('خطأ في تصدير بيانات النظام: ' + error.message);
    }
  }
}

module.exports = AdminService;