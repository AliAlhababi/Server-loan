const BaseRepository = require('./BaseRepository');

class LoanRepository extends BaseRepository {
  constructor() {
    super('requested_loan');
  }

  async findActiveLoanByUserId(userId) {
    try {
      const [loans] = await this.pool.execute(`
        SELECT * FROM requested_loan 
        WHERE user_id = ? AND status IN ('pending', 'approved') 
        LIMIT 1
      `, [userId]);
      
      return loans[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب القرض النشط: ' + error.message);
    }
  }

  async findLastApprovedLoanByUserId(userId) {
    try {
      const [loans] = await this.pool.execute(`
        SELECT * FROM requested_loan 
        WHERE user_id = ? AND status = 'approved' 
        ORDER BY approval_date DESC 
        LIMIT 1
      `, [userId]);
      
      return loans[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب آخر قرض معتمد: ' + error.message);
    }
  }

  async findLoanHistory(userId) {
    try {
      const [loans] = await this.pool.execute(`
        SELECT rl.*, u.Aname as admin_name
        FROM requested_loan rl
        LEFT JOIN users u ON rl.admin_id = u.user_id
        WHERE rl.user_id = ?
        ORDER BY rl.request_date DESC
      `, [userId]);

      return loans;
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ القروض: ' + error.message);
    }
  }

  async findAllLoans(limit = 100) {
    try {
      const [loans] = await this.pool.execute(`
        SELECT rl.*, u.Aname as user_name, u.user_type, u.balance as current_balance,
               admin.Aname as admin_name
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        LEFT JOIN users admin ON rl.admin_id = admin.user_id
        ORDER BY rl.request_date DESC
        LIMIT ?
      `, [limit]);

      return loans;
    } catch (error) {
      throw new Error('خطأ في جلب قائمة القروض: ' + error.message);
    }
  }

  async findLoansByStatus(status, limit = 50) {
    try {
      const [loans] = await this.pool.execute(`
        SELECT rl.*, u.Aname as user_name, u.user_type, u.balance as current_balance
        FROM requested_loan rl
        JOIN users u ON rl.user_id = u.user_id
        WHERE rl.status = ?
        ORDER BY rl.request_date DESC
        LIMIT ?
      `, [status, limit]);

      return loans;
    } catch (error) {
      throw new Error('خطأ في جلب القروض حسب الحالة: ' + error.message);
    }
  }

  async createLoanRequest(loanData) {
    try {
      const {
        userId, requestedAmount, installmentAmount, 
        installmentPeriod, notes
      } = loanData;

      const [result] = await this.pool.execute(`
        INSERT INTO requested_loan (
          user_id, requested_amount, installment_amount, 
          installment_period, request_date, status, notes
        ) VALUES (?, ?, ?, ?, NOW(), 'pending', ?)
      `, [userId, requestedAmount, installmentAmount, installmentPeriod, notes]);

      return {
        loanId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error('خطأ في إنشاء طلب القرض: ' + error.message);
    }
  }

  async updateLoanStatus(loanId, status, adminId, reason = null) {
    try {
      const updateData = {
        status,
        admin_id: adminId,
        [`${status}_date`]: new Date()
      };

      if (reason) {
        updateData.rejection_reason = reason;
      }

      const result = await this.update(loanId, updateData, 'loan_id');
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث حالة القرض: ' + error.message);
    }
  }

  async approveLoan(loanId, adminId) {
    return this.updateLoanStatus(loanId, 'approved', adminId);
  }

  async rejectLoan(loanId, adminId, reason) {
    return this.updateLoanStatus(loanId, 'rejected', adminId, reason);
  }

  async getLoanStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as total_loans,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_loans,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_loans,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN requested_amount ELSE 0 END), 0) as total_approved_amount,
          COALESCE(AVG(CASE WHEN status = 'approved' THEN requested_amount ELSE NULL END), 0) as average_loan_amount
        FROM requested_loan
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات القروض: ' + error.message);
    }
  }

  async getMonthlyLoanStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as current_month_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as current_month_approvals,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN requested_amount ELSE 0 END), 0) as current_month_amount
        FROM requested_loan
        WHERE YEAR(request_date) = YEAR(CURDATE()) 
          AND MONTH(request_date) = MONTH(CURDATE())
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات القروض الشهرية: ' + error.message);
    }
  }

  async getActiveLoanDetails(userId) {
    try {
      const [loan] = await this.pool.execute(`
        SELECT 
          rl.*,
          COALESCE(SUM(l.credit), 0) as total_paid,
          (rl.requested_amount - COALESCE(SUM(l.credit), 0)) as remaining_amount
        FROM requested_loan rl
        LEFT JOIN loan l ON rl.loan_id = l.target_loan_id AND l.status = 'accepted'
        WHERE rl.user_id = ? AND rl.status = 'approved'
        GROUP BY rl.loan_id
        ORDER BY rl.approval_date DESC
        LIMIT 1
      `, [userId]);
      
      return loan[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب تفاصيل القرض النشط: ' + error.message);
    }
  }
}

module.exports = LoanRepository;