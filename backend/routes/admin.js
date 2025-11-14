const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/AdminController');
const BackupController = require('../controllers/BackupController');
const FullBackupController = require('../controllers/FullBackupController');
const BankController = require('../controllers/BankController');
const LoanManagementController = require('../controllers/LoanManagementController');
const WhatsAppController = require('../controllers/WhatsAppController');
const WhatsAppAutomationController = require('../controllers/WhatsAppAutomationController');
const WhatsAppBulkController = require('../controllers/WhatsAppBulkController');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', verifyToken, requireAdmin, adminController.getDashboardStats);

// Get financial summary
router.get('/financial-summary', verifyToken, requireAdmin, adminController.getFinancialSummary);

// Get pending loan requests
router.get('/pending-loans', verifyToken, requireAdmin, adminController.getPendingLoans);

// Get multiple loan alerts (SECURITY FIX)
router.get('/multiple-loan-alerts', verifyToken, requireAdmin, LoanManagementController.getMultipleLoanAlerts);

// Get all loans (pending, approved, rejected)
router.get('/all-loans', verifyToken, requireAdmin, adminController.getAllLoans);

// Get pending transactions
router.get('/pending-transactions', verifyToken, requireAdmin, adminController.getPendingTransactions);

// Get pending loan payments
router.get('/pending-loan-payments', verifyToken, requireAdmin, adminController.getPendingLoanPayments);

// Get all loan payments (new endpoint)
router.get('/all-loan-payments', verifyToken, requireAdmin, adminController.getAllLoanPayments);

// Get all transactions
router.get('/all-transactions', verifyToken, requireAdmin, adminController.getAllTransactions);

// Get all users for admin management
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);

// Registration management endpoints
router.get('/pending-registrations', verifyToken, requireAdmin, adminController.getPendingRegistrations);
router.get('/pending-website-access', verifyToken, requireAdmin, adminController.getPendingWebsiteAccess);
router.get('/registrations', verifyToken, requireAdmin, adminController.getRegistrations);

// User management endpoints
router.post('/register-user', verifyToken, requireAdmin, adminController.registerUser);
router.put('/block-user/:userId', verifyToken, requireAdmin, adminController.toggleBlockUser);
router.put('/joining-fee-action/:userId', verifyToken, requireAdmin, adminController.joiningFeeAction);
router.put('/mark-joining-fee-paid/:userId', verifyToken, requireAdmin, adminController.markJoiningFeePaid);
router.get('/user-details/:userId', verifyToken, requireAdmin, adminController.getUserDetails);
router.put('/update-user/:userId', verifyToken, requireAdmin, adminController.updateUser);
router.put('/reassign-user-admin/:userId', verifyToken, requireAdmin, adminController.reassignUserAdmin);
router.get('/available-admins', verifyToken, requireAdmin, adminController.getAvailableAdmins);

// Admin endpoints for accessing specific user data
router.get('/user-transactions/:userId', verifyToken, requireAdmin, adminController.getUserTransactions);
router.get('/user-loan-payments/:userId', verifyToken, requireAdmin, adminController.getUserLoanPayments);

// Loan repair endpoints
router.post('/fix-loan-installments', verifyToken, requireAdmin, adminController.fixLoanInstallments);

// Loan management endpoints
router.post('/loan-action/:loanId', verifyToken, requireAdmin, adminController.loanAction);
router.get('/loan-details/:loanId', verifyToken, requireAdmin, adminController.getLoanDetails);
router.get('/loan-payments/:loanId', verifyToken, requireAdmin, adminController.getLoanPayments);

// Admin override - Create loan with override capability
router.post('/create-loan-with-override', verifyToken, requireAdmin, adminController.createLoanWithOverride);

// Loan closure endpoints
router.post('/close-loan/:loanId', verifyToken, requireAdmin, adminController.closeLoan);
router.get('/loans-eligible-for-closure', verifyToken, requireAdmin, adminController.getLoansEligibleForClosure);
router.post('/auto-close-loans', verifyToken, requireAdmin, adminController.autoCloseLoans);

// Transaction approval endpoints
router.post('/transaction-action/:transactionId', verifyToken, requireAdmin, adminController.transactionAction);
router.post('/loan-payment-action/:loanPaymentId', verifyToken, requireAdmin, adminController.loanPaymentAction);

