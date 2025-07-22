/**
 * User input validation
 */
class UserValidator {
  static validateProfileUpdateInput(req, res, next) {
    const { Aname, email, phone, whatsapp, workplace } = req.body;
    const errors = [];

    if (!Aname) {
      errors.push('الاسم مطلوب');
    } else if (typeof Aname !== 'string' || Aname.trim().length < 2) {
      errors.push('الاسم يجب أن يكون حرفين على الأقل');
    } else if (Aname.length > 100) {
      errors.push('الاسم يجب أن يكون أقل من 100 حرف');
    }

    if (!email) {
      errors.push('البريد الإلكتروني مطلوب');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('تنسيق البريد الإلكتروني غير صحيح');
    }

    if (!phone) {
      errors.push('رقم الهاتف مطلوب');
    } else if (!/^\d{8,15}$/.test(phone.replace(/[\s\-\+\(\)]/g, ''))) {
      errors.push('تنسيق رقم الهاتف غير صحيح');
    }

    if (whatsapp && !/^\d{8,15}$/.test(whatsapp.replace(/[\s\-\+\(\)]/g, ''))) {
      errors.push('تنسيق رقم الواتساب غير صحيح');
    }

    if (workplace && typeof workplace !== 'string') {
      errors.push('مكان العمل يجب أن يكون نص');
    } else if (workplace && workplace.length > 200) {
      errors.push('مكان العمل يجب أن يكون أقل من 200 حرف');
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

  static validateDepositRequestInput(req, res, next) {
    const { amount, memo } = req.body;
    const errors = [];

    if (!amount) {
      errors.push('مبلغ الإيداع مطلوب');
    } else if (typeof amount !== 'number' && isNaN(parseFloat(amount))) {
      errors.push('مبلغ الإيداع يجب أن يكون رقماً');
    } else if (parseFloat(amount) <= 0) {
      errors.push('مبلغ الإيداع يجب أن يكون أكبر من صفر');
    } else if (parseFloat(amount) > 100000) {
      errors.push('مبلغ الإيداع يجب أن يكون أقل من 100,000 دينار');
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

  static validateUserRegistrationInput(req, res, next) {
    const { 
      Aname, civilId, phone, email, userType, 
      workplace, balance, password, whatsapp 
    } = req.body;
    const errors = [];

    if (!Aname) {
      errors.push('الاسم مطلوب');
    } else if (typeof Aname !== 'string' || Aname.trim().length < 2) {
      errors.push('الاسم يجب أن يكون حرفين على الأقل');
    }

    if (!phone) {
      errors.push('رقم الهاتف مطلوب');
    } else if (!/^\d{8,15}$/.test(phone.replace(/[\s\-\+\(\)]/g, ''))) {
      errors.push('تنسيق رقم الهاتف غير صحيح');
    }

    if (!email) {
      errors.push('البريد الإلكتروني مطلوب');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('تنسيق البريد الإلكتروني غير صحيح');
    }

    if (!password) {
      errors.push('كلمة المرور مطلوبة');
    } else if (password.length < 6) {
      errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    if (userType && !['employee', 'student', 'user'].includes(userType)) {
      errors.push('نوع المستخدم غير صحيح');
    }

    if (balance !== undefined && balance !== null) {
      if (typeof balance !== 'number' && isNaN(parseFloat(balance))) {
        errors.push('الرصيد يجب أن يكون رقماً');
      } else if (parseFloat(balance) < 0) {
        errors.push('الرصيد يجب أن يكون أكبر من أو يساوي صفر');
      }
    }

    if (whatsapp && !/^\d{8,15}$/.test(whatsapp.replace(/[\s\-\+\(\)]/g, ''))) {
      errors.push('تنسيق رقم الواتساب غير صحيح');
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

  static validateUserIdParam(req, res, next) {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'رقم المستخدم مطلوب ويجب أن يكون رقماً صحيحاً'
      });
    }

    next();
  }

  static validateUserActionInput(req, res, next) {
    const { action } = req.body;
    const errors = [];

    if (!action) {
      errors.push('الإجراء مطلوب');
    } else if (!['approve', 'reject', 'block', 'unblock'].includes(action)) {
      errors.push('الإجراء غير صحيح');
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

module.exports = UserValidator;