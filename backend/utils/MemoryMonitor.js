/**
 * Memory Monitor Utility for Loan Management System
 * Provides real-time memory monitoring and leak detection
 */

class MemoryMonitor {
  constructor() {
    this.isMonitoring = false;
    this.snapshots = [];
    this.alerts = [];
    this.thresholds = {
      heapWarning: 50 * 1024 * 1024,    // 50MB
      heapCritical: 100 * 1024 * 1024,  // 100MB
      rssWarning: 150 * 1024 * 1024,    // 150MB
      rssCritical: 300 * 1024 * 1024    // 300MB
    };
    this.monitoringInterval = null;
  }

  // Get current memory usage
  getCurrentUsage() {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  // Check if memory usage is above thresholds
  checkThresholds(usage) {
    const alerts = [];

    if (usage.heapUsed > this.thresholds.heapCritical) {
      alerts.push({
        level: 'CRITICAL',
        type: 'heap',
        current: usage.heapUsed,
        threshold: this.thresholds.heapCritical,
        message: `Critical heap usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
      });
    } else if (usage.heapUsed > this.thresholds.heapWarning) {
      alerts.push({
        level: 'WARNING',
        type: 'heap',
        current: usage.heapUsed,
        threshold: this.thresholds.heapWarning,
        message: `High heap usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
      });
    }

    if (usage.rss > this.thresholds.rssCritical) {
      alerts.push({
        level: 'CRITICAL',
        type: 'rss',
        current: usage.rss,
        threshold: this.thresholds.rssCritical,
        message: `Critical RSS usage: ${Math.round(usage.rss / 1024 / 1024)}MB`
      });
    } else if (usage.rss > this.thresholds.rssWarning) {
      alerts.push({
        level: 'WARNING',
        type: 'rss',
        current: usage.rss,
        threshold: this.thresholds.rssWarning,
        message: `High RSS usage: ${Math.round(usage.rss / 1024 / 1024)}MB`
      });
    }

    return alerts;
  }

  // Log alert to console and store
  logAlert(alert) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] 🚨 MEMORY ${alert.level}: ${alert.message}`;
    
    if (alert.level === 'CRITICAL') {
      console.error(logMessage);
    } else {
      console.warn(logMessage);
    }

    this.alerts.push({ ...alert, timestamp });
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // Take a memory snapshot
  takeSnapshot(label = '') {
    const usage = this.getCurrentUsage();
    const snapshot = { ...usage, label };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 50 snapshots
    if (this.snapshots.length > 50) {
      this.snapshots = this.snapshots.slice(-50);
    }

    // Check for alerts
    const alerts = this.checkThresholds(usage);
    alerts.forEach(alert => this.logAlert(alert));

    return snapshot;
  }

  // Start continuous monitoring
  startMonitoring(intervalSeconds = 30) {
    if (this.isMonitoring) {
      console.log('Memory monitoring is already running');
      return;
    }

    console.log(`🔍 Starting memory monitoring (interval: ${intervalSeconds}s)`);
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot('auto');
    }, intervalSeconds * 1000);

    // Take initial snapshot
    this.takeSnapshot('initial');
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('Memory monitoring is not running');
      return;
    }

    console.log('🛑 Stopping memory monitoring');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Get monitoring status
  getStatus() {
    const current = this.getCurrentUsage();
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    
    return {
      isMonitoring: this.isMonitoring,
      current: {
        rss: Math.round(current.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(current.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(current.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(current.external / 1024 / 1024 * 100) / 100
      },
      thresholds: {
        heapWarning: Math.round(this.thresholds.heapWarning / 1024 / 1024),
        heapCritical: Math.round(this.thresholds.heapCritical / 1024 / 1024),
        rssWarning: Math.round(this.thresholds.rssWarning / 1024 / 1024),
        rssCritical: Math.round(this.thresholds.rssCritical / 1024 / 1024)
      },
      totalSnapshots: this.snapshots.length,
      totalAlerts: this.alerts.length,
      recentAlerts: this.alerts.filter(a => 
        Date.now() - new Date(a.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
      ).length
    };
  }

  // Get memory growth analysis
  getGrowthAnalysis(minutes = 10) {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    const recentSnapshots = this.snapshots.filter(s => s.timestamp > cutoffTime);
    
    if (recentSnapshots.length < 2) {
      return { error: 'Insufficient data for growth analysis' };
    }

    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000 / 60; // minutes

    const growth = {
      duration: Math.round(duration * 100) / 100,
      rss: Math.round((last.rss - first.rss) / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round((last.heapTotal - first.heapTotal) / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round((last.heapUsed - first.heapUsed) / 1024 / 1024 * 100) / 100,
      external: Math.round((last.external - first.external) / 1024 / 1024 * 100) / 100
    };

    // Calculate growth rate (MB per minute)
    const heapGrowthRate = duration > 0 ? growth.heapUsed / duration : 0;
    
    return {
      ...growth,
      heapGrowthRate: Math.round(heapGrowthRate * 100) / 100,
      isGrowing: heapGrowthRate > 0.5, // Growing more than 0.5MB per minute
      isLeaking: heapGrowthRate > 2.0   // Growing more than 2MB per minute (potential leak)
    };
  }

  // Force garbage collection if available
  triggerGC() {
    if (global.gc) {
      console.log('🗑️ Triggering garbage collection...');
      const before = this.getCurrentUsage();
      global.gc();
      const after = this.getCurrentUsage();
      
      const freed = Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024 * 100) / 100;
      console.log(`✅ GC completed. Freed ${freed}MB of heap memory`);
      
      return { freed, before, after };
    } else {
      console.log('❌ Garbage collection not available (start with --expose-gc)');
      return { error: 'GC not available' };
    }
  }
}

// Create singleton instance
const memoryMonitor = new MemoryMonitor();

module.exports = memoryMonitor;