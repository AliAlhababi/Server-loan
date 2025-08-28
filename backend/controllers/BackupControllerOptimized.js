/**
 * Optimized BackupController with Memory Management
 * Fixes critical memory issues identified in the original BackupController
 */

const { exec } = require('child_process');
const PDFDocument = require('pdfkit');
const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

class BackupControllerOptimized {
  /**
   * Memory-optimized transactions report with pagination
   */
  static async downloadTransactionsReport(req, res) {
    try {
      console.log('🔍 Starting memory-optimized financial report generation...');
      
      const BATCH_SIZE = 100; // Process users in batches of 100
      let allUsersData = [];
      let offset = 0;
      let processedUsers = 0;

      // Set response headers early for streaming
      const fileName = `financial_report_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      console.log('📊 Processing users in batches to prevent memory overflow...');

      while (true) {
        // Get users in batches to prevent memory overflow
        const userBatch = await DatabaseService.executeQuery(`
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
          LIMIT ${BATCH_SIZE} OFFSET ${offset}
        `);

        if (userBatch.length === 0) {
          break; // No more users
        }

        console.log(`Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}: users ${offset + 1} to ${offset + userBatch.length}`);

        // Process financial data for this batch
        for (const user of userBatch) {
          try {
            // Use single optimized query instead of multiple queries
            const financialData = await DatabaseService.executeQuery(`
              SELECT 
                (SELECT COALESCE(SUM(credit), 0) 
                 FROM transaction 
                 WHERE user_id = ? AND status = 'accepted' AND transaction_type = 'subscription') as total_subscriptions,
                
                (SELECT COALESCE(SUM(credit), 0) 
                 FROM loan 
                 WHERE user_id = ? AND status = 'accepted') as total_loan_payments,
                
                (SELECT COUNT(*) 
                 FROM requested_loan 
                 WHERE user_id = ? AND status = 'approved' AND loan_closed_date IS NULL) as active_loans_count
            `, [user.user_id, user.user_id, user.user_id]);

            // Merge financial data
            user.total_subscriptions = financialData[0].total_subscriptions;
            user.total_loan_payments = financialData[0].total_loan_payments;
            user.has_active_loan = financialData[0].active_loans_count > 0;

            processedUsers++;
          } catch (userError) {
            console.error(`Error processing user ${user.user_id}:`, userError.message);
            // Continue with other users
            user.error = userError.message;
          }
        }

        allUsersData = allUsersData.concat(userBatch);
        offset += BATCH_SIZE;

        // Log progress
        console.log(`✅ Processed ${processedUsers} users so far...`);

        // Optional: Add small delay to prevent overwhelming the database
        if (userBatch.length === BATCH_SIZE) {
          await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
        }
      }

      console.log(`🎯 Completed processing ${processedUsers} users`);

      // Create final report
      const report = {
        generated_at: new Date().toISOString(),
        total_users: allUsersData.length,
        system_info: {
          memory_usage: process.memoryUsage(),
          uptime: process.uptime()
        },
        users: allUsersData
      };

      res.json(report);

      // Clean up memory
      allUsersData = null;
      console.log('🗑️ Memory cleaned up after report generation');

    } catch (error) {
      console.error('❌ Memory-optimized transactions report error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Report generation failed: ' + error.message,
          error: error.message,
          memory_usage: process.memoryUsage()
        });
      }
    }
  }

  /**
   * Memory-optimized database backup with streaming
   */
  static async generateDatabaseBackup(req, res) {
    try {
      console.log('🔍 Starting memory-optimized database backup generation...');
      const fileName = `backup_database_${new Date().toISOString().split('T')[0]}.sql`;
      
      // Set headers for streaming
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Get all table names
      const tables = await DatabaseService.executeQuery('SHOW TABLES');
      console.log(`📋 Found ${tables.length} tables to backup`);

      // Write SQL header
      res.write('-- Database Backup Generated on ' + new Date().toISOString() + '\n');
      res.write('-- Memory-optimized streaming backup\n\n');
      res.write('SET FOREIGN_KEY_CHECKS = 0;\n\n');

      const CHUNK_SIZE = 1000; // Process records in chunks

      for (const tableInfo of tables) {
        const tableName = Object.values(tableInfo)[0];
        console.log(`📄 Backing up table: ${tableName}`);

        try {
          // Get table structure
          const createResult = await DatabaseService.executeQuery(`SHOW CREATE TABLE ${tableName}`);
          const createStatement = createResult[0]['Create Table'];
          
          res.write(`-- Table structure for ${tableName}\n`);
          res.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
          res.write(createStatement + ';\n\n');

          // Get total row count
          const countResult = await DatabaseService.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
          const totalRows = countResult[0].count;

          if (totalRows > 0) {
            console.log(`  📊 ${tableName}: ${totalRows} rows (processing in chunks of ${CHUNK_SIZE})`);
            
            // Stream data in chunks to prevent memory overflow
            for (let offset = 0; offset < totalRows; offset += CHUNK_SIZE) {
              const data = await DatabaseService.executeQuery(`SELECT * FROM ${tableName} LIMIT ${CHUNK_SIZE} OFFSET ${offset}`);
              
              if (data.length > 0) {
                res.write(`-- Data for table ${tableName} (rows ${offset + 1}-${offset + data.length})\n`);
                res.write(`INSERT INTO \`${tableName}\` VALUES\n`);
                
