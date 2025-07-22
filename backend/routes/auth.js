const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Validate input
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'رقم المستخدم وكلمة المرور مطلوبان'
      });
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT user_id, password, user_type, Aname, balance, is_blocked FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'رقم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    const user = users[0];

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
        user_type: user.user_type,
        balance: user.balance || 0,
        maxLoanAmount: maxLoanAmount,
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
      'SELECT user_id, Aname, user_type, balance FROM users WHERE user_id = ?',
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
        user_type: user.user_type,
        balance: user.balance || 0,
        maxLoanAmount: maxLoanAmount,
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
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

// Get current user info (for token verification)
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        userId: req.user.user_id,
        userType: req.user.user_type,
        name: req.user.Aname,
        balance: req.user.balance || 0
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم'
    });
  }
});

module.exports = router;