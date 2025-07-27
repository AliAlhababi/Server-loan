const express = require('express');

// Import modular route files
const profileRoutes = require('./user-profile');
const transactionRoutes = require('./user-transactions');
const loanRoutes = require('./user-loans');
const messageRoutes = require('./user-messages');
const dashboardRoutes = require('./user-dashboard');

const router = express.Router();

// Mount sub-routes
router.use('/profile', profileRoutes);
router.use('/transactions', transactionRoutes);
router.use('/loans', loanRoutes);
router.use('/messages', messageRoutes);
router.use('/dashboard', dashboardRoutes);

// Keep some backward compatibility routes
router.get('/profile/:userId', profileRoutes);
router.get('/transactions/:userId', transactionRoutes);
router.get('/loan-payments/:userId', loanRoutes);
router.get('/subscription-status/:userId', transactionRoutes);
router.get('/dashboard/:userId', dashboardRoutes);
// Removed: use /users/loans/eligibility/:userId instead

// Legacy endpoints for compatibility
router.post('/deposit', transactionRoutes);
router.post('/request-transaction', transactionRoutes);
router.post('/request-deposit', transactionRoutes);
router.post('/feedback', messageRoutes);
router.post('/reset-password', dashboardRoutes);

module.exports = router;