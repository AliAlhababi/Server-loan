const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get total users
    const [totalUsers] = await pool.execute(
      'SELECT COUNT(*) as count FROM users'
    );

    // Get pending loan requests
    const [pendingLoans] = await pool.execute(
      'SELECT COUNT(*) as count FROM requested_loan WHERE status = ?',
      ['pending']
    );

    // Get pending transactions (including loan payments)
    const [pendingTransactions] = await pool.execute(
      'SELECT COUNT(*) as count FROM transaction WHERE status = ?',
      ['pending']
    );

    const [pendingLoanPayments] = await pool.execute(
      'SELECT COUNT(*) as count FROM loan WHERE status = ? AND target_loan_id IS NOT NULL',
      ['pending']
    );

    const totalPendingTransactions = pendingTransactions[0].count + pendingLoanPayments[0].count;

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers[0].count,
        pendingLoans: pendingLoans[0].count,
        pendingTransactions: totalPendingTransactions,
        pendingRegistrations: 0
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات لوحة التحكم'
    });
  }
});

// Get pending loan requests
router.get('/pending-loans', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [loans] = await pool.execute(`
      SELECT rl.*, u.Aname, u.user_type, u.balance as current_balance
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      WHERE rl.status = 'pending'
      ORDER BY rl.request_date ASC
    `);

    res.json({
      success: true,
      loans
    });

  } catch (error) {
    console.error('Get pending loans error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات القروض المعلقة'
    });
  }
});

// Get all loans (pending, approved, rejected)
router.get('/all-loans', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [loans] = await pool.execute(`
      SELECT rl.*, u.Aname, u.user_type, u.balance as current_balance, admin_u.Aname as admin_name
      FROM requested_loan rl
      JOIN users u ON rl.user_id = u.user_id
      LEFT JOIN users admin_u ON rl.admin_id = admin_u.user_id
      ORDER BY rl.request_date DESC
    `);

    res.json({
      success: true,
      loans
    });

  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب جميع طلبات القروض'
    });
  }
});

