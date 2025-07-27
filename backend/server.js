const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler } = require('./utils/ErrorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/admin', require('./routes/admin'));

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
    
    app.listen(PORT, () => {
      console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
      console.log(`🌐 الرابط: http://localhost:${PORT}`);
      console.log(`📱 نظام إدارة القروض - ${process.env.APP_NAME}`);
    });
  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم:', error.message);
    process.exit(1);
  }
}

startServer();