// Enhanced loan management endpoints - CRUD operations
router.get('/search-users', verifyToken, requireAdmin, adminController.searchUsers);
router.get('/test-error', verifyToken, requireAdmin, adminController.testError);
router.post('/add-loan', verifyToken, requireAdmin, adminController.addLoan);
router.put('/update-loan/:loanId', verifyToken, requireAdmin, adminController.updateLoan);
router.delete('/delete-loan/:loanId', verifyToken, requireAdmin, adminController.deleteLoan);

// Transaction CRUD operations
router.post('/add-transaction', verifyToken, requireAdmin, adminController.addTransaction);
router.put('/update-transaction/:transactionId', verifyToken, requireAdmin, adminController.updateTransaction);
router.delete('/delete-transaction/:transactionId', verifyToken, requireAdmin, adminController.deleteTransaction);

// Loan Payment CRUD operations
router.post('/add-loan-payment', verifyToken, requireAdmin, adminController.addLoanPayment);
router.put('/update-loan-payment/:paymentId', verifyToken, requireAdmin, adminController.updateLoanPayment);
router.delete('/delete-loan-payment/:paymentId', verifyToken, requireAdmin, adminController.deleteLoanPayment);

// Family delegation management endpoints
router.get('/pending-family-delegations', verifyToken, requireAdmin, async (req, res) => {
  const { pool } = require('../config/database');
  try {
    const [pendingDelegations] = await pool.execute(`
      SELECT fd.delegation_id, fd.family_head_id, fd.family_member_id, fd.notes, fd.created_date,
             fd.delegation_type,
             head.Aname as head_name, head.balance as head_balance,
             member.Aname as member_name, member.balance as member_balance
      FROM family_delegations fd
      JOIN users head ON fd.family_head_id = head.user_id
      JOIN users member ON fd.family_member_id = member.user_id
      WHERE fd.delegation_status = 'pending'
      ORDER BY fd.delegation_type DESC, fd.created_date DESC
    `);
    
    res.json({
      success: true,
      delegations: pendingDelegations
    });
  } catch (error) {
    console.error('خطأ في جلب طلبات التفويض المعلقة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات التفويض المعلقة'
    });
  }
});

router.get('/all-family-delegations', verifyToken, requireAdmin, async (req, res) => {
  const { pool } = require('../config/database');
  try {
    const [allDelegations] = await pool.execute(`
      SELECT fd.delegation_id, fd.family_head_id, fd.family_member_id, fd.notes, fd.admin_notes,
             fd.created_date, fd.approved_date, fd.revoked_date, fd.delegation_status, fd.delegation_type,
             head.Aname as head_name, head.balance as head_balance,
             member.Aname as member_name, member.balance as member_balance,
             admin.Aname as admin_name
      FROM family_delegations fd
      JOIN users head ON fd.family_head_id = head.user_id
      JOIN users member ON fd.family_member_id = member.user_id
      LEFT JOIN users admin ON fd.approved_by_admin_id = admin.user_id
      ORDER BY fd.delegation_type DESC, fd.created_date DESC
    `);
    
    res.json({
      success: true,
      delegations: allDelegations
    });
  } catch (error) {
    console.error('خطأ في جلب جميع التفويضات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب جميع التفويضات'
    });
  }
});

router.post('/family-delegation-action/:delegationId', verifyToken, requireAdmin, async (req, res) => {
  const { pool } = require('../config/database');
  try {
    const { delegationId } = req.params;
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'
    const adminId = req.user.user_id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'الإجراء غير صحيح'
      });
    }
    
    // Get delegation details
    const [delegationResults] = await pool.execute(`
      SELECT family_head_id, family_member_id, delegation_status, delegation_type,
             head.Aname as head_name, member.Aname as member_name
      FROM family_delegations fd
      JOIN users head ON fd.family_head_id = head.user_id
      JOIN users member ON fd.family_member_id = member.user_id
      WHERE delegation_id = ?
    `, [delegationId]);
    
    if (delegationResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'طلب التفويض غير موجود'
      });
    }
    
    const delegation = delegationResults[0];
    
    if (delegation.delegation_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'طلب التفويض غير معلق للمراجعة'
      });
    }
    
    // Update delegation status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const approvedDate = action === 'approve' ? new Date() : null;
    
    await pool.execute(`
      UPDATE family_delegations 
      SET delegation_status = ?, approved_by_admin_id = ?, admin_notes = ?, approved_date = ?
      WHERE delegation_id = ?
    `, [newStatus, adminId, adminNotes || null, approvedDate, delegationId]);
    
    const actionText = action === 'approve' ? 'تم قبول' : 'تم رفض';
    const requestType = delegation.delegation_type === 'family_head_request' 
      ? 'طلب رب الأسرة' 
      : 'طلب التفويض العائلي';
    
    res.json({
      success: true,
      message: `${actionText} ${requestType}`,
      delegationType: delegation.delegation_type,
      headName: delegation.head_name,
      memberName: delegation.member_name
    });
  } catch (error) {
    console.error('خطأ في معالجة طلب التفويض:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة طلب التفويض'
    });
  }
});

