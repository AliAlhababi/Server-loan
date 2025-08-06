const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/AdminController');
const BackupController = require('../controllers/BackupController');
const BankController = require('../controllers/BankController');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', verifyToken, requireAdmin, adminController.getDashboardStats);

// Get financial summary
router.get('/financial-summary', verifyToken, requireAdmin, adminController.getFinancialSummary);

// Get pending loan requests
router.get('/pending-loans', verifyToken, requireAdmin, adminController.getPendingLoans);

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

// User management endpoints
router.post('/register-user', verifyToken, requireAdmin, adminController.registerUser);
router.put('/block-user/:userId', verifyToken, requireAdmin, adminController.toggleBlockUser);
router.put('/joining-fee-action/:userId', verifyToken, requireAdmin, adminController.joiningFeeAction);
router.get('/user-details/:userId', verifyToken, requireAdmin, adminController.getUserDetails);
router.put('/update-user/:userId', verifyToken, requireAdmin, adminController.updateUser);

// Loan repair endpoints
router.post('/fix-loan-installments', verifyToken, requireAdmin, adminController.fixLoanInstallments);

// Loan management endpoints
router.post('/loan-action/:loanId', verifyToken, requireAdmin, adminController.loanAction);
router.get('/loan-details/:loanId', verifyToken, requireAdmin, adminController.getLoanDetails);
router.get('/loan-payments/:loanId', verifyToken, requireAdmin, adminController.getLoanPayments);

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

router.get('/download-sql-backup', verifyToken, requireAdmin, BackupController.downloadSQLBackup);
router.get('/download-transactions-report', verifyToken, requireAdmin, BackupController.downloadTransactionsReport);
router.get('/download-arabic-pdf-report', verifyToken, requireAdmin, BackupController.downloadArabicPDFReport);
router.get('/download-excel-backup', verifyToken, requireAdmin, BackupController.downloadExcelBackup);
router.get('/download-excel-as-pdf', verifyToken, requireAdmin, BackupController.downloadExcelAsPDF);

module.exports = router;