// Approve/Reject loan request
router.post('/loan-action/:loanId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { action, reason } = req.body; // action: 'accept', 'approve' or 'reject'
    const adminId = req.user.user_id;

    if (!['accept', 'approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'إجراء غير صحيح'
      });
    }

    // Get loan details - allow any status except 'approved' for re-processing
    const [loans] = await pool.execute(
      'SELECT * FROM requested_loan WHERE loan_id = ?',
      [loanId]
    );

    if (loans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'طلب القرض غير موجود'
      });
    }

    const loan = loans[0];

    // Check if loan is already approved and we're trying to approve it again
    if (loan.status === 'approved' && (action === 'accept' || action === 'approve')) {
      return res.status(400).json({
        success: false,
        message: 'طلب القرض تمت الموافقة عليه مسبقاً'
      });
    }
    
    if (action === 'accept' || action === 'approve') {
      // Update loan status to approved and set approval_date
      await pool.execute(
        'UPDATE requested_loan SET status = ?, admin_id = ?, approval_date = NOW() WHERE loan_id = ?',
        ['approved', adminId, loanId]
      );

      // Record the loan approval in the loan table (but don't add to user balance)
      await pool.execute(`
        INSERT INTO loan 
        (target_loan_id, user_id, credit, memo, status, admin_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        loanId,
        loan.user_id,
        loan.loan_amount,
        `قرض موافق عليه - رقم ${loanId}`,
        'accepted',
        adminId
      ]);

      res.json({
        success: true,
        message: 'تم قبول طلب القرض. القرض نشط الآن ومتاح للسحب'
      });

    } else {
      // Reject the loan
      await pool.execute(
        'UPDATE requested_loan SET status = ?, admin_id = ? WHERE loan_id = ?',
        ['rejected', adminId, loanId]
      );

      res.json({
        success: true,
        message: 'تم رفض طلب القرض'
      });
    }

  } catch (error) {
    console.error('Loan action error:', error);
    console.error('Error details:', error.message);
    console.error('SQL state:', error.sqlState);
    console.error('SQL message:', error.sqlMessage);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة طلب القرض',
      error: error.message // Add error details for debugging
    });
  }
});

// Get pending transactions (including loan payments)
// Get all transactions (including rejected ones)
router.get('/all-transactions', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get regular transactions
    const [transactions] = await pool.execute(`
      SELECT t.transaction_id as id, t.user_id, t.debit, t.credit, 
             t.date, t.memo, t.status, u.Aname, u.user_type, 'transaction' as type_record
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      ORDER BY t.date DESC
      LIMIT 100
    `);

    // Get loan payments
    const [loanPayments] = await pool.execute(`
      SELECT l.loan_id as id, l.user_id, l.credit, 
             l.date, l.memo, l.status, u.Aname, u.user_type, 'loan_payment' as type_record,
             rl.loan_amount, l.target_loan_id
      FROM loan l
      JOIN users u ON l.user_id = u.user_id
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      WHERE l.target_loan_id IS NOT NULL
      ORDER BY l.date DESC
      LIMIT 100
    `);

    // Combine both arrays
    const allTransactions = [...transactions, ...loanPayments];
    
    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      transactions: allTransactions.slice(0, 100)
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/pending-transactions', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get regular transactions
    const [transactions] = await pool.execute(`
      SELECT t.transaction_id as id, t.user_id, t.debit, t.credit, 
             t.date, t.memo, t.status, u.Aname, u.user_type, 'transaction' as type_record
      FROM transaction t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.status = 'pending'
    `);

    // Get loan payments
    const [loanPayments] = await pool.execute(`
      SELECT l.loan_id as id, l.user_id, l.credit, 
             l.date, l.memo, l.status, u.Aname, u.user_type, 'loan_payment' as type_record,
             rl.loan_amount, l.target_loan_id
      FROM loan l
      JOIN users u ON l.user_id = u.user_id
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      WHERE l.status = 'pending' AND l.target_loan_id IS NOT NULL
    `);

    // Combine both arrays
    const allTransactions = [...transactions, ...loanPayments];
    
    // Sort by date
    allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      transactions: allTransactions
    });

  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المعاملات المعلقة'
    });
  }
});

// Approve/Reject transaction
router.post('/transaction-action/:transactionId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { action, recordType } = req.body; // recordType: 'transaction' or 'loan_payment'
    const adminId = req.user.user_id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'إجراء غير صحيح'
      });
    }

    let transaction;
    let tableName;
    let idField;

    if (recordType === 'loan_payment') {
      // Handle loan payment
      const [loanPayments] = await pool.execute(
        'SELECT * FROM loan WHERE loan_id = ? AND status = ?',
        [transactionId, 'pending']
      );
      
      if (loanPayments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'دفعة القرض غير موجودة أو تم التعامل معها مسبقاً'
        });
      }
      
      transaction = loanPayments[0];
      tableName = 'loan';
      idField = 'loan_id';
    } else {
      // Handle regular transaction
      const [transactions] = await pool.execute(
        'SELECT * FROM transaction WHERE transaction_id = ? AND status = ?',
        [transactionId, 'pending']
      );

      if (transactions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'المعاملة غير موجودة أو تم التعامل معها مسبقاً'
        });
      }

      transaction = transactions[0];
      tableName = 'transaction';
      idField = 'transaction_id';
    }

    if (action === 'accept') {
      // Update status
      await pool.execute(
        `UPDATE ${tableName} SET status = ?, admin_id = ? WHERE ${idField} = ?`,
        ['accepted', adminId, transactionId]
      );

      // For regular transactions, update user balance
      if (recordType !== 'loan_payment') {
        const balanceChange = transaction.credit - transaction.debit;
        await pool.execute(
          'UPDATE users SET balance = balance + ? WHERE user_id = ?',
          [balanceChange, transaction.user_id]
        );
      }

      // For loan payments, check if loan is fully paid
      if (recordType === 'loan_payment' && transaction.target_loan_id) {
        // Calculate total paid amount for this loan
        const [totalPaid] = await pool.execute(`
          SELECT SUM(credit) as total_paid
          FROM loan 
          WHERE target_loan_id = ? AND status = 'accepted'
        `, [transaction.target_loan_id]);

        // Get original loan amount
        const [loanInfo] = await pool.execute(
          'SELECT loan_amount FROM requested_loan WHERE loan_id = ?',
          [transaction.target_loan_id]
        );

        if (loanInfo.length > 0) {
          const totalPaidAmount = totalPaid[0].total_paid || 0;
          const loanAmount = loanInfo[0].loan_amount;

          // If loan is fully paid, close it
          if (totalPaidAmount >= loanAmount) {
            await pool.execute(
              'UPDATE requested_loan SET status = "closed" WHERE loan_id = ?',
              [transaction.target_loan_id]
            );
          }
        }
      }

      const messageType = recordType === 'loan_payment' ? 'دفعة القرض' : 'المعاملة';
      res.json({
        success: true,
        message: `تم قبول ${messageType} بنجاح`
      });

    } else {
      await pool.execute(
        `UPDATE ${tableName} SET status = ?, admin_id = ? WHERE ${idField} = ?`,
        ['rejected', adminId, transactionId]
      );

      const messageType = recordType === 'loan_payment' ? 'دفعة القرض' : 'المعاملة';
      res.json({
        success: true,
        message: `تم رفض ${messageType}`
      });
    }

  } catch (error) {
    console.error('Transaction action error:', error);
    console.error('Error details:', error.message);
    console.error('SQL state:', error.sqlState);
    console.error('SQL message:', error.sqlMessage);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة المعاملة',
      error: error.message // Add error details for debugging
    });
  }
});

// Get all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('Getting users for admin:', req.user.user_id); // Debug log
    
    const [users] = await pool.execute(`
      SELECT user_id, Aname, user_type, email, phone, balance, registration_date,
             LEAST((balance * 3), 10000) as max_loan_amount, joining_fee_approved
      FROM users 
      WHERE user_id != ?
      ORDER BY registration_date DESC
    `, [req.user.user_id]);

    console.log('Found users:', users.length); // Debug log

    // Add computed status field based on joining fee approval
    const usersWithStatus = users.map(user => ({
      ...user,
      status: user.joining_fee_approved === 'approved' ? 'active' : 'inactive'
    }));

    res.json({
      success: true,
      users: usersWithStatus
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قائمة المستخدمين: ' + error.message
    });
  }
});


// Get user details with full history and balance tracking
router.get('/user/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user info
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];
    
    // Add computed status field based on joining fee approval
    user.status = user.joining_fee_approved === 'approved' ? 'active' : 'inactive';

    // Get balance history (deposits/withdrawals) - with proper transaction type
    const [balanceHistory] = await pool.execute(`
      SELECT t.*, u.Aname as admin_name,
             CASE 
               WHEN t.credit > 0 THEN 'إيداع'
               WHEN t.debit > 0 THEN 'سحب'
               ELSE 'تعديل'
             END as transaction_type
      FROM transaction t
      LEFT JOIN users u ON t.admin_id = u.user_id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
      LIMIT 20
    `, [userId]);

    // Get loan repayments history
    const [loanPayments] = await pool.execute(`
      SELECT l.*, rl.loan_amount, u.Aname as admin_name,
             rl.loan_id as loan_request_id, rl.status as loan_status
      FROM loan l
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      LEFT JOIN users u ON l.admin_id = u.user_id
      WHERE l.user_id = ? AND l.target_loan_id IS NOT NULL
      ORDER BY l.date DESC
      LIMIT 20
    `, [userId]);

    // Get loan history
    const [loans] = await pool.execute(`
      SELECT rl.*, u.Aname as admin_name,
             COALESCE(payments.total_paid, 0) as total_paid,
             (rl.loan_amount - COALESCE(payments.total_paid, 0)) as remaining_amount
      FROM requested_loan rl
      LEFT JOIN users u ON rl.admin_id = u.user_id
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan 
        WHERE status = 'accepted' AND target_loan_id IS NOT NULL
        GROUP BY target_loan_id
      ) payments ON rl.loan_id = payments.target_loan_id
      WHERE rl.user_id = ?
      ORDER BY rl.request_date DESC
    `, [userId]);

    // Calculate balance summary
    const totalDeposits = balanceHistory
      .filter(t => t.status === 'accepted' && parseFloat(t.credit) > 0)
      .reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
    
    const totalWithdrawals = balanceHistory
      .filter(t => t.status === 'accepted' && parseFloat(t.debit) > 0)
      .reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);

    const totalLoanPayments = loanPayments
      .filter(p => p.status === 'accepted')
      .reduce((sum, p) => sum + parseFloat(p.credit || 0), 0);

    // Ensure we have the current balance from the user record
    const currentBalance = parseFloat(user.balance || 0);

    console.log('User details calculation:', {
      userId,
      currentBalance,
      totalDeposits,
      totalWithdrawals,
      totalLoanPayments,
      balanceHistoryCount: balanceHistory.length,
      loanPaymentsCount: loanPayments.length
    });

    res.json({
      success: true,
      user: user,
      balanceHistory: balanceHistory,
      loanPayments: loanPayments,
      loans: loans,
      summary: {
        currentBalance: currentBalance,
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        totalLoanPayments: totalLoanPayments,
        maxLoanAmount: Math.min(currentBalance * 3, 10000)
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل المستخدم: ' + error.message
    });
  }
});

// Approve/Reject joining fee
router.post('/joining-fee-action/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'approved' or 'rejected'
    const adminId = req.user.user_id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'إجراء غير صحيح'
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT user_id, Aname, joining_fee_approved FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];

    // Update joining fee approval status
    await pool.execute(
      'UPDATE users SET joining_fee_approved = ? WHERE user_id = ?',
      [action, userId]
    );

    // Get admin name for logging
    const [admins] = await pool.execute(
      'SELECT Aname FROM users WHERE user_id = ?',
      [adminId]
    );
    const adminName = admins[0]?.Aname || 'الإدارة';

    const actionText = action === 'approved' ? 'تمت الموافقة على' : 'تم رفض';
    const statusText = action === 'approved' ? 'موافق عليها' : 'مرفوضة';

    res.json({
      success: true,
      message: `${actionText} رسوم الانضمام للمستخدم ${user.Aname}`,
      data: {
        userId: userId,
        userName: user.Aname,
        previousStatus: user.joining_fee_approved,
        newStatus: action,
        adminName: adminName
      }
    });

  } catch (error) {
    console.error('Joining fee action error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة رسوم الانضمام'
    });
  }
});

// Database download endpoint (JSON format)
router.get('/download-database', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('Database download request from admin:', req.user.user_id);
    
    // Get all tables data
    const tables = ['users', 'transaction', 'requested_loan', 'loan', 'feedback', 'attribute'];
    const databaseExport = {
      export_date: new Date().toISOString(),
      exported_by: req.user.user_id,
      tables: {}
    };

    for (const table of tables) {
      try {
        const [rows] = await pool.execute(`SELECT * FROM ${table}`);
        databaseExport.tables[table] = rows;
      } catch (error) {
        console.error(`Error exporting table ${table}:`, error);
        databaseExport.tables[table] = [];
      }
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=database_backup_${new Date().toISOString().split('T')[0]}.json`);
    
    res.json(databaseExport);

  } catch (error) {
    console.error('Database export error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير قاعدة البيانات'
    });
  }
});

