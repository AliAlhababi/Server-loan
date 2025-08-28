#!/usr/bin/env node

/**
 * Test script to verify heapdump functionality
 * This creates a heapdump without needing the full server
 */

const heapdump = require('heapdump');
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing heapdump functionality...');

// Create heapdumps directory if it doesn't exist
const heapdumpDir = path.join(__dirname, 'heapdumps');
if (!fs.existsSync(heapdumpDir)) {
  fs.mkdirSync(heapdumpDir, { recursive: true });
  console.log('📁 Created heapdumps directory');
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
const filename = `test-heapdump-${timestamp}.heapsnapshot`;
const filePath = path.join(heapdumpDir, filename);

console.log(`📝 Creating heapdump: ${filename}`);

// Create some objects to make the heap dump more interesting
const testData = [];
for (let i = 0; i < 1000; i++) {
  testData.push({
    id: i,
    name: `Test Object ${i}`,
    data: Buffer.alloc(1024, i % 256),
    timestamp: new Date()
  });
}

// Write heapdump
heapdump.writeSnapshot(filePath, (err, actualFilename) => {
  if (err) {
    console.error('❌ Failed to create heapdump:', err);
    process.exit(1);
  }
  
  try {
    const stats = fs.statSync(actualFilename);
    console.log(`✅ Heapdump created successfully!`);
    console.log(`📊 File: ${path.basename(actualFilename)}`);
    console.log(`💾 Size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100}MB`);
    console.log(`📍 Path: ${actualFilename}`);
    console.log(`🎯 Test objects in memory: ${testData.length}`);
    
    console.log('\n✨ Heapdump functionality is working correctly!');
    console.log('📖 You can analyze this file in Chrome DevTools:');
    console.log('   1. Open Chrome DevTools');
    console.log('   2. Go to Memory tab');
    console.log('   3. Click "Load" and select the .heapsnapshot file');
    
  } catch (statErr) {
    console.error('❌ Error reading heapdump file stats:', statErr);
    process.exit(1);
  }
});