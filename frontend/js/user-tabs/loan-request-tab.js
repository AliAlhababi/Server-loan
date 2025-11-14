// Loan Request Tab Module
// Handles loan request functionality and eligibility checking

class LoanRequestTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.eligibility = null;
        this.loanRequests = [];
    }

    // Load loan request content
    async load() {
        const loanContent = document.getElementById('loanContent');
        if (loanContent) {
            loanContent.innerHTML = `
                <div class="loan-request-container">
                    <!-- Loan Request Form -->
                    <div class="loan-request-form-section" id="loanRequestFormSection" style="display: none;">
                        <h3><i class="fas fa-file-contract"></i> طلب قرض جديد</h3>
                        
                        <form id="loanRequestForm">
                            <div class="form-group">
                                <label for="requestedAmount">مبلغ القرض المطلوب (د.ك)</label>
                                <input type="number" id="requestedAmount" name="amount" 
                                       step="0.001" min="100" required>
                                <small class="form-help">
                                    الحد الأقصى: <span id="maxLoanDisplay">0</span> دينار
                                </small>
                            </div>
                            
                            <div class="calculation-results" id="calculationResults" style="display: none;">
                                <div class="results-card">
                                    <h4><i class="fas fa-calculator"></i> تفاصيل القرض</h4>
                                    <div class="results-grid">
                                        <div class="result-item">
                                            <label>القسط الشهري:</label>
                                            <span class="amount" id="monthlyInstallment">0</span>
                                        </div>
                                        <div class="result-item">
                                            <label>مدة السداد:</label>
                                            <span id="installmentPeriod">0 شهر</span>
                                        </div>
                                        <div class="result-item">
                                            <label>إجمالي المبلغ المسدد:</label>
                                            <span class="amount" id="totalAmount">0</span>
                                        </div>
                                        <div class="result-item">
                                            <label>إجمالي القرض:</label>
                                            <span class="amount" id="processingFee">0</span>
                                        </div>
                                        <div class="result-item" id="lastInstallmentInfo" style="display: none;">
                                            <label>القسط الأخير:</label>
                                            <span class="amount" id="lastInstallmentAmount">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" id="calculateBtn" class="btn btn-secondary">
                                    <i class="fas fa-calculator"></i> حساب التفاصيل
                                </button>
                                <button type="submit" id="submitLoanBtn" class="btn btn-primary" disabled>
                                    <i class="fas fa-paper-plane"></i> إرسال طلب القرض
                                </button>
                            </div>
                            
                            <!-- Eligibility Status -->
                            <div class="eligibility-status" id="eligibilityStatus">
                                <div class="loading-state">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>جاري التحقق من الأهلية...</span>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Not Eligible Message -->
                    <div class="not-eligible-section" id="notEligibleSection" style="display: none;">
                        <div class="error-state">
                            <div class="error-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h4>غير مؤهل لطلب قرض حالياً</h4>
                            <p>يرجى مراجعة الشروط والأحكام أو التواصل مع الإدارة</p>
                        </div>
                    </div>

                    <!-- Loan Requests History -->
                    <div class="loan-requests-history" id="loanRequestsHistory">
                        <div class="table-header">
                            <h4><i class="fas fa-history"></i> طلبات القروض السابقة</h4>
                            <span class="requests-count" id="requestsCount">0 طلب</span>
                        </div>
                        <div class="requests-container" id="requestsContainer">
                            <!-- Will be populated by loadLoanRequests -->
                        </div>
                    </div>
                </div>
            `;
            
            await this.loadEligibility();
            await this.loadLoanRequests();
            this.setupEventListeners();
        }
    }

    // Load loan eligibility
    async loadEligibility() {
        try {
            const result = await apiCall(`/users/loans/eligibility/${this.userDashboard.getUser().user_id}`);
            this.eligibility = result.eligibility;
            
            const formSection = document.getElementById('loanRequestFormSection');
            const notEligibleSection = document.getElementById('notEligibleSection');
            const eligibilityStatus = document.getElementById('eligibilityStatus');
            
            if (this.eligibility.eligible) {
                formSection.style.display = 'block';
                notEligibleSection.style.display = 'none';
                
                // Update max loan amount
                document.getElementById('maxLoanDisplay').textContent = formatCurrency(this.eligibility.maxLoanAmount);
                document.getElementById('requestedAmount').setAttribute('max', this.eligibility.maxLoanAmount);
                
                // Show success status
                eligibilityStatus.innerHTML = `
                    <div class="eligibility-success-minimal">
                        <i class="fas fa-check-circle"></i>
                        <span>مؤهل لطلب قرض - الحد الأقصى: ${formatCurrency(this.eligibility.maxLoanAmount)}</span>
                    </div>
                `;
                
            } else {
                formSection.style.display = 'block'; // Keep form visible but show what's missing
                notEligibleSection.style.display = 'none';
                
                // Show what's missing in minimal way
                const failedTests = this.getFailedTests();
                eligibilityStatus.innerHTML = `
                    <div class="eligibility-missing-minimal">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>المطلوب لطلب القرض:</span>
                        <div class="missing-items">
                            ${failedTests.map(test => `<span class="missing-item">${test}</span>`).join('')}
                        </div>
                    </div>
                `;
                
                // Disable submit button
                document.getElementById('submitLoanBtn').disabled = true;
            }
            
        } catch (error) {
            console.error('Error loading loan eligibility:', error);
            const eligibilityStatus = document.getElementById('eligibilityStatus');
            eligibilityStatus.innerHTML = `
                <div class="eligibility-error-minimal">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>خطأ في التحقق من الأهلية</span>
                </div>
            `;
        }
    }

    // Load loan requests history
    async loadLoanRequests() {
        try {
            const result = await apiCall(`/loans/history/${this.userDashboard.getUser().user_id}`);
            this.loanRequests = result.loans || [];
            
            const requestsContainer = document.getElementById('requestsContainer');
            const requestsCount = document.getElementById('requestsCount');
            
            if (requestsContainer) {
                if (this.loanRequests.length === 0) {
                    requestsContainer.innerHTML = this.generateEmptyRequestsState();
                } else {
                    requestsContainer.innerHTML = this.generateRequestsTable();
                }
            }
            
            if (requestsCount) {
                requestsCount.textContent = `${this.loanRequests.length} طلب`;
            }
            
        } catch (error) {
            console.error('Error loading loan requests:', error);
            const requestsContainer = document.getElementById('requestsContainer');
            if (requestsContainer) {
                requestsContainer.innerHTML = this.generateErrorRequestsState(error.message);
            }
        }
    }

    // Generate empty requests state
    generateEmptyRequestsState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-file-contract"></i>
                </div>
                <h4>لا توجد طلبات قروض</h4>
                <p>لم تقم بطلب أي قروض حتى الآن</p>
            </div>
        `;
    }

    // Generate error requests state
    generateErrorRequestsState(errorMessage) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>خطأ في تحميل طلبات القروض</h4>
                <p>${errorMessage}</p>
                <button onclick="loanRequestTab.loadLoanRequests()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Generate requests table
    generateRequestsTable() {
        return `
            <div class="requests-table-container">
                <table class="requests-table">
                    <thead>
                        <tr>
                            <th>تاريخ الطلب</th>
                            <th>مبلغ القرض</th>
                            <th>القسط الشهري</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.loanRequests.map(request => this.generateRequestRow(request)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Generate single request row
    generateRequestRow(request) {
        return `
            <tr class="request-row ${request.status}">
                <td class="date-cell">
                    <i class="fas fa-calendar-alt"></i>
                    ${new Date(request.request_date).toLocaleDateString('en-US')}
                    <small>${new Date(request.request_date).toLocaleTimeString('ar-KW', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</small>
                </td>
                <td class="amount-cell">
                    <span class="amount">
                        ${formatCurrency(request.loan_amount)}
                    </span>
                </td>
                <td class="installment-cell">
                    <span class="installment">
                        ${formatCurrency(request.installment_amount)}
                    </span>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${request.status}">
                        <i class="fas ${this.getRequestStatusIcon(request.status)}"></i>
                        ${this.getRequestStatusText(request.status)}
                    </span>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button onclick="loanRequestTab.viewRequest(${request.loan_id})" 
                                class="btn btn-small btn-info" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.status === 'pending' ? `
                            <button onclick="loanRequestTab.cancelLoanRequest(${request.loan_id})" 
                                    class="btn btn-small btn-danger" title="إلغاء الطلب">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    // Get request status icon
    getRequestStatusIcon(status) {
        switch (status) {
            case 'approved': return 'fa-check-circle';
            case 'pending': return 'fa-clock';
            case 'rejected': return 'fa-times-circle';
            default: return 'fa-question-circle';
        }
    }

    // Get request status text
    getRequestStatusText(status) {
        switch (status) {
            case 'approved': return 'موافق عليه';
            case 'pending': return 'معلق';
            case 'rejected': return 'مرفوض';
            default: return 'غير محدد';
        }
    }

    // View request details
    viewRequest(requestId) {
        const request = this.loanRequests.find(r => r.loan_id === requestId);
        if (!request) return;

        const approvalDateText = request.approval_date ? 
            new Date(request.approval_date).toLocaleDateString('ar-KW') : 'لم يتم الرد بعد';

        const modalHtml = `
            <div class="request-details-modal">
                <h3><i class="fas fa-file-contract"></i> تفاصيل طلب القرض</h3>
                <div class="request-details">
                    <div class="detail-row">
                        <label>رقم الطلب:</label>
                        <span>#${request.loan_id}</span>
                    </div>
                    <div class="detail-row">
                        <label>تاريخ الطلب:</label>
                        <span>${new Date(request.request_date).toLocaleString('ar-KW')}</span>
                    </div>
                    <div class="detail-row">
                        <label>مبلغ القرض:</label>
                        <span class="amount">${formatCurrency(request.loan_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>القسط الشهري:</label>
                        <span class="amount">${formatCurrency(request.installment_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>الحالة:</label>
                        <span class="status-badge ${request.status}">
                            <i class="fas ${this.getRequestStatusIcon(request.status)}"></i>
                            ${this.getRequestStatusText(request.status)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>تاريخ الرد:</label>
                        <span>${approvalDateText}</span>
                    </div>
                    ${request.notes ? `
                        <div class="detail-row">
                            <label>ملاحظات:</label>
                            <span>${request.notes}</span>
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
        
        showModal('تفاصيل طلب القرض', modalHtml);
    }

    // Cancel loan request
    async cancelLoanRequest(requestId) {
        if (!confirm('هل أنت متأكد من إلغاء طلب القرض؟ لن يمكنك التراجع عن هذا الإجراء.')) {
            return;
        }

        try {
            showLoading(true);
            const result = await apiCall(`/loans/cancel-request/${requestId}`, 'DELETE');
            showToast(result.message, 'success');
            
            // Refresh loan requests and eligibility
            await this.loadLoanRequests();
            await this.loadEligibility();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Get failed tests in simple Arabic
    getFailedTests() {
        const tests = this.eligibility.tests || {};
        const failed = [];
        
        if (!tests.notBlocked) failed.push('إلغاء حظر الحساب');
        if (!tests.joiningFeeApproved) failed.push('اعتماد رسوم الانضمام');
        if (!tests.hasMinimumBalance) failed.push('رصيد 500 دينار كحد أدنى');
        if (!tests.oneYearRegistration) failed.push('مرور عام على التسجيل');
        if (!tests.noActiveLoans) failed.push('إغلاق القرض النشط');
        if (!tests.thirtyDaysSinceClosure) {
            const daysMsg = eligibility.daysUntilNextLoan > 0
                ? `انتظار ${eligibility.daysUntilNextLoan} يوم من إغلاق آخر قرض`
                : 'انتظار 30 يوم من إغلاق آخر قرض';
            failed.push(daysMsg);
        }
        
        return failed;
    }


    // Setup event listeners
    setupEventListeners() {
        const amountInput = document.getElementById('requestedAmount');
        const calculateBtn = document.getElementById('calculateBtn');
        const submitBtn = document.getElementById('submitLoanBtn');
        const form = document.getElementById('loanRequestForm');

        if (amountInput) {
            amountInput.addEventListener('input', () => {
                this.handleAmountChange();
            });
        }

        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculateLoan();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoanRequest(e);
            });
        }
    }

    // Handle amount change
    handleAmountChange() {
        const amount = parseFloat(document.getElementById('requestedAmount').value);
        const resultsDiv = document.getElementById('calculationResults');
        const submitBtn = document.getElementById('submitLoanBtn');
        
        if (!amount || amount <= 0) {
            resultsDiv.style.display = 'none';
            submitBtn.disabled = true;
            return;
        }

        if (this.eligibility && amount > this.eligibility.maxLoanAmount) {
            showToast(`المبلغ أكبر من الحد المسموح: ${formatCurrency(this.eligibility.maxLoanAmount)}`, 'error');
            resultsDiv.style.display = 'none';
            submitBtn.disabled = true;
            return;
        }

        // Auto-calculate when amount changes
        this.calculateLoan(amount);
    }

    // Calculate loan details
    calculateLoan(amount = null) {
        const loanAmount = amount || parseFloat(document.getElementById('requestedAmount').value);
        
        if (!loanAmount || loanAmount <= 0) {
            showToast('يرجى إدخال مبلغ القرض', 'error');
            return;
        }

        if (!this.userDashboard.getUser().balance || this.userDashboard.getUser().balance <= 0) {
            showToast('رصيدك الحالي غير كافي لحساب القرض', 'error');
            return;
        }

        try {
            // Calculate installment using the same formula as backend
            const installment = this.calculateInstallment(loanAmount, this.userDashboard.getUser().balance);
            const period = this.calculateInstallmentPeriod(loanAmount, installment);
            
            // Calculate exact repayment (always equals loan amount)
            const exactPeriod = loanAmount / installment;
            const wholePeriods = Math.floor(exactPeriod);
            const remainder = loanAmount - (wholePeriods * installment);
            const lastInstallment = remainder > 0 ? parseFloat(remainder.toFixed(3)) : installment;
            const totalAmount = loanAmount; // Always equals loan amount exactly
            // Update display
            document.getElementById('monthlyInstallment').textContent = formatCurrency(installment);
            document.getElementById('installmentPeriod').textContent = `${period} شهر`;
            document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
            document.getElementById('processingFee').textContent = formatCurrency(loanAmount);
            
            // Show last installment if different
            const lastInstallmentInfo = document.getElementById('lastInstallmentInfo');
            if (remainder > 0 && Math.abs(lastInstallment - installment) > 0.001) {
                document.getElementById('lastInstallmentAmount').textContent = formatCurrency(lastInstallment);
                lastInstallmentInfo.style.display = 'block';
            } else {
                lastInstallmentInfo.style.display = 'none';
            }
            
            // Show results
            document.getElementById('calculationResults').style.display = 'block';
            document.getElementById('submitLoanBtn').disabled = false;
            
        } catch (error) {
            console.error('Loan calculation error:', error);
            showToast('خطأ في حساب القرض', 'error');
        }
    }

    // Calculate loan installment using centralized calculator
    calculateInstallment(loanAmount, userBalance) {
        if (window.LoanCalculator) {
            try {
                const calculator = new window.LoanCalculator();
                const result = calculator.calculateInstallment(loanAmount, userBalance);
                return result.installment;
            } catch (error) {
                console.error('Calculator error:', error);
            }
        }
        
        // Fallback calculation if calculator not available
        const ratio = 0.006667; // 0.02 / 3
        const baseInstallment = ratio * (loanAmount * loanAmount) / userBalance;
        const roundedInstallment = Math.ceil(baseInstallment / 5) * 5;
        return Math.max(roundedInstallment, 20); // Minimum 20 KWD
    }

    // Calculate installment period using centralized calculator
    calculateInstallmentPeriod(loanAmount, installment) {
        if (window.LoanCalculator) {
            try {
                const calculator = new window.LoanCalculator();
                return calculator.calculateInstallmentPeriod(loanAmount, installment);
            } catch (error) {
                console.error('Period calculation error:', error);
            }
        }
        
        // Fallback calculation if calculator not available
        if (!loanAmount || !installment || installment <= 0) {
            return 24; // Default fallback
        }
        const period = Math.ceil(loanAmount / installment);
        return Math.max(6, period); // Minimum 6 months
    }

    // Handle loan request submission
    async handleLoanRequest(e) {
        const amount = parseFloat(document.getElementById('requestedAmount').value);
        const installment = this.calculateInstallment(amount, this.userDashboard.getUser().balance);

        try {
            showLoading(true);
            const result = await apiCall('/loans/request', 'POST', {
                amount: amount,
                installment: installment
            });

            showToast(result.message, 'success');
            
            // Refresh eligibility and loan requests after request
            await this.loadEligibility();
            await this.loadLoanRequests();
            
            // Clear form
            document.getElementById('loanRequestForm').reset();
            document.getElementById('calculationResults').style.display = 'none';
            document.getElementById('submitLoanBtn').disabled = true;
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

}

// Make LoanRequestTab globally available
window.LoanRequestTab = LoanRequestTab;