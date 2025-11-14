const express = require('express');
const cors = require('cors');
const path = require('path');

// Set timezone to Kuwait time (UTC+3)
process.env.TZ = 'Asia/Kuwait';

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

// Serve static files (frontend) - exclude index.html for custom branding
app.use(express.static(path.join(__dirname, '../frontend'), {
  index: false // Don't serve index.html automatically
}));

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
app.use('/api/payment-reminders', require('./routes/payment-reminders'));

// Default route - serve main page with brand-specific meta tags
app.get('/', (req, res) => {
  const fs = require('fs');
  const htmlPath = path.join(__dirname, '../frontend/index.html');
  
  // Read the HTML file
  fs.readFile(htmlPath, 'utf8', (err, htmlContent) => {
    if (err) {
      console.error('Error reading HTML file:', err);
      return res.status(500).send('Internal Server Error');
    }
    
    // Get brand configuration
    const brand = brandConfig.getSection('brand');
    const brandName = brand.displayName;
    const logoUrl = brand.logoUrl || '/assets/logo-default.png';
    const primaryColor = brand.colors?.primary || '#667eea';
    const description = brandName;
    const pageTitle = brandName;
    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    // Replace brand-specific content in HTML
    let brandedHtml = htmlContent
      // Update title
      .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
      // Update header brand name
      .replace(/<h1>.*?<\/h1>/, `<h1>${brandName}</h1>`)
      // Update meta tags
      .replace(/(<meta name="description" content=").*?(">)/, `$1${description}$2`)
      .replace(/(<meta name="author" content=").*?(">)/, `$1${brandName}$2`)
      .replace(/(<meta name="apple-mobile-web-app-title" content=").*?(">)/, `$1${brandName}$2`)
      // Update Open Graph tags
      .replace(/(<meta property="og:url" content=").*?(">)/, `$1${currentUrl}$2`)
      .replace(/(<meta property="og:title" content=").*?(">)/, `$1${pageTitle}$2`)
      .replace(/(<meta property="og:description" content=").*?(">)/, `$1${description}$2`)
      .replace(/(<meta property="og:site_name" content=").*?(">)/, `$1${brandName}$2`)
      .replace(/(<meta property="og:image" content=").*?(">)/, `$1${logoUrl}$2`)
      .replace(/(<meta property="og:image:alt" content=").*?(">)/, `$1شعار ${brandName}$2`)
      // Update Twitter Card tags
      .replace(/(<meta name="twitter:title" content=").*?(">)/, `$1${pageTitle}$2`)
      .replace(/(<meta name="twitter:description" content=").*?(">)/, `$1${description}$2`)
      .replace(/(<meta name="twitter:image" content=").*?(">)/, `$1${logoUrl}$2`)
      .replace(/(<meta name="twitter:image:alt" content=").*?(">)/, `$1شعار ${brandName}$2`)
      // Update theme colors
      .replace(/(<meta name="theme-color" content=").*?(">)/, `$1${primaryColor}$2`)
      .replace(/(<meta name="msapplication-TileColor" content=").*?(">)/, `$1${primaryColor}$2`);
    
    // Send the branded HTML
    res.send(brandedHtml);
    
    console.log(`📄 Served branded HTML for: ${brandName}`);
  });
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

    // Initialize weekly backup scheduler
    const backupScheduler = require('./services/BackupScheduler');
    backupScheduler.start();
    console.log('📅 Weekly backup scheduler initialized');

    app.listen(PORT, () => {
      console.log(`🚀 ${brandConfig.getBrandDisplayName()} يعمل على المنفذ ${PORT}`);
      console.log(`🌐 الرابط: http://localhost:${PORT}`);
      console.log(`📱 نظام إدارة القروض - ${process.env.APP_NAME}`);
      console.log(`🔍 Memory monitoring started`);
      console.log(`💾 Automated backups: Every Sunday at 2:00 AM Kuwait time`);
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