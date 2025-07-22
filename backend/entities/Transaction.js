/**
 * Transaction domain entity
 */
class Transaction {
  constructor(data = {}) {
    this.transactionId = data.transaction_id || data.transactionId;
    this.userId = data.user_id || data.userId;
    this.credit = parseFloat(data.credit || 0);
    this.debit = parseFloat(data.debit || 0);
    this.memo = data.memo;
    this.transactionType = data.transaction_type || data.transactionType || 'general';
    this.status = data.status || 'pending';
    this.date = data.date;
    this.adminId = data.admin_id || data.adminId;
    
    // Related data
    this.userName = data.user_name || data.userName;
    this.adminName = data.admin_name || data.adminName;
  }

  // Type check methods
  isDeposit() {
    return this.credit > 0 && this.debit === 0;
  }

  isWithdrawal() {
    return this.debit > 0 && this.credit === 0;
  }

  isSubscriptionPayment() {
    return this.transactionType === 'subscription' || 
           (this.memo && this.memo.includes('اشتراك'));
  }

  isLoanPayment() {
    return this.transactionType === 'loan_payment';
  }

  // Status check methods
  isPending() {
    return this.status === 'pending';
  }

  isAccepted() {
    return this.status === 'accepted';
  }

  isRejected() {
    return this.status === 'rejected';
  }

  // Amount methods
  getAmount() {
    return this.credit > 0 ? this.credit : this.debit;
  }

  getSignedAmount() {
    return this.credit > 0 ? this.credit : -this.debit;
  }

  // Type classification
  getTransactionTypeText() {
    switch (this.transactionType) {
      case 'deposit': return 'إيداع';
      case 'withdrawal': return 'سحب';
      case 'subscription': return 'اشتراك';
      case 'loan_payment': return 'تسديد قرض';
      case 'fee': return 'رسوم';
      case 'transfer': return 'تحويل';
      default: return 'عام';
    }
  }

  getStatusText() {
    switch (this.status) {
      case 'pending': return 'بانتظار الموافقة';
      case 'accepted': return 'معتمد';
      case 'rejected': return 'مرفوض';
      default: return 'غير معروف';
    }
  }

  getTransactionDirection() {
    if (this.isDeposit()) return 'دائن';
    if (this.isWithdrawal()) return 'مدين';
    return 'متوازن';
  }

  // Validation methods
  isValidAmount() {
    return (this.credit > 0 && this.debit === 0) || (this.debit > 0 && this.credit === 0);
  }

  hasValidStatus() {
    return ['pending', 'accepted', 'rejected'].includes(this.status);
  }

  canBeApproved() {
    return this.isPending() && this.isValidAmount();
  }

  canBeRejected() {
    return this.isPending();
  }

  // Business logic
  affectsBalance() {
    return this.isAccepted() && this.isValidAmount();
  }

  getBalanceImpact() {
    if (!this.affectsBalance()) return 0;
    return this.getSignedAmount();
  }

  // Time-based methods
  isRecent(days = 30) {
    if (!this.date) return false;
    
    const transactionDate = new Date(this.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return transactionDate >= cutoffDate;
  }

  isCurrentMonth() {
    if (!this.date) return false;
    
    const transactionDate = new Date(this.date);
    const now = new Date();
    
    return transactionDate.getFullYear() === now.getFullYear() &&
           transactionDate.getMonth() === now.getMonth();
  }

  isCurrentYear() {
    if (!this.date) return false;
    
    const transactionDate = new Date(this.date);
    const now = new Date();
    
    return transactionDate.getFullYear() === now.getFullYear();
  }

  // Formatting methods
  getFormattedAmount() {
    const amount = this.getAmount();
    return `${amount.toFixed(3)} د.ك`;
  }

  getFormattedDate() {
    if (!this.date) return '';
    
    return new Date(this.date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Categorization for reports
  getCategory() {
    if (this.isSubscriptionPayment()) return 'subscription';
    if (this.isLoanPayment()) return 'loan';
    if (this.isDeposit()) return 'deposit';
    if (this.isWithdrawal()) return 'withdrawal';
    return 'other';
  }

  // Serialization
  toJSON() {
    return {
      transactionId: this.transactionId,
      userId: this.userId,
      credit: this.credit,
      debit: this.debit,
      amount: this.getAmount(),
      signedAmount: this.getSignedAmount(),
      memo: this.memo,
      transactionType: this.transactionType,
      transactionTypeText: this.getTransactionTypeText(),
      status: this.status,
      statusText: this.getStatusText(),
      date: this.date,
      formattedDate: this.getFormattedDate(),
      adminId: this.adminId,
      userName: this.userName,
      adminName: this.adminName,
      direction: this.getTransactionDirection(),
      category: this.getCategory(),
      affectsBalance: this.affectsBalance(),
      balanceImpact: this.getBalanceImpact(),
      isRecent: this.isRecent(),
      isCurrentMonth: this.isCurrentMonth(),
      isCurrentYear: this.isCurrentYear(),
      formattedAmount: this.getFormattedAmount()
    };
  }

  toSummaryJSON() {
    return {
      transactionId: this.transactionId,
      amount: this.getFormattedAmount(),
      type: this.getTransactionTypeText(),
      status: this.getStatusText(),
      date: this.getFormattedDate(),
      memo: this.memo
    };
  }
}

module.exports = Transaction;