// SQL backup endpoint
router.get('/download-sql-backup', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('SQL backup request from admin:', req.user.user_id);
    
    const tables = ['users', 'transaction', 'requested_loan', 'loan', 'feedback', 'attribute'];
    let sqlBackup = `-- درع العائلة - Database Backup\n`;
    sqlBackup += `-- Generated: ${new Date().toISOString()}\n`;
    sqlBackup += `-- Exported by: Admin ${req.user.user_id}\n\n`;
    
    sqlBackup += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    for (const table of tables) {
      try {
        // Get table structure
        const [createTable] = await pool.execute(`SHOW CREATE TABLE ${table}`);
        sqlBackup += `-- Table structure for ${table}\n`;
        sqlBackup += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sqlBackup += `${createTable[0]['Create Table']};\n\n`;

        // Get table data
        const [rows] = await pool.execute(`SELECT * FROM ${table}`);
        
        if (rows.length > 0) {
          sqlBackup += `-- Data for table ${table}\n`;
          sqlBackup += `INSERT INTO \`${table}\` VALUES\n`;
          
          const values = rows.map(row => {
            const rowValues = Object.values(row).map(value => {
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            });
            return `(${rowValues.join(', ')})`;
          });
          
          sqlBackup += values.join(',\n');
          sqlBackup += `;\n\n`;
        }
      } catch (error) {
        console.error(`Error exporting table ${table}:`, error);
        sqlBackup += `-- Error exporting table ${table}: ${error.message}\n\n`;
      }
    }

    sqlBackup += `SET FOREIGN_KEY_CHECKS=1;\n`;

    // Set headers for file download
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=database_backup_${new Date().toISOString().split('T')[0]}.sql`);
    
    res.send(sqlBackup);

  } catch (error) {
    console.error('SQL backup error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء نسخة احتياطية SQL'
    });
  }
});

// PDF transactions report endpoint
router.get('/transactions-pdf', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('PDF report request from admin:', req.user.user_id);
    
    // Get all transactions with user and admin details
    const [transactions] = await pool.execute(`
      SELECT 
        t.transaction_id as id,
        t.user_id,
        u.Aname as user_name,
        t.credit,
        t.debit,
        t.memo,
        t.status,
        t.date,
        admin_u.Aname as admin_name
      FROM transaction t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN users admin_u ON t.admin_id = admin_u.user_id
      ORDER BY t.date DESC
    `);

    // Get all loan transactions
    const [loanTransactions] = await pool.execute(`
      SELECT 
        l.loan_id as id,
        l.user_id,
        u.Aname as user_name,
        l.target_loan_id,
        l.credit,
        l.memo,
        l.status,
        l.date,
        admin_u.Aname as admin_name
      FROM loan l
      LEFT JOIN users u ON l.user_id = u.user_id
      LEFT JOIN users admin_u ON l.admin_id = admin_u.user_id
      WHERE l.target_loan_id IS NOT NULL
      ORDER BY l.date DESC
    `);

    // Create comprehensive report data
    const reportData = {
      generated_date: new Date().toISOString(),
      generated_by: req.user.user_id,
      regular_transactions: transactions,
      loan_transactions: loanTransactions,
      summary: {
        total_transactions: transactions.length,
        total_loan_payments: loanTransactions.length,
        total_credits: transactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0),
        total_debits: transactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0),
        total_loan_payments_amount: loanTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0)
      }
    };

    // Set headers for JSON download (client will handle PDF generation)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_report_${new Date().toISOString().split('T')[0]}.json`);
    
    res.json(reportData);

  } catch (error) {
    console.error('PDF report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء تقرير المعاملات'
    });
  }
});

