const express = require('express');
const cors = require('cors');
const path = require('path');

// Load brand configuration first (this handles .env loading)
const brandConfig = require('../config/brandConfig');

const { testConnection } = require('./config/database');
const { errorHandler } = require('./utils/ErrorHandler');

const app = express();
const PORT = brandConfig.getSection('server').port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Brand configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      brand: brandConfig.getSection('brand'),
      features: brandConfig.getSection('features')
    }
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/family', require('./routes/family'));
app.use('/api/messages', require('./routes/user-messages'));

// Default route - serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware (use our optimized error handler)
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'الصفحة المطلوبة غير موجودة'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection first
    await testConnection();
    
    // Initialize memory monitoring
    const memoryMonitor = require('./utils/MemoryMonitor');
    memoryMonitor.startMonitoring(60); // Monitor every 60 seconds
    
    app.listen(PORT, () => {
      console.log(`🚀 ${brandConfig.getBrandDisplayName()} يعمل على المنفذ ${PORT}`);
      console.log(`🌐 الرابط: http://localhost:${PORT}`);
      console.log(`📱 نظام إدارة القروض - ${process.env.APP_NAME}`);
      console.log(`🔍 Memory monitoring started`);
    });
  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم:', error.message);
    process.exit(1);
  }
}

// Heapdump signal handler (for development debugging)
process.on('SIGUSR2', () => {
  try {
    const heapdump = require('heapdump');
    const path = require('path');
    const fs = require('fs');
    
    // Create heapdumps directory if it doesn't exist
    const heapdumpDir = path.join(__dirname, '../heapdumps');
    if (!fs.existsSync(heapdumpDir)) {
      fs.mkdirSync(heapdumpDir, { recursive: true });
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `signal-heapdump-${timestamp}.heapsnapshot`;
    const filePath = path.join(heapdumpDir, filename);
    
    console.log('🔍 Creating heapdump via SIGUSR2 signal...');
    heapdump.writeSnapshot(filePath, (err, filename) => {
      if (err) {
        console.error('❌ Failed to create heapdump:', err);
      } else {
        const stats = fs.statSync(filename);
        console.log(`✅ Heapdump created: ${path.basename(filename)} (${Math.round(stats.size / 1024 / 1024)}MB)`);
      }
    });
  } catch (error) {
    console.error('❌ Heapdump signal handler error:', error);
  }
});

startServer();