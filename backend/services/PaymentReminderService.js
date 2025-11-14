const { pool } = require('../config/database');
const emailService = require('./emailService');
const WhatsAppService = require('./whatsappService');

class PaymentReminderService {
    /**
     * Find all users with active loans who haven't made a payment this month
     * @returns {Promise<Array>} Array of users needing payment reminders
     */
    static async findUsersNeedingReminders() {
        try {
            const query = `
                SELECT
                    rl.loan_id,
                    rl.user_id,
                    u.Aname as user_name,
                    u.email,
                    u.whatsapp,
                    u.phone,
                    rl.loan_amount,
                    rl.installment_amount,
                    rl.approval_date,
                    COALESCE(MAX(CASE WHEN l.status = 'accepted' THEN l.date END), rl.approval_date) as last_payment_date,
                    COALESCE(SUM(CASE WHEN l.status = 'accepted' THEN l.credit ELSE 0 END), 0) as total_paid,
                    (rl.loan_amount - COALESCE(SUM(CASE WHEN l.status = 'accepted' THEN l.credit ELSE 0 END), 0)) as remaining_amount,
                    MAX(CASE WHEN l.status = 'accepted'
                             AND MONTH(l.date) = MONTH(CURRENT_DATE)
                             AND YEAR(l.date) = YEAR(CURRENT_DATE)
                        THEN 1 ELSE 0 END) as paid_this_month
                FROM requested_loan rl
                JOIN users u ON rl.user_id = u.user_id
                LEFT JOIN loan l ON rl.loan_id = l.target_loan_id
                WHERE rl.status = 'approved'
                  AND rl.loan_closed_date IS NULL
                  AND u.is_blocked = 0
                  AND u.user_type = 'employee'
                GROUP BY rl.loan_id, rl.user_id, u.Aname, u.email, u.whatsapp, u.phone,
                         rl.loan_amount, rl.installment_amount, rl.approval_date
                HAVING paid_this_month = 0
                   AND remaining_amount > 0.01
                ORDER BY last_payment_date ASC
            `;

            const [users] = await pool.execute(query);
            console.log(`📋 Found ${users.length} users needing payment reminders`);
            return users;
        } catch (error) {
            console.error('❌ Error finding users needing reminders:', error);
            throw new Error(`Failed to find users needing reminders: ${error.message}`);
        }
    }

    /**
     * Send payment reminder to a specific user
     * @param {Object} loanData - Loan and user data
     * @param {string} brandName - Brand name for template
     * @returns {Promise<Object>} Result of sending reminder
     */
    static async sendReminder(loanData, brandName = null) {
        try {
            const {
                loan_id,
                user_id,
                user_name,
                email,
                whatsapp,
                phone,
                loan_amount,
                installment_amount,
                total_paid,
                remaining_amount,
                last_payment_date
            } = loanData;

            // Prepare formatted data
            const formattedData = {
                userName: user_name,
                loanAmount: parseFloat(loan_amount).toFixed(3) + ' د.ك',
                installmentAmount: parseFloat(installment_amount).toFixed(3) + ' د.ك',
                totalPaid: parseFloat(total_paid).toFixed(3) + ' د.ك',
                remainingAmount: parseFloat(remaining_amount).toFixed(3) + ' د.ك',
                lastPaymentDate: last_payment_date ?
                    new Date(last_payment_date).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Kuwait',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : 'لا توجد دفعات بعد'
            };

            const results = {
                user_id,
                loan_id,
                email: { success: false },
                whatsapp: { success: false }
            };

            // Send Email
            if (email) {
                try {
                    const emailResult = await emailService.sendPaymentReminderEmail(
                        email,
                        formattedData,
                        brandName
                    );
                    results.email = emailResult;
                } catch (emailError) {
                    console.error(`❌ Email reminder failed for user ${user_id}:`, emailError);
                    results.email = { success: false, error: emailError.message };
                }
            }

            // Send WhatsApp
            const whatsappPhone = whatsapp || phone;
            if (whatsappPhone) {
                try {
                    const whatsappResult = await WhatsAppService.sendPaymentReminderNotification(
                        user_id,
                        user_name,
                        {
                            loanAmount: formattedData.loanAmount,
                            installmentAmount: formattedData.installmentAmount,
                            totalPaid: formattedData.totalPaid,
                            remainingAmount: formattedData.remainingAmount,
                            lastPaymentDate: formattedData.lastPaymentDate
                        },
                        brandName
                    );
                    results.whatsapp = whatsappResult;
                } catch (whatsappError) {
                    console.error(`❌ WhatsApp reminder failed for user ${user_id}:`, whatsappError);
                    results.whatsapp = { success: false, error: whatsappError.message };
                }
            }

            // Update reminder tracking
            await this.updateReminderTracking(user_id, loan_id, last_payment_date);

            return results;
        } catch (error) {
            console.error('❌ Error sending reminder:', error);
            throw new Error(`Failed to send reminder: ${error.message}`);
        }
    }

