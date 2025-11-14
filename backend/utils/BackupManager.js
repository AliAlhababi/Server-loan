const fs = require('fs-extra');
const path = require('path');

class BackupManager {
  /**
   * Get backup storage directory
   */
  static getBackupDir() {
    return '/root/backups';
  }

  /**
   * Ensure backup directory exists
   */
  static async ensureBackupDir() {
    const backupDir = BackupManager.getBackupDir();
    await fs.ensureDir(backupDir);
    console.log(`📁 Backup directory ensured: ${backupDir}`);
    return backupDir;
  }

  /**
   * Get all backup files sorted by date (newest first)
   */
  static async getBackupFiles() {
    const backupDir = await BackupManager.ensureBackupDir();

    try {
      const files = await fs.readdir(backupDir);

      // Filter for .tar.gz files
      const backupFiles = files.filter(file => file.endsWith('.tar.gz'));

      // Get file stats and sort by modification time
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );

      // Sort by creation date (newest first)
      filesWithStats.sort((a, b) => b.created - a.created);

      return filesWithStats;

    } catch (error) {
      console.error('Error getting backup files:', error);
      return [];
    }
  }

  /**
   * Clean up old backups (keep last N backups or delete older than X days)
   */
  static async cleanupOldBackups(options = {}) {
    const {
      keepCount = 4,        // Keep last 4 backups
      maxAgeDays = 30       // Delete backups older than 30 days
    } = options;

    console.log('🧹 Starting backup cleanup...');
    console.log(`  - Keep last ${keepCount} backups`);
    console.log(`  - Delete backups older than ${maxAgeDays} days`);

    const backupFiles = await BackupManager.getBackupFiles();

    if (backupFiles.length === 0) {
      console.log('  ℹ️  No backups found');
      return { deleted: 0, kept: 0 };
    }

    let deletedCount = 0;
    let keptCount = 0;
    const now = new Date();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (let i = 0; i < backupFiles.length; i++) {
      const file = backupFiles[i];
      const age = now - file.created;
      const isOld = age > maxAgeMs;
      const isBeyondKeepCount = i >= keepCount;

      if (isBeyondKeepCount || isOld) {
        try {
          await fs.remove(file.path);
          console.log(`  🗑️  Deleted old backup: ${file.name} (${file.sizeMB} MB)`);
          deletedCount++;
        } catch (error) {
          console.error(`  ❌ Failed to delete ${file.name}:`, error.message);
        }
      } else {
        console.log(`  ✅ Keeping backup: ${file.name} (${file.sizeMB} MB)`);
        keptCount++;
      }
    }

    console.log(`✅ Cleanup complete: ${keptCount} kept, ${deletedCount} deleted`);

    return {
      deleted: deletedCount,
      kept: keptCount,
      total: backupFiles.length
    };
  }

  /**
   * Get total size of all backups
   */
  static async getTotalBackupSize() {
    const backupFiles = await BackupManager.getBackupFiles();
    const totalBytes = backupFiles.reduce((sum, file) => sum + file.size, 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    const totalGB = (totalBytes / 1024 / 1024 / 1024).toFixed(2);

    return {
      bytes: totalBytes,
      mb: totalMB,
      gb: totalGB,
      count: backupFiles.length
    };
  }

  /**
   * Format bytes to human-readable size
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Check if file size exceeds Gmail attachment limit (25MB)
   */
  static isFileTooLargeForEmail(fileSizeBytes) {
    const maxEmailAttachmentSize = 25 * 1024 * 1024; // 25 MB in bytes
    return fileSizeBytes > maxEmailAttachmentSize;
  }

  /**
   * Get backup statistics for reporting
   */
  static async getBackupStats() {
    const backupFiles = await BackupManager.getBackupFiles();
    const totalSize = await BackupManager.getTotalBackupSize();

    return {
      totalBackups: backupFiles.length,
      totalSize: totalSize,
      latestBackup: backupFiles.length > 0 ? {
        name: backupFiles[0].name,
        size: BackupManager.formatBytes(backupFiles[0].size),
        created: backupFiles[0].created,
        age: BackupManager.getAge(backupFiles[0].created)
      } : null,
      backups: backupFiles.map(file => ({
        name: file.name,
        size: BackupManager.formatBytes(file.size),
        created: file.created,
        age: BackupManager.getAge(file.created)
      }))
    };
  }

  /**
   * Get human-readable age of a backup
   */
  static getAge(date) {
    const now = new Date();
    const ageMs = now - date;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const ageHours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (ageDays > 0) {
      return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
    } else if (ageHours > 0) {
      return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    } else {
      const ageMinutes = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));
      return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
    }
  }
}

module.exports = BackupManager;
