#!/usr/bin/env node

/**
 * Memory Analysis Tool for Loan Management System
 * Analyzes memory usage and identifies potential leaks
 */

const heapdump = require('heapdump');
const path = require('path');
const fs = require('fs');

class MemoryAnalyzer {
  constructor() {
    this.startTime = Date.now();
    this.memorySnapshots = [];
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100 // MB
    };
  }

  // Take memory snapshot
  takeSnapshot(label = '') {
    const snapshot = this.getCurrentMemoryUsage();
    snapshot.label = label;
    this.memorySnapshots.push(snapshot);
    
    console.log(`📊 Memory Snapshot${label ? ` (${label})` : ''}:`);
    console.log(`   RSS: ${snapshot.rss}MB`);
    console.log(`   Heap Total: ${snapshot.heapTotal}MB`);
    console.log(`   Heap Used: ${snapshot.heapUsed}MB`);
    console.log(`   External: ${snapshot.external}MB`);
    console.log(`   Array Buffers: ${snapshot.arrayBuffers}MB`);
    
    return snapshot;
  }

  // Simulate memory load (like the loan system would create)
  simulateLoanSystemLoad() {
    console.log('\n🔄 Simulating Loan System Memory Load...');
    
    // Simulate user data
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        user_id: i,
        Aname: `مستخدم رقم ${i}`,
        email: `user${i}@example.com`,
        balance: Math.random() * 10000,
        registration_date: new Date(),
        transactions: [],
        loans: []
      });
    }

    this.takeSnapshot('After Users Load');

    // Simulate transaction data
    users.forEach(user => {
      for (let j = 0; j < Math.random() * 50; j++) {
        user.transactions.push({
          transaction_id: Math.random() * 100000,
          amount: Math.random() * 1000,
          memo: `معاملة رقم ${j}`,
          date: new Date(),
          status: 'accepted'
        });
      }
    });

    this.takeSnapshot('After Transactions Load');

    // Simulate loan data
    users.forEach(user => {
      if (Math.random() > 0.7) { // 30% have loans
        for (let k = 0; k < Math.random() * 3; k++) {
          user.loans.push({
            loan_id: Math.random() * 100000,
            loan_amount: Math.random() * 5000,
            installment_amount: Math.random() * 200,
            payments: Array.from({ length: Math.random() * 20 }, (_, idx) => ({
              payment_id: idx,
              amount: Math.random() * 200,
              date: new Date(),
              memo: `دفعة رقم ${idx}`
            }))
          });
        }
      }
    });

    this.takeSnapshot('After Loans Load');

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.takeSnapshot('After GC');
    }

    return users; // Keep reference to prevent GC
  }

  // Create heapdump
  async createHeapdump(label = '') {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const filename = `analysis-${label}-${timestamp}.heapsnapshot`;
      const filePath = path.join(__dirname, 'heapdumps', filename);

      heapdump.writeSnapshot(filePath, (err, actualFilename) => {
        if (err) {
          reject(err);
        } else {
          const stats = fs.statSync(actualFilename);
          resolve({
            filename: path.basename(actualFilename),
            path: actualFilename,
            size: Math.round(stats.size / 1024 / 1024 * 100) / 100
          });
        }
      });
    });
  }

  // Analyze memory growth
  analyzeGrowth() {
    console.log('\n📈 Memory Growth Analysis:');
    if (this.memorySnapshots.length < 2) {
      console.log('❌ Need at least 2 snapshots for growth analysis');
      return;
    }

    for (let i = 1; i < this.memorySnapshots.length; i++) {
      const prev = this.memorySnapshots[i - 1];
      const curr = this.memorySnapshots[i];
      
      const rssGrowth = curr.rss - prev.rss;
      const heapGrowth = curr.heapUsed - prev.heapUsed;
      
      console.log(`\n🔍 ${prev.label || 'Snapshot ' + (i - 1)} → ${curr.label || 'Snapshot ' + i}:`);
      console.log(`   RSS Growth: ${rssGrowth > 0 ? '+' : ''}${rssGrowth}MB`);
      console.log(`   Heap Growth: ${heapGrowth > 0 ? '+' : ''}${heapGrowth}MB`);
      
      if (heapGrowth > 10) {
        console.log(`   ⚠️  Significant heap growth detected!`);
      }
    }
  }

  // Generate report
  generateReport() {
    const report = {
      analysis_time: new Date().toISOString(),
      total_runtime: Math.round((Date.now() - this.startTime) / 1000),
      snapshots: this.memorySnapshots,
      recommendations: []
    };

    const latestSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
    
    if (latestSnapshot.heapUsed > 100) {
      report.recommendations.push('⚠️  High heap usage detected (>100MB) - consider memory optimization');
    }
    
    if (latestSnapshot.external > 50) {
      report.recommendations.push('⚠️  High external memory usage - check file buffers and database connections');
    }

    // Look for significant growth patterns
    const growthIssues = this.memorySnapshots.some((snapshot, i) => {
      if (i === 0) return false;
      const prev = this.memorySnapshots[i - 1];
      return (snapshot.heapUsed - prev.heapUsed) > 20;
    });

    if (growthIssues) {
      report.recommendations.push('🔍 Significant memory growth detected - potential memory leak');
    }

    return report;
  }
}

// Main analysis
async function runAnalysis() {
  console.log('🔍 Starting Memory Analysis for Loan Management System\n');
  
  const analyzer = new MemoryAnalyzer();
  
  // Initial snapshot
  analyzer.takeSnapshot('Initial');
  
  // Create initial heapdump
  try {
    const initialDump = await analyzer.createHeapdump('initial');
    console.log(`\n💾 Initial heapdump created: ${initialDump.filename} (${initialDump.size}MB)`);
  } catch (error) {
    console.error('❌ Failed to create initial heapdump:', error);
  }
  
  // Simulate system load
  const simulatedData = analyzer.simulateLoanSystemLoad();
  
  // Create loaded heapdump
  try {
    const loadedDump = await analyzer.createHeapdump('loaded');
    console.log(`\n💾 Loaded heapdump created: ${loadedDump.filename} (${loadedDump.size}MB)`);
  } catch (error) {
    console.error('❌ Failed to create loaded heapdump:', error);
  }
  
  // Analyze growth
  analyzer.analyzeGrowth();
  
  // Generate final report
  const report = analyzer.generateReport();
  
  console.log('\n📋 Final Analysis Report:');
  console.log(`   Total Runtime: ${report.total_runtime}s`);
  console.log(`   Snapshots Taken: ${report.snapshots.length}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
  } else {
    console.log('\n✅ No immediate memory issues detected');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'heapdumps', `memory-report-${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved: ${path.basename(reportPath)}`);
  
  // Keep reference to prevent GC during analysis
  console.log(`\n🎯 Simulated data objects: ${simulatedData.length}`);
}

// Run with --expose-gc for better analysis
if (process.argv.includes('--expose-gc')) {
  global.gc = require('vm').runInNewContext('gc');
  console.log('✅ Garbage collection exposed for analysis');
} else {
  console.log('💡 Run with --expose-gc for better memory analysis');
}

runAnalysis().catch(console.error);