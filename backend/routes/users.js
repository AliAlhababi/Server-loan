const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const UserModel = require('../models/UserModel');

const router = express.Router();

// Get user profile
router.get('/profile/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await UserModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Remove sensitive data
    delete user.password;

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user transactions
router.get('/transactions/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const transactions = await UserModel.getUserTransactions(userId);

    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Request deposit (subscription payment)
router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const { amount, memo } = req.body;
    const userId = req.user.user_id;

    console.log('Deposit request:', { userId, amount, memo }); // Debug log

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ الإيداع مطلوب ويجب أن يكون أكبر من صفر'
      });
    }

    // Get current user data
    const [users] = await pool.execute(
      'SELECT balance FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const currentBalance = users[0].balance || 0;

    // Get the first available admin user
    const [adminUsers] = await pool.execute(`
      SELECT user_id FROM users WHERE user_type = 'admin' ORDER BY user_id LIMIT 1
    `);
    
    if (adminUsers.length === 0) {
      throw new Error('لا يوجد مدير متاح لمعالجة الطلب');
    }
    
    const adminId = adminUsers[0].user_id;

    // Insert deposit request (pending admin approval)
    const [result] = await pool.execute(`
      INSERT INTO transaction 
      (user_id, credit, memo, status, admin_id)
      VALUES (?, ?, ?, 'pending', ?)
    `, [
      userId,
      amount,
      memo || 'إيداع اشتراك',
      adminId
    ]);

    console.log('Deposit inserted with ID:', result.insertId); // Debug log

    res.json({
      success: true,
      message: 'تم إرسال طلب الإيداع. في انتظار موافقة الإدارة',
      deposit: {
        id: result.insertId,
        amount,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال طلب الإيداع: ' + error.message
    });
  }
});

// Send feedback/message to admin
router.post('/feedback', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.user_id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نص الرسالة مطلوب'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'الرسالة طويلة جداً (الحد الأقصى 500 حرف)'
      });
    }

    // Insert feedback
    const [result] = await pool.execute(`
      INSERT INTO feedback 
      (user_id, feedback, admin_id)
      VALUES (?, ?, ?)
    `, [
      userId,
      message.trim(),
      process.env.DEFAULT_ADMIN_ID || 1
    ]);

    res.json({
      success: true,
      message: 'تم إرسال رسالتك بنجاح. سيتم الرد عليك قريباً',
      feedback: {
        id: result.insertId,
        message: message.trim(),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة'
    });
  }
});

// Get user's feedback history
router.get('/feedback/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [feedback] = await pool.execute(`
      SELECT f.*, u.Aname as admin_name
      FROM feedback f
      LEFT JOIN users u ON f.admin_id = u.user_id
      WHERE f.user_id = ?
      ORDER BY f.date DESC
    `, [userId]);

    res.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الرسائل'
    });
  }
});

// Update user profile
router.put('/profile/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const {
      mobile1,
      mobile2,
      email,
      HomeAddress,
      WorkAddress,
      BankName,
      AccountNo,
      IBAN,
      BankName2,
      AccountNo2,
      IBAN2
    } = req.body;

    // Validate required fields
    if (!mobile1 || !email) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف والبريد الإلكتروني مطلوبان'
      });
    }

    // Check if email already exists for another user
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم من قبل مستخدم آخر'
      });
    }

    // Update user profile
    await pool.execute(`
      UPDATE users SET 
        mobile1 = ?, mobile2 = ?, email = ?, 
        HomeAddress = ?, WorkAddress = ?,
        BankName = ?, AccountNo = ?, IBAN = ?,
        BankName2 = ?, AccountNo2 = ?, IBAN2 = ?
      WHERE user_id = ?
    `, [
      mobile1, mobile2, email,
      HomeAddress, WorkAddress,
      BankName, AccountNo, IBAN,
      BankName2, AccountNo2, IBAN2,
      userId
    ]);

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي'
    });
  }
});

// Get user dashboard data
router.get('/dashboard/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Get user basic info directly from database
    const [users] = await pool.execute(
      'SELECT user_id, Aname, user_type, balance, registration_date FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];

    // Get active loan directly
    const [activeLoans] = await pool.execute(`
      SELECT rl.*, 
             (rl.loan_amount - COALESCE(paid.total_paid, 0)) as remaining_amount,
             COALESCE(paid.total_paid, 0) as paid_amount
      FROM requested_loan rl
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan 
        WHERE status = 'accepted'
        GROUP BY target_loan_id
      ) paid ON rl.loan_id = paid.target_loan_id
      WHERE rl.user_id = ? AND rl.status = 'approved'
      LIMIT 1
    `, [userId]);

    // Get recent transactions directly
    const [recentTransactions] = await pool.execute(`
      SELECT * FROM transaction 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      dashboard: {
        user: {
          user_id: user.user_id,
          name: user.Aname,
          user_type: user.user_type,
          balance: user.balance || 0,
          maxLoanAmount: (user.balance || 0) * 3,
          registration_date: user.registration_date
        },
        activeLoan: activeLoans[0] || null,
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات لوحة التحكم: ' + error.message
    });
  }
});

