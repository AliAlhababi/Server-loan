const BaseRepository = require('./BaseRepository');

class TransactionRepository extends BaseRepository {
  constructor() {
    super('transaction');
  }

  async findTransactionsByUserId(userId, limit = 50) {
    try {
      const [transactions] = await this.pool.execute(`
        SELECT t.*, u.Aname as admin_name
        FROM transaction t
        LEFT JOIN users u ON t.admin_id = u.user_id
        WHERE t.user_id = ?
        ORDER BY t.date DESC
        LIMIT ?
      `, [userId, limit]);

      return transactions;
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ المعاملات: ' + error.message);
    }
  }

  async findAllTransactions(limit = 100) {
    try {
      const [transactions] = await this.pool.execute(`
        SELECT t.*, u.Aname as user_name, admin.Aname as admin_name
        FROM transaction t
        JOIN users u ON t.user_id = u.user_id
        LEFT JOIN users admin ON t.admin_id = admin.user_id
        ORDER BY t.date DESC
        LIMIT ?
      `, [limit]);

      return transactions;
    } catch (error) {
      throw new Error('خطأ في جلب قائمة المعاملات: ' + error.message);
    }
  }

  async findTransactionsByStatus(status, limit = 50) {
    try {
      const [transactions] = await this.pool.execute(`
        SELECT t.*, u.Aname as user_name
        FROM transaction t
        JOIN users u ON t.user_id = u.user_id
        WHERE t.status = ?
        ORDER BY t.date DESC
        LIMIT ?
      `, [status, limit]);

      return transactions;
    } catch (error) {
      throw new Error('خطأ في جلب المعاملات حسب الحالة: ' + error.message);
    }
  }

  async getSubscriptionPayments(userId, monthsToCheck = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToCheck);

      const [accepted] = await this.pool.execute(`
        SELECT COALESCE(SUM(credit), 0) as total_paid
        FROM transaction 
        WHERE user_id = ? 
          AND status = 'accepted' 
          AND credit > 0 
          AND date >= ?
          AND transaction_type IN ('subscription', 'deposit')
      `, [userId, cutoffDate]);

      const [pending] = await this.pool.execute(`
        SELECT COALESCE(SUM(credit), 0) as pending_paid
        FROM transaction 
        WHERE user_id = ? 
          AND status = 'pending' 
          AND credit > 0 
          AND date >= ?
          AND transaction_type IN ('subscription', 'deposit')
      `, [userId, cutoffDate]);

      return {
        totalPaid: parseFloat(accepted[0].total_paid || 0),
        totalPending: parseFloat(pending[0].pending_paid || 0),
        monthsChecked: monthsToCheck
      };
    } catch (error) {
      throw new Error('خطأ في جلب مدفوعات الاشتراك: ' + error.message);
    }
  }

  async createTransaction(transactionData) {
    try {
      const {
        userId, credit, debit, memo, transactionType, 
        adminId, status = 'pending'
      } = transactionData;

      const [result] = await this.pool.execute(`
        INSERT INTO transaction (
          user_id, credit, debit, memo, transaction_type,
          admin_id, status, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [userId, credit, debit, memo, transactionType, adminId, status]);

      return {
        transactionId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error('خطأ في إنشاء المعاملة: ' + error.message);
    }
  }

  async updateTransactionStatus(transactionId, status, adminId) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE transaction SET status = ?, admin_id = ? WHERE transaction_id = ?',
        [status, adminId, transactionId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث حالة المعاملة: ' + error.message);
    }
  }

  async getTransactionStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_transactions,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_transactions,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_transactions,
          COALESCE(SUM(CASE WHEN status = 'accepted' AND credit > 0 THEN credit ELSE 0 END), 0) as total_credits,
          COALESCE(SUM(CASE WHEN status = 'accepted' AND debit > 0 THEN debit ELSE 0 END), 0) as total_debits
        FROM transaction
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات المعاملات: ' + error.message);
    }
  }

  async getMonthlyTransactionStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as current_month_transactions,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as current_month_accepted,
          COALESCE(SUM(CASE WHEN status = 'accepted' AND credit > 0 THEN credit ELSE 0 END), 0) as current_month_credits,
          COALESCE(SUM(CASE WHEN status = 'accepted' AND debit > 0 THEN debit ELSE 0 END), 0) as current_month_debits
        FROM transaction
        WHERE YEAR(date) = YEAR(CURDATE()) 
          AND MONTH(date) = MONTH(CURDATE())
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات المعاملات الشهرية: ' + error.message);
    }
  }

  async getUserFinancialSummary(userId) {
    try {
      const [summary] = await this.pool.execute(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'accepted' AND credit > 0 THEN credit ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN status = 'accepted' AND debit > 0 THEN debit ELSE 0 END), 0) as total_withdrawals,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM transaction
        WHERE user_id = ?
      `, [userId]);
      
      return summary[0];
    } catch (error) {
      throw new Error('خطأ في جلب الملخص المالي: ' + error.message);
    }
  }
}

module.exports = TransactionRepository;