// Update user registration date (admin only)
router.put('/user/:userId/registration-date', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { registrationDate } = req.body;
    const adminId = req.user.user_id;

    if (!registrationDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ التسجيل مطلوب'
      });
    }

    // Validate date format
    const date = new Date(registrationDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ التسجيل غير صحيح'
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT user_id, Aname, registration_date FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];
    const oldDate = user.registration_date;

    // Update registration date
    await pool.execute(
      'UPDATE users SET registration_date = ? WHERE user_id = ?',
      [date, userId]
    );

    // Get admin name for logging
    const [admins] = await pool.execute(
      'SELECT Aname FROM users WHERE user_id = ?',
      [adminId]
    );
    const adminName = admins[0]?.Aname || 'الإدارة';

    res.json({
      success: true,
      message: `تم تحديث تاريخ التسجيل للمستخدم ${user.Aname} بنجاح`,
      data: {
        userId: userId,
        userName: user.Aname,
        oldDate: oldDate,
        newDate: date,
        adminName: adminName
      }
    });

  } catch (error) {
    console.error('Update registration date error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث تاريخ التسجيل'
    });
  }
});

// Admin user registration endpoint
router.post('/register-user', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { 
      fullName, 
      phone,
      whatsapp,
      email, 
      balance = 0, 
      joiningFeeApproved = 'pending', 
      password 
    } = req.body;

    // Validate required fields
    if (!fullName || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user (without user_type since we only need admin vs non-admin)
    const [result] = await pool.execute(
      `INSERT INTO users (
        Aname, 
        phone, 
        whatsapp,
        email, 
        balance, 
        joining_fee_approved, 
        password,
        registration_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        fullName,
        phone,
        whatsapp || phone, // Use phone as default if WhatsApp not provided
        email,
        balance,
        joiningFeeApproved,
        hashedPassword
      ]
    );

    const newUserId = result.insertId;

    // Log the registration activity
    await pool.execute(
      `INSERT INTO transaction (
        user_id, 
        credit, 
        memo, 
        status, 
        admin_id,
        date
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        newUserId,
        balance,
        `تسجيل عضو جديد - الرصيد الابتدائي من المدير ${req.user.user_id}`,
        'accepted',
        req.user.user_id
      ]
    );

    // Send welcome email with terms and conditions
    try {
      await emailService.sendWelcomeEmail(email, fullName, newUserId, password);
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    res.json({
      success: true,
      message: 'تم تسجيل العضو بنجاح وإرسال بريد إلكتروني بالتفاصيل',
      userId: newUserId
    });

  } catch (error) {
    console.error('Admin user registration error:', error);
    console.error('Error details:', error.message);
    console.error('SQL state:', error.sqlState);
    console.error('SQL message:', error.sqlMessage);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل العضو',
      error: error.message // Add error details for debugging
    });
  }
});

