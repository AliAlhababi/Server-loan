// Loan History Tab Module
// Handles loan history display and management

class LoanHistoryTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.loanHistory = [];
        this.filteredHistory = [];
        this.currentFilter = 'all';
        this.currentSort = 'date_desc';
    }

    // Load loan history content
    async load() {
        try {
            const result = await apiCall(`/users/loans/history/${this.userDashboard.getUser().user_id}`);
            this.loanHistory = result.loans || [];
            this.filteredHistory = [...this.loanHistory];
            
            const loanHistoryContent = document.getElementById('loanHistoryContent');
            if (loanHistoryContent) {
                if (this.loanHistory.length === 0) {
                    loanHistoryContent.innerHTML = this.generateEmptyState();
                } else {
                    const html = this.generateLoanHistoryContent();
                    loanHistoryContent.innerHTML = html;
                    this.setupEventListeners();
                }
            }
        } catch (error) {
            console.error('Error loading loan history:', error);
            const loanHistoryContent = document.getElementById('loanHistoryContent');
            if (loanHistoryContent) {
                loanHistoryContent.innerHTML = this.generateErrorState(error.message);
            }
        }
    }

    // Generate empty state
    generateEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>لا يوجد تاريخ قروض</h3>
                <p>لم تحصل على أي قروض سابقة</p>
                <div class="loan-info">
                    <p class="help-text">يمكنك طلب قرض جديد من تبويب طلب قرض</p>
                </div>
            </div>
        `;
    }

    // Generate error state
    generateErrorState(message) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>حدث خطأ</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.loanHistoryTab.load()">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Generate loan history content
    generateLoanHistoryContent() {
        return `
            <div class="loan-history-container">
                <div class="loan-history-header">
                    <h3>تاريخ القروض</h3>
                    <div class="controls">
                        ${this.generateFilterControls()}
                        ${this.generateSortControls()}
                    </div>
                </div>
                <div class="loan-history-list">
                    ${this.filteredHistory.map(loan => this.generateLoanCard(loan)).join('')}
                </div>
            </div>
        `;
    }

    // Generate filter controls
    generateFilterControls() {
        return `
            <div class="filter-group">
                <label>تصفية:</label>
                <select id="loanHistoryFilter" class="form-control">
                    <option value="all">جميع القروض</option>
                    <option value="completed">مكتملة</option>
                    <option value="active">نشطة</option>
                    <option value="pending">معلقة</option>
                    <option value="rejected">مرفوضة</option>
                </select>
            </div>
        `;
    }

    // Generate sort controls
    generateSortControls() {
        return `
            <div class="sort-group">
                <label>ترتيب:</label>
                <select id="loanHistorySort" class="form-control">
                    <option value="date_desc">الأحدث أولاً</option>
                    <option value="date_asc">الأقدم أولاً</option>
                    <option value="amount_desc">المبلغ (عالي)</option>
                    <option value="amount_asc">المبلغ (منخفض)</option>
                </select>
            </div>
        `;
    }

    // Generate individual loan card
    generateLoanCard(loan) {
        // Use centralized status helper for consistent logic
        const statusClass = LoanStatusHelper.getLoanStatusClass(loan);
        const statusText = LoanStatusHelper.getLoanStatusText(loan);
        const isActuallyCompleted = LoanStatusHelper.isLoanCompleted(loan);
        
        // Use centralized progress calculation
        const progress = LoanStatusHelper.getLoanProgress(loan);
        const { remainingAmount, totalInstallments, paidInstallments } = progress;
        
        return `
            <div class="loan-card ${statusClass}">
                <div class="loan-header">
                    <div class="loan-info">
                        <h4>قرض ${loan.loan_id}</h4>
                        <span class="loan-date">${FormatHelper.formatDate(loan.request_date)}</span>
                    </div>
                    <div class="loan-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="loan-details">
                    <div class="detail-row">
                        <span class="label">مبلغ القرض:</span>
                        <span class="value">${FormatHelper.formatCurrency(loan.loan_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">القسط الشهري:</span>
                        <span class="value">${FormatHelper.formatCurrency(loan.installment_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">عدد الأقساط:</span>
                        <span class="value">${totalInstallments}</span>
                    </div>
                    ${loan.status === 'approved' && !isActuallyCompleted ? `
                        <div class="detail-row">
                            <span class="label">الأقساط المدفوعة:</span>
                            <span class="value">${paidInstallments} من ${totalInstallments}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">المبلغ المتبقي:</span>
                            <span class="value highlight">${FormatHelper.formatCurrency(remainingAmount)}</span>
                        </div>
                    ` : isActuallyCompleted ? `
                        <div class="detail-row">
                            <span class="label">تاريخ الإكمال:</span>
                            <span class="value">${FormatHelper.formatDate(loan.loan_closed_date)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">إجمالي المدفوع:</span>
                            <span class="value">${FormatHelper.formatCurrency(loan.total_paid)}</span>
                        </div>
                    ` : loan.approval_date ? `
                        <div class="detail-row">
                            <span class="label">تاريخ الموافقة:</span>
                            <span class="value">${FormatHelper.formatDate(loan.approval_date)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="loan-actions">
                    <button class="btn btn-outline" onclick="window.loanHistoryTab.viewLoanDetails(${loan.loan_id})">
                        عرض التفاصيل
                    </button>
                    <button class="btn btn-outline" onclick="window.loanHistoryTab.viewPaymentHistory(${loan.loan_id})">
                        تاريخ الدفعات
                    </button>
                </div>
            </div>
        `;
    }

    // Setup event listeners
    setupEventListeners() {
        const filterSelect = document.getElementById('loanHistoryFilter');
        const sortSelect = document.getElementById('loanHistorySort');

        if (filterSelect) {
            filterSelect.value = this.currentFilter;
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFiltersAndSort();
            });
        }

        if (sortSelect) {
            sortSelect.value = this.currentSort;
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFiltersAndSort();
            });
        }
    }

    // Apply filters and sorting
    applyFiltersAndSort() {
        // Apply filters
        if (this.currentFilter === 'all') {
            this.filteredHistory = [...this.loanHistory];
        } else {
            // Use centralized filtering logic
            this.filteredHistory = LoanStatusHelper.filterLoansByStatus(this.loanHistory, this.currentFilter);
        }

        // Apply sorting
        this.filteredHistory.sort((a, b) => {
            switch (this.currentSort) {
                case 'date_asc':
                    return new Date(a.request_date) - new Date(b.request_date);
                case 'date_desc':
                    return new Date(b.request_date) - new Date(a.request_date);
                case 'amount_asc':
                    return a.loan_amount - b.loan_amount;
                case 'amount_desc':
                    return b.loan_amount - a.loan_amount;
                default:
                    return new Date(b.request_date) - new Date(a.request_date);
            }
        });

        // Re-render the list
        const listContainer = document.querySelector('.loan-history-list');
        if (listContainer) {
            listContainer.innerHTML = this.filteredHistory.map(loan => this.generateLoanCard(loan)).join('');
        }
    }

    // View loan details
    viewLoanDetails(loanId) {
        // This would open a modal or navigate to detailed view
        console.log(`Viewing details for loan ${loanId}`);
        // Implementation would depend on your modal system
    }

    // View payment history for a specific loan
    viewPaymentHistory(loanId) {
        // This would show payment history for the specific loan
        console.log(`Viewing payment history for loan ${loanId}`);
        // Implementation would depend on your modal system
    }
}

// Export for use in user-dashboard-loader.js
window.LoanHistoryTab = LoanHistoryTab;