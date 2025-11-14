const express = require('express');
const router = express.Router();
const PaymentReminderController = require('../controllers/PaymentReminderController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(verifyToken);
router.use(requireAdmin);

// Get users who need payment reminders
router.get('/users-needing-reminders', PaymentReminderController.getUsersNeedingReminders);

// Send reminder to a specific user/loan
router.post('/send/:userId/:loanId', PaymentReminderController.sendSingleReminder);

// Get WhatsApp link for a specific user/loan reminder
router.get('/whatsapp-link/:userId/:loanId', PaymentReminderController.getWhatsAppLink);

// Mark WhatsApp reminder as sent
router.post('/mark-sent/:userId/:loanId', PaymentReminderController.markReminderSent);

// Send reminders to all users who need them (manual trigger)
router.post('/send-all', PaymentReminderController.sendAllReminders);

// Get reminder statistics
router.get('/statistics', PaymentReminderController.getStatistics);

// Get reminder history
router.get('/history', PaymentReminderController.getReminderHistory);

// Pause reminders for a specific loan
router.put('/pause/:loanId', PaymentReminderController.pauseReminder);

// Resume reminders for a specific loan
router.put('/resume/:loanId', PaymentReminderController.resumeReminder);

module.exports = router;
