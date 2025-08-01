// Transactions Tab Module
// Handles transaction history display and management

class TransactionsTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentFilter = 'all';
        this.currentSort = 'date_desc';
    }

    // Load transactions content
    async load() {
        try {
            const result = await apiCall(`/users/transactions/${this.userDashboard.getUser().user_id}`);
            this.transactions = result.transactions || [];
            this.filteredTransactions = [...this.transactions];
            
            const transactionsContent = document.getElementById('transactionsContent');
            if (transactionsContent) {
                if (this.transactions.length === 0) {
                    transactionsContent.innerHTML = this.generateEmptyState();
                } else {
                    const html = this.generateTransactionsContent();
                    transactionsContent.innerHTML = html;
                    this.setupEventListeners();
                }
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            const transactionsContent = document.getElementById('transactionsContent');
            if (transactionsContent) {
                transactionsContent.innerHTML = this.generateErrorState(error.message);
            }
        }
    }

    // Generate empty state
    generateEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <h3>لا توجد معاملات</h3>
                <p>لم تقم بأي معاملات مالية حتى الآن</p>
                <div class="transaction-info">
                    <p class="help-text">يمكنك دفع اشتراكك من هنا</p>
                </div>
                <button onclick="transactionsTab.showRequestTransaction()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> دفع اشتراك
                </button>
            </div>
        `;
    }

    // Generate error state
    generateErrorState(errorMessage) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>خطأ في تحميل المعاملات</h3>
                <p>${errorMessage}</p>
                <button onclick="transactionsTab.load()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Generate transactions content
    generateTransactionsContent() {
        const summary = this.calculateSummary();

        return `
            <div class="transactions-container">
                <!-- Transactions Summary -->
                <div class="transactions-summary">
                    ${this.generateSummaryCards(summary)}
                </div>

                <!-- Modern Controls -->
                <div class="transactions-controls">
                    <div class="filters-section">
                        <div class="filter-group modern-filter">
                            <select id="statusFilter" class="modern-select">
                                <option value="all">جميع المعاملات</option>
                                <option value="accepted">مقبولة</option>
                                <option value="pending">معلقة</option>
                                <option value="rejected">مرفوضة</option>
                            </select>
                        </div>
                    </div>
                    <div class="actions-section">
                        <button onclick="transactionsTab.showRequestTransaction()" class="btn btn-primary">
                            <i class="fas fa-plus"></i> دفع اشتراك
                        </button>
                        <button onclick="transactionsTab.exportTransactions()" class="btn btn-secondary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                        <button onclick="transactionsTab.refreshTransactions()" class="btn btn-secondary">
                            <i class="fas fa-sync"></i> تحديث
                        </button>
                    </div>
                </div>

                <!-- Transactions Table -->
                <div class="transactions-table-section">
                    <div class="table-header">
                        <h4><i class="fas fa-list"></i> سجل المعاملات</h4>
                        <span class="transactions-count">${this.filteredTransactions.length} معاملة</span>
                    </div>
                    ${this.generateTransactionsTable()}
                </div>
            </div>
        `;
    }

    // Calculate summary statistics
    calculateSummary() {
        const accepted = this.transactions.filter(t => t.status === 'accepted');
        const pending = this.transactions.filter(t => t.status === 'pending');
        const rejected = this.transactions.filter(t => t.status === 'rejected');
        
        // Fix: Parse strings to numbers to avoid concatenation
        const totalCredits = accepted.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
        const totalDebits = accepted.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
        const pendingAmount = pending.reduce((sum, t) => sum + parseFloat(t.credit || t.debit || 0), 0);

        return {
            total: this.transactions.length,
            accepted: accepted.length,
            pending: pending.length,
            rejected: rejected.length,
            totalCredits,
            totalDebits,
            pendingAmount,
            netAmount: totalCredits - totalDebits
        };
    }

    // Generate summary cards
    generateSummaryCards(summary) {
        return `
            <div class="summary-cards">
                <div class="summary-card primary">
                    <div class="card-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="card-content">
                        <h4>إجمالي الإيداعات</h4>
                        <div class="amount success">${formatCurrency(summary.totalCredits)}</div>
                        <small>${summary.accepted} معاملة مقبولة</small>
                    </div>
                </div>
                
                <div class="summary-card warning">
                    <div class="card-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="card-content">
                        <h4>معاملات معلقة</h4>
                        <div class="amount">${summary.pending}</div>
                        <small>بقيمة ${formatCurrency(summary.pendingAmount)}</small>
                    </div>
                </div>
                
                <div class="summary-card danger">
                    <div class="card-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="card-content">
                        <h4>معاملات مرفوضة</h4>
                        <div class="amount">${summary.rejected}</div>
                        <small>معاملة مرفوضة</small>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate transactions table
    generateTransactionsTable() {
        if (this.filteredTransactions.length === 0) {
            return `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>لا توجد معاملات تطابق المرشحات</h4>
                    <p>جرب تغيير المرشحات أو إضافة معاملة جديدة</p>
                </div>
            `;
        }

        return `
            <div class="transactions-table-container">
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>الوصف</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredTransactions.map(transaction => this.generateTransactionRow(transaction)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Generate single transaction row
    generateTransactionRow(transaction) {
        const isCredit = transaction.credit > 0;
        const amount = isCredit ? transaction.credit : transaction.debit;
        const typeIcon = isCredit ? 'fa-arrow-up' : 'fa-arrow-down';
        const typeClass = isCredit ? 'credit' : 'debit';
        const typeText = isCredit ? 'إيداع' : 'سحب';

        return `
            <tr class="transaction-row ${transaction.status}">
                <td class="date-cell">
                    <i class="fas fa-calendar-alt"></i>
                    ${new Date(transaction.date || transaction.transaction_date).toLocaleDateString('en-US')}
                    <small>${new Date(transaction.date || transaction.transaction_date).toLocaleTimeString('ar-KW', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</small>
                </td>
                <td class="type-cell">
                    <span class="transaction-type ${typeClass}">
                        <i class="fas ${typeIcon}"></i>
                        ${typeText}
                    </span>
                </td>
                <td class="amount-cell">
                    <span class="amount ${typeClass}">
                        ${formatCurrency(amount)}
                    </span>
                </td>
                <td class="memo-cell">
                    <div class="memo-content">
                        ${transaction.memo || 'غير محدد'}
                    </div>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${transaction.status}">
                        <i class="fas ${this.getStatusIcon(transaction.status)}"></i>
                        ${this.getStatusText(transaction.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button onclick="transactionsTab.viewTransaction(${transaction.transaction_id})" 
                                class="btn btn-small btn-info" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${transaction.status === 'pending' ? `
                            <button onclick="transactionsTab.cancelTransaction(${transaction.transaction_id})" 
                                    class="btn btn-small btn-danger" title="إلغاء">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    // Get status icon
    getStatusIcon(status) {
        switch (status) {
            case 'accepted': return 'fa-check-circle';
            case 'pending': return 'fa-clock';
            case 'rejected': return 'fa-times-circle';
            default: return 'fa-question-circle';
        }
    }

    // Get status text
    getStatusText(status) {
        switch (status) {
            case 'accepted': return 'مقبول';
            case 'pending': return 'معلق';
            case 'rejected': return 'مرفوض';
            default: return 'غير محدد';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const statusFilter = document.getElementById('statusFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    // Apply filters
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;

        this.filteredTransactions = this.transactions.filter(transaction => {
            // Status filter
            if (statusFilter !== 'all' && transaction.status !== statusFilter) return false;
            return true;
        });

        this.applySorting();
        this.updateTable();
    }

    // Apply sorting (default: newest first)
    applySorting() {
        this.filteredTransactions.sort((a, b) => {
            return new Date(b.date || b.transaction_date) - new Date(a.date || a.transaction_date);
        });
    }

    // Update table after filtering/sorting
    updateTable() {
        const tableSection = document.querySelector('.transactions-table-section');
        if (tableSection) {
            const header = tableSection.querySelector('.table-header');
            if (header) {
                const countSpan = header.querySelector('.transactions-count');
                if (countSpan) {
                    countSpan.textContent = `${this.filteredTransactions.length} معاملة`;
                }
            }

            const tableContainer = tableSection.querySelector('.transactions-table-container');
            if (tableContainer) {
                tableContainer.innerHTML = this.generateTransactionsTable().match(/<div class="transactions-table-container">(.*?)<\/div>/s)[1];
            }
        }
    }

    // Show simple subscription payment modal (using global config)
    showRequestTransaction() {
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

    // Submit simple payment
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
            
            // Refresh transactions
            await this.load();
            
        } catch (error) {
            modalManager.showError(error.message || 'خطأ في إرسال الطلب');
        }
    }

    // View transaction details
    viewTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.transaction_id === transactionId);
        if (!transaction) return;

        const modalHtml = `
            <div class="transaction-details-modal">
                <h3><i class="fas fa-receipt"></i> تفاصيل المعاملة</h3>
                <div class="transaction-details">
                    <div class="detail-row">
                        <label>رقم المعاملة:</label>
                        <span>#${transaction.transaction_id}</span>
                    </div>
                    <div class="detail-row">
                        <label>التاريخ والوقت:</label>
                        <span>${new Date(transaction.date || transaction.transaction_date).toLocaleString('ar-KW')}</span>
                    </div>
                    <div class="detail-row">
                        <label>النوع:</label>
                        <span class="transaction-type ${transaction.credit > 0 ? 'credit' : 'debit'}">
                            <i class="fas ${transaction.credit > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                            ${transaction.credit > 0 ? 'إيداع' : 'سحب'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>المبلغ:</label>
                        <span class="amount ${transaction.credit > 0 ? 'success' : 'warning'}">
                            ${formatCurrency(transaction.credit > 0 ? transaction.credit : transaction.debit)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>الوصف:</label>
                        <span>${transaction.memo || 'غير محدد'}</span>
                    </div>
                    <div class="detail-row">
                        <label>الحالة:</label>
                        <span class="status-badge ${transaction.status}">
                            <i class="fas ${this.getStatusIcon(transaction.status)}"></i>
                            ${this.getStatusText(transaction.status)}
                        </span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="hideModal()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        `;
        
        showModal('تفاصيل المعاملة', modalHtml);
    }

    // Cancel transaction
    async cancelTransaction(transactionId) {
        if (!confirm('هل أنت متأكد من إلغاء هذه المعاملة؟')) {
            return;
        }

        try {
            showLoading(true);
            const result = await apiCall(`/users/cancel-transaction/${transactionId}`, 'DELETE');
            showToast(result.message, 'success');
            
            // Refresh transactions
            await this.load();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Export transactions
    exportTransactions() {
        // Implementation for exporting transactions
        showToast('سيتم إضافة تصدير المعاملات قريباً', 'info');
    }

    // Refresh transactions
    async refreshTransactions() {
        await this.load();
        showToast('تم تحديث المعاملات بنجاح', 'success');
    }
}

// Make TransactionsTab globally available
window.TransactionsTab = TransactionsTab;