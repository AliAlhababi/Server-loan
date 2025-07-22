// Global variables
let currentUser = null;
let token = localStorage.getItem('authToken');

// DOM elements
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const userInfo = document.getElementById('userInfo');
const userDashboard = document.getElementById('userDashboard');
const adminDashboard = document.getElementById('adminDashboard');
const loadingSpinner = document.getElementById('loadingSpinner');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized, token:', token); // Debug log
    
    if (token) {
        console.log('Token found, verifying...'); // Debug log
        verifyToken();
    } else {
        console.log('No token found, showing login'); // Debug log
        showLogin();
    }
    
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Registration form
    document.getElementById('registerForm').addEventListener('submit', handleRegistration);
    
    // Edit profile form
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    
    // Will form
    
    // Simplified loan form
    document.getElementById('calculateLoanBtn').addEventListener('click', handleLoanCalculation);
    
    // Modal loan confirmation
    document.getElementById('modalLoanConfirmation').addEventListener('change', toggleModalSubmitButton);
    
    // Confirm loan request from modal
    document.getElementById('confirmLoanRequestBtn').addEventListener('click', handleLoanRequestFromModal);
}

// API helper functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
        config.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`/api${endpoint}`, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'خطأ في الخادم');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    if (!userId || !password) {
        showToast('يرجى إدخال رقم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiCall('/auth/login', 'POST', { userId, password });
        
        token = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', token);
        
        showToast(result.message, 'success');
        showDashboard();
        updateCalculatorShortcut();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function verifyToken() {
    showLoading(true);
    
    try {
        console.log('Verifying token:', token); // Debug log
        const result = await apiCall('/auth/me');
        console.log('Token verification result:', result); // Debug log
        currentUser = result.user;
        showDashboard();
        updateCalculatorShortcut();
    } catch (error) {
        console.error('Token verification failed:', error); // Debug log
        localStorage.removeItem('authToken');
        token = null;
        currentUser = null;
        showLogin();
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    token = null;
    currentUser = null;
    updateCalculatorShortcut(); // Hide calculator shortcut
    showLogin();
    showToast('تم تسجيل الخروج بنجاح', 'success');
}

// UI functions
function showLogin() {
    authSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    userInfo.style.display = 'none';
    showAuthTab('login');
}

function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    userInfo.style.display = 'flex';
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    
    if (currentUser.isAdmin) {
        showAdminDashboard();
    } else {
        showUserDashboard();
    }
}

async function showUserDashboard() {
    userDashboard.style.display = 'block';
    adminDashboard.style.display = 'none';
    
    // Update user stats
    document.getElementById('userBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('maxLoanAmount').textContent = formatCurrency(currentUser.maxLoanAmount);
    
    // Load loan eligibility
    await loadLoanEligibility();
    
    // Load user dashboard data
    await loadUserDashboardData();
}

async function showAdminDashboard() {
    userDashboard.style.display = 'none';
    adminDashboard.style.display = 'block';
    
    // Load admin stats
    await loadAdminStats();
}

// User dashboard functions
async function loadUserDashboardData() {
    try {
        const result = await apiCall(`/users/dashboard/${currentUser.user_id}`);
        const dashboard = result.dashboard;
        
        // Update loan status
        if (dashboard.activeLoan) {
            document.getElementById('loanStatus').textContent = `قرض نشط - ${formatCurrency(dashboard.activeLoan.remaining_amount)} متبقي`;
        } else {
            document.getElementById('loanStatus').textContent = 'لا يوجد قرض نشط';
        }
        
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

async function loadLoanEligibility() {
    try {
        const result = await apiCall(`/loans/check-eligibility/${currentUser.user_id}`);
        const eligibility = result.eligibility;
        
        const conditionsList = document.getElementById('loanConditions');
        const loanRequestForm = document.getElementById('loanRequestForm');
        
        conditionsList.innerHTML = '';
        
        // Use backend calculation for registration period (1 year requirement)
        const hasPassedOneYear = eligibility.checks.hasOneYearRegistration;
        const daysUntilOneYear = eligibility.checks.daysUntilOneYear || 0;

        // Display conditions with better formatting - SIMPLIFIED VERSION
        const conditions = [
            { 
                check: !eligibility.checks.hasActiveOrPendingLoan, 
                text: 'عدم وجود قرض حالي مفتوح أو بانتظار الموافقة' 
            },
            { 
                check: hasPassedOneYear, 
                text: daysUntilOneYear > 0 ? 
                      `مرور سنة واحدة على تاريخ التسجيل - باقي ${daysUntilOneYear} يوم` :
                      'مرور سنة واحدة على تاريخ التسجيل' 
            },
            { 
                check: eligibility.checks.hasPassedLastLoanClosure, 
                text: eligibility.checks.daysUntilNextLoan > 0 ? 
                      `مرور 30 يوم على إغلاق آخر قرض - باقي ${eligibility.checks.daysUntilNextLoan} يوم` :
                      'مرور 30 يوم على إغلاق آخر قرض' 
            },
            { 
                check: eligibility.checks.hasRequiredBalance, 
                text: 'رصيد لا يقل عن 500 دينار (الحد الأدنى لطلب القرض)' 
            },
            { 
                check: eligibility.checks.hasSubscriptionFees, 
                text: eligibility.checks.subscriptionDetails ? 
                      `دفع اشتراك 24 شهر - مطلوب ${eligibility.checks.subscriptionDetails.required || 240} د.ك - مدفوع ${(eligibility.checks.subscriptionDetails.paid || 0).toFixed(3)} د.ك` + 
                      (eligibility.checks.subscriptionDetails.pending > 0 ? ` + قيد الانتظار ${eligibility.checks.subscriptionDetails.pending.toFixed(3)} د.ك` : '') :
                      'دفع اشتراك 24 شهر'
            },
            { 
                check: eligibility.checks.hasPassedLastLoanReceived, 
                text: 'مرور 11 شهر على استلام آخر قرض' 
            },
            { 
                check: eligibility.checks.hasJoiningFeeApproved, 
                text: 'دفع رسوم الانضمام 10 د.ك والحصول على موافقة الإدارة' 
            }
        ];
        
        conditions.forEach(condition => {
            const conditionItem = document.createElement('div');
            conditionItem.className = 'condition-item';
            
            const icon = condition.check ? 
                '<i class="fas fa-check"></i>' : 
                '<i class="fas fa-times"></i>';
            
            conditionItem.innerHTML = `
                ${icon}
                <span>${condition.text}</span>
            `;
            
            conditionsList.appendChild(conditionItem);
        });
        
        // Show/hide loan request form
        // Check if all conditions are met (including 1-year requirement)
        const allConditionsMet = conditions.every(condition => condition.check) && eligibility.eligible;
        
        if (allConditionsMet) {
            loanRequestForm.style.display = 'block';
            const maxLoan = Math.min(eligibility.maxLoanAmount, 10000); // Cap at 10,000
            document.getElementById('maxLoanDisplay').textContent = maxLoan.toLocaleString('en-US');
            const loanAmountInput = document.getElementById('simpleLoanAmount');
            if (loanAmountInput) {
                loanAmountInput.max = maxLoan;
            }
        } else {
            loanRequestForm.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Load eligibility error:', error);
        showToast('خطأ في تحميل شروط القرض', 'error');
    }
}

// Handle loan calculation button click
async function handleLoanCalculation() {
    const amount = parseFloat(document.getElementById('simpleLoanAmount').value);
    
    if (!amount) {
        showToast('يرجى إدخال مبلغ القرض', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('مبلغ القرض يجب أن يكون أكبر من صفر', 'error');
        return;
    }
    
    if (amount > 10000) {
        showToast('الحد الأقصى للقرض هو 10,000 دينار', 'error');
        return;
    }
    
    if (amount > currentUser.maxLoanAmount) {
        showToast(`المبلغ يتجاوز الحد الأقصى المسموح لك (${formatCurrency(currentUser.maxLoanAmount)})`, 'error');
        return;
    }
    
    // Use the same calculation logic as dashboard calculator
    const userBalance = parseFloat(currentUser.balance || currentUser.current_balance || 0);
    
    if (userBalance <= 0) {
        showToast('رصيدك الحالي غير كافي لحساب القرض', 'error');
        return;
    }
    
    const calculator = new LoanCalculator();
    
    let calculation;
    try {
        // Use the exact same method as dashboard calculator
        calculation = calculator.calculateInstallment(amount, userBalance);
    } catch (error) {
        console.error('Calculation error:', error);
        showToast('خطأ في حساب القرض: ' + error.message, 'error');
        return;
    }
    
    // Store calculation data for modal using dashboard calculator results
    window.currentLoanCalculation = {
        amount: amount,
        installment: calculation.installment,
        period: calculation.installmentPeriod,
        total: amount, // User repays exactly the loan amount (no interest)
        balance: calculation.balance,
        scenario: calculation.scenario
    };
    
    // Update modal with calculation results
    updateLoanCalculationModal(window.currentLoanCalculation);
    
    // Show the modal
    document.getElementById('loanCalculationModal').style.display = 'block';
}

// Update loan calculation modal with results
function updateLoanCalculationModal(calculation) {
    document.getElementById('modalLoanAmount').textContent = formatCurrency(calculation.amount);
    document.getElementById('modalInstallment').textContent = formatCurrency(calculation.installment);
    document.getElementById('modalPeriod').textContent = calculation.period;
    document.getElementById('modalTotal').textContent = formatCurrency(calculation.total);
    
    // Update confirmation text
    document.getElementById('modalInstallmentNote').textContent = formatCurrency(calculation.installment);
    document.getElementById('modalPeriodNote').textContent = calculation.period;
    document.getElementById('modalTotalNote').textContent = formatCurrency(calculation.total);
    document.getElementById('modalConfirmInstallment').textContent = formatCurrency(calculation.installment);
    
    // Reset confirmation checkbox
    document.getElementById('modalLoanConfirmation').checked = false;
    document.getElementById('confirmLoanRequestBtn').disabled = true;
}

// Toggle submit button based on confirmation checkbox
function toggleModalSubmitButton() {
    const checkbox = document.getElementById('modalLoanConfirmation');
    const submitBtn = document.getElementById('confirmLoanRequestBtn');
    submitBtn.disabled = !checkbox.checked;
}

// Handle actual loan request submission from modal
async function handleLoanRequestFromModal() {
    if (!window.currentLoanCalculation) {
        showToast('خطأ في بيانات القرض', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiCall('/loans/request', 'POST', {
            amount: window.currentLoanCalculation.amount,
            installmentMonths: window.currentLoanCalculation.period
        });
        
        showToast(result.message, 'success');
        
        // Close modal and reset form
        closeLoanCalculationModal();
        document.getElementById('simpleLoanAmount').value = '';
        
        // Reload data
        await loadLoanEligibility();
        await loadUserDashboardData();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Close loan calculation modal
function closeLoanCalculationModal() {
    document.getElementById('loanCalculationModal').style.display = 'none';
    window.currentLoanCalculation = null;
}

// Helper function to calculate proper installment amount
function calculateProperInstallment(loanAmount, userBalance) {
    try {
        // Ensure we have valid numeric inputs
        const numericLoanAmount = parseFloat(loanAmount);
        const numericBalance = parseFloat(userBalance);
        
        if (isNaN(numericLoanAmount) || isNaN(numericBalance) || numericBalance <= 0) {
            console.error('Invalid loan calculation inputs:', { loanAmount, userBalance });
            return 20; // Return minimum installment
        }
        
        // Use direct calculation (same as backend)
        const ratio = 0.02 / 3; // instp1 / maxlp1 = 0.006667
        const baseInstallment = Math.ceil((ratio * numericLoanAmount * numericLoanAmount / numericBalance) / 5) * 5;
        const MINIMUM_INSTALLMENT = 20;
        
        return Math.max(baseInstallment, MINIMUM_INSTALLMENT);
    } catch (error) {
        console.error('Error calculating installment:', error);
        return 20; // Return minimum installment as fallback
    }
}



// Admin dashboard functions
async function loadAdminStats() {
    try {
        const result = await apiCall('/admin/dashboard-stats');
        const stats = result.stats;
        
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('pendingLoans').textContent = stats.pendingLoans;
        document.getElementById('pendingTransactions').textContent = stats.pendingTransactions;
        
    } catch (error) {
        console.error('Load admin stats error:', error);
        showToast('خطأ في تحميل إحصائيات المدير', 'error');
    }
}

// Action button functions
async function showUserInfo() {
    try {
        const result = await apiCall(`/users/profile/${currentUser.user_id}`);
        const user = result.user;
        
        showModal('معلوماتي الشخصية', `
            <div class="user-info-modal">
                <!-- Personal Information -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0;">👤 المعلومات الشخصية</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p><strong>الاسم:</strong> ${user.Aname || 'غير محدد'}</p>
                            <p><strong>النوع:</strong> موظف</p>
                            <p><strong>الهاتف:</strong> ${user.mobile1 || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p><strong>البريد الإلكتروني:</strong> ${user.email || 'غير محدد'}</p>
                            <p><strong>الرصيد الحالي:</strong> ${formatCurrency(user.current_balance)}</p>
                            <p><strong>تاريخ التسجيل:</strong> ${formatDate(user.registration_date)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Navigation Guide -->
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-right: 4px solid #007bff; margin-bottom: 20px;">
                    <h4 style="color: #0056b3; margin-top: 0;">📋 للاطلاع على التفاصيل المالية</h4>
                    <ul style="margin: 10px 0; padding-right: 20px; color: #0056b3;">
                        <li><strong>تاريخ الإيداعات:</strong> اضغط على "دفع الاشتراكات" لمشاهدة تاريخ جميع إيداعات الاشتراك</li>
                        <li><strong>تاريخ القروض وتسديد الأقساط:</strong> اضغط على "تسديد القرض" لمشاهدة معلومات القرض النشط وتاريخ التسديدات</li>
                    </ul>
                </div>

                <!-- Will Section -->
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px;">
                    <h3 style="margin: 0 0 15px 0;">📜 الوصية</h3>
                    <p style="margin-bottom: 15px;"><i class="fas fa-info-circle"></i> يمكنك هنا كتابة وصيتك الخاصة بتوزيع رصيدك في الصندوق في حالة الوفاة</p>
                    
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <textarea id="willContentInInfo" rows="6" placeholder="اكتب وصيتك هنا..." 
                                  style="width: 100%; padding: 10px; border: none; border-radius: 5px; resize: vertical; font-family: inherit;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="saveUserWill()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-save"></i> حفظ الوصية
                        </button>
                        <button onclick="loadUserWillInInfo()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> تحديث
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        // Load will content after modal is shown
        setTimeout(() => {
            loadUserWillInInfo();
        }, 100);
        
    } catch (error) {
        showToast('خطأ في تحميل المعلومات الشخصية', 'error');
    }
}

async function showMessages() {
    try {
        const result = await apiCall(`/users/feedback/${currentUser.user_id}`);
        const feedback = result.feedback;
        
        let messagesHtml = '<div class="messages-modal">';
        
        if (feedback.length === 0) {
            messagesHtml += '<p>لا توجد رسائل</p>';
        } else {
            feedback.forEach(msg => {
                const statusText = {
                    'pending': 'في الانتظار',
                    'read': 'مقروءة',
                    'answered': 'تم الرد'
                };
                
                messagesHtml += `
                    <div class="message-item">
                        <div class="message-header">
                            <span class="message-date">${formatDate(msg.date)}</span>
                            <span class="message-status ${msg.status}">${statusText[msg.status]}</span>
                        </div>
                        <div class="message-content">${msg.feedback}</div>
                        ${msg.respowned ? `<div class="message-response"><strong>الرد:</strong> ${msg.respowned}</div>` : ''}
                    </div>
                `;
            });
        }
        
        messagesHtml += `
            <div class="new-message-form">
                <h4>إرسال رسالة جديدة</h4>
                <textarea id="newMessage" placeholder="اكتب رسالتك هنا..." maxlength="500"></textarea>
                <button onclick="sendMessage()" class="btn btn-primary">إرسال</button>
            </div>
        `;
        
        messagesHtml += '</div>';
        
        showModal('مراسلة الإدارة', messagesHtml);
        
    } catch (error) {
        showToast('خطأ في تحميل الرسائل', 'error');
    }
}

async function sendMessage() {
    const message = document.getElementById('newMessage').value.trim();
    
    if (!message) {
        showToast('يرجى كتابة نص الرسالة', 'error');
        return;
    }
    
    try {
        const result = await apiCall('/users/feedback', 'POST', { message });
        showToast(result.message, 'success');
        closeModal();
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function showLoanRequest() {
    // Scroll to loan request section
    document.querySelector('.loan-conditions').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

async function showLoanPayment() {
    try {
        // Fetch loan payments
        const loanPaymentsResult = await apiCall(`/users/loan-payments/${currentUser.user_id}`);
        const loanPayments = loanPaymentsResult.loanPayments || [];
        
        // Fetch active loan details
        let activeLoan = null;
        try {
            const activeLoanResult = await apiCall(`/loans/active/${currentUser.user_id}`);
            activeLoan = activeLoanResult.activeLoan;
        } catch (error) {
            console.log('No active loan found:', error.message);
        }
        
        // Build loan payments table
        const loanPaymentsTableHtml = loanPayments.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">التاريخ</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">مبلغ القسط</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">مبلغ القرض</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${loanPayments.map(payment => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(payment.date)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: #ffc107; font-weight: bold;">${formatCurrency(payment.credit)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${payment.loan_amount ? formatCurrency(payment.loan_amount) : 'غير محدد'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                <span style="background: ${payment.status === 'accepted' ? '#28a745' : payment.status === 'pending' ? '#ffc107' : '#dc3545'}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px;">
                                    ${getStatusText(payment.status)}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="text-align: center; color: #666; padding: 20px; margin-top: 15px; background: #f8f9fa; border-radius: 5px;">لا توجد أقساط مسددة</p>';
        
        const totalLoanPayments = loanPayments.filter(p => p.status === 'accepted').reduce((sum, p) => sum + parseFloat(p.credit || 0), 0);
        
        showModal('تسديد القرض', `
            <div class="loan-payment-section">
                
                <!-- Active Loan Information -->
                ${activeLoan ? `
                    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-right: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin-top: 0;">🏦 معلومات القرض النشط</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <p><strong>رقم القرض:</strong> #${activeLoan.loan_id}</p>
                                <p><strong>مبلغ القرض:</strong> ${formatCurrency(activeLoan.loan_amount)}</p>
                                <p><strong>تاريخ الموافقة:</strong> ${formatDate(activeLoan.approval_date)}</p>
                                <p><strong>المدة:</strong> ${activeLoan.installment_amount} د.ك شهرياً</p>
                            </div>
                            <div>
                                <p><strong>المبلغ المسدد:</strong> <span style="color: #28a745;">${formatCurrency(activeLoan.paid_amount || 0)}</span></p>
                                <p><strong>المبلغ المتبقي:</strong> <span style="color: #dc3545; font-size: 18px; font-weight: bold;">${formatCurrency(activeLoan.remaining_amount || activeLoan.loan_amount)}</span></p>
                                <p><strong>القسط الشهري المطلوب:</strong> ${formatCurrency(calculateProperInstallment(activeLoan.loan_amount, currentUser.balance))}</p>
                                <p><strong>الموافق من:</strong> ${activeLoan.admin_name || 'الإدارة'}</p>
                            </div>
                        </div>
                        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; text-align: center;">
                            <small style="color: #666;">
                                <strong>💡 ملاحظة:</strong> يمكنك تسديد أي مبلغ ترغب به، ولكن القسط المطلوب هو ${formatCurrency(calculateProperInstallment(activeLoan.loan_amount, currentUser.balance))} شهرياً
                            </small>
                        </div>
                    </div>
                ` : `
                    <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-right: 4px solid #28a745; text-align: center;">
                        <h4 style="color: #155724; margin-top: 0;">✅ لا يوجد قرض نشط</h4>
                        <p style="color: #155724; margin: 0;">ليس لديك أي قرض نشط حالياً. يمكنك التقدم بطلب قرض جديد من خلال نموذج طلب القرض.</p>
                    </div>
                `}
                
                <!-- Payment Form -->
                ${activeLoan ? `
                    <div class="payment-form" style="margin-bottom: 25px;">
                        <h4 style="color: #ffc107; margin-bottom: 15px;">💳 تسديد قسط جديد</h4>
                        <form id="paymentForm">
                            <div class="form-group">
                                <label for="paymentAmount">مبلغ القسط</label>
                                <input type="number" id="paymentAmount" step="0.001" required 
                                       min="${calculateProperInstallment(activeLoan.loan_amount, currentUser.balance)}"
                                       placeholder="${calculateProperInstallment(activeLoan.loan_amount, currentUser.balance)}"
                                       oninput="validatePaymentAmount(${calculateProperInstallment(activeLoan.loan_amount, currentUser.balance)})">
                                <small id="paymentHelp" style="color: #666;">
                                    <strong>الحد الأدنى:</strong> ${formatCurrency(calculateProperInstallment(activeLoan.loan_amount, currentUser.balance))} - يمكنك دفع أكثر ولكن ليس أقل
                                </small>
                                <div id="paymentError" style="color: #dc3545; font-size: 12px; margin-top: 5px; display: none;">
                                    ⚠️ المبلغ أقل من الحد الأدنى المطلوب
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="paymentMemo">ملاحظات</label>
                                <input type="text" id="paymentMemo" placeholder="اختياري">
                            </div>
                            <button type="submit" id="paymentSubmitBtn" class="btn btn-success">إرسال طلب التسديد</button>
                        </form>
                    </div>
                ` : ''}
                
                <!-- Loan Payments History -->
                <div class="loan-payments-history">
                    <h4 style="color: #007bff; margin-bottom: 15px;">📊 تاريخ تسديد الأقساط</h4>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">
                        ${loanPaymentsTableHtml}
                    </div>
                    <div style="text-align: left; margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                        <strong style="color: #856404; font-size: 16px;">
                            إجمالي التسديدات المعتمدة: ${formatCurrency(totalLoanPayments)}
                        </strong>
                    </div>
                </div>
            </div>
        `);
        
        if (activeLoan) {
            document.getElementById('paymentForm').addEventListener('submit', handleLoanPayment);
            // Store the minimum payment amount for validation
            window.currentLoanMinPayment = calculateProperInstallment(activeLoan.loan_amount, currentUser.balance);
        }
        
    } catch (error) {
        showToast('خطأ في تحميل بيانات القروض', 'error');
        console.error('Error loading loan data:', error);
    }
}

// Payment amount validation function
function validatePaymentAmount(minAmount) {
    const paymentInput = document.getElementById('paymentAmount');
    const paymentError = document.getElementById('paymentError');
    const paymentHelp = document.getElementById('paymentHelp');
    const submitBtn = document.getElementById('paymentSubmitBtn');
    
    if (!paymentInput || !paymentError || !submitBtn) return;
    
    const amount = parseFloat(paymentInput.value) || 0;
    
    if (amount > 0 && amount < minAmount) {
        // Show error
        paymentError.style.display = 'block';
        paymentInput.style.borderColor = '#dc3545';
        paymentHelp.style.color = '#dc3545';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
    } else {
        // Hide error
        paymentError.style.display = 'none';
        paymentInput.style.borderColor = amount >= minAmount ? '#28a745' : '';
        paymentHelp.style.color = '#666';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
}

async function handleLoanPayment(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const memo = document.getElementById('paymentMemo').value;
    const minAmount = window.currentLoanMinPayment || 0;
    
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ صحيح', 'error');
        return;
    }
    
    // Validate minimum payment amount
    if (amount < minAmount) {
        showToast(`المبلغ أقل من الحد الأدنى المطلوب (${formatCurrency(minAmount)})`, 'error');
        validatePaymentAmount(minAmount); // Show visual feedback
        return;
    }
    
    try {
        const result = await apiCall('/loans/payment', 'POST', { amount, memo });
        showToast(result.message, 'success');
        closeModal();
        
        // Refresh user dashboard data AND refresh the loan payment section
        await loadUserDashboardData();
        
        // Small delay to ensure backend has processed the payment, then refresh loan payment view
        setTimeout(async () => {
            try {
                await showLoanPayment(); // This will refresh the active loan information
            } catch (error) {
                console.error('Error refreshing loan payment view:', error);
                // Fallback - reload the entire dashboard
                location.reload();
            }
        }, 500);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showDeposit() {
    try {
        // Fetch subscription deposits (transactions)
        const transactionsResult = await apiCall(`/users/transactions/${currentUser.user_id}`);
        const transactions = transactionsResult.transactions || [];
        
        // Filter subscription deposits (all credit transactions - including rejected)
        const subscriptionDeposits = transactions.filter(t => 
            parseFloat(t.credit || 0) > 0
        );
        
        // Build subscription deposits table
        const depositsTableHtml = subscriptionDeposits.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">التاريخ</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">المبلغ</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">الملاحظات</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${subscriptionDeposits.map(deposit => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(deposit.date)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">+${formatCurrency(deposit.credit)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${deposit.memo || 'إيداع اشتراك'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                <span style="background: ${deposit.status === 'accepted' ? '#28a745' : deposit.status === 'pending' ? '#ffc107' : '#dc3545'}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px;">
                                    ${getStatusText(deposit.status)}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="text-align: center; color: #666; padding: 20px; margin-top: 15px; background: #f8f9fa; border-radius: 5px;">لا توجد إيداعات اشتراك</p>';
        
        const totalDeposits = subscriptionDeposits.filter(d => d.status === 'accepted').reduce((sum, d) => sum + parseFloat(d.credit || 0), 0);
        
        showModal('دفع الاشتراكات', `
            <div class="deposit-section">
                <!-- Deposit Form -->
                <div class="deposit-form" style="margin-bottom: 25px;">
                    <h4 style="color: #28a745; margin-bottom: 15px;">💰 إيداع اشتراك جديد</h4>
                    <form id="depositForm">
                        <div class="form-group">
                            <label for="depositAmount">مبلغ الإيداع</label>
                            <input type="number" id="depositAmount" step="0.001" required>
                        </div>
                        <div class="form-group">
                            <label for="depositMemo">ملاحظات</label>
                            <input type="text" id="depositMemo" placeholder="اختياري">
                        </div>
                        <button type="submit" class="btn btn-success">إرسال طلب الإيداع</button>
                    </form>
                </div>
                
                <!-- Deposits History -->
                <div class="deposits-history">
                    <h4 style="color: #007bff; margin-bottom: 15px;">📊 تاريخ إيداعات الاشتراك</h4>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">
                        ${depositsTableHtml}
                    </div>
                    <div style="text-align: left; margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 5px;">
                        <strong style="color: #28a745; font-size: 16px;">
                            إجمالي الإيداعات المعتمدة: ${formatCurrency(totalDeposits)}
                        </strong>
                    </div>
                </div>
            </div>
        `);
        
        document.getElementById('depositForm').addEventListener('submit', handleDeposit);
        
    } catch (error) {
        showToast('خطأ في تحميل بيانات الإيداعات', 'error');
        console.error('Error loading deposit data:', error);
    }
}

async function handleDeposit(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const memo = document.getElementById('depositMemo').value;
    
    console.log('Deposit request:', { amount, memo }); // Debug log
    
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ صحيح', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('Sending deposit request to API...'); // Debug log
        const result = await apiCall('/users/deposit', 'POST', { amount, memo });
        console.log('Deposit response:', result); // Debug log
        
        showToast(result.message, 'success');
        closeModal();
        
        // Refresh user data
        await loadUserDashboardData();
        
    } catch (error) {
        console.error('Deposit error:', error); // Debug log
        showToast(error.message || 'خطأ في إرسال طلب الإيداع', 'error');
    } finally {
        showLoading(false);
    }
}

// Admin functions
async function showPendingLoans() {
    try {
        const result = await apiCall('/admin/pending-loans');
        const loans = result.loans;
        
        let loansHtml = '<div class="pending-loans-modal">';
        
        if (loans.length === 0) {
            loansHtml += '<p>لا توجد طلبات قروض معلقة</p>';
        } else {
            loans.forEach(loan => {
                loansHtml += `
                    <div class="loan-item">
                        <div class="loan-header">
                            <h4>${loan.Aname} (موظف)</h4>
                            <span class="loan-date">${formatDate(loan.request_date)}</span>
                        </div>
                        <div class="loan-details">
                            <p><strong>المبلغ المطلوب:</strong> ${formatCurrency(loan.loan_amount)}</p>
                            <p><strong>عدد الأقساط:</strong> ${loan.installment_period || 24} شهر</p>
                            <p><strong>القسط الشهري:</strong> ${formatCurrency(loan.installment_amount)}</p>
                            <p><strong>الرصيد الحالي:</strong> ${formatCurrency(loan.current_balance)}</p>
                            <p><strong>المدة المقترحة:</strong> ${loan.installment_period || 24} شهر (محسوبة تلقائياً)</p>
                        </div>
                        <div class="loan-actions">
                            <button onclick="approveLoan(${loan.loan_id})" class="btn btn-success">موافقة</button>
                            <button onclick="rejectLoan(${loan.loan_id})" class="btn btn-secondary">رفض</button>
                        </div>
                    </div>
                `;
            });
        }
        
        loansHtml += '</div>';
        
        showModal('طلبات القروض المعلقة', loansHtml);
        
    } catch (error) {
        showToast('خطأ في تحميل طلبات القروض', 'error');
    }
}

async function showAllLoans() {
    try {
        const result = await apiCall('/admin/all-loans');
        const loans = result.loans;
        
        let loansHtml = '<div class="all-loans-modal" style="max-height: 500px; overflow-y: auto;">';
        
        if (loans.length === 0) {
            loansHtml += '<p>لا توجد طلبات قروض</p>';
        } else {
            loans.forEach(loan => {
                const statusClass = loan.status === 'pending' ? 'pending' : 
                                  loan.status === 'opend' ? 'approved' : 'rejected';
                const statusText = loan.status === 'pending' ? 'معلق' : 
                                 loan.status === 'opend' ? 'موافق عليه' : 'مرفوض';
                
                loansHtml += `
                    <div class="loan-item" style="border-right: 4px solid ${statusClass === 'pending' ? '#ffc107' : 
                                                                          statusClass === 'approved' ? '#28a745' : '#dc3545'};">
                        <div class="loan-header">
                            <h4>${loan.Aname} (موظف)</h4>
                            <span class="loan-date">${formatDate(loan.request_date)}</span>
                            <span class="loan-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="loan-details">
                            <p><strong>المبلغ المطلوب:</strong> ${formatCurrency(loan.loan_amount)}</p>
                            <p><strong>عدد الأقساط:</strong> ${loan.installment_period || 24} شهر</p>
                            <p><strong>القسط الشهري:</strong> ${formatCurrency(loan.installment_amount)}</p>
                            <p><strong>الرصيد الحالي:</strong> ${formatCurrency(loan.current_balance)}</p>
                            ${loan.admin_name ? `<p><strong>تم المعالجة من:</strong> ${loan.admin_name}</p>` : ''}
                        </div>
                        ${loan.status === 'pending' ? `
                            <div class="loan-actions">
                                <button onclick="approveLoan(${loan.loan_id})" class="btn btn-success">موافقة</button>
                                <button onclick="rejectLoan(${loan.loan_id})" class="btn btn-secondary">رفض</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        }
        
        loansHtml += '</div>';
        
        showModal('جميع طلبات القروض', loansHtml);
        
    } catch (error) {
        showToast('خطأ في تحميل طلبات القروض', 'error');
    }
}

async function approveLoan(loanId) {
    if (!confirm('هل أنت متأكد من الموافقة على هذا القرض؟')) return;
    
    try {
        const result = await apiCall(`/admin/loan-action/${loanId}`, 'POST', { action: 'accept' });
        showToast(result.message, 'success');
        await showPendingLoans(); // Refresh the list
        await loadAdminStats(); // Update stats
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function rejectLoan(loanId) {
    if (!confirm('هل أنت متأكد من رفض هذا القرض؟')) return;
    
    try {
        const result = await apiCall(`/admin/loan-action/${loanId}`, 'POST', { action: 'reject' });
        showToast(result.message, 'success');
        await showPendingLoans(); // Refresh the list
        await loadAdminStats(); // Update stats
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showAllTransactions() {
    try {
        const result = await apiCall('/admin/all-transactions');
        const transactions = result.transactions;
        
        let transactionsHtml = '<div class="all-transactions-modal">';
        
        if (transactions.length === 0) {
            transactionsHtml += '<p>لا توجد معاملات</p>';
        } else {
            transactionsHtml += '<div style="max-height: 500px; overflow-y: auto;">';
            transactions.forEach(transaction => {
                const isLoanPayment = transaction.type_record === 'loan_payment';
                const type = isLoanPayment ? 'تسديد قرض' : 
                           transaction.credit > 0 ? 'إيداع' : 'سحب';
                const amount = transaction.credit > 0 ? transaction.credit : transaction.debit;
                
                const statusColor = transaction.status === 'accepted' ? '#28a745' : 
                                  transaction.status === 'pending' ? '#ffc107' : '#dc3545';
                
                transactionsHtml += `
                    <div class="transaction-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                        <div class="transaction-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <h4 style="margin: 0;">${transaction.Aname} (موظف)</h4>
                                <small style="color: #666;">رقم المستخدم: ${transaction.user_id}</small>
                            </div>
                            <div style="text-align: left;">
                                <span class="transaction-date" style="display: block; color: #666; font-size: 12px;">${formatDate(transaction.date)}</span>
                                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                    ${getStatusText(transaction.status)}
                                </span>
                            </div>
                        </div>
                        <div class="transaction-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <p style="margin: 3px 0;"><strong>نوع المعاملة:</strong> ${type}</p>
                                <p style="margin: 3px 0;"><strong>المبلغ:</strong> ${formatCurrency(amount)}</p>
                            </div>
                            <div>
                                ${isLoanPayment ? `<p style="margin: 3px 0;"><strong>قرض رقم:</strong> ${transaction.target_loan_id}</p>` : ''}
                                <p style="margin: 3px 0;"><strong>الملاحظات:</strong> ${transaction.memo || 'بدون ملاحظات'}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            transactionsHtml += '</div>';
        }
        
        transactionsHtml += '</div>';
        
        showModal('جميع المعاملات', transactionsHtml);
        
    } catch (error) {
        showToast('خطأ في تحميل المعاملات', 'error');
    }
}

async function showPendingTransactions() {
    try {
        const result = await apiCall('/admin/pending-transactions');
        const transactions = result.transactions;
        
        let transactionsHtml = '<div class="pending-transactions-modal">';
        
        if (transactions.length === 0) {
            transactionsHtml += '<p>لا توجد معاملات معلقة</p>';
        } else {
            transactions.forEach(transaction => {
                const isLoanPayment = transaction.type_record === 'loan_payment';
                const type = isLoanPayment ? 'تسديد قرض' : 
                           transaction.credit > 0 ? 'إيداع' : 'سحب';
                const amount = transaction.credit > 0 ? transaction.credit : transaction.debit;
                
                transactionsHtml += `
                    <div class="transaction-item">
                        <div class="transaction-header">
                            <h4>${transaction.Aname} (موظف)</h4>
                            <span class="transaction-date">${formatDate(transaction.date)}</span>
                        </div>
                        <div class="transaction-details">
                            <p><strong>نوع المعاملة:</strong> ${type}</p>
                            <p><strong>المبلغ:</strong> ${formatCurrency(amount)}</p>
                            ${isLoanPayment ? `<p><strong>قرض رقم:</strong> ${transaction.target_loan_id}</p>` : ''}
                            <p><strong>الملاحظات:</strong> ${transaction.memo || 'بدون ملاحظات'}</p>
                        </div>
                        <div class="transaction-actions">
                            <button onclick="approveTransaction(${transaction.id}, '${transaction.type_record}')" class="btn btn-success">موافقة</button>
                            <button onclick="rejectTransaction(${transaction.id}, '${transaction.type_record}')" class="btn btn-secondary">رفض</button>
                        </div>
                    </div>
                `;
            });
        }
        
        transactionsHtml += '</div>';
        
        showModal('المعاملات المعلقة', transactionsHtml);
        
    } catch (error) {
        showToast('خطأ في تحميل المعاملات المعلقة', 'error');
    }
}

async function approveTransaction(transactionId, recordType = 'transaction') {
    if (!confirm('هل أنت متأكد من الموافقة على هذه المعاملة؟')) return;
    
    try {
        const result = await apiCall(`/admin/transaction-action/${transactionId}`, 'POST', { 
            action: 'accept', 
            recordType 
        });
        showToast(result.message, 'success');
        await showPendingTransactions(); // Refresh the list
        await loadAdminStats(); // Update stats
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function rejectTransaction(transactionId, recordType = 'transaction') {
    if (!confirm('هل أنت متأكد من رفض هذه المعاملة؟')) return;
    
    try {
        const result = await apiCall(`/admin/transaction-action/${transactionId}`, 'POST', { 
            action: 'reject', 
            recordType 
        });
        showToast(result.message, 'success');
        await showPendingTransactions(); // Refresh the list
        await loadAdminStats(); // Update stats
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// User Management Functions
async function showAllUsers() {
    console.log('showAllUsers called');
    
    try {
        const result = await apiCall('/admin/users');
        const users = result.users;
        
        let usersHtml = `
            <div class="all-users-modal">
                <h4>قائمة المستخدمين</h4>
                <p style="color: #666; margin-bottom: 20px;">اضغط على اسم المستخدم لعرض التفاصيل الكاملة</p>
        `;
        
        if (users.length === 0) {
            usersHtml += '<p>لا يوجد مستخدمون</p>';
        } else {
            users.forEach(user => {
                const statusColor = user.status === 'active' ? '#28a745' : '#6c757d';
                const statusText = user.status === 'active' ? 'نشط' : 'غير نشط';
                
                usersHtml += `
                    <div style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 10px; background: #f9f9f9; transition: all 0.3s ease;" 
                         onmouseover="this.style.background='#e3f2fd'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'" 
                         onmouseout="this.style.background='#f9f9f9'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        
                        <div style="display: grid; grid-template-columns: 80px 1fr 150px 150px 120px; gap: 15px; align-items: center;">
                            
                            <div style="text-align: center; background: #007bff; color: white; padding: 10px; border-radius: 50%; font-weight: bold; font-size: 14px;">
                                ${user.user_id}
                            </div>
                            
                            <div style="cursor: pointer;" onclick="showUserDetails(${user.user_id})">
                                <h5 style="margin: 0 0 5px 0; color: #007bff; text-decoration: underline; font-size: 18px;">
                                    👤 ${user.Aname || 'غير محدد'}
                                </h5>
                                <small style="color: #666;">
                                    👔 موظف • 
                                    📧 ${user.email || 'غير محدد'}
                                </small>
                            </div>
                            
                            <div style="text-align: center;">
                                <strong style="color: #28a745; font-size: 16px;">
                                    💰 ${formatCurrency(user.balance || 0)}
                                </strong>
                                <br>
                                <small style="color: #666;">الرصيد</small>
                            </div>
                            
                            <div style="text-align: center;">
                                <span style="background: ${statusColor}; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">
                                    ${statusText}
                                </span>
                                <br>
                                <small style="color: #666;">${formatDate(user.registration_date)}</small>
                            </div>
                            
                            <div style="text-align: center;">
                                <button onclick="showUserDetails(${user.user_id})" 
                                        style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin: 2px; width: 100%; font-size: 12px;"
                                        onmouseover="this.style.background='#0056b3'" 
                                        onmouseout="this.style.background='#007bff'">
                                    🔍 التفاصيل
                                </button>
                                <button onclick="resetUserPassword(${user.user_id})" 
                                        style="background: #ffc107; color: black; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin: 2px; width: 100%; font-size: 12px;"
                                        onmouseover="this.style.background='#e0a800'" 
                                        onmouseout="this.style.background='#ffc107'">
                                    🔑 كلمة المرور
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        usersHtml += '</div>';
        showModal('إدارة الأعضاء', usersHtml);
        
    } catch (error) {
        console.error('showAllUsers error:', error);
        showToast('خطأ في تحميل قائمة المستخدمين: ' + error.message, 'error');
    }
}

async function showUserDetails(userId) {
    console.log('showUserDetails called for user:', userId);
    showLoading(true);

    try {
        const result = await apiCall(`/admin/user/${userId}`);
        console.log('API Response:', result); // Debug log
        
        // Extract data from the actual response structure
        const user = result.user;
        const transactions = result.transactions || [];
        const loans = result.loans || [];
        
        if (!user) {
            throw new Error('No user data received');
        }

        // Fetch loan payments separately
        const loanPaymentsResult = await apiCall(`/users/loan-payments/${userId}`);
        const loanPayments = loanPaymentsResult.loanPayments || [];

        // Fetch active loan details
        let activeLoan = null;
        try {
            const activeLoanResult = await apiCall(`/loans/active/${userId}`);
            activeLoan = activeLoanResult.activeLoan;
        } catch (error) {
            console.log('No active loan found or error fetching active loan:', error.message);
        }

        // Calculate totals from the transactions data
        const currentBalance = parseFloat(user.balance || 0);
        
        const totalDeposits = transactions
            .filter(t => parseFloat(t.credit || 0) > 0 && t.status === 'accepted')
            .reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);

        const totalLoanPayments = loanPayments
            .reduce((sum, payment) => sum + parseFloat(payment.credit || 0), 0);
        
        console.log('Calculated values:', {
            currentBalance,
            totalDeposits,
            totalLoanPayments,
            transactionsCount: transactions.length
        });

        // Build transaction history HTML
        const transactionHistoryHtml = transactions.slice(0, 5).map(transaction => {
            const creditAmount = parseFloat(transaction.credit || 0);
            const debitAmount = parseFloat(transaction.debit || 0);
            const amount = creditAmount > 0 ? creditAmount : debitAmount;
            
            const transactionType = creditAmount > 0 ? 'إيداع' : (debitAmount > 0 ? 'سحب' : 'معاملة');
            const amountColor = creditAmount > 0 ? '#28a745' : '#dc3545';
            const sign = creditAmount > 0 ? '+' : '-';
            
            return `
                <div style="padding: 10px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${transactionType}</strong>
                        <br>
                        <small style="color: #666;">${formatDate(transaction.date)}</small>
                        <br>
                        <small style="color: #999;">${transaction.memo || ''}</small>
                    </div>
                    <div style="text-align: left;">
                        <strong style="color: ${amountColor};">${sign} ${formatCurrency(amount)}</strong>
                        <br>
                        <small style="color: ${transaction.status === 'accepted' ? '#28a745' : transaction.status === 'pending' ? '#ffc107' : '#dc3545'};">
                            ${getStatusText(transaction.status)}
                        </small>
                    </div>
                </div>
            `;
        }).join('');

        const userDetailsHtml = `
            <div class="user-details-modal" style="max-height: 600px; overflow-y: auto;">
                
                <!-- User Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0;">👤 ${user.Aname || 'غير محدد'}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p><strong>رقم المستخدم:</strong> ${user.user_id}</p>
                            <p><strong>النوع:</strong> 👔 موظف</p>
                            <p><strong>الهاتف:</strong> ${user.mobile1 || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p><strong>البريد الإلكتروني:</strong> ${user.email || 'غير محدد'}</p>
                            <p><strong>الحالة:</strong> ${user.is_blocked ? '🚫 محظور' : '✅ نشط'}</p>
                            <p><strong>تاريخ التسجيل:</strong> ${formatDate(user.registration_date)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Financial Summary -->
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #28a745;">
                    <h4 style="color: #28a745; margin-top: 0;">💰 الملخص المالي</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                        <div>
                            <strong style="display: block; color: #28a745; font-size: 18px;">${formatCurrency(currentBalance)}</strong>
                            <small>الرصيد الحالي</small>
                        </div>
                        <div>
                            <strong style="display: block; color: #007bff; font-size: 18px;">${formatCurrency(totalDeposits)}</strong>
                            <small>إجمالي الإيداعات</small>
                        </div>
                        <div>
                            <strong style="display: block; color: #ffc107; font-size: 18px;">${formatCurrency(totalLoanPayments)}</strong>
                            <small>إجمالي تسديدات القروض</small>
                        </div>
                    </div>
                </div>
                
                <!-- Active Loan Information -->
                ${activeLoan ? `
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin-top: 0;">🏦 القرض النشط</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <p><strong>رقم القرض:</strong> #${activeLoan.loan_id}</p>
                                <p><strong>مبلغ القرض:</strong> ${formatCurrency(activeLoan.loan_amount)}</p>
                                <p><strong>تاريخ الموافقة:</strong> ${formatDate(activeLoan.approval_date)}</p>
                                <p><strong>المدة:</strong> ${activeLoan.installment_amount} د.ك شهرياً</p>
                            </div>
                            <div>
                                <p><strong>المبلغ المسدد:</strong> <span style="color: #28a745;">${formatCurrency(activeLoan.paid_amount || 0)}</span></p>
                                <p><strong>المبلغ المتبقي:</strong> <span style="color: #dc3545;">${formatCurrency(activeLoan.remaining_amount || activeLoan.loan_amount)}</span></p>
                                <p><strong>القسط الشهري المطلوب:</strong> ${formatCurrency(calculateProperInstallment(activeLoan.loan_amount, currentUser.balance))}</p>
                                <p><strong>الموافق من:</strong> ${activeLoan.admin_name || 'الإدارة'}</p>
                            </div>
                        </div>
                        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <small style="color: #666;">
                                <strong>ملاحظة:</strong> المبلغ المتبقي محسوب بناءً على الأقساط المسددة والمعتمدة من الإدارة
                            </small>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Transaction History -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #007bff;">📊 آخر المعاملات</h4>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">
                        ${transactionHistoryHtml || '<p style="padding: 10px; text-align: center; color: #666;">لا توجد معاملات</p>'}
                    </div>
                </div>

                <!-- Loan History -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #ffc107;">💳 تاريخ القروض</h4>
                    <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">
                        ${loans.length > 0 ? 
                            loans.map(loan => `
                                <div style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
                                    <strong>قرض #${loan.loan_id} - ${formatCurrency(loan.loan_amount)}</strong>
                                    <br>
                                    <small style="color: #666;">${formatDate(loan.date)} - ${getStatusText(loan.status)}</small>
                                </div>
                            `).join('')
                            : '<p style="padding: 10px; text-align: center; color: #666;">لا توجد قروض</p>'
                        }
                    </div>
                </div>

                <!-- Loan Payment History -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #28a745;">💰 تاريخ تسديد الأقساط</h4>
                    <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">
                        ${loanPayments.length > 0 ? 
                            loanPayments.map(payment => `
                                <div style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
                                    <strong>قسط ${formatCurrency(payment.credit)}</strong>
                                    ${payment.loan_amount ? ` - من قرض ${formatCurrency(payment.loan_amount)}` : ''}
                                    <br>
                                    <small style="color: #666;">${formatDate(payment.date)} - ${payment.memo || 'تسديد قسط'}</small>
                                    ${payment.admin_name ? `<br><small style="color: #999;">تمت الموافقة من: ${payment.admin_name}</small>` : ''}
                                </div>
                            `).join('')
                            : '<p style="padding: 10px; text-align: center; color: #666;">لا توجد أقساط مسددة</p>'
                        }
                    </div>
                </div>

                <!-- Joining Fee Approval Section -->
                <div style="background: ${user.joining_fee_approved === 'approved' ? '#d4edda' : user.joining_fee_approved === 'rejected' ? '#f8d7da' : '#fff3cd'}; 
                           padding: 15px; border-radius: 8px; margin-bottom: 20px; 
                           border-right: 4px solid ${user.joining_fee_approved === 'approved' ? '#28a745' : user.joining_fee_approved === 'rejected' ? '#dc3545' : '#ffc107'};">
                    <h4 style="color: ${user.joining_fee_approved === 'approved' ? '#28a745' : user.joining_fee_approved === 'rejected' ? '#dc3545' : '#856404'}; margin-top: 0;">
                        💳 حالة رسوم الانضمام (10 د.ك)
                    </h4>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0; font-size: 16px;">
                                <strong>الحالة الحالية:</strong> 
                                <span style="color: ${user.joining_fee_approved === 'approved' ? '#28a745' : user.joining_fee_approved === 'rejected' ? '#dc3545' : '#856404'};">
                                    ${user.joining_fee_approved === 'approved' ? '✅ موافق عليها' : 
                                      user.joining_fee_approved === 'rejected' ? '❌ مرفوضة' : '⏳ بانتظار الموافقة'}
                                </span>
                            </p>
                            <small style="color: #666; margin-top: 5px; display: block;">
                                ${user.joining_fee_approved === 'approved' ? 'تم دفع رسوم الانضمام - يمكن للمستخدم طلب القروض' : 
                                  user.joining_fee_approved === 'rejected' ? 'رسوم الانضمام مرفوضة - لا يمكن للمستخدم طلب القروض' : 'يجب على المستخدم دفع رسوم الانضمام 10 د.ك وانتظار موافقة الإدارة'}
                            </small>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            ${user.joining_fee_approved !== 'approved' ? `
                                <button onclick="handleJoiningFeeAction(${user.user_id}, 'approved')" 
                                        style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px;"
                                        onmouseover="this.style.background='#218838'" 
                                        onmouseout="this.style.background='#28a745'">
                                    ✅ موافقة
                                </button>
                            ` : ''}
                            ${user.joining_fee_approved !== 'rejected' ? `
                                <button onclick="handleJoiningFeeAction(${user.user_id}, 'rejected')" 
                                        style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px;"
                                        onmouseover="this.style.background='#c82333'" 
                                        onmouseout="this.style.background='#dc3545'">
                                    ❌ رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- User Will Section -->
                <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #ffc107;">
                    <h4 style="color: #f57c00; margin-top: 0;">📜 وصية المستخدم</h4>
                    <div id="userWillContent_${user.user_id}" style="min-height: 100px; max-height: 200px; overflow-y: auto; padding: 10px; background: white; border-radius: 5px; border: 1px solid #ddd;">
                        <div style="text-align: center; color: #666; padding: 20px;">
                            <i class="fas fa-spinner fa-spin"></i> جاري تحميل الوصية...
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 10px;">
                        <button onclick="refreshUserWill(${user.user_id})" 
                                style="background: #ffc107; color: black; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px;"
                                onmouseover="this.style.background='#e0a800'" 
                                onmouseout="this.style.background='#ffc107'">
                            <i class="fas fa-sync-alt"></i> تحديث الوصية
                        </button>
                    </div>
                </div>

                <!-- Admin Actions Section -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #6c757d;">
                    <h4 style="color: #6c757d; margin-top: 0;">🔧 إجراءات الإدارة</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">تاريخ التسجيل:</label>
                            <input type="date" id="editRegistrationDate_${user.user_id}" 
                                   value="${user.date ? new Date(user.date).toISOString().split('T')[0] : ''}"
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="display: flex; align-items: end;">
                            <button onclick="updateRegistrationDate(${user.user_id})" 
                                    style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; width: 100%;"
                                    onmouseover="this.style.background='#0056b3'" 
                                    onmouseout="this.style.background='#007bff'">
                                <i class="fas fa-calendar-alt"></i> تحديث تاريخ التسجيل
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Admin Actions -->
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
                    <button onclick="resetUserPassword(${user.user_id})" 
                            style="background: #ffc107; color: black; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                        🔑 إعادة تعيين كلمة المرور
                    </button>
                    ${user.is_blocked ? 
                        `<button onclick="unblockUser(${user.user_id})" 
                                style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                            🔓 إلغاء الحظر
                        </button>` :
                        `<button onclick="blockUser(${user.user_id})" 
                                style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                            🚫 حظر المستخدم
                        </button>`
                    }
                    <button onclick="closeModal()" 
                            style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                        إغلاق
                    </button>
                </div>
            </div>
        `;

        showModal(`تفاصيل المستخدم: ${user.Aname || 'غير محدد'}`, userDetailsHtml);
        
        // Load user will after modal is shown
        setTimeout(() => {
            loadUserWillForAdmin(userId);
        }, 100);

    } catch (error) {
        console.error('Error loading user details:', error);
        showToast('خطأ في تحميل تفاصيل المستخدم: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
// Generate automatic password
function generateAutoPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const length = 8;
    let password = '';
    
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
}

// Copy text to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم نسخ كلمة المرور بنجاح', 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('تم نسخ كلمة المرور بنجاح', 'success');
    } catch (err) {
        showToast('فشل في نسخ كلمة المرور', 'error');
    }
    
    document.body.removeChild(textArea);
}

async function resetUserPassword(userId) {
    if (!confirm(`هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم رقم ${userId}؟\nسيتم إنشاء كلمة مرور جديدة تلقائياً`)) {
        return;
    }
    
    const newPassword = generateAutoPassword();
    
    showLoading(true);
    
    try {
        const result = await apiCall('/auth/reset-password', 'POST', {
            targetUserId: userId,
            newPassword: newPassword
        });
        
        // Show success message with the new password
        showModal('إعادة تعيين كلمة المرور', `
            <div style="text-align: center; padding: 20px;">
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #155724; margin-top: 0;">
                        <i class="fas fa-check-circle"></i> تم إعادة تعيين كلمة المرور بنجاح
                    </h3>
                    <p style="margin: 15px 0;">كلمة المرور الجديدة للمستخدم رقم ${userId}:</p>
                    <div style="background: #f8f9fa; border: 2px solid #28a745; border-radius: 8px; padding: 15px; margin: 15px 0;">
                        <span style="font-family: monospace; font-size: 24px; font-weight: bold; color: #28a745; letter-spacing: 2px;">
                            ${newPassword}
                        </span>
                    </div>
                    <p style="color: #856404; font-size: 14px; margin-top: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> 
                        يرجى نسخ كلمة المرور وإبلاغ المستخدم بها
                    </p>
                </div>
                <button onclick="copyToClipboard('${newPassword}')" class="btn btn-primary" style="margin-left: 10px;">
                    <i class="fas fa-copy"></i> نسخ كلمة المرور
                </button>
                <button onclick="closeModal()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        `);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleJoiningFeeAction(userId, action) {
    const actionText = action === 'approved' ? 'الموافقة على' : 'رفض';
    const confirmMessage = `هل أنت متأكد من ${actionText} رسوم الانضمام للمستخدم رقم ${userId}؟`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiCall(`/admin/joining-fee-action/${userId}`, 'POST', {
            action: action
        });
        
        showToast(result.message, 'success');
        
        // Refresh the user details modal to show updated status
        showUserDetails(userId);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function showReports() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="admin-container">
            <h2 style="color: #28a745; margin-bottom: 30px;">
                <i class="fas fa-chart-line"></i> التقارير
            </h2>
            
            <div class="reports-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                
                <!-- Users Report -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-users" style="font-size: 48px; color: #28a745; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">تقرير الأعضاء</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">قائمة شاملة بجميع أعضاء الصندوق مع الأرصدة وحدود القروض</p>
                    <button onclick="showUsersReport()" class="btn" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

                <!-- Loans Report -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-money-bill-wave" style="font-size: 48px; color: #007bff; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">تقرير القروض</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">جميع طلبات القروض مع حالات الموافقة والرفض والمبالغ</p>
                    <button onclick="showLoansReport()" class="btn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

                <!-- Transactions Report -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-exchange-alt" style="font-size: 48px; color: #ffc107; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">تقرير المعاملات</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">جميع المعاملات المالية للإيداعات والسحوبات</p>
                    <button onclick="showTransactionsReport()" class="btn" style="background: #ffc107; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

                <!-- Financial Summary -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-chart-pie" style="font-size: 48px; color: #17a2b8; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">التقرير المالي الشامل</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">ملخص شامل للوضع المالي للصندوق</p>
                    <button onclick="showFinancialSummaryReport()" class="btn" style="background: #17a2b8; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

                <!-- Monthly Report -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-calendar-alt" style="font-size: 48px; color: #6f42c1; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">التقرير الشهري</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">نشاط الشهر الحالي والإحصائيات</p>
                    <button onclick="showMonthlyReport()" class="btn" style="background: #6f42c1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

                <!-- Active Loans Report -->
                <div class="report-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; text-align: center;">
                    <i class="fas fa-hand-holding-usd" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                    <h4 style="color: #333; margin-bottom: 10px;">القروض النشطة</h4>
                    <p style="color: #6c757d; margin-bottom: 20px;">القروض النشطة مع تقدم السداد والمبالغ المتبقية</p>
                    <button onclick="showActiveLoansReport()" class="btn" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-eye"></i> عرض التقرير
                    </button>
                </div>

            </div>

            <!-- Report Display Area -->
            <div id="reportDisplay" style="margin-top: 30px;"></div>

        </div>
    `;
}

// Reports Functions
async function showUsersReport() {
    showLoading(true);
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const users = result.users;
            let tableRows = '';
            
            users.forEach(user => {
                tableRows += `
                    <tr>
                        <td>${user.user_id}</td>
                        <td>${user.Aname}</td>
                        <td>موظف</td>
                        <td>${user.email}</td>
                        <td>${user.mobile1}</td>
                        <td>${user.balance.toFixed(3)} د.ك</td>
                        <td>${user.max_loan_amount.toFixed(3)} د.ك</td>
                        <td>
                            <span class="status-badge ${user.status}">${user.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                        </td>
                        <td>${new Date(user.registration_date).toLocaleDateString('en-US')}</td>
                    </tr>
                `;
            });
            
            showModal('تقرير الأعضاء', `
                <div class="report-content">
                    <div class="report-header">
                        <h4>إجمالي الأعضاء: ${users.length}</h4>
                        <button onclick="exportReport('users', 'تقرير_الأعضاء')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>رقم العضو</th>
                                    <th>الاسم</th>
                                    <th>النوع</th>
                                    <th>البريد الإلكتروني</th>
                                    <th>الهاتف</th>
                                    <th>الرصيد</th>
                                    <th>الحد الأقصى للقرض</th>
                                    <th>الحالة</th>
                                    <th>تاريخ التسجيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب تقرير الأعضاء', 'error');
    } finally {
        showLoading(false);
    }
}

async function showLoansReport() {
    showLoading(true);
    try {
        const response = await fetch('/api/admin/all-loans', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const loans = result.loans;
            let tableRows = '';
            
            loans.forEach(loan => {
                tableRows += `
                    <tr>
                        <td>${loan.loan_id}</td>
                        <td>${loan.Aname}</td>
                        <td>${loan.amount.toFixed(3)} د.ك</td>
                        <td>${loan.installment_amount.toFixed(3)} د.ك</td>
                        <td>
                            <span class="status-badge ${loan.status}">${getStatusText(loan.status)}</span>
                        </td>
                        <td>${new Date(loan.date).toLocaleDateString('en-US')}</td>
                        <td>${loan.admin_name || 'غير محدد'}</td>
                    </tr>
                `;
            });
            
            const totalAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
            const approvedLoans = loans.filter(loan => loan.status === 'opend');
            const totalApprovedAmount = approvedLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
            
            showModal('تقرير القروض', `
                <div class="report-content">
                    <div class="report-header">
                        <div class="report-stats">
                            <div class="stat-item">
                                <span>إجمالي القروض: ${loans.length}</span>
                            </div>
                            <div class="stat-item">
                                <span>المبلغ الإجمالي: ${totalAmount.toFixed(3)} د.ك</span>
                            </div>
                            <div class="stat-item">
                                <span>القروض المعتمدة: ${approvedLoans.length}</span>
                            </div>
                            <div class="stat-item">
                                <span>المبلغ المعتمد: ${totalApprovedAmount.toFixed(3)} د.ك</span>
                            </div>
                        </div>
                        <button onclick="exportReport('loans', 'تقرير_القروض')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>رقم القرض</th>
                                    <th>اسم المقترض</th>
                                    <th>المبلغ</th>
                                    <th>القسط الشهري</th>
                                    <th>الحالة</th>
                                    <th>تاريخ الطلب</th>
                                    <th>المدير المسؤول</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب تقرير القروض', 'error');
    } finally {
        showLoading(false);
    }
}

async function showTransactionsReport() {
    showLoading(true);
    try {
        const response = await fetch('/api/admin/all-transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const transactions = result.transactions;
            let tableRows = '';
            
            transactions.forEach(transaction => {
                const amount = transaction.credit > 0 ? transaction.credit : transaction.debit;
                const type = transaction.type_record === 'loan_payment' ? 'سداد قرض' : 
                           transaction.credit > 0 ? 'إيداع' : 'سحب';
                
                tableRows += `
                    <tr>
                        <td>${transaction.id}</td>
                        <td>${transaction.Aname}</td>
                        <td>${type}</td>
                        <td>${amount.toFixed(3)} د.ك</td>
                        <td>
                            <span class="status-badge ${transaction.status}">${getStatusText(transaction.status)}</span>
                        </td>
                        <td>${new Date(transaction.date).toLocaleDateString('en-US')}</td>
                        <td>${transaction.memo || 'لا يوجد'}</td>
                    </tr>
                `;
            });
            
            const totalCredits = transactions.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
            const totalDebits = transactions.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
            const acceptedTransactions = transactions.filter(t => t.status === 'accepted');
            
            showModal('تقرير المعاملات', `
                <div class="report-content">
                    <div class="report-header">
                        <div class="report-stats">
                            <div class="stat-item">
                                <span>إجمالي المعاملات: ${transactions.length}</span>
                            </div>
                            <div class="stat-item">
                                <span>إجمالي الإيداعات: ${totalCredits.toFixed(3)} د.ك</span>
                            </div>
                            <div class="stat-item">
                                <span>إجمالي السحوبات: ${totalDebits.toFixed(3)} د.ك</span>
                            </div>
                            <div class="stat-item">
                                <span>المعاملات المقبولة: ${acceptedTransactions.length}</span>
                            </div>
                        </div>
                        <button onclick="exportReport('transactions', 'تقرير_المعاملات')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>رقم المعاملة</th>
                                    <th>اسم المستخدم</th>
                                    <th>نوع المعاملة</th>
                                    <th>المبلغ</th>
                                    <th>الحالة</th>
                                    <th>التاريخ</th>
                                    <th>الملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب تقرير المعاملات', 'error');
    } finally {
        showLoading(false);
    }
}

async function showFinancialSummaryReport() {
    showLoading(true);
    try {
        const [usersResponse, loansResponse, transactionsResponse] = await Promise.all([
            fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            }),
            fetch('/api/admin/all-loans', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            }),
            fetch('/api/admin/all-transactions', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            })
        ]);
        
        const [usersResult, loansResult, transactionsResult] = await Promise.all([
            usersResponse.json(),
            loansResponse.json(),
            transactionsResponse.json()
        ]);
        
        if (usersResult.success && loansResult.success && transactionsResult.success) {
            const users = usersResult.users;
            const loans = loansResult.loans;
            const transactions = transactionsResult.transactions;
            
            // Calculate statistics
            const totalUsers = users.length;
            const totalBalance = users.reduce((sum, user) => sum + parseFloat(user.balance || 0), 0);
            const totalLoans = loans.length;
            const activeLoans = loans.filter(loan => loan.status === 'opend').length;
            const totalLoanAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
            const activeLoanAmount = loans.filter(loan => loan.status === 'opend').reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
            const totalDeposits = transactions.filter(t => t.status === 'accepted').reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
            const totalWithdrawals = transactions.filter(t => t.status === 'accepted').reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
            const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
            
            showModal('التقرير المالي الشامل', `
                <div class="report-content">
                    <div class="report-header">
                        <h4>التقرير المالي الشامل - ${new Date().toLocaleDateString('en-US')}</h4>
                        <button onclick="exportReport('financial-summary', 'التقرير_المالي_الشامل')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="financial-summary">
                        <div class="summary-section">
                            <h5><i class="fas fa-users"></i> إحصائيات الأعضاء</h5>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي الأعضاء</span>
                                    <span class="summary-value">${totalUsers}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي الأرصدة</span>
                                    <span class="summary-value">${totalBalance.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">متوسط الرصيد</span>
                                    <span class="summary-value">${(totalBalance / totalUsers).toFixed(3)} د.ك</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="summary-section">
                            <h5><i class="fas fa-hand-holding-usd"></i> إحصائيات القروض</h5>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي القروض</span>
                                    <span class="summary-value">${totalLoans}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">القروض النشطة</span>
                                    <span class="summary-value">${activeLoans}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي المبلغ المقترض</span>
                                    <span class="summary-value">${totalLoanAmount.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">المبلغ النشط</span>
                                    <span class="summary-value">${activeLoanAmount.toFixed(3)} د.ك</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="summary-section">
                            <h5><i class="fas fa-exchange-alt"></i> إحصائيات المعاملات</h5>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي الإيداعات</span>
                                    <span class="summary-value">${totalDeposits.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">إجمالي السحوبات</span>
                                    <span class="summary-value">${totalWithdrawals.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">المعاملات المعلقة</span>
                                    <span class="summary-value">${pendingTransactions}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">صافي التدفق النقدي</span>
                                    <span class="summary-value">${(totalDeposits - totalWithdrawals).toFixed(3)} د.ك</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            throw new Error('فشل في جلب البيانات');
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب التقرير المالي الشامل', 'error');
    } finally {
        showLoading(false);
    }
}

async function showMonthlyReport() {
    showLoading(true);
    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const [transactionsResponse, loansResponse] = await Promise.all([
            fetch('/api/admin/all-transactions', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            }),
            fetch('/api/admin/all-loans', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            })
        ]);
        
        const [transactionsResult, loansResult] = await Promise.all([
            transactionsResponse.json(),
            loansResponse.json()
        ]);
        
        if (transactionsResult.success && loansResult.success) {
            const allTransactions = transactionsResult.transactions;
            const allLoans = loansResult.loans;
            
            // Filter for current month
            const monthlyTransactions = allTransactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
            });
            
            const monthlyLoans = allLoans.filter(l => {
                const date = new Date(l.date);
                return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
            });
            
            const monthlyDeposits = monthlyTransactions.filter(t => t.status === 'accepted').reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
            const monthlyWithdrawals = monthlyTransactions.filter(t => t.status === 'accepted').reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
            const monthlyLoanAmount = monthlyLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
            const monthlyApprovedLoans = monthlyLoans.filter(l => l.status === 'opend').length;
            
            showModal('التقرير الشهري', `
                <div class="report-content">
                    <div class="report-header">
                        <h4>التقرير الشهري - ${currentMonth}/${currentYear}</h4>
                        <button onclick="exportReport('monthly', 'التقرير_الشهري')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="monthly-summary">
                        <div class="summary-section">
                            <h5><i class="fas fa-calendar-alt"></i> نشاط الشهر الحالي</h5>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">المعاملات الشهرية</span>
                                    <span class="summary-value">${monthlyTransactions.length}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">الإيداعات الشهرية</span>
                                    <span class="summary-value">${monthlyDeposits.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">السحوبات الشهرية</span>
                                    <span class="summary-value">${monthlyWithdrawals.toFixed(3)} د.ك</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">طلبات القروض الشهرية</span>
                                    <span class="summary-value">${monthlyLoans.length}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">القروض المعتمدة</span>
                                    <span class="summary-value">${monthlyApprovedLoans}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">مبلغ القروض الشهرية</span>
                                    <span class="summary-value">${monthlyLoanAmount.toFixed(3)} د.ك</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            throw new Error('فشل في جلب البيانات');
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب التقرير الشهري', 'error');
    } finally {
        showLoading(false);
    }
}

async function showActiveLoansReport() {
    showLoading(true);
    try {
        const response = await fetch('/api/admin/all-loans', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const activeLoans = result.loans.filter(loan => loan.status === 'opend');
            let tableRows = '';
            
            for (const loan of activeLoans) {
                // Get loan payments for this loan
                const paymentsResponse = await fetch(`/api/admin/all-transactions`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                const paymentsResult = await paymentsResponse.json();
                const loanPayments = paymentsResult.transactions.filter(t => 
                    t.type_record === 'loan_payment' && 
                    t.target_loan_id === loan.loan_id && 
                    t.status === 'accepted'
                );
                
                const totalPaid = loanPayments.reduce((sum, payment) => sum + parseFloat(payment.credit || 0), 0);
                const remainingAmount = parseFloat(loan.amount) - totalPaid;
                
                tableRows += `
                    <tr>
                        <td>${loan.loan_id}</td>
                        <td>${loan.Aname}</td>
                        <td>${loan.amount.toFixed(3)} د.ك</td>
                        <td>${totalPaid.toFixed(3)} د.ك</td>
                        <td>${remainingAmount.toFixed(3)} د.ك</td>
                        <td>${loan.installment_amount.toFixed(3)} د.ك</td>
                        <td>${new Date(loan.date).toLocaleDateString('en-US')}</td>
                        <td>${((totalPaid / parseFloat(loan.amount)) * 100).toFixed(1)}%</td>
                    </tr>
                `;
            }
            
            const totalActiveAmount = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
            
            showModal('تقرير القروض النشطة', `
                <div class="report-content">
                    <div class="report-header">
                        <div class="report-stats">
                            <div class="stat-item">
                                <span>القروض النشطة: ${activeLoans.length}</span>
                            </div>
                            <div class="stat-item">
                                <span>المبلغ الإجمالي: ${totalActiveAmount.toFixed(3)} د.ك</span>
                            </div>
                        </div>
                        <button onclick="exportReport('active-loans', 'تقرير_القروض_النشطة')" class="btn btn-primary">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>رقم القرض</th>
                                    <th>اسم المقترض</th>
                                    <th>المبلغ الأصلي</th>
                                    <th>المبلغ المدفوع</th>
                                    <th>المبلغ المتبقي</th>
                                    <th>القسط الشهري</th>
                                    <th>تاريخ الاعتماد</th>
                                    <th>نسبة السداد</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast(error.message || 'خطأ في جلب تقرير القروض النشطة', 'error');
    } finally {
        showLoading(false);
    }
}

function exportReport(reportType, fileName) {
    const reportContent = document.querySelector('.report-content');
    if (!reportContent) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    // Create printable content
    const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${fileName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .report-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                .report-table th { background-color: #f2f2f2; }
                .report-header { margin-bottom: 20px; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
                .summary-item { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
                .summary-label { font-weight: bold; }
                .summary-value { color: #007bff; }
                .status-badge { padding: 2px 8px; border-radius: 3px; font-size: 12px; }
                .status-badge.pending { background-color: #ffc107; color: #212529; }
                .status-badge.accepted { background-color: #28a745; color: white; }
                .status-badge.rejected { background-color: #dc3545; color: white; }
                .status-badge.opend { background-color: #17a2b8; color: white; }
                .status-badge.closed { background-color: #6c757d; color: white; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div style="text-align: center; margin-bottom: 30px;">
                <h1>درع العائلة - نظام إدارة القروض</h1>
                <h2>${fileName}</h2>
                <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
            </div>
            ${reportContent.innerHTML}
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                تم إنشاء التقرير بواسطة نظام درع العائلة - ${new Date().toLocaleString('en-US')}
            </div>
        </body>
        </html>
    `;
    
    // Create and download file
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('تم تصدير التقرير بنجاح', 'success');
}


function showForgotPassword() {
    showModal('إعادة تعيين كلمة المرور', `
        <div class="forgot-password-form">
            <p style="margin-bottom: 20px; color: #666; line-height: 1.6;">
                يمكنك إعادة تعيين كلمة المرور بنفسك من خلال إدخال البريد الإلكتروني ورقم الهاتف المسجل في حسابك.
            </p>
            <form id="resetPasswordForm" onsubmit="handlePasswordReset(event)">
                <div class="form-group">
                    <label for="resetEmail">البريد الإلكتروني</label>
                    <input type="email" id="resetEmail" name="email" required 
                           placeholder="أدخل البريد الإلكتروني المسجل">
                </div>
                <div class="form-group">
                    <label for="resetPhone">رقم الهاتف</label>
                    <input type="tel" id="resetPhone" name="phone" required 
                           placeholder="أدخل رقم الهاتف المسجل">
                </div>
                <div class="form-group">
                    <label for="resetNewPassword">كلمة المرور الجديدة</label>
                    <input type="password" id="resetNewPassword" name="newPassword" required 
                           placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)" minlength="6">
                </div>
                <div class="form-group">
                    <label for="resetConfirmPassword">تأكيد كلمة المرور</label>
                    <input type="password" id="resetConfirmPassword" name="confirmPassword" required 
                           placeholder="أعد إدخال كلمة المرور الجديدة">
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                        <strong>تنبيه:</strong> تأكد من إدخال البريد الإلكتروني ورقم الهاتف المسجل في حسابك بدقة
                    </p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="margin-left: 10px;">
                        <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
                    </button>
                    <button type="button" onclick="closeModal()" class="btn btn-secondary">إلغاء</button>
                </div>
            </form>
        </div>
    `);
}

async function handlePasswordReset(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const resetData = {
        email: formData.get('email'),
        phone: formData.get('phone'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // Validation
    if (!resetData.email || !resetData.phone || !resetData.newPassword || !resetData.confirmPassword) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (resetData.newPassword !== resetData.confirmPassword) {
        showToast('كلمة المرور وتأكيد كلمة المرور غير متطابقتين', 'error');
        return;
    }
    
    if (resetData.newPassword.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/users/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: resetData.email,
                phone: resetData.phone,
                newPassword: resetData.newPassword
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'حدث خطأ في الخادم');
        }
        
        if (result.success) {
            showToast(result.message, 'success');
            closeModal();
            
            // Show success message with user name
            showModal('تم إعادة تعيين كلمة المرور بنجاح', `
                <div style="text-align: center; padding: 20px;">
                    <div style="color: #28a745; font-size: 48px; margin-bottom: 20px;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <p style="font-size: 18px; margin-bottom: 20px;">تم إعادة تعيين كلمة المرور بنجاح</p>
                    <p style="color: #666; margin-bottom: 30px;">مرحباً ${result.user.name}، يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                    <button onclick="closeModal()" class="btn btn-primary">تسجيل الدخول</button>
                </div>
            `);
        } else {
            throw new Error(result.message || 'فشل في إعادة تعيين كلمة المرور');
        }
        
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور', 'error');
    } finally {
        showLoading(false);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'في الانتظار',
        'accepted': 'مقبول',
        'rejected': 'مرفوض',
        'opend': 'مفتوح',
        'closed': 'مغلق'
    };
    return statusMap[status] || status;
}

// Utility functions
function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showModal(title, content) {
    console.log('showModal called with title:', title);
    
    // Remove existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal div
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.onclick = closeModal;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.onclick = function(event) { event.stopPropagation(); };
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.innerHTML = `
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.innerHTML = content;
    
    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalDiv.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modalDiv);
    
    console.log('Modal added to DOM');
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Initialize loan calculator instance
const loanCalculator = new LoanCalculator();

// Modern Loan Calculator Functions
function handleCalculatorInput() {
    // Clear results when user types to encourage single-field input
    const resultDiv = document.getElementById('calculationResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
}

function performLoanCalculation() {
    try {
        // Get input values
        const loanAmountInput = document.getElementById('calcLoanAmount').value;
        const balanceInput = document.getElementById('calcBalance').value;
        const installmentInput = document.getElementById('calcInstallment').value;

        // Parse inputs (empty strings become null)
        const inputs = {
            loanAmount: loanAmountInput ? parseFloat(loanAmountInput) : null,
            balance: balanceInput ? parseFloat(balanceInput) : null,
            installment: installmentInput ? parseFloat(installmentInput) : null
        };

        // Perform auto-calculation
        const result = loanCalculator.autoCalculate(inputs);

        // Update all fields with calculated values
        document.getElementById('calcLoanAmount').value = result.loanAmount.toFixed(3);
        document.getElementById('calcBalance').value = result.balance.toFixed(3);
        document.getElementById('calcInstallment').value = result.installment.toFixed(3);

        // Show detailed results
        showLoanCalculationResult(result, 'success');

    } catch (error) {
        showLoanCalculationResult({ error: error.message }, 'error');
    }
}

function clearLoanCalculator() {
    document.getElementById('calcLoanAmount').value = '';
    document.getElementById('calcBalance').value = '';
    document.getElementById('calcInstallment').value = '';
    document.getElementById('calculationResult').style.display = 'none';
}

function showLoanCalculationResult(result, type) {
    const resultDiv = document.getElementById('calculationResult');
    const detailsDiv = document.getElementById('calculationDetails');
    const scenarioDiv = document.getElementById('calculationScenario');
    
    if (type === 'error') {
        detailsDiv.innerHTML = `<p class="error-message">${result.error}</p>`;
        scenarioDiv.textContent = '';
    } else {
        // Format the results nicely
        detailsDiv.innerHTML = `
            <div class="calculation-summary">
                <div class="calc-item">
                    <span class="calc-label">مبلغ القرض:</span>
                    <span class="calc-value">${loanCalculator.formatCurrency(result.loanAmount)}</span>
                </div>
                <div class="calc-item">
                    <span class="calc-label">الرصيد المطلوب:</span>
                    <span class="calc-value">${loanCalculator.formatCurrency(result.balance)}</span>
                </div>
                <div class="calc-item">
                    <span class="calc-label">قيمة القسط:</span>
                    <span class="calc-value">${loanCalculator.formatCurrency(result.installment)}</span>
                </div>
                ${result.installmentPeriod ? `
                <div class="calc-item">
                    <span class="calc-label">مدة التسديد:</span>
                    <span class="calc-value">${result.installmentPeriod} شهر</span>
                </div>
                ` : ''}
            </div>
            ${result.note ? `<div class="calculation-note">${result.note}</div>` : ''}
        `;
        
        scenarioDiv.textContent = `تم الحساب ${result.scenario}`;
    }
    
    resultDiv.style.display = 'block';
    
    const resultBox = resultDiv.querySelector('.result-box');
    resultBox.className = `result-box ${type}`;
}

// Legacy function names for backward compatibility
function calculateInstallment() {
    performLoanCalculation();
}

function calculateBalance() {
    performLoanCalculation();
}

function clearCalculator() {
    clearLoanCalculator();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KWD',
        minimumFractionDigits: 3
    }).format(amount || 0);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Auth Tab Functions
function showAuthTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab contents
    document.querySelectorAll('.auth-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab and content
    document.querySelector(`button[onclick="showAuthTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Registration Handler
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registrationData = {
        fullName: formData.get('fullName'),
        civilId: formData.get('civilId'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        userType: formData.get('userType'),
        workplace: formData.get('workplace'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // Validation
    if (!registrationData.fullName || !registrationData.civilId || !registrationData.phone || 
        !registrationData.email || !registrationData.userType || !registrationData.workplace ||
        !registrationData.password || !registrationData.confirmPassword) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (registrationData.password !== registrationData.confirmPassword) {
        showToast('كلمة المرور وتأكيدها غير متطابقتين', 'error');
        return;
    }
    
    if (registrationData.password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (!document.getElementById('agreeTerms').checked) {
        showToast('يجب الموافقة على الشروط والأحكام', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // For now, show success message (backend endpoint would need to be implemented)
        showToast('تم إرسال طلب التسجيل بنجاح. سيتم التواصل معك قريباً', 'success');
        
        // Reset form
        e.target.reset();
        
        // Switch to login tab
        showAuthTab('login');
        
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء التسجيل', 'error');
    } finally {
        showLoading(false);
    }
}

// Loan Terms Modal Functions
function showLoanTermsModal() {
    document.getElementById('loanTermsModal').style.display = 'flex';
}

function closeLoanTermsModal() {
    document.getElementById('loanTermsModal').style.display = 'none';
}

// Edit Profile Functions
function showEditProfile() {
    if (!currentUser) return;
    
    // Load current user data
    document.getElementById('editFullName').value = currentUser.name || '';
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editWorkplace').value = currentUser.workplace || '';
    
    document.getElementById('editProfileModal').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
    document.getElementById('editProfileForm').reset();
}

async function handleEditProfile(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        workplace: formData.get('workplace'),
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
    };
    
    // Validation
    if (!profileData.fullName || !profileData.phone || !profileData.email || !profileData.workplace) {
        showToast('يرجى ملء جميع الحقول الأساسية', 'error');
        return;
    }
    
    if (profileData.newPassword && profileData.newPassword.length < 6) {
        showToast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (profileData.newPassword && !profileData.currentPassword) {
        showToast('يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Call backend API to update profile
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(profileData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'حدث خطأ في الخادم');
        }
        
        if (result.success) {
            showToast(result.message || 'تم تحديث البيانات بنجاح', 'success');
            
            // Update current user data with response data
            currentUser.name = result.user.name;
            currentUser.phone = result.user.phone;
            currentUser.email = result.user.email;
            currentUser.workplace = result.user.workplace;
            
            // Update displayed name
            document.getElementById('userName').textContent = currentUser.name;
            
            closeEditProfileModal();
        } else {
            throw new Error(result.message || 'فشل في تحديث البيانات');
        }
        
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء تحديث البيانات', 'error');
    } finally {
        showLoading(false);
    }
}


// Will Functions for Info Modal
async function loadUserWillInInfo() {
    try {
        // For now, just clear the textarea (backend would load existing will)
        const willTextarea = document.getElementById('willContentInInfo');
        if (willTextarea) {
            willTextarea.value = '';
        }
        
    } catch (error) {
        console.error('Error loading will in info:', error);
    }
}

async function saveUserWill() {
    const willContent = document.getElementById('willContentInInfo')?.value.trim();
    
    if (!willContent) {
        showToast('يرجى كتابة نص الوصية', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // For now, show success message (backend endpoint would need to be implemented)
        showToast('تم حفظ الوصية بنجاح', 'success');
        
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء حفظ الوصية', 'error');
    } finally {
        showLoading(false);
    }
}

// Admin Will Functions
async function loadUserWillForAdmin(userId) {
    try {
        const willContainer = document.getElementById(`userWillContent_${userId}`);
        if (!willContainer) return;
        
        // For now, simulate loading user will (backend would load from database)
        setTimeout(() => {
            // Simulate empty will or existing content
            const hasWill = Math.random() > 0.7; // 30% chance of having a will
            
            if (hasWill) {
                willContainer.innerHTML = `
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; border-right: 3px solid #28a745;">
                        <p style="margin: 0; line-height: 1.5; color: #333;">
                            أوصي بتوزيع رصيدي في الصندوق على أبنائي بالتساوي، وأن يتم دفع أي قروض مستحقة من الرصيد أولاً قبل التوزيع.
                            وأعين زوجتي وكيلة عني في تنفيذ هذه الوصية.
                        </p>
                        <small style="color: #666; display: block; margin-top: 10px;">
                            <i class="fas fa-clock"></i> آخر تحديث: ${new Date().toLocaleDateString('en-US')}
                        </small>
                    </div>
                `;
            } else {
                willContainer.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 30px;">
                        <i class="fas fa-scroll" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                        <p style="margin: 0; color: #999;">لم يقم المستخدم بكتابة وصية بعد</p>
                    </div>
                `;
            }
        }, 500);
        
    } catch (error) {
        console.error('Error loading user will:', error);
        const willContainer = document.getElementById(`userWillContent_${userId}`);
        if (willContainer) {
            willContainer.innerHTML = `
                <div style="text-align: center; color: #dc3545; padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i> خطأ في تحميل الوصية
                </div>
            `;
        }
    }
}

async function refreshUserWill(userId) {
    const willContainer = document.getElementById(`userWillContent_${userId}`);
    if (willContainer) {
        willContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i> جاري تحديث الوصية...
            </div>
        `;
    }
    
    // Reload the will content
    loadUserWillForAdmin(userId);
}

// Admin Functions
async function updateRegistrationDate(userId) {
    const newDate = document.getElementById(`editRegistrationDate_${userId}`).value;
    
    if (!newDate) {
        showToast('يرجى اختيار تاريخ التسجيل', 'error');
        return;
    }
    
    const confirmed = confirm('هل أنت متأكد من تغيير تاريخ التسجيل؟');
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/admin/user/${userId}/registration-date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                registrationDate: newDate
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showToast('تم تحديث تاريخ التسجيل بنجاح', 'success');
            
            // Refresh user details
            setTimeout(() => {
                showUserDetails(userId);
            }, 1000);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء تحديث تاريخ التسجيل', 'error');
    } finally {
        showLoading(false);
    }
}

// Modal helper functions
function closeModal() {
    // Close new modal system
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Close old modal system
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Admin System Tools Functions
async function downloadFullDatabase() {
    if (!confirm('هل أنت متأكد من تحميل نسخة احتياطية JSON من قاعدة البيانات؟')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/admin/download-database', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('فشل في تحميل قاعدة البيانات');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('تم تحميل قاعدة البيانات JSON بنجاح', 'success');
        
    } catch (error) {
        console.error('Database download error:', error);
        showToast('خطأ في تحميل قاعدة البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

async function downloadSQLBackup() {
    if (!confirm('هل أنت متأكد من تحميل نسخة احتياطية SQL من قاعدة البيانات؟')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/admin/download-sql-backup', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('فشل في تحميل النسخة الاحتياطية SQL');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('تم تحميل النسخة الاحتياطية SQL بنجاح', 'success');
        
    } catch (error) {
        console.error('SQL backup error:', error);
        showToast('خطأ في تحميل النسخة الاحتياطية SQL', 'error');
    } finally {
        showLoading(false);
    }
}

async function generateTransactionsPDF() {
    showLoading(true);
    
    try {
        console.log('Starting PDF generation...');
        
        const response = await fetch('/api/admin/transactions-pdf', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error('فشل في إنشاء تقرير المعاملات');
        }
        
        const reportData = await response.json();
        console.log('Report data received:', reportData);
        
        // Generate HTML report for PDF printing
        generateHTMLReport(reportData);
        
        showToast('تم فتح تقرير المعاملات - يمكنك طباعته كـ PDF', 'success');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast(`خطأ في إنشاء تقرير PDF: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Generate HTML report for PDF printing
function generateHTMLReport(reportData) {
    try {
        console.log('Generating HTML report with data:', reportData);
        
        // Validate report data
        if (!reportData || !reportData.summary) {
            throw new Error('بيانات التقرير غير صحيحة');
        }
        
        // Ensure arrays exist
        if (!reportData.regular_transactions) {
            reportData.regular_transactions = [];
        }
        if (!reportData.loan_transactions) {
            reportData.loan_transactions = [];
        }
        
        // Create HTML content for PDF
    const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>تقرير المعاملات - درع العائلة</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .section { margin-bottom: 30px; }
                .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .amount { font-weight: bold; color: #28a745; }
                .debit { color: #dc3545; }
                .status-accepted { color: #28a745; }
                .status-pending { color: #ffc107; }
                .status-rejected { color: #dc3545; }
                .page-break { page-break-before: always; }
                
                /* Print styles */
                @media print {
                    button { display: none !important; }
                    body { margin: 0; font-size: 12px; }
                    .header { border-bottom: 2px solid #000; }
                    table { font-size: 11px; }
                    th, td { padding: 6px; }
                    .page-break { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير المعاملات المالية</h1>
                <h2>درع العائلة - نظام إدارة القروض</h2>
                <p>تاريخ الإنشاء: ${new Date(reportData.generated_date).toLocaleDateString('en-US')}</p>
            </div>
            
            <div class="summary">
                <h2>ملخص التقرير</h2>
                <p><strong>إجمالي المعاملات العادية:</strong> ${reportData.summary.total_transactions}</p>
                <p><strong>إجمالي مدفوعات القروض:</strong> ${reportData.summary.total_loan_payments}</p>
                <p><strong>إجمالي الإيداعات:</strong> ${(parseFloat(reportData.summary.total_credits) || 0).toFixed(3)} د.ك</p>
                <p><strong>إجمالي السحوبات:</strong> ${(parseFloat(reportData.summary.total_debits) || 0).toFixed(3)} د.ك</p>
                <p><strong>إجمالي مدفوعات القروض:</strong> ${(parseFloat(reportData.summary.total_loan_payments_amount) || 0).toFixed(3)} د.ك</p>
            </div>
            
            <div class="section">
                <h2>المعاملات العادية</h2>
                <table>
                    <thead>
                        <tr>
                            <th>رقم المعاملة</th>
                            <th>اسم المستخدم</th>
                            <th>الرصيد</th>
                            <th>الإيداع</th>
                            <th>السحب</th>
                            <th>الوصف</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>معتمد من</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.regular_transactions.map(t => `
                            <tr>
                                <td>${t.id}</td>
                                <td>${t.user_name || 'غير محدد'}</td>
                                <td>${(parseFloat(t.balance) || 0).toFixed(3)}</td>
                                <td class="amount">${(parseFloat(t.credit) || 0).toFixed(3)}</td>
                                <td class="debit">${(parseFloat(t.debit) || 0).toFixed(3)}</td>
                                <td>${t.memo || '-'}</td>
                                <td class="status-${t.status}">${t.status === 'accepted' ? 'معتمد' : t.status === 'pending' ? 'معلق' : 'مرفوض'}</td>
                                <td>${new Date(t.date).toLocaleDateString('en-US')}</td>
                                <td>${t.admin_name || 'غير محدد'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section page-break">
                <h2>مدفوعات القروض</h2>
                <table>
                    <thead>
                        <tr>
                            <th>رقم المعاملة</th>
                            <th>اسم المستخدم</th>
                            <th>رقم القرض</th>
                            <th>المبلغ</th>
                            <th>الوصف</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>معتمد من</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.loan_transactions.map(t => `
                            <tr>
                                <td>${t.id}</td>
                                <td>${t.user_name || 'غير محدد'}</td>
                                <td>${t.target_loan_id}</td>
                                <td class="amount">${(parseFloat(t.credit) || 0).toFixed(3)}</td>
                                <td>${t.memo || '-'}</td>
                                <td class="status-${t.status}">${t.status === 'accepted' ? 'معتمد' : t.status === 'pending' ? 'معلق' : 'مرفوض'}</td>
                                <td>${new Date(t.date).toLocaleDateString('en-US')}</td>
                                <td>${t.admin_name || 'غير محدد'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Add print and download buttons
    printWindow.addEventListener('load', function() {
        // Create button container
        const buttonContainer = printWindow.document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
        `;
        
        // Print button
        const printButton = printWindow.document.createElement('button');
        printButton.innerHTML = '🖨️ طباعة كـ PDF';
        printButton.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        printButton.onclick = function() {
            printWindow.print();
        };
        
        // Download HTML button
        const downloadButton = printWindow.document.createElement('button');
        downloadButton.innerHTML = '📥 تحميل HTML';
        downloadButton.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        downloadButton.onclick = function() {
            const blob = new Blob([printWindow.document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = printWindow.document.createElement('a');
            link.href = url;
            link.download = `تقرير_المعاملات_${new Date().toISOString().split('T')[0]}.html`;
            link.click();
            URL.revokeObjectURL(url);
        };
        
        buttonContainer.appendChild(printButton);
        buttonContainer.appendChild(downloadButton);
        printWindow.document.body.appendChild(buttonContainer);
        
        // Auto-focus the window
        printWindow.focus();
    });
    
    } catch (error) {
        console.error('HTML report generation error:', error);
        throw new Error(`خطأ في إنشاء تقرير HTML: ${error.message}`);
    }
}

// Admin User Registration Functions
function showUserRegistration() {
    document.getElementById('adminUserRegistrationModal').style.display = 'block';
}

function closeAdminUserRegistrationModal() {
    document.getElementById('adminUserRegistrationModal').style.display = 'none';
    document.getElementById('adminUserRegistrationForm').reset();
}

// Handle admin user registration form submission
document.getElementById('adminUserRegistrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        whatsapp: formData.get('whatsapp') || formData.get('phone'), // Use phone if WhatsApp not provided
        email: formData.get('email'),
        userType: 'member', // Default user type - simplified
        balance: parseFloat(formData.get('balance')) || 0,
        joiningFeeApproved: formData.get('joiningFeeApproved'),
        password: formData.get('password')
    };
    
    // Validate password length
    if (userData.password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/admin/register-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`تم تسجيل العضو بنجاح - رقم العضوية: ${data.userId}`, 'success');
            closeAdminUserRegistrationModal();
            
            // Refresh admin dashboard stats
            loadAdminDashboard();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('User registration error:', error);
        showToast(error.message || 'حدث خطأ أثناء تسجيل العضو', 'error');
    } finally {
        showLoading(false);
    }
});

// User Blocking/Unblocking Functions
async function blockUser(userId) {
    if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟ لن يتمكن من الدخول إلى النظام.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/admin/block-user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ blocked: true })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('تم حظر المستخدم بنجاح', 'success');
            
            // Refresh user details
            setTimeout(() => {
                showUserDetails(userId);
            }, 1000);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('Block user error:', error);
        showToast(error.message || 'حدث خطأ أثناء حظر المستخدم', 'error');
    } finally {
        showLoading(false);
    }
}

async function unblockUser(userId) {
    if (!confirm('هل أنت متأكد من إلغاء حظر هذا المستخدم؟ سيتمكن من الدخول إلى النظام مرة أخرى.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/admin/block-user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ blocked: false })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('تم إلغاء حظر المستخدم بنجاح', 'success');
            
            // Refresh user details
            setTimeout(() => {
                showUserDetails(userId);
            }, 1000);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('Unblock user error:', error);
        showToast(error.message || 'حدث خطأ أثناء إلغاء حظر المستخدم', 'error');
    } finally {
        showLoading(false);
    }
}

// Admin Loan Calculator Functions
function handleAdminCalculatorInput() {
    const loanAmount = parseFloat(document.getElementById('adminCalcLoanAmount').value) || null;
    const balance = parseFloat(document.getElementById('adminCalcBalance').value) || null;
    const installment = parseFloat(document.getElementById('adminCalcInstallment').value) || null;
    
    // Count how many fields have values
    const filledFields = [loanAmount, balance, installment].filter(val => val !== null && val > 0).length;
    
    // Auto-calculate if we have at least one value
    if (filledFields >= 1) {
        performAdminLoanCalculation();
    } else {
        // Hide results if no value
        document.getElementById('adminCalculationResult').style.display = 'none';
    }
}

function performAdminLoanCalculation() {
    try {
        const loanAmount = parseFloat(document.getElementById('adminCalcLoanAmount').value) || null;
        const balance = parseFloat(document.getElementById('adminCalcBalance').value) || null;
        const installment = parseFloat(document.getElementById('adminCalcInstallment').value) || null;
        
        // Use the existing loan calculator
        const calculator = new LoanCalculator();
        
        const result = calculator.autoCalculate({
            loanAmount: loanAmount,
            balance: balance,
            installment: installment
        });
        
        // Display results
        displayAdminCalculationResult(result);
        
    } catch (error) {
        document.getElementById('adminCalculationDetails').innerHTML = `
            <div style="color: #ffebee; background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
                <strong>خطأ في الحساب:</strong><br>
                ${error.message}
            </div>
        `;
        document.getElementById('adminCalculationScenario').textContent = '';
        document.getElementById('adminCalculationResult').style.display = 'block';
    }
}

function displayAdminCalculationResult(result) {
    const detailsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
            <div>
                <strong>مبلغ القرض</strong><br>
                <span style="font-size: 18px;">${result.loanAmount.toLocaleString('en-US', {minimumFractionDigits: 3})} د.ك</span>
            </div>
            <div>
                <strong>الرصيد المطلوب</strong><br>
                <span style="font-size: 18px;">${result.balance.toLocaleString('en-US', {minimumFractionDigits: 3})} د.ك</span>
            </div>
            <div>
                <strong>القسط الشهري</strong><br>
                <span style="font-size: 18px;">${result.installment.toLocaleString('en-US', {minimumFractionDigits: 3})} د.ك</span>
            </div>
        </div>
        ${result.installmentPeriod ? `
            <div style="text-align: center; margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.2); border-radius: 8px;">
                <strong>فترة السداد المقترحة:</strong> ${result.installmentPeriod} شهر
            </div>
        ` : ''}
        ${result.note ? `
            <div style="text-align: center; margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.3); border-radius: 5px; color: #fff3cd;">
                <small><strong>ملاحظة:</strong> ${result.note}</small>
            </div>
        ` : ''}
    `;
    
    document.getElementById('adminCalculationDetails').innerHTML = detailsHtml;
    document.getElementById('adminCalculationScenario').textContent = `السيناريو: ${result.scenario}`;
    document.getElementById('adminCalculationResult').style.display = 'block';
}

function clearAdminLoanCalculator() {
    document.getElementById('adminCalcLoanAmount').value = '';
    document.getElementById('adminCalcBalance').value = '';
    document.getElementById('adminCalcInstallment').value = '';
    document.getElementById('adminCalculationResult').style.display = 'none';
}

// Terms Popup Functions
function showTermsPopup() {
    document.getElementById('termsPopupModal').style.display = 'block';
}

function closeTermsPopup() {
    document.getElementById('termsPopupModal').style.display = 'none';
}

function acceptTermsAndClose() {
    // Check the terms checkbox
    document.getElementById('agreeTerms').checked = true;
    closeTermsPopup();
    showToast('تم قبول الشروط والأحكام', 'success');
}

// Calculator shortcut functions
function scrollToCalculator() {
    console.log('ScrollToCalculator called'); // Debug log
    
    const user = getCurrentUser();
    let calculator = null;
    
    // Find the appropriate calculator based on user type
    if (user && (user.userType === 'admin' || user.user_type === 'admin')) {
        calculator = document.querySelector('.admin-loan-calculator');
        console.log('Looking for admin calculator:', calculator); // Debug log
    } else {
        calculator = document.querySelector('.loan-calculator');
        console.log('Looking for user calculator:', calculator); // Debug log
    }
    
    if (calculator) {
        console.log('Calculator found, scrolling...'); // Debug log
        calculator.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Highlight the calculator for a moment
        calculator.style.transform = 'scale(1.02)';
        calculator.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            calculator.style.transform = 'scale(1)';
        }, 1000);
    } else {
        console.log('Calculator not found!'); // Debug log
    }
}

// Get current user helper function
function getCurrentUser() {
    return currentUser;
}

// Show calculator shortcut for admin users
function updateCalculatorShortcut() {
    const calculatorShortcut = document.getElementById('calculatorShortcut');
    const user = getCurrentUser();
    
    console.log('Updating calculator shortcut, user:', user); // Debug log
    
    // Check both userType and user_type properties to be safe
    if (user && (user.userType === 'admin' || user.user_type === 'admin')) {
        calculatorShortcut.style.display = 'flex';
        console.log('Showing calculator shortcut for admin'); // Debug log
    } else {
        calculatorShortcut.style.display = 'none';
        console.log('Hiding calculator shortcut for non-admin'); // Debug log
    }
}

// ==========================================
// NEW IMPROVED ADMIN UI FUNCTIONS
// ==========================================

// Combined Loans Management (Pending + All)
function showLoansManagement() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="admin-container">
            <h2 style="color: #007bff; margin-bottom: 20px;">
                <i class="fas fa-money-bill-wave"></i> إدارة طلبات القروض
            </h2>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px; gap: 10px;">
                <button onclick="showLoansManagementModal()" class="btn btn-secondary">
                    <i class="fas fa-window-restore"></i> عرض نافذة منبثقة
                </button>
                <button onclick="showLoansManagementFullscreen()" class="btn btn-primary">
                    <i class="fas fa-expand"></i> عرض شاشة كاملة
                </button>
            </div>
            
            <div id="loans-section">
                <div class="admin-tabs">
                    <button class="admin-tab active" onclick="switchLoansTab('pending', this)">
                        <i class="fas fa-clock"></i> طلبات القروض المعلقة
                    </button>
                    <button class="admin-tab" onclick="switchLoansTab('all', this)">
                        <i class="fas fa-list-alt"></i> جميع طلبات القروض
                    </button>
                </div>
                
                <div class="admin-tab-content">
                    <div id="loans-tab-content">
                        <div style="text-align: center; padding: 50px; color: #666;">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load default tab (pending loans) and add event listeners
    setTimeout(() => {
        switchLoansTab('pending');
        // Add event listeners to tabs for better reliability
        const tabs = document.querySelectorAll('#loans-section .admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const tabType = this.onclick.toString().includes("'pending'") ? 'pending' : 'all';
                switchLoansTab(tabType, this);
            });
        });
    }, 100);
}

// Combined Transactions Management (Pending + All)
function showTransactionsManagement() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="admin-container">
            <h2 style="color: #28a745; margin-bottom: 20px;">
                <i class="fas fa-exchange-alt"></i> إدارة المعاملات المالية
            </h2>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px; gap: 10px;">
                <button onclick="showTransactionsManagementModal()" class="btn btn-secondary">
                    <i class="fas fa-window-restore"></i> عرض نافذة منبثقة
                </button>
                <button onclick="showTransactionsManagementFullscreen()" class="btn btn-success">
                    <i class="fas fa-expand"></i> عرض شاشة كاملة
                </button>
            </div>
            
            <div id="transactions-section">
                <div class="admin-tabs">
                    <button class="admin-tab active" onclick="switchTransactionsTab('pending', this)">
                        <i class="fas fa-credit-card"></i> المعاملات المعلقة
                    </button>
                    <button class="admin-tab" onclick="switchTransactionsTab('all', this)">
                        <i class="fas fa-history"></i> جميع المعاملات
                    </button>
                </div>
                
                <div class="admin-tab-content">
                    <div id="transactions-tab-content">
                        <div style="text-align: center; padding: 50px; color: #666;">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load default tab (pending transactions)
    setTimeout(() => {
        switchTransactionsTab('pending');
        // Add event listeners to tabs for better reliability
        const tabs = document.querySelectorAll('#transactions-section .admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const tabType = this.onclick.toString().includes("'pending'") ? 'pending' : 'all';
                switchTransactionsTab(tabType, this);
            });
        });
    }, 100);
}

// Combined Users Management (Users + Registration)
function showUsersManagement() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="admin-container">
            <h2 style="color: #6f42c1; margin-bottom: 20px;">
                <i class="fas fa-users-cog"></i> إدارة الأعضاء
            </h2>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px; gap: 10px;">
                <button onclick="showUsersManagementModal()" class="btn btn-secondary">
                    <i class="fas fa-window-restore"></i> عرض نافذة منبثقة
                </button>
                <button onclick="showUsersManagementFullscreen()" class="btn" style="background: #6f42c1; color: white;">
                    <i class="fas fa-expand"></i> عرض شاشة كاملة
                </button>
            </div>
            
            <div id="users-section">
                <div class="admin-tabs">
                    <button class="admin-tab active" onclick="switchUsersTab('list', this)">
                        <i class="fas fa-users"></i> قائمة الأعضاء
                    </button>
                    <button class="admin-tab" onclick="switchUsersTab('register', this)">
                        <i class="fas fa-user-plus"></i> تسجيل عضو جديد
                    </button>
                </div>
                
                <div class="admin-tab-content">
                    <div id="users-tab-content">
                        <div style="text-align: center; padding: 50px; color: #666;">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load default tab (users list)
    setTimeout(() => {
        switchUsersTab('list');
        // Add event listeners to tabs for better reliability
        const tabs = document.querySelectorAll('#users-section .admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const tabType = this.onclick.toString().includes("'list'") ? 'list' : 'register';
                switchUsersTab(tabType, this);
            });
        });
    }, 100);
}

// Tab switching functions
async function switchLoansTab(tab, element) {
    // Update tab active states
    document.querySelectorAll('#loans-section .admin-tab').forEach(t => t.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        // Fallback - find the tab by the tab name
        const targetTab = document.querySelector(`#loans-section .admin-tab[onclick*="'${tab}'"]`);
        if (targetTab) targetTab.classList.add('active');
    }
    
    const contentDiv = document.getElementById('loans-tab-content');
    contentDiv.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>جاري تحميل البيانات...</p></div>';
    
    try {
        if (tab === 'pending') {
            const result = await apiCall('/admin/pending-loans');
            displayPendingLoans(result.loans, contentDiv);
        } else {
            const result = await apiCall('/admin/all-loans');
            displayAllLoans(result.loans, contentDiv);
        }
    } catch (error) {
        contentDiv.innerHTML = `<div style="text-align: center; padding: 50px; color: #dc3545;"><i class="fas fa-exclamation-triangle fa-2x"></i><p>خطأ في تحميل البيانات: ${error.message}</p></div>`;
    }
}

async function switchTransactionsTab(tab, element) {
    // Update tab active states
    document.querySelectorAll('#transactions-section .admin-tab').forEach(t => t.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        // Fallback - find the tab by the tab name
        const targetTab = document.querySelector(`#transactions-section .admin-tab[onclick*="'${tab}'"]`);
        if (targetTab) targetTab.classList.add('active');
    }
    
    const contentDiv = document.getElementById('transactions-tab-content');
    contentDiv.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>جاري تحميل البيانات...</p></div>';
    
    try {
        if (tab === 'pending') {
            const result = await apiCall('/admin/pending-transactions');
            displayPendingTransactions(result.transactions, contentDiv);
        } else {
            const result = await apiCall('/admin/all-transactions');
            displayAllTransactions(result.transactions, contentDiv);
        }
    } catch (error) {
        contentDiv.innerHTML = `<div style="text-align: center; padding: 50px; color: #dc3545;"><i class="fas fa-exclamation-triangle fa-2x"></i><p>خطأ في تحميل البيانات: ${error.message}</p></div>`;
    }
}

async function switchUsersTab(tab, element) {
    // Update tab active states
    document.querySelectorAll('#users-section .admin-tab').forEach(t => t.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        // Fallback - find the tab by the tab name
        const targetTab = document.querySelector(`#users-section .admin-tab[onclick*="'${tab}'"]`);
        if (targetTab) targetTab.classList.add('active');
    }
    
    const contentDiv = document.getElementById('users-tab-content');
    contentDiv.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>جاري تحميل البيانات...</p></div>';
    
    try {
        if (tab === 'list') {
            const result = await apiCall('/admin/users');
            displayUsersList(result.users, contentDiv);
        } else {
            displayUserRegistrationForm(contentDiv);
        }
    } catch (error) {
        contentDiv.innerHTML = `<div style="text-align: center; padding: 50px; color: #dc3545;"><i class="fas fa-exclamation-triangle fa-2x"></i><p>خطأ في تحميل البيانات: ${error.message}</p></div>`;
    }
}

// Display functions for different content types
function displayPendingLoans(loans, container) {
    if (!loans || loans.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-info-circle fa-2x"></i><p>لا توجد طلبات قروض معلقة</p></div>';
        return;
    }
    
    let html = `<div style="margin-bottom: 20px;"><h4 style="color: #007bff;">طلبات القروض المعلقة (${loans.length})</h4></div>`;
    
    loans.forEach(loan => {
        html += `
            <div style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 10px; background: #f9f9f9;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #007bff; margin-bottom: 10px;">👤 ${loan.Aname}</h5>
                        <p><strong>رقم المستخدم:</strong> ${loan.user_id}</p>
                        <p><strong>المبلغ المطلوب:</strong> ${formatCurrency(loan.loan_amount)}</p>
                        <p><strong>عدد الأقساط:</strong> ${loan.installment_period || 24} شهر</p>
                    </div>
                    <div>
                        <p><strong>القسط الشهري:</strong> ${formatCurrency(loan.installment_amount)}</p>
                        <p><strong>الرصيد الحالي:</strong> ${formatCurrency(loan.current_balance)}</p>
                        <p><strong>المدة المقترحة:</strong> ${loan.installment_period || 24} شهر (محسوبة تلقائياً)</p>
                        <span class="loan-date">${formatDate(loan.request_date)}</span>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="approveLoan(${loan.loan_id})" class="btn btn-success">موافقة</button>
                    <button onclick="rejectLoan(${loan.loan_id})" class="btn btn-secondary">رفض</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayAllLoans(loans, container) {
    if (!loans || loans.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-info-circle fa-2x"></i><p>لا توجد طلبات قروض</p></div>';
        return;
    }
    
    let html = `<div style="margin-bottom: 20px;"><h4 style="color: #007bff;">جميع طلبات القروض (${loans.length})</h4></div>`;
    
    loans.forEach(loan => {
        const statusColor = loan.status === 'approved' ? '#28a745' : 
                           loan.status === 'pending' ? '#ffc107' : '#dc3545';
        const statusText = loan.status === 'approved' ? 'موافق عليه' : 
                          loan.status === 'pending' ? 'معلق' : 'مرفوض';
        
        html += `
            <div style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 10px; background: #f9f9f9;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #007bff; margin-bottom: 10px;">👤 ${loan.Aname}</h5>
                        <p><strong>رقم القرض:</strong> ${loan.loan_id}</p>
                        <p><strong>المبلغ المطلوب:</strong> ${formatCurrency(loan.loan_amount)}</p>
                        <p><strong>القسط الشهري:</strong> ${formatCurrency(loan.installment_amount)}</p>
                    </div>
                    <div>
                        <p><strong>الحالة:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                        <p><strong>تاريخ الطلب:</strong> ${formatDate(loan.request_date)}</p>
                        ${loan.admin_name ? `<p><strong>تم المعالجة من:</strong> ${loan.admin_name}</p>` : ''}
                    </div>
                </div>
                ${loan.status === 'pending' ? `
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button onclick="approveLoan(${loan.loan_id})" class="btn btn-success">موافقة</button>
                        <button onclick="rejectLoan(${loan.loan_id})" class="btn btn-secondary">رفض</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Similar functions for transactions and users...
function displayPendingTransactions(transactions, container) {
    // Implementation similar to existing showPendingTransactions
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-info-circle fa-2x"></i><p>لا توجد معاملات معلقة</p></div>';
        return;
    }
    
    // Use existing transaction display logic but in container
    let html = `<div style="margin-bottom: 20px;"><h4 style="color: #28a745;">المعاملات المعلقة (${transactions.length})</h4></div>`;
    // Add transaction display code here...
    container.innerHTML = html;
}

function displayAllTransactions(transactions, container) {
    // Implementation similar to existing showAllTransactions
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-info-circle fa-2x"></i><p>لا توجد معاملات</p></div>';
        return;
    }
    
    let html = `<div style="margin-bottom: 20px;"><h4 style="color: #28a745;">جميع المعاملات (${transactions.length})</h4></div>`;
    // Add transaction display code here...
    container.innerHTML = html;
}

function displayUsersList(users, container) {
    // Implementation similar to existing showAllUsers
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;"><i class="fas fa-info-circle fa-2x"></i><p>لا يوجد أعضاء</p></div>';
        return;
    }
    
    let html = `<div style="margin-bottom: 20px;"><h4 style="color: #6f42c1;">قائمة الأعضاء (${users.length})</h4></div>`;
    // Add users display code here...
    container.innerHTML = html;
}

function displayUserRegistrationForm(container) {
    // Implementation similar to existing showUserRegistration
    container.innerHTML = `
        <div style="margin-bottom: 20px;"><h4 style="color: #6f42c1;">تسجيل عضو جديد</h4></div>
        <form id="inlineUserRegistrationForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="inlineRegFullName">الاسم الكامل</label>
                    <input type="text" id="inlineRegFullName" name="fullName" required>
                </div>
                <div class="form-group">
                    <label for="inlineRegEmail">البريد الإلكتروني</label>
                    <input type="email" id="inlineRegEmail" name="email" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="inlineRegPhone">رقم الهاتف</label>
                    <input type="tel" id="inlineRegPhone" name="phone" required>
                </div>
                <div class="form-group">
                    <label for="inlineRegBalance">الرصيد الابتدائي (د.ك)</label>
                    <input type="number" id="inlineRegBalance" name="balance" step="0.001" value="0" min="0">
                </div>
            </div>
            <div class="form-group">
                <label for="inlineRegPassword">كلمة المرور</label>
                <input type="password" id="inlineRegPassword" name="password" required>
            </div>
            <button type="submit" class="btn btn-success">
                <i class="fas fa-user-check"></i> تسجيل العضو
            </button>
        </form>
    `;
    
    // Add form submission handler
    document.getElementById('inlineUserRegistrationForm').addEventListener('submit', handleInlineUserRegistration);
}

async function handleInlineUserRegistration(e) {
    e.preventDefault();
    // Implementation similar to existing user registration
    showToast('قيد التطوير - سيتم إضافة هذه الميزة قريباً', 'info');
}