    /**
     * Update or create reminder tracking record
     * @param {number} userId - User ID
     * @param {number} loanId - Loan ID
     * @param {Date} lastPaymentDate - Last payment date
     */
    static async updateReminderTracking(userId, loanId, lastPaymentDate) {
        try {
            // Check if tracking record exists
            const [existing] = await pool.execute(
                'SELECT reminder_id, reminder_count FROM loan_payment_reminders WHERE user_id = ? AND loan_id = ? AND status = "active"',
                [userId, loanId]
            );

            if (existing.length > 0) {
                // Update existing record
                await pool.execute(
                    `UPDATE loan_payment_reminders
                     SET last_reminder_sent = NOW(),
                         reminder_count = reminder_count + 1,
                         last_payment_date = ?
                     WHERE reminder_id = ?`,
                    [lastPaymentDate, existing[0].reminder_id]
                );
            } else {
                // Create new tracking record
                await pool.execute(
                    `INSERT INTO loan_payment_reminders
                     (user_id, loan_id, last_payment_date, last_reminder_sent, reminder_count, status)
                     VALUES (?, ?, ?, NOW(), 1, 'active')`,
                    [userId, loanId, lastPaymentDate]
                );
            }
        } catch (error) {
            console.error('❌ Error updating reminder tracking:', error);
            // Don't throw error - tracking is secondary to sending reminders
        }
    }

    /**
     * Generate WhatsApp link with pre-filled reminder message
     * @param {Object} loanData - Loan and user data
     * @param {string} brandName - Brand name for template
     * @returns {Promise<string>} WhatsApp link
     */
    static async generateWhatsAppLink(loanData, brandName = null) {
        try {
            const {
                user_name,
                whatsapp,
                phone,
                loan_amount,
                installment_amount,
                total_paid,
                remaining_amount,
                last_payment_date
            } = loanData;

            // Prepare formatted data
            const formattedData = {
                userName: user_name,
                loanAmount: parseFloat(loan_amount).toFixed(3) + ' د.ك',
                installmentAmount: parseFloat(installment_amount).toFixed(3) + ' د.ك',
                totalPaid: parseFloat(total_paid).toFixed(3) + ' د.ك',
                remainingAmount: parseFloat(remaining_amount).toFixed(3) + ' د.ك',
                lastPaymentDate: last_payment_date ?
                    new Date(last_payment_date).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Kuwait',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : 'لا توجد دفعات بعد'
            };

            const WhatsAppService = require('./whatsappService');
            const whatsappPhone = whatsapp || phone;

            if (!whatsappPhone) {
                throw new Error('No WhatsApp number available');
            }

            // Generate WhatsApp link
            const link = WhatsAppService.generatePaymentReminderLink(
                whatsappPhone,
                formattedData.userName,
                formattedData.loanAmount,
                formattedData.installmentAmount,
                formattedData.totalPaid,
                formattedData.remainingAmount,
                formattedData.lastPaymentDate,
                brandName
            );

            return link;
        } catch (error) {
            console.error('❌ Error generating WhatsApp link:', error);
            throw new Error(`Failed to generate WhatsApp link: ${error.message}`);
        }
    }

    /**
     * Send WhatsApp reminder only to a specific user
     * @param {Object} loanData - Loan and user data
     * @param {string} brandName - Brand name for template
     * @returns {Promise<Object>} Result of sending WhatsApp reminder
     */
    static async sendWhatsAppReminderOnly(loanData, brandName = null) {
        try {
            const {
                loan_id,
                user_id,
                user_name,
                whatsapp,
                phone,
                loan_amount,
                installment_amount,
                total_paid,
                remaining_amount,
                last_payment_date
            } = loanData;

            // Prepare formatted data
            const formattedData = {
                userName: user_name,
                loanAmount: parseFloat(loan_amount).toFixed(3) + ' د.ك',
                installmentAmount: parseFloat(installment_amount).toFixed(3) + ' د.ك',
                totalPaid: parseFloat(total_paid).toFixed(3) + ' د.ك',
                remainingAmount: parseFloat(remaining_amount).toFixed(3) + ' د.ك',
                lastPaymentDate: last_payment_date ?
                    new Date(last_payment_date).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Kuwait',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : 'لا توجد دفعات بعد'
            };

            const result = {
                user_id,
                loan_id,
                whatsapp: { success: false }
            };

            // Send WhatsApp only
            const whatsappPhone = whatsapp || phone;
            if (whatsappPhone) {
                try {
                    const whatsappResult = await WhatsAppService.sendPaymentReminderNotification(
                        user_id,
                        user_name,
                        {
                            loanAmount: formattedData.loanAmount,
                            installmentAmount: formattedData.installmentAmount,
                            totalPaid: formattedData.totalPaid,
                            remainingAmount: formattedData.remainingAmount,
                            lastPaymentDate: formattedData.lastPaymentDate
                        },
                        brandName
                    );
                    result.whatsapp = whatsappResult;
                } catch (whatsappError) {
                    console.error(`❌ WhatsApp reminder failed for user ${user_id}:`, whatsappError);
                    result.whatsapp = { success: false, error: whatsappError.message };
                }
            }

            // Update reminder tracking
            await this.updateReminderTracking(user_id, loan_id, last_payment_date);

            return result;
        } catch (error) {
            console.error('❌ Error sending WhatsApp reminder:', error);
            throw new Error(`Failed to send WhatsApp reminder: ${error.message}`);
        }
    }

