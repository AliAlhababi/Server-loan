const { exec } = require('child_process');
const PDFDocument = require('pdfkit');
const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

class BackupController {
  // Download SQL backup
  static async downloadSQLBackup(req, res) {
    try {
      const dbName = process.env.DB_NAME;
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const fileName = `backup_${dbName}_${new Date().toISOString().split('T')[0]}.sql`;

      console.log('Starting SQL backup for database:', dbName);
      console.log('Database connection details:', { dbHost, dbPort, dbUser, dbName });

      // Use database-based backup method directly
      console.log('Using database-based backup method...');
      await BackupController.generateDatabaseBackup(req, res);
      
    } catch (error) {
      console.error('SQL backup error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'SQL backup failed: ' + error.message,
          error: error.message
        });
      }
    }
  }

  // Alternative database backup method that doesn't require mysqldump
  static async generateDatabaseBackup(req, res) {
    try {
      console.log('Starting database backup generation...');
      const fileName = `backup_database_${new Date().toISOString().split('T')[0]}.sql`;
      
      // Get all table names
      console.log('Fetching table names...');
      const tables = await DatabaseService.executeQuery('SHOW TABLES');
      console.log('Found tables:', tables.length);
      
      if (!tables || tables.length === 0) {
        throw new Error('No tables found in database');
      }
      
      const tableName = Object.keys(tables[0])[0]; // Get the key name dynamically
      console.log('Table name key:', tableName);
      
      let sqlDump = `-- Database Backup Generated on ${new Date().toISOString()}\n`;
      sqlDump += `-- Server: ${process.env.DB_HOST || 'localhost'}\n`;
      sqlDump += `-- Database: ${process.env.DB_NAME}\n\n`;
      sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

      // For each table, get structure and data
      console.log('Processing tables...');
      for (const table of tables) {
        const tableNameValue = table[tableName];
        console.log(`Processing table: ${tableNameValue}`);
        
        try {
          // Get table structure
          console.log(`Getting structure for table: ${tableNameValue}`);
          const createTable = await DatabaseService.executeQuery(`SHOW CREATE TABLE \`${tableNameValue}\``);
          sqlDump += `-- Table structure for \`${tableNameValue}\`\n`;
          sqlDump += `DROP TABLE IF EXISTS \`${tableNameValue}\`;\n`;
          sqlDump += createTable[0]['Create Table'] + ';\n\n';
          
          // Get table data
          console.log(`Getting data for table: ${tableNameValue}`);
          const tableData = await DatabaseService.executeQuery(`SELECT * FROM \`${tableNameValue}\``);
          console.log(`Table ${tableNameValue} has ${tableData.length} rows`);
          
          if (tableData.length > 0) {
            sqlDump += `-- Dumping data for table \`${tableNameValue}\`\n`;
            
            // Get column names
            const columns = Object.keys(tableData[0]);
            const columnList = columns.map(col => `\`${col}\``).join(', ');
            
            sqlDump += `INSERT INTO \`${tableNameValue}\` (${columnList}) VALUES\n`;
            
            const valueRows = tableData.map(row => {
              const values = columns.map(col => {
                const value = row[col];
                if (value === null) return 'NULL';
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                return value;
              });
              return `(${values.join(', ')})`;
            });
            
            sqlDump += valueRows.join(',\n') + ';\n\n';
          } else {
            sqlDump += `-- No data found for table \`${tableNameValue}\`\n\n`;
          }
        } catch (tableError) {
          console.error(`Error backing up table ${tableNameValue}:`, tableError);
          sqlDump += `-- Error backing up table ${tableNameValue}: ${tableError.message}\n\n`;
        }
      }
      
      sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;
      sqlDump += `-- Backup completed on ${new Date().toISOString()}\n`;

      console.log('Backup generation completed. Size:', sqlDump.length, 'characters');

      // Send the backup
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Length', Buffer.byteLength(sqlDump, 'utf8'));
      
      console.log('Sending backup file...');
      res.send(sqlDump);
      console.log('Backup file sent successfully');
      
    } catch (error) {
      console.error('Database backup generation error:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Download comprehensive Arabic financial PDF report
  static async downloadTransactionsReport(req, res) {
    try {
      console.log('Starting financial report generation...');
      
      // Query all users with comprehensive financial data - simplified first
      console.log('Executing simplified user query...');
      const users = await DatabaseService.executeQuery(`
        SELECT 
          u.user_id, 
          u.Aname, 
          u.email,
          u.phone,
          u.balance,
          u.registration_date,
          u.joining_fee_approved,
          u.user_type
        FROM users u
        WHERE u.user_type = 'employee'
        ORDER BY u.user_id
      `);
      
      console.log('Basic user query successful, now adding financial data...');
      
      // Add financial data for each user
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        console.log(`Adding financial data for user ${user.user_id}...`);
        
        try {
          // Get subscription totals
          const subscriptionResult = await DatabaseService.executeQuery(`
            SELECT COALESCE(SUM(credit), 0) as total_subscriptions
            FROM transaction 
            WHERE user_id = ? AND status = 'accepted' AND transaction_type = 'subscription'
          `, [user.user_id]);
          user.total_subscriptions = subscriptionResult[0].total_subscriptions;
          
          // Get loan payment totals
          const loanPaymentResult = await DatabaseService.executeQuery(`
            SELECT COALESCE(SUM(credit), 0) as total_loan_payments
            FROM loan 
            WHERE user_id = ? AND status = 'accepted'
          `, [user.user_id]);
          user.total_loan_payments = loanPaymentResult[0].total_loan_payments;
          
          // Get current active loan info
          const currentLoanResult = await DatabaseService.executeQuery(`
            SELECT rl.loan_amount, rl.installment_amount, rl.loan_id
            FROM requested_loan rl 
            WHERE rl.user_id = ? AND rl.status = 'approved' AND rl.loan_closed_date IS NULL
            ORDER BY rl.approval_date DESC 
            LIMIT 1
          `, [user.user_id]);
          
          if (currentLoanResult.length > 0) {
            user.current_loan_amount = currentLoanResult[0].loan_amount;
            user.current_installment = currentLoanResult[0].installment_amount;
            
            // Calculate remaining amount
            const paidResult = await DatabaseService.executeQuery(`
              SELECT COALESCE(SUM(credit), 0) as total_paid
              FROM loan 
              WHERE target_loan_id = ? AND status = 'accepted'
            `, [currentLoanResult[0].loan_id]);
            
            user.remaining_loan_amount = user.current_loan_amount - paidResult[0].total_paid;
          } else {
            user.current_loan_amount = 0;
            user.current_installment = 0;
            user.remaining_loan_amount = 0;
          }
          
          // Get completed loans count
          const completedLoansResult = await DatabaseService.executeQuery(`
            SELECT COUNT(*) as completed_loans_count
            FROM requested_loan 
            WHERE user_id = ? AND status = 'approved' AND loan_closed_date IS NOT NULL
          `, [user.user_id]);
          user.completed_loans_count = completedLoansResult[0].completed_loans_count;
          
        } catch (userError) {
          console.error(`Error getting financial data for user ${user.user_id}:`, userError);
          // Set defaults
          user.total_subscriptions = 0;
          user.total_loan_payments = 0;
          user.current_loan_amount = 0;
          user.current_installment = 0;
          user.remaining_loan_amount = 0;
          user.completed_loans_count = 0;
        }
      }
      
      console.log(`Found ${users.length} users for report`);

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `التقرير_المالي_${currentDate}.txt`;
      console.log('Generated filename:', filename);

      // Instead of using PDFKit which has Arabic issues, let's create a simple text file
      // that looks like a report but can handle Arabic properly
      
      let reportContent = '';
      
      // Header in Arabic
      reportContent += '=====================================\n';
      const brandDisplayName = require('../config/brandConfig').getBrandDisplayName();
      reportContent += `       ${brandDisplayName} - التقرير المالي الشامل\n`;
      reportContent += '=====================================\n';
      reportContent += `تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}\n\n`;
      
      // Summary statistics in Arabic
      console.log('Calculating summary statistics...');
      const totalUsers = users.length;
      const totalBalance = users.reduce((sum, u) => sum + parseFloat(u.balance || 0), 0);
      const totalSubscriptions = users.reduce((sum, u) => sum + parseFloat(u.total_subscriptions || 0), 0);
      const activeLoans = users.filter(u => u.current_loan_amount > 0).length;
      
      console.log('Statistics calculated:', { totalUsers, totalBalance, totalSubscriptions, activeLoans });
      
      reportContent += '📊 الملخص العام:\n';
      reportContent += '================\n';
      reportContent += `• إجمالي الأعضاء: ${totalUsers}\n`;
      reportContent += `• إجمالي الأرصدة: ${totalBalance.toFixed(3)} د.ك\n`;
      reportContent += `• إجمالي الاشتراكات: ${totalSubscriptions.toFixed(3)} د.ك\n`;
      reportContent += `• القروض النشطة: ${activeLoans}\n\n`;
      
      // User details in Arabic
      console.log('Generating user details...');
      reportContent += '👥 تفاصيل الأعضاء:\n';
      reportContent += '=================\n\n';
      
      users.forEach((user, idx) => {
        console.log(`Processing user ${idx + 1}/${users.length}: ${user.user_id}`);
        const hasActiveLoan = user.current_loan_amount > 0;
        const loanStatus = hasActiveLoan ? 'نشط' : 'لا يوجد';
        
        reportContent += `[${user.user_id}] ${user.Aname || 'غير محدد'}\n`;
        reportContent += `📧 البريد الإلكتروني: ${user.email || 'غير محدد'}\n`;
        reportContent += `📞 الهاتف: ${user.phone || 'غير محدد'}\n`;
        reportContent += `💰 الرصيد الحالي: ${parseFloat(user.balance || 0).toFixed(3)} د.ك\n`;
        reportContent += `📅 تاريخ التسجيل: ${new Date(user.registration_date).toLocaleDateString('en-US')}\n`;
        reportContent += `✅ رسوم الانضمام: ${user.joining_fee_approved === 'approved' ? 'معتمدة' : 'معلقة'}\n`;
        reportContent += `💵 إجمالي الاشتراكات: ${parseFloat(user.total_subscriptions || 0).toFixed(3)} د.ك\n`;
        reportContent += `💳 مدفوعات القروض: ${parseFloat(user.total_loan_payments || 0).toFixed(3)} د.ك\n`;
        reportContent += `🏦 حالة القرض: ${loanStatus}\n`;
        
        if (hasActiveLoan) {
          reportContent += `📋 مبلغ القرض: ${parseFloat(user.current_loan_amount).toFixed(3)} د.ك\n`;
          reportContent += `📊 المتبقي: ${parseFloat(user.remaining_loan_amount || 0).toFixed(3)} د.ك\n`;
          reportContent += `💸 القسط الشهري: ${parseFloat(user.current_installment || 0).toFixed(3)} د.ك\n`;
        } else {
          reportContent += `🎉 قروض مكتملة: ${user.completed_loans_count || 0}\n`;
        }
        
        reportContent += '----------------------------------------\n\n';
      });
      
      // Footer
      reportContent += `تم إنشاء هذا التقرير تلقائياً في ${new Date().toLocaleString('ar-SA')}\n`;
      reportContent += `نظام إدارة القروض - ${brandDisplayName}\n`;

      console.log('Report content generated. Length:', reportContent.length);
      console.log('Sending response...');

      // Send as text file with Arabic support
      const safeFilename = `financial_report_${currentDate}.txt`;
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(reportContent, 'utf8'));
      
      res.send(reportContent);
      console.log('Financial report sent successfully');
      
    } catch (error) {
      console.error('Error generating financial report:', error);
      console.error('Error stack:', error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'خطأ في إنشاء التقرير المالي: ' + error.message,
          error: error.message
        });
      }
    }
  }

  // Download comprehensive database backup as PDF
  static async downloadArabicPDFReport(req, res) {
    try {
      console.log('Starting comprehensive database backup PDF generation...');
      
      // Get comprehensive database backup data
      const backupData = await BackupController.getComprehensiveBackupData();
      console.log(`Found ${backupData.users.length} users, ${backupData.transactions.length} transactions, ${backupData.requestedLoans.length} loans, ${backupData.loanPayments.length} loan payments`);

      // Generate HTML content with comprehensive backup data
      const htmlContent = BackupController.generateArabicHTML(backupData);
      
      // Try to use puppeteer for PDF generation if available, otherwise fallback to simple HTML
      try {
        const puppeteer = require('puppeteer');
        console.log('Using Puppeteer for PDF generation...');
        
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none',
            '--disable-font-subpixel-positioning'
          ]
        });
        
        const page = await browser.newPage();
        
        // Set proper encoding and font preferences for Arabic
        await page.setExtraHTTPHeaders({
          'Accept-Charset': 'utf-8'
        });
        
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');
        
        const pdfBuffer = await page.pdf({
          format: 'A3',
          landscape: true,
          printBackground: true,
          preferCSSPageSize: false,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          }
        });
        
        await browser.close();
        
        const filename = `database_backup_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
        console.log('Arabic PDF sent successfully');
        
      } catch (puppeteerError) {
        console.log('Puppeteer not available, using HTML fallback:', puppeteerError.message);
        
        // Fallback: send as HTML file that can be printed to PDF
        const filename = `database_backup_${new Date().toISOString().split('T')[0]}.html`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(htmlContent, 'utf8'));
        
        res.send(htmlContent);
        console.log('Arabic HTML report sent successfully');
      }
      
    } catch (error) {
      console.error('Error generating Arabic PDF report:', error);
      console.error('Error stack:', error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error generating database backup PDF: ' + error.message,
          error: error.message
        });
      }
    }
  }

  // Helper method to get comprehensive database backup data
  static async getComprehensiveBackupData() {
    console.log('Getting comprehensive database backup data...');
    
    // Get all users
    const users = await DatabaseService.executeQuery(`
      SELECT 
        u.user_id, 
        u.Aname, 
        u.email,
        u.phone,
        u.balance,
        u.registration_date,
        u.joining_fee_approved,
        u.user_type,
        u.whatsapp,
        u.is_blocked,
        u.created_at,
        admin.Aname as approved_by_admin_name
      FROM users u
      LEFT JOIN users admin ON u.approved_by_admin_id = admin.user_id
      ORDER BY u.user_id
    `);
    
    // Get all transactions
    const transactions = await DatabaseService.executeQuery(`
      SELECT 
        t.transaction_id,
        t.user_id,
        u.Aname as user_name,
        t.debit,
        t.credit,
        t.memo,
        t.status,
        t.transaction_type,
        t.date,
        admin.Aname as admin_name
      FROM transaction t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN users admin ON t.admin_id = admin.user_id
      ORDER BY t.date DESC
    `);
    
    // Get all requested loans
    const requestedLoans = await DatabaseService.executeQuery(`
      SELECT 
        rl.loan_id,
        rl.user_id,
        u.Aname as user_name,
        rl.loan_amount,
        rl.installment_amount,
        rl.status,
        rl.request_date,
        rl.approval_date,
        rl.loan_closed_date,
        rl.notes,
        admin.Aname as admin_name
      FROM requested_loan rl
      LEFT JOIN users u ON rl.user_id = u.user_id
      LEFT JOIN users admin ON rl.admin_id = admin.user_id
      ORDER BY rl.request_date DESC
    `);
    
    // Get all loan payments
    const loanPayments = await DatabaseService.executeQuery(`
      SELECT 
        l.loan_id as payment_id,
        l.user_id,
        u.Aname as user_name,
        l.target_loan_id,
        rl.loan_amount as original_loan_amount,
        l.credit as payment_amount,
        l.memo,
        l.status,
        l.date,
        admin.Aname as admin_name
      FROM loan l
      LEFT JOIN users u ON l.user_id = u.user_id
      LEFT JOIN users admin ON l.admin_id = admin.user_id
      LEFT JOIN requested_loan rl ON l.target_loan_id = rl.loan_id
      ORDER BY l.date DESC
    `);
    
    return {
      users,
      transactions,
      requestedLoans,
      loanPayments
    };
  }

  // Helper method to generate comprehensive database backup HTML
  static generateArabicHTML(data) {
    const { users, transactions, requestedLoans, loanPayments } = data;
    const currentDate = new Date().toLocaleDateString('en-US');
    const totalUsers = users.filter(u => u.user_type === 'employee').length;
    const totalBalance = users.filter(u => u.user_type === 'employee').reduce((sum, u) => sum + parseFloat(u.balance || 0), 0);
    const totalTransactions = transactions.length;
    const totalLoans = requestedLoans.length;

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DARAE AL-AILAH - COMPREHENSIVE DATABASE BACKUP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            color: #000;
            background: #fff;
            padding: 10px;
            font-size: 10px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            padding: 10px;
            border: 2px solid #000;
            background: #f0f0f0;
        }
        
        .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding: 8px;
            background: #d0d0d0;
            border: 1px solid #000;
            text-align: center;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 2px solid #000;
        }
        
        .data-table th {
            background-color: #d0d0d0;
            border: 1px solid #000;
            padding: 6px;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
        }
        
        .data-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
            font-size: 8px;
        }
        
        .text-left {
            text-align: left !important;
        }
        
        .currency {
            color: #006400;
            font-weight: bold;
        }
        
        .status-approved { background-color: #e6ffe6; }
        .status-pending { background-color: #fffacd; }
        .status-rejected { background-color: #ffe6e6; }
        
        .footer {
            text-align: center;
            margin-top: 20px;
            padding: 8px;
            border: 1px solid #000;
            background: #f0f0f0;
            font-size: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DARAE AL-AILAH - COMPREHENSIVE DATABASE BACKUP</h1>
        <p>Backup Date: ${currentDate}</p>
        <p>Total Members: ${totalUsers} | Total Transactions: ${totalTransactions} | Total Loans: ${totalLoans}</p>
    </div>

    <div class="section-title">USERS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Balance (KWD)</th>
                <th>Registration</th>
                <th>Joining Fee</th>
                <th>User Type</th>
                <th>Workplace</th>
                <th>WhatsApp</th>
                <th>Blocked</th>
                <th>Approved By</th>
            </tr>
        </thead>
        <tbody>`;

    users.forEach(user => {
      const statusClass = user.joining_fee_approved === 'approved' ? 'status-approved' : 
                         user.joining_fee_approved === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${user.user_id}</td>
                <td class="text-left">${user.Aname || 'N/A'}</td>
                <td class="text-left">${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td class="currency">${parseFloat(user.balance || 0).toFixed(3)}</td>
                <td>${new Date(user.registration_date).toLocaleDateString('en-US')}</td>
                <td>${user.joining_fee_approved || 'N/A'}</td>
                <td>${user.user_type || 'N/A'}</td>
                <td>${user.whatsapp || 'N/A'}</td>
                <td>${user.is_blocked ? 'Yes' : 'No'}</td>
                <td class="text-left">${user.approved_by_admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="section-title">TRANSACTIONS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Transaction ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Debit (KWD)</th>
                <th>Credit (KWD)</th>
                <th>Memo</th>
                <th>Status</th>
                <th>Type</th>
                <th>Date</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>`;

    transactions.forEach(transaction => {
      const statusClass = transaction.status === 'accepted' ? 'status-approved' : 
                         transaction.status === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${transaction.transaction_id}</td>
                <td>${transaction.user_id}</td>
                <td class="text-left">${transaction.user_name || 'N/A'}</td>
                <td class="currency">${parseFloat(transaction.debit || 0).toFixed(3)}</td>
                <td class="currency">${parseFloat(transaction.credit || 0).toFixed(3)}</td>
                <td class="text-left">${transaction.memo || 'N/A'}</td>
                <td>${transaction.status}</td>
                <td>${transaction.transaction_type}</td>
                <td>${new Date(transaction.date).toLocaleDateString('en-US')}</td>
                <td class="text-left">${transaction.admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="section-title">REQUESTED LOANS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Loan ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Loan Amount (KWD)</th>
                <th>Installment (KWD)</th>
                <th>Status</th>
                <th>Request Date</th>
                <th>Approval Date</th>
                <th>Closed Date</th>
                <th>Notes</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>`;

    requestedLoans.forEach(loan => {
      const statusClass = loan.status === 'approved' ? 'status-approved' : 
                         loan.status === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${loan.loan_id}</td>
                <td>${loan.user_id}</td>
                <td class="text-left">${loan.user_name || 'N/A'}</td>
                <td class="currency">${parseFloat(loan.loan_amount || 0).toFixed(3)}</td>
                <td class="currency">${parseFloat(loan.installment_amount || 0).toFixed(3)}</td>
                <td>${loan.status}</td>
                <td>${new Date(loan.request_date).toLocaleDateString('en-US')}</td>
                <td>${loan.approval_date ? new Date(loan.approval_date).toLocaleDateString('en-US') : 'N/A'}</td>
                <td>${loan.loan_closed_date ? new Date(loan.loan_closed_date).toLocaleDateString('en-US') : 'N/A'}</td>
                <td class="text-left">${loan.notes || 'N/A'}</td>
                <td class="text-left">${loan.admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="section-title">LOAN PAYMENTS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Payment ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Target Loan ID</th>
                <th>Original Loan (KWD)</th>
                <th>Payment Amount (KWD)</th>
                <th>Memo</th>
                <th>Status</th>
                <th>Date</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>`;

    loanPayments.forEach(payment => {
      const statusClass = payment.status === 'accepted' ? 'status-approved' : 
                         payment.status === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${payment.payment_id}</td>
                <td>${payment.user_id}</td>
                <td class="text-left">${payment.user_name || 'N/A'}</td>
                <td>${payment.target_loan_id || 'N/A'}</td>
                <td class="currency">${parseFloat(payment.original_loan_amount || 0).toFixed(3)}</td>
                <td class="currency">${parseFloat(payment.payment_amount || 0).toFixed(3)}</td>
                <td class="text-left">${payment.memo || 'N/A'}</td>
                <td>${payment.status}</td>
                <td>${new Date(payment.date).toLocaleDateString('en-US')}</td>
                <td class="text-left">${payment.admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="footer">
        <p>This backup was generated automatically by DARAE AL-AILAH Loan Management System</p>
        <p>Generated on: ${new Date().toLocaleString('en-US')}</p>
        <p>This document contains complete database backup for disaster recovery purposes</p>
    </div>
</body>
</html>`;

    return html;
  }

  // Download comprehensive Excel backup with Arabic support
  static async downloadExcelBackup(req, res) {
    try {
      console.log('Starting Excel backup generation...');
      
      // Get comprehensive database backup data
      const backupData = await BackupController.getComprehensiveBackupData();
      console.log(`Found ${backupData.users.length} users, ${backupData.transactions.length} transactions, ${backupData.requestedLoans.length} loans, ${backupData.loanPayments.length} loan payments`);

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Darae Al-Ailah System';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.properties.date1904 = false;

      // Add Users worksheet
      const usersSheet = workbook.addWorksheet('الأعضاء - Users', {
        properties: { rightToLeft: true },
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
      });

      // Define columns for Users sheet
      usersSheet.columns = [
        { header: 'رقم العضو\nUser ID', key: 'user_id', width: 12 },
        { header: 'الاسم\nName', key: 'name', width: 25 },
        { header: 'البريد الإلكتروني\nEmail', key: 'email', width: 30 },
        { header: 'الهاتف\nPhone', key: 'phone', width: 15 },
        { header: 'الرصيد (د.ك)\nBalance (KWD)', key: 'balance', width: 18 },
        { header: 'تاريخ التسجيل\nRegistration', key: 'registration_date', width: 18 },
        { header: 'رسوم الانضمام\nJoining Fee', key: 'joining_fee', width: 18 },
        { header: 'نوع المستخدم\nUser Type', key: 'user_type', width: 18 },
        { header: 'واتساب\nWhatsApp', key: 'whatsapp', width: 15 },
        { header: 'محظور\nBlocked', key: 'blocked', width: 12 },
        { header: 'اعتمد بواسطة\nApproved By', key: 'approved_by', width: 25 }
      ];

      // Style header row
      const usersHeaderRow = usersSheet.getRow(1);
      usersHeaderRow.height = 40;
      usersHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add user data
      backupData.users.forEach((user, index) => {
        const row = usersSheet.addRow({
          user_id: user.user_id,
          name: user.Aname || 'N/A',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          balance: parseFloat(user.balance || 0),
          registration_date: new Date(user.registration_date),
          joining_fee: user.joining_fee_approved === 'approved' ? 'معتمدة - Approved' : 
                      user.joining_fee_approved === 'pending' ? 'معلقة - Pending' : 'مرفوضة - Rejected',
          user_type: user.user_type || 'N/A',
          whatsapp: user.whatsapp || 'N/A',
          blocked: user.is_blocked ? 'نعم - Yes' : 'لا - No',
          approved_by: user.approved_by_admin_name || 'N/A'
        });

        // Color code rows based on joining fee status
        const fillColor = user.joining_fee_approved === 'approved' ? 'FFE6FFE6' :
                         user.joining_fee_approved === 'pending' ? 'FFFFFACD' : 'FFFFE6E6';
        
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          
          // Format currency
          if (cell.col === 5) { // Balance column
            cell.numFmt = '#,##0.000';
          }
          // Format date
          if (cell.col === 6) { // Registration date column
            cell.numFmt = 'mm/dd/yyyy';
          }
        });
      });

      // Add Transactions worksheet
      const transactionsSheet = workbook.addWorksheet('المعاملات - Transactions', {
        properties: { rightToLeft: true },
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
      });

      transactionsSheet.columns = [
        { header: 'رقم المعاملة\nTransaction ID', key: 'transaction_id', width: 15 },
        { header: 'رقم العضو\nUser ID', key: 'user_id', width: 12 },
        { header: 'اسم العضو\nUser Name', key: 'user_name', width: 25 },
        { header: 'خصم (د.ك)\nDebit (KWD)', key: 'debit', width: 15 },
        { header: 'رصيد (د.ك)\nCredit (KWD)', key: 'credit', width: 15 },
        { header: 'المذكرة\nMemo', key: 'memo', width: 30 },
        { header: 'الحالة\nStatus', key: 'status', width: 15 },
        { header: 'النوع\nType', key: 'type', width: 20 },
        { header: 'التاريخ\nDate', key: 'date', width: 18 },
        { header: 'المدير\nAdmin', key: 'admin', width: 25 }
      ];

      // Style transactions header
      const transHeaderRow = transactionsSheet.getRow(1);
      transHeaderRow.height = 40;
      transHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add transaction data
      backupData.transactions.forEach((transaction) => {
        const row = transactionsSheet.addRow({
          transaction_id: transaction.transaction_id,
          user_id: transaction.user_id,
          user_name: transaction.user_name || 'N/A',
          debit: parseFloat(transaction.debit || 0),
          credit: parseFloat(transaction.credit || 0),
          memo: transaction.memo || 'N/A',
          status: transaction.status === 'accepted' ? 'مقبول - Accepted' :
                 transaction.status === 'pending' ? 'معلق - Pending' : 'مرفوض - Rejected',
          type: transaction.transaction_type || 'N/A',
          date: new Date(transaction.date),
          admin: transaction.admin_name || 'N/A'
        });

        // Color code rows based on status
        const fillColor = transaction.status === 'accepted' ? 'FFE6FFE6' :
                         transaction.status === 'pending' ? 'FFFFFACD' : 'FFFFE6E6';
        
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          
          // Format currency
          if (cell.col === 4 || cell.col === 5) { // Debit/Credit columns
            cell.numFmt = '#,##0.000';
          }
          // Format date
          if (cell.col === 9) { // Date column
            cell.numFmt = 'mm/dd/yyyy hh:mm';
          }
        });
      });

      // Add Requested Loans worksheet
      const loansSheet = workbook.addWorksheet('طلبات القروض - Requested Loans', {
        properties: { rightToLeft: true },
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
      });

      loansSheet.columns = [
        { header: 'رقم القرض\nLoan ID', key: 'loan_id', width: 12 },
        { header: 'رقم العضو\nUser ID', key: 'user_id', width: 12 },
        { header: 'اسم العضو\nUser Name', key: 'user_name', width: 25 },
        { header: 'مبلغ القرض (د.ك)\nLoan Amount (KWD)', key: 'loan_amount', width: 20 },
        { header: 'القسط (د.ك)\nInstallment (KWD)', key: 'installment', width: 18 },
        { header: 'الحالة\nStatus', key: 'status', width: 15 },
        { header: 'تاريخ الطلب\nRequest Date', key: 'request_date', width: 18 },
        { header: 'تاريخ الموافقة\nApproval Date', key: 'approval_date', width: 18 },
        { header: 'تاريخ الإغلاق\nClosed Date', key: 'closed_date', width: 18 },
        { header: 'ملاحظات\nNotes', key: 'notes', width: 30 },
        { header: 'المدير\nAdmin', key: 'admin', width: 25 }
      ];

      // Style loans header
      const loansHeaderRow = loansSheet.getRow(1);
      loansHeaderRow.height = 40;
      loansHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add loan data
      backupData.requestedLoans.forEach((loan) => {
        const row = loansSheet.addRow({
          loan_id: loan.loan_id,
          user_id: loan.user_id,
          user_name: loan.user_name || 'N/A',
          loan_amount: parseFloat(loan.loan_amount || 0),
          installment: parseFloat(loan.installment_amount || 0),
          status: loan.status === 'approved' ? 'مقبول - Approved' :
                 loan.status === 'pending' ? 'معلق - Pending' : 'مرفوض - Rejected',
          request_date: new Date(loan.request_date),
          approval_date: loan.approval_date ? new Date(loan.approval_date) : 'N/A',
          closed_date: loan.loan_closed_date ? new Date(loan.loan_closed_date) : 'N/A',
          notes: loan.notes || 'N/A',
          admin: loan.admin_name || 'N/A'
        });

        // Color code rows based on status
        const fillColor = loan.status === 'approved' ? 'FFE6FFE6' :
                         loan.status === 'pending' ? 'FFFFFACD' : 'FFFFE6E6';
        
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          
          // Format currency
          if (cell.col === 4 || cell.col === 5) { // Amount/Installment columns
            cell.numFmt = '#,##0.000';
          }
          // Format dates
          if (cell.col === 7 || cell.col === 8 || cell.col === 9) { // Date columns
            if (cell.value !== 'N/A') {
              cell.numFmt = 'mm/dd/yyyy';
            }
          }
        });
      });

      // Add Loan Payments worksheet
      const paymentsSheet = workbook.addWorksheet('أقساط القروض - Loan Payments', {
        properties: { rightToLeft: true },
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
      });

      paymentsSheet.columns = [
        { header: 'رقم الدفعة\nPayment ID', key: 'payment_id', width: 15 },
        { header: 'رقم العضو\nUser ID', key: 'user_id', width: 12 },
        { header: 'اسم العضو\nUser Name', key: 'user_name', width: 25 },
        { header: 'رقم القرض\nTarget Loan ID', key: 'target_loan_id', width: 15 },
        { header: 'القرض الأصلي (د.ك)\nOriginal Loan (KWD)', key: 'original_loan', width: 20 },
        { header: 'مبلغ الدفعة (د.ك)\nPayment Amount (KWD)', key: 'payment_amount', width: 20 },
        { header: 'المذكرة\nMemo', key: 'memo', width: 30 },
        { header: 'الحالة\nStatus', key: 'status', width: 15 },
        { header: 'التاريخ\nDate', key: 'date', width: 18 },
        { header: 'المدير\nAdmin', key: 'admin', width: 25 }
      ];

      // Style payments header
      const paymentsHeaderRow = paymentsSheet.getRow(1);
      paymentsHeaderRow.height = 40;
      paymentsHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add payment data
      backupData.loanPayments.forEach((payment) => {
        const row = paymentsSheet.addRow({
          payment_id: payment.payment_id,
          user_id: payment.user_id,
          user_name: payment.user_name || 'N/A',
          target_loan_id: payment.target_loan_id || 'N/A',
          original_loan: parseFloat(payment.original_loan_amount || 0),
          payment_amount: parseFloat(payment.payment_amount || 0),
          memo: payment.memo || 'N/A',
          status: payment.status === 'accepted' ? 'مقبول - Accepted' :
                 payment.status === 'pending' ? 'معلق - Pending' : 'مرفوض - Rejected',
          date: new Date(payment.date),
          admin: payment.admin_name || 'N/A'
        });

        // Color code rows based on status
        const fillColor = payment.status === 'accepted' ? 'FFE6FFE6' :
                         payment.status === 'pending' ? 'FFFFFACD' : 'FFFFE6E6';
        
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          
          // Format currency
          if (cell.col === 5 || cell.col === 6) { // Amount columns
            cell.numFmt = '#,##0.000';
          }
          // Format date
          if (cell.col === 9) { // Date column
            cell.numFmt = 'mm/dd/yyyy hh:mm';
          }
        });
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `database_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
      console.log('Excel backup sent successfully');
      
    } catch (error) {
      console.error('Error generating Excel backup:', error);
      console.error('Error stack:', error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error generating Excel backup: ' + error.message,
          error: error.message
        });
      }
    }
  }

  // Download database backup as PDF using HTML tables
  static async downloadExcelAsPDF(req, res) {
    try {
      console.log('Starting HTML to PDF conversion...');
      
      // Get comprehensive database backup data
      const backupData = await BackupController.getComprehensiveBackupData();
      console.log(`Found data for PDF conversion: ${backupData.users.length} users, ${backupData.transactions.length} transactions`);

      // Generate Excel-like HTML content with proper Arabic support
      const htmlContent = BackupController.generateExcelLikeHTML(backupData);
      
      // Use Puppeteer to convert HTML to PDF
      try {
        const puppeteer = require('puppeteer');
        console.log('Using Puppeteer for PDF generation...');
        
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
        
        const page = await browser.newPage();
        
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          preferCSSPageSize: false,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          }
        });
        
        await browser.close();
        
        const filename = `database_backup_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
        console.log('PDF backup sent successfully');
        
      } catch (puppeteerError) {
        console.error('Puppeteer error:', puppeteerError);
        throw new Error('PDF generation failed: ' + puppeteerError.message);
      }
      
    } catch (error) {
      console.error('Error generating HTML to PDF backup:', error);
      console.error('Error stack:', error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error generating PDF backup: ' + error.message,
          error: error.message
        });
      }
    }
  }

  // Helper method to generate Excel-like HTML content
  static generateExcelLikeHTML(backupData) {
    const { users, transactions, requestedLoans, loanPayments } = backupData;
    const currentDate = new Date().toLocaleDateString('en-US');

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DARAE AL-AILAH - DATABASE BACKUP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Tahoma', sans-serif;
            color: #000;
            background: #fff;
            padding: 10px;
            font-size: 8px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            padding: 10px;
            border: 2px solid #000;
            background: #f0f0f0;
        }
        
        .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .section-title {
            font-size: 10px;
            font-weight: bold;
            margin: 15px 0 8px 0;
            padding: 5px;
            background: #d0d0d0;
            border: 1px solid #000;
            text-align: center;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border: 1px solid #000;
            page-break-inside: avoid;
        }
        
        .data-table th {
            background-color: #d0d0d0;
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
            font-weight: bold;
            font-size: 7px;
            white-space: nowrap;
        }
        
        .data-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: center;
            font-size: 6px;
            white-space: nowrap;
        }
        
        .text-left {
            text-align: left !important;
        }
        
        .currency {
            color: #006400;
            font-weight: bold;
        }
        
        .status-approved { background-color: #e6ffe6; }
        .status-pending { background-color: #fffacd; }
        .status-rejected { background-color: #ffe6e6; }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            padding: 5px;
            border: 1px solid #000;
            background: #f0f0f0;
            font-size: 6px;
        }
        
        @media print {
            body { 
                padding: 5px; 
                font-size: 6px;
            }
            .data-table th,
            .data-table td {
                padding: 2px;
                font-size: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DARAE AL-AILAH - COMPLETE DATABASE BACKUP</h1>
        <p>Backup Date: ${currentDate}</p>
        <p>Total Users: ${users.length} | Total Transactions: ${transactions.length} | Total Loans: ${requestedLoans.length}</p>
    </div>

    <div class="section-title">USERS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Balance (KWD)</th>
                <th>Registration</th>
                <th>Joining Fee</th>
                <th>User Type</th>
                <th>Blocked</th>
            </tr>
        </thead>
        <tbody>`;

    users.forEach(user => {
      const statusClass = user.joining_fee_approved === 'approved' ? 'status-approved' : 
                         user.joining_fee_approved === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${user.user_id}</td>
                <td class="text-left">${user.Aname || 'N/A'}</td>
                <td class="text-left">${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td class="currency">${parseFloat(user.balance || 0).toFixed(3)}</td>
                <td>${new Date(user.registration_date).toLocaleDateString('en-US')}</td>
                <td>${user.joining_fee_approved || 'N/A'}</td>
                <td>${user.user_type || 'N/A'}</td>
                <td>${user.is_blocked ? 'Yes' : 'No'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="section-title">TRANSACTIONS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Credit (KWD)</th>
                <th>Status</th>
                <th>Type</th>
                <th>Date</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>`;

    transactions.slice(0, 100).forEach(transaction => { // Limit for PDF size
      const statusClass = transaction.status === 'accepted' ? 'status-approved' : 
                         transaction.status === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${transaction.transaction_id}</td>
                <td>${transaction.user_id}</td>
                <td class="text-left">${transaction.user_name || 'N/A'}</td>
                <td class="currency">${parseFloat(transaction.credit || 0).toFixed(3)}</td>
                <td>${transaction.status}</td>
                <td>${transaction.transaction_type}</td>
                <td>${new Date(transaction.date).toLocaleDateString('en-US')}</td>
                <td class="text-left">${transaction.admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="section-title">REQUESTED LOANS TABLE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Loan ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Amount (KWD)</th>
                <th>Status</th>
                <th>Request Date</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>`;

    requestedLoans.forEach(loan => {
      const statusClass = loan.status === 'approved' ? 'status-approved' : 
                         loan.status === 'pending' ? 'status-pending' : 'status-rejected';
      
      html += `
            <tr class="${statusClass}">
                <td>${loan.loan_id}</td>
                <td>${loan.user_id}</td>
                <td class="text-left">${loan.user_name || 'N/A'}</td>
                <td class="currency">${parseFloat(loan.loan_amount || 0).toFixed(3)}</td>
                <td>${loan.status}</td>
                <td>${new Date(loan.request_date).toLocaleDateString('en-US')}</td>
                <td class="text-left">${loan.admin_name || 'N/A'}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>

    <div class="footer">
        <p>This backup was generated automatically by DARAE AL-AILAH Loan Management System</p>
        <p>Generated on: ${new Date().toLocaleString('en-US')}</p>
        <p>Complete database backup for disaster recovery purposes</p>
    </div>
</body>
</html>`;

    return html;
  }
}

module.exports = BackupController;