const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

const router = express.Router();

// Public registration route
router.post('/register', [
  body('fullName').isLength({ min: 2 }).withMessage('الاسم يجب أن يكون حرفين على الأقل'),
  body('email').isEmail().withMessage('يرجى إدخال بريد إلكتروني صحيح'),
  body('phone').isLength({ min: 8 }).withMessage('رقم الهاتف يجب أن يكون 8 أرقام على الأقل'),
  body('password').isLength({ min: 1 }).withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: errors.array() 
    });
  }

  try {
    const { fullName, email, phone, whatsapp, password } = req.body;

    // Email duplicates are now allowed - no validation needed

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user - Back to old system:
    // joining_fee_approved = 'pending' (admin must approve for website access)
    // 10 KWD fee will be tracked separately via transactions
    const [result] = await pool.execute(
      `INSERT INTO users (Aname, email, phone, whatsapp, password, user_type, balance, registration_date, joining_fee_approved, is_blocked)
       VALUES (?, ?, ?, ?, ?, 'employee', 0, CURDATE(), 'pending', 0)`,
      [fullName, email, phone, whatsapp || phone, hashedPassword]
    );

    const newUserId = result.insertId;
    let emailSent = false;
    let emailMessage = '';

    // Send welcome email with user credentials (only if email is configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const emailResult = await emailService.sendWelcomeEmail(email, fullName, newUserId, password);
        if (emailResult.success) {
          console.log(`✅ Welcome email sent to ${email} for user ${newUserId}`);
          emailSent = true;
          emailMessage = `تم إرسال تفاصيل الحساب إلى بريدك الإلكتروني: ${email}`;
        } else {
          console.error(`❌ Failed to send welcome email to ${email}:`, emailResult.error);
          emailMessage = `لم يتم إرسال البريد الإلكتروني. ${emailResult.userMessage || 'خطأ في الإرسال'}`;
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        emailMessage = 'لم يتم إرسال البريد الإلكتروني. مشكلة في خدمة البريد الإلكتروني';
      }
    } else {
      console.log('📧 Email service not configured - skipping welcome email');
      emailMessage = 'لم يتم إرسال البريد الإلكتروني. خدمة البريد غير مفعلة';
    }

    const baseMessage = `تم تسجيل العضوية بنجاح. رقم العضوية الخاص بك هو: ${newUserId}`;
    const fullMessage = emailSent ? 
      `${baseMessage}. ${emailMessage}` : 
      `${baseMessage}. ${emailMessage}`;

    res.status(201).json({
      success: true,
      message: fullMessage,
      userId: newUserId,
      emailSent: emailSent,
      emailMessage: emailMessage
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم. يرجى المحاولة مرة أخرى'
    });
  }
});

// Login route
router.post('/login', [
  body('userId').isInt().withMessage('User ID must be an integer'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId, password } = req.body;

    // Get user from database
    const [users] = await pool.execute(
      'SELECT user_id, password, user_type, Aname, email, phone, whatsapp, balance, registration_date, joining_fee_approved, is_blocked FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'رقم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    const user = users[0];

    // Check if user registration is pending approval (admins can always login)
    if (user.joining_fee_approved === 'pending' && user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'حسابك قيد المراجعة من قبل الإدارة. سيتم إشعارك عند الموافقة على طلب التسجيل.'
      });
    }

    // Check if user registration was rejected
    if (user.joining_fee_approved === 'rejected' && user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'تم رفض طلب التسجيل الخاص بك. يرجى التواصل مع الإدارة للاستفسار.'
      });
    }

    // Check if user is blocked (admins can always login)
    if (user.is_blocked == 1 && user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'رقم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Calculate max loan amount
    const maxLoanAmount = Math.min((user.balance || 0) * 3, 10000);

    res.json({
      success: true,
      message: `مرحباً بك ${user.Aname}`,
      token,
      user: {
        user_id: user.user_id,
        name: user.Aname,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        user_type: user.user_type,
        balance: user.balance || 0,
        maxLoanAmount: maxLoanAmount,
        registration_date: user.registration_date,
        joining_fee_approved: user.joining_fee_approved,
        is_blocked: user.is_blocked,
        isAdmin: user.user_type === 'admin'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم. يرجى المحاولة مرة أخرى'
    });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT user_id, Aname, email, phone, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];
    const maxLoanAmount = Math.min((user.balance || 0) * 3, 10000);

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.Aname,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        user_type: user.user_type,
        balance: user.balance || 0,
        maxLoanAmount: maxLoanAmount,
        registration_date: user.registration_date,
        joining_fee_approved: user.joining_fee_approved,
        is_blocked: user.is_blocked,
        isAdmin: user.user_type === 'admin'
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم'
    });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبتان'
      });
    }

    if (newPassword.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة مطلوبة'
      });
    }

    // Get current password
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [hashedNewPassword, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور'
    });
  }
});

// Logout (client-side will remove token)
router.post('/logout', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
});

// Request password reset (admin only can reset user passwords)
router.post('/reset-password', verifyToken, async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body;
    const adminId = req.user.user_id;

    // Check if current user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'صلاحيات المدير مطلوبة لإعادة تعيين كلمة المرور'
      });
    }

    if (!targetUserId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'رقم المستخدم وكلمة المرور الجديدة مطلوبان'
      });
    }

    if (newPassword.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور مطلوبة'
      });
    }

    // Check if target user exists
    const [users] = await pool.execute(
      'SELECT user_id, Aname FROM users WHERE user_id = ?',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [hashedPassword, targetUserId]
    );

    res.json({
      success: true,
      message: `تم إعادة تعيين كلمة المرور للمستخدم ${users[0].Aname || targetUserId} بنجاح`
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تعيين كلمة المرور'
    });
  }
});



module.exports = router;