// Bank management endpoints
router.get('/banks', verifyToken, requireAdmin, BankController.getAllBanks);
router.post('/banks', verifyToken, requireAdmin, BankController.createBank);
router.get('/banks/:bankId', verifyToken, requireAdmin, BankController.getBankDetails);
router.put('/banks/:bankId', verifyToken, requireAdmin, BankController.updateBank);
router.delete('/banks/:bankId', verifyToken, requireAdmin, BankController.deleteBank);
router.get('/banks-summary', verifyToken, requireAdmin, BankController.getTotalBanksBalance);

router.get('/download-transactions-report', verifyToken, requireAdmin, BackupController.downloadTransactionsReport);
router.get('/download-excel-backup', verifyToken, requireAdmin, BackupController.downloadExcelBackup);
router.get('/download-full-backup', verifyToken, requireAdmin, FullBackupController.downloadFullBackup);

// Memory monitoring endpoints
const memoryMonitor = require('../utils/MemoryMonitor');

// Get memory status
router.get('/memory-status', verifyToken, requireAdmin, (req, res) => {
  try {
    const status = memoryMonitor.getStatus();
    const growth = memoryMonitor.getGrowthAnalysis(10); // Last 10 minutes
    
    res.json({
      success: true,
      data: {
        status,
        growth,
        uptime: Math.round(process.uptime()),
        pid: process.pid
      }
    });
  } catch (error) {
    console.error('Memory status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة الذاكرة',
      error: error.message
    });
  }
});

// Start/stop memory monitoring
router.post('/memory-monitor/:action', verifyToken, requireAdmin, (req, res) => {
  try {
    const { action } = req.params;
    const { interval } = req.body;
    
    if (action === 'start') {
      memoryMonitor.startMonitoring(interval || 30);
      res.json({
        success: true,
        message: 'تم تشغيل مراقب الذاكرة',
        interval: interval || 30
      });
    } else if (action === 'stop') {
      memoryMonitor.stopMonitoring();
      res.json({
        success: true,
        message: 'تم إيقاف مراقب الذاكرة'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'إجراء غير صحيح'
      });
    }
  } catch (error) {
    console.error('Memory monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إدارة مراقب الذاكرة',
      error: error.message
    });
  }
});

// Trigger garbage collection
router.post('/trigger-gc', verifyToken, requireAdmin, (req, res) => {
  try {
    const result = memoryMonitor.triggerGC();
    
    if (result.error) {
      res.status(400).json({
        success: false,
        message: result.error
      });
    } else {
      res.json({
        success: true,
        message: `تم تنظيف الذاكرة - تم تحرير ${result.freed}MB`,
        freed: result.freed,
        before: Math.round(result.before.heapUsed / 1024 / 1024 * 100) / 100,
        after: Math.round(result.after.heapUsed / 1024 / 1024 * 100) / 100
      });
    }
  } catch (error) {
    console.error('GC trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تنظيف الذاكرة',
      error: error.message
    });
  }
});

