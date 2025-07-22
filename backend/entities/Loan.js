/**
 * Loan domain entity
 */
class Loan {
  constructor(data = {}) {
    this.loanId = data.loan_id || data.loanId;
    this.userId = data.user_id || data.userId;
    this.requestedAmount = parseFloat(data.requested_amount || data.requestedAmount || 0);
    this.installmentAmount = parseFloat(data.installment_amount || data.installmentAmount || 0);
    this.installmentPeriod = parseInt(data.installment_period || data.installmentPeriod || 24);
    this.status = data.status || 'pending';
    this.requestDate = data.request_date || data.requestDate;
    this.approvalDate = data.approval_date || data.approvalDate;
    this.rejectionDate = data.rejection_date || data.rejectionDate;
    this.rejectionReason = data.rejection_reason || data.rejectionReason;
    this.adminId = data.admin_id || data.adminId;
    this.notes = data.notes;
    this.totalPaid = parseFloat(data.total_paid || 0);
    this.remainingAmount = parseFloat(data.remaining_amount || this.requestedAmount - this.totalPaid);
    
    // User related data
    this.userName = data.user_name || data.userName;
    this.userType = data.user_type || data.userType;
    this.currentBalance = parseFloat(data.current_balance || data.currentBalance || 0);
    this.adminName = data.admin_name || data.adminName;
  }

  // Status check methods
  isPending() {
    return this.status === 'pending';
  }

  isApproved() {
    return this.status === 'approved';
  }

  isRejected() {
    return this.status === 'rejected';
  }

  isActive() {
    return this.isApproved() && this.remainingAmount > 0;
  }

  isCompleted() {
    return this.isApproved() && this.remainingAmount <= 0;
  }

  // Calculation methods
  getTotalInterest() {
    return this.installmentAmount * this.installmentPeriod - this.requestedAmount;
  }

  getMonthlyInterestRate() {
    if (this.requestedAmount <= 0) return 0;
    return ((this.installmentAmount * this.installmentPeriod - this.requestedAmount) / this.requestedAmount) / this.installmentPeriod;
  }

  getPaymentProgress() {
    if (this.requestedAmount <= 0) return 0;
    return (this.totalPaid / this.requestedAmount) * 100;
  }

  getRemainingInstallments() {
    if (this.installmentAmount <= 0) return 0;
    return Math.ceil(this.remainingAmount / this.installmentAmount);
  }

  getNextPaymentDue() {
    if (!this.approvalDate || this.isCompleted()) return null;
    
    const approvalDate = new Date(this.approvalDate);
    const paidInstallments = Math.floor(this.totalPaid / this.installmentAmount);
    const nextDueDate = new Date(approvalDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + paidInstallments + 1);
    
    return nextDueDate;
  }

  isOverdue() {
    const nextDue = this.getNextPaymentDue();
    if (!nextDue) return false;
    
    return new Date() > nextDue;
  }

  getDaysOverdue() {
    if (!this.isOverdue()) return 0;
    
    const nextDue = this.getNextPaymentDue();
    const now = new Date();
    
    return Math.floor((now - nextDue) / (1000 * 60 * 60 * 24));
  }

  // Validation methods
  isValidAmount() {
    return this.requestedAmount > 0 && this.requestedAmount <= 10000;
  }

  isValidInstallmentPeriod() {
    return this.installmentPeriod >= 6 && this.installmentPeriod <= 60;
  }

  isValidInstallmentAmount() {
    return this.installmentAmount >= 20; // Minimum 20 KWD
  }

  canBeApproved() {
    return this.isPending() && this.isValidAmount() && this.isValidInstallmentAmount();
  }

  canBeRejected() {
    return this.isPending();
  }

  canReceivePayment() {
    return this.isApproved() && this.remainingAmount > 0;
  }

  // Business logic
  calculateMinimumPayment() {
    return Math.max(this.installmentAmount, 20);
  }

  calculateMaximumPayment() {
    return this.remainingAmount;
  }

  processPayment(amount) {
    if (!this.canReceivePayment()) {
      throw new Error('القرض لا يمكن تسديده');
    }

    if (amount < this.calculateMinimumPayment()) {
      throw new Error(`الحد الأدنى للدفع هو ${this.calculateMinimumPayment()} دينار`);
    }

    if (amount > this.remainingAmount) {
      throw new Error('مبلغ الدفع يتجاوز المبلغ المتبقي');
    }

    this.totalPaid += amount;
    this.remainingAmount = Math.max(0, this.requestedAmount - this.totalPaid);

    return {
      success: true,
      newTotalPaid: this.totalPaid,
      newRemainingAmount: this.remainingAmount,
      isCompleted: this.isCompleted()
    };
  }

  // Status messages in Arabic
  getStatusText() {
    switch (this.status) {
      case 'pending': return 'بانتظار الموافقة';
      case 'approved': return 'معتمد';
      case 'rejected': return 'مرفوض';
      default: return 'غير معروف';
    }
  }

  getPaymentStatusText() {
    if (this.isCompleted()) return 'مكتمل الدفع';
    if (this.isOverdue()) return 'متأخر في السداد';
    if (this.isActive()) return 'جاري السداد';
    return 'غير نشط';
  }

  // Serialization
  toJSON() {
    return {
      loanId: this.loanId,
      userId: this.userId,
      requestedAmount: this.requestedAmount,
      installmentAmount: this.installmentAmount,
      installmentPeriod: this.installmentPeriod,
      status: this.status,
      statusText: this.getStatusText(),
      requestDate: this.requestDate,
      approvalDate: this.approvalDate,
      rejectionDate: this.rejectionDate,
      rejectionReason: this.rejectionReason,
      adminId: this.adminId,
      notes: this.notes,
      totalPaid: this.totalPaid,
      remainingAmount: this.remainingAmount,
      paymentProgress: this.getPaymentProgress(),
      remainingInstallments: this.getRemainingInstallments(),
      nextPaymentDue: this.getNextPaymentDue(),
      isOverdue: this.isOverdue(),
      daysOverdue: this.getDaysOverdue(),
      paymentStatus: this.getPaymentStatusText(),
      minimumPayment: this.calculateMinimumPayment(),
      maximumPayment: this.calculateMaximumPayment(),
      totalInterest: this.getTotalInterest(),
      monthlyInterestRate: this.getMonthlyInterestRate(),
      userName: this.userName,
      userType: this.userType,
      currentBalance: this.currentBalance,
      adminName: this.adminName
    };
  }
}

module.exports = Loan;