const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const LoanCalculator = require('../models/LoanCalculator');
const emailService = require('../services/emailService');
const DatabaseService = require('../services/DatabaseService');

class UserManagementController {
  static getAllUsers = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting all users list...');
    
    const rawUsers = await UserService.getUsersByType();
    console.log(`👥 Found ${rawUsers.length} users`);
    
    // Users now include current_loan_amount from the database query
    const users = rawUsers;
    
    ResponseHelper.success(res, { users }, 'تم جلب قائمة المستخدمين بنجاح');
  });

  static getPendingRegistrations = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting pending registrations...');
    
    const users = await UserService.getUsersByStatus('pending');
    console.log(`👥 Found ${users.length} pending registrations`);
    
    ResponseHelper.success(res, users, 'تم جلب طلبات التسجيل المعلقة بنجاح');
  });

  static getRegistrations = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting registrations by status...');
    const { status } = req.query;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return ResponseHelper.error(res, 'حالة غير صحيحة', 400);
    }

    const users = await UserService.getUsersByStatus(status);
    console.log(`👥 Found ${users.length} ${status} registrations`);

    ResponseHelper.success(res, users, `تم جلب طلبات التسجيل ${status === 'approved' ? 'المعتمدة' : 'المرفوضة'} بنجاح`);
  });

  static getPendingWebsiteAccess = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting pending website access requests...');

    const users = await UserService.getBlockedUsers();
    console.log(`👥 Found ${users.length} users waiting for website access approval`);

    ResponseHelper.success(res, users, 'تم جلب طلبات الدخول للموقع المعلقة بنجاح');
  });

  static registerUser = asyncHandler(async (req, res) => {
    console.log('👤 Admin registering new user...');
    const { fullName, email, phone, whatsapp, balance, joiningFeeApproved, password } = req.body;
    
    // Email duplicates are now allowed - no validation needed

    const userData = {
      Aname: fullName,
      email,
      phone,
      whatsapp: whatsapp || phone,
      balance: balance || 0,
      joining_fee_approved: joiningFeeApproved || 'pending',
      password
    };

    const userId = await UserService.createUser(userData);
    console.log(`✅ User registered with ID: ${userId}`);
    
    // Create initial subscription transaction if balance is provided
    if (balance && balance > 0) {
      const DatabaseService = require('../services/DatabaseService');
      const adminId = req.user.user_id; // Get admin ID from JWT token
      
      const transactionData = {
        user_id: userId,
        credit: balance,
        memo: 'اشتراك أولي عند التسجيل',
        status: 'accepted', // Auto-approved since admin is creating it
        transaction_type: 'subscription',
        admin_id: adminId,
        date: new Date()
      };
      
      try {
        const transactionResult = await DatabaseService.create('transaction', transactionData);
        console.log(`✅ Initial subscription transaction created with ID: ${transactionResult.insertId}`);
      } catch (transactionError) {
        console.error('❌ Failed to create initial subscription transaction:', transactionError);
        // Don't fail user creation if transaction fails, but log the error
      }
    }
    
    // Send welcome email with credentials (if email service is configured)
    let emailMessage = '';
    let emailSent = false;
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const emailService = require('../services/emailService');
        const emailResult = await emailService.sendWelcomeEmail(email, fullName, userId, password);
        if (emailResult.success) {
          console.log(`✅ Welcome email sent to ${email} for user ${userId}`);
          emailSent = true;
          emailMessage = ` تم إرسال تفاصيل الحساب إلى البريد الإلكتروني: ${email}`;
        } else {
          console.error(`❌ Failed to send welcome email to ${email}:`, emailResult.error);
          emailMessage = ` لم يتم إرسال البريد الإلكتروني: ${emailResult.userMessage || 'خطأ في الإرسال'}`;
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        emailMessage = ' لم يتم إرسال البريد الإلكتروني: مشكلة في خدمة البريد';
      }
    } else {
      console.log('📧 Email service not configured - skipping welcome email');
      emailMessage = ' لم يتم إرسال البريد الإلكتروني: خدمة البريد غير مفعلة';
    }
    
    const baseMessage = `تم تسجيل المستخدم بنجاح. رقم المستخدم: ${userId}`;
    const fullMessage = `${baseMessage}.${emailMessage}`;
    
    ResponseHelper.created(res, { userId, emailSent }, fullMessage);
  });

  static toggleBlockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body;
    
    console.log(`🔒 Admin ${action}ing user ${userId}`);
    
    if (!['block', 'unblock'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    await UserService.blockUser(userId, action === 'block');
    
    ResponseHelper.success(res, null, 
      action === 'block' ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم'
    );
  });

  static joiningFeeAction = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body;
    const adminId = req.user.user_id; // Get admin ID from JWT token
    
    console.log(`💰 Admin ${adminId} ${action}ing joining fee for user ${userId}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return ResponseHelper.error(res, 'إجراء غير صحيح', 400);
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    await UserService.updateJoiningFeeStatus(userId, status, adminId);

    // Send email notification to user
    try {
      const user = await UserService.getBasicUserInfo(userId, 'Aname, email');
      
      if (user && user.email) {
        await emailService.sendJoiningFeeApprovalEmail(
          user.email,
          user.Aname,
          status
        );
        
        console.log(`✅ Joining fee status email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send joining fee status email:', emailError);
      // Don't fail the request if email fails
    }
    
    ResponseHelper.success(res, null,
      action === 'approve' ? 'تم اعتماد رسوم الانضمام' : 'تم رفض رسوم الانضمام'
    );
  });

  static markJoiningFeePaid = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const adminId = req.user.user_id;

    console.log(`💰 Admin ${adminId} marking 10 KWD joining fee as paid for user ${userId}`);

    // Update the joining_fee_paid status
    await DatabaseService.update('users',
      { joining_fee_paid: 'paid' },
      { user_id: userId }
    );

    ResponseHelper.success(res, null, 'تم تسجيل دفع رسوم العضوية (10 د.ك) بنجاح');
  });

  static getUserDetails = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    console.log(`👤 Admin requesting details for user ${userId}`);
    
    const user = await UserService.getBasicUserInfo(userId);
    ResponseHelper.success(res, { user }, 'تم جلب تفاصيل المستخدم بنجاح');
  });

  static getUserStats = asyncHandler(async (req, res) => {
    const stats = await UserService.getUserStats();
    ResponseHelper.success(res, { stats }, 'تم جلب إحصائيات المستخدمين بنجاح');
  });

  static updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const updateData = req.body;
    
    console.log(`📝 Admin updating user ${userId} with data:`, updateData);
    
    // Validate that user exists
    const existingUser = await UserService.getBasicUserInfo(userId);
    if (!existingUser) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    // Check email uniqueness if email is being updated
    // Email duplicates are now allowed - no validation needed for email updates

    // Update user
    await UserService.updateUser(userId, updateData);
    console.log(`✅ User ${userId} updated successfully`);
    
    ResponseHelper.success(res, null, 'تم تحديث بيانات المستخدم بنجاح');
  });

  static reassignUserAdmin = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { newAdminId } = req.body;

    console.log(`🔄 Admin reassigning user ${userId} to admin ${newAdminId}`);

    // Validate input
    if (!newAdminId || isNaN(newAdminId)) {
      return ResponseHelper.error(res, 'معرف المدير الجديد مطلوب ويجب أن يكون رقماً صحيحاً', 400);
    }

    // Validate that target user exists and is not an admin
    const targetUser = await UserService.getBasicUserInfo(userId);
    if (!targetUser) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    if (targetUser.user_type === 'admin') {
      return ResponseHelper.error(res, 'لا يمكن إعادة تعيين مدير لمستخدم إداري', 400);
    }

    // Validate that new admin exists and is an admin
    const newAdmin = await UserService.getBasicUserInfo(newAdminId);
    if (!newAdmin) {
      return ResponseHelper.error(res, 'المدير المحدد غير موجود', 404);
    }

    if (newAdmin.user_type !== 'admin') {
      return ResponseHelper.error(res, 'المستخدم المحدد ليس مديراً', 400);
    }

    // Update the user's assigned admin
    await UserService.updateUser(userId, { approved_by_admin_id: newAdminId });

    console.log(`✅ User ${userId} reassigned to admin ${newAdminId} (${newAdmin.Aname})`);

    ResponseHelper.success(res, {
      userId: parseInt(userId),
      newAdminId: parseInt(newAdminId),
      newAdminName: newAdmin.Aname
    }, 'تم إعادة تعيين المدير بنجاح');
  });

  static getAvailableAdmins = asyncHandler(async (req, res) => {
    console.log('📋 Getting list of available admins for reassignment');

    // Get all admin users
    const { pool } = require('../config/database');
    const [admins] = await pool.execute(`
      SELECT user_id, Aname as admin_name
      FROM users
      WHERE user_type = 'admin'
      ORDER BY Aname
    `);

    console.log(`✅ Found ${admins.length} available admins`);

    ResponseHelper.success(res, { admins }, 'تم جلب قائمة المديرين بنجاح');
  });

  static fixLoanInstallments = asyncHandler(async (req, res) => {
    console.log('🔧 Admin fixing loan installments with zero values...');
    
    // Find loans with zero or null installment amounts
    const { pool } = require('../config/database');
    const [loansToFix] = await pool.execute(`
      SELECT rl.loan_id, rl.loan_amount, rl.user_id, u.balance
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      WHERE rl.installment_amount <= 0 OR rl.installment_amount IS NULL
    `);

    if (loansToFix.length === 0) {
      return ResponseHelper.success(res, { fixed: 0 }, 'لم يتم العثور على قروض تحتاج إصلاح');
    }

    let fixedCount = 0;
    const errors = [];

    for (const loan of loansToFix) {
      try {
        // Calculate correct installment using LoanCalculator for consistency
        const installmentData = new LoanCalculator().calculateInstallment(loan.loan_amount, loan.balance);
        const monthlyInstallment = installmentData.amount;

        // Update the loan record
        await pool.execute(`
          UPDATE requested_loan 
          SET installment_amount = ? 
          WHERE loan_id = ?
        `, [monthlyInstallment, loan.loan_id]);

        fixedCount++;
        console.log(`✅ Fixed loan ${loan.loan_id}: ${loan.loan_amount} KWD → ${monthlyInstallment} KWD/month`);
      } catch (error) {
        console.error(`❌ Failed to fix loan ${loan.loan_id}:`, error);
        errors.push(`Loan ${loan.loan_id}: ${error.message}`);
      }
    }

    ResponseHelper.success(res, { 
      total: loansToFix.length,
      fixed: fixedCount,
      errors: errors.length > 0 ? errors : undefined
    }, `تم إصلاح ${fixedCount} من ${loansToFix.length} قرض`);
  });

  // Search users for loan management
  static searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return ResponseHelper.error(res, 'يرجى إدخال رقم أو نص للبحث', 400);
    }

    const { pool } = require('../config/database');
    const searchQuery = q.trim();
    
    // Check if it's a numeric search (for user_id)
    const isNumeric = /^\d+$/.test(searchQuery);
    let users;

    if (isNumeric) {
      // Exact match for user_id or phone number
      [users] = await pool.execute(`
        SELECT user_id, Aname, phone, email, balance, user_type
        FROM users 
        WHERE user_type = 'employee' 
          AND (user_id = ? OR phone LIKE ?)
        ORDER BY Aname ASC
        LIMIT 20
      `, [parseInt(searchQuery), `%${searchQuery}%`]);
    } else {
      // Text search for name and email
      const searchTerm = `%${searchQuery}%`;
      [users] = await pool.execute(`
        SELECT user_id, Aname, phone, email, balance, user_type
        FROM users 
        WHERE user_type = 'employee' 
          AND (Aname LIKE ? OR email LIKE ?)
        ORDER BY Aname ASC
        LIMIT 20
      `, [searchTerm, searchTerm]);
    }

    ResponseHelper.success(res, { users }, `تم العثور على ${users.length} مستخدم`);
  });

  // Admin method to get specific user's transactions
  static getUserTransactions = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 1000); // Validate limit between 1-1000
    
    console.log(`👤 Admin requesting transactions for user ${userId} (limit: ${limit})`);
    
    // Verify user exists
    const user = await UserService.getBasicUserInfo(userId);
    if (!user) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    const { pool } = require('../config/database');
    // Use string template instead of parameterized LIMIT to avoid MySQL binding issues
    const [transactions] = await pool.execute(`
      SELECT t.*, u.Aname as admin_name
      FROM transaction t
      LEFT JOIN users u ON t.admin_id = u.user_id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
      LIMIT ${limit}
    `, [userId]);
    
    ResponseHelper.success(res, { 
      transactions,
      count: transactions.length,
      userName: user.Aname 
    }, 'تم جلب معاملات المستخدم بنجاح');
  });

  // Admin method to get specific user's loan payments
  static getUserLoanPayments = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    console.log(`👤 Admin requesting loan payments for user ${userId}`);
    
    // Verify user exists
    const user = await UserService.getBasicUserInfo(userId);
    if (!user) {
      return ResponseHelper.error(res, 'المستخدم غير موجود', 404);
    }

    const { pool } = require('../config/database');
    const [loanPayments] = await pool.execute(`
      SELECT l.*, u.Aname as admin_name, rl.loan_amount
      FROM loan l
      LEFT JOIN users u ON l.admin_id = u.user_id
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      WHERE l.user_id = ?
      ORDER BY l.date DESC
    `, [userId]);
    
    ResponseHelper.success(res, { 
      loanPayments,
      count: loanPayments.length,
      userName: user.Aname 
    }, 'تم جلب دفعات قروض المستخدم بنجاح');
  });

}

module.exports = UserManagementController;