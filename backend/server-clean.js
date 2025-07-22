const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const ErrorHandler = require('./utils/ErrorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes - Clean Architecture
app.use('/api/auth', require('./routes/auth-clean'));
app.use('/api/users', require('./routes/users-clean'));
app.use('/api/loans', require('./routes/loans-clean'));
app.use('/api/admin', require('./routes/admin-clean'));

// Default route - serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle 404 - must be before error handler
app.use('*', ErrorHandler.notFound);

// Centralized error handling middleware
app.use(ErrorHandler.handle);

// Start server
async function startServer() {
  try {
    // Test database connection first
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
      console.log(`🌐 الرابط: http://localhost:${PORT}`);
      console.log(`📱 نظام إدارة القروض - ${process.env.APP_NAME || 'درع العائلة'}`);
      console.log(`🏗️ نمط المعمارية النظيفة مفعل`);
    });
  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم:', error.message);
    process.exit(1);
  }
}

startServer();