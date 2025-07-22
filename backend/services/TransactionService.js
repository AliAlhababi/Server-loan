const UserRepository = require('../repositories/UserRepository');
const TransactionRepository = require('../repositories/TransactionRepository');

class TransactionService {
  constructor() {
    this.userRepository = new UserRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async createDepositRequest(userId, amount, memo = null) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('مبلغ الإيداع يجب أن يكون أكبر من صفر');
      }

      // Get user to validate existence
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      // Get first admin for processing
      const admin = await this.userRepository.getFirstAdmin();
      if (!admin) {
        throw new Error('لا يوجد مدير متاح لمعالجة الطلب');
      }

      const transactionData = {
        userId,
        credit: amount,
        debit: null,
        memo: memo || `طلب إيداع ${amount} دينار`,
        transactionType: 'deposit',
        adminId: admin.user_id,
        status: 'pending'
      };

      const result = await this.transactionRepository.createTransaction(transactionData);

      return {
        success: true,
        transactionId: result.transactionId,
        message: 'تم تقديم طلب الإيداع بنجاح - بانتظار الموافقة'
      };

    } catch (error) {
      throw new Error('خطأ في إنشاء طلب الإيداع: ' + error.message);
    }
  }

  async createWithdrawalRequest(userId, amount, memo = null) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('مبلغ السحب يجب أن يكون أكبر من صفر');
      }

      // Get user and check balance
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const currentBalance = parseFloat(user.current_balance || user.balance || 0);
      if (currentBalance < amount) {
        throw new Error('الرصيد غير كافي للسحب المطلوب');
      }

      // Get first admin for processing
      const admin = await this.userRepository.getFirstAdmin();
      if (!admin) {
        throw new Error('لا يوجد مدير متاح لمعالجة الطلب');
      }

      const transactionData = {
        userId,
        credit: null,
        debit: amount,
        memo: memo || `طلب سحب ${amount} دينار`,
        transactionType: 'withdrawal',
        adminId: admin.user_id,
        status: 'pending'
      };

      const result = await this.transactionRepository.createTransaction(transactionData);

      return {
        success: true,
        transactionId: result.transactionId,
        message: 'تم تقديم طلب السحب بنجاح - بانتظار الموافقة'
      };

    } catch (error) {
      throw new Error('خطأ في إنشاء طلب السحب: ' + error.message);
    }
  }

  async approveTransaction(transactionId, adminId) {
    try {
      // Get transaction details first
      const transaction = await this.transactionRepository.findById(transactionId, 'transaction_id');
      if (!transaction) {
        throw new Error('المعاملة غير موجودة');
      }

      if (transaction.status !== 'pending') {
        throw new Error('المعاملة ليست بانتظار الموافقة');
      }

      // Start database transaction
      const connection = await this.transactionRepository.beginTransaction();
      
      try {
        // Update transaction status
        await connection.execute(
          'UPDATE transaction SET status = ?, admin_id = ? WHERE transaction_id = ?',
          ['accepted', adminId, transactionId]
        );

        // Update user balance
        if (transaction.credit && transaction.credit > 0) {
          // Deposit - add to balance
          await connection.execute(
            'UPDATE users SET balance = balance + ? WHERE user_id = ?',
            [transaction.credit, transaction.user_id]
          );
        } else if (transaction.debit && transaction.debit > 0) {
          // Withdrawal - subtract from balance
          await connection.execute(
            'UPDATE users SET balance = balance - ? WHERE user_id = ?',
            [transaction.debit, transaction.user_id]
          );
        }

        await this.transactionRepository.commitTransaction(connection);

        return {
          success: true,
          message: 'تم قبول المعاملة بنجاح وتحديث الرصيد'
        };

      } catch (error) {
        await this.transactionRepository.rollbackTransaction(connection);
        throw error;
      }

    } catch (error) {
      throw new Error('خطأ في الموافقة على المعاملة: ' + error.message);
    }
  }

  async rejectTransaction(transactionId, adminId, reason = null) {
    try {
      // Get transaction details first
      const transaction = await this.transactionRepository.findById(transactionId, 'transaction_id');
      if (!transaction) {
        throw new Error('المعاملة غير موجودة');
      }

      if (transaction.status !== 'pending') {
        throw new Error('المعاملة ليست بانتظار الموافقة');
      }

      const success = await this.transactionRepository.updateTransactionStatus(
        transactionId, 'rejected', adminId
      );

      if (!success) {
        throw new Error('فشل في رفض المعاملة');
      }

      return {
        success: true,
        message: 'تم رفض المعاملة'
      };

    } catch (error) {
      throw new Error('خطأ في رفض المعاملة: ' + error.message);
    }
  }

  async getAllTransactions(limit = 100) {
    try {
      return await this.transactionRepository.findAllTransactions(limit);
    } catch (error) {
      throw new Error('خطأ في جلب قائمة المعاملات: ' + error.message);
    }
  }

  async getTransactionsByStatus(status, limit = 50) {
    try {
      return await this.transactionRepository.findTransactionsByStatus(status, limit);
    } catch (error) {
      throw new Error('خطأ في جلب المعاملات حسب الحالة: ' + error.message);
    }
  }

  async getUserTransactions(userId, limit = 50) {
    try {
      return await this.transactionRepository.findTransactionsByUserId(userId, limit);
    } catch (error) {
      throw new Error('خطأ في جلب معاملات المستخدم: ' + error.message);
    }
  }

  async getUserSubscriptionStatus(userId, monthsToCheck = 24) {
    try {
      const subscriptionData = await this.transactionRepository.getSubscriptionPayments(userId, monthsToCheck);
      const requiredAmount = 240; // 240 KWD for all members over 24 months

      return {
        required: requiredAmount,
        paid: subscriptionData.totalPaid,
        pending: subscriptionData.totalPending,
        total: subscriptionData.totalPaid + subscriptionData.totalPending,
        shortfall: Math.max(0, requiredAmount - subscriptionData.totalPaid),
        isCompliant: subscriptionData.totalPaid >= requiredAmount,
        monthsChecked: subscriptionData.monthsChecked
      };

    } catch (error) {
      throw new Error('خطأ في جلب حالة الاشتراك: ' + error.message);
    }
  }

  async getTransactionStats() {
    try {
      const [generalStats, monthlyStats] = await Promise.all([
        this.transactionRepository.getTransactionStats(),
        this.transactionRepository.getMonthlyTransactionStats()
      ]);

      return {
        general: generalStats,
        monthly: monthlyStats
      };
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات المعاملات: ' + error.message);
    }
  }

  async getUserFinancialSummary(userId) {
    try {
      const [summary, user] = await Promise.all([
        this.transactionRepository.getUserFinancialSummary(userId),
        this.userRepository.findByUserId(userId)
      ]);

      return {
        currentBalance: parseFloat(user.current_balance || user.balance || 0),
        totalDeposits: parseFloat(summary.total_deposits || 0),
        totalWithdrawals: parseFloat(summary.total_withdrawals || 0),
        pendingTransactions: parseInt(summary.pending_count || 0),
        netFlow: parseFloat(summary.total_deposits || 0) - parseFloat(summary.total_withdrawals || 0)
      };

    } catch (error) {
      throw new Error('خطأ في جلب الملخص المالي: ' + error.message);
    }
  }
}

module.exports = TransactionService;