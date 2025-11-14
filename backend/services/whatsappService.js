const DatabaseService = require('./DatabaseService');
const brandConfig = require('../config/brandConfig');

class WhatsAppService {
    // Generate WhatsApp Web URL with pre-composed message
    static generateWhatsAppLink(phoneNumber, message) {
        // Clean phone number (remove any non-digits except +)
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        
        // Ensure phone starts with country code
        let formattedPhone = cleanPhone;
        if (!cleanPhone.startsWith('+')) {
            // Assume Kuwait if no country code (+965)
            if (cleanPhone.startsWith('965')) {
                formattedPhone = '+' + cleanPhone;
            } else {
                formattedPhone = '+965' + cleanPhone;
            }
        }
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        
        // Return WhatsApp Web URL
        return `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    }

    // Get brand-specific WhatsApp business number
    static getBusinessWhatsAppNumber() {
        return brandConfig.getSection('whatsapp').phone;
    }

    // Get brand-specific WhatsApp business name
    static getBusinessWhatsAppName() {
        return brandConfig.getSection('whatsapp').businessName;
    }

    // Queue WhatsApp notification for batch sending
    static async queueNotification(userId, phoneNumber, message, notificationType, relatedId = null, relatedType = null, adminId = null) {
        try {
            // Generate WhatsApp link
            const whatsappLink = this.generateWhatsAppLink(phoneNumber, message);
            
            // Store in queue
            const queueData = {
                user_id: userId,
                phone_number: phoneNumber,
                message: message,
                notification_type: notificationType,
                status: 'pending',
                whatsapp_link: whatsappLink,
                related_id: relatedId,
                related_type: relatedType,
                admin_id: adminId
            };
            
            const result = await DatabaseService.create('whatsapp_queue', queueData);
            console.log(`📱 WhatsApp notification queued for user ${userId}: ${notificationType}`);
            
            return {
                success: true,
                queueId: result.insertId,
                whatsappLink: whatsappLink
            };
        } catch (error) {
            console.error('❌ Failed to queue WhatsApp notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get brand-specific templates (same logic as frontend utils.js)
    static getWhatsAppTemplates(brandName = null) {
        // Use provided brand name or get from brand config or fallback to default
        const finalBrandName = brandName || brandConfig.getBrandDisplayName() || 'نظام إدارة القروض';

        // Add website link only for site A (صندوق الكوثر)
        const websiteLink = (finalBrandName === 'صندوق الكوثر' || finalBrandName.includes('الكوثر')) ?
            '\n\n🌐 موقعنا الإلكتروني: https://www.alkawtharb.com/' : '';
        
        return {
            joiningFeeApproved: (userName, userFinancials = null) => {
                let message = `🛡️ ${finalBrandName} - اعتماد العضوية

مبروك ${userName}! 🎉

تم اعتماد رسوم الانضمام وأصبحت عضواً فعالاً في ${finalBrandName}.`;

                if (userFinancials && userFinancials.totalSubscriptions) {
                    message += `\n\n💰 إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;
                }

