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
        const summary = this.calculateSummary();

        return `
            <div class="loan-history-container">
                <!-- Loan Summary -->
                <div class="loan-history-summary">
                    ${this.generateSummaryCards(summary)}
                </div>

                <!-- Modern Controls -->
                <div class="loan-history-controls">
                    <div class="filters-section">
                        <div class="filter-group modern-filter">
                            <select id="loanHistoryFilter" class="modern-select">
                                <option value="all">جميع القروض</option>
                                <option value="completed">مكتملة</option>
                                <option value="active">نشطة</option>
                                <option value="pending">معلقة</option>
                                <option value="rejected">مرفوضة</option>
                            </select>
                        </div>
                        <div class="filter-group modern-filter">
                            <select id="loanHistorySort" class="modern-select">
                                <option value="date_desc">الأحدث أولاً</option>
                                <option value="date_asc">الأقدم أولاً</option>
                                <option value="amount_desc">المبلغ (عالي)</option>
                                <option value="amount_asc">المبلغ (منخفض)</option>
                            </select>
                        </div>
                    </div>
                    <div class="actions-section">
                        <button onclick="loanHistoryTab.refreshLoanHistory()" class="btn btn-secondary">
                            <i class="fas fa-sync"></i> تحديث
                        </button>
                        <button onclick="loanHistoryTab.exportLoanHistory()" class="btn btn-secondary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                </div>

                <!-- Loan History Table -->
                <div class="loan-history-table-section">
                    <div class="table-header">
                        <h4><i class="fas fa-history"></i> سجل القروض المفصل</h4>
                        <span class="loans-count">${this.filteredHistory.length} قرض</span>
                    </div>
                    ${this.generateLoanHistoryTable()}
                </div>
            </div>
        `;
    }

    // Calculate summary statistics
    calculateSummary() {
        const completed = this.loanHistory.filter(loan => LoanStatusHelper.isLoanCompleted(loan));
        const active = this.loanHistory.filter(loan => loan.status === 'approved' && !LoanStatusHelper.isLoanCompleted(loan));
        const pending = this.loanHistory.filter(loan => loan.status === 'pending');
        const rejected = this.loanHistory.filter(loan => loan.status === 'rejected');
        
        const totalLoanAmount = completed.reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0);
        const activeLoanAmount = active.reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0);
        const totalPaidAmount = completed.reduce((sum, loan) => sum + parseFloat(loan.total_paid || 0), 0);

        return {
            total: this.loanHistory.length,
            completed: completed.length,
            active: active.length,
            pending: pending.length,
            rejected: rejected.length,
            totalLoanAmount,
            activeLoanAmount,
            totalPaidAmount
        };
    }

    // Generate summary cards
    generateSummaryCards(summary) {
        return `
            <div class="summary-cards">
                <div class="summary-card primary">
                    <div class="card-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="card-content">
                        <h4>قروض مكتملة</h4>
                        <div class="amount success">${summary.completed}</div>
                        <small>بقيمة ${formatCurrency(summary.totalLoanAmount)}</small>
                    </div>
                </div>
                
                <div class="summary-card warning">
                    <div class="card-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="card-content">
                        <h4>قروض نشطة</h4>
                        <div class="amount">${summary.active}</div>
                        <small>بقيمة ${formatCurrency(summary.activeLoanAmount)}</small>
                    </div>
                </div>
                
                <div class="summary-card info">
                    <div class="card-icon">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="card-content">
                        <h4>قروض معلقة</h4>
                        <div class="amount">${summary.pending}</div>
                        <small>في انتظار الموافقة</small>
                    </div>
                </div>

                <div class="summary-card danger">
                    <div class="card-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="card-content">
                        <h4>قروض مرفوضة</h4>
                        <div class="amount">${summary.rejected}</div>
                        <small>قرض مرفوض</small>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate loan history table
    generateLoanHistoryTable() {
        if (this.filteredHistory.length === 0) {
            return `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>لا توجد قروض تطابق المرشحات</h4>
                    <p>جرب تغيير المرشحات أو طلب قرض جديد</p>
                </div>
            `;
        }

        return `
            <div class="loan-history-table-container">
                <table class="loan-history-table">
                    <thead>
                        <tr>
                            <th>تاريخ الطلب</th>
                            <th>مبلغ القرض</th>
                            <th>القسط الشهري</th>
                            <th>التقدم</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredHistory.map(loan => this.generateLoanRow(loan)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Generate single loan row
    generateLoanRow(loan) {
        const statusClass = LoanStatusHelper.getLoanStatusClass(loan);
        const statusText = LoanStatusHelper.getLoanStatusText(loan);
        const isCompleted = LoanStatusHelper.isLoanCompleted(loan);
        const progress = LoanStatusHelper.getLoanProgress(loan);
        
        let progressDisplay = '';
        if (loan.status === 'approved') {
            if (isCompleted) {
                progressDisplay = `
                    <div class="progress-info completed">
                        <i class="fas fa-check-circle"></i>
                        <span>مكتمل</span>
                        <small>${new Date(loan.loan_closed_date).toLocaleDateString('en-US')}</small>
                    </div>
                `;
            } else {
                const percentage = ((progress.paidInstallments || 0) / (progress.totalInstallments || 1)) * 100;
                progressDisplay = `
                    <div class="progress-info active">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <small>${progress.paidInstallments || 0} من ${progress.totalInstallments || 0}</small>
                    </div>
                `;
            }
        } else if (loan.status === 'pending') {
            progressDisplay = `
                <div class="progress-info pending">
                    <i class="fas fa-clock"></i>
                    <span>في الانتظار</span>
                </div>
            `;
        } else {
            progressDisplay = `
                <div class="progress-info rejected">
                    <i class="fas fa-times-circle"></i>
                    <span>مرفوض</span>
                </div>
            `;
        }

        return `
            <tr class="loan-row ${statusClass}">
                <td class="date-cell">
                    <i class="fas fa-calendar-alt"></i>
                    ${new Date(loan.request_date).toLocaleDateString('en-US')}
                    <small>${new Date(loan.request_date).toLocaleTimeString('ar-KW', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</small>
                </td>
                <td class="amount-cell">
                    <span class="amount">
                        ${formatCurrency(loan.loan_amount)}
                    </span>
                </td>
                <td class="installment-cell">
                    <span class="installment">
                        ${formatCurrency(loan.installment_amount)}
                    </span>
                </td>
                <td class="progress-cell">
                    ${progressDisplay}
                </td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${this.getLoanStatusIcon(loan.status)}"></i>
                        ${statusText}
                    </span>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button onclick="loanHistoryTab.viewLoanDetails(${loan.loan_id})" 
                                class="btn btn-small btn-info" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${loan.status === 'approved' ? `
                            <button onclick="loanHistoryTab.viewPaymentHistory(${loan.loan_id})" 
                                    class="btn btn-small btn-secondary" title="تاريخ الدفعات">
                                <i class="fas fa-history"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    // Get loan status icon
    getLoanStatusIcon(status) {
        switch (status) {
            case 'approved': return 'fa-check-circle';
            case 'pending': return 'fa-clock';
            case 'rejected': return 'fa-times-circle';
            default: return 'fa-question-circle';
        }
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

        // Update table
        this.updateTable();
    }

    // Update table after filtering/sorting
    updateTable() {
        const tableSection = document.querySelector('.loan-history-table-section');
        if (tableSection) {
            const header = tableSection.querySelector('.table-header');
            if (header) {
                const countSpan = header.querySelector('.loans-count');
                if (countSpan) {
                    countSpan.textContent = `${this.filteredHistory.length} قرض`;
                }
            }

            const tableContainer = tableSection.querySelector('.loan-history-table-container');
            if (tableContainer) {
                tableContainer.outerHTML = this.generateLoanHistoryTable();
            }
        }
    }

    // View loan details
    viewLoanDetails(loanId) {
        const loan = this.loanHistory.find(l => l.loan_id === loanId);
        if (!loan) return;

        const statusText = LoanStatusHelper.getLoanStatusText(loan);
        const isCompleted = LoanStatusHelper.isLoanCompleted(loan);
        const progress = LoanStatusHelper.getLoanProgress(loan);
        
        const approvalDateText = loan.approval_date ? 
            new Date(loan.approval_date).toLocaleDateString('en-US') : 'لم يتم الرد بعد';
        const completionDateText = loan.loan_closed_date ?
            new Date(loan.loan_closed_date).toLocaleDateString('en-US') : 'غير مكتمل';

        const modalHtml = `
            <div class="loan-details-modal">
                <h3><i class="fas fa-file-contract"></i> تفاصيل القرض</h3>
                <div class="loan-details">
                    <div class="detail-row">
                        <label>رقم القرض:</label>
                        <span>#${loan.loan_id}</span>
                    </div>
                    <div class="detail-row">
                        <label>تاريخ الطلب:</label>
                        <span>${new Date(loan.request_date).toLocaleString('ar-KW')}</span>
                    </div>
                    <div class="detail-row">
                        <label>مبلغ القرض:</label>
                        <span class="amount">${formatCurrency(loan.loan_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>القسط الشهري:</label>
                        <span class="amount">${formatCurrency(loan.installment_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>عدد الأقساط:</label>
                        <span>${progress.totalInstallments || 'غير محسوب'}</span>
                    </div>
                    <div class="detail-row">
                        <label>الحالة:</label>
                        <span class="status-badge ${LoanStatusHelper.getLoanStatusClass(loan)}">
                            <i class="fas ${this.getLoanStatusIcon(loan.status)}"></i>
                            ${statusText}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>تاريخ الموافقة:</label>
                        <span>${approvalDateText}</span>
                    </div>
                    ${isCompleted ? `
                        <div class="detail-row">
                            <label>تاريخ الإكمال:</label>
                            <span>${completionDateText}</span>
                        </div>
                        <div class="detail-row">
                            <label>إجمالي المدفوع:</label>
                            <span class="amount success">${formatCurrency(loan.total_paid || 0)}</span>
                        </div>
                    ` : loan.status === 'approved' ? `
                        <div class="detail-row">
                            <label>الأقساط المدفوعة:</label>
                            <span>${progress.paidInstallments || 0} من ${progress.totalInstallments || 0}</span>
                        </div>
                        <div class="detail-row">
                            <label>القرض:</label>
                            <span class="amount warning">${formatCurrency(progress.remainingAmount || loan.loan_amount)}</span>
                        </div>
                    ` : ''}
                    ${loan.notes ? `
                        <div class="detail-row">
                            <label>ملاحظات:</label>
                            <span>${loan.notes}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button onclick="hideModal()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        `;
        
        showModal('تفاصيل القرض', modalHtml);
    }

    // View payment history for a specific loan
    viewPaymentHistory(loanId) {
        // Navigate to loan payments tab with specific loan filter
        showToast('سيتم عرض تاريخ الدفعات في تبويب تسديد الأقساط', 'info');
        // Could trigger tab switch to loan payments with filter
        // window.userDashboard?.switchToTab('loanPayments', { loanId });
    }

    // Refresh loan history
    async refreshLoanHistory() {
        await this.load();
        showToast('تم تحديث سجل القروض بنجاح', 'success');
    }

    // Export loan history
    exportLoanHistory() {
        showToast('سيتم إضافة تصدير سجل القروض قريباً', 'info');
    }
}

// Export for use in user-dashboard-loader.js
window.LoanHistoryTab = LoanHistoryTab;