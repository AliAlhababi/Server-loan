const { pool } = require('../config/database');

async function closeLoan(loanId, closureDate = new Date()) {
  try {
    const [result] = await pool.execute(`
      UPDATE requested_loan 
      SET status = 'closed', loan_closed_date = ?
      WHERE loan_id = ? AND status = 'approved'
    `, [closureDate, loanId]);

    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`فشل في إغلاق القرض: ${error.message}`);
  }
}

async function getLoansEligibleForClosure(userId = null) {
  try {
    let query = `
      SELECT 
        rl.loan_id,
        rl.user_id,
        rl.loan_amount,
        rl.installment_amount,
        u.Aname as user_name,
        COALESCE(SUM(l.credit), 0) as total_paid,
        (rl.loan_amount - COALESCE(SUM(l.credit), 0)) as remaining_balance
      FROM requested_loan rl
      LEFT JOIN loan l ON rl.loan_id = l.target_loan_id AND l.status = 'accepted'  
      LEFT JOIN users u ON rl.user_id = u.user_id
      WHERE rl.status = 'approved'
    `;

    const params = [];
    if (userId) {
      query += ' AND rl.user_id = ?';
      params.push(userId);
    }

    query += `
      GROUP BY rl.loan_id, rl.user_id, rl.loan_amount, rl.installment_amount, u.Aname
      HAVING remaining_balance <= 0
      ORDER BY rl.approval_date ASC
    `;

    const [loans] = await pool.execute(query, params);
    return loans;
  } catch (error) {
    console.error('Error getting loans eligible for closure:', error);
    throw new Error(`فشل في جلب القروض المؤهلة للإغلاق: ${error.message}`);
  }
}

async function autoCloseFullyPaidLoans() {
  try {
    const eligibleLoans = await getLoansEligibleForClosure();
    let closedCount = 0;

    for (const loan of eligibleLoans) {
      if (await closeLoan(loan.loan_id)) closedCount++;
    }

    return closedCount;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  closeLoan,
  getLoansEligibleForClosure,
  autoCloseFullyPaidLoans
};