                message += `\n\n✅ الخطوات التالية:
• ابدأ بدفع الاشتراكات الشهرية
• بعد سنة كاملة ستصبح مؤهلاً لطلب القروض

أهلاً وسهلاً بك في عائلة ${finalBrandName}${websiteLink}

إدارة الصندوق`;
                return message;
            },

            joiningFeeRejected: (userName) => `🛡️ ${finalBrandName} - تحديث العضوية

مرحباً ${userName}

للأسف لم يتم اعتماد رسوم الانضمام في الوقت الحالي.

📞 يرجى التواصل معنا للاستفسار عن الأسباب والخطوات المطلوبة.${websiteLink}

شكراً لتفهمك
إدارة ${finalBrandName}`,

            loanApproved: (userName, loanAmount, installmentAmount, numberOfInstallments, userFinancials = null) => {
                let message = `🛡️ ${finalBrandName} - اعتماد القرض

مبروك ${userName}! 💰

تم اعتماد طلب القرض بالتفاصيل التالية:

💰 مبلغ القرض: ${loanAmount}
📅 القسط الشهري: ${installmentAmount}
🔢 عدد الأقساط: ${numberOfInstallments} قسط`;

                message += `\n\n✅ يمكنك الآن:
• البدء بدفع الأقساط من خلال النظام
• متابعة حالة القرض من حسابك
• التواصل معنا عند الحاجة

تهانينا وبالتوفيق!${websiteLink}

إدارة ${finalBrandName}`;
                return message;
            },

            loanRejected: (userName, loanAmount) => `🛡️ ${finalBrandName} - تحديث طلب القرض

مرحباً ${userName}

للأسف لم يتم اعتماد طلب القرض بمبلغ ${loanAmount} في الوقت الحالي.

📞 يرجى التواصل معنا للاستفسار عن الأسباب وإمكانية إعادة التقديم لاحقاً.${websiteLink}

شكراً لتفهمك
إدارة ${finalBrandName}`,

            transactionApproved: (userName, amount, transactionType, userFinancials = null) => {
                const typeText = {
                    'deposit': 'الإيداع',
                    'withdrawal': 'السحب', 
                    'subscription': 'الاشتراك',
                    'joining_fee': 'رسوم الانضمام'
                }[transactionType] || 'المعاملة';

                let message = `🛡️ ${finalBrandName} - قبول ${typeText}

مرحباً ${userName} ✅

تم قبول ${typeText} بمبلغ ${amount} بنجاح.`;

                if (userFinancials) {
                    message += `\n\n💰 تفاصيل الحساب:`;
                    
                    // Show current balance
                    if (userFinancials.currentBalance !== undefined) {
                        message += `\n• رصيدك الحالي: ${userFinancials.currentBalance} د.ك`;
                    }
                    
                    // Show subscription total for subscription payments
                    if (transactionType === 'subscription' && userFinancials.totalSubscriptions) {
                        message += `\n• إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;
                    }
                }

                message += `\n${websiteLink}

شكراً لك
إدارة ${finalBrandName}`;
                return message;
            },

            transactionRejected: (userName, amount, transactionType) => {
                const typeText = {
                    'deposit': 'الإيداع',
                    'withdrawal': 'السحب',
                    'subscription': 'الاشتراك', 
                    'joining_fee': 'رسوم الانضمام'
                }[transactionType] || 'المعاملة';

                return `🛡️ ${finalBrandName} - رفض ${typeText}

مرحباً ${userName}

للأسف لم يتم قبول ${typeText} بمبلغ ${amount}.

📞 يرجى التواصل معنا للاستفسار عن الأسباب.${websiteLink}

شكراً لتفهمك
إدارة ${finalBrandName}`;
            },

            loanPaymentApproved: (userName, paymentAmount, totalPaid, loanAmount, remainingAmount, userFinancials = null) => {
                // Extract numeric values for calculations
                const numericTotalPaid = parseFloat(totalPaid.toString().replace(/[^\d.-]/g, '')) || 0;
                const numericLoanAmount = parseFloat(loanAmount.toString().replace(/[^\d.-]/g, '')) || 0;
                
                // Recalculate remaining amount to ensure consistency
                const recalculatedRemaining = Math.max(0, numericLoanAmount - numericTotalPaid);
                const completionPercentage = numericLoanAmount > 0 ? Math.round((numericTotalPaid / numericLoanAmount) * 100) : 0;
                const isCompleted = recalculatedRemaining <= 0.01;

                let message = `🛡️ ${finalBrandName} - قبول دفعة القرض

مرحباً ${userName} ✅

تم قبول دفعة القرض بمبلغ ${paymentAmount}.

📊 ملخص القرض:
• أصل القرض: ${loanAmount}
• المدفوع: ${totalPaid}
• المتبقي: ${recalculatedRemaining.toFixed(3)} د.ك
• نسبة الإنجاز: ${completionPercentage}%`;

                if (isCompleted) {
                    message += `\n\n🎉 مبروك! تم سداد القرض بالكامل
🗓️ يمكنك طلب قرض جديد بعد 30 يوماً`;
                } else {
                    message += `\n\n💡 استمر في دفع الأقساط حسب الجدول المحدد`;
                }

                message += `\n${websiteLink}

شكراً لك
إدارة ${finalBrandName}`;
                return message;
            },

            loanPaymentRejected: (userName, paymentAmount) => `🛡️ ${finalBrandName} - رفض دفعة القرض

مرحباً ${userName}

للأسف لم يتم قبول دفعة القرض بمبلغ ${paymentAmount}.

📞 يرجى التواصل معنا للاستفسار عن الأسباب وإعادة تقديم الدفعة.${websiteLink}

شكراً لتفهمك
إدارة ${finalBrandName}`,

            paymentReminder: (userName, loanAmount, installmentAmount, totalPaid, remainingAmount, lastPaymentDate) => `${finalBrandName} - تذكير بالدفعة الشهرية

عزيزي ${userName}

يرجى تسديد المستحقات المطلوبة من القرض المستفيد منه.
هذه الرسالة بمثابة تذكير.

📊 تفاصيل القرض:
• مبلغ القرض: ${loanAmount}
• القسط الشهري المطلوب: ${installmentAmount}
• المبلغ المسدد: ${totalPaid}
• المتبقي: ${remainingAmount}

⏰ آخر دفعة: ${lastPaymentDate}

📞 للاستفسار، يرجى التواصل مع الإدارة

شكراً لتعاونك
إدارة ${finalBrandName}`
        };
    }

    // Send transaction approval notification
    static async sendTransactionApprovalNotification(userId, userName, transactionData, adminName, totalSubscriptions = null, brandName = null) {
        try {
            // Get user details with fresh balance (after transaction processing)
            const userQuery = `
                SELECT user_id, whatsapp, phone, balance, email
                FROM users 
                WHERE user_id = ?
            `;
            const userResults = await DatabaseService.executeQuery(userQuery, [userId]);
            
            if (userResults.length === 0) {
                console.warn('User not found for WhatsApp notification:', userId);
                return { success: false, reason: 'User not found' };
            }
            
            const user = userResults[0];
            const phoneNumber = user.whatsapp || user.phone;
            
            if (!phoneNumber) {
                console.warn('No phone number for WhatsApp notification:', userId);
                return { success: false, reason: 'No phone number' };
            }

            // Prepare user financial data with current (updated) balance
            const userFinancials = {
                currentBalance: parseFloat(user.balance || 0).toFixed(3),
                totalSubscriptions: totalSubscriptions,
                transactionAmount: Math.abs(parseFloat(transactionData.amount || 0))
            };

            // Generate message using templates
            const templates = this.getWhatsAppTemplates(brandName);
            const message = templates.transactionApproved(
                userName,
                `${parseFloat(transactionData.amount).toFixed(3)} د.ك`,
                transactionData.transaction_type,
                userFinancials
            );

            // Queue notification
            return await this.queueNotification(
                user.user_id,
                phoneNumber,
                message,
                'transaction_approved',
                transactionData.transaction_id,
                'transaction'
            );
        } catch (error) {
            console.error('❌ Failed to send transaction WhatsApp notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send loan payment approval notification
    static async sendLoanPaymentApprovalNotification(userId, userName, paymentData, adminName, loanSummary = null, brandName = null) {
        try {
            // Get user details
            const userQuery = `
                SELECT user_id, whatsapp, phone, balance, email
                FROM users 
                WHERE user_id = ?
            `;
            const userResults = await DatabaseService.executeQuery(userQuery, [userId]);
            
            if (userResults.length === 0) {
                console.warn('User not found for WhatsApp notification:', userId);
                return { success: false, reason: 'User not found' };
            }
            
            const user = userResults[0];
            const phoneNumber = user.whatsapp || user.phone;
            
            if (!phoneNumber) {
                console.warn('No phone number for WhatsApp notification:', userId);
                return { success: false, reason: 'No phone number' };
            }

            // Generate message using templates
            const templates = this.getWhatsAppTemplates(brandName);
            const message = templates.loanPaymentApproved(
                userName,
                `${parseFloat(paymentData.amount).toFixed(3)} د.ك`,
                loanSummary ? `${loanSummary.totalPaid} د.ك` : `${paymentData.amount} د.ك`,
                loanSummary ? `${loanSummary.totalLoan} د.ك` : 'غير محدد',
                loanSummary ? `${loanSummary.remainingAmount} د.ك` : 'غير محدد'
            );

            // Queue notification
            return await this.queueNotification(
                user.user_id,
                phoneNumber,
                message,
                'loan_payment_approved',
                paymentData.loan_id,
                'loan_payment'
            );
        } catch (error) {
            console.error('❌ Failed to send loan payment WhatsApp notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Get pending notifications for admin dashboard
    static async getPendingNotifications() {
        try {
            const query = `
                SELECT wq.*, u.Aname as user_name, u.email as user_email
                FROM whatsapp_queue wq
                JOIN users u ON wq.user_id = u.user_id
                WHERE wq.status = 'pending'
                ORDER BY wq.created_at ASC
            `;
            
            const notifications = await DatabaseService.executeQuery(query);
            return {
                success: true,
                notifications: notifications,
                count: notifications.length
            };
        } catch (error) {
            console.error('❌ Failed to get pending WhatsApp notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark notification as sent
    static async markAsSent(notificationId) {
        try {
            await DatabaseService.update('whatsapp_queue', 
                { status: 'sent', sent_at: new Date() }, 
                { id: notificationId }
            );
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to mark WhatsApp notification as sent:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark notification as failed
    static async markAsFailed(notificationId, reason = null) {
        try {
            await DatabaseService.update('whatsapp_queue', 
                { status: 'failed', failed_reason: reason }, 
                { id: notificationId }
            );
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to mark WhatsApp notification as failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Send payment reminder notification
    static async sendPaymentReminderNotification(userId, userName, reminderData, brandName = null) {
        try {
            // Get user details
            const userQuery = `
                SELECT user_id, whatsapp, phone, balance, email
                FROM users
                WHERE user_id = ?
            `;
            const userResults = await DatabaseService.executeQuery(userQuery, [userId]);

            if (userResults.length === 0) {
                console.warn('User not found for WhatsApp notification:', userId);
                return { success: false, reason: 'User not found' };
            }

            const user = userResults[0];
            const phoneNumber = user.whatsapp || user.phone;

            if (!phoneNumber) {
                console.warn('No phone number for WhatsApp notification:', userId);
                return { success: false, reason: 'No phone number' };
            }

            // Generate message using templates
            const templates = this.getWhatsAppTemplates(brandName);
            const message = templates.paymentReminder(
                userName,
                reminderData.loanAmount,
                reminderData.installmentAmount,
                reminderData.totalPaid,
                reminderData.remainingAmount,
                reminderData.lastPaymentDate
            );

            // Queue notification
            return await this.queueNotification(
                user.user_id,
                phoneNumber,
                message,
                'payment_reminder',
                null,
                'payment_reminder'
            );
        } catch (error) {
            console.error('❌ Failed to send payment reminder WhatsApp notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate WhatsApp link for payment reminder
    static generatePaymentReminderLink(phoneNumber, userName, loanAmount, installmentAmount, totalPaid, remainingAmount, lastPaymentDate, brandName = null) {
        try {
            // Generate message using templates
            const templates = this.getWhatsAppTemplates(brandName);
            const message = templates.paymentReminder(
                userName,
                loanAmount,
                installmentAmount,
                totalPaid,
                remainingAmount,
                lastPaymentDate
            );

            // Clean phone number (remove + and spaces)
            const cleanPhone = phoneNumber.replace(/[\s+]/g, '');

            // Create WhatsApp link with encoded message
            const encodedMessage = encodeURIComponent(message);
            return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        } catch (error) {
            console.error('❌ Failed to generate payment reminder WhatsApp link:', error);
            throw error;
        }
    }

    // Get notification statistics
    static async getNotificationStats() {
        try {
            const stats = await DatabaseService.executeQuery(`
                SELECT
                    status,
                    COUNT(*) as count
                FROM whatsapp_queue
                WHERE archived = 0
                GROUP BY status
            `);

            const result = {
                pending: 0,
                sent: 0,
                failed: 0
            };

            stats.forEach(stat => {
                result[stat.status] = parseInt(stat.count);
            });

            return { success: true, stats: result };
        } catch (error) {
            console.error('❌ Failed to get WhatsApp notification stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Clear old notifications (older than 7 days)
    static async clearOldNotifications() {
        try {
            // Archive all sent messages (not delete them)
            const result = await DatabaseService.executeQuery(`
                UPDATE whatsapp_queue 
                SET archived = 1 
                WHERE status = 'sent' AND archived = 0
            `);
            
            console.log(`📦 Archived ${result.affectedRows} sent WhatsApp notifications`);
            return { success: true, cleared: result.affectedRows };
        } catch (error) {
            console.error('❌ Failed to archive WhatsApp notifications:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = WhatsAppService;