const whatsappBulkService = require('../services/WhatsAppBulkService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');

class WhatsAppBulkController {
    // Generate bulk WhatsApp links
    static generateBulkLinks = asyncHandler(async (req, res) => {
        console.log('📱 Admin requesting bulk WhatsApp links...');
        
        const result = await whatsappBulkService.generateBulkLinks();
        
        if (result.success) {
            ResponseHelper.success(res, result, 'تم إنشاء روابط الواتساب بنجاح');
        } else {
            ResponseHelper.error(res, result.error || 'فشل في إنشاء الروابط', 500);
        }
    });

    // Start optimized bulk sending
    static startBulkSending = asyncHandler(async (req, res) => {
        console.log('🚀 Admin starting optimized bulk sending...');
        
        const result = await whatsappBulkService.startOptimizedBulkSending();
        
        if (result.success) {
            ResponseHelper.success(res, result, 'تم بدء الإرسال المجمع بنجاح');
        } else {
            ResponseHelper.error(res, result.error || 'فشل في بدء الإرسال المجمع', 500);
        }
    });

    // Get bulk sending session status
    static getBulkStatus = asyncHandler(async (req, res) => {
        const status = whatsappBulkService.getSessionStatus();
        ResponseHelper.success(res, status, 'حالة الإرسال المجمع');
    });

    // Stop bulk sending
    static stopBulkSending = asyncHandler(async (req, res) => {
        console.log('⏹️ Admin stopping bulk sending...');
        
        const result = whatsappBulkService.stopBulkSending();
        ResponseHelper.success(res, result, 'تم إيقاف الإرسال المجمع');
    });

    // Complete bulk session
    static completeBulkSession = asyncHandler(async (req, res) => {
        console.log('🏁 Admin completing bulk sending session...');
        
        const result = whatsappBulkService.completeBulkSession();
        ResponseHelper.success(res, result, 'تم إكمال جلسة الإرسال المجمع');
    });

    // Get automation script for browser console
    static getAutomationScript = asyncHandler(async (req, res) => {
        console.log('🤖 Admin requesting automation script...');
        
        const linksResult = await whatsappBulkService.generateBulkLinks();
        if (!linksResult.success) {
            return ResponseHelper.error(res, 'فشل في إنشاء الروابط', 500);
        }

        const script = whatsappBulkService.generateAutomationScript(linksResult.links);
        
        ResponseHelper.success(res, { 
            script: script,
            messageCount: linksResult.links.length 
        }, 'تم إنشاء سكريبت الإرسال التلقائي');
    });
}

module.exports = WhatsAppBulkController;