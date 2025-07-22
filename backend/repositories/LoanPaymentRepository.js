const BaseRepository = require('./BaseRepository');

class LoanPaymentRepository extends BaseRepository {
  constructor() {
    super('loan');
  }

  async findLoanPaymentsByUserId(userId, limit = 50) {
    try {
      const [loanPayments] = await this.pool.execute(`
        SELECT l.*, u.Aname as admin_name, rl.loan_amount
        FROM loan l
        LEFT JOIN users u ON l.admin_id = u.user_id
        LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        WHERE l.user_id = ? AND l.target_loan_id IS NOT NULL AND l.status = 'accepted'
        ORDER BY l.date DESC
        LIMIT ?
      `, [userId, limit]);

      return loanPayments;
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ تسديدات القروض: ' + error.message);
    }
  }

  async findAllLoanPayments(limit = 100) {
    try {
      const [payments] = await this.pool.execute(`
        SELECT l.*, u.Aname as user_name, admin.Aname as admin_name,
               rl.loan_id as loan_request_id, rl.requested_amount
        FROM loan l
        JOIN users u ON l.user_id = u.user_id
        LEFT JOIN users admin ON l.admin_id = admin.user_id
        LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        WHERE l.target_loan_id IS NOT NULL
        ORDER BY l.date DESC
        LIMIT ?
      `, [limit]);

      return payments;
    } catch (error) {
      throw new Error('خطأ في جلب قائمة تسديدات القروض: ' + error.message);
    }
  }

  async getTotalPaidForLoan(loanId) {
    try {
      const [result] = await this.pool.execute(`
        SELECT COALESCE(SUM(credit), 0) as total_paid
        FROM loan 
        WHERE target_loan_id = ? AND status = 'accepted'
      `, [loanId]);

      return parseFloat(result[0].total_paid || 0);
    } catch (error) {
      throw new Error('خطأ في جلب إجمالي المدفوع للقرض: ' + error.message);
    }
  }

  async createLoanPayment(paymentData) {
    try {
      const {
        userId, targetLoanId, amount, memo, 
        adminId, status = 'pending'
      } = paymentData;

      const [result] = await this.pool.execute(`
        INSERT INTO loan (
          user_id, target_loan_id, credit, memo,
          admin_id, status, date
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [userId, targetLoanId, amount, memo, adminId, status]);

      return {
        paymentId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error('خطأ في إنشاء دفعة القرض: ' + error.message);
    }
  }

  async updatePaymentStatus(paymentId, status, adminId) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE loan SET status = ?, admin_id = ? WHERE loan_id = ?',
        [status, adminId, paymentId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث حالة دفعة القرض: ' + error.message);
    }
  }

  async getLoanPaymentStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_payments,
          COALESCE(SUM(CASE WHEN status = 'accepted' THEN credit ELSE 0 END), 0) as total_paid_amount
        FROM loan
        WHERE target_loan_id IS NOT NULL
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات تسديدات القروض: ' + error.message);
    }
  }

  async getActiveLoanProgress(userId) {
    try {
      const [progress] = await this.pool.execute(`
        SELECT 
          rl.loan_id,
          rl.requested_amount,
          rl.installment_amount,
          COALESCE(SUM(l.credit), 0) as total_paid,
          (rl.requested_amount - COALESCE(SUM(l.credit), 0)) as remaining_amount,
          CASE 
            WHEN (rl.requested_amount - COALESCE(SUM(l.credit), 0)) <= 0 THEN 'completed'
            ELSE 'active'
          END as payment_status
        FROM requested_loan rl
        LEFT JOIN loan l ON rl.loan_id = l.target_loan_id AND l.status = 'accepted'
        WHERE rl.user_id = ? AND rl.status = 'approved'
        GROUP BY rl.loan_id
        ORDER BY rl.approval_date DESC
        LIMIT 1
      `, [userId]);

      return progress[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب تقدم تسديد القرض: ' + error.message);
    }
  }
}

module.exports = LoanPaymentRepository;