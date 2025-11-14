const DatabaseService = require('./DatabaseService');

class WhatsAppBulkService {
    constructor() {
        this.isProcessing = false;
        this.currentSession = null;
    }

    // Generate bulk WhatsApp links for quick opening
    async generateBulkLinks() {
        try {
            console.log('📱 Generating bulk WhatsApp links...');
            
            // Get pending notifications
            const query = `
                SELECT id, user_id, phone_number, message, notification_type,
                       (SELECT Aname FROM users WHERE user_id = wq.user_id) as user_name
                FROM whatsapp_queue wq
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT 50
            `;
            
            const notifications = await DatabaseService.executeQuery(query);
            
            if (notifications.length === 0) {
                return { success: true, links: [], message: 'No pending messages' };
            }

            const links = notifications.map(notification => {
                // Clean phone number
                let phoneNumber = notification.phone_number.replace(/[^\d+]/g, '');
                if (!phoneNumber.startsWith('+')) {
                    if (phoneNumber.startsWith('965')) {
                        phoneNumber = '+' + phoneNumber;
                    } else {
                        phoneNumber = '+965' + phoneNumber;
                    }
                }

                return {
                    id: notification.id,
                    userName: notification.user_name,
                    phoneNumber: phoneNumber,
                    message: notification.message,
                    notificationType: notification.notification_type,
                    whatsappUrl: `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(notification.message)}`
                };
            });

            console.log(`📱 Generated ${links.length} WhatsApp links`);
            return { success: true, links: links };

        } catch (error) {
            console.error('❌ Failed to generate bulk links:', error);
            return { success: false, error: error.message };
        }
    }

    // Start optimized bulk sending process
    async startOptimizedBulkSending() {
        try {
            if (this.isProcessing) {
                return { success: false, error: 'Bulk sending already in progress' };
            }

            this.isProcessing = true;
            console.log('🚀 Starting optimized bulk WhatsApp sending...');

            const linksResult = await this.generateBulkLinks();
            if (!linksResult.success) {
                this.isProcessing = false;
                return linksResult;
            }

            this.currentSession = {
                total: linksResult.links.length,
                processed: 0,
                successful: 0,
                failed: 0,
                links: linksResult.links,
                startTime: new Date()
            };

            return {
                success: true,
                session: this.currentSession,
                message: `Ready to send ${linksResult.links.length} messages`
            };

        } catch (error) {
            this.isProcessing = false;
            console.error('❌ Failed to start bulk sending:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark message as sent (called from frontend after manual sending)
    async markMessageSent(notificationId) {
        try {
            await DatabaseService.update('whatsapp_queue', 
                { status: 'sent', sent_at: new Date() }, 
                { id: notificationId }
            );

            // Update session progress
            if (this.currentSession) {
                this.currentSession.processed++;
                this.currentSession.successful++;
            }

            console.log(`✅ Marked notification ${notificationId} as sent`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to mark message as sent:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark message as failed
    async markMessageFailed(notificationId, reason) {
        try {
            await DatabaseService.update('whatsapp_queue', 
                { status: 'failed', failed_reason: reason }, 
                { id: notificationId }
            );

            // Update session progress
            if (this.currentSession) {
                this.currentSession.processed++;
                this.currentSession.failed++;
            }

            console.log(`❌ Marked notification ${notificationId} as failed`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to mark message as failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current session status
    getSessionStatus() {
        return {
            isProcessing: this.isProcessing,
            session: this.currentSession
        };
    }

    // Complete bulk sending session
    completeBulkSession() {
        const results = {
            total: this.currentSession ? this.currentSession.total : 0,
            successful: this.currentSession ? this.currentSession.successful : 0,
            failed: this.currentSession ? this.currentSession.failed : 0,
            duration: this.currentSession ? new Date() - this.currentSession.startTime : 0
        };

        this.isProcessing = false;
        this.currentSession = null;

        console.log(`🏁 Bulk sending completed:`, results);
        return { success: true, results: results };
    }

    // Stop bulk sending
    stopBulkSending() {
        this.isProcessing = false;
        console.log('⏹️ Bulk sending stopped by admin');
        return { success: true, message: 'Bulk sending stopped' };
    }

    // Generate WhatsApp automation script for browser console
    generateAutomationScript(links) {
        const script = `
// WhatsApp Bulk Sender - Paste this in WhatsApp Web console
(function() {
    const messages = ${JSON.stringify(links)};
    let currentIndex = 0;
    let successful = 0;
    let failed = 0;

    async function sendNextMessage() {
        if (currentIndex >= messages.length) {
            console.log('✅ Bulk sending completed!', {successful, failed});
            alert('تم إكمال الإرسال التلقائي!\\nنجح: ' + successful + '\\nفشل: ' + failed);
            return;
        }

        const msg = messages[currentIndex];
        console.log('📱 Sending message', currentIndex + 1, 'of', messages.length, 'to', msg.userName);

        try {
            // Navigate to chat
            window.location.href = msg.whatsappUrl;
            
            // Wait for page load
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // Try to auto-send
            const sendBtn = document.querySelector('[data-testid="send"]') || 
                           document.querySelector('[aria-label*="Send"]') ||
                           document.querySelector('button[title*="Send"]');
            
            if (sendBtn) {
                sendBtn.click();
                console.log('✅ Message sent to', msg.userName);
                successful++;
                
                // Report success to server
                fetch('/api/admin/whatsapp-queue/notification/' + msg.id + '/sent', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                });
            } else {
                console.log('❌ Send button not found for', msg.userName);
                failed++;
            }
        } catch (error) {
            console.error('❌ Error sending to', msg.userName, error);
            failed++;
        }

        currentIndex++;
        setTimeout(sendNextMessage, 5000); // 5 second delay between messages
    }

    console.log('🚀 Starting bulk WhatsApp automation...');
    sendNextMessage();
})();
`;
        return script;
    }
}

// Singleton instance
const whatsappBulkService = new WhatsAppBulkService();

module.exports = whatsappBulkService;