const LoanCalculator = require('../models/LoanCalculator');
const UserRepository = require('../repositories/UserRepository');
const LoanRepository = require('../repositories/LoanRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const LoanPaymentRepository = require('../repositories/LoanPaymentRepository');

class LoanService {
  constructor() {
    this.userRepository = new UserRepository();
    this.loanRepository = new LoanRepository();
    this.transactionRepository = new TransactionRepository();
    this.loanPaymentRepository = new LoanPaymentRepository();
    this.loanCalculator = new LoanCalculator();
  }

  async checkLoanEligibility(userId) {
    try {
      const user = await this.userRepository.findByUserId(userId);
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

      // Rule 1: Check for active or pending loans
      const activeLoan = await this.loanRepository.findActiveLoanByUserId(userId);
      eligibilityChecks.hasActiveOrPendingLoan = !!activeLoan;

      // Rule 2: Skip closure check for now (not tracked in current schema)
      eligibilityChecks.hasPassedLastLoanClosure = true;
      eligibilityChecks.daysUntilNextLoan = 0;

      // Rule 3: Check required balance (minimum 500 KWD)
      const minBalanceForLoan = 500;
      eligibilityChecks.hasRequiredBalance = parseFloat(user.current_balance || user.balance || 0) >= minBalanceForLoan;

      // Rule 4: Check subscription fees payment (24 months)
      const subscriptionData = await this.transactionRepository.getSubscriptionPayments(userId, 24);
      const requiredSubscriptionAmount = 240; // 240 KWD for all members over 24 months
      
      eligibilityChecks.hasSubscriptionFees = subscriptionData.totalPaid >= requiredSubscriptionAmount;
      eligibilityChecks.subscriptionDetails = {
        required: requiredSubscriptionAmount,
        paid: subscriptionData.totalPaid,
        pending: subscriptionData.totalPending,
        total: subscriptionData.totalPaid + subscriptionData.totalPending,
        shortfall: Math.max(0, requiredSubscriptionAmount - subscriptionData.totalPaid),
        monthsChecked: subscriptionData.monthsChecked
      };

      // Rule 5: Check 11 months since last loan received
      const lastLoan = await this.loanRepository.findLastApprovedLoanByUserId(userId);
      if (lastLoan && lastLoan.approval_date) {
        const monthsSinceLastLoan = Math.floor(
          (new Date() - new Date(lastLoan.approval_date)) / (1000 * 60 * 60 * 24 * 30)
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

      // Generate reason message if not eligible
      let reason = '';
      if (!eligible) {
        const reasons = [];
        if (eligibilityChecks.hasActiveOrPendingLoan) {
          reasons.push('يوجد قرض حالي مفتوح أو بانتظار الموافقة');
        }
        if (!eligibilityChecks.hasRequiredBalance) {
          reasons.push('الرصيد أقل من 500 دينار (الحد الأدنى لطلب القرض)');
        }
        if (!eligibilityChecks.hasSubscriptionFees) {
          const details = eligibilityChecks.subscriptionDetails;
          const shortfall = details.shortfall.toFixed(3);
          reasons.push(`نقص في اشتراك 24 شهر - مطلوب ${details.required} د.ك - دفع ${details.paid.toFixed(3)} د.ك - باقي ${shortfall} د.ك`);
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

  async calculateLoanTerms(balance, requestedAmount = null, installmentPeriod = null) {
    try {
      return LoanCalculator.calculateLoanTerms(balance, requestedAmount, installmentPeriod);
    } catch (error) {
      throw new Error('خطأ في حساب شروط القرض: ' + error.message);
    }
  }

  async requestLoan(userId, requestedAmount, notes = null) {
    try {
      // Check eligibility
      const eligibility = await this.checkLoanEligibility(userId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Get user and calculate loan terms
      const user = await this.userRepository.findByUserId(userId);
      const loanTerms = LoanCalculator.calculateLoanTerms(user.current_balance, requestedAmount);
      
      if (!loanTerms.eligible) {
        throw new Error(loanTerms.reason);
      }

      // Create loan request
      const loanData = {
        userId,
        requestedAmount,
        installmentAmount: loanTerms.installment,
        installmentPeriod: loanTerms.installmentPeriod || 24,
        notes
      };

      const result = await this.loanRepository.createLoanRequest(loanData);

      return {
        success: true,
        loanId: result.loanId,
        message: 'تم تقديم طلب القرض بنجاح',
        loanTerms
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async approveLoan(loanId, adminId) {
    try {
      const success = await this.loanRepository.approveLoan(loanId, adminId);
      if (!success) {
        throw new Error('فشل في الموافقة على القرض');
      }

      return {
        success: true,
        message: 'تم الموافقة على القرض بنجاح'
      };

    } catch (error) {
      throw new Error('خطأ في الموافقة على القرض: ' + error.message);
    }
  }

  async rejectLoan(loanId, adminId, reason) {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error('سبب الرفض مطلوب');
      }

      const success = await this.loanRepository.rejectLoan(loanId, adminId, reason);
      if (!success) {
        throw new Error('فشل في رفض القرض');
      }

      return {
        success: true,
        message: 'تم رفض القرض'
      };

    } catch (error) {
      throw new Error('خطأ في رفض القرض: ' + error.message);
    }
  }

  async getUserLoanHistory(userId) {
    try {
      return await this.loanRepository.findLoanHistory(userId);
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ القروض: ' + error.message);
    }
  }

  async getAllLoans(limit = 100) {
    try {
      return await this.loanRepository.findAllLoans(limit);
    } catch (error) {
      throw new Error('خطأ في جلب قائمة القروض: ' + error.message);
    }
  }

  async getLoansByStatus(status, limit = 50) {
    try {
      return await this.loanRepository.findLoansByStatus(status, limit);
    } catch (error) {
      throw new Error('خطأ في جلب القروض حسب الحالة: ' + error.message);
    }
  }

  async getActiveLoanDetails(userId) {
    try {
      return await this.loanRepository.getActiveLoanDetails(userId);
    } catch (error) {
      throw new Error('خطأ في جلب تفاصيل القرض النشط: ' + error.message);
    }
  }

  async processLoanPayment(userId, targetLoanId, amount, memo, adminId) {
    try {
      // Validate payment amount
      if (!amount || amount <= 0) {
        throw new Error('مبلغ الدفع يجب أن يكون أكبر من صفر');
      }

      // Get loan details
      const loanDetails = await this.loanRepository.getActiveLoanDetails(userId);
      if (!loanDetails) {
        throw new Error('لا يوجد قرض نشط للمستخدم');
      }

      if (loanDetails.loan_id !== targetLoanId) {
        throw new Error('رقم القرض غير صحيح');
      }

      // Check minimum payment (20 KWD)
      const minPayment = 20;
      if (amount < minPayment) {
        throw new Error(`الحد الأدنى للدفع هو ${minPayment} دينار`);
      }

      // Create payment record
      const paymentData = {
        userId,
        targetLoanId,
        amount,
        memo: memo || `تسديد قسط قرض ${targetLoanId}`,
        adminId,
        status: 'accepted' // Auto-approve payments
      };

      const result = await this.loanPaymentRepository.createLoanPayment(paymentData);

      return {
        success: true,
        paymentId: result.paymentId,
        message: 'تم تسديد القسط بنجاح'
      };

    } catch (error) {
      throw new Error('خطأ في تسديد القسط: ' + error.message);
    }
  }

  async getUserLoanPayments(userId) {
    try {
      return await this.loanPaymentRepository.findLoanPaymentsByUserId(userId);
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ تسديدات القروض: ' + error.message);
    }
  }

  async getLoanStats() {
    try {
      const [loanStats, paymentStats, monthlyStats] = await Promise.all([
        this.loanRepository.getLoanStats(),
        this.loanPaymentRepository.getLoanPaymentStats(),
        this.loanRepository.getMonthlyLoanStats()
      ]);

      return {
        loans: loanStats,
        payments: paymentStats,
        monthly: monthlyStats
      };
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات القروض: ' + error.message);
    }
  }
}

module.exports = LoanService;