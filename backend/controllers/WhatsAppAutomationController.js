const WhatsAppAutomationService = require('../services/WhatsAppAutomationService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');

// Brand-specific instances cache
const automationInstances = new Map();

// Get or create brand-specific automation instance
function getAutomationInstance() {
    const brandConfig = require('../config/brandConfig');
    const brandName = brandConfig.getBrandName();
    
    if (!automationInstances.has(brandName)) {
        console.log(`🏗️  Creating new WhatsApp automation instance for brand: ${brandName}`);
        automationInstances.set(brandName, new WhatsAppAutomationService());
    }
    
    return automationInstances.get(brandName);
}

class WhatsAppAutomationController {
    // Initialize browser for WhatsApp automation
    static initializeBrowser = asyncHandler(async (req, res) => {
        console.log('🤖 Admin requesting browser initialization...');
        
        const whatsappAutomation = getAutomationInstance();
        const result = await whatsappAutomation.initializeBrowser();
        
        if (result.success) {
            const message = result.loggedIn 
                ? 'تم تشغيل المتصفح بنجاح - جلسة WhatsApp نشطة وجاهزة للإرسال!'
                : 'تم تشغيل المتصفح بنجاح - يرجى مسح رمز QR في WhatsApp Web';
            
            ResponseHelper.success(res, { loggedIn: result.loggedIn }, message);
        } else {
            ResponseHelper.error(res, result.error || 'فشل في تشغيل المتصفح', 500);
        }
    });

    // Check WhatsApp Web authentication status
    static checkAuth = asyncHandler(async (req, res) => {
        const whatsappAutomation = getAutomationInstance();
        const authStatus = await whatsappAutomation.checkAuthentication();
        
        ResponseHelper.success(res, authStatus, 'تم فحص حالة المصادقة');
    });

    // Start automated queue processing
    static startAutomation = asyncHandler(async (req, res) => {
        console.log('🚀 Admin starting WhatsApp automation...');
        
        const whatsappAutomation = getAutomationInstance();
        // First check if authenticated
        const authStatus = await whatsappAutomation.checkAuthentication();
        if (!authStatus.authenticated) {
            return ResponseHelper.error(res, 'يرجى تسجيل الدخول في WhatsApp Web أولاً', 400);
        }

        const result = await whatsappAutomation.processQueue();
        
        if (result.success) {
            ResponseHelper.success(res, result.results, 'تم بدء الإرسال التلقائي بنجاح');
        } else {
            ResponseHelper.error(res, result.error || 'فشل في بدء الإرسال التلقائي', 500);
        }
    });

    // Get automation status
    static getStatus = asyncHandler(async (req, res) => {
        const whatsappAutomation = getAutomationInstance();
        const status = whatsappAutomation.getStatus();
        ResponseHelper.success(res, status, 'حالة الإرسال التلقائي');
    });

    // Stop automation
    static stopAutomation = asyncHandler(async (req, res) => {
        console.log('⏹️ Admin stopping WhatsApp automation...');
        
        const whatsappAutomation = getAutomationInstance();
        const result = await whatsappAutomation.stopAutomation();
        
        if (result.success) {
            ResponseHelper.success(res, null, 'تم إيقاف الإرسال التلقائي');
        } else {
            ResponseHelper.error(res, result.error || 'فشل في إيقاف الإرسال التلقائي', 500);
        }
    });

    // Close browser
    static closeBrowser = asyncHandler(async (req, res) => {
        console.log('🔒 Admin closing automation browser...');
        
        const whatsappAutomation = getAutomationInstance();
        const result = await whatsappAutomation.closeBrowser();
        
        if (result.success) {
            ResponseHelper.success(res, null, 'تم إغلاق المتصفح بنجاح');
        } else {
            ResponseHelper.error(res, result.error || 'فشل في إغلاق المتصفح', 500);
        }
    });
}

module.exports = WhatsAppAutomationController;