// Simplified Loan Payments Tab Module
// Modern UI with single payment form

class LoanPaymentsTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.activeLoan = null;
        this.paymentHistory = [];
        this.minInstallment = 20; // Default minimum
    }

    // Load loan payments content
    async load() {
        try {
            // Load active loan and payment history
            await this.loadActiveLoan();
            await this.loadPaymentHistory();
            
            const loanPaymentsContent = document.getElementById('loanPaymentsContent');
            if (loanPaymentsContent) {
                if (!this.activeLoan) {
                    loanPaymentsContent.innerHTML = this.generateEmptyState();
                } else {
                    loanPaymentsContent.innerHTML = this.generatePaymentInterface();
                    this.setupEventListeners();
                }
            }
        } catch (error) {
            console.error('Error loading loan payments:', error);
            const loanPaymentsContent = document.getElementById('loanPaymentsContent');
            if (loanPaymentsContent) {
                loanPaymentsContent.innerHTML = this.generateErrorState(error.message);
            }
        }
    }

    // Load active loan and calculate installment
    async loadActiveLoan() {
        try {
            const result = await apiCall(`/loans/active/${this.userDashboard.getUser().user_id}`);
            this.activeLoan = result.activeLoan || null;
            
            if (this.activeLoan) {
                // Calculate minimum installment using same formula as backend
                const userBalance = this.userDashboard.getUser().balance || 0;
                const ratio = 0.02 / 3; // 0.006667
                const baseInstallment = ratio * (this.activeLoan.loan_amount * this.activeLoan.loan_amount) / userBalance;
                const roundedInstallment = Math.ceil(baseInstallment / 5) * 5;
                this.minInstallment = Math.max(roundedInstallment, 20);
                
                // Check if this is the final payment (adjust minimum)
                if (this.activeLoan.remaining_amount <= this.minInstallment) {
                    this.minInstallment = this.activeLoan.remaining_amount;
                }
            }
        } catch (error) {
            console.error('Error loading active loan:', error);
            this.activeLoan = null;
        }
    }

    // Load payment history
    async loadPaymentHistory() {
        try {
            const result = await apiCall(`/loans/payments/${this.userDashboard.getUser().user_id}`);
            this.paymentHistory = result.payments || [];
        } catch (error) {
            console.error('Error loading payment history:', error);
            this.paymentHistory = [];
        }
    }

    // Generate empty state
    generateEmptyState() {
        return `
            <div class="empty-state modern">
                <div class="empty-icon">
                    <i class="fas fa-check-circle" style="color: #10b981;"></i>
                </div>
                <h3>تم إكمال جميع القروض</h3>
                <p>لا يوجد لديك قروض نشطة تحتاج لسداد. جميع قروضك مكتملة!</p>
                <div class="action-buttons" style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button onclick="window.userDashboardLoader.switchToTab('loan')" class="btn btn-primary">
                        <i class="fas fa-plus"></i> طلب قرض جديد
                    </button>
                    <button onclick="window.userDashboardLoader.switchToTab('loan-history')" class="btn btn-outline">
                        <i class="fas fa-history"></i> عرض تاريخ القروض
                    </button>
                </div>
            </div>
        `;
    }

    // Generate error state
    generateErrorState(errorMessage) {
        return `
            <div class="error-state modern">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>خطأ في تحميل البيانات</h3>
                <p>${errorMessage}</p>
                <button onclick="loanPaymentsTab.load()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Generate modern payment interface
    generatePaymentInterface() {
        const progressPercent = ((this.activeLoan.loan_amount - this.activeLoan.remaining_amount) / this.activeLoan.loan_amount * 100).toFixed(1);
        
        return `
            <div class="loan-payment-container modern">
                <!-- Loan Overview Card -->
                <div class="loan-overview-card">
                    <div class="loan-header">
                        <div class="loan-icon">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <div class="loan-info">
                            <h3>قرضك النشط</h3>
                            <div class="loan-amount">${formatCurrency(this.activeLoan.loan_amount)}</div>
                        </div>
                        <div class="loan-status">
                            <span class="status-badge active">نشط</span>
                        </div>
                    </div>
                    
                    <div class="loan-progress">
                        <div class="progress-info">
                            <div class="progress-item">
                                <label>المبلغ المسدد</label>
                                <span class="amount paid">${formatCurrency(this.activeLoan.paid_amount || 0)}</span>
                            </div>
                            <div class="progress-item">
                                <label>المتبقي</label>
                                <span class="amount remaining">${formatCurrency(this.activeLoan.remaining_amount)}</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressPercent}% مكتمل</div>
                    </div>
                </div>

                <!-- Payment Form -->
                <div class="payment-form-card">
                    <div class="form-header">
                        <h4><i class="fas fa-credit-card"></i> دفع قسط</h4>
                        <p>يمكنك دفع القسط الشهري أو أي مبلغ لتسديد القرض</p>
                    </div>
                    
                    <form id="loanPaymentForm" class="payment-form">
                        <div class="form-group">
                            <label for="paymentAmount">مبلغ الدفع (د.ك)</label>
                            <div class="amount-input-container">
                                <input type="number" 
                                       id="paymentAmount" 
                                       name="amount" 
                                       step="0.001" 
                                       min="${this.minInstallment}" 
                                       max="${this.activeLoan.remaining_amount}"
                                       value="${this.minInstallment}"
                                       required>
                                <button type="button" class="btn-quick-fill" onclick="loanPaymentsTab.fillMinimum()">
                                    القسط المطلوب
                                </button>
                            </div>
                            <div class="form-help">
                                الحد الأدنى: <strong>${formatCurrency(this.minInstallment)}</strong> | 
                                الحد الأقصى: <strong>${formatCurrency(this.activeLoan.remaining_amount)}</strong>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="paymentMemo">ملاحظات (اختياري)</label>
                            <textarea id="paymentMemo" 
                                      name="memo" 
                                      rows="3" 
                                      placeholder="اكتب أي ملاحظات إضافية..."></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-large">
                                <i class="fas fa-paper-plane"></i>
                                إرسال الدفعة
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Payment Info -->
                <div class="payment-info-card">
                    <div class="info-header">
                        <i class="fas fa-info-circle"></i>
                        <h5>معلومات مهمة</h5>
                    </div>
                    <ul class="info-list">
                        <li>سيتم إرسال طلب الدفع للإدارة للموافقة</li>
                        <li>الحد الأدنى للدفع هو ${formatCurrency(this.minInstallment)}</li>
                        <li>يمكنك دفع كامل المبلغ المتبقي لإنهاء القرض</li>
                        <li>ستصلك إشعار عند موافقة الإدارة على الدفعة</li>
                    </ul>
                </div>

                ${this.generatePaymentHistorySection()}
            </div>
        `;
    }

    // Generate payment history section
    generatePaymentHistorySection() {
        if (!this.paymentHistory || this.paymentHistory.length === 0) {
            return `
                <div class="payment-info-card">
                    <div class="info-header">
                        <i class="fas fa-history"></i>
                        <h5>تاريخ المدفوعات</h5>
                    </div>
                    <div class="empty-state modern" style="padding: 20px;">
                        <div class="empty-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <p>لا توجد دفعات سابقة</p>
                    </div>
                </div>
            `;
        }

        const currentLoanPayments = this.paymentHistory.filter(payment => 
            payment.target_loan_id === this.activeLoan.loan_id
        );

        return `
            <div class="payment-info-card">
                <div class="info-header">
                    <i class="fas fa-history"></i>
                    <h5>تاريخ المدفوعات (${currentLoanPayments.length})</h5>
                    <button class="btn btn-outline" onclick="loanPaymentsTab.togglePaymentHistory()" style="padding: 8px 16px; font-size: 14px;">
                        <i class="fas fa-chevron-down" id="historyToggleIcon"></i>
                        عرض التفاصيل
                    </button>
                </div>
                <div id="paymentHistoryList" style="display: none; margin-top: 16px;">
                    ${currentLoanPayments.map(payment => this.generatePaymentHistoryItem(payment)).join('')}
                </div>
            </div>
        `;
    }

    // Generate individual payment history item
    generatePaymentHistoryItem(payment) {
        const statusClass = payment.status === 'accepted' ? 'success' : 
                           payment.status === 'rejected' ? 'error' : 'warning';
        const statusText = payment.status === 'accepted' ? 'موافق عليه' : 
                          payment.status === 'rejected' ? 'مرفوض' : 'معلق';
        const statusIcon = payment.status === 'accepted' ? 'fa-check-circle' : 
                          payment.status === 'rejected' ? 'fa-times-circle' : 'fa-clock';

        return `
            <div class="form-group" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <strong style="font-size: 18px; color: #1f2937;">${formatCurrency(payment.credit)} د.ك</strong>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                            <i class="fas fa-calendar"></i> ${formatDate(payment.date)}
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </span>
                </div>
                ${payment.memo ? `<div style="color: #4b5563; font-size: 14px; margin-bottom: 4px;"><strong>الملاحظة:</strong> ${payment.memo}</div>` : ''}
                ${payment.admin_name ? `<div style="color: #9ca3af; font-size: 12px;">معتمد من: ${payment.admin_name}</div>` : ''}
            </div>
        `;
    }

    // Toggle payment history visibility
    togglePaymentHistory() {
        const historyList = document.getElementById('paymentHistoryList');
        const toggleIcon = document.getElementById('historyToggleIcon');
        
        if (historyList.style.display === 'none' || historyList.style.display === '') {
            historyList.style.display = 'block';
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        } else {
            historyList.style.display = 'none';
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const form = document.getElementById('loanPaymentForm');
        const amountInput = document.getElementById('paymentAmount');

        if (amountInput) {
            amountInput.addEventListener('input', () => {
                this.validateAmount();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePaymentSubmission();
            });
        }
    }

    // Fill minimum amount
    fillMinimum() {
        const amountInput = document.getElementById('paymentAmount');
        if (amountInput) {
            amountInput.value = this.minInstallment;
            this.validateAmount();
        }
    }

    // Validate payment amount
    validateAmount() {
        const amountInput = document.getElementById('paymentAmount');
        const amount = parseFloat(amountInput.value);
        
        if (isNaN(amount) || amount < this.minInstallment) {
            amountInput.setCustomValidity(`الحد الأدنى ${formatCurrency(this.minInstallment)}`);
            return false;
        } else if (amount > this.activeLoan.remaining_amount) {
            amountInput.setCustomValidity(`الحد الأقصى ${formatCurrency(this.activeLoan.remaining_amount)}`);
            return false;
        } else {
            amountInput.setCustomValidity('');
            return true;
        }
    }

    // Handle payment submission
    async handlePaymentSubmission() {
        const form = document.getElementById('loanPaymentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        const amount = parseFloat(data.amount);
        
        // Validate amount
        if (!this.validateAmount()) {
            return;
        }

        if (amount > this.activeLoan.remaining_amount) {
            showToast('المبلغ أكبر من المتبقي من القرض', 'error');
            return;
        }

        try {
            showLoading(true);
            const result = await apiCall('/loans/payment', 'POST', {
                amount: amount,
                memo: data.memo || 'تسديد قسط القرض'
            });
            
            showToast(result.message, 'success');
            
            // Refresh the loan data
            await this.load();
            
            // Refresh the main dashboard to update loan status
            if (this.userDashboard && this.userDashboard.refreshStats) {
                await this.userDashboard.refreshStats();
            }
            
            // Clear form
            form.reset();
            document.getElementById('paymentAmount').value = this.minInstallment;
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Make LoanPaymentsTab globally available
window.LoanPaymentsTab = LoanPaymentsTab;