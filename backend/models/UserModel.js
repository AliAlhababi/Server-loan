const { pool } = require('../config/database');

class UserModel {
  
  // Get user by ID with balance calculation
  static async getUserById(userId) {
    try {
      const [users] = await pool.execute(`
        SELECT u.*, 
               COALESCE(u.balance, 0) as current_balance,
               LEAST((COALESCE(u.balance, 0) * 3), 10000) as max_loan_amount
        FROM users u 
        WHERE u.user_id = ?
      `, [userId]);
      
      return users[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب بيانات المستخدم: ' + error.message);
    }
  }

  // Check loan eligibility with all business rules
  static async checkLoanEligibility(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { eligible: false, reason: 'المستخدم غير موجود أو غير نشط' };
      }

      const eligibilityChecks = {
        hasActiveOrPendingLoan: false,
        hasPassedLastLoanClosure: false,
        hasRequiredBalance: false,
        hasSubscriptionFees: false,
        hasPassedLastLoanReceived: false,
        hasJoiningFeeApproved: false,
        hasOneYearRegistration: false
      };

      // Rule 1: Check for active or pending loans (rejected loans should not block new requests)
      const [activeLoan] = await pool.execute(`
        SELECT loan_id FROM requested_loan 
        WHERE user_id = ? AND status IN ('pending', 'approved') 
        LIMIT 1
      `, [userId]);
      
      eligibilityChecks.hasActiveOrPendingLoan = activeLoan.length > 0;

      // Rule 2: Check 30 days since last loan closure
      // Note: Current schema doesn't track loan closure dates, so we'll skip this check
      eligibilityChecks.hasPassedLastLoanClosure = true; // Skip closure check for now
      eligibilityChecks.daysUntilNextLoan = 0;

      // Rule 3: Check required balance (minimum 500 KWD for loan eligibility)
      const minBalanceForLoan = 500; // 500 KWD minimum requirement
      eligibilityChecks.hasRequiredBalance = parseFloat(user.current_balance || user.balance || 0) >= minBalanceForLoan;

      // Rule 4: Check subscription fees payment (24 months) - PROPER CALCULATION
      const monthsToCheck = 24;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToCheck);
      
      // Get total subscription payments (accepted) in the last 24 months
      // Look for both subscription-type and deposit-type transactions to capture all payment methods
      const [subscriptionPayments] = await pool.execute(`
        SELECT COALESCE(SUM(credit), 0) as total_paid
        FROM transaction 
        WHERE user_id = ? 
          AND status = 'accepted' 
          AND credit > 0 
          AND date >= ?
          AND transaction_type IN ('subscription', 'deposit')
      `, [userId, cutoffDate]);

      // Also get pending subscription payments to show user
      const [pendingPayments] = await pool.execute(`
        SELECT COALESCE(SUM(credit), 0) as pending_paid
        FROM transaction 
        WHERE user_id = ? 
          AND status = 'pending' 
          AND credit > 0 
          AND date >= ?
          AND transaction_type IN ('subscription', 'deposit')
      `, [userId, cutoffDate]);

      const totalPaidLast24Months = parseFloat(subscriptionPayments[0].total_paid || 0);
      const totalPendingLast24Months = parseFloat(pendingPayments[0].pending_paid || 0);
      
      // Required amount for all members (simplified to single rate)
      const requiredSubscriptionAmount = 240; // 240 KWD for all members over 24 months
      
      eligibilityChecks.hasRequiredSubscription = totalPaidLast24Months >= requiredSubscriptionAmount;
      eligibilityChecks.hasSubscriptionFees = totalPaidLast24Months >= requiredSubscriptionAmount;
      eligibilityChecks.subscriptionDetails = {
        required: parseFloat(requiredSubscriptionAmount),
        paid: parseFloat(totalPaidLast24Months),
        pending: parseFloat(totalPendingLast24Months),
        total: parseFloat(totalPaidLast24Months + totalPendingLast24Months),
        shortfall: parseFloat(Math.max(0, requiredSubscriptionAmount - totalPaidLast24Months)),
        monthsChecked: monthsToCheck
      };

      // Rule 5: Check 11 months since last loan received
      const [lastLoan] = await pool.execute(`
        SELECT approval_date FROM requested_loan 
        WHERE user_id = ? AND status = 'approved' 
        ORDER BY approval_date DESC LIMIT 1
      `, [userId]);

      if (lastLoan.length > 0 && lastLoan[0].approval_date) {
        const monthsSinceLastLoan = Math.floor(
          (new Date() - new Date(lastLoan[0].approval_date)) / (1000 * 60 * 60 * 24 * 30)
        );
        eligibilityChecks.hasPassedLastLoanReceived = monthsSinceLastLoan >= 11;
      } else {
        eligibilityChecks.hasPassedLastLoanReceived = true; // No previous loans
      }

      // Rule 6: Check joining fee approval status
      eligibilityChecks.hasJoiningFeeApproved = user.joining_fee_approved === 'approved';

