// WhatsApp Web Automation Helper
// This script automates message sending in WhatsApp Web

class WhatsAppAutomation {
    constructor() {
        this.currentQueue = [];
        this.isProcessing = false;
        this.whatsappTab = null;
        this.messageIndex = 0;
    }

    // Start automated sending process
    async startAutomatedSending(notifications) {
        this.currentQueue = notifications;
        this.messageIndex = 0;
        this.isProcessing = true;

        try {
            // Try to open WhatsApp Web tab
            this.whatsappTab = window.open('https://web.whatsapp.com', '_blank');

            if (!this.whatsappTab) {
                throw new Error('فشل في فتح تبويب الواتساب - يرجى السماح بالنوافذ المنبثقة');
            }

            // Add event listener for tab being closed
            const checkClosed = () => {
                if (this.whatsappTab.closed) {
                    this.onError('تم إغلاق تبويب الواتساب');
                    return;
                }
                // Check again in 1 second
                setTimeout(checkClosed, 1000);
            };

            // Start checking if tab gets closed
            setTimeout(checkClosed, 1000);

            // Wait longer for WhatsApp Web to load properly
            setTimeout(() => {
                this.checkWhatsAppReady();
            }, 8000); // Increased delay

        } catch (error) {
            this.onError(error.message || error);
        }
    }

    // Check if WhatsApp Web is ready
    checkWhatsAppReady() {
        if (!this.whatsappTab || this.whatsappTab.closed) {
            // Tab was closed, switch to manual mode
            console.log('WhatsApp tab was closed, switching to manual link generation mode');
            this.generateManualLinks();
            return;
        }

        try {
            // Check if the tab is still accessible
            if (this.whatsappTab.location.href.includes('whatsapp.com')) {
                // Tab is ready, start sending messages
                this.startSendingMessages();
            } else {
                // Still loading, check again
                setTimeout(() => this.checkWhatsAppReady(), 2000);
            }
        } catch (error) {
            // Cross-origin restriction or still loading, assume ready after initial delay
            console.log('Cross-origin restriction detected, assuming WhatsApp is ready');
            this.startSendingMessages();
        }
    }

    // Generate manual WhatsApp links if automation fails
    generateManualLinks() {
        console.log('📱 Switching to single-tab sequential mode...');
        
        if (typeof showToast !== 'undefined') {
            showToast('سيتم فتح رسائل الواتساب واحدة تلو الأخرى في نفس التبويب', 'info');
        }

        // Try to open a fresh WhatsApp Web tab for sequential processing
        try {
            this.whatsappTab = window.open('https://web.whatsapp.com', 'whatsapp-single');
            
            if (!this.whatsappTab) {
                this.fallbackToMultipleTabs();
                return;
            }

            // Wait for initial load, then start sequential processing
            setTimeout(() => {
                this.startSendingMessages();
            }, 8000);
            
        } catch (error) {
            console.error('Failed to open single tab, falling back to multiple tabs:', error);
            this.fallbackToMultipleTabs();
        }
    }

