const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const LoanCalculator = require('../models/LoanCalculator');
const emailService = require('../services/emailService');

class UserManagementController {
  static getAllUsers = asyncHandler(async (req, res) => {
    console.log('📋 Admin requesting all users list...');
    
    const rawUsers = await UserService.getUsersByType();
    console.log(`👥 Found ${rawUsers.length} users`);
    
    // Users now include current_loan_amount from the database query
    const users = rawUsers;
    
    ResponseHelper.success(res, { users }, 'تم جلب قائمة المستخدمين بنجاح');
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
}

module.exports = UserManagementController;