// Block/Unblock user endpoint
router.put('/block-user/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;

    // Update user blocked status
    await pool.execute(
      'UPDATE users SET is_blocked = ? WHERE user_id = ?',
      [blocked ? 1 : 0, userId]
    );

    // Log the action
    const action = blocked ? 'حظر' : 'إلغاء حظر';
    await pool.execute(
      `INSERT INTO transaction (
        user_id, 
        memo, 
        status, 
        admin_id,
        date
      ) VALUES (?, ?, ?, ?, NOW())`,
      [
        userId,
        `${action} المستخدم من قبل المدير ${req.user.user_id}`,
        'accepted',
        req.user.user_id
      ]
    );

    res.json({
      success: true,
      message: blocked ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم بنجاح'
    });

  } catch (error) {
    console.error('Block/unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تغيير حالة المستخدم'
    });
  }
});

// Email test endpoint for admin
router.post('/test-email', verifyToken, requireAdmin, async (req, res) => {
  try {
    const testResult = await emailService.testConnection();
    
    if (testResult.success) {
      // Send a test email to admin
      const adminEmail = req.user.email || 'admin@test.com';
      const testEmailResult = await emailService.sendWelcomeEmail(
        adminEmail, 
        'مختبر النظام', 
        'TEST', 
        'test123'
      );
      
      res.json({
        success: true,
        message: 'تم اختبار البريد الإلكتروني بنجاح',
        connectionTest: testResult,
        emailTest: testEmailResult
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في الاتصال بخادم البريد الإلكتروني',
        error: testResult.message
      });
    }
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في اختبار البريد الإلكتروني',
      error: error.message
    });
  }
});

// Get all messages (admin view)
router.get('/messages', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [messages] = await pool.execute(`
      SELECT m.*, u.Aname as user_name, s.Aname as sender_name
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.user_id
      LEFT JOIN users s ON m.sender_id = s.user_id
      ORDER BY m.created_at DESC
    `);

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get all messages error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الرسائل'
    });
  }
});

// Send message to user (admin)
router.post('/messages/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subject, message, priority = 'medium' } = req.body;
    const adminId = req.user.userId;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'الموضوع والرسالة مطلوبان'
      });
    }

    await pool.execute(`
      INSERT INTO messages (user_id, sender_type, sender_id, subject, message, priority)
      VALUES (?, 'admin', ?, ?, ?, ?)
    `, [userId, adminId, subject, message, priority]);

    res.json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح'
    });

  } catch (error) {
    console.error('Send admin message error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة'
    });
  }
});

// Get unread messages count
router.get('/messages/unread-count', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [unreadMessages] = await pool.execute(`
      SELECT COUNT(*) as count FROM messages 
      WHERE status = 'unread' AND sender_type = 'user'
    `);

    res.json({
      success: true,
      count: unreadMessages[0].count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب عدد الرسائل غير المقروءة'
    });
  }
});

module.exports = router;