    // Fallback to multiple tabs if single tab fails
    fallbackToMultipleTabs() {
        console.log('📱 Fallback: Opening individual WhatsApp links...');
        
        if (typeof showToast !== 'undefined') {
            showToast('سيتم فتح رسائل الواتساب في تبويبات منفصلة', 'warning');
        }

        // Open each message in a new tab with a delay
        this.currentQueue.forEach((notification, index) => {
            setTimeout(() => {
                let phoneNumber = notification.phone_number.replace(/[^\d+]/g, '');
                if (!phoneNumber.startsWith('+')) {
                    if (phoneNumber.startsWith('965')) {
                        phoneNumber = '+' + phoneNumber;
                    } else {
                        phoneNumber = '+965' + phoneNumber;
                    }
                }

                const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(notification.message)}`;
                window.open(whatsappUrl, '_blank');
                
                // Don't auto-mark as sent in fallback mode
                console.log(`📱 Opened WhatsApp link for ${notification.user_name}`);
                
            }, index * 3000); // 3 second delay between tabs
        });

        // Show completion message
        setTimeout(() => {
            if (typeof showToast !== 'undefined') {
                showToast(`تم فتح ${this.currentQueue.length} رابط واتساب. يرجى إرسال الرسائل يدوياً ثم تحديث الحالة.`, 'success');
            }
            this.isProcessing = false;
        }, this.currentQueue.length * 3000 + 2000);
    }

    // Start sending messages sequentially
    async startSendingMessages() {
        if (this.messageIndex >= this.currentQueue.length) {
            this.onComplete();
            return;
        }

        const notification = this.currentQueue[this.messageIndex];
        await this.sendSingleMessage(notification);
        
        // Move to next message after delay
        setTimeout(() => {
            this.messageIndex++;
            this.startSendingMessages();
        }, 3000); // 3 second delay between messages
    }

    // Send a single message
    async sendSingleMessage(notification) {
        try {
            // Clean phone number - ensure it has country code
            let phoneNumber = notification.phone_number.replace(/[^\d+]/g, '');
            if (!phoneNumber.startsWith('+')) {
                if (phoneNumber.startsWith('965')) {
                    phoneNumber = '+' + phoneNumber;
                } else {
                    phoneNumber = '+965' + phoneNumber;
                }
            }

            const message = notification.message;

            // WhatsApp Web URL with pre-filled message
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
            
            // Navigate to the message URL
            this.whatsappTab.location.href = whatsappUrl;

            // Show user which message is being processed
            this.showCurrentMessageStatus(notification);

            // Mark as sent after delay (manual sending expected)
            setTimeout(() => {
                this.markMessageAsSent(notification);
            }, 8000); // Give user time to manually send if needed

        } catch (error) {
            console.error('Error sending message:', error);
            this.onMessageFailed(notification, error);
        }
    }

    // Show current message status to user
    showCurrentMessageStatus(notification) {
        if (typeof showToast !== 'undefined') {
            showToast(`جاري إرسال رسالة إلى ${notification.user_name} (${this.messageIndex + 1}/${this.currentQueue.length})`, 'info');
        }
        console.log(`📱 Processing message ${this.messageIndex + 1}/${this.currentQueue.length} for ${notification.user_name}`);
    }

    // Mark individual message as sent
    async markMessageAsSent(notification) {
        try {
            if (typeof apiCall !== 'undefined') {
                await apiCall(`/admin/whatsapp-queue/notification/${notification.id}/sent`, 'POST');
                console.log(`✅ Marked notification ${notification.id} as sent`);
            }
        } catch (error) {
            console.error('Error marking message as sent:', error);
        }
    }

    // Handle successful completion
    onComplete() {
        this.isProcessing = false;
        
        // Show completion message
        if (typeof showToast !== 'undefined') {
            showToast(`تم تحضير ${this.currentQueue.length} رسالة واتساب وتم تسجيلها كمرسلة تلقائياً!`, 'success');
        }
        
        // Keep tab open for manual sending - don't auto-close
        console.log(`📱 WhatsApp automation completed. ${this.currentQueue.length} messages prepared and marked as sent.`);

        // Refresh the WhatsApp queue display
        setTimeout(() => {
            if (typeof whatsappQueueManagement !== 'undefined') {
                whatsappQueueManagement.show();
            }
        }, 2000);
    }

    // Handle errors
    onError(error) {
        this.isProcessing = false;
        console.error('WhatsApp automation error:', error);
        
        if (typeof showToast !== 'undefined') {
            showToast('خطأ في أتمتة الواتساب: ' + error, 'error');
        }
    }

    // Handle individual message failure
    onMessageFailed(notification, error) {
        console.error(`Message failed for ${notification.user_name}:`, error);
        // Continue with next message
    }

    // Mark all messages as sent
    async markAllAsSent() {
        try {
            const notificationIds = this.currentQueue.map(n => n.id);
            
            if (typeof apiCall !== 'undefined') {
                await apiCall('/admin/whatsapp-queue/batch-sent', 'POST', { notificationIds });
            }
            
            // Refresh the WhatsApp queue display
            if (typeof whatsappQueueManagement !== 'undefined') {
                await whatsappQueueManagement.show();
            }
        } catch (error) {
            console.error('Error marking messages as sent:', error);
        }
    }

    // Stop automation
    stopAutomation() {
        this.isProcessing = false;
        
        if (this.whatsappTab && !this.whatsappTab.closed) {
            this.whatsappTab.close();
        }
    }
}

// Global instance
window.whatsappAutomation = new WhatsAppAutomation();