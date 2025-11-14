const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class FullBackupController {
  /**
   * Create and download full site backup (both sites)
   * Endpoint: GET /api/admin/download-full-backup
   */
  static async downloadFullBackup(req, res) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupName = `full_backup_${timestamp}`;
    const tempDir = path.join('/tmp', backupName);

    try {
      console.log('🔄 Starting full backup creation...');
      console.log(`📁 Temp directory: ${tempDir}`);

      // Create temporary backup directory
      await fs.ensureDir(tempDir);
      await fs.ensureDir(path.join(tempDir, 'databases'));
      await fs.ensureDir(path.join(tempDir, 'application'));
      await fs.ensureDir(path.join(tempDir, 'configs'));
      await fs.ensureDir(path.join(tempDir, 'scripts'));

      // 1. Backup databases
      console.log('💾 Backing up databases...');
      await FullBackupController.backupDatabases(tempDir);

      // 2. Copy application files
      console.log('📂 Copying application files...');
      await FullBackupController.copyApplicationFiles(tempDir);

      // 3. Copy configuration files
      console.log('⚙️  Copying configuration files...');
      await FullBackupController.copyConfigFiles(tempDir);

      // 4. Copy scripts
      console.log('📜 Copying startup scripts...');
      await FullBackupController.copyScripts(tempDir);

      // 5. Create manifest
      console.log('📋 Creating backup manifest...');
      await FullBackupController.createManifest(tempDir);

      // 6. Create tar.gz archive and stream to response
      console.log('🗜️  Creating compressed archive...');
      const archiveName = `${backupName}.tar.gz`;

      // Set response headers
      res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
      res.setHeader('Content-Type', 'application/gzip');

      // Create archive
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: 6 }
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        throw err;
      });

      // Track progress
      archive.on('progress', (progress) => {
        console.log(`Archiving: ${progress.entries.processed} files processed`);
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add backup directory to archive
      archive.directory(tempDir, false);

      // Finalize archive
      await archive.finalize();

      console.log('✅ Backup archive created and sent successfully');

      // Cleanup temp directory after a delay
      setTimeout(async () => {
        try {
          await fs.remove(tempDir);
          console.log('🧹 Cleaned up temporary backup directory');
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Full backup error:', error);

      // Cleanup on error
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'خطأ في إنشاء النسخة الاحتياطية: ' + error.message,
          error: error.message
        });
      }
    }
  }

  /**
   * Backup both databases using mysqldump
   */
  static async backupDatabases(tempDir) {
    const dotenv = require('dotenv');

    // Read database names from actual .env files using sync methods
    const siteAEnvContent = await fs.readFile(path.join(__dirname, '../../.env.siteA'), 'utf8');
    const siteBEnvContent = await fs.readFile(path.join(__dirname, '../../.env.siteB'), 'utf8');

    const siteAEnv = dotenv.parse(siteAEnvContent);
    const siteBEnv = dotenv.parse(siteBEnvContent);

    const databases = [
      { name: siteAEnv.DB_NAME || 'family1_loan_management', site: 'siteA' },
      { name: siteBEnv.DB_NAME || 'loan_system_almajadi', site: 'siteB' }
    ];

    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST || '127.0.0.1';

    for (const db of databases) {
      const outputFile = path.join(tempDir, 'databases', `${db.site}_${db.name}.sql`);

      try {
        console.log(`  📊 Exporting database: ${db.name}...`);

        // Use mysqldump with password in command (secure in production would use .my.cnf)
        const command = `mysqldump -h ${dbHost} -u ${dbUser} -p'${dbPassword}' ${db.name} > ${outputFile}`;

        await execPromise(command, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

        const stats = await fs.stat(outputFile);
        console.log(`  ✅ Database ${db.name} exported (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      } catch (error) {
        console.error(`  ❌ Failed to backup database ${db.name}:`, error.message);

        // Create error file instead
        await fs.writeFile(
          outputFile,
          `-- Backup failed for ${db.name}\n-- Error: ${error.message}\n-- Timestamp: ${new Date().toISOString()}`
        );
      }
    }
  }

  /**
   * Copy application files (backend, frontend, templates)
   */
  static async copyApplicationFiles(tempDir) {
    const appDir = '/root/Loan-Management-System';
    const destDir = path.join(tempDir, 'application');

    // Directories to copy
    const directories = [
      'backend',
      'frontend',
      'templates',
      'config'
    ];

    for (const dir of directories) {
      const sourcePath = path.join(appDir, dir);
      const destPath = path.join(destDir, dir);

      if (await fs.pathExists(sourcePath)) {
        console.log(`  📁 Copying ${dir}...`);
        await fs.copy(sourcePath, destPath, {
          filter: (src) => {
            // Exclude unnecessary files
            return !src.includes('node_modules') &&
                   !src.includes('.git') &&
                   !src.includes('logs');
          }
        });
        console.log(`  ✅ Copied ${dir}`);
      }
    }

    // Copy package files
    const packageFiles = ['package.json', 'package-lock.json'];
    for (const file of packageFiles) {
      const sourcePath = path.join(appDir, file);
      const destPath = path.join(destDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`  ✅ Copied ${file}`);
      }
    }
  }

  /**
   * Copy configuration files
   */
  static async copyConfigFiles(tempDir) {
    const appDir = '/root/Loan-Management-System';
    const destDir = path.join(tempDir, 'configs');

    const configFiles = [
      '.env.siteA',
      '.env.siteB',
      'ecosystem.config.js'
    ];

    for (const file of configFiles) {
      const sourcePath = path.join(appDir, file);
      const destPath = path.join(destDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`  ✅ Copied ${file}`);
      }
    }

    // Copy nginx config if exists
    const nginxConfigPath = path.join(appDir, 'nginx-config.conf');
    if (await fs.pathExists(nginxConfigPath)) {
      await fs.copy(nginxConfigPath, path.join(destDir, 'nginx-config.conf'));
      console.log(`  ✅ Copied nginx-config.conf`);
    }
  }

  /**
   * Copy startup scripts
   */
  static async copyScripts(tempDir) {
    const appDir = '/root/Loan-Management-System';
    const destDir = path.join(tempDir, 'scripts');

    const scripts = [
      'start-multi-site.sh',
      'setup-domains.sh',
      'setup-vnc.sh'
    ];

    for (const script of scripts) {
      const sourcePath = path.join(appDir, script);
      const destPath = path.join(destDir, script);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`  ✅ Copied ${script}`);
      }
    }
  }

  /**
   * Create backup manifest file
   */
  static async createManifest(tempDir) {
    const manifestPath = path.join(tempDir, 'manifest.json');

    // Get directory sizes
    const getDirSize = async (dirPath) => {
      try {
        const { stdout } = await execPromise(`du -sb ${dirPath}`);
        const size = parseInt(stdout.split('\t')[0]);
        return size;
      } catch {
        return 0;
      }
    };

    const manifest = {
      backup_date: new Date().toISOString(),
      backup_timestamp: Date.now(),
      system_info: {
        node_version: process.version,
        platform: process.platform,
        hostname: require('os').hostname()
      },
      sites: [
        {
          name: 'Site A - صندوق الكوثر',
          brand: 'siteA',
          database: 'family1_loan_management',
          port: 3002
        },
        {
          name: 'Site B - صندوق المجادي',
          brand: 'siteB',
          database: 'family2_loan_management',
          port: 3003
        }
      ],
      contents: {
        databases: await getDirSize(path.join(tempDir, 'databases')),
        application: await getDirSize(path.join(tempDir, 'application')),
        configs: await getDirSize(path.join(tempDir, 'configs')),
        scripts: await getDirSize(path.join(tempDir, 'scripts'))
      },
      instructions: {
        en: 'To restore: 1) Extract archive 2) Import SQL files to MySQL 3) Copy application files 4) Update configs 5) Restart services',
        ar: 'للاستعادة: ١) فك ضغط الملف ٢) استيراد ملفات SQL ٣) نسخ ملفات التطبيق ٤) تحديث الإعدادات ٥) إعادة تشغيل الخدمات'
      }
    };

    await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
    console.log('  ✅ Manifest created');
  }

  /**
   * Create backup for scheduled email (saves to disk instead of streaming)
   */
  static async createBackupForEmail(outputPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupName = `full_backup_${timestamp}`;
    const tempDir = path.join('/tmp', backupName);

    try {
      console.log('🔄 Creating backup for email delivery...');

      // Create temporary backup directory
      await fs.ensureDir(tempDir);
      await fs.ensureDir(path.join(tempDir, 'databases'));
      await fs.ensureDir(path.join(tempDir, 'application'));
      await fs.ensureDir(path.join(tempDir, 'configs'));
      await fs.ensureDir(path.join(tempDir, 'scripts'));

      // Backup databases
      console.log('💾 Backing up databases...');
      await FullBackupController.backupDatabases(tempDir);

      // Copy application files
      console.log('📂 Copying application files...');
      await FullBackupController.copyApplicationFiles(tempDir);

      // Copy configuration files
      console.log('⚙️  Copying configuration files...');
      await FullBackupController.copyConfigFiles(tempDir);

      // Copy scripts
      console.log('📜 Copying startup scripts...');
      await FullBackupController.copyScripts(tempDir);

      // Create manifest
      console.log('📋 Creating backup manifest...');
      await FullBackupController.createManifest(tempDir);

      // Create tar.gz archive to file
      console.log('🗜️  Creating compressed archive...');

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('tar', {
          gzip: true,
          gzipOptions: { level: 6 }
        });

        output.on('close', () => {
          console.log(`✅ Archive created: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
          resolve();
        });

        archive.on('error', (err) => {
          console.error('Archive error:', err);
          reject(err);
        });

        archive.pipe(output);
        archive.directory(tempDir, false);
        archive.finalize();
      });

      // Cleanup temp directory
      await fs.remove(tempDir);
      console.log('🧹 Cleaned up temporary directory');

      // Get file stats
      const stats = await fs.stat(outputPath);
      return {
        success: true,
        filePath: outputPath,
        size: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2)
      };

    } catch (error) {
      console.error('❌ Backup creation error:', error);

      // Cleanup on error
      try {
        await fs.remove(tempDir);
        if (await fs.pathExists(outputPath)) {
          await fs.remove(outputPath);
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }

      throw error;
    }
  }
}

module.exports = FullBackupController;
