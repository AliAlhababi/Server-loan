// Payment Reminders Management Tab
class PaymentRemindersManagement {
    constructor() {
        this.usersNeedingReminders = [];
        this.statistics = {};
        this.selectedUsers = new Set();
    }

    async init() {
        // Hide other content areas
        document.getElementById('admin-content-area').style.display = 'none';

        // Show payment reminders content
        const container = document.getElementById('payment-reminders-content');
        container.style.display = 'block';

        await this.loadData();
        this.render();
        this.attachEventListeners();
    }

    async loadData() {
        try {
            // Load users needing reminders
            const usersResponse = await fetch('/api/payment-reminders/users-needing-reminders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const usersData = await usersResponse.json();
            this.usersNeedingReminders = usersData.users || [];

            // Load statistics
            const statsResponse = await fetch('/api/payment-reminders/statistics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const statsData = await statsResponse.json();
            this.statistics = statsData.stats || {};
        } catch (error) {
            console.error('Error loading payment reminders data:', error);
            showNotification('فشل في تحميل بيانات التذكيرات', 'error');
        }
    }

    render() {
        const container = document.getElementById('payment-reminders-content');
        if (!container) return;

        container.innerHTML = `
            <div class="payment-reminders-management">
                <!-- Header with Statistics -->
                <div class="reminders-header">
                    <h2>تذكيرات الدفع</h2>
                    <div class="reminders-stats">
                        <div class="stat-card">
                            <div class="stat-number">${this.usersNeedingReminders.length}</div>
                            <div class="stat-label">مستخدمين يحتاجون تذكير</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.statistics.total_reminder_count || 0}</div>
                            <div class="stat-label">إجمالي التذكيرات المرسلة</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.statistics.reminders_last_7_days || 0}</div>
                            <div class="stat-label">تذكيرات آخر 7 أيام</div>
                        </div>
                    </div>
                </div>

                <!-- Actions Bar -->
                <div class="reminders-actions">
                    <button class="btn btn-primary" id="select-all-btn">
                        <i class="fas fa-check-square"></i> تحديد الكل
                    </button>
                    <button class="btn btn-secondary" id="deselect-all-btn">
                        <i class="fas fa-square"></i> إلغاء تحديد الكل
                    </button>
                    <button class="btn btn-success" id="send-selected-btn" disabled>
                        <i class="fas fa-paper-plane"></i> إرسال للمحددين (<span id="selected-count">0</span>)
                    </button>
                    <button class="btn btn-info" id="send-all-btn">
                        <i class="fas fa-bell"></i> إرسال للجميع
                    </button>
                    <button class="btn btn-secondary" id="refresh-btn">
                        <i class="fas fa-sync-alt"></i> تحديث
                    </button>
                </div>

                <!-- Users List -->
                <div class="reminders-list">
                    ${this.renderUsersList()}
                </div>
            </div>

            <style>
                .payment-reminders-management {
                    padding: 20px;
                }

                .reminders-header h2 {
                    margin-bottom: 20px;
                    color: #333;
                }

                .reminders-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 30px;
                }

                .stat-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }

                .stat-number {
                    font-size: 32px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .stat-label {
                    font-size: 14px;
                    opacity: 0.9;
                }

                .reminders-actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .reminders-actions .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s;
                }

                .reminders-actions .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .reminders-actions .btn-primary {
                    background-color: #667eea;
                    color: white;
                }

                .reminders-actions .btn-secondary {
                    background-color: #6c757d;
                    color: white;
                }

                .reminders-actions .btn-success {
                    background-color: #10b981;
                    color: white;
                }

                .reminders-actions .btn-info {
                    background-color: #0dcaf0;
                    color: white;
                }

                .reminders-list {
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .reminder-item {
                    display: grid;
                    grid-template-columns: 40px 1fr auto;
                    gap: 15px;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                    align-items: center;
                    transition: background-color 0.2s;
                }

                .reminder-item:hover {
                    background-color: #f8f9fa;
                }

                .reminder-item:last-child {
                    border-bottom: none;
                }

                .reminder-checkbox {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }

                .reminder-details {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 20px;
                }

                .user-info h4 {
                    margin: 0 0 5px 0;
                    color: #333;
                    font-size: 16px;
                }

                .user-info p {
                    margin: 3px 0;
                    color: #666;
                    font-size: 14px;
                }

                .loan-info {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 10px;
                }

                .info-item {
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 5px;
                }

                .info-label {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 3px;
                }

                .info-value {
                    font-size: 14px;
                    font-weight: bold;
                    color: #333;
                }

                .info-value.overdue {
                    color: #dc3545;
                }

                .reminder-actions {
                    display: flex;
                    gap: 10px;
                }

                .reminder-actions .btn {
                    padding: 8px 16px;
                    font-size: 13px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .reminder-actions .btn-send {
                    background-color: #10b981;
                    color: white;
                }

                .reminder-actions .btn-send:hover {
                    background-color: #059669;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                }

                .empty-state i {
                    font-size: 64px;
                    color: #ddd;
                    margin-bottom: 20px;
                }

                .empty-state h3 {
                    margin-bottom: 10px;
                    color: #333;
                }
            </style>
        `;
    }

    renderUsersList() {
        if (this.usersNeedingReminders.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>رائع! لا يوجد مستخدمين يحتاجون تذكير</h3>
                    <p>جميع المستخدمين قاموا بدفع أقساطهم هذا الشهر</p>
                </div>
            `;
        }

        return this.usersNeedingReminders.map(user => {
            const lastPaymentDate = user.last_payment_date ?
                new Date(user.last_payment_date).toLocaleDateString('en-US') :
                'لا توجد دفعات بعد';

            const daysOverdue = user.last_payment_date ?
                Math.floor((new Date() - new Date(user.last_payment_date)) / (1000 * 60 * 60 * 24)) :
                'N/A';

            return `
                <div class="reminder-item" data-user-id="${user.user_id}" data-loan-id="${user.loan_id}">
                    <input type="checkbox" class="reminder-checkbox"
                           data-user-id="${user.user_id}" data-loan-id="${user.loan_id}">

                    <div class="reminder-details">
                        <div class="user-info">
                            <h4>${user.user_name}</h4>
                            <p><i class="fas fa-envelope"></i> ${user.email || 'لا يوجد بريد'}</p>
                            <p><i class="fas fa-phone"></i> ${user.whatsapp || user.phone || 'لا يوجد رقم'}</p>
                        </div>

                        <div class="loan-info">
                            <div class="info-item">
                                <div class="info-label">مبلغ القرض</div>
                                <div class="info-value">${parseFloat(user.loan_amount).toFixed(3)} د.ك</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">القسط الشهري</div>
                                <div class="info-value">${parseFloat(user.installment_amount).toFixed(3)} د.ك</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">المتبقي</div>
                                <div class="info-value overdue">${parseFloat(user.remaining_amount).toFixed(3)} د.ك</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">آخر دفعة</div>
                                <div class="info-value">${lastPaymentDate}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">أيام التأخير</div>
                                <div class="info-value overdue">${daysOverdue} يوم</div>
                            </div>
                        </div>
                    </div>

                    <div class="reminder-actions">
                        <button class="btn btn-send" onclick="paymentRemindersTab.sendSingleReminder(${user.user_id}, ${user.loan_id})">
                            <i class="fas fa-paper-plane"></i> إرسال تذكير
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    attachEventListeners() {
        // Select All
        document.getElementById('select-all-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.reminder-checkbox').forEach(cb => {
                cb.checked = true;
                this.selectedUsers.add(cb.dataset.userId + '-' + cb.dataset.loanId);
            });
            this.updateSelectedCount();
        });

        // Deselect All
        document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.reminder-checkbox').forEach(cb => {
                cb.checked = false;
            });
            this.selectedUsers.clear();
            this.updateSelectedCount();
        });

        // Individual checkboxes
        document.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const key = e.target.dataset.userId + '-' + e.target.dataset.loanId;
                if (e.target.checked) {
                    this.selectedUsers.add(key);
                } else {
                    this.selectedUsers.delete(key);
                }
                this.updateSelectedCount();
            });
        });

        // Send Selected
        document.getElementById('send-selected-btn')?.addEventListener('click', () => {
            this.sendSelectedReminders();
        });

        // Send All
        document.getElementById('send-all-btn')?.addEventListener('click', () => {
            this.sendAllReminders();
        });

        // Refresh
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.init();
        });
    }

    updateSelectedCount() {
        const count = this.selectedUsers.size;
        document.getElementById('selected-count').textContent = count;
        document.getElementById('send-selected-btn').disabled = count === 0;
    }

    async sendSingleReminder(userId, loanId) {
        if (!confirm('هل أنت متأكد من إرسال التذكير لهذا المستخدم؟')) {
            return;
        }

        try {
            const response = await fetch(`/api/payment-reminders/send/${userId}/${loanId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showNotification('تم إرسال التذكير بنجاح', 'success');
                await this.init(); // Reload data
            } else {
                showNotification(data.error || 'فشل في إرسال التذكير', 'error');
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
            showNotification('حدث خطأ أثناء إرسال التذكير', 'error');
        }
    }

    async sendSelectedReminders() {
        if (this.selectedUsers.size === 0) {
            showNotification('يرجى تحديد مستخدم واحد على الأقل', 'warning');
            return;
        }

        if (!confirm(`هل أنت متأكد من إرسال التذكيرات لـ ${this.selectedUsers.size} مستخدم؟`)) {
            return;
        }

        const sendBtn = document.getElementById('send-selected-btn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        let successCount = 0;
        let failCount = 0;

        for (const key of this.selectedUsers) {
            const [userId, loanId] = key.split('-');
            try {
                const response = await fetch(`/api/payment-reminders/send/${userId}/${loanId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }

            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        showNotification(`تم إرسال ${successCount} تذكير بنجاح. فشل: ${failCount}`, successCount > 0 ? 'success' : 'error');

        this.selectedUsers.clear();
        await this.init();
    }

    async sendAllReminders() {
        if (this.usersNeedingReminders.length === 0) {
            showNotification('لا يوجد مستخدمين يحتاجون تذكير', 'info');
            return;
        }

        if (!confirm(`هل أنت متأكد من إرسال التذكيرات لجميع المستخدمين (${this.usersNeedingReminders.length} مستخدم)؟`)) {
            return;
        }

        const sendBtn = document.getElementById('send-all-btn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const response = await fetch('/api/payment-reminders/send-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showNotification(`تم إرسال ${data.remindersSent} تذكير من أصل ${data.totalUsers} مستخدم`, 'success');
                await this.init();
            } else {
                showNotification(data.error || 'فشل في إرسال التذكيرات', 'error');
            }
        } catch (error) {
            console.error('Error sending all reminders:', error);
            showNotification('حدث خطأ أثناء إرسال التذكيرات', 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-bell"></i> إرسال للجميع';
        }
    }
}

// Initialize when tab is selected
window.paymentRemindersTab = new PaymentRemindersManagement();
