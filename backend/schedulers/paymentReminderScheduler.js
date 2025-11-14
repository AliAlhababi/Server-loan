const cron = require('node-cron');
const PaymentReminderService = require('../services/PaymentReminderService');
const brandConfig = require('../../config/brandConfig');

class PaymentReminderScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    /**
     * Initialize and start the payment reminder scheduler
     * Runs on the 25th of every month at 9:00 AM Kuwait time
     */
    start() {
        // Cron expression: 0 9 25 * * (9 AM on 25th of every month)
        // Timezone: Asia/Kuwait
        this.job = cron.schedule('0 9 25 * *', async () => {
            if (this.isRunning) {
                console.log('⏭️  Payment reminder job already running, skipping...');
                return;
            }

            this.isRunning = true;
            console.log('\n========================================');
            console.log('🕐 Starting scheduled payment reminders');
            console.log(`⏰ Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuwait' })}`);
            console.log('========================================\n');

            try {
                const brandName = brandConfig.getBrandDisplayName();
                const result = await PaymentReminderService.sendAllReminders(brandName);

                console.log('\n========================================');
                console.log('✅ Scheduled payment reminders completed');
                console.log(`📊 Summary: ${result.remindersSent}/${result.totalUsers} sent successfully`);
                console.log('========================================\n');
            } catch (error) {
                console.error('\n========================================');
                console.error('❌ Error in scheduled payment reminders:', error);
                console.error('========================================\n');
            } finally {
                this.isRunning = false;
            }
        }, {
            scheduled: true,
            timezone: 'Asia/Kuwait'
        });

        console.log('✅ Payment reminder scheduler started');
        console.log('📅 Schedule: 25th of every month at 9:00 AM Kuwait time');
        console.log(`🔔 Next run: ${this.getNextRunDate()}\n`);
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.job) {
            this.job.stop();
            console.log('⏹️  Payment reminder scheduler stopped');
        }
    }

    /**
     * Get the next scheduled run date
     * @returns {string} Formatted next run date
     */
    getNextRunDate() {
        const now = new Date();
        const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
        const month = now.getMonth() === 11 ? 0 : (now.getDate() >= 25 ? now.getMonth() + 1 : now.getMonth());
        const nextRun = new Date(year, month, 25, 9, 0, 0);

        return nextRun.toLocaleString('en-US', {
            timeZone: 'Asia/Kuwait',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Get scheduler status
     * @returns {Object} Scheduler status
     */
    getStatus() {
        return {
            isActive: this.job ? true : false,
            isRunning: this.isRunning,
            nextRun: this.job ? this.getNextRunDate() : null,
            schedule: '25th of every month at 9:00 AM Kuwait time'
        };
    }

    /**
     * Manually trigger the payment reminder job (for testing)
     */
    async triggerManually() {
        if (this.isRunning) {
            console.log('⏭️  Payment reminder job already running');
            return { success: false, message: 'Job already running' };
        }

        console.log('🔔 Manually triggering payment reminders...');
        this.isRunning = true;

        try {
            const brandName = brandConfig.getBrandDisplayName();
            const result = await PaymentReminderService.sendAllReminders(brandName);
            return { success: true, ...result };
        } catch (error) {
            console.error('❌ Error in manual payment reminders:', error);
            return { success: false, error: error.message };
        } finally {
            this.isRunning = false;
        }
    }
}

// Export singleton instance
module.exports = new PaymentReminderScheduler();
