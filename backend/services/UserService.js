const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/UserRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const LoanPaymentRepository = require('../repositories/LoanPaymentRepository');
const emailService = require('./emailService');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.transactionRepository = new TransactionRepository();
    this.loanPaymentRepository = new LoanPaymentRepository();
    this.emailService = emailService;
  }

  async getUserById(userId) {
    try {
      return await this.userRepository.findByUserId(userId);
    } catch (error) {
      throw new Error('خطأ في جلب بيانات المستخدم: ' + error.message);
    }
  }

  async getUserDashboardData(userId) {
    try {
      const [user, transactions, loanPayments, financialSummary] = await Promise.all([
        this.userRepository.findByUserId(userId),
        this.transactionRepository.findTransactionsByUserId(userId, 10),
        this.loanPaymentRepository.findLoanPaymentsByUserId(userId, 10),
        this.transactionRepository.getUserFinancialSummary(userId)
      ]);

      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      return {
        user,
        transactions,
        loanPayments,
        financialSummary
      };
    } catch (error) {
      throw new Error('خطأ في جلب بيانات لوحة التحكم: ' + error.message);
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      const { Aname, email, phone, whatsapp, workplace } = profileData;

      // Validate required fields
      if (!Aname || !email || !phone) {
        throw new Error('الاسم والبريد الإلكتروني والهاتف مطلوبة');
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('تنسيق البريد الإلكتروني غير صحيح');
      }

      // Check if email is already used by another user
      const existingUser = await this.userRepository.findByEmailOrPhone(email, '');
      if (existingUser && existingUser.user_id !== userId) {
        throw new Error('البريد الإلكتروني مستخدم من قبل مستخدم آخر');
      }

      const success = await this.userRepository.updateProfile(userId, {
        Aname,
        email,
        phone,
        whatsapp: whatsapp || phone, // Use phone as fallback for WhatsApp
        workplace: workplace || ''
      });

      if (!success) {
        throw new Error('فشل في تحديث الملف الشخصي');
      }

      return {
        success: true,
        message: 'تم تحديث الملف الشخصي بنجاح'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getUserTransactions(userId, limit = 50) {
    try {
      return await this.transactionRepository.findTransactionsByUserId(userId, limit);
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ المعاملات: ' + error.message);
    }
  }

  async getUserLoanPayments(userId, limit = 50) {
    try {
      return await this.loanPaymentRepository.findLoanPaymentsByUserId(userId, limit);
    } catch (error) {
      throw new Error('خطأ في جلب تاريخ تسديدات القروض: ' + error.message);
    }
  }

  async requestDeposit(userId, amount, memo = null) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('مبلغ الإيداع يجب أن يكون أكبر من صفر');
      }

      // Get first admin for processing
      const admin = await this.userRepository.getFirstAdmin();
      if (!admin) {
        throw new Error('لا يوجد مدير متاح لمعالجة الطلب');
      }

      const transactionData = {
        userId,
        credit: amount,
        debit: null,
        memo: memo || `طلب إيداع ${amount} دينار`,
        transactionType: 'deposit',
        adminId: admin.user_id,
        status: 'pending'
      };

      const result = await this.transactionRepository.createTransaction(transactionData);

      return {
        success: true,
        transactionId: result.transactionId,
        message: 'تم تقديم طلب الإيداع بنجاح - بانتظار الموافقة'
      };

    } catch (error) {
      throw new Error('خطأ في طلب الإيداع: ' + error.message);
    }
  }

  async getAllUsers(limit = 100) {
    try {
      return await this.userRepository.findAllUsers(limit);
    } catch (error) {
      throw new Error('خطأ في جلب قائمة المستخدمين: ' + error.message);
    }
  }

  async createUser(userData) {
    try {
      const {
        Aname, civilId, phone, email, userType = 'user',
        workplace, balance = 0, password, whatsapp,
        joiningFeeStatus = 'pending'
      } = userData;

      // Validate required fields
      if (!Aname || !phone || !email || !password) {
        throw new Error('الاسم والهاتف والبريد الإلكتروني وكلمة المرور مطلوبة');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('تنسيق البريد الإلكتروني غير صحيح');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmailOrPhone(email, phone);
      if (existingUser) {
        throw new Error('المستخدم موجود مسبقاً بنفس البريد الإلكتروني أو رقم الهاتف');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUserData = {
        Aname,
        civilId,
        phone,
        email,
        userType,
        workplace: workplace || '',
        balance: parseFloat(balance) || 0,
        hashedPassword,
        whatsapp: whatsapp || phone,
        joiningFeeStatus
      };

      const result = await this.userRepository.createUser(newUserData);

      // Send welcome email
      try {
        await this.emailService.sendWelcomeEmail({
          name: Aname,
          email: email,
          userId: result.userId,
          password: password // Send original password in email
        });
      } catch (emailError) {
        console.error('فشل في إرسال البريد الترحيبي:', emailError.message);
        // Continue with user creation even if email fails
      }

      return {
        success: true,
        userId: result.userId,
        message: `تم إنشاء حساب المستخدم بنجاح - رقم المستخدم: ${result.userId}`
      };

    } catch (error) {
      throw new Error('خطأ في إنشاء المستخدم: ' + error.message);
    }
  }

  async updateUserJoiningFeeStatus(userId, status, adminId) {
    try {
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        throw new Error('حالة رسوم الانضمام غير صحيحة');
      }

      const success = await this.userRepository.updateJoiningFeeStatus(userId, status);
      if (!success) {
        throw new Error('فشل في تحديث حالة رسوم الانضمام');
      }

      const statusText = status === 'approved' ? 'موافق عليها' : 
                        status === 'rejected' ? 'مرفوضة' : 'بانتظار المراجعة';

      return {
        success: true,
        message: `تم تحديث حالة رسوم الانضمام إلى: ${statusText}`
      };

    } catch (error) {
      throw new Error('خطأ في تحديث رسوم الانضمام: ' + error.message);
    }
  }

  async updateUserBlockStatus(userId, isBlocked, adminId) {
    try {
      const success = await this.userRepository.updateBlockStatus(userId, isBlocked);
      if (!success) {
        throw new Error('فشل في تحديث حالة الحظر');
      }

      const statusText = isBlocked ? 'محظور' : 'نشط';

      return {
        success: true,
        message: `تم ${isBlocked ? 'حظر' : 'إلغاء حظر'} المستخدم - الحالة: ${statusText}`
      };

    } catch (error) {
      throw new Error('خطأ في تحديث حالة الحظر: ' + error.message);
    }
  }

  async updateUserRegistrationDate(userId, registrationDate, adminId) {
    try {
      const success = await this.userRepository.updateRegistrationDate(userId, registrationDate);
      if (!success) {
        throw new Error('فشل في تحديث تاريخ التسجيل');
      }

      return {
        success: true,
        message: 'تم تحديث تاريخ التسجيل بنجاح'
      };

    } catch (error) {
      throw new Error('خطأ في تحديث تاريخ التسجيل: ' + error.message);
    }
  }

  async getUserStats() {
    try {
      return await this.userRepository.getUserStats();
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات المستخدمين: ' + error.message);
    }
  }

  async getAdminUsers() {
    try {
      return await this.userRepository.findAdminUsers();
    } catch (error) {
      throw new Error('خطأ في جلب قائمة الإداريين: ' + error.message);
    }
  }
}

module.exports = UserService;