const PaymentReminderService = require('../services/PaymentReminderService');
const brandConfig = require('../../config/brandConfig');

class PaymentReminderController {
    /**
     * Get users who need payment reminders
     */
    static async getUsersNeedingReminders(req, res) {
        try {
            const users = await PaymentReminderService.findUsersNeedingReminders();

            res.json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Error getting users needing reminders:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في جلب قائمة المستخدمين المستحقين للتذكير'
            });
        }
    }

    /**
     * Send reminder to a specific user/loan
     */
    static async sendSingleReminder(req, res) {
        try {
            const { userId, loanId } = req.params;

            // Get loan data
            const users = await PaymentReminderService.findUsersNeedingReminders();
            const loanData = users.find(u => u.user_id == userId && u.loan_id == loanId);

            if (!loanData) {
                return res.status(404).json({
                    success: false,
                    error: 'لم يتم العثور على القرض أو لا يحتاج لتذكير'
                });
            }

            const brandName = brandConfig.getBrandDisplayName();
            const result = await PaymentReminderService.sendReminder(loanData, brandName);

            res.json({
                success: true,
                message: 'تم إرسال التذكير بنجاح',
                result: result
            });
        } catch (error) {
            console.error('Error sending single reminder:', error);
            res.status(500).json({
                success: false,
                error: 'فشل في إرسال التذكير'
            });
        }
    }

    /**
     * Get WhatsApp link for a specific user/loan reminder
     */
    static async getWhatsAppLink(req, res) {
        try {
            const { userId, loanId } = req.params;

            // Get loan data
            const users = await PaymentReminderService.findUsersNeedingReminders();
            const loanData = users.find(u => u.user_id == userId && u.loan_id == loanId);

            if (!loanData) {
                return res.status(404).json({
                    success: false,
                    message: 'لم يتم العثور على القرض أو لا يحتاج لتذكير'
                });
            }

            const brandName = brandConfig.getBrandDisplayName();
            const whatsappLink = await PaymentReminderService.generateWhatsAppLink(loanData, brandName);

            res.json({
                success: true,
                whatsappLink: whatsappLink,
                userData: {
                    user_id: loanData.user_id,
                    user_name: loanData.user_name,
                    phone: loanData.whatsapp || loanData.phone
                }
            });
        } catch (error) {
            console.error('Error generating WhatsApp link:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في إنشاء رابط واتساب'
            });
        }
    }

    /**
     * Mark WhatsApp reminder as sent
     */
    static async markReminderSent(req, res) {
        try {
            const { userId, loanId } = req.params;

            // Get loan data to get last payment date
            const users = await PaymentReminderService.findUsersNeedingReminders();
            const loanData = users.find(u => u.user_id == userId && u.loan_id == loanId);

            if (!loanData) {
                return res.status(404).json({
                    success: false,
                    message: 'لم يتم العثور على القرض'
                });
            }

            // Update reminder tracking
            await PaymentReminderService.updateReminderTracking(
                userId,
                loanId,
                loanData.last_payment_date
            );

            res.json({
                success: true,
                message: 'تم تسجيل إرسال التذكير'
            });
        } catch (error) {
            console.error('Error marking reminder as sent:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في تسجيل إرسال التذكير'
            });
        }
    }

    /**
     * Send reminders to all users who need them
     */
    static async sendAllReminders(req, res) {
        try {
            const brandName = brandConfig.getBrandDisplayName();
            const result = await PaymentReminderService.sendAllReminders(brandName);

            res.json({
                success: true,
                message: `تم إرسال ${result.remindersSent} تذكير بنجاح`,
                data: result
            });
        } catch (error) {
            console.error('Error sending all reminders:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في إرسال التذكيرات'
            });
        }
    }

    /**
     * Get reminder statistics
     */
    static async getStatistics(req, res) {
        try {
            const result = await PaymentReminderService.getStatistics();

            if (!result.success) {
                throw new Error(result.error);
            }

            res.json({
                success: true,
                data: result.stats
            });
        } catch (error) {
            console.error('Error getting reminder statistics:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في جلب إحصائيات التذكيرات'
            });
        }
    }

    /**
     * Get reminder history
     */
    static async getReminderHistory(req, res) {
        try {
            const limit = req.query.limit || 50;
            const result = await PaymentReminderService.getReminderHistory(limit);

            if (!result.success) {
                throw new Error(result.error);
            }

            res.json({
                success: true,
                count: result.history.length,
                history: result.history
            });
        } catch (error) {
            console.error('Error getting reminder history:', error);
            res.status(500).json({
                success: false,
                error: 'فشل في جلب سجل التذكيرات'
            });
        }
    }

    /**
     * Pause reminders for a specific loan
     */
    static async pauseReminder(req, res) {
        try {
            const { loanId } = req.params;
            const result = await PaymentReminderService.pauseReminder(loanId);

            if (!result.success) {
                throw new Error(result.error);
            }

            res.json({
                success: true,
                message: 'تم إيقاف التذكيرات بنجاح'
            });
        } catch (error) {
            console.error('Error pausing reminder:', error);
            res.status(500).json({
                success: false,
                error: 'فشل في إيقاف التذكيرات'
            });
        }
    }

    /**
     * Resume reminders for a specific loan
     */
    static async resumeReminder(req, res) {
        try {
            const { loanId } = req.params;
            const result = await PaymentReminderService.resumeReminder(loanId);

            if (!result.success) {
                throw new Error(result.error);
            }

            res.json({
                success: true,
                message: 'تم استئناف التذكيرات بنجاح'
            });
        } catch (error) {
            console.error('Error resuming reminder:', error);
            res.status(500).json({
                success: false,
                error: 'فشل في استئناف التذكيرات'
            });
        }
    }
}

module.exports = PaymentReminderController;
