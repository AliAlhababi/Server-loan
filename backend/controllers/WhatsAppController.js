const whatsappService = require('../services/whatsappService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');

class WhatsAppController {
  // Get pending WhatsApp notifications for admin dashboard
  static getPendingNotifications = asyncHandler(async (req, res) => {
    console.log('📱 Admin requesting pending WhatsApp notifications...');
    
    const result = await whatsappService.getPendingNotifications();
    
    if (result.success) {
      console.log(`📱 Found ${result.count} pending WhatsApp notifications`);
      ResponseHelper.success(res, { 
        notifications: result.notifications,
        count: result.count 
      }, 'تم جلب إشعارات الواتساب المعلقة بنجاح');
    } else {
      ResponseHelper.error(res, result.error || 'فشل في جلب إشعارات الواتساب', 500);
    }
  });

  // Mark notification as sent
  static markNotificationSent = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    console.log(`📱 Marking WhatsApp notification ${notificationId} as sent...`);
    
    const result = await whatsappService.markAsSent(notificationId);
    
    if (result.success) {
      console.log(`✅ WhatsApp notification ${notificationId} marked as sent`);
      ResponseHelper.success(res, null, 'تم تسجيل الإشعار كمرسل');
    } else {
      ResponseHelper.error(res, result.error || 'فشل في تحديث حالة الإشعار', 500);
    }
  });

  // Mark notification as failed
  static markNotificationFailed = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const { reason } = req.body;
    console.log(`📱 Marking WhatsApp notification ${notificationId} as failed...`);
    
    const result = await whatsappService.markAsFailed(notificationId, reason);
    
    if (result.success) {
      console.log(`❌ WhatsApp notification ${notificationId} marked as failed`);
      ResponseHelper.success(res, null, 'تم تسجيل فشل الإشعار');
    } else {
      ResponseHelper.error(res, result.error || 'فشل في تحديث حالة الإشعار', 500);
    }
  });

  // Get WhatsApp notification statistics
  static getNotificationStats = asyncHandler(async (req, res) => {
    console.log('📊 Admin requesting WhatsApp notification statistics...');
    
    const result = await whatsappService.getNotificationStats();
    
    if (result.success) {
      console.log('📊 WhatsApp stats:', result.stats);
      ResponseHelper.success(res, { stats: result.stats }, 'تم جلب إحصائيات الواتساب بنجاح');
    } else {
      ResponseHelper.error(res, result.error || 'فشل في جلب الإحصائيات', 500);
    }
  });

  // Clear old notifications
  static clearOldNotifications = asyncHandler(async (req, res) => {
    console.log('🧹 Admin requesting to clear old WhatsApp notifications...');
    
    const result = await whatsappService.clearOldNotifications();
    
    if (result.success) {
      console.log(`🧹 Cleared ${result.cleared} old WhatsApp notifications`);
      ResponseHelper.success(res, { cleared: result.cleared }, `تم حذف ${result.cleared} إشعار قديم`);
    } else {
      ResponseHelper.error(res, result.error || 'فشل في حذف الإشعارات القديمة', 500);
    }
  });

  // Batch mark notifications as sent (for bulk operations)
  static batchMarkSent = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    console.log(`📱 Batch marking ${notificationIds.length} WhatsApp notifications as sent...`);
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return ResponseHelper.error(res, 'يرجى تقديم قائمة بالإشعارات', 400);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const notificationId of notificationIds) {
      try {
        const result = await whatsappService.markAsSent(notificationId);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Notification ${notificationId}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Notification ${notificationId}: ${error.message}`);
      }
    }

    console.log(`📱 Batch operation completed: ${results.success} success, ${results.failed} failed`);
    
    ResponseHelper.success(res, results, 
      `تم تحديث ${results.success} إشعار بنجاح${results.failed > 0 ? `، فشل ${results.failed} إشعار` : ''}`
    );
  });

  // Get notifications by status
  static getNotificationsByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    console.log(`📱 Admin requesting ${status} WhatsApp notifications...`);
    
    try {
      const DatabaseService = require('../services/DatabaseService');
      let query;
      let queryParams = [];
      
      if (status === 'all') {
        query = `
          SELECT wq.*, u.Aname as user_name, u.email as user_email
          FROM whatsapp_queue wq
          JOIN users u ON wq.user_id = u.user_id
          WHERE wq.archived = 0
          ORDER BY wq.created_at DESC
          LIMIT 100
        `;
      } else {
        query = `
          SELECT wq.*, u.Aname as user_name, u.email as user_email
          FROM whatsapp_queue wq
          JOIN users u ON wq.user_id = u.user_id
          WHERE wq.status = ? AND wq.archived = 0
          ORDER BY wq.created_at DESC
          LIMIT 100
        `;
        queryParams = [status];
      }
      
      const notifications = await DatabaseService.executeQuery(query, queryParams);
      
      console.log(`📱 Found ${notifications.length} ${status} WhatsApp notifications`);
      ResponseHelper.success(res, { 
        notifications: notifications,
        count: notifications.length 
      }, `تم جلب إشعارات ${status} بنجاح`);
      
    } catch (error) {
      console.error(`❌ Failed to get ${status} notifications:`, error);
      ResponseHelper.error(res, 'فشل في جلب الإشعارات', 500);
    }
  });

  // Get all notifications
  static getAllNotifications = asyncHandler(async (req, res) => {
    console.log('📱 Admin requesting all WhatsApp notifications...');
    
    try {
      const DatabaseService = require('../services/DatabaseService');
      const query = `
        SELECT wq.*, u.Aname as user_name, u.email as user_email
        FROM whatsapp_queue wq
        JOIN users u ON wq.user_id = u.user_id
        WHERE wq.archived = 0
        ORDER BY wq.created_at DESC
        LIMIT 200
      `;
      
      const notifications = await DatabaseService.executeQuery(query);
      
      console.log(`📱 Found ${notifications.length} total WhatsApp notifications`);
      ResponseHelper.success(res, { 
        notifications: notifications,
        count: notifications.length 
      }, 'تم جلب جميع الإشعارات بنجاح');
      
    } catch (error) {
      console.error('❌ Failed to get all notifications:', error);
      ResponseHelper.error(res, 'فشل في جلب الإشعارات', 500);
    }
  });

  // Get notification details by ID
  static getNotificationDetails = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    console.log(`📱 Admin requesting details for WhatsApp notification ${notificationId}...`);
    
    try {
      const DatabaseService = require('../services/DatabaseService');
      const query = `
        SELECT wq.*, u.Aname as user_name, u.email as user_email, u.phone, u.whatsapp,
               admin.Aname as admin_name
        FROM whatsapp_queue wq
        JOIN users u ON wq.user_id = u.user_id
        LEFT JOIN users admin ON wq.admin_id = admin.user_id
        WHERE wq.id = ?
      `;
      
      const results = await DatabaseService.executeQuery(query, [notificationId]);
      
      if (results.length === 0) {
        return ResponseHelper.notFound(res, 'الإشعار غير موجود');
      }
      
      ResponseHelper.success(res, { notification: results[0] }, 'تم جلب تفاصيل الإشعار بنجاح');
    } catch (error) {
      console.error('❌ Failed to get notification details:', error);
      ResponseHelper.error(res, 'فشل في جلب تفاصيل الإشعار', 500);
    }
  });

  // Reset sent/failed notifications back to pending for retry
  static resetToPending = asyncHandler(async (req, res) => {
    console.log('📱 Admin requesting to reset WhatsApp notifications to pending...');
    
    try {
      const DatabaseService = require('../services/DatabaseService');
      const result = await DatabaseService.executeQuery(`
        UPDATE whatsapp_queue 
        SET status = 'pending', sent_at = NULL, failed_reason = NULL 
        WHERE status IN ('sent', 'failed')
      `);
      
      console.log(`📱 Reset ${result.affectedRows} WhatsApp notifications to pending`);
      ResponseHelper.success(res, { 
        resetCount: result.affectedRows 
      }, `تم إعادة تعيين ${result.affectedRows} إشعار إلى حالة الانتظار`);
      
    } catch (error) {
      console.error('❌ Failed to reset notifications:', error);
      ResponseHelper.error(res, 'فشل في إعادة تعيين الإشعارات', 500);
    }
  });
}

module.exports = WhatsAppController;