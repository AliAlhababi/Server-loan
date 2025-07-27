const { pool } = require('../config/database');

class UserModel {
  static async getUserById(userId) {
    try {
      const [users] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
      return users[0] || null;
    } catch (error) {
      throw new Error(`خطأ في جلب بيانات المستخدم: ${error.message}`);
    }
  }

  // Simplified loan eligibility check with individual tests
  static async checkLoanEligibility(userId) {
    try {
      // Get basic user data
      const [userResults] = await pool.execute(
        'SELECT user_id, Aname, user_type, balance, registration_date, joining_fee_approved, is_blocked FROM users WHERE user_id = ?',
        [userId]
      );
      
      if (userResults.length === 0) {
        return { eligible: false, reason: 'المستخدم غير موجود', reasons: ['user_not_found'] };
      }

      const user = userResults[0];
      
      // Skip admin users - they can't get loans
      if (user.user_type === 'admin') {
        return { eligible: false, reason: 'المدراء لا يمكنهم طلب القروض', reasons: ['admin_user'] };
      }

      // Individual eligibility tests
      const tests = {};
      const reasons = [];
      const messages = [];
      
      // Test 1: User not blocked
      tests.notBlocked = user.is_blocked !== 1;
      if (!tests.notBlocked) {
        reasons.push('blocked_user');
        messages.push('الحساب محظور مؤقتاً');
      }
      
      // Test 2: Joining fee approved
      tests.joiningFeeApproved = user.joining_fee_approved === 'approved';
      if (!tests.joiningFeeApproved) {
        reasons.push('joining_fee_not_approved');
        const status = user.joining_fee_approved === 'rejected' ? 'مرفوضة' : 
                     user.joining_fee_approved === 'pending' ? 'معلقة' : 'غير محددة';
        messages.push(`رسوم الانضمام غير معتمدة (الحالة: ${status})`);
      }
      
      // Test 3: Minimum balance (500 KWD)
      const currentBalance = parseFloat(user.balance || 0);
      tests.hasMinimumBalance = currentBalance >= 500;
      if (!tests.hasMinimumBalance) {
        reasons.push('insufficient_balance');
        messages.push(`الرصيد أقل من 500 دينار (الرصيد الحالي: ${currentBalance.toFixed(3)} د.ك)`);
      }
      
      // Test 4: One year registration
      tests.oneYearRegistration = false;
      let daysUntilOneYear = 0;
      if (user.registration_date) {
        const registrationDate = new Date(user.registration_date);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        tests.oneYearRegistration = registrationDate <= oneYearAgo;
        
        if (!tests.oneYearRegistration) {
          const daysRemaining = Math.ceil((oneYearAgo - registrationDate) / (1000 * 60 * 60 * 24 * -1));
          daysUntilOneYear = daysRemaining;
          reasons.push('no_one_year_registration');
          messages.push(`لم يمض عام على التسجيل (باقي ${daysRemaining} يوم)`);
        }
      }
      
      // Test 5: No active loans (exclude completed loans with loan_closed_date)
      const [activeLoanResults] = await pool.execute(
        'SELECT COUNT(*) as count FROM requested_loan WHERE user_id = ? AND status IN ("pending", "approved") AND loan_closed_date IS NULL',
        [userId]
      );
      tests.noActiveLoans = activeLoanResults[0].count === 0;
      if (!tests.noActiveLoans) {
        reasons.push('active_loan');
        messages.push('يوجد قرض نشط أو معلق');
      }
      
      // Test 6: Subscription payment (240 KWD minimum within 24 months)
      const [subscriptionResults] = await pool.execute(
        'SELECT COALESCE(SUM(credit), 0) as total_paid FROM transaction WHERE user_id = ? AND status = "accepted" AND credit > 0 AND date >= DATE_SUB(NOW(), INTERVAL 24 MONTH)',
        [userId]
      );
      const totalPaid = parseFloat(subscriptionResults[0].total_paid || 0);
      const requiredAmount = 240; // Minimum 240 KWD within 24 months
      tests.hasSubscriptionPayment = totalPaid >= requiredAmount;
      if (!tests.hasSubscriptionPayment) {
        reasons.push('insufficient_subscription');
        const shortfall = requiredAmount - totalPaid;
        messages.push(`نقص في دفع الاشتراكات (مطلوب: ${requiredAmount} د.ك، مدفوع: ${totalPaid.toFixed(3)} د.ك، باقي: ${shortfall.toFixed(3)} د.ك)`);
      }
      
      // Test 7: 30 days since last loan closure
      const [lastClosureResults] = await pool.execute(
        'SELECT loan_closed_date FROM requested_loan WHERE user_id = ? AND loan_closed_date IS NOT NULL ORDER BY loan_closed_date DESC LIMIT 1',
        [userId]
      );
      tests.thirtyDaysSinceClosure = true;
      let daysUntilNextLoan = 0;
      if (lastClosureResults.length > 0) {
        const lastClosure = new Date(lastClosureResults[0].loan_closed_date);
        const daysSince = Math.floor((new Date() - lastClosure) / (1000 * 60 * 60 * 24));
        tests.thirtyDaysSinceClosure = daysSince >= 30;
        if (!tests.thirtyDaysSinceClosure) {
          daysUntilNextLoan = 30 - daysSince;
          reasons.push('closure_period_not_met');
          messages.push(`لم يمر 30 يوم على إغلاق آخر قرض (باقي ${daysUntilNextLoan} يوم)`);
        }
      }
      
      // Overall eligibility
      const eligible = Object.values(tests).every(test => test === true);
      
      // Calculate max loan amount
      const maxLoanAmount = eligible ? Math.min(currentBalance * 3, 10000) : 0;
      
      return {
        eligible,
        isEligible: eligible,
        reason: messages.join(' • ') || 'مؤهل لطلب قرض',
        reasons,
        messages,
        tests,
        daysUntilNextLoan,
        maxLoanAmount,
        currentBalance,
        userType: user.user_type,
        registrationDate: user.registration_date,
        subscriptionPaid: totalPaid,
        requiredSubscription: requiredAmount,
        daysUntilOneYear,
        daysUntilNextLoan
      };
    } catch (error) {
      console.error('خطأ في فحص أهلية القرض:', error);
      return { eligible: false, reason: 'خطأ في النظام', reasons: ['system_error'] };
    }
  }

