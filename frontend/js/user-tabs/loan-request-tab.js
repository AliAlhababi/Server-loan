// Loan Request Tab Module
// Handles loan request functionality and eligibility checking

class LoanRequestTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
        this.eligibility = null;
    }

    // Load loan request content
    async load() {
        const loanContent = document.getElementById('loanContent');
        if (loanContent) {
            loanContent.innerHTML = `
                <div class="loan-request-container">
                    <!-- Priority Action Button -->
                    <div class="priority-action-section">
                        <button onclick="loanRequestTab.scrollToCalculator()" class="priority-btn loan-calc-btn">
                            <div class="btn-icon">
                                <i class="fas fa-calculator"></i>
                            </div>
                            <div class="btn-content">
                                <h3>حاسبة القروض</h3>
                                <p>احسب القسط المطلوب قبل طلب القرض</p>
                            </div>
                            <div class="btn-arrow">
                                <i class="fas fa-chevron-left"></i>
                            </div>
                        </button>
                    </div>

                    <!-- Loan Eligibility Section -->
                    <div class="loan-eligibility-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3><i class="fas fa-check-circle"></i> شروط طلب القرض</h3>
                            <button onclick="loanRequestTab.refreshEligibility()" class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" title="تحديث حالة الأهلية">
                                <i class="fas fa-sync-alt"></i> تحديث
                            </button>
                        </div>
                        <div class="eligibility-container" id="loanEligibilityContainer">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>جاري التحقق من الأهلية...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Loan Request Form -->
                    <div class="loan-request-form-section" id="loanRequestFormSection" style="display: none;">
                        <h3><i class="fas fa-file-contract"></i> طلب قرض جديد</h3>
                        <div class="form-info-card">
                            <i class="fas fa-info-circle"></i>
                            <div>
                                <strong>ملاحظة مهمة:</strong>
                                <p>الحد الأدنى للقسط الشهري هو 2% من القرض المطلوب مقسوم على الرصيد، مع حد أدنى 20 د.ك</p>
                            </div>
                        </div>
                        
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
                        </form>
                    </div>

                    <!-- Loan Calculator Section -->
                    <div class="loan-calculator-section" id="loanCalculatorSection">
                        <h3><i class="fas fa-calculator"></i> حاسبة القروض</h3>
                        <div class="calculator-container">
                            <!-- This will be loaded from the loan calculator -->
                            <div id="embeddedCalculator">
                                <div class="loading-state">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>جاري تحميل الحاسبة...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            await this.loadEligibility();
            this.setupEventListeners();
            this.embedCalculator();
        }
    }

    // Load loan eligibility
    async loadEligibility() {
        try {
            const result = await apiCall(`/users/loans/eligibility/${this.userDashboard.getUser().user_id}`);
            this.eligibility = result.eligibility;
            
            
            const container = document.getElementById('loanEligibilityContainer');
            const formSection = document.getElementById('loanRequestFormSection');
            
            if (this.eligibility.eligible) {
                container.innerHTML = this.generateEligibilitySuccess();
                formSection.style.display = 'block';
                
                // Update max loan amount
                document.getElementById('maxLoanDisplay').textContent = formatCurrency(this.eligibility.maxLoanAmount);
                document.getElementById('requestedAmount').setAttribute('max', this.eligibility.maxLoanAmount);
                
            } else {
                container.innerHTML = this.generateEligibilityError();
                formSection.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error loading loan eligibility:', error);
            const container = document.getElementById('loanEligibilityContainer');
            container.innerHTML = this.generateEligibilityErrorState(error.message);
        }
    }

    // Generate eligibility success message
    generateEligibilitySuccess() {
        const testResults = this.eligibility.tests || {};
        
        const testList = [
            { key: 'notBlocked', label: 'الحساب غير محظور', icon: 'fa-user-check' },
            { key: 'joiningFeeApproved', label: 'رسوم الانضمام معتمدة', icon: 'fa-check-circle' },
            { key: 'hasMinimumBalance', label: 'الرصيد أكبر من 500 د.ك', icon: 'fa-wallet' },
            { key: 'oneYearRegistration', label: 'مضى عام على التسجيل', icon: 'fa-calendar' },
            { key: 'noActiveLoans', label: 'لا يوجد قرض نشط', icon: 'fa-ban' },
            { key: 'hasSubscriptionPayment', label: 'دفع الاشتراكات', icon: 'fa-credit-card' },
            { key: 'thirtyDaysSinceClosure', label: '30 يوم من إغلاق آخر قرض', icon: 'fa-clock' }
        ];

        const testsList = testList.map(test => `
            <li class="eligibility-test test-pass">
                <div class="test-icon">
                    <i class="fas ${test.icon}"></i>
                </div>
                <div class="test-content">
                    <span class="test-label">${test.label}</span>
                    <div class="test-status">
                        <i class="fas fa-check"></i>
                        <span>متحقق</span>
                    </div>
                </div>
            </li>
        `).join('');

        return `
            <div class="eligibility-success">
                <div class="success-header">
                    <i class="fas fa-check-circle"></i>
                    <h4>مؤهل لطلب قرض</h4>
                </div>
                <div class="eligibility-tests">
                    <ul class="tests-list">
                        ${testsList}
                    </ul>
                </div>
                <div class="eligibility-details">
                    <div class="detail-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>الحد الأقصى للقرض: <strong>${formatCurrency(this.eligibility.maxLoanAmount)}</strong></span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>مدة السداد: <strong>حسب مبلغ القرض والقسط</strong></span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-percentage"></i>
                        <span>الحد الأدنى للقسط: <strong>2% من مربع القرض ÷ الرصيد</strong></span>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate eligibility error message with individual tests
    generateEligibilityError() {
        const testResults = this.eligibility.tests || {};
        const messages = this.eligibility.messages || [];
        
        
        const testList = [
            { key: 'notBlocked', label: 'الحساب غير محظور', icon: 'fa-user-check' },
            { key: 'joiningFeeApproved', label: 'رسوم الانضمام معتمدة', icon: 'fa-check-circle' },
            { key: 'hasMinimumBalance', label: 'الرصيد أكبر من 500 د.ك', icon: 'fa-wallet' },
            { key: 'oneYearRegistration', label: 'مضى عام على التسجيل', icon: 'fa-calendar' },
            { key: 'noActiveLoans', label: 'لا يوجد قرض نشط', icon: 'fa-ban' },
            { key: 'hasSubscriptionPayment', label: 'دفع الاشتراكات', icon: 'fa-credit-card' },
            { key: 'thirtyDaysSinceClosure', label: '30 يوم من إغلاق آخر قرض', icon: 'fa-clock' }
        ];

        const testsList = testList.map(test => {
            // Handle case where testResults might be undefined or the test key doesn't exist
            const passed = testResults[test.key] === true;
            const statusClass = passed ? 'test-pass' : 'test-fail';
            const statusIcon = passed ? 'fa-check' : 'fa-times';
            
            
            return `
                <li class="eligibility-test ${statusClass}">
                    <div class="test-icon">
                        <i class="fas ${test.icon}"></i>
                    </div>
                    <div class="test-content">
                        <span class="test-label">${test.label}</span>
                        <div class="test-status">
                            <i class="fas ${statusIcon}"></i>
                            <span>${passed ? 'متحقق' : 'غير متحقق'}</span>
                        </div>
                    </div>
                </li>
            `;
        }).join('');

        return `
            <div class="eligibility-error">
                <div class="error-header">
                    <i class="fas fa-list-check"></i>
                    <h4>فحص شروط طلب القرض</h4>
                </div>
                <div class="eligibility-tests">
                    <ul class="tests-list">
                        ${testsList}
                    </ul>
                </div>
                ${messages.length > 0 ? `
                    <div class="error-messages">
                        <h5>المشاكل التي تحتاج إصلاح:</h5>
                        <ul class="messages-list">
                            ${messages.map(msg => `<li><i class="fas fa-exclamation-circle"></i> ${msg}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                </div>
                <div class="error-help">
                    <div class="help-card">
                        <i class="fas fa-lightbulb"></i>
                        <div>
                            <strong>للحصول على المساعدة:</strong>
                            <p>يرجى مراجعة الشروط والأحكام أو التواصل مع الإدارة لحل هذه المشاكل</p>
                        </div>
                    </div>
                </div>
                <div class="error-actions">
                    <button onclick="loanRequestTab.loadEligibility()" class="btn btn-secondary">
                        <i class="fas fa-redo"></i> إعادة التحقق
                    </button>
                </div>
            </div>
        `;
    }

    // Generate eligibility error state
    generateEligibilityErrorState(errorMessage) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>خطأ في التحقق من الأهلية</h4>
                <p>${errorMessage}</p>
                <button onclick="loanRequestTab.loadEligibility()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
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

    // Calculate loan installment (same as UserDashboard)
    calculateInstallment(loanAmount, userBalance) {
        const ratio = 0.02 / 3; // 0.006667
        const baseInstallment = ratio * (loanAmount * loanAmount) / userBalance;
        const roundedInstallment = Math.ceil(baseInstallment / 5) * 5;
        return Math.max(roundedInstallment, 20); // Minimum 20 KWD
    }

    // Calculate installment period (same as backend)
    calculateInstallmentPeriod(loanAmount, installment) {
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
            
            // Refresh eligibility after request
            await this.loadEligibility();
            
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

    // Embed loan calculator
    embedCalculator() {
        // Load the loan calculator component
        if (window.LoanCalculator) {
            const calculator = new window.LoanCalculator();
            const container = document.getElementById('embeddedCalculator');
            if (container) {
                calculator.render(container);
            }
        } else {
            // Fallback if calculator not available
            document.getElementById('embeddedCalculator').innerHTML = `
                <div class="calculator-placeholder">
                    <i class="fas fa-calculator"></i>
                    <p>حاسبة القروض غير متاحة حالياً</p>
                    <small>يرجى استخدام نموذج طلب القرض أعلاه للحصول على التفاصيل</small>
                </div>
            `;
        }
    }

    // Scroll to calculator
    scrollToCalculator() {
        const calculatorSection = document.getElementById('loanCalculatorSection');
        if (calculatorSection) {
            calculatorSection.scrollIntoView({ behavior: 'smooth' });
            // Add highlight effect
            calculatorSection.classList.add('highlight');
            setTimeout(() => {
                calculatorSection.classList.remove('highlight');
            }, 2000);
        }
    }

    // Scroll to form
    scrollToForm() {
        const formSection = document.getElementById('loanRequestFormSection');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Refresh eligibility status
    async refreshEligibility() {
        try {
            showLoading(true);
            
            // First refresh user data to get latest information
            await refreshUserData();
            
            // Then reload eligibility with fresh data
            await this.loadEligibility();
            
            showToast('تم تحديث حالة الأهلية بنجاح', 'success');
        } catch (error) {
            console.error('Error refreshing eligibility:', error);
            showToast('خطأ في تحديث حالة الأهلية', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Make LoanRequestTab globally available
window.LoanRequestTab = LoanRequestTab;