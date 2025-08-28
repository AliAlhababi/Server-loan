const express = require('express');
const DatabaseService = require('../services/DatabaseService');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user tickets
router.get('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  const query = `
    SELECT t.*, 
           u.Aname as resolved_by_name,
           CASE 
             WHEN t.status = 'open' THEN 'مفتوحة'
             WHEN t.status = 'closed' THEN 'مغلقة'
           END as status_arabic
    FROM tickets t
    LEFT JOIN users u ON t.resolved_by_admin_id = u.user_id
    WHERE t.user_id = ? 
    ORDER BY t.created_at DESC
  `;

  const tickets = await DatabaseService.executeQuery(query, [userId]);

  ResponseHelper.success(res, { tickets }, 'تم جلب الرسائل بنجاح');
}));

// Send ticket to admin
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  const userId = req.user.userId || req.user.user_id;

  if (!subject || !message) {
    return ResponseHelper.error(res, 'الموضوع والرسالة مطلوبان', 400);
  }

  if (subject.length > 255) {
    return ResponseHelper.error(res, 'الموضوع طويل جداً (الحد الأقصى 255 حرف)', 400);
  }

  if (message.length > 2000) {
    return ResponseHelper.error(res, 'الرسالة طويلة جداً (الحد الأقصى 2000 حرف)', 400);
  }

  const ticketData = {
    user_id: userId,
    subject: subject.trim(),
    message: message.trim(),
    status: 'open'
  };

  const result = await DatabaseService.create('tickets', ticketData);

  ResponseHelper.created(res, {
    ticket_id: result.insertId,
    subject: subject.trim(),
    status: 'open'
  }, 'تم إرسال رسالتك بنجاح. سيتم الرد عليك قريباً');
}));

// Get all tickets (for admin)
router.get('/admin/all', verifyToken, requireAdmin, asyncHandler(async (req, res) => {

  const query = `
    SELECT t.*, 
           u.Aname as user_name,
           admin.Aname as resolved_by_name,
           CASE 
             WHEN t.status = 'open' THEN 'مفتوحة'
             WHEN t.status = 'closed' THEN 'مغلقة'
           END as status_arabic
    FROM tickets t
    LEFT JOIN users u ON t.user_id = u.user_id
    LEFT JOIN users admin ON t.resolved_by_admin_id = admin.user_id
    ORDER BY t.created_at DESC
  `;

  const tickets = await DatabaseService.executeQuery(query);

  ResponseHelper.success(res, { tickets }, 'تم جلب جميع الرسائل بنجاح');
}));

// Update ticket status (admin only)
router.put('/:ticketId/status', verifyToken, requireAdmin, asyncHandler(async (req, res) => {

  const ticketId = parseInt(req.params.ticketId);
  const { status, admin_notes } = req.body;
  const adminId = req.user.userId || req.user.user_id;

  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return ResponseHelper.error(res, 'حالة غير صحيحة', 400);
  }

  // Verify ticket exists
  const ticket = await DatabaseService.findById('tickets', ticketId, 'ticket_id');
  if (!ticket) {
    return ResponseHelper.notFound(res, 'الرسالة غير موجودة');
  }

  const updateData = {
    status,
    updated_at: new Date()
  };

  // If resolved or closed, add admin info
  if (status === 'resolved' || status === 'closed') {
    updateData.resolved_at = new Date();
    updateData.resolved_by_admin_id = adminId;
  }

  if (admin_notes) {
    updateData.admin_notes = admin_notes.trim();
  }

  await DatabaseService.update('tickets', updateData, { ticket_id: ticketId });

  ResponseHelper.updated(res, null, 'تم تحديث حالة الرسالة بنجاح');
}));

// Get ticket statistics (admin only)
router.get('/admin/stats', verifyToken, requireAdmin, asyncHandler(async (req, res) => {

  const query = `
    SELECT 
      COUNT(*) as total_tickets,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets
    FROM tickets
  `;

  const [stats] = await DatabaseService.executeQuery(query);

  ResponseHelper.success(res, { stats }, 'تم جلب إحصائيات الرسائل بنجاح');
}));

module.exports = router;