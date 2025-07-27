class LoanCalculator {
  constructor() {
    this.CONSTANTS = {
      MAX_LOAN_AMOUNT: 10000,
      BALANCE_MULTIPLIER: 3,
      MIN_INSTALLMENT: 20,
      MIN_BALANCE_REQUIREMENT: 500,
      MIN_INSTALLMENT_PERIOD: 6,
      DEFAULT_PERIOD: 24,
      INSTALLMENT_RATIO: 0.006667
    };
  }

  static calculateLoanTerms(balance, requestedAmount = null, customPeriod = null) {
    const calculator = new LoanCalculator();
    
    if (!balance || balance < calculator.CONSTANTS.MIN_BALANCE_REQUIREMENT) {
      return {
        eligible: false,
        reason: `الرصيد أقل من الحد الأدنى المطلوب (${calculator.CONSTANTS.MIN_BALANCE_REQUIREMENT} دينار)`,
        maxLoan: 0,
        balance: balance || 0
      };
    }

    const maxLoan = Math.min(
      balance * calculator.CONSTANTS.BALANCE_MULTIPLIER, 
      calculator.CONSTANTS.MAX_LOAN_AMOUNT
    );

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

      const installmentData = calculator.calculateInstallment(requestedAmount, balance);
      const period = customPeriod || calculator.calculateOptimalPeriod(requestedAmount, installmentData.amount);
      
      // Calculate exact repayment details
      const exactPeriod = requestedAmount / installmentData.amount;
      const wholePeriods = Math.floor(exactPeriod);
      const remainder = requestedAmount - (wholePeriods * installmentData.amount);
      const lastInstallment = remainder > 0 ? parseFloat(remainder.toFixed(3)) : installmentData.amount;
      const totalRepayment = parseFloat((requestedAmount || 0).toFixed(3)); // Always equals loan amount
      
      return {
        eligible: true,
        maxLoan,
        requestedAmount,
        installment: installmentData.amount,
        installmentPeriod: period,
        totalRepayment: totalRepayment.toFixed(3),
        lastInstallment: lastInstallment,
        wholePeriods: wholePeriods,
        balance,
        balanceTier: calculator.getBalanceTier(balance)
      };
    }

    return {
      eligible: true,
      maxLoan,
      balance,
      balanceTier: calculator.getBalanceTier(balance)
    };
  }

  round5(value) {
    return Math.ceil(value / 5) * 5;
  }

  getBalanceTier(balance) {
    if (balance >= 3330) return { name: 'الحساب الخاص', level: 'special' };
    if (balance >= 1000) return { name: 'الفئة المتوسطة', level: 'medium' };
    if (balance >= 500) return { name: 'الفئة الأساسية', level: 'basic' };
    return { name: 'غير مؤهل', level: 'ineligible' };
  }

  calculateOptimalPeriod(loanAmount, installmentAmount) {
    if (!loanAmount || !installmentAmount || installmentAmount <= 0) {
      return this.CONSTANTS.DEFAULT_PERIOD;
    }
    
    // Calculate period so total repayment equals loan amount exactly
    const exactPeriod = loanAmount / installmentAmount;
    const wholePeriods = Math.floor(exactPeriod);
    const remainder = loanAmount - (wholePeriods * installmentAmount);
    
    // If remainder is less than minimum installment, extend by one period
    if (remainder > 0 && remainder < this.CONSTANTS.MIN_INSTALLMENT) {
      return Math.max(this.CONSTANTS.MIN_INSTALLMENT_PERIOD, wholePeriods + 1);
    }
    
    // Otherwise use exact calculation
    return Math.max(this.CONSTANTS.MIN_INSTALLMENT_PERIOD, Math.ceil(exactPeriod));
  }

  calculateInstallment(loanAmount, balance) {
    const baseAmount = this.round5(
      this.CONSTANTS.INSTALLMENT_RATIO * loanAmount * loanAmount / balance
    );
    return {
      amount: Math.max(baseAmount, this.CONSTANTS.MIN_INSTALLMENT),
      baseAmount,
      minimumApplied: Math.max(baseAmount, this.CONSTANTS.MIN_INSTALLMENT) > baseAmount
    };
  }

}

module.exports = LoanCalculator;