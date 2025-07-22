class LoanCalculator {
  constructor() {
    // Core constants - corrected understanding
    this.CONSTANTS = {
      maxl1: 10000,        // Maximum loan amount
      maxlp1: 3,           // Multiplier for max loan relative to balance
      instp1: 0.02,        // 2% installment rate
      minInstallment: 20,  // Minimum installment amount in KWD
      get monthlyRate() { 
        return this.instp1; // 2% monthly installment rate
      },
      get ratio() { 
        // Corrected ratio to match exact examples: 10K loan + 3550 balance = 200 installment
        // Formula: ratio = (200 * 3550) / (10000 * 10000) = 0.00667
        return 0.02 / 3; // 0.006667 - exact mathematical ratio
      }
    };
  }

  // Simple loan calculation based on frontend logic with flexible installment periods
  static calculateLoanTerms(balance, requestedAmount = null, installmentPeriod = null) {
    const calculator = new LoanCalculator();
    
    if (!balance || balance < 500) {
      return {
        eligible: false,
        reason: 'الرصيد أقل من الحد الأدنى المطلوب (500 دينار)',
        maxLoan: 0,
        balance: balance || 0
      };
    }

    // Calculate maximum loan (balance * 3, capped at system max)
    const maxLoan = Math.min(balance * calculator.CONSTANTS.maxlp1, calculator.CONSTANTS.maxl1);

    if (requestedAmount) {
      if (requestedAmount > maxLoan) {
        return {
          eligible: false,
          reason: `المبلغ المطلوب يتجاوز الحد الأقصى المسموح (${maxLoan.toFixed(3)} دينار)`,
          maxLoan,
          requestedAmount,
          balance
        };
      }

      // Calculate using 2% monthly installment rate with flexible period
      const monthlyInstallment = calculator.calculateMonthlyInstallment(requestedAmount, balance);
      
      // Ensure valid installment calculation
      if (!monthlyInstallment || !monthlyInstallment.installment) {
        return {
          eligible: false,
          reason: 'خطأ في حساب القسط الشهري',
          maxLoan,
          requestedAmount,
          balance
        };
      }
      
      // Calculate flexible installment period
      let calculatedPeriod = 24; // Default 24 months
      if (installmentPeriod && installmentPeriod > 0) {
        calculatedPeriod = installmentPeriod;
      } else {
        // Calculate period needed to repay loan at monthly installment rate
        calculatedPeriod = Math.ceil(requestedAmount / monthlyInstallment.installment);
        // Ensure reasonable minimum bound (6 months minimum, no maximum cap)
        calculatedPeriod = Math.max(6, calculatedPeriod);
      }
      
      return {
        eligible: true,
        maxLoan,
        requestedAmount,
        installment: monthlyInstallment.installment.toFixed(3),
        installmentPeriod: calculatedPeriod,
        balance,
        balanceTier: calculator.getBalanceTier(balance),
        calculationMethod: monthlyInstallment.method
      };
    }

    // Return general terms without specific amount
    return {
      eligible: true,
      maxLoan,
      balance,
      balanceTier: calculator.getBalanceTier(balance)
    };
  }

  // Rounds a number UP to the nearest multiple of 5
  round5(value) {
    return Math.ceil(value / 5) * 5;
  }

  // Get balance tier description (simplified)
  getBalanceTier(balance) {
    if (balance >= 3330) {
      return { name: 'الحساب الخاص', level: 'special' };
    } else if (balance >= 1000) {
      return { name: 'الفئة المتوسطة', level: 'medium' };
    } else if (balance >= 500) {
      return { name: 'الفئة الأساسية', level: 'basic' };
    } else {
      return { name: 'غير مؤهل', level: 'ineligible' };
    }
  }

  // Calculate flexible installment period based on loan amount and installment
  calculateInstallmentPeriod(loanAmount, installment) {
    if (!loanAmount || !installment || installment <= 0) {
      return 24; // Default 24 months
    }
    
    // Calculate optimal period based on loan amount and installment
    let period = Math.ceil(loanAmount / installment);
    
    // Ensure reasonable minimum bound (6 months minimum, no maximum cap)
    period = Math.max(6, period);
    
    return period;
  }

  // Calculate installment using the correct formula: I = round5(ratio × L² / B)
  calculateMonthlyInstallment(loanAmount, balance) {
    // Use the original formula: I = round5(ratio × L² / B) where ratio = 0.02/3
    const baseInstallment = this.round5(this.CONSTANTS.ratio * loanAmount * loanAmount / balance);
    
    // Apply minimum installment rule (20 KWD minimum)
    const finalInstallment = Math.max(baseInstallment, this.CONSTANTS.minInstallment);
    
    return {
      installment: finalInstallment,
      method: 'formula-based',
      baseCalculation: baseInstallment,
      appliedMinimum: finalInstallment > baseInstallment
    };
  }

  // Simple calculation methods from frontend with flexible periods
  calculateFromLoanAmount(loanAmount, balance) {
    if (!balance || balance < 500) {
      throw new Error('الرصيد أقل من الحد الأدنى المطلوب');
    }

    const L = Math.min(loanAmount, this.CONSTANTS.maxl1);
    const B = balance;
    const baseI = this.round5(this.CONSTANTS.ratio * L * L / B);
    const I = Math.max(baseI, this.CONSTANTS.minInstallment);
    const period = this.calculateInstallmentPeriod(L, I);

    return {
      loanAmount: L,
      balance: B,
      installment: I,
      installmentPeriod: period,
      scenario: 'من مبلغ القرض'
    };
  }

  calculateFromBalance(balance) {
    if (!balance || balance < 500) {
      throw new Error('الرصيد غير صحيح');
    }

    const B = balance;
    const L = Math.min(B * this.CONSTANTS.maxlp1, this.CONSTANTS.maxl1);
    const baseI = this.round5(this.CONSTANTS.ratio * L * L / B);
    const I = Math.max(baseI, this.CONSTANTS.minInstallment);
    const period = this.calculateInstallmentPeriod(L, I);

    return {
      loanAmount: L,
      balance: B,
      installment: I,
      installmentPeriod: period,
      scenario: 'من الرصيد'
    };
  }
}

module.exports = LoanCalculator;