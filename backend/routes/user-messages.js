const express = require('express');
const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user messages
router.get('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  const query = `
    SELECT m.*, u.Aname as sender_name 
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.user_id
    WHERE m.user_id = ? 
    ORDER BY m.created_at DESC
  `;

  const messages = await DatabaseService.executeQuery(query, [userId]);

  ResponseHelper.success(res, { messages }, 'تم جلب الرسائل بنجاح');
}));

// Send message to admin
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  const userId = req.user.userId;

  if (!subject || !message) {
    return ResponseHelper.error(res, 'الموضوع والرسالة مطلوبان', 400);
  }

  // Get admin user ID
  const admin = await UserService.getFirstAdmin();

  const messageData = {
    user_id: userId,
    sender_type: 'user',
    sender_id: userId,
    subject,
    message,
    priority: 'medium',
    created_at: new Date()
  };

  await DatabaseService.create('messages', messageData);

  ResponseHelper.created(res, null, 'تم إرسال الرسالة بنجاح');
}));

// Mark message as read
router.put('/:messageId/read', verifyToken, asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.messageId);
  const userId = req.user.userId;

  // Verify message belongs to user or user is admin
  const message = await DatabaseService.findById('messages', messageId, 'message_id');

  if (!message) {
    return ResponseHelper.notFound(res, 'الرسالة غير موجودة');
  }

  if (message.user_id !== userId && req.user.userType !== 'admin') {
    return ResponseHelper.forbidden(res, 'غير مصرح لك بهذا الإجراء');
  }

  await DatabaseService.update('messages',
    { status: 'read' },
    { message_id: messageId }
  );

  ResponseHelper.updated(res, null, 'تم تحديث حالة الرسالة');
}));

// Send feedback/message to admin (alternative endpoint)
router.post('/feedback', verifyToken, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const userId = req.user.user_id;

  if (!message || message.trim().length === 0) {
    return ResponseHelper.error(res, 'نص الرسالة مطلوب', 400);
  }

  if (message.length > 500) {
    return ResponseHelper.error(res, 'الرسالة طويلة جداً (الحد الأقصى 500 حرف)', 400);
  }

  const feedbackData = {
    user_id: userId,
    feedback: message.trim(),
    admin_id: process.env.DEFAULT_ADMIN_ID || 1,
    date: new Date()
  };

  const result = await DatabaseService.create('feedback', feedbackData);

  ResponseHelper.created(res, {
    id: result.insertId,
    message: message.trim(),
    status: 'pending'
  }, 'تم إرسال رسالتك بنجاح. سيتم الرد عليك قريباً');
}));

// Get user's feedback history
router.get('/feedback/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  const query = `
    SELECT f.*, u.Aname as admin_name
    FROM feedback f
    LEFT JOIN users u ON f.admin_id = u.user_id
    WHERE f.user_id = ?
    ORDER BY f.date DESC
  `;

  const feedback = await DatabaseService.executeQuery(query, [userId]);

  ResponseHelper.success(res, { feedback }, 'تم جلب الرسائل بنجاح');
}));

module.exports = router;