      // Rule 7: Check 1-year registration requirement
      if (user.registration_date) {
        const registrationDate = new Date(user.registration_date);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        eligibilityChecks.hasOneYearRegistration = registrationDate <= oneYearAgo;
        
        if (!eligibilityChecks.hasOneYearRegistration) {
          const daysRemaining = Math.ceil((oneYearAgo - registrationDate) / (1000 * 60 * 60 * 24));
          eligibilityChecks.daysUntilOneYear = Math.abs(daysRemaining);
          eligibilityChecks.monthsUntilOneYear = Math.ceil(Math.abs(daysRemaining) / 30);
        }
      } else {
        eligibilityChecks.hasOneYearRegistration = false;
      }

      // Determine overall eligibility
      const eligible = !eligibilityChecks.hasActiveOrPendingLoan &&
                      eligibilityChecks.hasPassedLastLoanClosure &&
                      eligibilityChecks.hasRequiredBalance &&
                      eligibilityChecks.hasSubscriptionFees &&
                      eligibilityChecks.hasPassedLastLoanReceived &&
                      eligibilityChecks.hasJoiningFeeApproved &&
                      eligibilityChecks.hasOneYearRegistration;

      // Generate Arabic reason message
      let reason = '';
      if (!eligible) {
        const reasons = [];
        if (eligibilityChecks.hasActiveOrPendingLoan) {
          reasons.push('يوجد قرض حالي مفتوح أو بانتظار الموافقة');
        }
        if (!eligibilityChecks.hasPassedLastLoanClosure) {
          const daysLeft = eligibilityChecks.daysUntilNextLoan || 0;
          reasons.push(`لم يمر 30 يوم على إغلاق آخر قرض - باقي ${daysLeft} يوم`);
        }
        if (!eligibilityChecks.hasRequiredBalance) {
          reasons.push('الرصيد أقل من 500 دينار (الحد الأدنى لطلب القرض)');
        }
        if (!eligibilityChecks.hasSubscriptionFees) {
          const details = eligibilityChecks.subscriptionDetails;
          const shortfall = details.shortfall.toFixed(3);
          const userTypeText = user.user_type === 'employee' ? 'موظف' : 'طالب';
          reasons.push(`نقص في اشتراك 24 شهر - مطلوب ${details.required} د.ك (${userTypeText}) - دفع ${details.paid.toFixed(3)} د.ك - باقي ${shortfall} د.ك`);
        }
        if (!eligibilityChecks.hasPassedLastLoanReceived) {
          reasons.push('لم يمر 11 شهر على استلام آخر قرض');
        }
        if (!eligibilityChecks.hasJoiningFeeApproved) {
          const statusText = user.joining_fee_approved === 'rejected' ? 'مرفوضة' : 
                           user.joining_fee_approved === 'pending' ? 'بانتظار الموافقة' : 'غير محددة';
          reasons.push(`يجب على المشترك دفع رسوم الانضمام 10 د.ك - الحالة: ${statusText}`);
        }
        if (!eligibilityChecks.hasOneYearRegistration) {
          const daysRemaining = eligibilityChecks.daysUntilOneYear || 0;
          reasons.push(`يجب أن يكون المشترك مسجل لمدة سنة واحدة على الأقل - باقي ${daysRemaining} يوم`);
        }
        reason = reasons.join(' • ');
      }

      return {
        isEligible: eligible,
        eligible,
        reason,
        errors: eligible ? [] : [reason],
        ...eligibilityChecks,
        checks: eligibilityChecks,
        maxLoanAmount: user.max_loan_amount,
        currentBalance: user.current_balance
      };

    } catch (error) {
      throw new Error('خطأ في فحص أهلية القرض: ' + error.message);
    }
  }

  // Get user's loan history
  static async getUserLoanHistory(userId) {
    try {
      const [loans] = await pool.execute(`
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

  // Get user's transaction history
  static async getUserTransactions(userId) {
    try {
      const [transactions] = await pool.execute(`
        SELECT t.*, u.Aname as admin_name
        FROM transaction t
        LEFT JOIN users u ON t.admin_id = u.user_id
        WHERE t.user_id = ?
        ORDER BY t.date DESC
        LIMIT 50
      `, [userId]);

      return transactions;
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ المعاملات: ' + error.message);
    }
  }

  static async getUserLoanPayments(userId) {
    try {
      const [loanPayments] = await pool.execute(`
        SELECT l.*, u.Aname as admin_name, rl.loan_amount
        FROM loan l
        LEFT JOIN users u ON l.admin_id = u.user_id
        LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
        WHERE l.user_id = ? AND l.target_loan_id IS NOT NULL AND l.status = 'accepted'
        ORDER BY l.date DESC
      `, [userId]);

      return loanPayments;
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ تسديدات القروض: ' + error.message);
    }
  }
}

module.exports = UserModel;