// Heapdump trigger endpoint (admin only for debugging)
router.post('/trigger-heapdump', verifyToken, requireAdmin, (req, res) => {
  try {
    const heapdump = require('heapdump');
    const path = require('path');
    const fs = require('fs');
    
    // Create heapdumps directory if it doesn't exist
    const heapdumpDir = path.join(__dirname, '../../heapdumps');
    if (!fs.existsSync(heapdumpDir)) {
      fs.mkdirSync(heapdumpDir, { recursive: true });
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `heapdump-${timestamp}.heapsnapshot`;
    const filePath = path.join(heapdumpDir, filename);
    
    // Write heapdump
    heapdump.writeSnapshot(filePath, (err, filename) => {
      if (err) {
        console.error('Failed to create heapdump:', err);
        return res.status(500).json({
          success: false,
          message: 'فشل في إنشاء heapdump',
          error: err.message
        });
      }
      
      console.log(`Heapdump created: ${filename}`);
      res.json({
        success: true,
        message: 'تم إنشاء heapdump بنجاح',
        filename: path.basename(filename),
        path: filename,
        size: fs.statSync(filename).size,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Heapdump trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تشغيل heapdump',
      error: error.message
    });
  }
});

// WhatsApp Queue Management Endpoints
router.get('/whatsapp-queue/pending', verifyToken, requireAdmin, WhatsAppController.getPendingNotifications);
router.get('/whatsapp-queue/all', verifyToken, requireAdmin, WhatsAppController.getAllNotifications);
router.get('/whatsapp-queue/by-status/:status', verifyToken, requireAdmin, WhatsAppController.getNotificationsByStatus);
router.get('/whatsapp-queue/stats', verifyToken, requireAdmin, WhatsAppController.getNotificationStats);
router.get('/whatsapp-queue/notification/:notificationId', verifyToken, requireAdmin, WhatsAppController.getNotificationDetails);
router.post('/whatsapp-queue/notification/:notificationId/sent', verifyToken, requireAdmin, WhatsAppController.markNotificationSent);
router.post('/whatsapp-queue/notification/:notificationId/failed', verifyToken, requireAdmin, WhatsAppController.markNotificationFailed);
router.post('/whatsapp-queue/batch-sent', verifyToken, requireAdmin, WhatsAppController.batchMarkSent);
router.delete('/whatsapp-queue/clear-old', verifyToken, requireAdmin, WhatsAppController.clearOldNotifications);
router.post('/whatsapp-queue/reset-to-pending', verifyToken, requireAdmin, WhatsAppController.resetToPending);

// WhatsApp Configuration endpoint (Brand-specific)
router.get('/whatsapp/config', verifyToken, requireAdmin, (req, res) => {
    const brandConfig = require('../config/brandConfig');
    const whatsappConfig = brandConfig.getSection('whatsapp');
    
    res.json({
        success: true,
        data: {
            businessPhone: whatsappConfig.phone,
            businessName: whatsappConfig.businessName,
            brandName: brandConfig.getBrandDisplayName()
        }
    });
});

// WhatsApp Server-Side Automation Endpoints (VNC Compatible)
router.post('/whatsapp-automation/init', verifyToken, requireAdmin, WhatsAppAutomationController.initializeBrowser);
router.get('/whatsapp-automation/auth-status', verifyToken, requireAdmin, WhatsAppAutomationController.checkAuth);
router.post('/whatsapp-automation/start', verifyToken, requireAdmin, WhatsAppAutomationController.startAutomation);
router.get('/whatsapp-automation/status', verifyToken, requireAdmin, WhatsAppAutomationController.getStatus);
router.post('/whatsapp-automation/stop', verifyToken, requireAdmin, WhatsAppAutomationController.stopAutomation);
router.post('/whatsapp-automation/close', verifyToken, requireAdmin, WhatsAppAutomationController.closeBrowser);

// WhatsApp Bulk Automation Endpoints (Alternative)
router.get('/whatsapp-bulk/generate-links', verifyToken, requireAdmin, WhatsAppBulkController.generateBulkLinks);
router.post('/whatsapp-bulk/start', verifyToken, requireAdmin, WhatsAppBulkController.startBulkSending);
router.get('/whatsapp-bulk/status', verifyToken, requireAdmin, WhatsAppBulkController.getBulkStatus);
router.post('/whatsapp-bulk/stop', verifyToken, requireAdmin, WhatsAppBulkController.stopBulkSending);
router.post('/whatsapp-bulk/complete', verifyToken, requireAdmin, WhatsAppBulkController.completeBulkSession);
router.get('/whatsapp-bulk/automation-script', verifyToken, requireAdmin, WhatsAppBulkController.getAutomationScript);

// Admin Profile Management
router.put('/profile', verifyToken, requireAdmin, async (req, res) => {
  const { pool } = require('../config/database');
  const UserService = require('../services/UserService');
  
  try {
    const userId = req.user.user_id;
    const { name, email, phone, whatsapp } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والبريد الإلكتروني ورقم الهاتف مطلوبان'
      });
    }

    // Email duplicates are now allowed - no validation needed

    const profileData = {
      Aname: name,
      email,
      phone,
      whatsapp: whatsapp || phone // Use phone as default if whatsapp not provided
    };

    await UserService.updateUserProfile(userId, profileData);
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح'
    });
    
  } catch (error) {
    console.error('خطأ في تحديث ملف المدير الشخصي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي'
    });
  }
});

// Admin Change Password  
router.post('/change-password', verifyToken, requireAdmin, async (req, res) => {
  const bcrypt = require('bcrypt');
  const { pool } = require('../config/database');
  
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبتان'
      });
    }

    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!passwordMatch) {
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
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تغيير كلمة مرور المدير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور'
    });
  }
});

module.exports = router;

