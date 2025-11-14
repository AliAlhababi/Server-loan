// Admin WhatsApp Queue Management Tab
// Handles batch WhatsApp notification sending

class WhatsAppQueueManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.pendingNotifications = [];
        this.sendingInProgress = false;
    }

    // Show WhatsApp queue management section
    async show() {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #25D366;">
                        <i class="fab fa-whatsapp"></i> إدارة إشعارات الواتساب
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <div class="whatsapp-stats-container" id="whatsapp-stats">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> جاري تحميل الإحصائيات...
                    </div>
                </div>
                
                <div class="whatsapp-actions" id="whatsapp-actions" style="display: none;">
                    <button onclick="whatsappQueueManagement.startServerAutomation()" 
                            class="btn btn-success btn-lg" 
                            id="server-automation-btn">
                        <i class="fas fa-robot"></i> إرسال تلقائي بالخادم (0)
                    </button>
                    <button onclick="whatsappQueueManagement.showAutomationInterface()" 
                            class="btn btn-info btn-lg" 
                            id="show-automation-interface-btn">
                        <i class="fas fa-desktop"></i> إرسال ذكي يدوي (0)
                    </button>
                    <button onclick="whatsappQueueManagement.sendAllPendingMessages()" 
                            class="btn btn-info btn-lg" 
                            id="send-all-manual-btn">
                        <i class="fas fa-external-link-alt"></i> فتح روابط منفصلة (0)
                    </button>
                    <button onclick="whatsappQueueManagement.refreshQueue()" 
                            class="btn btn-secondary">
                        <i class="fas fa-sync"></i> تحديث
                    </button>
                    <button onclick="whatsappQueueManagement.clearOldNotifications()" 
                            class="btn btn-warning">
                        <i class="fas fa-archive"></i> أرشفة المرسلة
                    </button>
                    <button onclick="whatsappQueueManagement.resetToPending()" 
                            class="btn btn-secondary">
                        <i class="fas fa-undo"></i> إعادة تعيين للانتظار
                    </button>
                </div>
                
                <div class="whatsapp-tabs">
                    <div class="tab-buttons">
                        <button class="whatsapp-tab-btn active" data-status="pending" onclick="whatsappQueueManagement.showTab('pending')">
                            <i class="fas fa-clock"></i> معلقة (<span id="pending-tab-count">0</span>)
                        </button>
                        <button class="whatsapp-tab-btn" data-status="sent" onclick="whatsappQueueManagement.showTab('sent')">
                            <i class="fas fa-check"></i> مرسلة (<span id="sent-tab-count">0</span>)
                        </button>
                        <button class="whatsapp-tab-btn" data-status="failed" onclick="whatsappQueueManagement.showTab('failed')">
                            <i class="fas fa-times"></i> فاشلة (<span id="failed-tab-count">0</span>)
                        </button>
                        <button class="whatsapp-tab-btn" data-status="all" onclick="whatsappQueueManagement.showTab('all')">
                            <i class="fas fa-list"></i> الكل
                        </button>
                    </div>
                </div>
                
                <!-- WhatsApp Automation Interface -->
                <div class="whatsapp-automation-interface" id="whatsapp-automation-interface" style="display: none;">
                    <div class="automation-header">
                        <h5><i class="fab fa-whatsapp"></i> مرسل الواتساب التلقائي</h5>
                        <div class="automation-controls">
                            <button onclick="whatsappQueueManagement.startSmartAutomation()" 
                                    class="btn btn-success btn-sm" id="start-smart-automation-btn">
                                <i class="fas fa-rocket"></i> بدء الإرسال الذكي
                            </button>
                            <button onclick="whatsappQueueManagement.stopSmartAutomation()" 
                                    class="btn btn-danger btn-sm" id="stop-smart-automation-btn" disabled>
                                <i class="fas fa-stop"></i> إيقاف
                            </button>
                            <button onclick="whatsappQueueManagement.hideAutomationInterface()" 
                                    class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> إغلاق
                            </button>
                        </div>
                    </div>
                    <div class="automation-status" id="automation-status">
                        <span class="status-text">جاهز للبدء</span>
                        <span class="progress-text" id="progress-text"></span>
                    </div>
                    
                    <!-- Message Preview -->
                    <div class="current-message-preview" id="current-message-preview">
                        <h6>الرسالة الحالية:</h6>
                        <div class="message-card">
                            <div class="message-header">
                                <strong id="current-user-name">-</strong>
                                <span id="current-phone-number">-</span>
                            </div>
                            <div class="message-content" id="current-message-content">
                                يرجى بدء الإرسال التلقائي لعرض الرسائل
                            </div>
                            <div class="message-actions">
                                <button onclick="whatsappQueueManagement.openCurrentMessage()" 
                                        class="btn btn-whatsapp btn-lg" id="open-message-btn" disabled>
                                    <i class="fab fa-whatsapp"></i> فتح في واتساب ويب
                                </button>
                                <button onclick="whatsappQueueManagement.markCurrentAsSent()" 
                                        class="btn btn-success" id="mark-sent-btn" disabled>
                                    <i class="fas fa-check"></i> تم الإرسال
                                </button>
                                <button onclick="whatsappQueueManagement.skipCurrentMessage()" 
                                        class="btn btn-warning" id="skip-message-btn" disabled>
                                    <i class="fas fa-forward"></i> تخطي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="whatsapp-queue-content" id="whatsapp-queue-content">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                    </div>
                </div>
            </div>
        `;

        this.currentTab = 'pending';
        await this.loadStats();
        await this.loadNotificationsByStatus('pending');
    }

    // Load WhatsApp notification statistics
    async loadStats() {
        try {
            const result = await apiCall('/admin/whatsapp-queue/stats');
            const stats = result.stats;
            
            document.getElementById('whatsapp-stats').innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card pending">
                        <div class="stat-number">${stats.pending || 0}</div>
                        <div class="stat-label">رسائل معلقة</div>
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-card sent">
                        <div class="stat-number">${stats.sent || 0}</div>
                        <div class="stat-label">رسائل مرسلة</div>
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="stat-card failed">
                        <div class="stat-number">${stats.failed || 0}</div>
                        <div class="stat-label">رسائل فاشلة</div>
                        <i class="fas fa-times"></i>
                    </div>
                </div>
            `;
            
            // Update tab counts
            const pendingCount = document.getElementById('pending-tab-count');
            const sentCount = document.getElementById('sent-tab-count');
            const failedCount = document.getElementById('failed-tab-count');
            
            if (pendingCount) pendingCount.textContent = stats.pending || '0';
            if (sentCount) sentCount.textContent = stats.sent || '0';
            if (failedCount) failedCount.textContent = stats.failed || '0';
            
            // Always show actions area (including mobile)
            const actionsElement = document.getElementById('whatsapp-actions');
            if (actionsElement) {
                actionsElement.style.display = 'block';
                actionsElement.style.visibility = 'visible';
                // Force mobile visibility
                if (window.innerWidth <= 768) {
                    actionsElement.style.display = 'block !important';
                }
            }
            
            // Update button text and enable/disable based on pending count
            const serverAutomationBtn = document.getElementById('server-automation-btn');
            const smartInterfaceBtn = document.getElementById('show-automation-interface-btn');
            const sendManualBtn = document.getElementById('send-all-manual-btn');
            
            if (stats.pending > 0) {
                serverAutomationBtn.innerHTML = `<i class="fas fa-robot"></i> إرسال تلقائي بالخادم (${stats.pending})`;
                smartInterfaceBtn.innerHTML = `<i class="fas fa-desktop"></i> إرسال ذكي يدوي (${stats.pending})`;
                sendManualBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> فتح روابط منفصلة (${stats.pending})`;
                serverAutomationBtn.disabled = false;
                smartInterfaceBtn.disabled = false;
                sendManualBtn.disabled = false;
            } else {
                serverAutomationBtn.innerHTML = `<i class="fas fa-robot"></i> لا توجد رسائل معلقة`;
                smartInterfaceBtn.innerHTML = `<i class="fas fa-desktop"></i> لا توجد رسائل معلقة`;
                sendManualBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> لا توجد رسائل معلقة`;
                serverAutomationBtn.disabled = true;
                smartInterfaceBtn.disabled = true;
                sendManualBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Error loading WhatsApp stats:', error);
            document.getElementById('whatsapp-stats').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i> خطأ في تحميل الإحصائيات
                </div>
            `;
        }
    }

    // Load notifications by status
    async loadNotificationsByStatus(status) {
        try {
            let result;
            
            if (status === 'all') {
                // Load all notifications (we'll need a new endpoint for this)
                result = await apiCall('/admin/whatsapp-queue/all');
            } else if (status === 'pending') {
                result = await apiCall('/admin/whatsapp-queue/pending');
            } else {
                // For sent and failed, we'll need new endpoints
                result = await apiCall(`/admin/whatsapp-queue/by-status/${status}`);
            }
            
            this.currentNotifications = result.notifications || [];
            this.currentStatus = status;
            
            if (status === 'pending') {
                this.pendingNotifications = this.currentNotifications;
            }
            
            this.displayNotifications();
            
        } catch (error) {
            console.error(`Error loading ${status} notifications:`, error);
            document.getElementById('whatsapp-queue-content').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i> خطأ في تحميل إشعارات ${this.getStatusLabel(status)}
                </div>
            `;
        }
    }

    // Switch between tabs
    async showTab(status) {
        // Update active tab
        document.querySelectorAll('.whatsapp-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-status="${status}"]`).classList.add('active');
        
        this.currentTab = status;
        await this.loadNotificationsByStatus(status);
    }

    // Get status label in Arabic
    getStatusLabel(status) {
        const labels = {
            'pending': 'المعلقة',
            'sent': 'المرسلة', 
            'failed': 'الفاشلة',
            'all': 'الكل'
        };
        return labels[status] || status;
    }

    // Display notifications based on current status
    displayNotifications() {
        const container = document.getElementById('whatsapp-queue-content');
        const notifications = this.currentNotifications || [];
        const status = this.currentStatus || 'pending';
        
        if (notifications.length === 0) {
            const emptyMessages = {
                'pending': 'لا توجد رسائل واتساب معلقة',
                'sent': 'لا توجد رسائل مرسلة',
                'failed': 'لا توجد رسائل فاشلة',
                'all': 'لا توجد رسائل واتساب'
            };
            
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-whatsapp" style="font-size: 4rem; color: #25D366;"></i>
                    <h4>${emptyMessages[status]}</h4>
                    <p>${status === 'pending' ? 'جميع الإشعارات تم إرسالها أو لا توجد إشعارات جديدة' : 'لا توجد إشعارات في هذه الفئة'}</p>
                </div>
            `;
            return;
        }

        const statusIcons = {
            'pending': 'fas fa-clock',
            'sent': 'fas fa-check-circle',
            'failed': 'fas fa-times-circle'
        };

        const statusColors = {
            'pending': '#ffc107',
            'sent': '#28a745', 
            'failed': '#dc3545'
        };

        const html = `
            <div class="whatsapp-notifications-list">
                <div class="list-header">
                    <h4><i class="fab fa-whatsapp"></i> ${this.getStatusLabel(status)} (${notifications.length})</h4>
                </div>
                <div class="notifications-grid">
                    ${notifications.map(notification => `
                        <div class="notification-card" data-notification-id="${notification.id}">
                            <div class="notification-header">
                                <div class="user-info">
                                    <strong>${notification.user_name}</strong>
                                    <small>معرف: ${notification.user_id}</small>
                                </div>
                                <div class="notification-type">
                                    <span class="type-badge ${notification.notification_type}">
                                        ${this.getNotificationTypeLabel(notification.notification_type)}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="notification-details">
                                <div class="phone-number">
                                    <i class="fas fa-phone"></i> ${notification.phone_number}
                                </div>
                                <div class="created-date">
                                    <i class="fas fa-clock"></i> ${new Date(notification.created_at).toLocaleDateString('en-US')}
                                </div>
                            </div>
                            
                            <div class="message-preview">
                                <div class="message-text">
                                    ${notification.message.substring(0, 100)}${notification.message.length > 100 ? '...' : ''}
                                </div>
                            </div>
                            
                            <div class="notification-actions">
                                <button onclick="whatsappQueueManagement.openWhatsAppMessage(${notification.id})" 
                                        class="btn btn-success btn-sm">
                                    <i class="fab fa-whatsapp"></i> فتح واتساب
                                </button>
                                <button onclick="whatsappQueueManagement.viewFullMessage(${notification.id})" 
                                        class="btn btn-info btn-sm">
                                    <i class="fas fa-eye"></i> عرض الرسالة
                                </button>
                                <button onclick="whatsappQueueManagement.markAsSent(${notification.id})" 
                                        class="btn btn-outline-success btn-sm">
                                    <i class="fas fa-check"></i> تم الإرسال
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Get notification type label in Arabic
    getNotificationTypeLabel(type) {
        const labels = {
            'transaction_approved': 'موافقة معاملة',
            'loan_payment_approved': 'موافقة دفعة قرض',
            'joining_fee_approved': 'اعتماد عضوية',
            'loan_approved': 'اعتماد قرض',
            'loan_rejected': 'رفض قرض',
            'payment_reminder': 'تذكير بالدفعة الشهرية'
        };
        return labels[type] || type;
    }

    // Send all pending WhatsApp messages - AUTOMATED VERSION
    async sendAllAutomated() {
        if (this.sendingInProgress) {
            showToast('عملية الإرسال قيد التنفيذ...', 'warning');
            return;
        }

        if (this.pendingNotifications.length === 0) {
            showToast('لا توجد رسائل للإرسال', 'info');
            return;
        }

        if (!confirm(`هل أنت متأكد من الإرسال التلقائي لـ ${this.pendingNotifications.length} رسالة واتساب؟\n\n⚠️ تأكد من تسجيل الدخول في واتساب ويب أولاً!`)) {
            return;
        }

        this.sendingInProgress = true;
        const sendButton = document.getElementById('send-all-automated-btn');
        const originalText = sendButton.innerHTML;
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-robot fa-spin"></i> جاري الإرسال التلقائي...';

        try {
            // Start automated WhatsApp sending
            await whatsappAutomation.startAutomatedSending(this.pendingNotifications);
            
            showToast(`بدء الإرسال التلقائي لـ ${this.pendingNotifications.length} رسالة...`, 'info');
            showToast('يرجى عدم إغلاق نافذة واتساب ويب حتى اكتمال الإرسال', 'warning');
            
        } catch (error) {
            console.error('Error in automated sending:', error);
            showToast('حدث خطأ في الإرسال التلقائي', 'error');
        } finally {
            this.sendingInProgress = false;
            sendButton.disabled = false;
            sendButton.innerHTML = originalText;
        }
    }

    // Send all pending WhatsApp messages - MANUAL VERSION  
    async sendAllPendingMessages() {
        if (this.sendingInProgress) {
            showToast('عملية الإرسال قيد التنفيذ...', 'warning');
            return;
        }

        if (this.pendingNotifications.length === 0) {
            showToast('لا توجد رسائل للإرسال', 'info');
            return;
        }

        if (!confirm(`هل أنت متأكد من إرسال ${this.pendingNotifications.length} رسالة واتساب؟`)) {
            return;
        }

        this.sendingInProgress = true;
        const sendButton = document.getElementById('send-all-btn');
        const originalText = sendButton.innerHTML;
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            let successful = 0;
            const delay = 2000; // 2 seconds between messages

            for (let i = 0; i < this.pendingNotifications.length; i++) {
                const notification = this.pendingNotifications[i];
                
                // Update button text with progress
                sendButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> إرسال ${i + 1}/${this.pendingNotifications.length}`;
                
                try {
                    // Open WhatsApp Web with message
                    window.open(notification.whatsapp_link, '_blank');
                    
                    // Wait for delay
                    if (i < this.pendingNotifications.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    successful++;
                } catch (error) {
                    console.error(`Failed to send notification ${notification.id}:`, error);
                }
            }

            showToast(`تم فتح ${successful} رسالة واتساب. يرجى مراجعة النوافذ المفتوحة وإرسال الرسائل.`, 'info');
            showToast('بعد إرسال الرسائل، يرجى الضغط على "تم الإرسال" لكل رسالة أو استخدام "تم إرسال الكل"', 'info');
            
            // Show batch completion actions
            this.showBatchCompletionActions();
            
        } catch (error) {
            console.error('Error in batch sending:', error);
            showToast('حدث خطأ أثناء إرسال الرسائل', 'error');
        } finally {
            this.sendingInProgress = false;
            sendButton.disabled = false;
            sendButton.innerHTML = originalText;
        }
    }

    // Show batch completion actions
    showBatchCompletionActions() {
        const actionsDiv = document.getElementById('whatsapp-actions');
        actionsDiv.innerHTML = `
            <div class="batch-completion-actions">
                <h5><i class="fas fa-info-circle"></i> تم فتح جميع رسائل الواتساب</h5>
                <p>بعد إرسال الرسائل من واتساب ويب، اختر أحد الخيارات التالية:</p>
                <button onclick="whatsappQueueManagement.markAllAsSent()" 
                        class="btn btn-success">
                    <i class="fas fa-check-double"></i> تم إرسال جميع الرسائل
                </button>
                <button onclick="whatsappQueueManagement.refreshQueue()" 
                        class="btn btn-info">
                    <i class="fas fa-sync"></i> تحديث القائمة
                </button>
                <button onclick="whatsappQueueManagement.show()" 
                        class="btn btn-secondary">
                    <i class="fas fa-undo"></i> إعادة تحميل
                </button>
            </div>
        `;
    }

    // Mark all pending notifications as sent
    async markAllAsSent() {
        if (!confirm('هل تم إرسال جميع الرسائل بنجاح؟')) {
            return;
        }

        try {
            const notificationIds = this.pendingNotifications.map(n => n.id);
            const result = await apiCall('/admin/whatsapp-queue/batch-sent', 'POST', { notificationIds });
            
            showToast(`تم تحديث ${result.success} رسالة بنجاح`, 'success');
            
            if (result.failed > 0) {
                showToast(`فشل في تحديث ${result.failed} رسالة`, 'warning');
            }
            
            // Refresh the view
            await this.show();
            
        } catch (error) {
            console.error('Error marking all as sent:', error);
            showToast('حدث خطأ في تحديث حالة الرسائل', 'error');
        }
    }

    // Open single WhatsApp message
    async openWhatsAppMessage(notificationId) {
        const notification = this.pendingNotifications.find(n => n.id === notificationId);
        if (!notification) {
            showToast('الإشعار غير موجود', 'error');
            return;
        }

        // Open WhatsApp Web
        window.open(notification.whatsapp_link, '_blank');
        showToast('تم فتح واتساب ويب. يرجى إرسال الرسالة ثم الضغط على "تم الإرسال"', 'info');
    }

    // Mark single notification as sent
    async markAsSent(notificationId) {
        if (!confirm('هل تم إرسال هذه الرسالة بنجاح؟')) {
            return;
        }

        try {
            await apiCall(`/admin/whatsapp-queue/notification/${notificationId}/sent`, 'POST');
            showToast('تم تحديث حالة الرسالة', 'success');
            
            // Remove from pending list and refresh display
            this.pendingNotifications = this.pendingNotifications.filter(n => n.id !== notificationId);
            this.displayNotifications();
            await this.loadStats();
            
        } catch (error) {
            console.error('Error marking as sent:', error);
            showToast('حدث خطأ في تحديث حالة الرسالة', 'error');
        }
    }

    // View full message
    async viewFullMessage(notificationId) {
        try {
            const result = await apiCall(`/admin/whatsapp-queue/notification/${notificationId}`);
            const notification = result.notification;
            
            const modalContent = `
                <div class="whatsapp-message-modal">
                    <h4><i class="fab fa-whatsapp"></i> رسالة واتساب - ${notification.user_name}</h4>
                    
                    <div class="message-details">
                        <div class="detail-row">
                            <strong>المستخدم:</strong> ${notification.user_name} (${notification.user_id})
                        </div>
                        <div class="detail-row">
                            <strong>رقم الهاتف:</strong> ${notification.phone_number}
                        </div>
                        <div class="detail-row">
                            <strong>نوع الإشعار:</strong> ${this.getNotificationTypeLabel(notification.notification_type)}
                        </div>
                        <div class="detail-row">
                            <strong>تاريخ الإنشاء:</strong> ${new Date(notification.created_at).toLocaleString('ar-KW')}
                        </div>
                    </div>
                    
                    <div class="message-content">
                        <h5>محتوى الرسالة:</h5>
                        <div class="message-text" style="background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: 'Cairo', sans-serif;">
                            ${notification.message}
                        </div>
                    </div>
                    
                    <div class="message-actions" style="margin-top: 20px;">
                        <button onclick="window.open('${notification.whatsapp_link}', '_blank')" class="btn btn-success">
                            <i class="fab fa-whatsapp"></i> فتح في واتساب
                        </button>
                        <button onclick="whatsappQueueManagement.markAsSent(${notification.id}); hideModal();" class="btn btn-outline-success">
                            <i class="fas fa-check"></i> تم الإرسال
                        </button>
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            showModal('رسالة واتساب', modalContent);
            
        } catch (error) {
            console.error('Error loading message details:', error);
            showToast('حدث خطأ في تحميل تفاصيل الرسالة', 'error');
        }
    }

    // Clear old notifications
    async clearOldNotifications() {
        if (!confirm('هل أنت متأكد من أرشفة جميع الرسائل المرسلة؟ (لن تظهر في الإحصائيات ولكن ستبقى في قاعدة البيانات)')) {
            return;
        }

        try {
            const result = await apiCall('/admin/whatsapp-queue/clear-old', 'DELETE');
            showToast(`تم أرشفة ${result.cleared} رسالة مرسلة`, 'success');
            await this.loadStats();
            
        } catch (error) {
            console.error('Error clearing old notifications:', error);
            showToast('حدث خطأ في أرشفة الرسائل المرسلة', 'error');
        }
    }

    // Refresh queue
    async refreshQueue() {
        await this.show();
        showToast('تم تحديث قائمة الواتساب', 'success');
    }

    // Reset sent/failed notifications back to pending
    async resetToPending() {
        if (!confirm('هل أنت متأكد من إعادة تعيين جميع الرسائل المرسلة والفاشلة إلى حالة الانتظار؟')) {
            return;
        }

        try {
            const result = await apiCall('/admin/whatsapp-queue/reset-to-pending', 'POST');
            showToast(result.message, 'success');
            await this.show(); // Refresh the entire view
        } catch (error) {
            console.error('Error resetting notifications:', error);
            showToast('خطأ في إعادة تعيين الإشعارات', 'error');
        }
    }

    // Show automation interface
    showAutomationInterface() {
        // Hide queue content and show automation interface
        document.getElementById('whatsapp-queue-content').style.display = 'none';
        document.getElementById('whatsapp-automation-interface').style.display = 'block';
        
        showToast('تم فتح مرسل الواتساب الذكي. اضغط "بدء الإرسال الذكي" للبدء', 'info');
    }

    // Hide automation interface
    hideAutomationInterface() {
        this.stopSmartAutomation();
        document.getElementById('whatsapp-automation-interface').style.display = 'none';
        document.getElementById('whatsapp-queue-content').style.display = 'block';
    }

    // Start smart automation
    async startSmartAutomation() {
        if (this.pendingNotifications.length === 0) {
            showToast('لا توجد رسائل معلقة للإرسال', 'warning');
            return;
        }

        const startBtn = document.getElementById('start-smart-automation-btn');
        const stopBtn = document.getElementById('stop-smart-automation-btn');
        const statusDiv = document.getElementById('automation-status');

        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        this.smartAutomationActive = true;
        this.currentMessageIndex = 0;

        statusDiv.innerHTML = `
            <span class="status-text">جاري الإرسال الذكي...</span>
            <span class="progress-text" id="progress-text">رسالة 1 من ${this.pendingNotifications.length}</span>
        `;

        // Enable action buttons
        document.getElementById('open-message-btn').disabled = false;
        document.getElementById('mark-sent-btn').disabled = false;
        document.getElementById('skip-message-btn').disabled = false;

        showToast('بدء الإرسال الذكي! اضغط "فتح في واتساب ويب" لكل رسالة', 'success');
        
        // Show first message
        this.showCurrentMessage();
    }

    // Stop smart automation
    stopSmartAutomation() {
        this.smartAutomationActive = false;
        
        const startBtn = document.getElementById('start-smart-automation-btn');
        const stopBtn = document.getElementById('stop-smart-automation-btn');
        const statusDiv = document.getElementById('automation-status');

        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // Disable action buttons
        document.getElementById('open-message-btn').disabled = true;
        document.getElementById('mark-sent-btn').disabled = true;
        document.getElementById('skip-message-btn').disabled = true;
        
        statusDiv.innerHTML = `<span class="status-text">تم إيقاف الإرسال الذكي</span>`;
        showToast('تم إيقاف الإرسال الذكي', 'info');
    }

    // Show current message for review
    showCurrentMessage() {
        if (this.currentMessageIndex >= this.pendingNotifications.length) {
            this.completeSmartAutomation();
            return;
        }

        const notification = this.pendingNotifications[this.currentMessageIndex];
        
        // Update UI elements
        document.getElementById('current-user-name').textContent = notification.user_name;
        document.getElementById('current-phone-number').textContent = notification.phone_number;
        document.getElementById('current-message-content').textContent = notification.message;
        
        // Update progress
        document.getElementById('progress-text').textContent = 
            `رسالة ${this.currentMessageIndex + 1} من ${this.pendingNotifications.length}`;
    }

    // Open current message in WhatsApp Web
    openCurrentMessage() {
        if (this.currentMessageIndex >= this.pendingNotifications.length) return;
        
        const notification = this.pendingNotifications[this.currentMessageIndex];
        
        // Clean phone number
        let phoneNumber = notification.phone_number.replace(/[^\d+]/g, '');
        if (!phoneNumber.startsWith('+')) {
            if (phoneNumber.startsWith('965')) {
                phoneNumber = '+' + phoneNumber;
            } else {
                phoneNumber = '+965' + phoneNumber;
            }
        }

        // Open WhatsApp Web with pre-filled message
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(notification.message)}`;
        window.open(whatsappUrl, '_blank');
        
        showToast(`تم فتح رسالة ${notification.user_name} في واتساب ويب`, 'info');
    }

    // Mark current message as sent and move to next
    async markCurrentAsSent() {
        if (this.currentMessageIndex >= this.pendingNotifications.length) return;
        
        const notification = this.pendingNotifications[this.currentMessageIndex];
        
        try {
            await apiCall(`/admin/whatsapp-queue/notification/${notification.id}/sent`, 'POST');
            showToast(`تم تسجيل إرسال رسالة ${notification.user_name}`, 'success');
            
            this.currentMessageIndex++;
            this.showCurrentMessage();
            
        } catch (error) {
            console.error('Error marking message as sent:', error);
            showToast('خطأ في تسجيل الإرسال', 'error');
        }
    }

    // Skip current message
    skipCurrentMessage() {
        if (this.currentMessageIndex >= this.pendingNotifications.length) return;
        
        const notification = this.pendingNotifications[this.currentMessageIndex];
        showToast(`تم تخطي رسالة ${notification.user_name}`, 'info');
        
        this.currentMessageIndex++;
        this.showCurrentMessage();
    }

    // Complete smart automation
    completeSmartAutomation() {
        const statusDiv = document.getElementById('automation-status');
        const startBtn = document.getElementById('start-smart-automation-btn');
        const stopBtn = document.getElementById('stop-smart-automation-btn');

        this.smartAutomationActive = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // Disable action buttons
        document.getElementById('open-message-btn').disabled = true;
        document.getElementById('mark-sent-btn').disabled = true;
        document.getElementById('skip-message-btn').disabled = true;
        
        statusDiv.innerHTML = `<span class="status-text">تم إكمال الإرسال الذكي بنجاح!</span>`;
        
        showToast(`تم إكمال معالجة ${this.pendingNotifications.length} رسالة واتساب!`, 'success');
        
        // Refresh queue after completion
        setTimeout(() => {
            this.show();
        }, 3000);
    }

    // Start server-side automation
    async startServerAutomation() {
        try {
            showToast('جاري التحقق من حالة المتصفح...', 'info');
            
            // Check if browser is initialized and authenticated
            const authStatus = await apiCall('/admin/whatsapp-automation/auth-status');
            
            if (!authStatus.authenticated) {
                if (authStatus.needsQR) {
                    showToast('يرجى مسح رمز QR في المتصفح المفتوح', 'warning');
                    return;
                } else {
                    // Initialize browser first
                    showToast('جاري تشغيل المتصفح...', 'info');
                    const initResult = await apiCall('/admin/whatsapp-automation/init', 'POST');
                    
                    if (!initResult.success) {
                        showToast('فشل في تشغيل المتصفح: ' + initResult.message, 'error');
                        return;
                    }
                    
                    // Wait a moment for browser to fully initialize, then check auth again
                    showToast('تم تشغيل المتصفح! جاري التحقق من الجلسة...', 'info');
                    
                    // Wait 5 seconds for browser to stabilize
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // Check authentication again
                    const newAuthStatus = await apiCall('/admin/whatsapp-automation/auth-status');
                    if (!newAuthStatus.authenticated) {
                        showToast('تم تشغيل المتصفح! يرجى مسح رمز QR في النافذة المفتوحة ثم المحاولة مرة أخرى', 'success');
                        return;
                    }
                    
                    // If authenticated, proceed to automation
                    showToast('تم اكتشاف الجلسة! بدء الإرسال التلقائي...', 'success');
                }
            }

            // Start automation
            showToast('بدء الإرسال التلقائي بالخادم...', 'success');
            
            const result = await apiCall('/admin/whatsapp-automation/start', 'POST');
            
            if (result.success) {
                showToast(`تم بدء الإرسال التلقائي! جاري معالجة ${this.pendingNotifications.length} رسالة...`, 'success');
                
                // Start monitoring progress
                this.monitorServerAutomation();
            } else {
                showToast('فشل في بدء الإرسال التلقائي: ' + result.message, 'error');
            }
            
        } catch (error) {
            console.error('Error starting server automation:', error);
            showToast('خطأ في بدء الإرسال التلقائي', 'error');
        }
    }

    // Monitor server automation progress
    async monitorServerAutomation() {
        try {
            const status = await apiCall('/admin/whatsapp-automation/status');
            
            if (status.isRunning && status.session) {
                const session = status.session;
                showToast(`الإرسال التلقائي: ${session.processed}/${session.total} - نجح: ${session.successful}, فشل: ${session.failed}`, 'info');
                
                // Continue monitoring
                setTimeout(() => this.monitorServerAutomation(), 5000);
            } else {
                // Automation completed
                showToast('تم إكمال الإرسال التلقائي بالخادم!', 'success');
                await this.show(); // Refresh view
            }
        } catch (error) {
            console.error('Error monitoring automation:', error);
        }
    }

    // Stop server automation
    async stopServerAutomation() {
        try {
            const result = await apiCall('/admin/whatsapp-automation/stop', 'POST');
            showToast('تم إيقاف الإرسال التلقائي', 'info');
        } catch (error) {
            console.error('Error stopping automation:', error);
            showToast('خطأ في إيقاف الإرسال التلقائي', 'error');
        }
    }

    // Start bulk automation with JavaScript console script
    async startBulkAutomation() {
        try {
            showToast('جاري إنشاء سكريبت الإرسال التلقائي...', 'info');
            
            const result = await apiCall('/admin/whatsapp-bulk/automation-script');
            
            if (result.success && result.script) {
                // Show automation script modal
                this.showAutomationScriptModal(result.script, result.messageCount);
            } else {
                showToast('فشل في إنشاء سكريبت الإرسال التلقائي', 'error');
            }
            
        } catch (error) {
            console.error('Error starting bulk automation:', error);
            showToast('خطأ في بدء الإرسال المجمع', 'error');
        }
    }

    // Show automation script modal
    showAutomationScriptModal(script, messageCount) {
        const modal = `
            <div class="modal fade" id="automationScriptModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-magic"></i> سكريبت الإرسال التلقائي
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="direction: rtl; text-align: right;">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i>
                                <strong>طريقة الاستخدام:</strong>
                                <ol>
                                    <li>افتح <a href="https://web.whatsapp.com" target="_blank">واتساب ويب</a> في تبويب جديد</li>
                                    <li>اضغط F12 لفتح Developer Tools</li>
                                    <li>اذهب إلى تبويب "Console"</li>
                                    <li>انسخ والصق السكريبت أدناه واضغط Enter</li>
                                    <li>سيتم إرسال ${messageCount} رسالة تلقائياً!</li>
                                </ol>
                            </div>
                            
                            <div class="script-container">
                                <label class="form-label fw-bold">السكريبت للنسخ:</label>
                                <textarea id="automation-script-text" class="form-control" rows="15" readonly 
                                         style="font-family: monospace; font-size: 12px; direction: ltr;">${script}</textarea>
                                <button onclick="whatsappQueueManagement.copyScriptToClipboard()" 
                                        class="btn btn-primary mt-2">
                                    <i class="fas fa-copy"></i> نسخ السكريپت
                                </button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="window.open('https://web.whatsapp.com', '_blank')">
                                <i class="fab fa-whatsapp"></i> فتح واتساب ويب
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM and show
        const existingModal = document.getElementById('automationScriptModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modal);
        
        // Show modal using Bootstrap
        const modalElement = new bootstrap.Modal(document.getElementById('automationScriptModal'));
        modalElement.show();
    }

    // Copy script to clipboard
    copyScriptToClipboard() {
        const scriptText = document.getElementById('automation-script-text');
        scriptText.select();
        document.execCommand('copy');
        showToast('تم نسخ السكريپت! الصقه في واتساب ويب Console', 'success');
    }
}

// Global instance
window.whatsappQueueManagement = null;