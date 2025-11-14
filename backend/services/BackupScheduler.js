const cron = require('node-cron');
const path = require('path');
const FullBackupController = require('../controllers/FullBackupController');
const BackupManager = require('../utils/BackupManager');
const emailService = require('./emailService');
const { pool } = require('../config/database');

class BackupScheduler {
  constructor() {
    this.isRunning = false;
    this.cronTask = null;
  }

  /**
   * Start the weekly backup scheduler
   * Runs every Sunday at 2:00 AM Kuwait time
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Backup scheduler is already running');
      return;
    }

    console.log('📅 Initializing weekly backup scheduler...');
    console.log('   Schedule: Every Sunday at 2:00 AM Kuwait time');

    // Schedule: Every Sunday at 2:00 AM (0 2 * * 0)
    this.cronTask = cron.schedule('0 2 * * 0', async () => {
      console.log('⏰ Weekly backup triggered by scheduler');
      await this.createAndEmailBackup();
    }, {
      timezone: "Asia/Kuwait"
    });

    this.isRunning = true;
    console.log('✅ Backup scheduler started successfully');
  }

  /**
   * Stop the backup scheduler
   */
  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.isRunning = false;
      console.log('🛑 Backup scheduler stopped');
    }
  }

  /**
   * Manually trigger backup and email (for testing or manual runs)
   */
  async createAndEmailBackup() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 WEEKLY AUTOMATED BACKUP STARTED');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📅 Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuwait' })}`);

    try {
      // 1. Ensure backup directory exists
      const backupDir = await BackupManager.ensureBackupDir();

      // 2. Create backup file path
      const timestamp = new Date().toISOString().split('T')[0];
      const backupFileName = `full_backup_${timestamp}.tar.gz`;
      const backupFilePath = path.join(backupDir, backupFileName);

      console.log(`📦 Creating backup: ${backupFileName}`);

      // 3. Create the backup
      const backupResult = await FullBackupController.createBackupForEmail(backupFilePath);

      if (!backupResult.success) {
        throw new Error('Backup creation failed');
      }

      console.log(`✅ Backup created successfully: ${backupResult.sizeMB} MB`);

      // 4. Get all admin users from BOTH databases
      const mysql = require('mysql2/promise');
      const fs = require('fs');
      const dotenv = require('dotenv');

      // Read database configs
      const siteAEnv = dotenv.parse(fs.readFileSync(require('path').join(__dirname, '../../.env.siteA')));
      const siteBEnv = dotenv.parse(fs.readFileSync(require('path').join(__dirname, '../../.env.siteB')));

      const allAdmins = [];

      // Get admins from Site A database
      try {
        const siteAConnection = await mysql.createConnection({
          host: siteAEnv.DB_HOST || '127.0.0.1',
          user: siteAEnv.DB_USER || 'root',
          password: siteAEnv.DB_PASSWORD,
          database: siteAEnv.DB_NAME
        });

        const [siteAAdmins] = await siteAConnection.execute(
          'SELECT user_id, Aname, email FROM users WHERE user_type = ? AND email IS NOT NULL',
          ['admin']
        );

        allAdmins.push(...siteAAdmins.map(admin => ({ ...admin, site: 'siteA' })));
        await siteAConnection.end();
        console.log(`📧 Found ${siteAAdmins.length} admin(s) from Site A`);
      } catch (err) {
        console.error('⚠️  Error getting Site A admins:', err.message);
      }

      // Get admins from Site B database
      try {
        const siteBConnection = await mysql.createConnection({
          host: siteBEnv.DB_HOST || '127.0.0.1',
          user: siteBEnv.DB_USER || 'root',
          password: siteBEnv.DB_PASSWORD,
          database: siteBEnv.DB_NAME
        });

        const [siteBAdmins] = await siteBConnection.execute(
          'SELECT user_id, Aname, email FROM users WHERE user_type = ? AND email IS NOT NULL',
          ['admin']
        );

        allAdmins.push(...siteBAdmins.map(admin => ({ ...admin, site: 'siteB' })));
        await siteBConnection.end();
        console.log(`📧 Found ${siteBAdmins.length} admin(s) from Site B`);
      } catch (err) {
        console.error('⚠️  Error getting Site B admins:', err.message);
      }

      // Remove duplicate emails (in case same admin is in both databases)
      const uniqueAdmins = allAdmins.filter((admin, index, self) =>
        index === self.findIndex((a) => a.email === admin.email)
      );

      if (uniqueAdmins.length === 0) {
        console.log('⚠️  No admin users found with email addresses');
        return;
      }

      console.log(`📧 Sending backup to ${uniqueAdmins.length} unique admin(s) from both sites...`);

      // 5. Check file size (Gmail limit is 25MB)
      const fileSizeMB = parseFloat(backupResult.sizeMB);
      const isToLarge = BackupManager.isFileTooLargeForEmail(backupResult.size);

      // 6. Send email to each admin
      for (const admin of uniqueAdmins) {
        try {
          console.log(`  📨 Sending to: ${admin.Aname} (${admin.email})`);

          const emailData = {
            backupFileName: backupFileName,
            backupSize: backupResult.sizeMB,
            backupDate: new Date().toLocaleDateString('en-US'),
            backupTime: new Date().toLocaleTimeString('en-US'),
            adminName: admin.Aname,
            filePath: backupFilePath,
            isToLarge: isToLarge
          };

          if (isToLarge) {
            // File too large for email - send download link instead
            console.log(`  ⚠️  File too large (${fileSizeMB} MB > 25 MB), sending download instructions`);
            await this.sendBackupTooLargeEmail(admin.email, emailData);
          } else {
            // Send with attachment
            await this.sendBackupEmail(admin.email, emailData);
          }

          console.log(`  ✅ Email sent to ${admin.Aname}`);

        } catch (emailError) {
          console.error(`  ❌ Failed to send email to ${admin.Aname}:`, emailError.message);
        }
      }

      // 7. Cleanup old backups
      console.log('🧹 Cleaning up old backups...');
      const cleanupResult = await BackupManager.cleanupOldBackups({
        keepCount: 4,
        maxAgeDays: 30
      });

      console.log(`   Kept: ${cleanupResult.kept}, Deleted: ${cleanupResult.deleted}`);

      // 8. Get backup statistics
      const stats = await BackupManager.getBackupStats();
      console.log('📊 Backup Statistics:');
      console.log(`   Total backups: ${stats.totalBackups}`);
      console.log(`   Total size: ${stats.totalSize.mb} MB (${stats.totalSize.gb} GB)`);

      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ WEEKLY AUTOMATED BACKUP COMPLETED SUCCESSFULLY');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

    } catch (error) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ WEEKLY AUTOMATED BACKUP FAILED');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════');
      console.log('');
    }
  }

  /**
   * Send backup email with attachment
   */
  async sendBackupEmail(toEmail, emailData) {
    const subject = `نسخة احتياطية أسبوعية - Weekly Backup (${emailData.backupDate})`;

    await emailService.sendEmail({
      to: toEmail,
      subject: subject,
      template: 'backup-notification',
      context: emailData,
      attachments: [
        {
          filename: emailData.backupFileName,
          path: emailData.filePath
        }
      ]
    });
  }

  /**
   * Send email when backup is too large for email attachment
   */
  async sendBackupTooLargeEmail(toEmail, emailData) {
    const subject = `نسخة احتياطية أسبوعية - Weekly Backup (${emailData.backupDate}) - Download Required`;

    await emailService.sendEmail({
      to: toEmail,
      subject: subject,
      template: 'backup-too-large',
      context: emailData
    });
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: 'Every Sunday at 2:00 AM Kuwait time',
      timezone: 'Asia/Kuwait',
      nextRun: this.cronTask ? 'Check cron schedule' : null
    };
  }
}

// Export singleton instance
const backupScheduler = new BackupScheduler();
module.exports = backupScheduler;
