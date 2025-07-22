const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(userId, password) {
    try {
      // Find user by ID
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      // Check if user is blocked
      if (user.is_blocked === 1) {
        throw new Error('تم حظر المستخدم - يرجى التواصل مع الإدارة');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user data without password
      const userData = {
        userId: user.user_id,
        name: user.Aname,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        userType: user.user_type,
        balance: user.current_balance,
        maxLoanAmount: user.max_loan_amount,
        joiningFeeApproved: user.joining_fee_approved,
        registrationDate: user.registration_date,
        isBlocked: user.is_blocked === 1
      };

      return {
        success: true,
        token,
        user: userData
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const user = await this.userRepository.findByUserId(decoded.userId);
      
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      if (user.is_blocked === 1) {
        throw new Error('تم حظر المستخدم');
      }

      return {
        userId: user.user_id,
        name: user.Aname,
        email: user.email,
        userType: user.user_type,
        balance: user.current_balance,
        isBlocked: user.is_blocked === 1
      };

    } catch (error) {
      throw new Error('رمز التوثيق غير صحيح');
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      }

      // Get user and verify current password
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('كلمة المرور الحالية غير صحيحة');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const success = await this.userRepository.updatePassword(userId, hashedNewPassword);
      if (!success) {
        throw new Error('فشل في تحديث كلمة المرور');
      }

      return { success: true, message: 'تم تحديث كلمة المرور بنجاح' };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async resetPassword(email, phone, newPassword = null) {
    try {
      // Find user by email and phone
      const user = await this.userRepository.findByEmailOrPhone(email, phone);
      if (!user || user.email !== email || user.phone !== phone) {
        throw new Error('البريد الإلكتروني أو رقم الهاتف غير صحيح');
      }

      // Generate password if not provided
      let passwordToSet = newPassword;
      if (!passwordToSet) {
        passwordToSet = this.generateRandomPassword();
      }

      // Validate password
      if (passwordToSet.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(passwordToSet, 10);

      // Update password
      const success = await this.userRepository.updatePassword(user.user_id, hashedPassword);
      if (!success) {
        throw new Error('فشل في إعادة تعيين كلمة المرور');
      }

      return {
        success: true,
        message: 'تم إعادة تعيين كلمة المرور بنجاح',
        newPassword: passwordToSet,
        userName: user.Aname
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  generateToken(user) {
    const payload = {
      userId: user.user_id,
      userType: user.user_type,
      name: user.Aname
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
      expiresIn: '24h'
    });
  }

  generateRandomPassword(length = 8) {
    const characters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return password;
  }

  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = AuthService;