    /**
     * Send reminders to all users who need them
     * @param {string} brandName - Brand name for templates
     * @returns {Promise<Object>} Summary of reminders sent
     */
    static async sendAllReminders(brandName = null) {
        try {
            console.log('📨 Starting monthly payment reminder process...');

            const usersNeedingReminders = await this.findUsersNeedingReminders();

            if (usersNeedingReminders.length === 0) {
                console.log('✅ No users need payment reminders at this time');
                return {
                    success: true,
                    totalUsers: 0,
                    remindersSent: 0,
                    failures: 0
                };
            }

            let successCount = 0;
            let failureCount = 0;
            const results = [];

            for (const loanData of usersNeedingReminders) {
                try {
                    const result = await this.sendReminder(loanData, brandName);

                    if (result.email.success || result.whatsapp.success) {
                        successCount++;
                        console.log(`✅ Reminder sent to ${loanData.user_name} (User ID: ${loanData.user_id})`);
                    } else {
                        failureCount++;
                        console.warn(`⚠️  Failed to send reminder to ${loanData.user_name} (User ID: ${loanData.user_id})`);
                    }

                    results.push(result);
                } catch (error) {
                    failureCount++;
                    console.error(`❌ Error sending reminder to user ${loanData.user_id}:`, error);
                }

                // Add small delay to avoid overwhelming email/WhatsApp servers
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`\n✅ Payment reminder process complete!`);
            console.log(`📊 Total users: ${usersNeedingReminders.length}`);
            console.log(`✅ Successful: ${successCount}`);
            console.log(`❌ Failed: ${failureCount}\n`);

            return {
                success: true,
                totalUsers: usersNeedingReminders.length,
                remindersSent: successCount,
                failures: failureCount,
                details: results
            };
        } catch (error) {
            console.error('❌ Error in sendAllReminders:', error);
            throw new Error(`Failed to send all reminders: ${error.message}`);
        }
    }

    /**
     * Get reminder statistics
     * @returns {Promise<Object>} Reminder statistics
     */
    static async getStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT
                    COUNT(DISTINCT user_id) as total_users_with_reminders,
                    COUNT(*) as total_reminders,
                    SUM(reminder_count) as total_reminder_count,
                    AVG(reminder_count) as avg_reminders_per_loan
                FROM loan_payment_reminders
                WHERE status = 'active'
            `);

            const [recentReminders] = await pool.execute(`
                SELECT COUNT(*) as recent_count
                FROM loan_payment_reminders
                WHERE last_reminder_sent >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND status = 'active'
            `);

            return {
                success: true,
                stats: {
                    ...stats[0],
                    reminders_last_7_days: recentReminders[0].recent_count
                }
            };
        } catch (error) {
            console.error('❌ Error getting reminder statistics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get reminder history for admin dashboard
     * @param {number} limit - Number of records to return
     * @returns {Promise<Array>} Reminder history
     */
    static async getReminderHistory(limit = 50) {
        try {
            const query = `
                SELECT
                    lpr.*,
                    u.Aname as user_name,
                    u.email,
                    rl.loan_amount,
                    rl.installment_amount
                FROM loan_payment_reminders lpr
                JOIN users u ON lpr.user_id = u.user_id
                JOIN requested_loan rl ON lpr.loan_id = rl.loan_id
                WHERE lpr.status = 'active'
                ORDER BY lpr.last_reminder_sent DESC
                LIMIT ?
            `;

            const [history] = await pool.execute(query, [parseInt(limit)]);
            return { success: true, history };
        } catch (error) {
            console.error('❌ Error getting reminder history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause reminders for a specific loan
     * @param {number} loanId - Loan ID
     * @returns {Promise<Object>} Result
     */
    static async pauseReminder(loanId) {
        try {
            await pool.execute(
                'UPDATE loan_payment_reminders SET status = "paused" WHERE loan_id = ?',
                [loanId]
            );
            return { success: true, message: 'Reminder paused successfully' };
        } catch (error) {
            console.error('❌ Error pausing reminder:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resume reminders for a specific loan
     * @param {number} loanId - Loan ID
     * @returns {Promise<Object>} Result
     */
    static async resumeReminder(loanId) {
        try {
            await pool.execute(
                'UPDATE loan_payment_reminders SET status = "active" WHERE loan_id = ?',
                [loanId]
            );
            return { success: true, message: 'Reminder resumed successfully' };
        } catch (error) {
            console.error('❌ Error resuming reminder:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark loan reminders as completed (when loan is paid off)
     * @param {number} loanId - Loan ID
     * @returns {Promise<Object>} Result
     */
    static async markAsCompleted(loanId) {
        try {
            await pool.execute(
                'UPDATE loan_payment_reminders SET status = "completed" WHERE loan_id = ?',
                [loanId]
            );
            return { success: true, message: 'Reminder marked as completed' };
        } catch (error) {
            console.error('❌ Error marking reminder as completed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = PaymentReminderService;
