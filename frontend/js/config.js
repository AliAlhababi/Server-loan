// Global Configuration and Settings
window.AppConfig = {
  // API Settings
  api: {
    baseUrl: window.location.origin,
    timeout: 30000,
    retryAttempts: 3
  },

  // UI Settings
  ui: {
    // Currency formatting
    currency: {
      symbol: 'د.ك',
      decimals: 3,
      locale: 'ar-KW'
    },
    
    // Date formatting
    date: {
      locale: 'ar-KW',
      options: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    },
    
    // Toast notifications
    toast: {
      duration: {
        success: 3000,
        error: 5000,
        warning: 4000,
        info: 3000
      },
      position: 'top-right'
    },
    
    // Modal settings
    modal: {
      closeOnEscape: true,
      closeOnBackdrop: true,
      animation: 'fade'
    },
    
    // Pagination
    pagination: {
      defaultPageSize: 10,
      pageSizeOptions: [5, 10, 20, 50]
    }
  },

  // Business Rules
  business: {
    // Subscription requirements
    subscription: {
      amount: 240,
      period: 24 // months
    },
    
    // Loan rules
    loan: {
      minBalance: 500,
      maxMultiplier: 3,
      systemCap: 10000,
      minInstallment: 20,
      joiningFee: 10,
      closureCooldown: 30, // days
      receiptCooldown: 11 // months
    },
    
    // Payment settings
    payment: {
      minAmount: 1,
      maxAmount: 1000,
      quickAmounts: [10, 20, 50, 100],
      step: 0.001
    }
  },

  // User Types and Permissions
  userTypes: {
    admin: {
      label: 'مدير',
      permissions: ['all']
    },
    employee: {
      label: 'عضو',
      subscriptionAmount: 240,
      permissions: ['user']
    }
  },

  // Transaction Types
  transactionTypes: {
    deposit: {
      label: 'إيداع',
      icon: 'fa-arrow-up',
      class: 'credit',
      color: 'success'
    },
    withdrawal: {
      label: 'سحب',
      icon: 'fa-arrow-down',
      class: 'debit',
      color: 'warning'
    },
    subscription: {
      label: 'اشتراك',
      icon: 'fa-coins',
      class: 'credit',
      color: 'success'
    },
    loan_payment: {
      label: 'تسديد قرض',
      icon: 'fa-credit-card',
      class: 'debit',
      color: 'info'
    }
  },

  // Status Types
  statusTypes: {
    pending: {
      label: 'معلق',
      icon: 'fa-clock',
      class: 'warning',
      color: '#f39c12'
    },
    accepted: {
      label: 'مقبول',
      icon: 'fa-check-circle',
      class: 'success',
      color: '#27ae60'
    },
    approved: {
      label: 'معتمد',
      icon: 'fa-check-circle',
      class: 'success',
      color: '#27ae60'
    },
    rejected: {
      label: 'مرفوض',
      icon: 'fa-times-circle',
      class: 'danger',
      color: '#e74c3c'
    },
    closed: {
      label: 'مغلق',
      icon: 'fa-lock',
      class: 'secondary',
      color: '#95a5a6'
    }
  },

  // Cache settings
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    userDataTTL: 2 * 60 * 1000, // 2 minutes
    transactionsTTL: 30 * 1000, // 30 seconds
    subscriptionTTL: 60 * 1000 // 1 minute
  },

  // Validation rules
  validation: {
    password: {
      minLength: 6,
      requireNumbers: false,
      requireSymbols: false
    },
    phone: {
      pattern: /^(\+965|0)?[0-9]{8}$/,
      message: 'رقم الهاتف غير صحيح'
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'البريد الإلكتروني غير صحيح'
    }
  },

  // Messages
  messages: {
    success: {
      login: 'مرحباً بك! تم تسجيل الدخول بنجاح',
      logout: 'تم تسجيل الخروج بنجاح',
      update: 'تم التحديث بنجاح',
      delete: 'تم الحذف بنجاح',
      save: 'تم الحفظ بنجاح',
      submit: 'تم إرسال الطلب بنجاح'
    },
    error: {
      network: 'خطأ في الاتصال بالخادم',
      unauthorized: 'غير مصرح لك بالدخول',
      forbidden: 'غير مصرح لك بهذا الإجراء',
      notFound: 'العنصر المطلوب غير موجود',
      validation: 'يرجى التأكد من صحة البيانات المدخلة',
      server: 'خطأ في الخادم، يرجى المحاولة مرة أخرى'
    },
    confirm: {
      delete: 'هل أنت متأكد من حذف هذا العنصر؟',
      logout: 'هل أنت متأكد من تسجيل الخروج؟',
      cancel: 'هل أنت متأكد من إلغاء هذا الإجراء؟'
    }
  }
};

// Global Utility Functions
window.AppUtils = {
  // Format currency
  formatCurrency(amount, showSymbol = true) {
    const config = AppConfig.ui.currency;
    const formatted = parseFloat(amount || 0).toLocaleString(config.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
    return showSymbol ? `${formatted} ${config.symbol}` : formatted;
  },

  // Format date
  formatDate(date, includeTime = false) {
    const config = AppConfig.ui.date;
    const dateObj = new Date(date);
    
    if (includeTime) {
      return dateObj.toLocaleString(config.locale);
    }
    
    return dateObj.toLocaleDateString(config.locale, config.options);
  },

  // Get status info
  getStatusInfo(status) {
    return AppConfig.statusTypes[status] || AppConfig.statusTypes.pending;
  },

  // Get transaction type info
  getTransactionTypeInfo(type) {
    return AppConfig.transactionTypes[type] || AppConfig.transactionTypes.deposit;
  },

  // Get user type info
  getUserTypeInfo(userType) {
    return AppConfig.userTypes[userType] || AppConfig.userTypes.employee;
  },

  // Validate form field
  validateField(field, value, rules = {}) {
    const errors = [];
    
    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      errors.push(`${field} مطلوب`);
    }
    
    // Length validation
    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} يجب أن يكون ${rules.minLength} أحرف على الأقل`);
    }
    
    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} يجب أن يكون ${rules.maxLength} أحرف كحد أقصى`);
    }
    
    // Pattern validation
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || `${field} غير صحيح`);
    }
    
    // Number validation
    if (value && rules.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors.push(`${field} يجب أن يكون رقماً صحيحاً`);
      } else {
        if (rules.min !== undefined && num < rules.min) {
          errors.push(`${field} يجب أن يكون ${rules.min} أو أكثر`);
        }
        if (rules.max !== undefined && num > rules.max) {
          errors.push(`${field} يجب أن يكون ${rules.max} أو أقل`);
        }
      }
    }
    
    return errors;
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Get subscription requirement
  getSubscriptionRequirement() {
    return AppConfig.business.subscription;
  },

  // Calculate loan eligibility amount
  calculateMaxLoan(balance) {
    const { maxMultiplier, systemCap } = AppConfig.business.loan;
    return Math.min((balance || 0) * maxMultiplier, systemCap);
  },

  // Get quick payment amounts
  getQuickAmounts() {
    return AppConfig.business.payment.quickAmounts;
  }
};

// Legacy compatibility - keep existing formatCurrency function
if (typeof formatCurrency === 'undefined') {
  window.formatCurrency = AppUtils.formatCurrency;
}