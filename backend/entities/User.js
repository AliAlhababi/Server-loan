/**
 * User domain entity
 */
class User {
  constructor(data = {}) {
    this.userId = data.user_id || data.userId;
    this.name = data.Aname || data.name;
    this.civilId = data.civil_id || data.civilId;
    this.phone = data.phone;
    this.email = data.email;
    this.whatsapp = data.whatsapp;
    this.userType = data.user_type || data.userType;
    this.workplace = data.workplace;
    this.balance = parseFloat(data.balance || data.current_balance || 0);
    this.joiningFeeApproved = data.joining_fee_approved || data.joiningFeeApproved;
    this.registrationDate = data.registration_date || data.registrationDate;
    this.isBlocked = Boolean(data.is_blocked || data.isBlocked);
    this.maxLoanAmount = parseFloat(data.max_loan_amount || data.maxLoanAmount || 0);
  }

  // Business logic methods
  isAdmin() {
    return this.userType === 'admin';
  }

  isEmployee() {
    return this.userType === 'employee';
  }

  isStudent() {
    return this.userType === 'student';
  }

  isActive() {
    return !this.isBlocked;
  }

  hasJoiningFeeApproved() {
    return this.joiningFeeApproved === 'approved';
  }

  hasJoiningFeePending() {
    return this.joiningFeeApproved === 'pending';
  }

  hasJoiningFeeRejected() {
    return this.joiningFeeApproved === 'rejected';
  }

  getMaxLoanAmount() {
    return Math.min(this.balance * 3, 10000);
  }

  hasMinimumBalance() {
    return this.balance >= 500;
  }

  hasOneYearRegistration() {
    if (!this.registrationDate) return false;
    
    const registrationDate = new Date(this.registrationDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return registrationDate <= oneYearAgo;
  }

  getDaysUntilOneYearRegistration() {
    if (!this.registrationDate) return Infinity;
    
    const registrationDate = new Date(this.registrationDate);
    const oneYearFromRegistration = new Date(registrationDate);
    oneYearFromRegistration.setFullYear(oneYearFromRegistration.getFullYear() + 1);
    
    const now = new Date();
    if (now >= oneYearFromRegistration) return 0;
    
    return Math.ceil((oneYearFromRegistration - now) / (1000 * 60 * 60 * 24));
  }

  getRequiredSubscriptionAmount() {
    // Simplified to single rate for all users
    return 240; // KWD
  }

  getBalanceTier() {
    if (this.balance >= 3330) {
      return { name: 'الحساب الخاص', level: 'special', multiplier: 3 };
    } else if (this.balance >= 1000) {
      return { name: 'الفئة المتوسطة', level: 'medium', multiplier: 3 };
    } else if (this.balance >= 500) {
      return { name: 'الفئة الأساسية', level: 'basic', multiplier: 3 };
    } else {
      return { name: 'غير مؤهل', level: 'ineligible', multiplier: 0 };
    }
  }

  // Validation methods
  isValidEmail() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  isValidPhone() {
    return /^\d{8,15}$/.test(this.phone?.replace(/[\s\-\+\(\)]/g, ''));
  }

  // Serialization
  toJSON() {
    return {
      userId: this.userId,
      name: this.name,
      civilId: this.civilId,
      phone: this.phone,
      email: this.email,
      whatsapp: this.whatsapp,
      userType: this.userType,
      workplace: this.workplace,
      balance: this.balance,
      joiningFeeApproved: this.joiningFeeApproved,
      registrationDate: this.registrationDate,
      isBlocked: this.isBlocked,
      maxLoanAmount: this.getMaxLoanAmount(),
      balanceTier: this.getBalanceTier(),
      hasMinimumBalance: this.hasMinimumBalance(),
      hasOneYearRegistration: this.hasOneYearRegistration(),
      daysUntilOneYear: this.getDaysUntilOneYearRegistration()
    };
  }

  toSafeJSON() {
    const json = this.toJSON();
    delete json.civilId;
    return json;
  }
}

module.exports = User;