                for (let i = 0; i < data.length; i++) {
                  const values = Object.values(data[i]).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    return val;
                  });
                  
                  const suffix = (i === data.length - 1) ? ';\n\n' : ',\n';
                  res.write(`(${values.join(', ')})${suffix}`);
                }
              }

              // Progress logging
              if (offset + CHUNK_SIZE < totalRows) {
                console.log(`    Progress: ${Math.round((offset + CHUNK_SIZE) / totalRows * 100)}%`);
              }
            }
          } else {
            console.log(`  📊 ${tableName}: empty table`);
          }

        } catch (tableError) {
          console.error(`❌ Error backing up table ${tableName}:`, tableError.message);
          res.write(`-- ERROR backing up ${tableName}: ${tableError.message}\n\n`);
        }
      }

      // Write SQL footer
      res.write('SET FOREIGN_KEY_CHECKS = 1;\n');
      res.write('-- Backup completed successfully\n');
      res.end();

      console.log('✅ Memory-optimized database backup completed successfully');

    } catch (error) {
      console.error('❌ Memory-optimized database backup error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Database backup failed: ' + error.message,
          error: error.message,
          memory_usage: process.memoryUsage()
        });
      }
    }
  }

  /**
   * Memory-optimized Excel backup with worksheet streaming
   */
  static async downloadExcelBackup(req, res) {
    try {
      console.log('🔍 Starting memory-optimized Excel backup generation...');

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true
      });

      const fileName = `backup_excel_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Process each table as a separate worksheet with pagination
      const tables = ['users', 'requested_loan', 'loan', 'transaction'];
      const BATCH_SIZE = 500; // Smaller batch for Excel

      for (const tableName of tables) {
        console.log(`📊 Creating worksheet: ${tableName}`);
        
        try {
          const worksheet = workbook.addWorksheet(tableName);
          
          // Get table structure for headers
          const columns = await DatabaseService.executeQuery(`SHOW COLUMNS FROM ${tableName}`);
          const headers = columns.map(col => col.Field);
          worksheet.addRow(headers);

          // Get total count
          const countResult = await DatabaseService.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
          const totalRows = countResult[0].count;

          console.log(`  Processing ${totalRows} rows in batches of ${BATCH_SIZE}`);

          // Stream data in batches
          for (let offset = 0; offset < totalRows; offset += BATCH_SIZE) {
            const data = await DatabaseService.executeQuery(`SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset}`);
            
            for (const row of data) {
              const values = headers.map(header => row[header]);
              worksheet.addRow(values);
            }

            // Commit worksheet data to free memory
            await worksheet.commit();

            console.log(`    Progress: ${Math.min(100, Math.round((offset + BATCH_SIZE) / totalRows * 100))}%`);
          }

        } catch (tableError) {
          console.error(`❌ Error creating worksheet for ${tableName}:`, tableError.message);
        }
      }

      await workbook.commit();
      console.log('✅ Memory-optimized Excel backup completed');

    } catch (error) {
      console.error('❌ Memory-optimized Excel backup error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Excel backup failed: ' + error.message,
          error: error.message,
          memory_usage: process.memoryUsage()
        });
      }
    }
  }
}

module.exports = BackupControllerOptimized;