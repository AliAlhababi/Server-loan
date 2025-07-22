const LoanService = require('../services/LoanService');
const LoanCalculator = require('../models/LoanCalculator');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/ResponseHelper');

class LoanController {
  constructor() {
    this.loanService = new LoanService();
  }

  async requestLoan(req, res) {
    try {
      const userId = req.user.userId;
      const { requestedAmount, notes } = req.body;

      if (!requestedAmount || requestedAmount <= 0) {
        return sendErrorResponse(res, 'مبلغ القرض يجب أن يكون أكبر من صفر', 400);
      }

      const result = await this.loanService.requestLoan(userId, requestedAmount, notes);
      sendSuccessResponse(res, result.message, {
        loanId: result.loanId,
        loanTerms: result.loanTerms
      });

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async calculateLoanTerms(req, res) {
    try {
      const { balance, requestedAmount, installmentPeriod } = req.body;

      if (!balance || balance <= 0) {
        return sendErrorResponse(res, 'الرصيد يجب أن يكون أكبر من صفر', 400);
      }

      const loanTerms = await this.loanService.calculateLoanTerms(
        balance, 
        requestedAmount, 
        installmentPeriod
      );

      sendSuccessResponse(res, 'تم حساب شروط القرض بنجاح', loanTerms);

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async checkLoanEligibility(req, res) {
    try {
      const userId = req.user.userId;

      const eligibility = await this.loanService.checkLoanEligibility(userId);
      sendSuccessResponse(res, 'تم فحص أهلية القرض بنجاح', eligibility);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getUserLoanHistory(req, res) {
    try {
      const userId = req.user.userId;

      const loanHistory = await this.loanService.getUserLoanHistory(userId);
      sendSuccessResponse(res, 'تم جلب تاريخ القروض بنجاح', loanHistory);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  async getActiveLoan(req, res) {
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

  async processLoanPayment(req, res) {
    try {
      const userId = req.user.userId;
      const { targetLoanId, amount, memo } = req.body;

      if (!targetLoanId || !amount || amount <= 0) {
        return sendErrorResponse(res, 'رقم القرض ومبلغ الدفع مطلوبان', 400);
      }

      // For now, auto-approve payments - in production you might want admin approval
      const adminId = 1; // Default admin
      
      const result = await this.loanService.processLoanPayment(
        userId, 
        targetLoanId, 
        amount, 
        memo, 
        adminId
      );

      sendSuccessResponse(res, result.message, { paymentId: result.paymentId });

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async getUserLoanPayments(req, res) {
    try {
      const userId = req.user.userId;

      const loanPayments = await this.loanService.getUserLoanPayments(userId);
      sendSuccessResponse(res, 'تم جلب تاريخ تسديدات القروض بنجاح', loanPayments);

    } catch (error) {
      sendErrorResponse(res, error.message, 500);
    }
  }

  // Frontend calculator integration methods
  async calculateFromLoanAmount(req, res) {
    try {
      const { loanAmount, balance } = req.body;

      if (!loanAmount || !balance || loanAmount <= 0 || balance <= 0) {
        return sendErrorResponse(res, 'مبلغ القرض والرصيد مطلوبان', 400);
      }

      const calculator = new LoanCalculator();
      const result = calculator.calculateFromLoanAmount(loanAmount, balance);
      
      sendSuccessResponse(res, 'تم الحساب بنجاح', result);

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async calculateFromBalance(req, res) {
    try {
      const { balance } = req.body;

      if (!balance || balance <= 0) {
        return sendErrorResponse(res, 'الرصيد مطلوب', 400);
      }

      const calculator = new LoanCalculator();
      const result = calculator.calculateFromBalance(balance);
      
      sendSuccessResponse(res, 'تم الحساب بنجاح', result);

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }
}

module.exports = LoanController;