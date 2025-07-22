/**
 * Loan input validation
 */
class LoanValidator {
  static validateLoanRequestInput(req, res, next) {
    const { requestedAmount, notes } = req.body;
    const errors = [];

    if (!requestedAmount) {
      errors.push('مبلغ القرض مطلوب');
    } else if (typeof requestedAmount !== 'number' && isNaN(parseFloat(requestedAmount))) {
      errors.push('مبلغ القرض يجب أن يكون رقماً');
    } else if (parseFloat(requestedAmount) <= 0) {
      errors.push('مبلغ القرض يجب أن يكون أكبر من صفر');
    } else if (parseFloat(requestedAmount) > 10000) {
      errors.push('مبلغ القرض يجب أن يكون أقل من أو يساوي 10,000 دينار');
    }

    if (notes && typeof notes !== 'string') {
      errors.push('الملاحظات يجب أن تكون نص');
    } else if (notes && notes.length > 500) {
      errors.push('الملاحظات يجب أن تكون أقل من 500 حرف');
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    next();
  }

  static validateLoanCalculationInput(req, res, next) {
    const { balance, requestedAmount, installmentPeriod } = req.body;
    const errors = [];

    if (!balance) {
      errors.push('الرصيد مطلوب');
    } else if (typeof balance !== 'number' && isNaN(parseFloat(balance))) {
      errors.push('الرصيد يجب أن يكون رقماً');
    } else if (parseFloat(balance) < 0) {
      errors.push('الرصيد يجب أن يكون أكبر من أو يساوي صفر');
    }

    if (requestedAmount !== undefined && requestedAmount !== null) {
      if (typeof requestedAmount !== 'number' && isNaN(parseFloat(requestedAmount))) {
        errors.push('مبلغ القرض يجب أن يكون رقماً');
      } else if (parseFloat(requestedAmount) <= 0) {
        errors.push('مبلغ القرض يجب أن يكون أكبر من صفر');
      }
    }

    if (installmentPeriod !== undefined && installmentPeriod !== null) {
      if (typeof installmentPeriod !== 'number' && isNaN(parseInt(installmentPeriod))) {
        errors.push('فترة التقسيط يجب أن تكون رقماً');
      } else if (parseInt(installmentPeriod) < 6) {
        errors.push('فترة التقسيط يجب أن تكون 6 أشهر على الأقل');
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    next();
  }

  static validateLoanPaymentInput(req, res, next) {
    const { targetLoanId, amount, memo } = req.body;
    const errors = [];

    if (!targetLoanId) {
      errors.push('رقم القرض مطلوب');
    } else if (typeof targetLoanId !== 'number' && isNaN(parseInt(targetLoanId))) {
      errors.push('رقم القرض يجب أن يكون رقماً');
    }

    if (!amount) {
      errors.push('مبلغ الدفع مطلوب');
    } else if (typeof amount !== 'number' && isNaN(parseFloat(amount))) {
      errors.push('مبلغ الدفع يجب أن يكون رقماً');
    } else if (parseFloat(amount) <= 0) {
      errors.push('مبلغ الدفع يجب أن يكون أكبر من صفر');
    } else if (parseFloat(amount) < 20) {
      errors.push('الحد الأدنى لمبلغ الدفع هو 20 دينار');
    }

    if (memo && typeof memo !== 'string') {
      errors.push('الملاحظات يجب أن تكون نص');
    } else if (memo && memo.length > 200) {
      errors.push('الملاحظات يجب أن تكون أقل من 200 حرف');
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    next();
  }

  static validateLoanActionInput(req, res, next) {
    const { action, reason } = req.body;
    const errors = [];

    if (!action) {
      errors.push('الإجراء مطلوب');
    } else if (!['approve', 'reject'].includes(action)) {
      errors.push('الإجراء يجب أن يكون موافقة أو رفض');
    }

    if (action === 'reject' && !reason) {
      errors.push('سبب الرفض مطلوب عند رفض القرض');
    }

    if (reason && typeof reason !== 'string') {
      errors.push('سبب الرفض يجب أن يكون نص');
    } else if (reason && reason.length > 500) {
      errors.push('سبب الرفض يجب أن يكون أقل من 500 حرف');
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    next();
  }
}

module.exports = LoanValidator;