// Registration Management Module
// Handles pending user registration approvals

class RegistrationManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.currentView = 'pending';
        this.currentData = [];
    }

    // Show registration management interface
    show() {
        console.log('🔄 Showing registration management...');
        
        const content = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #007bff;">
                        <i class="fas fa-user-plus"></i> إدارة طلبات التسجيل
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>

                <div class="registration-management-container">
                    <div class="content-description" style="margin-bottom: 20px;">
                        <p>موافقة على طلبات العضوية - المربعات الحمراء تشير للأعضاء الذين لم يدفعوا رسوم العضوية (10 د.ك)</p>
                        <small style="color: #666; display: block; margin-top: 5px;">
                            يمكن للإدارة تسجيل دفع الرسوم من خلال تفاصيل العضو
                        </small>
                    </div>

                    <!-- Registration Tabs -->
                    <div class="admin-tabs">
                        <button class="admin-tab active" onclick="registrationManagement.switchView('pending')" data-view="pending">
                            <i class="fas fa-clock"></i>
                            طلبات معلقة
                            <span class="badge" id="pendingRegistrationsBadge">0</span>
                        </button>
                        <button class="admin-tab" onclick="registrationManagement.switchView('approved')" data-view="approved">
                            <i class="fas fa-check-circle"></i>
                            طلبات معتمدة
                        </button>
                        <button class="admin-tab" onclick="registrationManagement.switchView('rejected')" data-view="rejected">
                            <i class="fas fa-times-circle"></i>
                            طلبات مرفوضة
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div class="tab-content">
                        <div id="registrationContent" class="registration-content">
                            <div class="loading-placeholder">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>جاري تحميل طلبات التسجيل...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.adminDashboard.contentArea.innerHTML = content;
        this.loadRegistrations();
    }

    // Switch between different views
    switchView(view) {
        this.currentView = view;
        
        // Update tab buttons
        document.querySelectorAll('.admin-tabs .admin-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.loadRegistrations();
    }

    // Load registration requests
    async loadRegistrations() {
        try {
            console.log(`Loading ${this.currentView} registrations...`);
            
            const endpoint = this.currentView === 'pending' ?
                '/admin/pending-registrations' :
                `/admin/registrations?status=${this.currentView}`;
            
            const result = await apiCall(endpoint);
            
            if (result.success) {
                this.currentData = result.data || [];
                this.renderRegistrations();
                
                // Update badge count for pending
                if (this.currentView === 'pending') {
                    const badge = document.getElementById('pendingRegistrationsBadge');
                    if (badge) {
                        badge.textContent = this.currentData.length;
                    }
                }
            } else {
                console.error('Failed to load registrations:', result.message);
                showToast('فشل في تحميل طلبات التسجيل', 'error');
                this.showError('فشل في تحميل البيانات');
            }
        } catch (error) {
            console.error('Error loading registrations:', error);
            showToast('خطأ في الاتصال بالخادم', 'error');
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    // Render registration cards
    renderRegistrations() {
        const container = document.getElementById('registrationContent');

        if (!container) {
            console.error('Registration content container not found');
            return;
        }

        if (!this.currentData.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>لا توجد طلبات ${this.getViewLabel()}</h3>
                    <p>لا توجد طلبات تسجيل ${this.getViewLabel()} حالياً</p>
                </div>
            `;
            return;
        }

        const cardsHTML = this.currentData.map(registration => this.createRegistrationCard(registration)).join('');

        container.innerHTML = `
            <div class="registrations-grid">
                ${cardsHTML}
            </div>
        `;
    }

    // Create registration card HTML
    createRegistrationCard(registration) {
        const statusClass = this.getStatusClass(registration.joining_fee_approved);
        const statusText = this.getStatusText(registration.joining_fee_approved);
        const statusIcon = this.getStatusIcon(registration.joining_fee_approved);

        // Add red background for users who haven't paid 10 KWD fee
        const feeUnpaidClass = registration.joining_fee_paid === 'pending' ? 'fee-unpaid' : '';
        const actionButtons = this.createActionButtons(registration);

        return `
            <div class="registration-card ${statusClass} ${feeUnpaidClass}">
                <div class="card-header">
                    <div class="user-info">
                        <h4><i class="fas fa-user"></i> ${registration.Aname}</h4>
                        <p class="user-id">رقم المستخدم: ${registration.user_id}</p>
                        ${registration.joining_fee_paid === 'pending' ?
                            '<p class="fee-status" style="color: #dc3545; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> لم يدفع رسوم العضوية (10 د.ك)</p>' :
                            '<p class="fee-status" style="color: #28a745; font-weight: bold;"><i class="fas fa-check-circle"></i> تم دفع رسوم العضوية</p>'
                        }
                    </div>
                    <div class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="contact-info">
                        <div class="info-item">
                            <i class="fas fa-envelope"></i>
                            <span>${registration.email}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <span>${registration.phone}</span>
                        </div>
                        ${registration.whatsapp ? `
                        <div class="info-item">
                            <i class="fab fa-whatsapp"></i>
                            <span>${registration.whatsapp}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="registration-details">
                        <div class="detail-item">
                            <span class="label">تاريخ التسجيل:</span>
                            <span class="value">${FormatHelper.formatDate(registration.registration_date)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">الرصيد الحالي:</span>
                            <span class="value">${FormatHelper.formatCurrency(registration.balance)}</span>
                        </div>
                    </div>
                </div>
                
                ${actionButtons ? `<div class="card-actions">${actionButtons}</div>` : ''}
            </div>
        `;
    }

    // Create action buttons based on status
    createActionButtons(registration) {
        let buttons = '';

        if (registration.joining_fee_approved === 'pending') {
            // Website access approval requests
            buttons += `
                <button class="action-btn approve" onclick="registrationManagement.handleRegistrationAction(${registration.user_id}, 'approved')">
                    <i class="fas fa-check"></i> موافقة دخول الموقع
                </button>
                <button class="action-btn reject" onclick="registrationManagement.handleRegistrationAction(${registration.user_id}, 'rejected')">
                    <i class="fas fa-times"></i> رفض
                </button>
            `;
        }

        // Add fee payment button for approved users who haven't paid
        if (registration.joining_fee_approved === 'approved' && registration.joining_fee_paid === 'pending') {
            buttons += `
                <button class="action-btn fee-paid" style="background-color: #17a2b8; color: white;" onclick="registrationManagement.markFeePaid(${registration.user_id})">
                    <i class="fas fa-money-bill"></i> تسجيل دفع رسوم العضوية
                </button>
            `;
        }

        // Always add view details button
        buttons += `
            <button class="action-btn view-details" onclick="registrationManagement.viewUserDetails(${registration.user_id})">
                <i class="fas fa-eye"></i> التفاصيل
            </button>
        `;

        return buttons;
    }

    // Handle website access approval/rejection (joining_fee_approved)
    async handleRegistrationAction(userId, action) {
        const actionText = action === 'approved' ? 'موافقة على دخول الموقع' : 'رفض طلب التسجيل';
        const confirmed = confirm(`هل أنت متأكد من ${actionText}؟`);

        if (!confirmed) return;

        try {
            showLoading(true);

            // Convert action to match backend expectations
            const backendAction = action === 'approved' ? 'approve' : 'reject';

            const result = await apiCall(`/admin/joining-fee-action/${userId}`, 'PUT', {
                action: backendAction,
                adminId: currentUser.user_id
            });

            if (result.success) {
                showToast(result.message, 'success');
                this.loadRegistrations(); // Refresh list

                // Update dashboard stats
                if (this.adminDashboard) {
                    this.adminDashboard.loadStats();
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error handling registration action:', error);
            showToast('خطأ في معالجة طلب التسجيل', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Handle marking 10 KWD fee as paid
    async markFeePaid(userId) {
        const confirmed = confirm('هل أنت متأكد من تسجيل دفع رسوم العضوية (10 د.ك) لهذا العضو؟');

        if (!confirmed) return;

        try {
            showLoading(true);

            const result = await apiCall(`/admin/mark-joining-fee-paid/${userId}`, 'PUT');

            if (result.success) {
                showToast(result.message, 'success');
                this.loadRegistrations(); // Refresh list

                // Update dashboard stats
                if (this.adminDashboard) {
                    this.adminDashboard.loadStats();
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error marking fee as paid:', error);
            showToast('خطأ في تسجيل دفع الرسوم', 'error');
        } finally {
            showLoading(false);
        }
    }

    // View user details
    async viewUserDetails(userId) {
        try {
            showLoading(true);
            
            const result = await apiCall(`/admin/user-details/${userId}`);
            
            if (result.success && result.data) {
                this.showUserDetailsModal(result.data);
            } else {
                showToast('فشل في تحميل تفاصيل المستخدم', 'error');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            showToast('خطأ في تحميل تفاصيل المستخدم', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Show user details modal
    showUserDetailsModal(userData) {
        const modalContent = `
            <div class="user-details-modal">
                <div class="user-header">
                    <h3><i class="fas fa-user-circle"></i> ${userData.user.Aname}</h3>
                    <div class="user-status ${userData.user.joining_fee_approved}">
                        ${this.getStatusText(userData.user.joining_fee_approved)}
                    </div>
                </div>
                
                <div class="user-info-grid">
                    <div class="info-section">
                        <h4>المعلومات الأساسية</h4>
                        <div class="info-list">
                            <div class="info-item">
                                <label>رقم المستخدم:</label>
                                <span>${userData.user.user_id}</span>
                            </div>
                            <div class="info-item">
                                <label>البريد الإلكتروني:</label>
                                <span>${userData.user.email}</span>
                            </div>
                            <div class="info-item">
                                <label>رقم الهاتف:</label>
                                <span>${userData.user.phone}</span>
                            </div>
                            <div class="info-item">
                                <label>تاريخ التسجيل:</label>
                                <span>${FormatHelper.formatDate(userData.user.registration_date)}</span>
                            </div>
                            <div class="info-item">
                                <label>الرصيد الحالي:</label>
                                <span>${FormatHelper.formatCurrency(userData.user.balance)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    ${userData.user.joining_fee_approved === 'pending' ? `
                        <button class="btn btn-success" onclick="registrationManagement.handleRegistrationAction(${userData.user.user_id}, 'approved'); hideModal();">
                            <i class="fas fa-check"></i> موافقة على الطلب
                        </button>
                        <button class="btn btn-danger" onclick="registrationManagement.handleRegistrationAction(${userData.user.user_id}, 'rejected'); hideModal();">
                            <i class="fas fa-times"></i> رفض الطلب
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="hideModal()">إغلاق</button>
                </div>
            </div>
        `;
        
        showModal('تفاصيل طلب التسجيل', modalContent);
    }

    // Utility methods
    getViewLabel() {
        const labels = {
            pending: 'معلقة',
            approved: 'معتمدة',
            rejected: 'مرفوضة'
        };
        return labels[this.currentView] || 'غير معروف';
    }

    getStatusClass(status) {
        const classes = {
            pending: 'status-pending',
            approved: 'status-approved',
            rejected: 'status-rejected'
        };
        return classes[status] || 'status-unknown';
    }

    getStatusText(status) {
        const texts = {
            pending: 'معلق',
            approved: 'معتمد',
            rejected: 'مرفوض'
        };
        return texts[status] || 'غير معروف';
    }

    getStatusIcon(status) {
        const icons = {
            pending: 'fa-clock',
            approved: 'fa-check-circle',
            rejected: 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    showError(message) {
        const container = document.getElementById('registrationContent');

        if (!container) {
            console.error('Registration content container not found for error display');
            return;
        }

        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطأ في تحميل البيانات</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="registrationManagement.loadRegistrations()">
                    <i class="fas fa-refresh"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// Make available globally
window.RegistrationManagement = RegistrationManagement;