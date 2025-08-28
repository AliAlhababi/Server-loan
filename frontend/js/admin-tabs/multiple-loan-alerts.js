// Multiple Loan Alerts - Admin Security Component
// Detects and displays users with multiple pending loans (race condition prevention)

class MultipleLoanAlerts {
    constructor() {
        this.alerts = [];
        this.isLoading = false;
    }

    async loadAlerts() {
        try {
            // Pre-check authentication
            const token = localStorage.getItem('authToken');
            
            if (!token || !currentUser || !(currentUser.isAdmin || currentUser.user_type === 'admin')) {
                console.log('⚠️  Cannot load alerts - not authenticated admin');
                this.renderError('يجب تسجيل الدخول كمدير لعرض هذه المعلومات');
                return;
            }
            
            this.isLoading = true;
            this.renderLoading();
            
            const response = await fetch('/api/admin/multiple-loan-alerts', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                console.log('🔐 Authentication expired, hiding alerts');
                this.renderError('انتهت صلاحية تسجيل الدخول');
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.alerts = data.data.alerts || [];
                this.renderAlerts(data.data);
            } else {
                throw new Error(data.message || 'فشل في جلب التنبيهات');
            }
            
        } catch (error) {
            console.error('Error loading multiple loan alerts:', error);
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    renderLoading() {
        const container = document.getElementById('multiple-loan-alerts-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">جاري التحميل...</span>
                    </div>
                    <p class="mt-2">جاري فحص القروض المتعددة...</p>
                </div>
            `;
        }
    }
    
    renderError(message) {
        const container = document.getElementById('multiple-loan-alerts-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>خطأ:</strong> ${message}
                    <button class="btn btn-sm btn-outline-danger mt-2" onclick="multipleLoanAlerts.loadAlerts()">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }
    
    renderAlerts(data) {
        const container = document.getElementById('multiple-loan-alerts-container');
        if (!container) return;
        
        if (this.alerts.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success" role="alert">
                    <i class="fas fa-check-circle"></i>
                    <strong>ممتاز!</strong> لا توجد قروض متعددة معلقة. النظام يعمل بشكل صحيح.
                    <button class="btn btn-sm btn-success mt-2" onclick="multipleLoanAlerts.loadAlerts()">
                        <i class="fas fa-sync"></i> إعادة فحص
                    </button>
                </div>
            `;
            return;
        }
        
        const summary = `
            <div class="alert alert-warning mb-3" role="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>تنبيه أمني:</strong> تم اكتشاف <strong>${data.total_affected_users}</strong> مستخدماً لديه قروض متعددة معلقة
                <ul class="mt-2 mb-0">
                    <li><strong>حالات حرجة:</strong> ${data.critical_cases} مستخدم (3+ قروض)</li>
                    <li><strong>احتمال Race Condition:</strong> ${data.likely_race_conditions} حالة</li>
                </ul>
            </div>
        `;
        
        const alertsHtml = this.alerts.map(alert => this.renderSingleAlert(alert)).join('');
        
        container.innerHTML = `
            ${summary}
            <div class="row">
                ${alertsHtml}
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-primary" onclick="multipleLoanAlerts.loadAlerts()">
                    <i class="fas fa-sync"></i> إعادة فحص
                </button>
            </div>
        `;
    }
    
    renderSingleAlert(alert) {
        const cardClass = alert.severity === 'critical' ? 'border-danger' : 'border-warning';
        const headerClass = alert.severity === 'critical' ? 'bg-danger text-white' : 'bg-warning text-dark';
        const raceConditionBadge = alert.is_likely_race_condition ? 
            '<span class="badge badge-danger ml-2">Race Condition محتمل</span>' : '';
        
        const loansList = alert.loan_ids_array.map((loanId, index) => {
            const amount = alert.loan_amounts_array[index];
            const date = alert.request_dates_array[index];
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>قرض #${loanId}</strong><br>
                        <small class="text-muted">${date}</small>
                    </div>
                    <span class="badge badge-primary">${parseFloat(amount).toLocaleString()} د.ك</span>
                </li>
            `;
        }).join('');
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card ${cardClass}">
                    <div class="card-header ${headerClass}">
                        <h6 class="mb-0">
                            <i class="fas fa-user"></i> ${alert.user_name}
                            ${raceConditionBadge}
                        </h6>
                        <small>مستخدم #${alert.user_id} • ${alert.pending_loan_count} قروض معلقة</small>
                    </div>
                    <div class="card-body p-0">
                        <ul class="list-group list-group-flush">
                            ${loansList}
                        </ul>
                    </div>
                    <div class="card-footer">
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">إجمالي المطلوب</small><br>
                                <strong class="text-danger">${alert.total_requested_amount.toLocaleString()} د.ك</strong>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">الحد الأقصى المسموح</small><br>
                                <strong class="text-success">${alert.max_loan_allowed.toLocaleString()} د.ك</strong>
                            </div>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> 
                                الفترة الزمنية: ${alert.time_span_minutes} دقيقة
                            </small>
                        </div>
                        <div class="btn-group btn-group-sm w-100 mt-2">
                            <button class="btn btn-outline-primary" onclick="multipleLoanAlerts.viewUserDetails(${alert.user_id})">
                                <i class="fas fa-eye"></i> عرض التفاصيل
                            </button>
                            <button class="btn btn-outline-danger" onclick="multipleLoanAlerts.rejectDuplicateLoans(${alert.user_id}, [${alert.loan_ids_array.join(',')}])">
                                <i class="fas fa-times"></i> رفض المكررات
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async viewUserDetails(userId) {
        // Integrate with existing user details modal
        if (typeof showUserDetails === 'function') {
            showUserDetails(userId);
        } else {
            alert('تفاصيل المستخدم غير متاحة حالياً');
        }
    }
    
    async rejectDuplicateLoans(userId, loanIds) {
        // Check admin authentication first
        const token = localStorage.getItem('authToken');
        
        if (!token || !currentUser || !(currentUser.isAdmin || currentUser.user_type === 'admin')) {
            alert('يجب تسجيل الدخول كمدير لتنفيذ هذا الإجراء');
            return;
        }
        
        const confirm = window.confirm(
            `هل أنت متأكد من رفض القروض المكررة للمستخدم #${userId}؟\n` +
            `سيتم رفض ${loanIds.length - 1} قرض والاحتفاظ بالأقدم فقط.`
        );
        
        if (!confirm) return;
        
        try {
            // Keep the first loan (oldest) and reject the rest
            const loansToReject = loanIds.slice(1);
            
            for (const loanId of loansToReject) {
                const response = await fetch(`/api/admin/loan-action/${loanId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'reject' })
                });
                
                if (!response.ok) {
                    throw new Error(`فشل في رفض القرض #${loanId}`);
                }
            }
            
            alert(`تم رفض ${loansToReject.length} قرض مكرر بنجاح`);
            
            // Reload alerts to see updated status
            this.loadAlerts();
            
            // Refresh pending loans if available
            if (typeof loadPendingLoans === 'function') {
                loadPendingLoans();
            }
            
        } catch (error) {
            console.error('Error rejecting duplicate loans:', error);
            alert('حدث خطأ أثناء رفض القروض: ' + error.message);
        }
    }
    
    // Auto-refresh every 30 seconds when visible
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (document.getElementById('multiple-loan-alerts-container') && 
                !document.hidden && 
                !this.isLoading) {
                this.loadAlerts();
            }
        }, 30000); // 30 seconds
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize global instance
const multipleLoanAlerts = new MultipleLoanAlerts();

// Auto-start when page loads - ONLY for authenticated admin users
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on admin dashboard and user is authenticated
    if (document.getElementById('multiple-loan-alerts-container')) {
        // Only load if user is logged in and is admin
        const token = localStorage.getItem('authToken');
        
        if (token && currentUser && (currentUser.isAdmin || currentUser.user_type === 'admin')) {
            console.log('🔐 Admin authenticated, loading multiple loan alerts...');
            multipleLoanAlerts.loadAlerts();
            multipleLoanAlerts.startAutoRefresh();
        } else {
            console.log('⚠️  Multiple loan alerts skipped - not authenticated admin');
            // Hide the container if user is not admin
            const container = document.getElementById('multiple-loan-alerts-container');
            if (container) {
                container.style.display = 'none';
            }
            const alertSection = document.getElementById('multiple-loans-alert-section');
            if (alertSection) {
                alertSection.style.display = 'none';
            }
        }
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    multipleLoanAlerts.stopAutoRefresh();
});