// Get user loan payments
router.get('/loan-payments/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const loanPayments = await UserModel.getUserLoanPayments(userId);

    res.json({
      success: true,
      loanPayments
    });

  } catch (error) {
    console.error('Get loan payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { fullName, phone, email, workplace, currentPassword, newPassword } = req.body;

    // Get current user
    const [users] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const currentUser = users[0];

    // If password change is requested, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'يرجى إدخال كلمة المرور الحالية'
        });
      }

      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور الحالية غير صحيحة'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update with new password
      await pool.execute(`
        UPDATE users 
        SET Aname = ?, mobile1 = ?, email = ?, WorkAddress = ?, password = ?
        WHERE user_id = ?
      `, [fullName, phone, email, workplace || '', hashedPassword, userId]);
    } else {
      // Update without password change
      await pool.execute(`
        UPDATE users 
        SET Aname = ?, mobile1 = ?, email = ?, WorkAddress = ?
        WHERE user_id = ?
      `, [fullName, phone, email, workplace || '', userId]);
    }

    res.json({
      success: true,
      message: 'تم تحديث البيانات الشخصية بنجاح',
      user: {
        user_id: userId,
        name: fullName,
        phone: phone,
        email: email,
        workplace: workplace
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث البيانات الشخصية'
    });
  }
});

// Self-service password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;

    // Validation
    if (!email || !phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني ورقم الهاتف وكلمة المرور الجديدة مطلوبة'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // Check if user exists with matching email and phone
    const [users] = await pool.execute(
      'SELECT user_id, Aname, email, phone FROM users WHERE email = ? AND phone = ?',
      [email, phone]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على مستخدم بهذا البريد الإلكتروني ورقم الهاتف'
      });
    }

    const user = users[0];

    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [hashedPassword, user.user_id]
    );

    // Log the password reset activity
    const [adminUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE user_type = "admin" ORDER BY user_id LIMIT 1'
    );
    
    if (adminUsers.length > 0) {
      await pool.execute(`
        INSERT INTO transaction 
        (user_id, balance, credit, debit, memo, status, admin_id)
        VALUES (?, (SELECT balance FROM users WHERE user_id = ?), 0, 0, ?, 'accepted', ?)
      `, [
        user.user_id,
        user.user_id,
        'إعادة تعيين كلمة المرور بواسطة المستخدم',
        adminUsers[0].user_id
      ]);
    }

    res.json({
      success: true,
      message: `تم إعادة تعيين كلمة المرور بنجاح للمستخدم ${user.Aname}`,
      user: {
        name: user.Aname,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تعيين كلمة المرور'
    });
  }
});

// Get user messages
router.get('/messages/:userId', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const [messages] = await pool.execute(`
      SELECT m.*, u.Aname as sender_name 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.user_id
      WHERE m.user_id = ? 
      ORDER BY m.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الرسائل'
    });
  }
});

// Send message to admin
router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.userId;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'الموضوع والرسالة مطلوبان'
      });
    }

    // Get admin user ID (assuming admin has user_type = 'admin')
    const [admins] = await pool.execute(
      'SELECT user_id FROM users WHERE user_type = "admin" LIMIT 1'
    );

    if (admins.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'لا يمكن العثور على المدير'
      });
    }

    const adminId = admins[0].user_id;

    await pool.execute(`
      INSERT INTO messages (user_id, sender_type, sender_id, subject, message, priority)
      VALUES (?, 'user', ?, ?, ?, 'medium')
    `, [userId, userId, subject, message]);

    res.json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح'
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة'
    });
  }
});

// Mark message as read
router.put('/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.userId;

    // Verify message belongs to user or user is admin
    const [messages] = await pool.execute(
      'SELECT user_id FROM messages WHERE message_id = ?',
      [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة'
      });
    }

    if (messages[0].user_id !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بهذا الإجراء'
      });
    }

    await pool.execute(
      'UPDATE messages SET status = "read" WHERE message_id = ?',
      [messageId]
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة الرسالة'
    });

  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الرسالة'
    });
  }
});

module.exports = router;