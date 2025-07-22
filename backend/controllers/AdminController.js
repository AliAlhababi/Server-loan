const AdminService = require('../services/AdminService');
const UserService = require('../services/UserService');
const LoanService = require('../services/LoanService');
const TransactionService = require('../services/TransactionService');
const emailService = require('../services/emailService');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/ResponseHelper');

class AdminController {
  constructor() {
    this.adminService = new AdminService();
    this.userService = new UserService();
    this.loanService = new LoanService();
    this.transactionService = new TransactionService();
    this.emailService = emailService;
  }

  async getDashboard(req, res) {
    try {
      const stats = await this.adminService.getDashboardStats();
      sendSuccessResponse(res, 'تم جلب إحصائيات لوحة التحكم بنجاح', stats);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  // User management endpoints
  async registerUser(req, res) {
    try {
      const { Aname, civilId, phone, email, userType, workplace, balance, password, whatsapp } = req.body;

      const result = await this.userService.createUser({
        Aname, civilId, phone, email, userType, workplace, 
        balance, password, whatsapp
      });

      sendSuccessResponse(res, result.message, { userId: result.userId });
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async getAllUsers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const users = await this.userService.getAllUsers(limit);
      sendSuccessResponse(res, 'تم جلب قائمة المستخدمين بنجاح', users);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getUserDetails(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const userDetails = await this.adminService.getUserDetails(userId);
      sendSuccessResponse(res, 'تم جلب تفاصيل المستخدم بنجاح', userDetails);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async updateJoiningFeeStatus(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const { action } = req.body;
      const adminId = req.user.userId;

      if (!userId || !action) {
        return sendErrorResponse(res, 'رقم المستخدم والإجراء مطلوبان', 400);
      }

      const status = action === 'approve' ? 'approved' : 'rejected';
      const result = await this.userService.updateUserJoiningFeeStatus(userId, status, adminId);
      
      sendSuccessResponse(res, result.message);
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async updateUserBlockStatus(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const { action } = req.body;
      const adminId = req.user.userId;

      if (!userId || !action) {
        return sendErrorResponse(res, 'رقم المستخدم والإجراء مطلوبان', 400);
      }

      const isBlocked = action === 'block';
      const result = await this.userService.updateUserBlockStatus(userId, isBlocked, adminId);
      
      sendSuccessResponse(res, result.message);
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async updateUserRegistrationDate(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const { registrationDate } = req.body;
      const adminId = req.user.userId;

      if (!userId || !registrationDate) {
        return sendErrorResponse(res, 'رقم المستخدم وتاريخ التسجيل مطلوبان', 400);
      }

      const result = await this.userService.updateUserRegistrationDate(userId, registrationDate, adminId);
      sendSuccessResponse(res, result.message);
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  // Loan management endpoints
  async getAllLoans(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const loans = await this.loanService.getAllLoans(limit);
      sendSuccessResponse(res, 'تم جلب قائمة القروض بنجاح', loans);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async processLoanAction(req, res) {
    try {
      const loanId = parseInt(req.params.loanId);
      const { action, reason } = req.body;
      const adminId = req.user.userId;

      if (!loanId || !action) {
        return sendErrorResponse(res, 'رقم القرض والإجراء مطلوبان', 400);
      }

      const result = await this.adminService.processLoanAction(loanId, action, adminId, reason);
      sendSuccessResponse(res, result.message);
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  // Transaction management endpoints
  async getAllTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const transactions = await this.transactionService.getAllTransactions(limit);
      sendSuccessResponse(res, 'تم جلب قائمة المعاملات بنجاح', transactions);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async processTransactionAction(req, res) {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { action } = req.body;
      const adminId = req.user.userId;

      if (!transactionId || !action) {
        return sendErrorResponse(res, 'رقم المعاملة والإجراء مطلوبان', 400);
      }

      const result = await this.adminService.processTransactionAction(transactionId, action, adminId);
      sendSuccessResponse(res, result.message);
    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  // Report endpoints
  async getUsersReport(req, res) {
    try {
      const report = await this.adminService.getAllUsersReport();
      sendSuccessResponse(res, 'تم جلب تقرير المستخدمين بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getLoansReport(req, res) {
    try {
      const report = await this.adminService.getAllLoansReport();
      sendSuccessResponse(res, 'تم جلب تقرير القروض بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getTransactionsReport(req, res) {
    try {
      const report = await this.adminService.getAllTransactionsReport();
      sendSuccessResponse(res, 'تم جلب تقرير المعاملات بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getFinancialSummary(req, res) {
    try {
      const report = await this.adminService.getFinancialSummaryReport();
      sendSuccessResponse(res, 'تم جلب التقرير المالي الشامل بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getMonthlyReport(req, res) {
    try {
      const report = await this.adminService.getMonthlyReport();
      sendSuccessResponse(res, 'تم جلب التقرير الشهري بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getActiveLoansReport(req, res) {
    try {
      const report = await this.adminService.getActiveLoansReport();
      sendSuccessResponse(res, 'تم جلب تقرير القروض النشطة بنجاح', report);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  // System management endpoints
  async exportSystemData(req, res) {
    try {
      const exportData = await this.adminService.exportSystemData();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="loan-system-backup-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async testEmail(req, res) {
    try {
      const { testEmail } = req.body;
      
      if (!testEmail) {
        return sendErrorResponse(res, 'عنوان البريد الإلكتروني للاختبار مطلوب', 400);
      }

      await this.emailService.sendWelcomeEmail({
        name: 'مستخدم تجريبي',
        email: testEmail,
        userId: 999,
        password: 'test123'
      });

      sendSuccessResponse(res, 'تم إرسال البريد الإلكتروني التجريبي بنجاح');
    } catch (error) {
      sendErrorResponse(res, 'فشل في إرسال البريد الإلكتروني: ' + error.message, 500);
    }
  }
}

module.exports = AdminController;