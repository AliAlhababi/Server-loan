// UserDetailsPage.js - Modular User Details Management
class UserDetailsPage {
    constructor() {
        this.userData = null;
        this.loanPayments = [];
        this.transactions = [];
        this.userLoans = [];
        this.currentUser = null;
    }

    // Initialize and load user details
    async init(userId) {
        try {
            this.showLoading();
            await this.loadUserData(userId);
            this.render();
            this.attachEventListeners();
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Load user data from API
    async loadUserData(userId) {
        try {
            const [userResult, loanPaymentsResult, transactionsResult, userLoansResult] = await Promise.all([
                this.apiCall(`/admin/user-details/${userId}`),
                this.apiCall(`/admin/user-loan-payments/${userId}`).catch(() => ({ loanPayments: [] })),
                this.apiCall(`/admin/user-transactions/${userId}?limit=50`).catch(() => ({ transactions: [] })),
                this.apiCall('/admin/all-loans').then(result => {
                    // Filter loans for this specific user
                    const userLoans = (result.loans || []).filter(loan => loan.user_id == userId);
                    console.log(`📊 UserDetailsPage: Found ${userLoans.length} loans for user ${userId}`);
                    return { loans: userLoans };
                }).catch(() => ({ loans: [] }))
            ]);
            
            this.userData = userResult.user;
            this.loanPayments = loanPaymentsResult.loanPayments || [];
            this.transactions = transactionsResult.transactions || [];
            this.userLoans = userLoansResult.loans || [];
        } catch (error) {
            throw new Error(`خطأ في تحميل بيانات المستخدم: ${error.message}`);
        }
    }

    // API call helper - use global apiCall function
    async apiCall(endpoint, method = 'GET', data = null) {
        // Use the global apiCall function from app.js
        if (typeof window.apiCall === 'function') {
            return await window.apiCall(endpoint, method, data);
        }

        // Fallback if global apiCall not available
        const authToken = localStorage.getItem('authToken');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`/api${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'خطأ في الاتصال بالخادم');
        }

        return result;
    }

    // Show loading state
    showLoading() {
        document.body.innerHTML = `
            <div class="loading-container" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #f8f9fa; display: flex; align-items: center; justify-content: center;
                z-index: 9999;
            ">
                <div style="text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #667eea; margin-bottom: 16px;"></i>
                    <p style="color: #6c757d; font-size: 16px;">جاري تحميل تفاصيل المستخدم...</p>
                </div>
            </div>
        `;
    }

    // Show error state
    showError(message) {
        document.body.innerHTML = `
            <div class="error-container" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #f8f9fa; display: flex; align-items: center; justify-content: center;
                z-index: 9999; padding: 20px; direction: rtl;
            ">
                <div style="text-align: center; max-width: 500px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <h2 style="color: #2c3e50; margin-bottom: 12px;">خطأ في تحميل البيانات</h2>
                    <p style="color: #6c757d; margin-bottom: 20px;">${message}</p>
                    <button onclick="window.close()" class="btn-close" style="
                        padding: 12px 24px; background: #6c757d; color: white; border: none; 
                        border-radius: 8px; cursor: pointer; font-size: 14px;
                    ">إغلاق</button>
                </div>
            </div>
        `;
    }

    // Render the complete page
    render() {
        const user = this.userData;
        
        document.head.innerHTML = `
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تفاصيل العضو #${user.user_id} - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>${this.getCSS()}</style>
        `;

        document.body.innerHTML = `
            <div class="user-details-page">
                ${this.renderHeader()}
                ${this.renderActionButtons()}
                ${this.renderFinancialSummary()}
                ${this.renderUserInfo()}
                ${this.renderLoansSection()}
                ${this.renderPaymentHistory()}
                ${this.renderTransactionHistory()}
            </div>
            <div id="alert-container"></div>
        `;
    }

    // Render page header
    renderHeader() {
        const user = this.userData;
        return `
            <div class="page-header">
                <h1>
                    <i class="fas fa-user-circle"></i>
                    تفاصيل العضو: ${user.Aname}
                </h1>
                <div class="subtitle">رقم العضوية: #${user.user_id}</div>
                <div class="status-badge ${this.getUserStatusClass()}">
                    ${this.getUserStatusText()}
                </div>
            </div>
        `;
    }

    // Render user basic information
    renderUserInfo() {
        const user = this.userData;
        return `
            <div class="info-section">
                <h2><i class="fas fa-info-circle"></i> معلومات العضو</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <label>الاسم الكامل</label>
                        <span>${user.Aname || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>البريد الإلكتروني</label>
                        <span>${user.email || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم الهاتف</label>
                        <span>${user.phone || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم الواتساب</label>
                        <span>${user.whatsapp || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ التسجيل</label>
                        <span>${this.formatDate(user.registration_date)}</span>
                    </div>
                    ${user.user_type === 'employee' ? `
                    <div class="info-item">
                        <label>المدير المعتمد</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span>${user.approved_by_admin_name || 'غير محدد'}</span>
                            <button class="btn btn-sm btn-outline-primary admin-reassign-btn"
                                    onclick="userDetailsPage.showAdminReassignmentModal(${user.user_id}, '${user.Aname}', ${user.approved_by_admin_id || 'null'})"
                                    title="إعادة تعيين المدير">
                                <i class="fas fa-exchange-alt"></i> تغيير
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Render financial summary
    renderFinancialSummary() {
        const user = this.userData;
        const remainingLoanAmount = this.getRemainingLoanAmount();
        return `
            <div class="financial-summary">
                <h2><i class="fas fa-chart-line"></i> الملخص المالي</h2>
                <div class="financial-cards">
                    <div class="financial-card balance">
                        <div class="card-icon"><i class="fas fa-wallet"></i></div>
                        <div class="card-content">
                            <div class="card-label">الرصيد الحالي / إجمالي الاشتراكات</div>
                            <div class="card-value">${this.formatCurrency(user.balance)}</div>
                        </div>
                    </div>
                    <div class="financial-card remaining-loan ${remainingLoanAmount > 0 ? 'has-loan' : 'no-loan'}">
                        <div class="card-icon"><i class="fas fa-credit-card"></i></div>
                        <div class="card-content">
                            <div class="card-label">القرض المتبقي</div>
                            <div class="card-value">${remainingLoanAmount > 0 ? this.formatCurrency(remainingLoanAmount) : 'لا يوجد'}</div>
                        </div>
                    </div>
                    <div class="financial-card loans">
                        <div class="card-icon"><i class="fas fa-hand-holding-usd"></i></div>
                        <div class="card-content">
                            <div class="card-label">إجمالي أقساط القروض</div>
                            <div class="card-value">${this.formatCurrency(this.getLoanPaymentTotal())}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render loans section with editing capabilities
    renderLoansSection() {
        if (this.userLoans.length === 0) {
            return `
                <div class="loans-section">
                    <h2><i class="fas fa-credit-card"></i> قروض العضو</h2>
                    <div class="no-data">لا توجد قروض لهذا العضو</div>
                </div>
            `;
        }

        return `
            <div class="loans-section">
                <h2><i class="fas fa-credit-card"></i> قروض العضو</h2>
                <div class="loans-grid">
                    ${this.userLoans.map(loan => this.renderLoanCard(loan)).join('')}
                </div>
            </div>
        `;
    }

    // Render individual loan card with edit button
    renderLoanCard(loan) {
        const remainingAmount = Math.max(0, parseFloat(loan.loan_amount) - parseFloat(loan.total_paid || 0));
        const statusClass = loan.status.toLowerCase();
        const statusText = this.getStatusText(loan.status);
        const isActive = loan.status === 'approved' && remainingAmount > 0;

        return `
            <div class="loan-card ${statusClass} ${isActive ? 'active' : ''}">
                <div class="loan-header">
                    <div class="loan-title">
                        <span class="loan-id">#${loan.loan_id}</span>
                        <span class="loan-status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <button class="edit-loan-btn" onclick="userDetailsPage.editLoan(${loan.loan_id})" title="تعديل القرض">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div class="loan-body">
                    <div class="loan-detail">
                        <label>مبلغ القرض</label>
                        <span class="amount">${this.formatCurrency(loan.loan_amount)}</span>
                    </div>
                    <div class="loan-detail">
                        <label>القسط الشهري</label>
                        <span class="amount">${this.formatCurrency(loan.installment_amount)}</span>
                    </div>
                    <div class="loan-detail">
                        <label>المدفوع</label>
                        <span class="amount paid">${this.formatCurrency(loan.total_paid || 0)}</span>
                    </div>
                    <div class="loan-detail">
                        <label>المتبقي</label>
                        <span class="amount remaining ${isActive ? 'active' : 'completed'}">${this.formatCurrency(remainingAmount)}</span>
                    </div>
                    <div class="loan-detail">
                        <label>تاريخ الطلب</label>
                        <span>${this.formatDate(loan.request_date)}</span>
                    </div>
                    ${loan.approval_date ? `
                    <div class="loan-detail">
                        <label>تاريخ الموافقة</label>
                        <span>${this.formatDate(loan.approval_date)}</span>
                    </div>
                    ` : ''}
                    ${loan.admin_name ? `
                    <div class="loan-detail">
                        <label>المدير المسؤول</label>
                        <span>${loan.admin_name}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Render payment history sections
    renderPaymentHistory() {
        return `
            <div class="payment-history">
                <h2><i class="fas fa-history"></i> سجل المدفوعات</h2>
                <div class="payment-tabs">
                    <button class="payment-tab active" data-tab="subscriptions">الاشتراكات</button>
                    <button class="payment-tab" data-tab="loan-payments">أقساط القروض</button>
                </div>
                <div class="payment-content">
                    <div id="subscriptions-tab" class="payment-tab-content active">
                        ${this.renderSubscriptionPayments()}
                    </div>
                    <div id="loan-payments-tab" class="payment-tab-content">
                        ${this.renderLoanPayments()}
                    </div>
                </div>
            </div>
        `;
    }

    // Render transaction history
    renderTransactionHistory() {
        const transactions = this.transactions.slice(0, 10); // Show latest 10
        return `
            <div class="transaction-history">
                <h2><i class="fas fa-exchange-alt"></i> آخر المعاملات</h2>
                <div class="transactions-list">
                    ${transactions.map(t => this.renderTransactionItem(t)).join('')}
                </div>
            </div>
        `;
    }

    // Render action buttons
    renderActionButtons() {
        const userId = this.userData.user_id;
        const user = this.userData;
        const isBlocked = user.is_blocked == 1;
        
        return `
            <div class="action-buttons">
                <button class="btn btn-success" onclick="simpleDeposit(${userId})">
                    <i class="fas fa-plus-circle"></i> إضافة إيداع
                </button>
                <button class="btn btn-warning" onclick="simpleWithdrawal(${userId})">
                    <i class="fas fa-minus-circle"></i> إضافة سحب
                </button>
                <button class="btn btn-primary" onclick="userDetailsPage.openAddLoanModal(${userId})">
                    <i class="fas fa-hand-holding-usd"></i> إضافة قرض جديد
                </button>
                <button class="btn btn-info" onclick="editUser(${userId})">
                    <i class="fas fa-edit"></i> تعديل المستخدم
                </button>
                <button class="btn btn-secondary" onclick="resetUserPassword(${userId}, \`${user.Aname || 'المستخدم'}\`)">
                    <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
                </button>
                <button class="btn ${isBlocked ? 'btn-success' : 'btn-danger'}" onclick="toggleBlockUser(${userId})">
                    <i class="fas ${isBlocked ? 'fa-unlock' : 'fa-ban'}"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                </button>
                <button class="btn btn-secondary" onclick="window.close()">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        `;
    }

    // No modals needed - using simple prompts

    // Attach event listeners
    attachEventListeners() {
        // Create simple global functions for deposit/withdrawal
        const self = this;
        
        window.simpleDeposit = async function(userId) {
            const amount = prompt('أدخل مبلغ الإيداع (د.ك):');
            if (!amount || parseFloat(amount) <= 0) {
                alert('يرجى إدخال مبلغ صحيح');
                return;
            }
            
            const memo = prompt('ملاحظات (اختياري):') || 'إيداع من المدير';
            
            try {
                await self.apiCall('/admin/add-transaction', 'POST', {
                    userId: userId,
                    amount: parseFloat(amount),
                    type: 'credit',
                    memo: memo,
                    transactionType: 'deposit',
                    status: 'accepted'
                });
                
                alert('تم إضافة الإيداع بنجاح');
                window.location.reload();
            } catch (error) {
                alert('خطأ: ' + error.message);
            }
        };
        
        window.simpleWithdrawal = async function(userId) {
            const currentBalance = self.userData.balance || 0;
            const amount = prompt(`الرصيد الحالي: ${self.formatCurrency(currentBalance)}\n\nأدخل مبلغ السحب (د.ك):`);
            
            if (!amount || parseFloat(amount) <= 0) {
                alert('يرجى إدخال مبلغ صحيح');
                return;
            }
            
            if (parseFloat(amount) > currentBalance) {
                alert('المبلغ أكبر من الرصيد المتاح');
                return;
            }
            
            const memo = prompt('ملاحظات (اختياري):') || 'سحب من المدير';
            
            try {
                await self.apiCall('/admin/add-transaction', 'POST', {
                    userId: userId,
                    amount: parseFloat(amount),
                    type: 'debit',
                    memo: memo,
                    transactionType: 'withdrawal',
                    status: 'accepted'
                });
                
                alert('تم إضافة السحب بنجاح');
                window.location.reload();
            } catch (error) {
                alert('خطأ: ' + error.message);
            }
        };

        window.editUser = async function(userId) {
            console.log('🔧 Edit user function called for user:', userId);
            const user = self.userData;
            
            // Create modal edit form
            const modalHtml = `
                <div class="modal-overlay" id="editUserModal">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-edit"></i> تعديل معلومات العضو</h3>
                            <button class="modal-close" onclick="closeEditModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <div class="form-group">
                                    <label>الاسم الكامل</label>
                                    <input type="text" id="editName" value="${user.Aname || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>البريد الإلكتروني</label>
                                    <input type="email" id="editEmail" value="${user.email || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>رقم الهاتف</label>
                                    <input type="text" id="editPhone" value="${user.phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label>رقم الواتساب</label>
                                    <input type="text" id="editWhatsapp" value="${user.whatsapp || ''}">
                                </div>
                                <div class="form-group">
                                    <label>الرصيد (د.ك)</label>
                                    <input type="number" id="editBalance" value="${user.balance || 0}" min="0" step="0.001" required>
                                </div>
                                <div class="form-group">
                                    <label>الموافقة على الدخول</label>
                                    <select id="editJoiningFee">
                                        <option value="pending" ${user.joining_fee_approved === 'pending' ? 'selected' : ''}>معلق</option>
                                        <option value="approved" ${user.joining_fee_approved === 'approved' ? 'selected' : ''}>مقبول</option>
                                        <option value="rejected" ${user.joining_fee_approved === 'rejected' ? 'selected' : ''}>مرفوض</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>دفع رسوم العضوية (10 د.ك)</label>
                                    <select id="editJoiningFeePaid">
                                        <option value="pending" ${user.joining_fee_paid === 'pending' ? 'selected' : ''}>لم يدفع</option>
                                        <option value="paid" ${user.joining_fee_paid === 'paid' ? 'selected' : ''}>تم الدفع</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>حالة الحساب</label>
                                    <select id="editBlocked">
                                        <option value="0" ${user.is_blocked == 0 ? 'selected' : ''}>نشط</option>
                                        <option value="1" ${user.is_blocked == 1 ? 'selected' : ''}>محظور</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">إلغاء</button>
                            <button type="button" class="btn btn-success" onclick="saveUserChanges(${userId})">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('editUserModal').classList.add('active');
        };

        // Close edit modal
        window.closeEditModal = function() {
            const modal = document.getElementById('editUserModal');
            if (modal) {
                modal.remove();
            }
        };

        // Save user changes
        window.saveUserChanges = async function(userId) {
            try {
                const formData = {
                    Aname: document.getElementById('editName').value.trim(),
                    email: document.getElementById('editEmail').value.trim(),
                    phone: document.getElementById('editPhone').value.trim(),
                    whatsapp: document.getElementById('editWhatsapp').value.trim(),
                    balance: parseFloat(document.getElementById('editBalance').value),
                    joining_fee_approved: document.getElementById('editJoiningFee').value,
                    joining_fee_paid: document.getElementById('editJoiningFeePaid').value,
                    is_blocked: parseInt(document.getElementById('editBlocked').value)
                };

                // Validate required fields
                if (!formData.Aname || !formData.email) {
                    alert('يرجى تعبئة الحقول المطلوبة (الاسم والبريد الإلكتروني)');
                    return;
                }

                if (isNaN(formData.balance) || formData.balance < 0) {
                    alert('يرجى إدخال رصيد صحيح');
                    return;
                }

                // Save changes
                await self.apiCall(`/admin/update-user/${userId}`, 'PUT', formData);
                
                // Close modal and reload
                closeEditModal();
                alert('تم تحديث بيانات المستخدم بنجاح');
                window.location.reload();
                
            } catch (error) {
                alert('خطأ في تحديث البيانات: ' + error.message);
            }
        };

        // Toggle block/unblock user
        window.toggleBlockUser = async function(userId) {
            const user = self.userData;
            const isCurrentlyBlocked = user.is_blocked == 1;
            const action = isCurrentlyBlocked ? 'إلغاء الحظر' : 'حظر';
            const newStatus = isCurrentlyBlocked ? 0 : 1;
            
            const confirmMessage = isCurrentlyBlocked 
                ? `هل أنت متأكد من إلغاء حظر المستخدم "${user.Aname}"؟`
                : `هل أنت متأكد من حظر المستخدم "${user.Aname}"؟`;
                
            if (!confirm(confirmMessage)) {
                return;
            }
            
            try {
                await self.apiCall(`/admin/update-user/${userId}`, 'PUT', {
                    is_blocked: newStatus
                });
                
                alert(`تم ${action} المستخدم بنجاح`);
                window.location.reload();
                
            } catch (error) {
                alert(`خطأ في ${action}: ` + error.message);
            }
        };

        // Payment tab switching
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPaymentTab(tab.dataset.tab);
            });
        });
    }

    // All complex modal methods removed - using simple prompts now

    // Edit loan functionality
    async editLoan(loanId) {
        try {
            const loan = this.userLoans.find(l => l.loan_id === loanId);
            if (!loan) {
                alert('القرض غير موجود');
                return;
            }

            const remainingAmount = Math.max(0, parseFloat(loan.loan_amount) - parseFloat(loan.total_paid || 0));
            
            const modalHtml = `
                <div class="modal-overlay" id="editLoanModal">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-edit"></i> تعديل القرض #${loanId}</h3>
                            <button class="modal-close" onclick="userDetailsPage.closeEditLoanModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="editLoanForm">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>المبلغ الأصلي (د.ك)</label>
                                        <input type="number" id="editOriginalAmount" step="0.001" value="${loan.loan_amount}" class="form-control" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>المبلغ المتبقي (د.ك)</label>
                                        <input type="number" id="editRemainingAmount" step="0.001" value="${remainingAmount}" class="form-control">
                                        <small class="form-text">اتركه فارغاً لعدم التغيير</small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>القسط الشهري (د.ك)</label>
                                        <input type="number" id="editInstallment" step="0.001" value="${loan.installment_amount}" class="form-control">
                                        <small class="form-text">اتركه فارغاً للحساب التلقائي</small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>الحالة</label>
                                        <select id="editStatus" class="form-control">
                                            <option value="pending" ${loan.status === 'pending' ? 'selected' : ''}>معلق</option>
                                            <option value="approved" ${loan.status === 'approved' ? 'selected' : ''}>موافق عليه</option>
                                            <option value="rejected" ${loan.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>تاريخ الطلب</label>
                                        <input type="date" id="editRequestDate" value="${loan.request_date.split('T')[0]}" class="form-control" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>ملاحظات</label>
                                    <textarea id="editNotes" class="form-control" rows="3">${loan.notes || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="userDetailsPage.closeEditLoanModal()">إلغاء</button>
                            <button type="button" class="btn btn-success" onclick="userDetailsPage.saveLoanChanges(${loanId})">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('editLoanModal').classList.add('active');
            
            // Add input validation
            document.getElementById('editOriginalAmount').addEventListener('input', this.updateEditCalculations);
            document.getElementById('editRemainingAmount').addEventListener('input', this.updateEditCalculations);
            
        } catch (error) {
            alert('خطأ في تحميل بيانات القرض: ' + error.message);
        }
    }

    // Close edit loan modal
    closeEditLoanModal() {
        const modal = document.getElementById('editLoanModal');
        if (modal) {
            modal.remove();
        }
    }

    // Save loan changes
    async saveLoanChanges(loanId) {
        try {
            const remainingAmountInput = document.getElementById('editRemainingAmount');
            const installmentInput = document.getElementById('editInstallment');
            
            const formData = {
                loanAmount: parseFloat(document.getElementById('editOriginalAmount').value),
                installmentAmount: installmentInput.value ? parseFloat(installmentInput.value) : null,
                status: document.getElementById('editStatus').value,
                requestDate: document.getElementById('editRequestDate').value,
                notes: document.getElementById('editNotes').value
            };

            // Only include remaining amount if it has a value
            if (remainingAmountInput.value && remainingAmountInput.value.trim() !== '') {
                formData.remainingAmount = parseFloat(remainingAmountInput.value);
            }

            await this.apiCall(`/admin/update-loan/${loanId}`, 'PUT', formData);
            
            alert('تم تحديث القرض بنجاح');
            this.closeEditLoanModal();
            
            // Reload the page to reflect changes
            window.location.reload();
            
        } catch (error) {
            alert('خطأ في تحديث القرض: ' + error.message);
        }
    }

    // Update calculations in edit modal
    updateEditCalculations() {
        const originalAmount = parseFloat(document.getElementById('editOriginalAmount').value) || 0;
        const remainingAmount = parseFloat(document.getElementById('editRemainingAmount').value) || 0;
        
        // Update maximum for remaining amount
        const remainingInput = document.getElementById('editRemainingAmount');
        remainingInput.max = originalAmount;
        
        // Validate remaining amount
        if (remainingAmount > originalAmount) {
            remainingInput.value = originalAmount;
        }
    }

    // Open add new loan modal with override capability
    async openAddLoanModal(userId) {
        const user = this.userData;
        const maxLoan = Math.min(user.balance * 3, 10000);

        try {
            // Step 1: Check eligibility
            console.log('🔍 Fetching eligibility for user:', userId);
            const response = await this.apiCall(`/users/loans/eligibility/${userId}`);
            console.log('📥 Received response:', response);

            // Extract eligibility from response (backend wraps it in { eligibility: {...} })
            const eligibilityResult = response.eligibility || response;
            console.log('📊 Eligibility result:', eligibilityResult);

            // Validate response structure
            if (!eligibilityResult || typeof eligibilityResult.eligible === 'undefined') {
                console.error('❌ Invalid eligibility response structure');
                console.error('Response:', response);
                console.error('Eligibility result:', eligibilityResult);
                throw new Error('استجابة غير صالحة من خادم التحقق من الأهلية');
            }

            console.log('✅ Eligibility check complete:', eligibilityResult.eligible ? 'Eligible' : 'Not eligible');

            // Step 2: Build comprehensive eligibility status display
            const tests = eligibilityResult.tests || {};
            const eligibilityStatusHtml = `
                <div class="eligibility-status-box" style="margin-bottom: 20px; padding: 15px; background: ${eligibilityResult.eligible ? '#d4edda' : '#fff3cd'}; border-right: 4px solid ${eligibilityResult.eligible ? '#28a745' : '#ffc107'}; border-radius: 8px;">
                    <h5 style="color: ${eligibilityResult.eligible ? '#155724' : '#856404'}; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas ${eligibilityResult.eligible ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                        <span>حالة الأهلية: ${eligibilityResult.eligible ? 'مؤهل للقرض ✓' : 'غير مؤهل للقرض'}</span>
                    </h5>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.notBlocked ? 'fa-check' : 'fa-times'}" style="color: ${tests.notBlocked ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">الحساب غير محظور</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.joiningFeeApproved ? 'fa-check' : 'fa-times'}" style="color: ${tests.joiningFeeApproved ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">رسوم الانضمام معتمدة</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.hasMinimumBalance ? 'fa-check' : 'fa-times'}" style="color: ${tests.hasMinimumBalance ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">رصيد 500 د.ك كحد أدنى (الحالي: ${this.formatCurrency(eligibilityResult.currentBalance || 0)})</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.oneYearRegistration ? 'fa-check' : 'fa-times'}" style="color: ${tests.oneYearRegistration ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">مرور سنة على التسجيل ${eligibilityResult.daysUntilOneYear > 0 ? `(متبقي ${eligibilityResult.daysUntilOneYear} يوم)` : ''}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.noActiveLoans ? 'fa-check' : 'fa-times'}" style="color: ${tests.noActiveLoans ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">لا يوجد قرض نشط</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.hasMinimumSubscription ? 'fa-check' : 'fa-times'}" style="color: ${tests.hasMinimumSubscription ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">اشتراكات 240 د.ك خلال 24 شهر (الحالي: ${this.formatCurrency(eligibilityResult.subscriptionPaid || 0)})</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${tests.thirtyDaysSinceClosure ? 'fa-check' : 'fa-times'}" style="color: ${tests.thirtyDaysSinceClosure ? '#28a745' : '#dc3545'}; width: 20px;"></i>
                            <span style="color: #495057;">30 يوم من إغلاق آخر قرض ${eligibilityResult.daysUntilNextLoan > 0 ? `(متبقي ${eligibilityResult.daysUntilNextLoan} يوم)` : ''}</span>
                        </div>
                    </div>
                    ${!eligibilityResult.eligible ? `
                        <p style="color: #856404; margin-top: 15px; font-weight: 600; padding-top: 12px; border-top: 1px solid #ffc107;">
                            <i class="fas fa-shield-alt"></i> ستحتاج إلى تجاوز إداري لإنشاء هذا القرض
                        </p>
                    ` : ''}
                </div>
            `;
        
            // Step 3: Build modal HTML
            const modalHtml = `
                <div class="modal-overlay" id="addLoanModal">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3 style="color: #6f42c1;">
                                <i class="fas fa-hand-holding-usd"></i> إنشاء قرض للمستخدم: ${user.Aname}
                            </h3>
                            <button class="modal-close" onclick="userDetailsPage.closeAddLoanModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${eligibilityStatusHtml}

                            <form id="createLoanForm">
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                                        مبلغ القرض (د.ك) <span style="color: red;">*</span>
                                    </label>
                                    <input type="number" id="loanAmount" step="0.001" min="0.001" max="${maxLoan}"
                                        class="form-control" required
                                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                    <small style="color: #6c757d;">الحد الأقصى: ${this.formatCurrency(maxLoan)}</small>
                                </div>

                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                                        القسط الشهري (د.ك) <span style="color: red;">*</span>
                                    </label>
                                    <input type="number" id="installmentAmount" step="0.001" min="20"
                                        class="form-control" required readonly
                                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa;">
                                    <small style="color: #6c757d;">سيتم الحساب تلقائياً</small>
                                </div>

                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                                        حالة القرض <span style="color: red;">*</span>
                                    </label>
                                    <select id="loanStatus" class="form-control"
                                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                        <option value="approved">موافقة فورية - سيتم اعتماد القرض مباشرة</option>
                                        <option value="pending">طلب معلق - يحتاج موافقة لاحقاً</option>
                                    </select>
                                    <small style="color: #6c757d;">اختر ما إذا كنت تريد الموافقة الفورية أو إنشاء طلب معلق</small>
                                </div>

                                <div id="calculationPreview" style="display: none; background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                    <h5 style="color: #0056b3; margin-bottom: 10px;">
                                        <i class="fas fa-calculator"></i> خطة السداد المتوقعة
                                    </h5>
                                    <div id="calculationDetails"></div>
                                </div>

                                ${!eligibilityResult.eligible ? `
                                    <div class="form-group" style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 2px solid #ffc107;">
                                        <div style="margin-bottom: 15px;">
                                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; color: #856404;">
                                                <input type="checkbox" id="overrideConfirm" style="width: 20px; height: 20px; cursor: pointer;">
                                                <span>
                                                    <i class="fas fa-shield-alt"></i> تأكيد التجاوز الإداري - أوافق على إنشاء هذا القرض رغم عدم استيفاء الشروط
                                                </span>
                                            </label>
                                        </div>
                                        <div>
                                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404;">
                                                سبب التجاوز الإداري <span style="color: red;">*</span>
                                            </label>
                                            <textarea id="overrideReason" class="form-control" rows="3" required
                                                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;">تم الموافقة بناءً على تقدير الإدارة للحالة الخاصة للعضو</textarea>
                                            <small style="color: #856404;">
                                                <i class="fas fa-info-circle"></i> يمكنك تعديل السبب أو الإبقاء على النص الافتراضي
                                            </small>
                                        </div>
                                    </div>
                                ` : ''}
                            </form>
                        </div>
                        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: center;">
                            <button type="button" class="btn btn-secondary" onclick="userDetailsPage.closeAddLoanModal()">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                            <button type="button" class="btn btn-success" onclick="userDetailsPage.submitLoanCreation(${userId}, ${eligibilityResult.eligible})">
                                <i class="fas fa-check"></i> ${!eligibilityResult.eligible ? 'إنشاء القرض (تجاوز إداري)' : 'إنشاء القرض'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('addLoanModal').classList.add('active');

            // Step 4: Setup real-time calculation
            const loanAmountInput = document.getElementById('loanAmount');
            loanAmountInput.addEventListener('input', (e) => {
                const amount = parseFloat(e.target.value);
                if (amount > 0) {
                    this.calculateLoanPreview(amount, user.balance);
                } else {
                    // Clear preview if amount is invalid
                    document.getElementById('installmentAmount').value = '';
                    document.getElementById('calculationPreview').style.display = 'none';
                }
            });

        } catch (error) {
            this.showAlert(`خطأ: ${error.message}`, 'error');
        }
    }

    calculateLoanPreview(loanAmount, userBalance) {
        try {
            console.log('🔢 Calculating loan preview for amount:', loanAmount, 'with balance:', userBalance);

            if (!loanAmount || loanAmount <= 0 || !userBalance || userBalance <= 0) {
                console.warn('⚠️ Invalid loan amount or balance');
                document.getElementById('installmentAmount').value = '';
                document.getElementById('calculationPreview').style.display = 'none';
                return;
            }

            // Use client-side calculation (same as user loan request tab)
            const installment = this.calculateInstallment(loanAmount, userBalance);
            const period = this.calculateInstallmentPeriod(loanAmount, installment);

            // Calculate exact repayment (always equals loan amount)
            const exactPeriod = loanAmount / installment;
            const wholePeriods = Math.floor(exactPeriod);
            const remainder = loanAmount - (wholePeriods * installment);
            const lastInstallment = remainder > 0 ? parseFloat(remainder.toFixed(3)) : installment;

            console.log('✅ Calculated - Installment:', installment, 'Period:', period, 'Last:', lastInstallment);

            document.getElementById('installmentAmount').value = installment.toFixed(3);
            document.getElementById('calculationPreview').style.display = 'block';
            document.getElementById('calculationDetails').innerHTML = `
                <p><strong>عدد الأقساط:</strong> ${period} شهر</p>
                <p><strong>القسط الشهري:</strong> ${installment.toFixed(3)} د.ك</p>
                <p><strong>القسط الأخير:</strong> ${lastInstallment.toFixed(3)} د.ك</p>
                <p><strong>إجمالي السداد:</strong> ${loanAmount.toFixed(3)} د.ك</p>
            `;
        } catch (error) {
            console.error('❌ Calculation error:', error);
            document.getElementById('installmentAmount').value = '';
            document.getElementById('calculationPreview').style.display = 'none';
        }
    }

    // Calculate loan installment using same logic as user loan request
    calculateInstallment(loanAmount, userBalance) {
        const ratio = 0.006667; // 0.02 / 3
        const baseInstallment = ratio * (loanAmount * loanAmount) / userBalance;
        const roundedInstallment = Math.ceil(baseInstallment / 5) * 5;
        return Math.max(roundedInstallment, 20); // Minimum 20 KWD
    }

    // Calculate installment period
    calculateInstallmentPeriod(loanAmount, installment) {
        if (!loanAmount || !installment || installment <= 0) {
            return 24; // Default fallback
        }
        const period = Math.ceil(loanAmount / installment);
        return Math.max(6, period); // Minimum 6 months
    }

    async submitLoanCreation(userId, isEligible) {
        try {
            const loanAmount = parseFloat(document.getElementById('loanAmount').value);
            const installmentAmount = parseFloat(document.getElementById('installmentAmount').value);
            const loanStatus = document.getElementById('loanStatus').value;
            const overrideReason = !isEligible ? document.getElementById('overrideReason')?.value : null;

            if (!loanAmount || loanAmount <= 0) {
                this.showAlert('يرجى إدخال مبلغ القرض', 'error');
                return;
            }

            // Validate max loan amount
            const user = this.userData;
            const maxLoan = Math.min(user.balance * 3, 10000);
            if (loanAmount > maxLoan) {
                this.showAlert(`مبلغ القرض يتجاوز الحد الأقصى المسموح: ${this.formatCurrency(maxLoan)}`, 'error');
                return;
            }

            if (!installmentAmount || installmentAmount <= 0) {
                this.showAlert('يرجى الانتظار حتى يتم حساب القسط الشهري', 'error');
                return;
            }

            if (!isEligible) {
                const overrideConfirm = document.getElementById('overrideConfirm');
                if (!overrideConfirm || !overrideConfirm.checked) {
                    this.showAlert('يجب تأكيد التجاوز الإداري بالضغط على مربع الاختيار', 'error');
                    return;
                }
                if (!overrideReason || overrideReason.trim() === '') {
                    this.showAlert('يجب إدخال سبب التجاوز الإداري', 'error');
                    return;
                }
            }

            const result = await this.apiCall('/admin/create-loan-with-override', 'POST', {
                userId,
                loanAmount,
                installmentAmount,
                loanStatus,
                overrideReason
            });

            this.showAlert(result.message || 'تم إنشاء القرض بنجاح', 'success');
            this.closeAddLoanModal();

            // Reload page to show new loan
            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            this.showAlert(`خطأ: ${error.message}`, 'error');
        }
    }

    // Close add loan modal
    closeAddLoanModal() {
        const modal = document.getElementById('addLoanModal');
        if (modal) {
            modal.remove();
        }
    }

    // Show alert message
    showAlert(message, type = 'success') {
        const container = document.getElementById('alert-container');
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        
        container.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                ${message}
            </div>
        `;
        
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }

    // Helper methods
    formatCurrency(amount) {
        return window.formatCurrency ? window.formatCurrency(amount) : `${parseFloat(amount || 0).toFixed(3)} د.ك`;
    }

    formatDate(dateString) {
        return window.formatDate ? window.formatDate(dateString) : (dateString ? new Date(dateString).toLocaleDateString('en-US') : 'غير محدد');
    }

    getUserStatusClass() {
        const user = this.userData;
        if (user.is_blocked) return 'blocked';
        if (user.joining_fee_approved === 'approved') return 'active';
        return 'pending';
    }

    getUserStatusText() {
        const user = this.userData;
        if (user.is_blocked) return 'محظور';
        if (user.joining_fee_approved === 'approved') return 'نشط';
        return 'غير مفعل';
    }

    getSubscriptionTotal() {
        return this.transactions
            .filter(t => (t.transaction_type === 'subscription' || t.memo?.includes('اشتراك')) && t.status === 'accepted')
            .reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
    }

    getLoanPaymentTotal() {
        return this.loanPayments
            .filter(p => p.status === 'accepted')
            .reduce((sum, p) => sum + (parseFloat(p.credit) || 0), 0);
    }

    getRemainingLoanAmount() {
        // Check if user has active loans from the loanPayments data
        if (!this.loanPayments || this.loanPayments.length === 0) {
            console.log('📊 No loan payments found');
            return 0;
        }

        console.log('📊 Loan payments data:', this.loanPayments);

        // Group payments by loan ID to calculate remaining amounts
        const loanGroups = {};
        this.loanPayments.forEach(payment => {
            if (!loanGroups[payment.target_loan_id]) {
                loanGroups[payment.target_loan_id] = {
                    loanAmount: payment.loan_amount || 0,
                    totalPaid: 0
                };
                console.log(`📊 Loan ${payment.target_loan_id}: Amount = ${payment.loan_amount}`);
            }
            if (payment.status === 'accepted') {
                loanGroups[payment.target_loan_id].totalPaid += parseFloat(payment.credit) || 0;
                console.log(`📊 Loan ${payment.target_loan_id}: Added payment ${payment.credit}, Total paid = ${loanGroups[payment.target_loan_id].totalPaid}`);
            }
        });

        console.log('📊 Loan groups:', loanGroups);

        // Calculate total remaining amount from all active loans
        let totalRemaining = 0;
        Object.values(loanGroups).forEach(loan => {
            const remaining = Math.max(0, loan.loanAmount - loan.totalPaid);
            console.log(`📊 Loan remaining: ${loan.loanAmount} - ${loan.totalPaid} = ${remaining}`);
            if (remaining > 0) {
                totalRemaining += remaining;
            }
        });

        console.log('📊 Total remaining amount:', totalRemaining);
        return totalRemaining;
    }

    switchPaymentTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.payment-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }

    // Render methods for different sections
    renderSubscriptionPayments() {
        const subscriptionPayments = this.transactions.filter(t => 
            (t.transaction_type === 'subscription' || t.memo?.includes('اشتراك')) && 
            t.status === 'accepted'
        );

        if (subscriptionPayments.length === 0) {
            return '<div class="no-data">لا توجد دفعات اشتراكات</div>';
        }

        return `
            <div class="payments-table">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>الملاحظات</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subscriptionPayments.map(payment => `
                            <tr>
                                <td>${this.formatDate(payment.date)}</td>
                                <td class="amount">${this.formatCurrency(payment.credit)}</td>
                                <td>${payment.memo || 'اشتراك شهري'}</td>
                                <td><span class="status-badge accepted">مقبول</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderLoanPayments() {
        if (this.loanPayments.length === 0) {
            return '<div class="no-data">لا توجد أقساط قروض</div>';
        }

        return `
            <div class="payments-table">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>رقم القرض</th>
                            <th>الحالة</th>
                            <th>المدير</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.loanPayments.map(payment => `
                            <tr>
                                <td>${this.formatDate(payment.date)}</td>
                                <td class="amount">${this.formatCurrency(payment.credit)}</td>
                                <td>#${payment.target_loan_id}</td>
                                <td><span class="status-badge ${payment.status}">${this.getStatusText(payment.status)}</span></td>
                                <td>${payment.admin_name || 'غير محدد'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderTransactionItem(transaction) {
        const isCredit = parseFloat(transaction.credit || 0) > 0;
        const amount = Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0));
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon ${isCredit ? 'credit' : 'debit'}">
                    <i class="fas ${isCredit ? 'fa-plus' : 'fa-minus'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-memo">${transaction.memo || 'معاملة'}</div>
                    <div class="transaction-date">${this.formatDate(transaction.date)}</div>
                </div>
                <div class="transaction-amount ${isCredit ? 'credit' : 'debit'}">
                    ${isCredit ? '+' : '-'} ${this.formatCurrency(amount)}
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        switch (status) {
            case 'accepted': return 'مقبول';
            case 'rejected': return 'مرفوض';
            case 'pending': return 'معلق';
            default: return status;
        }
    }

    // ============================================
    // ADMIN REASSIGNMENT FUNCTIONALITY
    // ============================================

    // Show admin reassignment modal
    async showAdminReassignmentModal(userId, userName, currentAdminId) {
        try {
            console.log(`🔄 Opening admin reassignment modal for user ${userId} (${userName})`);

            // Fetch available admins
            const result = await this.apiCall('/admin/available-admins');
            const admins = result.admins || [];

            // Create modal HTML
            const modalHtml = `
                <div class="modal-overlay" id="adminReassignmentModal">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-exchange-alt"></i> إعادة تعيين المدير</h3>
                            <button class="modal-close" onclick="userDetailsPage.closeAdminReassignmentModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="user-info-section">
                                <h5><i class="fas fa-user"></i> معلومات العضو</h5>
                                <p><strong>اسم العضو:</strong> ${userName}</p>
                                <p><strong>معرف العضو:</strong> #${userId}</p>
                            </div>

                            <div class="admin-selection-section">
                                <h5><i class="fas fa-users-cog"></i> اختيار المدير الجديد</h5>
                                <div class="form-group">
                                    <label for="newAdminSelect">المدير المعتمد الجديد:</label>
                                    <select id="newAdminSelect" class="form-control">
                                        <option value="">-- اختر المدير --</option>
                                        ${admins.map(admin => `
                                            <option value="${admin.user_id}" ${admin.user_id == currentAdminId ? 'selected' : ''}>
                                                #${admin.user_id} - ${admin.admin_name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="userDetailsPage.closeAdminReassignmentModal()">إلغاء</button>
                            <button type="button" class="btn btn-success" onclick="userDetailsPage.confirmAdminReassignment(${userId})">
                                <i class="fas fa-check"></i> تأكيد التعيين
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('adminReassignmentModal').classList.add('active');

        } catch (error) {
            console.error('❌ Error loading admin reassignment modal:', error);
            alert('خطأ في تحميل قائمة المديرين: ' + error.message);
        }
    }

    // Close admin reassignment modal
    closeAdminReassignmentModal() {
        const modal = document.getElementById('adminReassignmentModal');
        if (modal) {
            modal.remove();
        }
    }

    // Confirm admin reassignment
    async confirmAdminReassignment(userId) {
        try {
            const newAdminSelect = document.getElementById('newAdminSelect');
            const newAdminId = newAdminSelect.value;

            if (!newAdminId) {
                alert('يرجى اختيار المدير الجديد');
                return;
            }

            console.log(`🔄 Reassigning user ${userId} to admin ${newAdminId}`);

            // Send reassignment request
            const result = await this.apiCall(`/admin/reassign-user-admin/${userId}`, 'PUT', {
                newAdminId: parseInt(newAdminId)
            });

            alert(result.message || 'تم إعادة تعيين المدير بنجاح');

            // Close modal and reload page to show updated admin assignment
            this.closeAdminReassignmentModal();
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('❌ Error reassigning admin:', error);
            alert('خطأ في إعادة تعيين المدير: ' + error.message);
        }
    }

    // Get CSS styles
    getCSS() {
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: #f8f9fa; color: #2c3e50; direction: rtl; line-height: 1.6;
            }
            
            .user-details-page { 
                max-width: 1200px; margin: 0 auto; padding: 20px; 
            }
            
            .page-header { 
                background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; 
            }
            .page-header h1 { color: #667eea; font-size: 28px; margin-bottom: 8px; }
            .page-header .subtitle { color: #6c757d; font-size: 16px; }
            
            .status-badge { 
                display: inline-block; padding: 6px 12px; border-radius: 20px; 
                font-size: 12px; font-weight: 600; margin-top: 12px; 
            }
            .status-badge.active { background: #d4edda; color: #155724; }
            .status-badge.pending { background: #fff3cd; color: #856404; }
            .status-badge.blocked { background: #f8d7da; color: #721c24; }
            .status-badge.accepted { background: #d4edda; color: #155724; }
            .status-badge.rejected { background: #f8d7da; color: #721c24; }
            
            .loans-section, .info-section, .financial-summary, .payment-history, .transaction-history { 
                background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            }
            .loans-section h2, .info-section h2, .financial-summary h2, .payment-history h2, .transaction-history h2 { 
                color: #667eea; font-size: 20px; margin-bottom: 20px; 
            }
            
            .loans-grid { 
                display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
                gap: 20px; 
            }
            .loan-card { 
                border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; 
                transition: all 0.3s; position: relative; 
            }
            .loan-card.active { border-color: #28a745; background: #f8fff9; }
            .loan-card.approved { border-color: #28a745; }
            .loan-card.pending { border-color: #ffc107; }
            .loan-card.rejected { border-color: #dc3545; }
            .loan-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            
            .loan-header { 
                display: flex; justify-content: space-between; align-items: center; 
                margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; 
            }
            .loan-title { display: flex; align-items: center; gap: 12px; }
            .loan-id { font-weight: bold; color: #495057; font-size: 16px; }
            .loan-status-badge { 
                padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; 
            }
            .loan-status-badge.approved { background: #d4edda; color: #155724; }
            .loan-status-badge.pending { background: #fff3cd; color: #856404; }
            .loan-status-badge.rejected { background: #f8d7da; color: #721c24; }
            
            .edit-loan-btn { 
                background: #667eea; color: white; border: none; border-radius: 6px; 
                padding: 8px 12px; cursor: pointer; font-size: 14px; 
                transition: all 0.3s; 
            }
            .edit-loan-btn:hover { background: #5a67d8; transform: scale(1.05); }
            
            .loan-body { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .loan-detail { display: flex; flex-direction: column; }
            .loan-detail label { 
                font-size: 12px; color: #6c757d; margin-bottom: 4px; font-weight: 600; 
            }
            .loan-detail span { font-weight: 500; color: #495057; }
            .loan-detail .amount { font-weight: 600; font-size: 16px; }
            .loan-detail .amount.paid { color: #28a745; }
            .loan-detail .amount.remaining.active { color: #ff6b35; }
            .loan-detail .amount.remaining.completed { color: #28a745; }
            
            .form-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 16px; margin-bottom: 16px; 
            }
            .form-text { font-size: 12px; color: #6c757d; margin-top: 4px; }
            
            .info-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 16px; 
            }
            .info-item { padding: 12px 0; border-bottom: 1px solid #eee; }
            .info-item:last-child { border-bottom: none; }
            .info-item label { font-weight: 600; color: #495057; margin-bottom: 4px; display: block; }
            .info-item span { color: #6c757d; }
            
            .financial-cards { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                gap: 20px; 
            }
            .financial-card { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 20px; border-radius: 12px; color: white; display: flex; align-items: center; 
            }
            .financial-card.remaining-loan.has-loan {
                background: linear-gradient(135deg, #ff9f43 0%, #ff6b35 100%);
            }
            .financial-card.remaining-loan.no-loan {
                background: linear-gradient(135deg, #26de81 0%, #20bf6b 100%);
            }
            .card-icon { font-size: 32px; margin-left: 16px; opacity: 0.8; }
            .card-content { flex: 1; }
            .card-label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
            .card-value { font-size: 24px; font-weight: bold; }
            
            .payment-tabs { 
                display: flex; margin-bottom: 20px; border-bottom: 1px solid #eee; 
            }
            .payment-tab { 
                background: none; border: none; padding: 12px 24px; cursor: pointer; 
                border-bottom: 2px solid transparent; transition: all 0.3s; 
            }
            .payment-tab.active { 
                color: #667eea; border-bottom-color: #667eea; font-weight: 600; 
            }
            
            .payment-tab-content { display: none; }
            .payment-tab-content.active { display: block; }
            
            .payments-table table { width: 100%; border-collapse: collapse; }
            .payments-table th, .payments-table td { 
                padding: 12px; text-align: right; border-bottom: 1px solid #eee; 
            }
            .payments-table th { background: #f8f9fa; font-weight: 600; }
            .payments-table .amount { font-weight: 600; color: #28a745; }
            
            .transactions-list { display: flex; flex-direction: column; gap: 12px; }
            .transaction-item { 
                display: flex; align-items: center; padding: 16px; background: #f8f9fa; 
                border-radius: 8px; 
            }
            .transaction-icon { 
                width: 40px; height: 40px; border-radius: 50%; display: flex; 
                align-items: center; justify-content: center; margin-left: 16px; 
            }
            .transaction-icon.credit { background: #d4edda; color: #28a745; }
            .transaction-icon.debit { background: #f8d7da; color: #dc3545; }
            .transaction-details { flex: 1; }
            .transaction-memo { font-weight: 600; color: #495057; }
            .transaction-date { font-size: 14px; color: #6c757d; margin-top: 4px; }
            .transaction-amount { font-weight: 600; font-size: 16px; }
            .transaction-amount.credit { color: #28a745; }
            .transaction-amount.debit { color: #dc3545; }
            
            .action-buttons { 
                display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; 
                padding: 20px; 
            }
            .btn { 
                padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; 
                font-size: 14px; font-weight: 500; transition: all 0.3s; 
                display: inline-flex; align-items: center; gap: 8px; 
            }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .btn-success { background: #28a745; color: white; }
            .btn-warning { background: #ffc107; color: #212529; }
            .btn-info { background: #17a2b8; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-secondary { background: #6c757d; color: white; }

            .admin-reassign-btn {
                padding: 4px 8px !important;
                font-size: 12px !important;
                border: 1px solid #667eea !important;
                color: #667eea !important;
                background: transparent !important;
                border-radius: 4px !important;
                transition: all 0.2s ease !important;
            }
            .admin-reassign-btn:hover {
                background: #667eea !important;
                color: white !important;
                transform: none !important;
                box-shadow: none !important;
            }

            .modal-overlay {
                display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;
            }
            .modal-overlay.active { display: flex; }
            .modal-content { 
                background: white; border-radius: 12px; max-width: 500px; width: 90%; 
                max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
            }
            .modal-header { 
                padding: 20px; border-bottom: 1px solid #eee; display: flex; 
                justify-content: space-between; align-items: center; 
            }
            .modal-header h3 { color: #667eea; }
            .modal-close { 
                background: none; border: none; font-size: 24px; cursor: pointer; 
                color: #6c757d; 
            }
            .modal-body { padding: 20px; }
            .modal-footer { 
                padding: 20px; border-top: 1px solid #eee; display: flex; 
                gap: 12px; justify-content: flex-end; 
            }
            
            .form-group { margin-bottom: 16px; }
            .form-group label { 
                display: block; margin-bottom: 6px; font-weight: 600; color: #495057; 
            }
            .form-group input, .form-group textarea, .form-group select { 
                width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; 
                font-size: 14px; 
            }
            .form-group input:focus, .form-group textarea:focus, .form-group select:focus { 
                outline: none; border-color: #667eea; box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25); 
            }
            .form-text { 
                font-size: 12px; color: #6c757d; margin-top: 4px; display: block; 
            }
            
            .user-info-section, .loan-details-section { 
                margin-bottom: 24px; 
            }
            .user-info-section h5, .loan-details-section h5 { 
                color: #667eea; font-size: 16px; margin-bottom: 16px; 
                padding-bottom: 8px; border-bottom: 1px solid #eee; 
            }
            .user-info-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 16px; margin-bottom: 16px; 
            }
            .user-info-grid .info-item { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 12px; background: #f8f9fa; border-radius: 8px; 
            }
            .user-info-grid .info-item label { 
                font-weight: 600; color: #495057; margin-bottom: 0; 
            }
            .user-info-grid .info-item span { 
                color: #667eea; font-weight: 600; 
            }
            
            .loan-calculation-preview h5 { 
                color: #28a745; font-size: 16px; margin-bottom: 16px; 
            }
            .preview-grid .preview-item { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 8px 0; border-bottom: 1px solid #dee2e6; 
            }
            .preview-grid .preview-item:last-child { 
                border-bottom: none; 
            }
            .preview-grid .preview-item label { 
                font-weight: 600; color: #495057; margin-bottom: 0; 
            }
            .preview-grid .preview-item span { 
                color: #28a745; font-weight: 600; 
            }
            
            .alert { 
                padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; 
                display: flex; align-items: center; gap: 8px; 
            }
            .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            
            .no-data { 
                text-align: center; padding: 40px; color: #6c757d; font-style: italic; 
            }
            
            #alert-container { 
                position: fixed; top: 20px; right: 20px; z-index: 10000; 
                max-width: 400px; 
            }
            
            @media (max-width: 768px) {
                .user-details-page { padding: 12px; }
                .info-grid { grid-template-columns: 1fr; }
                .financial-cards { grid-template-columns: 1fr; }
                .action-buttons { flex-direction: column; }
                .payment-tabs { flex-wrap: wrap; }
                .payments-table { overflow-x: auto; }
            }
        `;
    }
}

// Global functions for button actions
async function resetUserPassword(userId, userName) {
    const newPassword = prompt(`إعادة تعيين كلمة المرور للمستخدم: ${userName}\n\nأدخل كلمة المرور الجديدة:`);
    
    if (!newPassword) return; // User cancelled
    
    if (newPassword.length < 1) {
        alert('كلمة المرور مطلوبة');
        return;
    }
    
    if (!confirm(`هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم: ${userName}؟`)) return;
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                targetUserId: userId,
                newPassword: newPassword
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'خطأ في إعادة تعيين كلمة المرور');
        }
        
        alert('تم إعادة تعيين كلمة المرور بنجاح!');
        
        // Show the new password to admin
        alert(`كلمة المرور الجديدة: ${newPassword}\n\nيرجى مشاركة هذه المعلومات مع المستخدم بشكل آمن.`);
        
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

// Export for global use
window.UserDetailsPage = UserDetailsPage;