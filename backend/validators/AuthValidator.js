/**
 * Authentication input validation
 */
class AuthValidator {
  static validateLoginInput(req, res, next) {
    const { userId, password } = req.body;
    const errors = [];

    if (!userId) {
      errors.push('رقم المستخدم مطلوب');
    } else if (typeof userId !== 'number' && isNaN(parseInt(userId))) {
      errors.push('رقم المستخدم يجب أن يكون رقماً');
    }

    if (!password) {
      errors.push('كلمة المرور مطلوبة');
    } else if (password.length < 3) {
      errors.push('كلمة المرور يجب أن تكون 3 أحرف على الأقل');
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

  static validatePasswordResetInput(req, res, next) {
    const { email, phone } = req.body;
    const errors = [];

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

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors
      });
    }

    next();
  }

  static validatePasswordChangeInput(req, res, next) {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    if (!currentPassword) {
      errors.push('كلمة المرور الحالية مطلوبة');
    }

    if (!newPassword) {
      errors.push('كلمة المرور الجديدة مطلوبة');
    } else if (newPassword.length < 6) {
      errors.push('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      errors.push('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين');
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
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

module.exports = AuthValidator;