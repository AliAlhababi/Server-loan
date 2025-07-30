// Admin Users Management Tab
// Handles all user-related admin functionality

class UsersManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.currentTab = 'list';
    }

    // Show users management section
    async show() {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #6f42c1;">
                        <i class="fas fa-users-cog"></i> إدارة الأعضاء
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="list">
                        <i class="fas fa-users"></i> قائمة الأعضاء
                    </button>
                    <button class="admin-tab" data-tab="register">
                        <i class="fas fa-user-plus"></i> تسجيل جديد
                    </button>
                </div>
                
                <div class="tab-content">
                    <div id="users-tab-content" class="tab-panel active">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupTabListeners();
        await this.loadTab('list');
    }

    // Setup tab listeners
    setupTabListeners() {
        setTimeout(() => {
            const tabs = this.adminDashboard.contentArea.querySelectorAll('.admin-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const tabType = tab.getAttribute('data-tab');
                    
                    // Update active tab
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    this.currentTab = tabType;
                    await this.loadTab(tabType);
                });
            });
        }, 100);
    }

    // Load tab content
    async loadTab(tab) {
        const contentDiv = document.getElementById('users-tab-content');
        contentDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
        
        try {
            if (tab === 'list') {
                const result = await apiCall('/admin/users');
                this.displayUsersList(result.users, contentDiv);
            } else {
                this.displayUserRegistrationForm(contentDiv);
            }
        } catch (error) {
            contentDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }

    // Display users list
    displayUsersList(users, container) {
        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>لا توجد أعضاء</h4>
                    <p>لم يتم تسجيل أي أعضاء بعد</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-users"></i> قائمة الأعضاء (${users.length})</h4>
                    <div class="table-filters">
                        <select id="statusFilter" onchange="usersManagement.filterUsers()">
                            <option value="">جميع الحالات</option>
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                            <option value="blocked">محظور</option>
                        </select>
                        <select id="typeFilter" onchange="usersManagement.filterUsers()">
                            <option value="">جميع الأنواع</option>
                            <option value="employee">موظف</option>
                            <option value="admin">إداري</option>
                        </select>
                        <input type="text" id="searchFilter" placeholder="البحث بالاسم..." onkeyup="usersManagement.filterUsers()">
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>معرف المستخدم</th>
                            <th>الاسم</th>
                            <th>نوع العضوية</th>
                            <th>التفويض العائلي</th>
                            <th>المدير المعتمد</th>
                            <th>البريد الإلكتروني</th>
                            <th>الهاتف</th>
                            <th>الرصيد</th>
                            <th>أقصى قرض</th>
                            <th>تاريخ التسجيل</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr data-status="${user.status}" data-type="${user.user_type}" data-name="${(user.Aname || '').toLowerCase()}">
                                <td><strong>#${user.user_id}</strong></td>
                                <td>
                                    <div class="user-info">
                                        <span class="user-name">${user.Aname || 'غير محدد'}</span>
                                        ${user.is_blocked ? '<small class="blocked-indicator">محظور</small>' : ''}
                                    </div>
                                </td>
                                <td>
                                    <span class="user-type ${user.user_type}">
                                        <i class="fas ${user.user_type === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
                                        ${user.user_type === 'employee' ? 'عضو' : 'إداري'}
                                    </span>
                                </td>
                                <td>
                                    ${this.generateFamilyDelegationStatus(user)}
                                </td>
                                <td>
                                    ${user.user_type === 'employee' && user.approved_by_admin_name ? 
                                        `<span class="admin-name">
                                            <i class="fas fa-user-check"></i>
                                            ${user.approved_by_admin_name}
                                        </span>` : 
                                        '<span class="no-admin">غير محدد</span>'
                                    }
                                </td>
                                <td>
                                    <span class="email">${user.email || 'غير محدد'}</span>
                                </td>
                                <td>
                                    <span class="phone">${user.phone || 'غير محدد'}</span>
                                </td>
                                <td class="balance-cell">
                                    <span class="balance">${FormatHelper.formatCurrency(user.balance)}</span>
                                </td>
                                <td class="max-loan-cell">
                                    <span class="max-loan">${FormatHelper.formatCurrency(user.max_loan_amount)}</span>
                                </td>
                                <td>
                                    <span class="date">${FormatHelper.formatDate(user.registration_date)}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${user.is_blocked ? 'blocked' : user.status}">
                                        ${user.is_blocked ? 'محظور' : 
                                          user.joining_fee_approved === 'approved' ? 'نشط' : 'غير مفعل'}
                                    </span>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-info" onclick="usersManagement.viewUserDetails(${user.user_id})" title="التفاصيل">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="usersManagement.editUser(${user.user_id})" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${user.whatsapp || user.phone ? 
                                        `<button class="btn btn-sm btn-success" onclick="usersManagement.chatWithUser('${user.whatsapp || user.phone}', '${user.Aname || 'المستخدم'}')" title="محادثة واتساب">
                                            <i class="fab fa-whatsapp"></i>
                                        </button>` : ''
                                    }
                                    ${user.is_blocked ? 
                                        `<button class="btn btn-sm btn-success" onclick="usersManagement.toggleUserBlock(${user.user_id}, false)" title="إلغاء الحظر">
                                            <i class="fas fa-unlock"></i>
                                        </button>` :
                                        `<button class="btn btn-sm btn-danger" onclick="usersManagement.toggleUserBlock(${user.user_id}, true)" title="حظر">
                                            <i class="fas fa-ban"></i>
                                        </button>`
                                    }
                                    ${user.joining_fee_approved === 'pending' ? 
                                        `<button class="btn btn-sm btn-success" onclick="usersManagement.approveJoiningFee(${user.user_id})" title="موافقة رسوم الانضمام">
                                            <i class="fas fa-check-circle"></i>
                                        </button>` : ''
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    // Display user registration form
    displayUserRegistrationForm(container) {
        const html = `
            <div class="registration-form-container">
                <div class="form-header">
                    <h4><i class="fas fa-user-plus"></i> تسجيل عضو جديد</h4>
                    <p>املأ جميع البيانات المطلوبة لتسجيل عضو جديد في النظام</p>
                </div>
                
                <form id="adminUserRegistrationForm" class="user-registration-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="regFullName">الاسم الكامل *</label>
                            <input type="text" id="regFullName" name="fullName" required>
                            <small class="field-hint">الاسم الثلاثي كاملاً</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regEmail">البريد الإلكتروني *</label>
                            <input type="email" id="regEmail" name="email" required>
                            <small class="field-hint">بريد إلكتروني صالح ومفعل</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regPhone">رقم الهاتف *</label>
                            <input type="tel" id="regPhone" name="phone" required>
                            <small class="field-hint">رقم الهاتف مع رمز الدولة</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regWhatsapp">رقم الواتساب</label>
                            <input type="tel" id="regWhatsapp" name="whatsapp">
                            <small class="field-hint">اختياري - سيتم استخدام رقم الهاتف إذا لم يتم تحديده</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regUserType">نوع العضوية *</label>
                            <select id="regUserType" name="userType" required>
                                <option value="">اختر نوع العضوية</option>
                                <option value="employee">موظف</option>
                                <option value="admin">إداري</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="regWorkplace">مكان العمل</label>
                            <input type="text" id="regWorkplace" name="workplace">
                            <small class="field-hint">اختياري</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regInitialBalance">الرصيد الابتدائي (د.ك)</label>
                            <input type="number" id="regInitialBalance" name="initialBalance" min="0" step="0.001" value="0">
                            <small class="field-hint">الرصيد الابتدائي للعضو</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="regJoiningFeeStatus">حالة رسوم الانضمام</label>
                            <select id="regJoiningFeeStatus" name="joiningFeeStatus">
                                <option value="pending">معلق</option>
                                <option value="approved">موافق عليه</option>
                                <option value="rejected">مرفوض</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="password-section">
                        <div class="form-group">
                            <label for="regPassword">كلمة المرور</label>
                            <div class="password-input-group">
                                <input type="password" id="regPassword" name="password" minlength="6">
                                <button type="button" id="generatePasswordBtn" class="btn btn-secondary">
                                    <i class="fas fa-random"></i> توليد تلقائي
                                </button>
                            </div>
                            <small class="field-hint">اتركه فارغاً لتوليد كلمة مرور تلقائياً</small>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary" id="registerUserBtn">
                            <i class="fas fa-user-plus"></i> تسجيل العضو
                        </button>
                        <button type="reset" class="btn btn-secondary">
                            <i class="fas fa-undo"></i> إعادة تعيين
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Setup form event listeners
        this.setupRegistrationForm();
    }

    // Setup registration form
    setupRegistrationForm() {
        setTimeout(() => {
            const form = document.getElementById('adminUserRegistrationForm');
            const generatePasswordBtn = document.getElementById('generatePasswordBtn');
            
            if (generatePasswordBtn) {
                generatePasswordBtn.addEventListener('click', () => {
                    const password = this.generateRandomPassword();
                    document.getElementById('regPassword').value = password;
                    showToast('تم توليد كلمة المرور', 'success');
                });
            }
            
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleUserRegistration();
                });
            }
        }, 100);
    }

    // Generate random password
    generateRandomPassword(length = 8) {
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    // Handle user registration
    async handleUserRegistration() {
        const form = document.getElementById('adminUserRegistrationForm');
        const formData = new FormData(form);
        
        const userData = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            whatsapp: formData.get('whatsapp') || formData.get('phone'),
            userType: formData.get('userType'),
            workplace: formData.get('workplace'),
            initialBalance: parseFloat(formData.get('initialBalance')) || 0,
            joiningFeeStatus: formData.get('joiningFeeStatus'),
            password: formData.get('password') || this.generateRandomPassword()
        };

        // Validation
        if (!userData.fullName || !userData.email || !userData.phone || !userData.userType) {
            showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        const registerBtn = document.getElementById('registerUserBtn');
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التسجيل...';

        try {
            const result = await apiCall('/admin/register-user', 'POST', userData);
            showToast(result.message, 'success');
            
            // Show generated credentials
            if (result.credentials) {
                const credentialsHtml = `
                    <div class="credentials-modal">
                        <h3><i class="fas fa-key"></i> بيانات الدخول للعضو الجديد</h3>
                        <div class="credentials-info">
                            <div class="credential-item">
                                <label>معرف المستخدم:</label>
                                <span class="user-id">${result.credentials.userId}</span>
                            </div>
                            <div class="credential-item">
                                <label>كلمة المرور:</label>
                                <span class="password">${result.credentials.password}</span>
                            </div>
                        </div>
                        <div class="credentials-note">
                            <i class="fas fa-info-circle"></i>
                            <p>تأكد من حفظ هذه البيانات وإرسالها للعضو الجديد. لن يتم عرض كلمة المرور مرة أخرى.</p>
                        </div>
                        <div class="modal-actions">
                            <button onclick="usersManagement.copyCredentials('${result.credentials.userId}', '${result.credentials.password}')" class="btn btn-primary">
                                <i class="fas fa-copy"></i> نسخ البيانات
                            </button>
                            <button onclick="hideModal()" class="btn btn-secondary">
                                <i class="fas fa-times"></i> إغلاق
                            </button>
                        </div>
                    </div>
                `;
                showModal('بيانات الدخول', credentialsHtml);
            }
            
            // Reset form
            form.reset();
            
            // Refresh users list if we're on that tab
            if (this.currentTab === 'list') {
                await this.loadTab('list');
            }
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> تسجيل العضو';
        }
    }

    // Copy credentials to clipboard
    copyCredentials(userId, password) {
        const text = `معرف المستخدم: ${userId}\nكلمة المرور: ${password}`;
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم نسخ البيانات بنجاح', 'success');
        }).catch(() => {
            showToast('فشل في نسخ البيانات', 'error');
        });
    }

    // Filter users
    filterUsers() {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        const searchFilter = document.getElementById('searchFilter')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#users-tab-content tbody tr');
        
        rows.forEach(row => {
            const status = row.getAttribute('data-status');
            const type = row.getAttribute('data-type');
            const name = row.getAttribute('data-name');
            
            let showRow = true;
            
            if (statusFilter && status !== statusFilter) {
                showRow = false;
            }
            
            if (typeFilter && type !== typeFilter) {
                showRow = false;
            }
            
            if (searchFilter && !name.includes(searchFilter)) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    }

    // View user details
    async viewUserDetails(userId) {
        try {
            // Fetch user details and payment history in parallel
            const [userResult, loanPaymentsResult, transactionsResult] = await Promise.all([
                apiCall(`/admin/user-details/${userId}`),
                apiCall(`/users/loans/payments/${userId}`).catch(() => ({ loanPayments: [] })),
                apiCall(`/users/transactions/${userId}`).catch(() => ({ transactions: [] }))
            ]);
            
            const user = userResult.user;
            const loanPayments = loanPaymentsResult.loanPayments || [];
            const transactions = transactionsResult.transactions || [];
            
            // Filter subscription payments from transactions
            const subscriptionPayments = transactions.filter(t => 
                (t.transaction_type === 'subscription' || t.memo?.includes('اشتراك')) && 
                t.status === 'accepted'
            );
            
            const modalContent = `
                <div class="user-details-modal">
                    <div class="user-details-header">
                        <h3><i class="fas fa-user"></i> تفاصيل العضو #${user.user_id}</h3>
                        <span class="status-badge ${user.is_blocked ? 'blocked' : user.joining_fee_approved === 'approved' ? 'active' : 'pending'}">
                            ${user.is_blocked ? 'محظور' : user.joining_fee_approved === 'approved' ? 'نشط' : 'غير مفعل'}
                        </span>
                    </div>
                    
                    <div class="user-details-content">
                        <div class="details-grid">
                            <div class="detail-section">
                                <h4><i class="fas fa-id-card"></i> المعلومات الشخصية</h4>
                                <div class="detail-row">
                                    <span class="label">الاسم الكامل:</span>
                                    <span class="value">${user.Aname || 'غير محدد'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">البريد الإلكتروني:</span>
                                    <span class="value">${user.email || 'غير محدد'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">رقم الهاتف:</span>
                                    <span class="value">${user.phone || 'غير محدد'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">الواتساب:</span>
                                    <span class="value">
                                        ${user.whatsapp || user.phone || 'غير محدد'}
                                        ${user.whatsapp || user.phone ? `
                                        <button class="btn btn-sm btn-success" style="margin-right: 10px; padding: 4px 8px; font-size: 12px;" 
                                                onclick="usersManagement.chatWithUser('${user.whatsapp || user.phone}', '${user.Aname}')" 
                                                title="فتح محادثة واتساب">
                                            <i class="fab fa-whatsapp"></i>
                                        </button>
                                        ` : ''}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">مكان العمل:</span>
                                    <span class="value">${user.workplace || 'غير محدد'}</span>
                                </div>
                            </div>

                            <div class="detail-section">
                                <h4><i class="fas fa-wallet"></i> المعلومات المالية</h4>
                                <div class="detail-row">
                                    <span class="label">الرصيد الحالي:</span>
                                    <span class="value highlight">${FormatHelper.formatCurrency(user.balance)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">نوع المستخدم:</span>
                                    <span class="value">
                                        <i class="fas ${user.user_type === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
                                        ${user.user_type === 'employee' ? 'عضو' : 'إداري'}
                                    </span>
                                </div>
                                ${user.user_type === 'employee' && user.approved_by_admin_name ? `
                                <div class="detail-row">
                                    <span class="label">المدير المعتمد:</span>
                                    <span class="value">
                                        <i class="fas fa-user-check"></i>
                                        ${user.approved_by_admin_name}
                                    </span>
                                </div>
                                ` : ''}
                                <div class="detail-row">
                                    <span class="label">تاريخ التسجيل:</span>
                                    <span class="value">${FormatHelper.formatDate(user.registration_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">رسوم الانضمام:</span>
                                    <span class="value">
                                        <span class="status-badge ${user.joining_fee_approved}">
                                            ${user.joining_fee_approved === 'approved' ? 'معتمدة' : 
                                              user.joining_fee_approved === 'pending' ? 'معلقة' : 'مرفوضة'}
                                        </span>
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">حالة الحساب:</span>
                                    <span class="value">
                                        <span class="status-badge ${user.is_blocked ? 'blocked' : 'active'}">
                                            ${user.is_blocked ? 'محظور' : 'نشط'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment History Tables -->
                        <div class="payment-history-section" style="margin-top: 24px;">
                            
                            <!-- Subscription Payments Table -->
                            <div class="subscription-payments-table" style="margin-bottom: 24px;">
                                <div class="table-header" style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #e5e7eb;">
                                    <h4 style="margin: 0; color: #374151; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-coins" style="color: #10b981;"></i> 
                                        دفعات الاشتراك (${subscriptionPayments.length})
                                    </h4>
                                </div>
                                <div class="table-content" style="max-height: 250px; overflow-y: auto; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                    ${this.generateSubscriptionPaymentsTable(subscriptionPayments)}
                                </div>
                            </div>

                            <!-- Loan Installments Table -->
                            <div class="loan-installments-table">
                                <div class="table-header" style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #e5e7eb;">
                                    <h4 style="margin: 0; color: #374151; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-credit-card" style="color: #3b82f6;"></i> 
                                        أقساط القروض (${loanPayments.length})
                                    </h4>
                                </div>
                                <div class="table-content" style="max-height: 250px; overflow-y: auto; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                    ${this.generateLoanPaymentsTable(loanPayments)}
                                </div>
                            </div>
                        </div>

                        <div class="user-actions" style="margin-top: 20px; text-align: center;">
                            <button class="btn btn-primary" onclick="usersManagement.editUser(${user.user_id})">
                                <i class="fas fa-edit"></i> تعديل البيانات
                            </button>
                            <button class="btn ${user.is_blocked ? 'btn-success' : 'btn-warning'}" 
                                    onclick="usersManagement.toggleUserBlock(${user.user_id}, ${!user.is_blocked})">
                                <i class="fas ${user.is_blocked ? 'fa-unlock' : 'fa-ban'}"></i>
                                ${user.is_blocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                            </button>
                            ${user.whatsapp || user.phone ? `
                            <button class="btn btn-success" onclick="usersManagement.chatWithUser('${user.whatsapp || user.phone}', '${user.Aname}')">
                                <i class="fab fa-whatsapp"></i> محادثة واتساب
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            showModal('تفاصيل العضو', modalContent);
            
        } catch (error) {
            console.error('Error loading user details:', error);
            showToast(`خطأ في تحميل تفاصيل المستخدم: ${error.message}`, 'error');
        }
    }

    // Edit user
    async editUser(userId) {
        try {
            // Get user details
            const result = await apiCall(`/admin/user-details/${userId}`);
            const user = result.user;
            
            const modalHtml = `
                <div style="max-width: 600px;">
                    <h3 style="color: #6f42c1; margin-bottom: 20px; text-align: center;">
                        <i class="fas fa-user-edit"></i> تعديل بيانات المستخدم
                    </h3>
                    <form id="adminEditUserForm">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group">
                                <label>الاسم الكامل</label>
                                <input type="text" name="fullName" value="${user.Aname || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" name="email" value="${user.email || ''}" required>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group">
                                <label>رقم الهاتف</label>
                                <input type="tel" name="phone" value="${user.phone || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>رقم الواتساب</label>
                                <input type="tel" name="whatsapp" value="${user.whatsapp || ''}" placeholder="اختياري">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group">
                                <label>مكان العمل</label>
                                <input type="text" name="workplace" value="${user.workplace || ''}" placeholder="اختياري">
                            </div>
                            <div class="form-group">
                                <label>الرصيد الحالي (د.ك)</label>
                                <input type="number" name="balance" value="${user.balance || 0}" step="0.001" min="0">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group">
                                <label>تاريخ التسجيل</label>
                                <input type="date" name="registration_date" value="${user.registration_date ? new Date(user.registration_date).toISOString().split('T')[0] : ''}">
                            </div>
                            <div class="form-group">
                                <label>نوع العضوية</label>
                                <select name="user_type">
                                    <option value="employee" ${user.user_type === 'employee' ? 'selected' : ''}>عضو</option>
                                    <option value="admin" ${user.user_type === 'admin' ? 'selected' : ''}>مدير</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                            <div class="form-group">
                                <label>حالة رسوم الانضمام</label>
                                <select name="joining_fee_approved">
                                    <option value="pending" ${user.joining_fee_approved === 'pending' ? 'selected' : ''}>معلق</option>
                                    <option value="approved" ${user.joining_fee_approved === 'approved' ? 'selected' : ''}>موافق</option>
                                    <option value="rejected" ${user.joining_fee_approved === 'rejected' ? 'selected' : ''}>مرفوض</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>حالة الحساب</label>
                                <select name="is_blocked">
                                    <option value="0" ${!user.is_blocked ? 'selected' : ''}>نشط</option>
                                    <option value="1" ${user.is_blocked ? 'selected' : ''}>محظور</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> حفظ التغييرات
                            </button>
                            <button type="button" class="btn btn-info" 
                                    onclick="usersManagement.resetUserPassword(${user.user_id}, '${user.Aname}')">
                                <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
                            </button>
                            <button type="button" onclick="hideModal()" class="btn btn-secondary">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal('تعديل بيانات المستخدم', modalHtml);
            
            // Setup form handler
            setTimeout(() => {
                document.getElementById('adminEditUserForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleUserUpdate(userId, e);
                });
            }, 100);
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async handleUserUpdate(userId, e) {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            showLoading(true);
            const result = await apiCall(`/admin/update-user/${userId}`, 'PUT', data);
            showToast(result.message, 'success');
            hideModal();
            
            // Refresh users list
            await this.loadTab('list');
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Toggle user block status
    async toggleUserBlock(userId, block) {
        const action = block ? 'حظر' : 'إلغاء حظر';
        if (!confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;
        
        try {
            const result = await apiCall(`/admin/block-user/${userId}`, 'PUT', { 
                action: block ? 'block' : 'unblock'
            });
            showToast(result.message, 'success');
            
            // Refresh users list
            await this.loadTab('list');
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Reset user password
    async resetUserPassword(userId, userName) {
        const newPassword = prompt(`إعادة تعيين كلمة المرور للمستخدم: ${userName}\n\nأدخل كلمة المرور الجديدة (6 أحرف على الأقل):`);
        
        if (!newPassword) return; // User cancelled
        
        if (newPassword.length < 6) {
            showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }
        
        if (!confirm(`هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم: ${userName}؟`)) return;
        
        try {
            const result = await apiCall('/auth/reset-password', 'POST', {
                targetUserId: userId,
                newPassword: newPassword
            });
            
            showToast(result.message, 'success');
            
            // Show the new password to admin
            alert(`تم إعادة تعيين كلمة المرور بنجاح!\n\nكلمة المرور الجديدة: ${newPassword}\n\nيرجى مشاركة هذه المعلومات مع المستخدم بشكل آمن.`);
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Approve joining fee
    async approveJoiningFee(userId) {
        if (!confirm('هل أنت متأكد من الموافقة على رسوم الانضمام؟')) return;
        
        try {
            // Get user details first for WhatsApp notification
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${userId}`);
                userDetails = userResult.user;
            } catch (detailError) {
                console.warn('Could not fetch user details for WhatsApp notification:', detailError);
            }

            const result = await apiCall(`/admin/joining-fee-action/${userId}`, 'PUT', { 
                action: 'approve' 
            });
            showToast(result.message, 'success');
            
            // Send WhatsApp notification if user details are available
            if (userDetails && (userDetails.whatsapp || userDetails.phone)) {
                try {
                    const phoneNumber = userDetails.whatsapp || userDetails.phone;
                    const userName = userDetails.Aname || 'العضو';
                    
                    // Get user financial data
                    let userFinancials = null;
                    try {
                        const userTransactionsResult = await apiCall(`/users/transactions/${userId}`);
                        const subscriptions = userTransactionsResult.transactions?.filter(t => 
                            t.transaction_type === 'subscription' && t.status === 'accepted'
                        ) || [];
                        const totalSubscriptions = subscriptions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
                        
                        userFinancials = {
                            currentBalance: FormatHelper.formatCurrency(userDetails.balance || 0),
                            totalSubscriptions: totalSubscriptions.toFixed(3)
                        };
                    } catch (financialError) {
                        console.warn('Could not fetch user financial data:', financialError);
                    }
                    
                    // Send WhatsApp notification
                    const whatsappSent = Utils.sendWhatsAppNotification(
                        phoneNumber,
                        userName,
                        'joiningFeeApproved',
                        userFinancials
                    );
                    
                    if (whatsappSent) {
                        showToast('تم فتح واتساب ويب لإرسال إشعار اعتماد العضوية للعضو', 'info');
                    }
                } catch (whatsappError) {
                    console.warn('WhatsApp notification failed:', whatsappError);
                    // Don't show error to user - WhatsApp is supplementary
                }
            }
            
            // Refresh users list
            await this.loadTab('list');
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Generate subscription payments table (reusing existing subscription tab logic)
    generateSubscriptionPaymentsTable(subscriptionPayments) {
        if (subscriptionPayments.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 20px; color: #6b7280;">
                    <i class="fas fa-receipt" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p>لا توجد دفعات اشتراك</p>
                </div>
            `;
        }

        return `
            <div class="payments-grid" style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
                ${subscriptionPayments.slice(0, 8).map(payment => `
                    <div class="payment-card" style="border: 1px solid #d1d5db; border-radius: 10px; padding: 18px; background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 700; font-size: 18px; color: #059669; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-coins" style="background: #10b981; color: white; padding: 6px; border-radius: 50%; font-size: 12px;"></i>
                                    ${FormatHelper.formatCurrency(payment.credit)}
                                </div>
                                <div style="font-size: 13px; color: #6b7280; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-calendar-alt" style="color: #9ca3af;"></i>
                                    ${FormatHelper.formatDate(payment.date)}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span class="status-badge" style="background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-check-circle"></i> معتمد
                                </span>
                                ${payment.transaction_id ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">#${payment.transaction_id}</div>` : ''}
                            </div>
                        </div>
                        ${payment.memo ? `
                            <div style="background: #f9fafb; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
                                <div style="font-size: 13px; color: #374151; font-weight: 500;">
                                    <i class="fas fa-comment-alt" style="color: #6b7280; margin-left: 6px;"></i>
                                    ${payment.memo}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
                ${subscriptionPayments.length > 8 ? `
                    <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; color: #64748b; font-size: 14px; font-weight: 500;">
                        <i class="fas fa-ellipsis-h" style="margin-left: 8px;"></i>
                        و ${subscriptionPayments.length - 8} دفعة إضافية...
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Chat with user via WhatsApp
    chatWithUser(phoneNumber, userName) {
        const defaultMessage = `مرحباً ${userName}، أتواصل معك من إدارة صندوق درع العائلة. كيف يمكنني مساعدتك؟`;
        
        // Try to open WhatsApp Web (defaults to true)
        const success = Utils.openWhatsAppWeb(phoneNumber, defaultMessage);
        
        if (success) {
            showToast(`تم فتح واتساب ويب للمحادثة مع ${userName}`, 'success');
        } else {
            showToast('خطأ في فتح واتساب ويب - تأكد من صحة رقم الهاتف', 'error');
        }
    }

    // Generate family delegation status display
    generateFamilyDelegationStatus(user) {
        const delegationType = user.family_delegation_type;
        
        if (!delegationType) {
            return '<span class="delegation-status none"><i class="fas fa-minus"></i> لا يوجد</span>';
        }
        
        switch (delegationType) {
            case 'family_head':
                const memberCount = user.family_members_count || 0;
                return `
                    <span class="delegation-status family-head" title="رب أسرة معتمد">
                        <i class="fas fa-user-shield"></i>
                        رب أسرة
                        ${memberCount > 0 ? `<small>(${memberCount} أعضاء)</small>` : ''}
                    </span>
                `;
            case 'family_member':
                return `
                    <span class="delegation-status family-member" title="عضو في عائلة ${user.family_head_name || ''}">
                        <i class="fas fa-handshake"></i>
                        عضو عائلة
                        ${user.family_head_name ? `<small>تحت: ${user.family_head_name}</small>` : ''}
                    </span>
                `;
            case 'pending_head_request':
                return `
                    <span class="delegation-status pending" title="طلب رب أسرة معلق">
                        <i class="fas fa-clock"></i>
                        طلب رب أسرة معلق
                    </span>
                `;
            case 'pending_member_request':
                return `
                    <span class="delegation-status pending" title="طلب انضمام عائلة معلق">
                        <i class="fas fa-clock"></i>
                        طلب انضمام معلق
                        ${user.family_head_name ? `<small>إلى: ${user.family_head_name}</small>` : ''}
                    </span>
                `;
            default:
                return '<span class="delegation-status unknown"><i class="fas fa-question"></i> غير محدد</span>';
        }
    }

    // Generate loan payments table (reusing existing loan payments tab logic)
    generateLoanPaymentsTable(loanPayments) {
        if (loanPayments.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 20px; color: #6b7280;">
                    <i class="fas fa-credit-card" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p>لا توجد أقساط قروض</p>
                </div>
            `;
        }

        return `
            <div class="payments-grid" style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
                ${loanPayments.slice(0, 8).map(payment => {
                    const statusClass = payment.status === 'accepted' ? 'success' : 
                                       payment.status === 'rejected' ? 'error' : 'warning';
                    const statusText = payment.status === 'accepted' ? 'موافق عليه' : 
                                      payment.status === 'rejected' ? 'مرفوض' : 'معلق';
                    const statusIcon = payment.status === 'accepted' ? 'fa-check-circle' : 
                                      payment.status === 'rejected' ? 'fa-times-circle' : 'fa-clock';
                    
                    const statusColors = {
                        'accepted': { bg: '#dcfce7', color: '#166534', icon: '#10b981' },
                        'rejected': { bg: '#fee2e2', color: '#991b1b', icon: '#ef4444' },
                        'pending': { bg: '#fef3c7', color: '#92400e', icon: '#f59e0b' }
                    };
                    const colors = statusColors[payment.status] || statusColors['pending'];

                    return `
                        <div class="payment-card" style="border: 1px solid #d1d5db; border-radius: 10px; padding: 18px; background: linear-gradient(135deg, #fafbff 0%, #ffffff 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 700; font-size: 18px; color: #1f2937; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-credit-card" style="background: #3b82f6; color: white; padding: 6px; border-radius: 50%; font-size: 12px;"></i>
                                        ${FormatHelper.formatCurrency(payment.credit)}
                                    </div>
                                    <div style="font-size: 13px; color: #6b7280; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                                        <i class="fas fa-calendar-alt" style="color: #9ca3af;"></i>
                                        ${FormatHelper.formatDate(payment.date)}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span class="status-badge" style="background: ${colors.bg}; color: ${colors.color}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                        <i class="fas ${statusIcon}" style="color: ${colors.icon};"></i>
                                        ${statusText}
                                    </span>
                                    ${payment.loan_id ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">#${payment.loan_id}</div>` : ''}
                                </div>
                            </div>
                            
                            ${payment.memo ? `
                                <div style="background: #f9fafb; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
                                    <div style="font-size: 13px; color: #374151; font-weight: 500;">
                                        <i class="fas fa-comment-alt" style="color: #6b7280; margin-left: 6px;"></i>
                                        ${payment.memo}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${payment.admin_name ? `
                                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                                    <div style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px;">
                                        <i class="fas fa-user-shield" style="color: #9ca3af;"></i>
                                        معتمد من: <span style="font-weight: 600; color: #374151;">${payment.admin_name}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
                ${loanPayments.length > 8 ? `
                    <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; color: #64748b; font-size: 14px; font-weight: 500;">
                        <i class="fas fa-ellipsis-h" style="margin-left: 8px;"></i>
                        و ${loanPayments.length - 8} قسط إضافي...
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Global instance
window.usersManagement = null;