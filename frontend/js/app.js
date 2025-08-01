// App State
let currentUser = null;
let token = localStorage.getItem('authToken');

// DOM Cache
const DOM = {
    authSection: document.getElementById('authSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    userInfo: document.getElementById('userInfo'),
    userDashboard: document.getElementById('userDashboard'),
    adminDashboard: document.getElementById('adminDashboard'),
    loadingSpinner: document.getElementById('loadingSpinner')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized, token:', token);
    
    if (token) {
        console.log('Token found, verifying...');
        verifyToken();
    } else {
        console.log('No token found, showing login');
        showLogin();
    }
    
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    const elements = [
        ['loginForm', 'submit', handleLogin],
        ['logoutBtn', 'click', handleLogout],
        ['registerForm', 'submit', handleRegistration],
        ['editProfileForm', 'submit', handleEditProfile],
        // calculateLoanBtn removed - now handled in loan request tab
        ['modalLoanConfirmation', 'change', toggleModalSubmitButton],
        ['confirmLoanRequestBtn', 'click', handleLoanRequestFromModal]
    ];
    
    elements.forEach(([id, event, handler]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    });
}

// API helper
const apiCall = async (endpoint, method = 'GET', data = null) => {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        ...(data && { body: JSON.stringify(data) })
    };
    
    try {
        const response = await fetch(`/api${endpoint}`, config);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'خطأ في الخادم');
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

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
        
        showToast('تم تسجيل الدخول بنجاح', 'success');
        showDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function verifyToken() {
    showLoading(true);
    
    try {
        console.log('Verifying token:', token);
        const result = await apiCall('/auth/me');
        console.log('Token verification result:', result);
        currentUser = result.user;
        showDashboard();
        
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        token = null;
        showLogin();
        showToast('انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مرة أخرى', 'error');
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    token = null;
    currentUser = null;
    showLogin();
    showToast('تم تسجيل الخروج بنجاح', 'success');
}

const showSection = (section) => {
    const { authSection, dashboardSection, userInfo } = DOM;
    if (section === 'login') {
        authSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        userInfo.style.display = 'none';
    } else {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        userInfo.style.display = 'block';
    }
};

const showLogin = () => showSection('login');
const showDashboard = () => {
    showSection('dashboard');
    if (currentUser.isAdmin || currentUser.user_type === 'admin') {
        showAdminDashboard();
    } else {
        showUserDashboard();
    }
};

async function showUserDashboard() {
    DOM.userDashboard.style.display = 'block';
    DOM.adminDashboard.style.display = 'none';
    
    // Use the modular user dashboard loader
    if (window.userDashboardLoader) {
        await window.userDashboardLoader.init(currentUser);
    } else {
        // Fallback to basic user info display
        document.getElementById('userBalance').textContent = formatCurrency(currentUser.balance);
        document.getElementById('maxLoanAmount').textContent = formatCurrency(currentUser.maxLoanAmount);
    }
}

async function showAdminDashboard() {
    DOM.userDashboard.style.display = 'none';
    DOM.adminDashboard.style.display = 'block';
    
    // Use the admin dashboard module
    if (window.adminDashboard) {
        await window.adminDashboard.init();
    } else {
        // Fallback to basic admin view
        await loadAdminStats();
    }
}

// Basic admin stats loading
async function loadAdminStats() {
    try {
        const result = await apiCall('/admin/dashboard-stats');
        
        document.getElementById('totalUsers').textContent = result.stats.totalUsers;
        document.getElementById('pendingLoans').textContent = result.stats.pendingLoans;
        document.getElementById('pendingTransactions').textContent = result.stats.pendingTransactions;
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

// Registration handling
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (data.password !== data.confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiCall('/auth/register', 'POST', data);
        
        // Show user credentials card with user ID
        showUserCredentialsCard({
            userId: result.userId,
            password: data.password,
            fullName: data.fullName,
            email: data.email,
            message: result.message,
            emailSent: result.emailSent,
            emailMessage: result.emailMessage
        });
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Profile editing
async function handleEditProfile(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    showLoading(true);
    
    try {
        const result = await apiCall('/users/profile', 'PUT', data);
        showToast(result.message, 'success');
        currentUser = { ...currentUser, ...data };
        hideModal();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Loan calculation and request
async function handleLoanCalculation() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ القرض', 'error');
        return;
    }
    
    try {
        const result = await apiCall(`/loans/calculate?amount=${amount}`);
        
        // Display calculation results
        document.getElementById('calculatedInstallment').textContent = formatCurrency(result.installment);
        document.getElementById('calculationResults').style.display = 'block';
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function toggleModalSubmitButton() {
    const checkbox = document.getElementById('modalLoanConfirmation');
    const button = document.getElementById('confirmLoanRequestBtn');
    button.disabled = !checkbox.checked;
}

async function handleLoanRequestFromModal() {
    const amount = parseFloat(document.getElementById('modalLoanAmount').textContent.replace(/[^\d.]/g, ''));
    
    showLoading(true);
    
    try {
        const result = await apiCall('/loans/request', 'POST', { amount });
        showToast(result.message, 'success');
        hideModal();
        
        // Refresh dashboard if needed
        if (currentUser.isAdmin) {
            await loadAdminStats();
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Utility functions
const formatCurrency = Utils.formatCurrency;

const formatDate = Utils.formatDate;

const showLoading = Utils.showLoading;

const showToast = Utils.showToast;

// Modal functions
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.style.display = 'flex';
}

function hideModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Auth tab switching (make it global)
window.showAuthTab = function showAuthTab(tabName) {
    // Show rules popup before registration
    if (tabName === 'register' && !window.rulesAcknowledged) {
        showRegistrationRulesPopup();
        return;
    }
    
    // Hide all auth tab contents
    document.querySelectorAll('.auth-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all auth tabs
    document.querySelectorAll('.auth-tab').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active class to selected tab button
    const activeButton = document.querySelector(`[onclick="showAuthTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Update calculator shortcut
function updateCalculatorShortcut() {
    const calculatorShortcut = document.getElementById('calculatorShortcut');
    if (calculatorShortcut && currentUser) {
        if (currentUser.isAdmin || currentUser.user_type === 'admin') {
            calculatorShortcut.style.display = 'block';
        }
    }
}

// Loan Calculator Functions
function handleCalculatorInput() {
    // Auto-calculate when user inputs values
    const loanAmount = parseFloat(document.getElementById('calcLoanAmount').value) || 0;
    const balance = parseFloat(document.getElementById('calcBalance').value) || 0;
    const installment = parseFloat(document.getElementById('calcInstallment').value) || 0;
    
    // Use the loan calculator class if available
    if (window.LoanCalculator && loanAmount > 0 && balance > 0) {
        try {
            const calculator = new window.LoanCalculator();
            const result = calculator.calculateFromLoanAndBalance(loanAmount, balance);
            
            if (result.valid && installment === 0) {
                document.getElementById('calcInstallment').value = result.installment.toFixed(3);
            }
        } catch (error) {
            console.error('Calculator error:', error);
        }
    }
}

function performLoanCalculation() {
    const loanAmount = parseFloat(document.getElementById('calcLoanAmount').value) || 0;
    const balance = parseFloat(document.getElementById('calcBalance').value) || 0;
    const installment = parseFloat(document.getElementById('calcInstallment').value) || 0;
    
    if (!window.LoanCalculator) {
        showToast('حاسبة القروض غير متاحة', 'error');
        return;
    }
    
    const calculator = new window.LoanCalculator();
    let result = null;
    let scenario = '';
    
    try {
        if (loanAmount > 0 && balance > 0 && installment === 0) {
            // Calculate installment from loan amount and balance
            result = calculator.calculateFromLoanAndBalance(loanAmount, balance);
            scenario = 'تم حساب القسط من مبلغ القرض والرصيد';
        } else if (balance > 0 && installment > 0 && loanAmount === 0) {
            // Calculate loan amount from balance and installment
            result = calculator.calculateFromBalanceAndInstallment(balance, installment);
            scenario = 'تم حساب مبلغ القرض من الرصيد والقسط';
        } else if (loanAmount > 0 && installment > 0 && balance === 0) {
            // Calculate balance from loan amount and installment
            result = calculator.calculateFromLoanAndInstallment(loanAmount, installment);
            scenario = 'تم حساب الرصيد من مبلغ القرض والقسط';
        } else if (loanAmount > 0 && balance > 0 && installment > 0) {
            // Verify all three values
            result = calculator.calculateFromLoanAndBalance(loanAmount, balance);
            scenario = 'تم التحقق من صحة القيم المدخلة';
        } else {
            showToast('يرجى إدخال قيمتين على الأقل', 'error');
            return;
        }
        
        if (result && result.valid) {
            // Update form fields
            document.getElementById('calcLoanAmount').value = result.loanAmount.toFixed(3);
            document.getElementById('calcBalance').value = result.balance.toFixed(3);
            document.getElementById('calcInstallment').value = result.installment.toFixed(3);
            
            // Show results
            const resultDiv = document.getElementById('calculationResult');
            const detailsDiv = document.getElementById('calculationDetails');
            const scenarioDiv = document.getElementById('calculationScenario');
            
            detailsDiv.innerHTML = `
                <div class="calculation-details">
                    <div class="detail-row">
                        <span>مبلغ القرض:</span>
                        <span class="amount">${formatCurrency(result.loanAmount)}</span>
                    </div>
                    <div class="detail-row">
                        <span>الرصيد المطلوب:</span>
                        <span class="amount">${formatCurrency(result.balance)}</span>
                    </div>
                    <div class="detail-row">
                        <span>القسط الشهري:</span>
                        <span class="amount">${formatCurrency(result.installment)}</span>
                    </div>
                    <div class="detail-row">
                        <span>إجمالي المبلغ المسدد:</span>
                        <span class="amount">${formatCurrency(result.installment * 24)}</span>
                    </div>
                    <div class="detail-row">
                        <span>مدة السداد:</span>
                        <span>24 شهر</span>
                    </div>
                </div>
            `;
            
            scenarioDiv.textContent = scenario;
            resultDiv.style.display = 'block';
            
        } else {
            showToast('لا يمكن حساب القيم بالمدخلات الحالية', 'error');
        }
        
    } catch (error) {
        console.error('Calculation error:', error);
        showToast('خطأ في عملية الحساب', 'error');
    }
}

function clearLoanCalculator() {
    document.getElementById('calcLoanAmount').value = '';
    document.getElementById('calcBalance').value = '';
    document.getElementById('calcInstallment').value = '';
    document.getElementById('calculationResult').style.display = 'none';
}

// Show user credentials card after successful registration
function showUserCredentialsCard(data) {
    const { userId, password, fullName, email, message, emailSent, emailMessage } = data;
    
    // Check email status from response
    const emailFailed = !emailSent;
    
    const modalHtml = `
        <div class="credentials-modal">
            <div class="summary-card" style="text-align: center; margin-bottom: 20px;">
                <h4 style="color: #28a745; font-size: 24px;">
                    <i class="fas fa-check-circle"></i>
                    تم إنشاء حسابك بنجاح!
                </h4>
                <p style="color: #6c757d; margin: 10px 0;">مرحباً بك ${fullName} في درع العائلة</p>
            </div>

            <h3 style="color: #667eea; text-align: center; margin: 20px 0;">
                <i class="fas fa-key"></i> معلومات تسجيل الدخول الخاصة بك
            </h3>
                
            <div class="credentials-info">
                <div class="credential-item">
                    <label>رقم المستخدم:</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="user-id">${userId}</span>
                        <button onclick="copyToClipboard('${userId}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" title="نسخ رقم المستخدم">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="credential-item">
                    <label>كلمة المrور:</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="password">${password}</span>
                        <button onclick="copyToClipboard('${password}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" title="نسخ كلمة المrور">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="credential-item">
                    <label>البريد الإلكتروني:</label>
                    <span style="color: #6c757d;">${email}</span>
                </div>
            </div>

            ${emailFailed ? `
            <div class="credentials-note" style="background: #fff3cd; border-color: #ffc107;">
                <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
                <h4 style="color: #856404; margin: 0 0 10px 0;">لم يتم إرسال البريد الإلكتروني</h4>
                <p style="margin: 5px 0; color: #856404;">${emailMessage || 'تم إنشاء حسابك بنجاح، لكن لم نتمكن من إرسال تفاصيل الحساب إلى بريدك الإلكتروني.'}</p>
                <p style="margin: 5px 0; font-weight: bold; color: #856404;">⚠️ يرجى حفظ معلومات تسجيل الدخول المعروضة أعلاه!</p>
            </div>
            ` : `
            <div class="credentials-note" style="background: #d4edda; border-color: #28a745;">
                <i class="fas fa-envelope-check" style="color: #155724;"></i>
                <h4 style="color: #155724; margin: 0 0 10px 0;">تم إرسال البريد الإلكتروني بنجاح</h4>
                <p style="margin: 5px 0; color: #155724;">${emailMessage || `تم إرسال تفاصيل حسابك إلى ${email}`}</p>
            </div>
            `}

            <div class="user-info-card">
                <h4><i class="fas fa-shield-alt"></i> ملاحظات مهمة:</h4>
                <ul style="text-align: right; margin: 10px 0; padding-right: 20px;">
                    <li style="margin: 8px 0;"><strong>احتفظ برقم المستخدم وكلمة المرور</strong> في مكان آمن</li>
                    <li style="margin: 8px 0;">ستحتاج إلى <strong>رقم المستخدم (${userId})</strong> لتسجيل الدخول</li>
                    <li style="margin: 8px 0;">يمكنك تغيير كلمة المرور بعد تسجيل الدخول</li>
                    <li style="margin: 8px 0;">في حالة فقدان المعلومات، اتصل بالإدارة</li>
                </ul>
            </div>

            <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; line-height: 1.6;">
                    <input type="checkbox" id="credentialsAcknowledged" style="margin-top: 4px; transform: scale(1.2);">
                    <span style="font-size: 15px; color: #333; font-weight: 500;">
                        ✅ لقد حفظت معلومات تسجيل الدخول الخاصة بي وأفهم أنني سأحتاجها للوصول إلى حسابي
                    </span>
                </label>
            </div>

            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                <button id="continueToLoginBtn" class="btn btn-success" style="padding: 12px 30px; font-size: 16px; font-weight: bold;" disabled onclick="acknowledgeCredentialsAndLogin()">
                    <i class="fas fa-sign-in-alt"></i>
                    متابعة إلى تسجيل الدخول
                </button>
                <button onclick="copyAllCredentials('${userId}', '${password}')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-copy"></i>
                    نسخ جميع المعلومات
                </button>
            </div>
        </div>
    `;
    
    showModal('تم إنشاء حسابك بنجاح', modalHtml);
    
    // Setup checkbox handler
    const checkbox = document.getElementById('credentialsAcknowledged');
    const continueBtn = document.getElementById('continueToLoginBtn');
    
    if (checkbox && continueBtn) {
        checkbox.addEventListener('change', function() {
            continueBtn.disabled = !this.checked;
            if (this.checked) {
                continueBtn.classList.add('enabled');
            } else {
                continueBtn.classList.remove('enabled');
            }
        });
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showToast('تم النسخ إلى الحافظة', 'success');
    }).catch(function() {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('تم النسخ إلى الحافظة', 'success');
    });
}

// Copy all credentials
function copyAllCredentials(userId, password) {
    const credentials = `معلومات تسجيل الدخول - درع العائلة
رقم المستخدم: ${userId}
كلمة المrور: ${password}

يرجى الاحتفاظ بهذه المعلومات في مكان آمن.`;
    
    copyToClipboard(credentials);
}

// Acknowledge credentials and continue to login
function acknowledgeCredentialsAndLogin() {
    hideModal();
    showAuthTab('login');
    showToast('يمكنك الآن تسجيل الدخول باستخدام رقم المستخدم وكلمة المرور', 'info');
}

// Show registration rules popup
function showRegistrationRulesPopup() {
    const modalContent = `
        <div class="registration-rules-modal">
            <div class="rules-header">
                <h2 style="color: #007bff; text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-shield-alt"></i> قواعد صندوق درع العائلة
                </h2>
                <p style="text-align: center; color: #666; margin-bottom: 25px;">
                    يرجى قراءة هذه القواعد الأساسية بعناية قبل التسجيل
                </p>
            </div>
            
            <div class="key-rules">
                <div class="rule-card">
                    <div class="rule-icon">💰</div>
                    <div class="rule-content">
                        <h4>رسوم الانضمام</h4>
                        <p>10 دنانير كويتية غير قابلة للاسترداد</p>
                    </div>
                </div>
                
                <div class="rule-card">
                    <div class="rule-icon">📊</div>
                    <div class="rule-content">
                        <h4>الحد الأدنى للاشتراك</h4>
                        <p>240 د.ك خلال 24 شهر لإمكانية طلب القروض</p>
                    </div>
                </div>
                
                <div class="rule-card">
                    <div class="rule-icon">⚖️</div>
                    <div class="rule-content">
                        <h4>موافقة الإدارة</h4>
                        <p>العضوية تحتاج موافقة من الإدارة بعد التسجيل</p>
                    </div>
                </div>
                
                <div class="rule-card">
                    <div class="rule-icon">🎯</div>
                    <div class="rule-content">
                        <h4>7 شروط للقروض</h4>
                        <p>عدم الحظر، موافقة الرسوم، 500 د.ك رصيد، سنة عضوية، عدم وجود قروض نشطة، اشتراكات كافية، و30 يوم من آخر قرض</p>
                    </div>
                </div>
                
                <div class="rule-card">
                    <div class="rule-icon">🔢</div>
                    <div class="rule-content">
                        <h4>نظام القروض</h4>
                        <p>بدون فوائد - الحد الأقصى: (الرصيد × 3) أو 10,000 د.ك</p>
                    </div>
                </div>
                
                <div class="rule-card">
                    <div class="rule-icon">📧</div>
                    <div class="rule-content">
                        <h4>التواصل</h4>
                        <p>جميع الإشعارات عبر البريد الإلكتروني والواتساب</p>
                    </div>
                </div>
            </div>
            
            <div class="rules-footer">
                <p style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #ffc107;">
                    <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
                    <strong>تنبيه:</strong> بالضغط على "فهمت وأوافق" فإنك تؤكد قراءتك وفهمك وموافقتك على جميع شروط وأحكام الصندوق.
                </p>
                
                <div class="action-buttons">
                    <button onclick="acknowledgeRulesAndProceed()" class="btn btn-success" style="width: 200px; margin: 0 10px;">
                        <i class="fas fa-check-circle"></i> فهمت وأوافق - متابعة التسجيل
                    </button>
                    <button onclick="hideModal()" class="btn btn-secondary" style="width: 150px; margin: 0 10px;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <button onclick="showFullTerms()" class="btn btn-info btn-sm">
                        <i class="fas fa-file-contract"></i> عرض الشروط والأحكام كاملة
                    </button>
                </div>
            </div>
        </div>
        
        <style>
            .registration-rules-modal {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .key-rules {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin: 25px 0;
            }
            
            .rule-card {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .rule-card:hover {
                border-color: #007bff;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,123,255,0.1);
            }
            
            .rule-icon {
                font-size: 32px;
                margin-bottom: 10px;
                display: block;
            }
            
            .rule-card h4 {
                color: #007bff;
                margin: 10px 0;
                font-size: 16px;
            }
            
            .rule-card p {
                color: #666;
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
            }
            
            .action-buttons {
                text-align: center;
                margin: 20px 0;
            }
        </style>
    `;
    
    showModal('قواعد التسجيل', modalContent);
}

// Acknowledge rules and proceed to registration
function acknowledgeRulesAndProceed() {
    window.rulesAcknowledged = true;
    hideModal();
    showAuthTab('register');
    showToast('يمكنك الآن متابعة عملية التسجيل', 'success');
}

// Show full terms from rules popup
function showFullTerms() {
    hideModal();
    showAuthTab('terms');
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        hideModal();
    }
});

// Refresh current user data
async function refreshUserData() {
    try {
        console.log('Refreshing user data...');
        const result = await apiCall('/auth/me');
        currentUser = result.user;
        console.log('User data refreshed:', currentUser);
        
        // Refresh the dashboard if needed
        if (currentUser.isAdmin || currentUser.user_type === 'admin') {
            if (window.adminDashboard) {
                await window.adminDashboard.init();
            }
        } else {
            if (window.userDashboardLoader) {
                await window.userDashboardLoader.init(currentUser);
            }
        }
        
        showToast('تم تحديث بيانات المستخدم', 'success');
        return currentUser;
    } catch (error) {
        console.error('Failed to refresh user data:', error);
        showToast('خطأ في تحديث بيانات المستخدم', 'error');
        throw error;
    }
}

// Show forgot password modal
function showForgotPassword() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3><i class="fas fa-key"></i> نسيت كلمة المرور؟</h3>
                <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="forgot-password-info">
                    <div class="info-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <h4>تواصل مع الإدارة</h4>
                    <p>لإعادة تعيين كلمة المرور، يرجى التواصل مع أحد المدراء:</p>
                    <div class="contact-methods">
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>اتصال هاتفي</span>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>بريد إلكتروني</span>
                        </div>
                        <div class="contact-item">
                            <i class="fab fa-whatsapp"></i>
                            <span>واتساب</span>
                        </div>
                    </div>
                    <p class="note">سيقوم المدير بإعادة تعيين كلمة المرور وإرسالها لك بشكل آمن.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    إغلاق
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles for the forgot password modal
    if (!document.getElementById('forgot-password-styles')) {
        const styles = document.createElement('style');
        styles.id = 'forgot-password-styles';
        styles.textContent = `
            .forgot-password-info {
                text-align: center;
                padding: 20px;
            }
            .info-icon {
                font-size: 48px;
                color: #667eea;
                margin-bottom: 20px;
            }
            .forgot-password-info h4 {
                color: #333;
                margin-bottom: 15px;
            }
            .forgot-password-info p {
                color: #666;
                margin-bottom: 20px;
                line-height: 1.6;
            }
            .contact-methods {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin: 25px 0;
                flex-wrap: wrap;
            }
            .contact-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                color: #667eea;
                font-size: 14px;
            }
            .contact-item i {
                font-size: 24px;
            }
            .note {
                background: #f8f9ff;
                border: 1px solid #e3e8ff;
                border-radius: 8px;
                padding: 15px;
                color: #4c51bf !important;
                font-size: 14px;
                margin-top: 20px;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Terms Modal Functions
function showLoanTermsModal() {
    const modal = document.getElementById('loanTermsModal');
    const content = document.querySelector('.terms-content-modal');
    
    if (modal && content) {
        // Load terms content
        content.innerHTML = Utils.getTermsContent();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeLoanTermsModal() {
    const modal = document.getElementById('loanTermsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside content
document.addEventListener('click', function(e) {
    const modal = document.getElementById('loanTermsModal');
    if (e.target === modal) {
        closeLoanTermsModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLoanTermsModal();
    }
});

// Make functions global for HTML onclick handlers
window.hideModal = hideModal;
window.copyToClipboard = copyToClipboard;
window.copyAllCredentials = copyAllCredentials;
window.acknowledgeCredentialsAndLogin = acknowledgeCredentialsAndLogin;
window.performLoanCalculation = performLoanCalculation;
window.clearLoanCalculator = clearLoanCalculator;
window.refreshUserData = refreshUserData;
window.showForgotPassword = showForgotPassword;
window.showLoanTermsModal = showLoanTermsModal;
window.closeLoanTermsModal = closeLoanTermsModal;