  static async getUserLoanHistory(userId, limit = 50) {
    try {
      const query = `
        SELECT 
          rl.loan_id,
          rl.user_id,
          rl.loan_amount,
          rl.installment_amount,
          rl.status,
          rl.request_date,
          rl.approval_date,
          rl.loan_closed_date,
          rl.admin_id,
          u.Aname as admin_name,
          COALESCE(SUM(CASE WHEN l.status = 'accepted' THEN l.credit ELSE 0 END), 0) as total_paid
        FROM requested_loan rl
        LEFT JOIN users u ON rl.admin_id = u.user_id
        LEFT JOIN loan l ON rl.loan_id = l.target_loan_id
        WHERE rl.user_id = ?
        GROUP BY rl.loan_id, rl.user_id, rl.loan_amount, rl.installment_amount, rl.status, 
                 rl.request_date, rl.approval_date, rl.loan_closed_date, rl.admin_id, u.Aname
        ORDER BY rl.request_date DESC
        LIMIT ?
      `;

      const [loans] = await pool.execute(query, [userId, limit]);
      return loans;
    } catch (error) {
      throw new Error(`خطأ في جلب تاريخ القروض: ${error.message}`);
    }
  }

  static async getUserTransactions(userId, limit = 50, transactionType = null) {
    try {
      let query = `
        SELECT t.*, u.Aname as admin_name
        FROM transaction t
        LEFT JOIN users u ON t.admin_id = u.user_id
        WHERE t.user_id = ?
      `;
      
      const params = [userId];
      
      if (transactionType) {
        query += ' AND t.transaction_type = ?';
        params.push(transactionType);
      }
      
      query += ' ORDER BY t.date DESC LIMIT ?';
      params.push(limit);

      const [transactions] = await pool.execute(query, params);
      return transactions;
    } catch (error) {
      throw new Error(`خطأ في جلب تاريخ المعاملات: ${error.message}`);
    }
  }

  static async getUserLoanPayments(userId, loanId = null) {
    try {
      let query = `
        SELECT l.*, 
               u.Aname as admin_name, 
               rl.loan_amount,
               rl.installment_amount,
               rl.status as loan_status
        FROM loan l
        LEFT JOIN users u ON l.admin_id = u.user_id
        LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        WHERE l.user_id = ? AND l.target_loan_id IS NOT NULL AND l.status = 'accepted'
      `;
      
      const params = [userId];
      
      if (loanId) {
        query += ' AND l.target_loan_id = ?';
        params.push(loanId);
      }
      
      query += ' ORDER BY l.date DESC';

      const [loanPayments] = await pool.execute(query, params);
      return loanPayments;
    } catch (error) {
      throw new Error(`خطأ في جلب تاريخ تسديدات القروض: ${error.message}`);
    }
  }

}

module.exports = UserModel;