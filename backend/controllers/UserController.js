const UserService = require('../services/UserService');
const TransactionService = require('../services/TransactionService');
const LoanService = require('../services/LoanService');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/ResponseHelper');

class UserController {
  constructor() {
    this.userService = new UserService();
    this.transactionService = new TransactionService();
    this.loanService = new LoanService();
  }

  async getUserDashboard(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const dashboardData = await this.userService.getUserDashboardData(userId);
      sendSuccessResponse(res, 'تم جلب بيانات لوحة التحكم بنجاح', dashboardData);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async updateUserProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { Aname, email, phone, whatsapp, workplace } = req.body;

      const result = await this.userService.updateUserProfile(userId, {
        Aname, email, phone, whatsapp, workplace
      });

      sendSuccessResponse(res, result.message);

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async getUserTransactions(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const transactions = await this.userService.getUserTransactions(userId);
      sendSuccessResponse(res, 'تم جلب تاريخ المعاملات بنجاح', transactions);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getUserLoanPayments(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const loanPayments = await this.userService.getUserLoanPayments(userId);
      sendSuccessResponse(res, 'تم جلب تاريخ تسديدات القروض بنجاح', loanPayments);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async requestDeposit(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, memo } = req.body;

      if (!amount || amount <= 0) {
        return sendErrorResponse(res, 'مبلغ الإيداع يجب أن يكون أكبر من صفر', 400);
      }

      const result = await this.userService.requestDeposit(userId, amount, memo);
      sendSuccessResponse(res, result.message, { transactionId: result.transactionId });

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async getSubscriptionStatus(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const subscriptionStatus = await this.transactionService.getUserSubscriptionStatus(userId);
      sendSuccessResponse(res, 'تم جلب حالة الاشتراك بنجاح', subscriptionStatus);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getFinancialSummary(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const financialSummary = await this.transactionService.getUserFinancialSummary(userId);
      sendSuccessResponse(res, 'تم جلب الملخص المالي بنجاح', financialSummary);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async checkLoanEligibility(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const eligibility = await this.loanService.checkLoanEligibility(userId);
      sendSuccessResponse(res, 'تم فحص أهلية القرض بنجاح', eligibility);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getActiveLoanDetails(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return sendErrorResponse(res, 'رقم المستخدم مطلوب', 400);
      }

      const activeLoan = await this.loanService.getActiveLoanDetails(userId);
      sendSuccessResponse(res, 'تم جلب تفاصيل القرض النشط بنجاح', activeLoan);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }
}

module.exports = UserController;