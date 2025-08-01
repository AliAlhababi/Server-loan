// Optimized Subscriptions Tab Module
class SubscriptionsTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.cache = new Map();
    }

    // Optimized load method
    async load() {
        try {
            const [transactions, subscriptionStatus] = await Promise.all([
                this.getTransactions(),
                this.getSubscriptionStatus()
            ]);

            const subscriptionsContent = document.getElementById('subscriptionsContent');
            if (!subscriptionsContent) return;

            if (transactions.length === 0) {
                subscriptionsContent.innerHTML = this.renderEmptyState();
            } else {
                subscriptionsContent.innerHTML = this.renderSubscriptionsContent(transactions, subscriptionStatus);
            }
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            document.getElementById('subscriptionsContent').innerHTML = this.renderErrorState(error.message);
        }
    }

    // Get transactions with caching
    async getTransactions() {
        const cacheKey = `transactions_${this.userDashboard.getUser().user_id}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < 30000) { // 30 seconds cache
            return cached.data;
        }

        const result = await apiCall(`/users/transactions/${this.userDashboard.getUser().user_id}`);
        const transactions = result.transactions.filter(t => t.credit > 0 && t.status === 'accepted');
        
        this.cache.set(cacheKey, { data: transactions, timestamp: Date.now() });
        return transactions;
    }

    // Get subscription status with caching
    async getSubscriptionStatus() {
        const cacheKey = `subscription_status_${this.userDashboard.getUser().user_id}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
            console.log('Using cached subscription status:', cached.data);
            return cached.data;
        }

        try {
            const result = await apiCall(`/users/subscription-status/${this.userDashboard.getUser().user_id}`);
            const status = result.status || { valid: false, timeValid: false, totalPaid: 0, requiredAmount: 240 };
            
            console.log('Fresh subscription status from API:', status);
            
            this.cache.set(cacheKey, { data: status, timestamp: Date.now() });
            return status;
        } catch (error) {
            console.error('Error getting subscription status:', error);
            return { valid: false, timeValid: false, totalPaid: 0, requiredAmount: 240 };
        }
    }
    
    // Clear cache (for debugging and refresh)
    clearCache() {
        this.cache.clear();
        console.log('Subscription cache cleared');
    }

    // Optimized content rendering
    renderSubscriptionsContent(transactions, subscriptionStatus) {
        const { totalPaid, requiredAmount, completionPercentage } = subscriptionStatus;
        
        return `
            <div class="subscriptions-container">
                ${this.renderSummaryCard(subscriptionStatus, transactions.length)}
                ${this.renderQuickActions()}
                ${this.renderTransactionsTable(transactions)}
            </div>
        `;
    }

    // Streamlined summary card
    renderSummaryCard(status, transactionCount) {
        const { totalPaid, requiredAmount, valid, completionPercentage } = status;
        
        return `
            <div class="subscription-summary-card">
                <div class="summary-header">
                    <div class="summary-title">
                        <i class="fas fa-coins"></i>
                        <h3>حالة الاشتراك</h3>
                    </div>
                    <div class="status-badge ${valid ? 'complete' : 'incomplete'}">
                        <i class="fas ${valid ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${valid ? 'مكتمل' : 'غير مكتمل'}
                    </div>
                </div>
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-value success">${formatCurrency(totalPaid)}</div>
                        <div class="stat-label">إجمالي المدفوع</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${formatCurrency(requiredAmount)}</div>
                        <div class="stat-label">المطلوب</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${transactionCount}</div>
                        <div class="stat-label">عدد المدفوعات</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${(completionPercentage || 0).toFixed(1)}%</div>
                        <div class="stat-label">نسبة الإكمال</div>
                    </div>
                </div>
                
                <div class="progress-section">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(completionPercentage || 0)}%"></div>
                    </div>
                    <div class="progress-text">${(completionPercentage || 0).toFixed(1)}% من الاشتراك المطلوب</div>
                </div>
            </div>
        `;
    }

    // Simplified action buttons
    renderQuickActions() {
        return `
            <div class="quick-actions">
                <button onclick="subscriptionsTab.showPaymentModal()" class="btn btn-primary btn-large">
                    <i class="fas fa-plus"></i>
                    دفع اشتراك
                </button>
                <button onclick="subscriptionsTab.refreshData()" class="btn btn-secondary">
                    <i class="fas fa-sync-alt"></i>
                    تحديث
                </button>
            </div>
        `;
    }

    // Optimized transactions table
    renderTransactionsTable(transactions) {
        if (transactions.length === 0) {
            return `
                <div class="transactions-section">
                    <h4><i class="fas fa-history"></i> سجل المدفوعات</h4>
                    <div class="empty-transactions">
                        <i class="fas fa-receipt"></i>
                        <p>لا توجد مدفوعات حتى الآن</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="transactions-section">
                <h4><i class="fas fa-history"></i> سجل المدفوعات (${transactions.length})</h4>
                <div class="transactions-grid">
                    ${transactions.slice(0, 10).map(t => this.renderTransactionCard(t)).join('')}
                </div>
                ${transactions.length > 10 ? `
                    <div class="show-more">
                        <button onclick="subscriptionsTab.showAllTransactions()" class="btn btn-outline">
                            عرض جميع المدفوعات (${transactions.length})
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Transaction card instead of table row
    renderTransactionCard(transaction) {
        const date = new Date(transaction.date || transaction.transaction_date).toLocaleDateString('en-US');
        
        return `
            <div class="transaction-card">
                <div class="transaction-header">
                    <div class="transaction-amount success">
                        <i class="fas fa-arrow-up"></i>
                        ${formatCurrency(transaction.credit)}
                    </div>
                    <div class="transaction-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${date}
                    </div>
                </div>
                <div class="transaction-body">
                    <div class="transaction-memo">${transaction.memo || 'دفعة اشتراك'}</div>
                    <div class="transaction-status status-${transaction.status}">
                        <i class="fas ${this.getStatusIcon(transaction.status)}"></i>
                        ${this.getStatusText(transaction.status)}
                    </div>
                </div>
            </div>
        `;
    }

    // Empty state
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-coins"></i>
                </div>
                <h3>ابدأ رحلة الاشتراك</h3>
                <p>قم بأول دفعة اشتراك لتصبح عضواً نشطاً</p>
                <div class="subscription-info">
                    <div class="info-item">
                        <i class="fas fa-coins"></i>
                        <span>المطلوب: 240 د.ك خلال 24 شهر</span>
                    </div>
                </div>
                <button onclick="subscriptionsTab.showPaymentModal()" class="btn btn-primary btn-large">
                    <i class="fas fa-rocket"></i>
                    ابدأ الآن
                </button>
            </div>
        `;
    }

    // Error state
    renderErrorState(errorMessage) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>خطأ في تحميل البيانات</h3>
                <p>${errorMessage}</p>
                <button onclick="subscriptionsTab.load()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Simplified payment modal (using global config)
    showPaymentModal() {
        const { minAmount, maxAmount, step, quickAmounts } = AppConfig.business.payment;
        const { symbol } = AppConfig.ui.currency;
        
        modalManager.show('دفع اشتراك', `
            <div class="payment-form">
                <div class="payment-header">
                    <i class="fas fa-money-bill-wave payment-icon"></i>
                    <h4>كم تريد أن تدفع؟</h4>
                </div>
                <form id="paymentForm" class="simple-form">
                    <div class="amount-input-group">
                        <input type="number" 
                               name="amount" 
                               min="${minAmount}" 
                               max="${maxAmount}" 
                               step="${step}"
                               required 
                               placeholder="مثال: 10.000"
                               class="amount-input">
                        <span class="currency-label">${symbol}</span>
                    </div>
                    <div class="quick-amounts">
                        ${quickAmounts.map(amount => 
                            `<button type="button" onclick="document.querySelector('[name=amount]').value = '${amount}'" class="quick-btn">${amount}</button>`
                        ).join('')}
                    </div>
                </form>
            </div>
        `, {
            buttons: [
                { text: 'إرسال الطلب', type: 'primary', onclick: () => this.submitPayment() },
                { text: 'إلغاء', type: 'secondary', onclick: () => modalManager.close() }
            ]
        });
    }

    // Submit payment
    async submitPayment() {
        const form = document.getElementById('paymentForm');
        const formData = new FormData(form);
        const amount = parseFloat(formData.get('amount'));
        
        if (!amount || amount <= 0) {
            modalManager.showError('يرجى إدخال مبلغ صحيح');
            return;
        }
        
        try {
            modalManager.showLoading('جاري إرسال الطلب...');
            
            await apiCall('/users/request-transaction', 'POST', {
                amount,
                type: 'deposit',
                memo: 'دفع اشتراك'
            });
            
            modalManager.showSuccess('تم إرسال طلب الدفع بنجاح. سيتم مراجعته من قبل الإدارة.', { autoClose: 3000 });
            
            // Clear cache and reload
            this.cache.clear();
            await this.load();
            
        } catch (error) {
            modalManager.showError(error.message || 'خطأ في إرسال الطلب');
        }
    }

    // Utility methods
    getStatusIcon(status) {
        const icons = {
            'accepted': 'fa-check-circle',
            'pending': 'fa-clock',
            'rejected': 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    getStatusText(status) {
        const texts = {
            'accepted': 'مقبول',
            'pending': 'معلق',
            'rejected': 'مرفوض'
        };
        return texts[status] || 'غير محدد';
    }

    // Additional methods
    async refreshData() {
        this.cache.clear();
        await this.load();
        modalManager.showSuccess('تم تحديث البيانات', { autoClose: 2000 });
    }

    showAllTransactions() {
        // Show all transactions in a modal or expand the view
        modalManager.showSuccess('سيتم إضافة عرض جميع المعاملات قريباً', { autoClose: 2000 });
    }
}

// Make globally available
window.SubscriptionsTab = SubscriptionsTab;