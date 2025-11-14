// Admin Loans Management Tab
// Handles all loan-related admin functionality

class LoansManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.currentTab = 'pending';
    }

    // Show loans management section
    async show(defaultTab = 'pending') {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #007bff;">
                        <i class="fas fa-money-bill-wave"></i> إدارة طلبات القروض
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <div class="admin-tabs">
                    <button class="admin-tab ${defaultTab === 'pending' ? 'active' : ''}" data-tab="pending">
                        <i class="fas fa-clock"></i> طلبات معلقة
                    </button>
                    <button class="admin-tab ${defaultTab === 'payments' ? 'active' : ''}" data-tab="payments">
                        <i class="fas fa-credit-card"></i> أقساط معلقة
                    </button>
                    <button class="admin-tab ${defaultTab === 'payment-reminders' ? 'active' : ''}" data-tab="payment-reminders">
                        <i class="fas fa-bell"></i> تذكيرات الدفع
                    </button>
                    <button class="admin-tab ${defaultTab === 'all-payments' ? 'active' : ''}" data-tab="all-payments">
                        <i class="fas fa-history"></i> سجل المدفوعات
                    </button>
                    <button class="admin-tab ${defaultTab === 'all' ? 'active' : ''}" data-tab="all">
                        <i class="fas fa-list"></i> جميع الطلبات
                    </button>
                    <button class="admin-tab ${defaultTab === 'manage' ? 'active' : ''}" data-tab="manage">
                        <i class="fas fa-plus-circle"></i> إدارة القروض
                    </button>
                </div>
                
                <div class="tab-content">
                    <div id="loans-tab-content" class="tab-panel active">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.currentTab = defaultTab;  // Set current tab to match default tab
        this.setupTabListeners();
        await this.loadTab(defaultTab);
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
        const contentDiv = document.getElementById('loans-tab-content');
        contentDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

        try {
            if (tab === 'pending') {
                const result = await apiCall('/admin/pending-loans');
                this.displayPendingLoans(result.loans, contentDiv);
            } else if (tab === 'payments') {
                const result = await apiCall('/admin/pending-loan-payments');
                this.displayPendingPayments(result.loanPayments || [], contentDiv);
            } else if (tab === 'payment-reminders') {
                await this.displayPaymentReminders(contentDiv);
            } else if (tab === 'all-payments') {
                const result = await apiCall('/admin/all-loan-payments');
                this.displayAllLoanPayments(result.loanPayments || [], contentDiv);
            } else if (tab === 'manage') {
                this.displayLoanManagement(contentDiv);
            } else {
                const result = await apiCall('/admin/all-loans');
                this.displayAllLoans(result.loans, contentDiv);
            }
        } catch (error) {
            contentDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }

    // Display pending loans
    displayPendingLoans(loans, container) {
        if (loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>لا توجد طلبات قروض معلقة</h4>
                    <p>جميع طلبات القروض تم معالجتها</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-clock"></i> طلبات القروض المعلقة (${loans.length})</h4>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم الطلب</th>
                            <th>اسم المقترض</th>
                            <th>نوع العضوية</th>
                            <th>مبلغ القرض</th>
                            <th>القسط الشهري</th>
                            <th>القرض</th>
                            <th>تاريخ الطلب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loans.map(loan => `
                            <tr>
                                <td><strong>#${loan.loan_id}</strong></td>
                                <td>
                                    <div class="user-info">
                                        <span class="user-name">${loan.full_name}</span>
                                        <small>المعرف: ${loan.user_id}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="user-type ${loan.user_type}">
                                        ${loan.user_type === 'employee' ? 'عضو' : 'إداري'}
                                    </span>
                                </td>
                                <td class="amount-cell">
                                    <span class="amount">${formatCurrency(loan.loan_amount)}</span>
                                </td>
                                <td class="installment-cell">
                                    <span class="installment">${formatCurrency(loan.installment_amount)}</span>
                                    <small>${loan.installment_amount > 0 ? Math.max(6, Math.ceil(loan.loan_amount / loan.installment_amount)) : 'غير محسوب'} شهر</small>
                                </td>
                                <td class="remaining-amount-cell">
                                    <span class="remaining-amount">
                                        ${loan.remaining_amount !== undefined && loan.remaining_amount !== null ? 
                                            formatCurrency(Math.max(0, loan.remaining_amount)) : 
                                            '<span class="no-loan">لا يوجد قرض نشط</span>'
                                        }
                                    </span>
                                </td>
                                <td>
                                    <span class="date">${new Date(loan.request_date).toLocaleDateString('en-US')}</span>
                                    <small>${new Date(loan.request_date).toLocaleTimeString('ar-KW')}</small>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-success" onclick="loansManagement.approveLoan(${loan.loan_id})" title="موافقة">
                                        <i class="fas fa-check"></i> موافقة
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="loansManagement.rejectLoan(${loan.loan_id})" title="رفض">
                                        <i class="fas fa-times"></i> رفض
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="loansManagement.viewLoanDetails(${loan.loan_id})" title="التفاصيل">
                                        <i class="fas fa-eye"></i> 
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    // Display all loans
    displayAllLoans(loans, container) {
        if (loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>لا توجد طلبات قروض</h4>
                    <p>لم يتم تقديم أي طلبات قروض بعد</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-list"></i> جميع طلبات القروض (${loans.length})</h4>
                    <div class="table-controls">
                        <div class="table-filters">
                            <select id="statusFilter" onchange="loansManagement.filterLoans()">
                                <option value="">جميع الحالات</option>
                                <option value="pending">معلق</option>
                                <option value="approved">موافق عليه</option>
                                <option value="rejected">مرفوض</option>
                            </select>
                        </div>
                        <button class="btn btn-sm btn-secondary" onclick="loansManagement.toggleColumnPanel()">
                            <i class="fas fa-columns"></i> إدارة الأعمدة
                        </button>
                    </div>
                </div>
                
                <!-- Column visibility panel -->
                <div id="loansColumnPanel" class="column-visibility-panel" style="display: none;">
                    <div class="panel-header">
                        <h5><i class="fas fa-eye"></i> إظهار/إخفاء الأعمدة</h5>
                        <button class="btn btn-sm btn-ghost" onclick="loansManagement.toggleColumnPanel()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="panel-content">
                        <div class="column-checkboxes">
                            <label><input type="checkbox" value="loan_id" checked> رقم الطلب</label>
                            <label><input type="checkbox" value="borrower_name" checked> اسم المقترض</label>
                            <label><input type="checkbox" value="loan_amount" checked> مبلغ القرض</label>
                            <label><input type="checkbox" value="installment" checked> القسط الشهري</label>
                            <label><input type="checkbox" value="remaining_amount" checked> القرض</label>
                            <label><input type="checkbox" value="status" checked> الحالة</label>
                            <label><input type="checkbox" value="request_date" checked> تاريخ الطلب</label>
                            <label><input type="checkbox" value="processed_by" checked> معالج بواسطة</label>
                            <label><input type="checkbox" value="actions" checked> الإجراءات</label>
                        </div>
                        <div class="panel-actions">
                            <button class="btn btn-sm btn-primary" onclick="loansManagement.showAllColumns()">
                                <i class="fas fa-eye"></i> إظهار الكل
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="loansManagement.hideAllColumns()">
                                <i class="fas fa-eye-slash"></i> إخفاء الكل
                            </button>
                            <button class="btn btn-sm btn-info" onclick="loansManagement.resetColumnVisibility()">
                                <i class="fas fa-undo"></i> إعادة تعيين
                            </button>
                        </div>
                    </div>
                </div>
                <table id="loansTable">
                    <thead>
                        <tr>
                            <th data-column="loan_id">رقم الطلب</th>
                            <th data-column="borrower_name">اسم المقترض</th>
                            <th data-column="loan_amount">مبلغ القرض</th>
                            <th data-column="installment">القسط الشهري</th>
                            <th data-column="remaining_amount">القرض</th>
                            <th data-column="status">الحالة</th>
                            <th data-column="request_date">تاريخ الطلب</th>
                            <th data-column="processed_by">معالج بواسطة</th>
                            <th data-column="actions">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loans.map(loan => `
                            <tr data-status="${loan.status}">
                                <td data-column="loan_id"><strong>#${loan.loan_id}</strong></td>
                                <td data-column="borrower_name">
                                    <div class="user-info">
                                        <span class="user-name">${loan.full_name}</span>
                                        <small>المعرف: ${loan.user_id}</small>
                                    </div>
                                </td>
                                <td data-column="loan_amount" class="amount-cell">
                                    <span class="amount">${formatCurrency(loan.loan_amount)}</span>
                                </td>
                                <td data-column="installment" class="installment-cell">
                                    <span class="installment">${formatCurrency(loan.installment_amount)}</span>
                                </td>
                                <td data-column="remaining_amount" class="remaining-amount-cell">
                                    <span class="remaining-amount ${loan.remaining_amount > 0 ? 'warning' : 'success'}">
                                        ${loan.remaining_amount !== undefined && loan.remaining_amount !== null ? 
                                            (loan.remaining_amount > 0 ? formatCurrency(loan.remaining_amount) : 'مكتمل') : 
                                            '<span class="no-loan">لا يوجد</span>'
                                        }
                                    </span>
                                </td>
                                <td data-column="status">
                                    <span class="status-badge ${loan.status}">
                                        ${loan.status === 'pending' ? 'معلق' : 
                                          loan.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                                    </span>
                                </td>
                                <td data-column="request_date">
                                    <span class="date">${new Date(loan.request_date).toLocaleDateString('en-US')}</span>
                                </td>
                                <td data-column="processed_by">
                                    <span class="admin-name">${loan.admin_name || 'غير محدد'}</span>
                                </td>
                                <td data-column="actions" class="actions-cell">
                                    <button class="btn btn-sm btn-info" onclick="loansManagement.viewLoanDetails(${loan.loan_id})" title="التفاصيل">
                                        <i class="fas fa-eye"></i> عرض
                                    </button>
                                    ${loan.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" onclick="loansManagement.approveLoan(${loan.loan_id})" title="موافقة">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="loansManagement.rejectLoan(${loan.loan_id})" title="رفض">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    // Display pending loan payments
    displayPendingPayments(payments, container) {
        if (!payments || payments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h4>لا توجد أقساط معلقة</h4>
                    <p>جميع أقساط القروض تم معالجتها</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-credit-card"></i> أقساط القروض المعلقة (${payments.length})</h4>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم الدفعة</th>
                            <th>اسم المقترض</th>
                            <th>مبلغ القرض الأصلي</th>
                            <th>مبلغ الدفعة</th>
                            <th>تاريخ الطلب</th>
                            <th>ملاحظات</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => {
                            // Use loan_id as the primary key field
                            const paymentId = payment.loan_id;
                            return `
                            <tr data-payment-id="${paymentId}">
                                <td>#${paymentId}</td>
                                <td>
                                    <div class="user-info">
                                        <strong>${payment.full_name}</strong>
                                        <small>ID: ${payment.user_id}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="amount-badge">${formatCurrency(payment.loan_amount)}</span>
                                </td>
                                <td>
                                    <span class="amount-badge primary">${formatCurrency(payment.credit)}</span>
                                </td>
                                <td>
                                    <small>${new Date(payment.date).toLocaleDateString('en-US')}</small>
                                </td>
                                <td>
                                    <small>${payment.memo || 'لا توجد ملاحظات'}</small>
                                </td>
                                <td class="actions">
                                    <button class="btn btn-sm btn-success" onclick="loansManagement.approvePayment('${paymentId}')" title="موافقة">
                                        <i class="fas fa-check"></i> موافقة
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="loansManagement.rejectPayment('${paymentId}')" title="رفض">
                                        <i class="fas fa-times"></i> رفض
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="loansManagement.viewLoanPaymentDetails(${paymentId})" title="التفاصيل">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    // Filter loans by status
    filterLoans() {
        const statusFilter = document.getElementById('statusFilter').value;
        const rows = document.querySelectorAll('#loans-tab-content tbody tr');
        
        rows.forEach(row => {
            const status = row.getAttribute('data-status');
            if (!statusFilter || status === statusFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Approve loan
    async approveLoan(loanId, adminOverride = false) {
        if (!adminOverride && !confirm('هل أنت متأكد من الموافقة على هذا القرض؟')) return;
        
        try {
            // Get loan details first for WhatsApp notification
            let loanDetails = null;
            try {
                const loanResult = await apiCall(`/admin/loan-details/${loanId}`);
                loanDetails = loanResult.loan;
            } catch (detailError) {
                console.warn('Could not fetch loan details for WhatsApp notification:', detailError);
            }

            const result = await apiCall(`/admin/loan-action/${loanId}`, 'POST', { 
                action: 'approve',
                adminOverride: adminOverride
            });
            showToast(result.message, 'success');
            
            // Send WhatsApp notification if loan details are available
            if (loanDetails && (loanDetails.whatsapp || loanDetails.phone)) {
                try {
                    // Get user details for WhatsApp notification
                    const userResult = await apiCall(`/admin/user-details/${loanDetails.user_id}`);
                    const user = userResult.user;
                    
                    if (user && (user.whatsapp || user.phone)) {
                        const phoneNumber = user.whatsapp || user.phone;
                        const userName = user.Aname || loanDetails.full_name || 'العضو';
                        const numberOfInstallments = loanDetails.installment_amount > 0 ? 
                            Math.max(6, Math.ceil(loanDetails.loan_amount / loanDetails.installment_amount)) : 6;
                        
                        // Get user financial data for enhanced notifications
                        let userFinancials = null;
                        try {
                            const userTransactionsResult = await apiCall(`/users/transactions/${loanDetails.user_id}`);
                            const subscriptions = userTransactionsResult.transactions?.filter(t => 
                                t.transaction_type === 'subscription' && t.status === 'accepted'
                            ) || [];
                            const totalSubscriptions = subscriptions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
                            
                            userFinancials = {
                                currentBalance: FormatHelper.formatCurrency(user.balance || 0),
                                totalSubscriptions: totalSubscriptions.toFixed(3)
                            };
                        } catch (financialError) {
                            console.warn('Could not fetch user financial data:', financialError);
                        }
                        
                        // Send WhatsApp notification
                        const whatsappSent = Utils.sendWhatsAppNotification(
                            phoneNumber, 
                            userName, 
                            'loanApproved',
                            userFinancials,
                            FormatHelper.formatCurrency(loanDetails.loan_amount),
                            FormatHelper.formatCurrency(loanDetails.installment_amount),
                            numberOfInstallments
                        );
                        
                        if (whatsappSent) {
                            showToast('تم فتح واتساب ويب لإرسال إشعار للعضو', 'info');
                        }
                    }
                } catch (whatsappError) {
                    console.warn('WhatsApp notification failed:', whatsappError);
                    // Don't show error to user - WhatsApp is supplementary
                }
            }

            // Remove the approved row from the table instead of reloading entire tab
            this.removeLoanRow(loanId);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            // Handle eligibility validation errors with admin override option
            if (error.status === 400 && error.data && error.data.canOverride) {
                const eligibilityMessages = error.data.eligibilityMessages || [];
                const eligibilityFailures = error.data.eligibilityFailures || [];
                
                // Show detailed eligibility modal with override option
                showModal('🚨 تحذير: المستخدم غير مؤهل للقرض', `
                    <div class="eligibility-warning">
                        <div class="alert alert-warning">
                            <h5><i class="fas fa-exclamation-triangle"></i> فشل في اختبارات الأهلية:</h5>
                            <ul class="eligibility-failures">
                                ${eligibilityMessages.map(msg => `<li>${msg}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="alert alert-info">
                            <h5><i class="fas fa-info-circle"></i> الأخطاء التقنية:</h5>
                            <ul class="technical-failures">
                                ${eligibilityFailures.map(failure => `<li><code>${failure}</code></li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="alert alert-danger">
                            <h5><i class="fas fa-shield-alt"></i> تجاوز إداري</h5>
                            <p>يمكنك الموافقة على القرض رغم فشل اختبارات الأهلية باستخدام التجاوز الإداري.</p>
                            <p><strong>تحذير:</strong> سيتم تسجيل هذا الإجراء في السجلات للمراجعة.</p>
                        </div>
                    </div>
                `, `
                    <button class="btn btn-danger" onclick="loansManagement.approveLoan(${loanId}, true); hideModal();">
                        <i class="fas fa-shield-alt"></i> تجاوز إداري والموافقة
                    </button>
                    <button class="btn btn-secondary" onclick="hideModal();">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                `);
            } else {
                showToast(error.message, 'error');
            }
        }
    }

    // Reject loan
    async rejectLoan(loanId) {
        const reason = prompt('سبب الرفض (اختياري):');
        if (reason === null) return; // User canceled
        
        if (!confirm('هل أنت متأكد من رفض هذا القرض؟')) return;
        
        try {
            // Get loan details first for WhatsApp notification
            let loanDetails = null;
            try {
                const loanResult = await apiCall(`/admin/loan-details/${loanId}`);
                loanDetails = loanResult.loan;
            } catch (detailError) {
                console.warn('Could not fetch loan details for WhatsApp notification:', detailError);
            }

            const result = await apiCall(`/admin/loan-action/${loanId}`, 'POST', { 
                action: 'reject',
                reason: reason || ''
            });
            showToast(result.message, 'success');
            
            // Send WhatsApp notification if loan details are available
            if (loanDetails && (loanDetails.whatsapp || loanDetails.phone)) {
                try {
                    // Get user details for WhatsApp notification
                    const userResult = await apiCall(`/admin/user-details/${loanDetails.user_id}`);
                    const user = userResult.user;
                    
                    if (user && (user.whatsapp || user.phone)) {
                        const phoneNumber = user.whatsapp || user.phone;
                        const userName = user.Aname || loanDetails.full_name || 'العضو';
                        
                        // Send WhatsApp notification
                        const whatsappSent = Utils.sendWhatsAppNotification(
                            phoneNumber, 
                            userName, 
                            'loanRejected',
                            FormatHelper.formatCurrency(loanDetails.loan_amount)
                        );
                        
                        if (whatsappSent) {
                            showToast('تم فتح واتساب ويب لإرسال إشعار للعضو', 'info');
                        }
                    }
                } catch (whatsappError) {
                    console.warn('WhatsApp notification failed:', whatsappError);
                    // Don't show error to user - WhatsApp is supplementary
                }
            }

            // Remove the rejected row from the table instead of reloading entire tab
            this.removeLoanRow(loanId);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // View loan details
    async viewLoanDetails(loanId) {
        try {
            const result = await apiCall(`/admin/loan-details/${loanId}`);
            const loan = result.loan;
            
            const modalContent = `
                <div class="loan-details-modal">
                    <h3><i class="fas fa-file-invoice-dollar"></i> تفاصيل طلب القرض #${loan.loan_id}</h3>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> معلومات المقترض</h4>
                            <div class="detail-item">
                                <label>الاسم:</label>
                                <span>${loan.full_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>معرف المستخدم:</label>
                                <span>${loan.user_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>نوع العضوية:</label>
                                <span>${loan.user_type === 'employee' ? 'موظف' : 'إداري'}</span>
                            </div>
                            <div class="detail-item">
                                <label>الرصيد الحالي:</label>
                                <span class="balance">${formatCurrency(loan.balance)}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-money-bill-wave"></i> تفاصيل القرض</h4>
                            <div class="detail-item">
                                <label>مبلغ القرض المطلوب:</label>
                                <span class="amount">${formatCurrency(loan.loan_amount)}</span>
                            </div>
                            <div class="detail-item">
                                <label>القسط الشهري:</label>
                                <span class="installment">${formatCurrency(loan.installment_amount)}</span>
                            </div>
                            <div class="detail-item">
                                <label>مدة السداد:</label>
                                <span>${loan.installment_amount > 0 ? Math.max(6, Math.ceil(loan.loan_amount / loan.installment_amount)) : 'غير محسوب'} شهر</span>
                            </div>
                            <div class="detail-item">
                                <label>إجمالي المبلغ المسدد:</label>
                                <span class="total-amount">${formatCurrency(loan.loan_amount)}</span>
                                <small style="color: #28a745;">المبلغ مطابق للقرض - بدون فوائد</small>
                            </div>
                            <div class="detail-item">
                                <label>الحالة:</label>
                                <span class="status-badge ${loan.status}">
                                    ${loan.status === 'pending' ? 'معلق' : 
                                      loan.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-section repayment-plan">
                            <h4><i class="fas fa-calendar-alt"></i> خطة السداد المتوقعة</h4>
                            ${this.generateRepaymentPlan(loan.loan_amount, loan.installment_amount)}
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        ${loan.status === 'pending' ? `
                            <button onclick="loansManagement.approveLoan(${loan.loan_id}); hideModal();" class="btn btn-success">
                                <i class="fas fa-check"></i> موافقة
                            </button>
                            <button onclick="loansManagement.rejectLoan(${loan.loan_id}); hideModal();" class="btn btn-danger">
                                <i class="fas fa-times"></i> رفض
                            </button>
                        ` : ''}
                        ${(loan.phone || loan.whatsapp) ? `
                            <button onclick="loansManagement.retryLoanWhatsAppNotification(${loan.user_id}, '${loan.full_name}', ${loan.loan_id})" class="btn btn-primary">
                                <i class="fab fa-whatsapp"></i> إعادة إرسال واتساب
                            </button>
                        ` : ''}
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            showModal('تفاصيل طلب القرض', modalContent);
            
        } catch (error) {
            // Fallback for when detailed endpoint doesn't exist
            showToast('عرض تفاصيل القرض - سيتم تطويرها قريباً', 'info');
        }
    }

    // Approve payment
    async approvePayment(paymentId) {
        if (!confirm('هل أنت متأكد من الموافقة على هذه الدفعة؟')) return;
        
        try {
            // Get payment details first for WhatsApp notification
            let paymentDetails = null;
            let userDetails = null;
            
            try {
                const allPaymentsResult = await apiCall('/admin/all-loan-payments');
                paymentDetails = allPaymentsResult.loanPayments?.find(p => p.loan_id == paymentId);
                
                if (paymentDetails && paymentDetails.user_id) {
                    const userResult = await apiCall(`/admin/user-details/${paymentDetails.user_id}`);
                    userDetails = userResult.user;
                }
            } catch (detailError) {
                console.warn('Could not fetch payment details for WhatsApp notification:', detailError);
            }
            
            const result = await apiCall(`/admin/loan-payment-action/${paymentId}`, 'POST', { 
                action: 'approve' 
            });
            showToast(result.message, 'success');
            
            // Send WhatsApp notification if details are available
            if (paymentDetails && userDetails && (userDetails.whatsapp || userDetails.phone)) {
                try {
                    const phoneNumber = userDetails.whatsapp || userDetails.phone;
                    const userName = userDetails.Aname || paymentDetails.full_name || 'العضو';
                    
                    // Get user financial data for enhanced notifications
                    let userFinancials = null;
                    try {
                        const userTransactionsResult = await apiCall(`/users/transactions/${paymentDetails.user_id}`);
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
                    
                    // Get loan summary for progress tracking
                    // Use updated loan summary from approval response if available, otherwise use original data
                    const loanSummary = result.loanSummary || paymentDetails;
                    const paymentAmount = loanSummary.payment_amount || paymentDetails.credit || 0;
                    const totalPaid = loanSummary.total_paid_for_loan || 0;
                    const loanAmount = loanSummary.loan_amount || 0;
                    const remainingAmount = Math.max(0, loanAmount - totalPaid);
                    
                    // Debug log for payment data
                    console.log('Payment details for WhatsApp:', {
                        paymentAmount,
                        totalPaid, 
                        loanAmount,
                        remainingAmount,
                        paymentDetails
                    });
                    
                    const whatsappSent = Utils.sendWhatsAppNotification(
                        phoneNumber,
                        userName,
                        'loanPaymentApproved',
                        userFinancials,
                        FormatHelper.formatCurrency(paymentAmount),
                        FormatHelper.formatCurrency(totalPaid),
                        FormatHelper.formatCurrency(loanAmount),
                        FormatHelper.formatCurrency(remainingAmount)
                    );
                    
                    if (whatsappSent) {
                        showToast('تم فتح واتساب ويب لإرسال إشعار دفعة القرض للعضو', 'info');
                    }
                } catch (whatsappError) {
                    console.warn('WhatsApp notification failed:', whatsappError);
                    // Don't show error to user - WhatsApp is supplementary
                }
            }

            // Remove the approved payment row from the table instead of reloading entire tab
            this.removePaymentRow(paymentId);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Reject payment
    async rejectPayment(paymentId) {
        if (!confirm('هل أنت متأكد من رفض هذه الدفعة؟')) return;

        try {
            const result = await apiCall(`/admin/loan-payment-action/${paymentId}`, 'POST', {
                action: 'reject'
            });
            showToast(result.message, 'success');

            // Remove the rejected payment row from the table instead of reloading entire tab
            this.removePaymentRow(paymentId);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // View payment details
    async viewPaymentDetails(paymentId) {
        try {
            // Get payment details from all payments
            const result = await apiCall('/admin/all-loan-payments');
            const payment = result.loanPayments.find(p => p.loan_id === paymentId);
            
            if (!payment) {
                showToast('لا يمكن العثور على تفاصيل الدفعة', 'error');
                return;
            }

            // Get loan details
            const loansResult = await apiCall('/admin/all-loans');
            const loan = loansResult.loans.find(l => l.loan_id === payment.target_loan_id);

            // Get user details to ensure we have phone number
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${payment.user_id}`);
                userDetails = userResult.user;
            } catch (error) {
                console.warn('Could not fetch user details:', error);
            }

            // Use phone from user details or fallback to payment data
            const phoneNumber = userDetails?.whatsapp || userDetails?.phone || payment.phone;
            
            // Use name from user details or fallback to payment data
            const userName = userDetails?.Aname || payment.user_name || 'غير محدد';

            const modalContent = `
                <div class="payment-details-modal">
                    <h3><i class="fas fa-credit-card"></i> تفاصيل دفعة القرض #${paymentId}</h3>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> معلومات المستخدم</h4>
                            <div class="detail-item">
                                <label>الاسم:</label>
                                <span>${userName}</span>
                            </div>
                            <div class="detail-item">
                                <label>معرف المستخدم:</label>
                                <span>${payment.user_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>رقم الهاتف:</label>
                                <span>${phoneNumber || 'غير محدد'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-money-bill-wave"></i> تفاصيل الدفعة</h4>
                            <div class="detail-item">
                                <label>مبلغ الدفعة:</label>
                                <span class="amount credit">${Utils.formatCurrency(payment.credit)} د.ك</span>
                            </div>
                            <div class="detail-item">
                                <label>الوصف:</label>
                                <span>${payment.memo || 'دفعة قرض'}</span>
                            </div>
                            <div class="detail-item">
                                <label>الحالة:</label>
                                <span class="status-badge ${payment.status}">
                                    ${payment.status === 'pending' ? 'معلق' : 
                                      payment.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>تاريخ الدفعة:</label>
                                <span>${Utils.formatDate(payment.date)}</span>
                            </div>
                            ${payment.admin_name ? `
                                <div class="detail-item">
                                    <label>اعتُمد بواسطة:</label>
                                    <span>${payment.admin_name}</span>
                                </div>
                            ` : ''}
                        </div>

                        ${loan ? `
                            <div class="detail-section">
                                <h4><i class="fas fa-chart-line"></i> معلومات القرض</h4>
                                <div class="detail-item">
                                    <label>مبلغ القرض الأصلي:</label>
                                    <span>${Utils.formatCurrency(loan.loan_amount)} د.ك</span>
                                </div>
                                <div class="detail-item">
                                    <label>القسط المطلوب:</label>
                                    <span>${Utils.formatCurrency(loan.installment_amount)} د.ك</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-actions">
                        ${payment.status === 'pending' ? `
                            <button onclick="loansManagement.approvePayment('${paymentId}'); hideModal();" class="btn btn-success">
                                <i class="fas fa-check"></i> موافقة
                            </button>
                            <button onclick="loansManagement.rejectPayment('${paymentId}'); hideModal();" class="btn btn-danger">
                                <i class="fas fa-times"></i> رفض
                            </button>
                        ` : ''}
                        ${phoneNumber ? `
                            <button onclick="loansManagement.retryWhatsAppNotification(${payment.user_id}, '${userName}', 'loan_payment', '${paymentId}')" class="btn btn-primary">
                                <i class="fab fa-whatsapp"></i> إعادة إرسال واتساب
                            </button>
                        ` : ''}
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            showModal('تفاصيل دفعة القرض', modalContent);
            
        } catch (error) {
            console.error('Error viewing payment details:', error);
            showToast('حدث خطأ في عرض تفاصيل الدفعة', 'error');
        }
    }

    // Generate repayment plan for loan details
    generateRepaymentPlan(loanAmount, installmentAmount) {
        if (installmentAmount <= 0) {
            return `
                <div class="error-state" style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="color: #721c24; font-size: 24px; margin-bottom: 10px;"></i>
                    <h5 style="color: #721c24;">خطأ في حساب القسط</h5>
                    <p style="color: #721c24; margin: 0;">القسط الشهري غير محسوب بشكل صحيح. يرجى مراجعة طلب القرض.</p>
                </div>
            `;
        }
        
        const totalPeriods = Math.max(6, Math.ceil(loanAmount / installmentAmount));
        const regularPeriods = Math.floor(loanAmount / installmentAmount);
        const finalPayment = loanAmount - (regularPeriods * installmentAmount);
        
        let planHtml = `
            <div class="repayment-summary">
                <div class="summary-row">
                    <span>عدد الأقساط العادية:</span>
                    <span><strong>${regularPeriods} قسط</strong> × ${formatCurrency(installmentAmount)}</span>
                </div>
        `;
        
        if (finalPayment > 0.01) {
            planHtml += `
                <div class="summary-row">
                    <span>القسط الأخير:</span>
                    <span><strong>1 قسط</strong> × ${formatCurrency(finalPayment)}</span>
                </div>
            `;
        }
        
        planHtml += `
                <div class="summary-row total">
                    <span>إجمالي الأقساط:</span>
                    <span><strong>${totalPeriods} شهر</strong></span>
                </div>
                <div class="summary-row total">
                    <span>إجمالي المبلغ المسدد:</span>
                    <span><strong>${formatCurrency(loanAmount)}</strong></span>
                </div>
            </div>
            
            <div class="payment-schedule">
                <h5><i class="fas fa-list"></i> جدول الدفع المتوقع</h5>
                <div class="schedule-info">
                    <p><strong>ما يجب على المقترض فعله:</strong></p>
                    <ul>
                        <li>دفع <strong>${formatCurrency(installmentAmount)}</strong> شهرياً لمدة <strong>${regularPeriods}</strong> شهر</li>
                        ${finalPayment > 0.01 ? `<li>دفع <strong>${formatCurrency(finalPayment)}</strong> في الشهر الأخير</li>` : ''}
                        <li>استخدام تبويب "دفع قسط" في لوحة التحكم</li>
                        <li>انتظار موافقة الإدارة على كل دفعة</li>
                    </ul>
                </div>
                
                <div class="important-notes">
                    <h6><i class="fas fa-exclamation-triangle"></i> ملاحظات مهمة:</h6>
                    <ul>
                        <li>لا توجد فوائد أو رسوم إضافية</li>
                        <li>المبلغ المسدد = مبلغ القرض بالضبط</li>
                        <li>الحد الأدنى للقسط: 20 د.ك (ما عدا القسط الأخير)</li>
                        <li>يتم إغلاق القرض تلقائياً عند السداد الكامل</li>
                    </ul>
                </div>
            </div>
        `;
        
        return planHtml;
    }

    // Display all loan payments history
    displayAllLoanPayments(loanPayments, container) {
        if (loanPayments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>لا توجد مدفوعات قروض</h4>
                    <p>لم يتم إجراء أي مدفوعات للقروض بعد</p>
                </div>
            `;
            return;
        }

        // Calculate statistics
        const totalPayments = loanPayments.length;
        const acceptedPayments = loanPayments.filter(p => p.status === 'accepted');
        const pendingPayments = loanPayments.filter(p => p.status === 'pending').length;
        const rejectedPayments = loanPayments.filter(p => p.status === 'rejected').length;
        const totalAmount = acceptedPayments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

        container.innerHTML = `
            <div class="payments-overview">
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value">${totalPayments}</div>
                        <div class="stat-label">إجمالي المدفوعات</div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-value">${acceptedPayments.length}</div>
                        <div class="stat-label">مدفوعات مقبولة</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">${pendingPayments}</div>
                        <div class="stat-label">مدفوعات معلقة</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">${rejectedPayments}</div>
                        <div class="stat-label">مدفوعات مرفوضة</div>
                    </div>
                    <div class="stat-card primary">
                        <div class="stat-value">${formatCurrency(totalAmount)}</div>
                        <div class="stat-label">إجمالي المبلغ</div>
                    </div>
                </div>
            </div>

            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-history"></i> سجل مدفوعات القروض (${loanPayments.length})</h4>
                    <div class="table-filters">
                        <select id="paymentStatusFilter" onchange="loansManagement.filterPayments()">
                            <option value="">جميع الحالات</option>
                            <option value="accepted">مقبول</option>
                            <option value="pending">معلق</option>
                            <option value="rejected">مرفوض</option>
                        </select>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم الدفعة</th>
                            <th>المقترض</th>
                            <th>رقم القرض</th>
                            <th>مبلغ الدفعة</th>
                            <th>إجمالي القرض</th>
                            <th>المسدد</th>
                            <th>المتبقي</th>
                            <th>الحالة</th>
                            <th>تاريخ الدفع</th>
                            <th>الإداري</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loanPayments.map(payment => `
                            <tr data-status="${payment.status}">
                                <td>#${payment.loan_id}</td>
                                <td>
                                    <div class="user-info">
                                        <strong>${payment.user_name}</strong>
                                        <small>ID: ${payment.user_id}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="loan-ref">#${payment.target_loan_id}</span>
                                </td>
                                <td>
                                    <span class="amount success">${formatCurrency(payment.payment_amount)}</span>
                                </td>
                                <td>
                                    <span class="amount">${formatCurrency(payment.loan_amount)}</span>
                                </td>
                                <td>
                                    <span class="amount primary">${formatCurrency(payment.total_paid_for_loan)}</span>
                                </td>
                                <td>
                                    <span class="amount ${payment.remaining_amount <= 0 ? 'success' : 'warning'}">
                                        ${formatCurrency(Math.max(0, payment.remaining_amount))}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge ${payment.status}">
                                        ${payment.status === 'accepted' ? 'مقبول' : 
                                          payment.status === 'pending' ? 'معلق' : 'مرفوض'}
                                    </span>
                                </td>
                                <td>
                                    <div class="date-info">
                                        ${new Date(payment.payment_date).toLocaleDateString('en-US')}
                                        <small>${new Date(payment.payment_date).toLocaleTimeString('ar-KW', {hour: '2-digit', minute: '2-digit'})}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="admin-name">${payment.admin_name || 'غير محدد'}</span>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-info" onclick="loansManagement.viewPaymentDetails(${payment.loan_id})" title="التفاصيل">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="loansManagement.editLoanPayment(${payment.loan_id})" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="loansManagement.deleteLoanPayment(${payment.loan_id})" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ${payment.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" onclick="loansManagement.approveLoanPayment(${payment.loan_id})" title="موافقة">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="loansManagement.rejectLoanPayment(${payment.loan_id})" title="رفض">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Filter payments by status
    filterPayments() {
        const filter = document.getElementById('paymentStatusFilter').value;
        const rows = document.querySelectorAll('#loans-tab-content tbody tr');
        
        rows.forEach(row => {
            if (!filter || row.dataset.status === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Display loan management interface
    displayLoanManagement(container) {
        container.innerHTML = `
            <div class="loan-management-section">
                <div class="management-header">
                    <h4><i class="fas fa-plus-circle"></i> إدارة القروض</h4>
                    <p>إضافة، تعديل، أو حذف القروض مع إمكانية تحديد المبلغ الأصلي والمتبقي</p>
                </div>

                <div class="loan-management-tabs">
                    <button class="loan-mgmt-tab active" data-loan-tab="add">
                        <i class="fas fa-plus"></i> إضافة قرض جديد
                    </button>
                    <button class="loan-mgmt-tab" data-loan-tab="existing">
                        <i class="fas fa-edit"></i> تعديل القروض الموجودة
                    </button>
                </div>

                <div class="loan-management-content">
                    <div id="add-loan-content" class="loan-mgmt-panel active">
                        ${this.renderAddLoanForm()}
                    </div>
                    <div id="existing-loan-content" class="loan-mgmt-panel">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> جاري تحميل القروض الموجودة...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupLoanManagementListeners();
    }

    // Setup loan management tab listeners
    setupLoanManagementListeners() {
        setTimeout(() => {
            // Tab switching
            const tabs = document.querySelectorAll('.loan-mgmt-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabType = tab.getAttribute('data-loan-tab');
                    
                    // Update active tab
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Update content panels
                    document.querySelectorAll('.loan-mgmt-panel').forEach(panel => {
                        panel.classList.remove('active');
                    });
                    
                    if (tabType === 'add') {
                        document.getElementById('add-loan-content').classList.add('active');
                    } else {
                        document.getElementById('existing-loan-content').classList.add('active');
                        this.loadExistingLoans();
                    }
                });
            });

            // User search
            const userSearchBtn = document.getElementById('searchUserBtn');
            if (userSearchBtn) {
                userSearchBtn.addEventListener('click', () => this.searchUsers());
            }

            // Loan form submission
            const loanForm = document.getElementById('addLoanForm');
            if (loanForm) {
                loanForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitLoanForm();
                });
            }
        }, 100);
    }

    // Render add loan form
    renderAddLoanForm() {
        return `
            <div class="add-loan-form">
                <div class="form-section">
                    <h5><i class="fas fa-user-search"></i> البحث عن العضو</h5>
                    <div class="user-search-section">
                        <div class="search-input-group">
                            <input type="text" id="userSearchInput" placeholder="ابحث بالاسم أو رقم المعرف أو الهاتف..." class="form-control">
                            <button type="button" id="searchUserBtn" class="btn btn-primary">
                                <i class="fas fa-search"></i> بحث
                            </button>
                        </div>
                        <div id="userSearchResults" class="search-results"></div>
                        <div id="selectedUser" class="selected-user-info" style="display: none;"></div>
                    </div>
                </div>

                <form id="addLoanForm" style="display: none;">
                    <div class="form-section">
                        <h5><i class="fas fa-money-bill-wave"></i> تفاصيل القرض</h5>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="originalLoanAmount">المبلغ الأصلي للقرض (د.ك)</label>
                                <input type="number" id="originalLoanAmount" step="0.001" min="0" max="50000" class="form-control" required>
                                <small class="form-help">المبلغ الكامل الذي تم اقتراضه أصلاً</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="remainingAmount">القرض (د.ك)</label>
                                <input type="number" id="remainingAmount" step="0.001" min="0" class="form-control" required>
                                <small class="form-help">المبلغ الذي لم يتم سداده بعد</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="monthlyInstallment">القسط الشهري (د.ك)</label>
                                <input type="number" id="monthlyInstallment" step="0.001" min="20" class="form-control">
                                <small class="form-help">اتركه فارغاً للحساب التلقائي أو أدخل قيمة مخصصة (الحد الأدنى: 20 د.ك)</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="loanStatus">حالة القرض</label>
                                <select id="loanStatus" class="form-control" required>
                                    <option value="approved" selected>موافق عليه - نشط</option>
                                    <option value="pending">معلق - في انتظار الموافقة</option>
                                    <option value="rejected">مرفوض</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="loanNotes">ملاحظات (اختياري)</label>
                            <textarea id="loanNotes" class="form-control" rows="3" placeholder="أي ملاحظات حول القرض..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="requestDate">تاريخ طلب القرض</label>
                            <input type="date" id="requestDate" class="form-control" required>
                        </div>
                    </div>

                    <div class="loan-summary" id="loanSummary" style="display: none;">
                        <h6><i class="fas fa-calculator"></i> ملخص القرض</h6>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <label>المبلغ المسدد:</label>
                                <span id="paidAmount">0.000 د.ك</span>
                            </div>
                            <div class="summary-item">
                                <label>نسبة السداد:</label>
                                <span id="paymentProgress">0%</span>
                            </div>
                            <div class="summary-item">
                                <label>عدد الأقساط المتوقع:</label>
                                <span id="expectedInstallments">0 شهر</span>
                            </div>
                            <div class="summary-item">
                                <label>القسط الأخير:</label>
                                <span id="finalInstallment">0.000 د.ك</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-plus"></i> إضافة القرض
                        </button>
                        <button type="button" onclick="document.getElementById('addLoanForm').style.display='none';" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Search for users
    async searchUsers() {
        const searchInput = document.getElementById('userSearchInput');
        const resultsDiv = document.getElementById('userSearchResults');
        const query = searchInput.value.trim();

        if (query.length < 1) {
            showToast('يرجى إدخال رقم أو نص للبحث', 'warning');
            return;
        }

        try {
            resultsDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
            
            const result = await apiCall(`/admin/search-users?q=${encodeURIComponent(query)}`);
            
            if (result.users && result.users.length > 0) {
                resultsDiv.innerHTML = `
                    <div class="search-results-list">
                        <h6>نتائج البحث (${result.users.length}):</h6>
                        ${result.users.map(user => `
                            <div class="user-result-item" onclick="loansManagement.selectUser(${user.user_id}, '${user.Aname}', '${user.phone}', ${user.balance})">
                                <div class="user-info">
                                    <strong>${user.Aname}</strong>
                                    <div class="user-details">
                                        <span>المعرف: ${user.user_id}</span>
                                        <span>الهاتف: ${user.phone}</span>
                                        <span>الرصيد: ${formatCurrency(user.balance)}</span>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-primary">اختيار</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-user-slash"></i>
                        <p>لم يتم العثور على أي مستخدمين</p>
                    </div>
                `;
            }
        } catch (error) {
            resultsDiv.innerHTML = `<div class="error-message">خطأ في البحث: ${error.message}</div>`;
        }
    }

    // Select user for loan
    selectUser(userId, userName, userPhone, userBalance) {
        const selectedUserDiv = document.getElementById('selectedUser');
        const loanForm = document.getElementById('addLoanForm');
        const searchResults = document.getElementById('userSearchResults');

        selectedUserDiv.innerHTML = `
            <div class="user-card selected">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <h6>${userName}</h6>
                    <div class="user-meta">
                        <span><i class="fas fa-id-badge"></i> ${userId}</span>
                        <span><i class="fas fa-phone"></i> ${userPhone}</span>
                        <span><i class="fas fa-wallet"></i> ${formatCurrency(userBalance)}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary" onclick="loansManagement.clearSelectedUser()">
                    <i class="fas fa-times"></i> تغيير
                </button>
            </div>
        `;

        selectedUserDiv.style.display = 'block';
        loanForm.style.display = 'block';
        searchResults.innerHTML = '';
        
        // Store selected user data
        this.selectedUser = { userId, userName, userPhone, userBalance };
        
        // Set default request date to today
        document.getElementById('requestDate').value = new Date().toISOString().split('T')[0];
        
        // Setup real-time calculations
        this.setupLoanCalculations();
    }

    // Clear selected user
    clearSelectedUser() {
        document.getElementById('selectedUser').style.display = 'none';
        document.getElementById('addLoanForm').style.display = 'none';
        document.getElementById('userSearchInput').value = '';
        this.selectedUser = null;
    }

    // Setup loan calculations
    setupLoanCalculations() {
        const originalAmount = document.getElementById('originalLoanAmount');
        const remainingAmount = document.getElementById('remainingAmount');
        const monthlyInstallment = document.getElementById('monthlyInstallment');

        const updateSummary = () => {
            const original = parseFloat(originalAmount.value) || 0;
            const remaining = parseFloat(remainingAmount.value) || 0;
            const installment = parseFloat(monthlyInstallment.value) || 0;

            if (original > 0 && remaining <= original) {
                const paid = original - remaining;
                const progress = ((paid / original) * 100).toFixed(1);
                const expectedInstallments = installment > 0 ? Math.ceil(remaining / installment) : 0;
                const finalInstallment = installment > 0 ? remaining - (Math.floor(remaining / installment) * installment) : 0;

                document.getElementById('paidAmount').textContent = formatCurrency(paid);
                document.getElementById('paymentProgress').textContent = progress + '%';
                document.getElementById('expectedInstallments').textContent = expectedInstallments + ' شهر';
                document.getElementById('finalInstallment').textContent = formatCurrency(finalInstallment);
                
                document.getElementById('loanSummary').style.display = 'block';
            } else {
                document.getElementById('loanSummary').style.display = 'none';
            }
        };

        originalAmount.addEventListener('input', updateSummary);
        remainingAmount.addEventListener('input', updateSummary);
        monthlyInstallment.addEventListener('input', updateSummary);
    }

    // Submit loan form
    async submitLoanForm() {
        if (!this.selectedUser) {
            showToast('يرجى اختيار المستخدم أولاً', 'error');
            return;
        }

        const monthlyInstallmentValue = document.getElementById('monthlyInstallment').value;
        
        const formData = {
            userId: this.selectedUser.userId,
            originalAmount: parseFloat(document.getElementById('originalLoanAmount').value),
            remainingAmount: parseFloat(document.getElementById('remainingAmount').value),
            monthlyInstallment: monthlyInstallmentValue ? parseFloat(monthlyInstallmentValue) : null,
            status: document.getElementById('loanStatus').value || 'approved',
            notes: document.getElementById('loanNotes').value || '',
            requestDate: document.getElementById('requestDate').value || new Date().toISOString().split('T')[0]
        };

        // Validation
        if (formData.originalAmount <= 0) {
            showToast('يرجى إدخال مبلغ القرض الأصلي', 'error');
            return;
        }

        if (formData.remainingAmount > formData.originalAmount) {
            showToast('القرض لا يمكن أن يكون أكبر من المبلغ الأصلي', 'error');
            return;
        }

        // Check monthly installment - allow empty for auto-calculation
        if (formData.monthlyInstallment && formData.monthlyInstallment < 20) {
            showToast('الحد الأدنى للقسط الشهري هو 20 د.ك', 'error');
            return;
        }

        try {
            console.log('Submitting loan form with data:', formData);
            console.log('JWT Token available:', !!localStorage.getItem('token'));
            const result = await apiCall('/admin/add-loan', 'POST', formData);
            console.log('Loan submission successful:', result);
            showToast(result.message, 'success');
            
            // Reset form
            document.getElementById('addLoanForm').reset();
            this.clearSelectedUser();
            
            // Refresh admin stats
            await this.adminDashboard.loadStats();
            
        } catch (error) {
            console.error('Loan submission error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                formData: formData
            });
            showToast('خطأ في إرسال طلب القرض: ' + error.message, 'error');
        }
    }

    // Load existing loans for management
    async loadExistingLoans() {
        const container = document.getElementById('existing-loan-content');
        
        try {
            const result = await apiCall('/admin/all-loans');
            this.displayExistingLoansManagement(result.loans, container);
        } catch (error) {
            container.innerHTML = `<div class="error-message">خطأ في تحميل القروض: ${error.message}</div>`;
        }
    }

    // Display existing loans for management
    displayExistingLoansManagement(loans, container) {
        if (!loans || loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>لا توجد قروض</h4>
                    <p>لم يتم إنشاء أي قروض بعد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="existing-loans-management">
                <div class="management-header">
                    <h5><i class="fas fa-edit"></i> تعديل القروض الموجودة (${loans.length})</h5>
                    <div class="management-filters">
                        <select id="statusFilterManage" onchange="loansManagement.filterExistingLoans()">
                            <option value="">جميع الحالات</option>
                            <option value="pending">معلق</option>
                            <option value="approved">موافق عليه</option>
                            <option value="rejected">مرفوض</option>
                        </select>
                    </div>
                </div>

                <div class="loans-management-grid">
                    ${loans.map(loan => `
                        <div class="loan-management-card" data-status="${loan.status}">
                            <div class="loan-card-header">
                                <div class="loan-info">
                                    <h6>#${loan.loan_id} - ${loan.full_name}</h6>
                                    <span class="status-badge ${loan.status}">
                                        ${loan.status === 'pending' ? 'معلق' : 
                                          loan.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                                    </span>
                                </div>
                                <div class="loan-actions">
                                    <button class="btn btn-sm btn-primary" onclick="loansManagement.editLoan(${loan.loan_id})" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="loansManagement.deleteLoan(${loan.loan_id})" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="loan-card-body">
                                <div class="loan-details-grid">
                                    <div class="detail-item">
                                        <span class="label">مبلغ القرض:</span>
                                        <span class="value">${formatCurrency(loan.loan_amount)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="label">القسط الشهري:</span>
                                        <span class="value">${formatCurrency(loan.installment_amount)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="label">تاريخ الطلب:</span>
                                        <span class="value">${new Date(loan.request_date).toLocaleDateString('en-US')}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="label">معالج بواسطة:</span>
                                        <span class="value">${loan.admin_name || 'غير محدد'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Filter existing loans
    filterExistingLoans() {
        const filter = document.getElementById('statusFilterManage').value;
        const cards = document.querySelectorAll('.loan-management-card');
        
        cards.forEach(card => {
            if (!filter || card.dataset.status === filter) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Edit loan
    async editLoan(loanId) {
        try {
            const result = await apiCall(`/admin/loan-details/${loanId}`);
            const loan = result.loan;
            
            // Get current payment data
            const paymentResult = await apiCall(`/admin/loan-payments/${loanId}`);
            const totalPaid = paymentResult.payments ? 
                paymentResult.payments.filter(p => p.status === 'accepted').reduce((sum, p) => sum + parseFloat(p.credit), 0) : 0;
            const remainingAmount = loan.loan_amount - totalPaid;
            
            const modalContent = `
                <div class="edit-loan-modal">
                    <h4><i class="fas fa-edit"></i> تعديل القرض #${loanId}</h4>
                    
                    <div class="loan-summary">
                        <div class="summary-item">
                            <span class="label">المدفوع حالياً:</span>
                            <span class="value paid">${formatCurrency(totalPaid)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">المتبقي حالياً:</span>
                            <span class="value remaining">${formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>
                    
                    <form id="editLoanForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>المبلغ الأصلي (د.ك)</label>
                                <input type="number" id="editOriginalAmount" step="0.001" value="${loan.loan_amount}" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label>القرض الجديد (د.ك)</label>
                                <input type="number" id="editRemainingAmount" step="0.001" value="${remainingAmount}" class="form-control">
                                <small class="form-text">اتركه فارغاً لعدم التغيير</small>
                            </div>
                            
                            <div class="form-group">
                                <label>القسط الشهري (د.ك)</label>
                                <input type="number" id="editInstallment" step="0.001" value="${loan.installment_amount}" class="form-control">
                                <small class="form-text">اتركه فارغاً للحساب التلقائي أو أدخل قيمة مخصصة</small>
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
                    
                    <div class="modal-actions">
                        <button onclick="loansManagement.updateLoan(${loanId})" class="btn btn-success">
                            <i class="fas fa-save"></i> حفظ التغييرات
                        </button>
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </div>
            `;
            
            showModal('تعديل القرض', modalContent);
            
            // Add event listener for remaining amount calculation
            document.getElementById('editOriginalAmount').addEventListener('input', this.updateEditCalculations);
            document.getElementById('editRemainingAmount').addEventListener('input', this.updateEditCalculations);
            
        } catch (error) {
            showToast('خطأ في تحميل بيانات القرض: ' + error.message, 'error');
        }
    }

    // Update loan
    async updateLoan(loanId) {
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

        try {
            const result = await apiCall(`/admin/update-loan/${loanId}`, 'PUT', formData);
            showToast(result.message, 'success');
            hideModal();
            this.loadExistingLoans();
            await this.adminDashboard.loadStats();
        } catch (error) {
            showToast(error.message, 'error');
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

    // Delete loan
    async deleteLoan(loanId) {
        if (!confirm('هل أنت متأكد من حذف هذا القرض؟ سيتم حذف جميع الدفعات المرتبطة به أيضاً.')) {
            return;
        }

        try {
            const result = await apiCall(`/admin/delete-loan/${loanId}`, 'DELETE');
            showToast(result.message, 'success');
            this.loadExistingLoans();
            await this.adminDashboard.loadStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Column visibility management
    toggleColumnPanel() {
        const panel = document.getElementById('loansColumnPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        
        if (panel.style.display === 'block') {
            this.setupColumnToggles();
        }
    }

    setupColumnToggles() {
        const checkboxes = document.querySelectorAll('#loansColumnPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleColumn(e.target.value, e.target.checked);
            });
        });
    }

    toggleColumn(columnName, show) {
        const table = document.getElementById('loansTable');
        if (!table) return;
        
        const headerCell = table.querySelector(`th[data-column="${columnName}"]`);
        const dataCells = table.querySelectorAll(`td[data-column="${columnName}"]`);
        
        if (headerCell) {
            headerCell.style.display = show ? '' : 'none';
        }
        
        dataCells.forEach(cell => {
            cell.style.display = show ? '' : 'none';
        });
    }

    showAllColumns() {
        const checkboxes = document.querySelectorAll('#loansColumnPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.toggleColumn(checkbox.value, true);
        });
    }

    hideAllColumns() {
        const checkboxes = document.querySelectorAll('#loansColumnPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.value !== 'loan_id' && checkbox.value !== 'actions') { // Keep essential columns
                checkbox.checked = false;
                this.toggleColumn(checkbox.value, false);
            }
        });
    }

    resetColumnVisibility() {
        const defaultColumns = ['loan_id', 'borrower_name', 'loan_amount', 'installment', 'status', 'actions'];
        const checkboxes = document.querySelectorAll('#loansColumnPanel input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const shouldShow = defaultColumns.includes(checkbox.value);
            checkbox.checked = shouldShow;
            this.toggleColumn(checkbox.value, shouldShow);
        });
    }

    // Edit loan payment
    async editLoanPayment(paymentId) {
        try {
            // Get payment details first
            const result = await apiCall('/admin/all-loan-payments');
            const payment = result.loanPayments.find(p => p.loan_id === paymentId);
            
            if (!payment) {
                showToast('الدفعة غير موجودة', 'error');
                return;
            }

            let modalContent = `
                <form id="editLoanPaymentForm">
                    <div class="form-group">
                        <label>مبلغ الدفعة</label>
                        <input type="number" name="amount" step="0.001" 
                               value="${payment.payment_amount}" 
                               required min="0.001">
                    </div>
                    <div class="form-group">
                        <label>الملاحظة</label>
                        <textarea name="memo" rows="3">${payment.memo || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>الحالة</label>
                        <select name="status" required>
                            <option value="pending" ${payment.status === 'pending' ? 'selected' : ''}>معلق</option>
                            <option value="accepted" ${payment.status === 'accepted' ? 'selected' : ''}>مقبول</option>
                            <option value="rejected" ${payment.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
                        </select>
                    </div>
                </form>
            `;

            modalContent += `
                <div class="modal-actions">
                    <button onclick="loansManagement.saveLoanPaymentEdit(${paymentId})" class="btn btn-success">
                        <i class="fas fa-save"></i> تحديث
                    </button>
                    <button onclick="hideModal()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            `;
            
            showModal('تعديل دفعة القرض', modalContent);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Save loan payment edit
    async saveLoanPaymentEdit(paymentId) {
        try {
            const form = document.getElementById('editLoanPaymentForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            await apiCall(`/admin/update-loan-payment/${paymentId}`, 'PUT', data);
            showToast('تم تحديث دفعة القرض بنجاح', 'success');
            hideModal();
            await this.loadTab(this.currentTab); // Refresh data
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Delete loan payment
    async deleteLoanPayment(paymentId) {
        if (!confirm('هل أنت متأكد من حذف دفعة القرض هذه؟ هذا الإجراء لا يمكن التراجع عنه.')) {
            return;
        }

        try {
            showLoading(true);
            await apiCall(`/admin/delete-loan-payment/${paymentId}`, 'DELETE');
            showToast('تم حذف دفعة القرض بنجاح', 'success');
            await this.loadTab(this.currentTab); // Refresh data
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // View loan payment details (simple version for loan installments)
    async viewLoanPaymentDetails(paymentId) {
        try {
            const result = await apiCall('/admin/all-loan-payments');
            const payment = result.loanPayments.find(p => p.loan_id === paymentId);
            
            if (!payment) {
                showToast('الدفعة غير موجودة', 'error');
                return;
            }

            // Get user details to ensure we have phone number
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${payment.user_id}`);
                userDetails = userResult.user;
            } catch (error) {
                console.warn('Could not fetch user details:', error);
            }

            // Use phone from user details or fallback to payment data
            const phoneNumber = userDetails?.whatsapp || userDetails?.phone || payment.phone;
            const userName = userDetails?.Aname || payment.user_name || 'غير محدد';

            const modalContent = `
                <div class="payment-details">
                    <div class="detail-row">
                        <label>رقم الدفعة:</label>
                        <span>#${payment.loan_id}</span>
                    </div>
                    <div class="detail-row">
                        <label>المقترض:</label>
                        <span>${userName} (ID: ${payment.user_id})</span>
                    </div>
                    <div class="detail-row">
                        <label>رقم القرض:</label>
                        <span>#${payment.target_loan_id}</span>
                    </div>
                    <div class="detail-row">
                        <label>مبلغ الدفعة:</label>
                        <span class="amount">${formatCurrency(payment.payment_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>إجمالي القرض:</label>
                        <span>${formatCurrency(payment.loan_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <label>المسدد:</label>
                        <span>${formatCurrency(payment.total_paid_for_loan)}</span>
                    </div>
                    <div class="detail-row">
                        <label>المتبقي:</label>
                        <span>${formatCurrency(Math.max(0, payment.remaining_amount))}</span>
                    </div>
                    <div class="detail-row">
                        <label>الحالة:</label>
                        <span class="status-badge ${payment.status}">
                            ${payment.status === 'accepted' ? 'مقبول' : 
                              payment.status === 'pending' ? 'معلق' : 'مرفوض'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>تاريخ الدفع:</label>
                        <span>${new Date(payment.payment_date).toLocaleDateString('en-US')}</span>
                    </div>
                    <div class="detail-row">
                        <label>الإداري:</label>
                        <span>${payment.admin_name || 'غير محدد'}</span>
                    </div>
                    
                    <div class="modal-actions" style="margin-top: 20px; text-align: center;">
                        ${payment.status === 'pending' ? `
                            <button onclick="loansManagement.approvePayment(${paymentId}); hideModal();" class="btn btn-success">
                                <i class="fas fa-check"></i> موافقة
                            </button>
                            <button onclick="loansManagement.rejectPayment(${paymentId}); hideModal();" class="btn btn-danger">
                                <i class="fas fa-times"></i> رفض
                            </button>
                        ` : ''}
                        ${phoneNumber ? `
                            <button onclick="loansManagement.retryLoanWhatsAppNotification(${payment.user_id}, '${userName}', 'loan_payment', ${paymentId})" class="btn btn-primary">
                                <i class="fab fa-whatsapp"></i> إعادة إرسال واتساب
                            </button>
                        ` : ''}
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            showModal('تفاصيل دفعة القرض', modalContent);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Retry WhatsApp notification for loan payment (simple version)
    async retryLoanWhatsAppNotification(userId, userName, type, paymentId) {
        try {
            // Get payment details
            const result = await apiCall('/admin/all-loan-payments');
            const payment = result.loanPayments.find(p => p.loan_id === paymentId);
            
            if (!payment) {
                showToast('لا يمكن العثور على الدفعة', 'error');
                return;
            }

            // Get user details for phone number
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${userId}`);
                userDetails = userResult.user;
            } catch (error) {
                console.warn('Could not fetch user details:', error);
            }

            const phoneNumber = userDetails?.whatsapp || userDetails?.phone || payment.phone;
            
            if (!phoneNumber) {
                showToast('لا يمكن العثور على رقم الهاتف للمستخدم', 'error');
                return;
            }

            // Send WhatsApp notification based on payment status
            if (payment.status === 'accepted') {
                const paymentAmount = FormatHelper.formatCurrency(payment.payment_amount);
                const totalPaid = FormatHelper.formatCurrency(payment.total_paid_for_loan);
                const loanAmount = FormatHelper.formatCurrency(payment.loan_amount);
                const remainingAmount = FormatHelper.formatCurrency(Math.max(0, payment.remaining_amount));
                
                const success = Utils.sendWhatsAppNotification(
                    phoneNumber,
                    userName,
                    'loanPaymentApproved',
                    null,
                    paymentAmount,
                    totalPaid,
                    loanAmount,
                    remainingAmount
                );
                
                if (success) {
                    showToast(`تم إرسال إشعار موافقة دفعة القرض عبر الواتساب إلى ${userName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else if (payment.status === 'rejected') {
                const paymentAmount = FormatHelper.formatCurrency(payment.payment_amount);
                
                const success = Utils.sendWhatsAppNotification(
                    phoneNumber,
                    userName,
                    'loanPaymentRejected',
                    null,
                    paymentAmount
                );
                
                if (success) {
                    showToast(`تم إرسال إشعار رفض دفعة القرض عبر الواتساب إلى ${userName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else {
                showToast('لا يمكن إرسال إشعار لدفعة معلقة', 'warning');
            }
        } catch (error) {
            console.error('Error retrying WhatsApp notification:', error);
            showToast('حدث خطأ في إرسال الإشعار', 'error');
        }
    }

    // Retry WhatsApp notification for loan payment (enhanced version)
    async retryWhatsAppNotification(userId, userName, type, paymentId) {
        try {
            // Get payment details
            const result = await apiCall('/admin/all-loan-payments');
            const payment = result.loanPayments.find(p => p.loan_id === paymentId);
            
            if (!payment || !payment.phone) {
                showToast('لا يمكن العثور على رقم الهاتف للمستخدم', 'error');
                return;
            }

            // Get loan details for complete information
            let loan = null;
            try {
                const loansResult = await apiCall('/admin/all-loans');
                loan = loansResult.loans.find(l => l.loan_id === payment.target_loan_id);
            } catch (error) {
                console.warn('Could not fetch loan details:', error);
            }

            // Determine template type based on payment status
            let templateType;
            const paymentAmount = `${Utils.formatCurrency(payment.credit)} د.ك`;
            
            if (payment.status === 'accepted') {
                templateType = 'loanPaymentApproved';
                
                // Calculate loan progress
                const loanAmount = loan ? `${Utils.formatCurrency(loan.loan_amount)} د.ك` : 'غير محدد';
                const totalPaid = payment.total_paid_for_loan ? `${Utils.formatCurrency(payment.total_paid_for_loan)} د.ك` : paymentAmount;
                const remainingAmount = payment.remaining_amount ? `${Utils.formatCurrency(Math.max(0, payment.remaining_amount))} د.ك` : 'غير محدد';
                
                // Get user financials for additional context
                let userFinancials = null;
                try {
                    const userResult = await apiCall(`/admin/user-details/${userId}`);
                    userFinancials = {
                        totalSubscriptions: userResult.user?.financialSummary?.totalSubscriptions || '0.000'
                    };
                } catch (error) {
                    console.warn('Could not fetch user financials:', error);
                }
                
                const success = Utils.sendWhatsAppNotification(
                    payment.phone, 
                    userName, 
                    templateType, 
                    userFinancials,
                    paymentAmount, 
                    totalPaid, 
                    loanAmount, 
                    remainingAmount
                );
                
                if (success) {
                    showToast(`تم إرسال إشعار الموافقة على الدفعة عبر الواتساب إلى ${userName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else if (payment.status === 'rejected') {
                templateType = 'loanPaymentRejected';
                const success = Utils.sendWhatsAppNotification(payment.phone, userName, templateType, null, paymentAmount);
                if (success) {
                    showToast(`تم إرسال إشعار الرفض عبر الواتساب إلى ${userName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else {
                showToast('لا يمكن إرسال إشعار لدفعة معلقة', 'warning');
            }
        } catch (error) {
            console.error('Error retrying WhatsApp notification:', error);
            showToast('حدث خطأ في إرسال الإشعار', 'error');
        }
    }

    // Retry WhatsApp notification for loan approval/rejection
    async retryLoanWhatsAppNotification(userId, userName, loanId) {
        try {
            // Get loan details
            const result = await apiCall(`/admin/loan-details/${loanId}`);
            const loan = result.loan;
            
            if (!loan || !(loan.phone || loan.whatsapp)) {
                showToast('لا يمكن العثور على رقم الهاتف للمستخدم', 'error');
                return;
            }

            // Get user details for phone number and financials
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${userId}`);
                userDetails = userResult.user;
            } catch (error) {
                console.warn('Could not fetch user details:', error);
            }

            const phoneNumber = userDetails?.whatsapp || userDetails?.phone || loan.whatsapp || loan.phone;
            const fullUserName = userDetails?.Aname || loan.full_name || userName;

            // Determine template type based on loan status
            let templateType;
            const loanAmount = `${Utils.formatCurrency(loan.loan_amount)} د.ك`;
            
            if (loan.status === 'approved') {
                templateType = 'loanApproved';
                const installmentAmount = `${Utils.formatCurrency(loan.installment_amount)} د.ك`;
                const numberOfInstallments = loan.installment_amount > 0 ? Math.max(6, Math.ceil(loan.loan_amount / loan.installment_amount)) : 'غير محسوب';
                
                // Get user financials for additional context
                let userFinancials = null;
                if (userDetails) {
                    userFinancials = {
                        totalSubscriptions: userDetails.financialSummary?.totalSubscriptions || '0.000'
                    };
                }
                
                const success = Utils.sendWhatsAppNotification(
                    phoneNumber, 
                    fullUserName, 
                    templateType, 
                    userFinancials,
                    loanAmount, 
                    installmentAmount, 
                    numberOfInstallments
                );
                
                if (success) {
                    showToast(`تم إرسال إشعار الموافقة على القرض عبر الواتساب إلى ${fullUserName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else if (loan.status === 'rejected') {
                templateType = 'loanRejected';
                const success = Utils.sendWhatsAppNotification(phoneNumber, fullUserName, templateType, null, loanAmount);
                if (success) {
                    showToast(`تم إرسال إشعار الرفض عبر الواتساب إلى ${fullUserName}`, 'success');
                } else {
                    showToast('فشل في فتح الواتساب', 'error');
                }
            } else {
                showToast('لا يمكن إرسال إشعار لقرض معلق', 'warning');
            }
        } catch (error) {
            console.error('Error retrying loan WhatsApp notification:', error);
            showToast('حدث خطأ في إرسال الإشعار', 'error');
        }
    }

    // Payment Reminders Management
    async displayPaymentReminders(container) {
        if (!container) {
            container = document.getElementById('loans-tab-content');
        }

        try {
            // Fetch users needing reminders
            const data = await apiCall('/payment-reminders/users-needing-reminders');
            const users = data.data || [];

            // Fetch statistics
            const statsData = await apiCall('/payment-reminders/statistics');
            const stats = statsData.data || {};

            container.innerHTML = `
                <div class="payment-reminders-section">
                    <div class="section-header">
                        <h2><i class="fas fa-bell"></i> تذكيرات الدفع الشهري</h2>
                        <p>إدارة تذكيرات الدفع للمستخدمين الذين لديهم قروض نشطة ولم يدفعوا هذا الشهر</p>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${users.length}</div>
                                <div class="stat-label">مستخدمين يحتاجون تذكير</div>
                            </div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${stats.totalRemindersSent || 0}</div>
                                <div class="stat-label">إجمالي التذكيرات المرسلة</div>
                            </div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${stats.remindersThisMonth || 0}</div>
                                <div class="stat-label">تذكيرات هذا الشهر</div>
                            </div>
                        </div>
                    </div>

                    ${users.length > 0 ? `
                        <!-- Action Buttons -->
                        <div class="reminders-actions">
                            <button class="btn btn-primary" onclick="window.loansManagement.selectAllReminders()">
                                <i class="fas fa-check-double"></i> تحديد الكل
                            </button>
                            <button class="btn btn-secondary" onclick="window.loansManagement.deselectAllReminders()">
                                <i class="fas fa-times"></i> إلغاء التحديد
                            </button>
                            <button class="btn btn-success" onclick="window.loansManagement.sendSelectedReminders()" id="send-selected-btn" disabled>
                                <i class="fas fa-paper-plane"></i> إرسال للمحددين (<span id="selected-count">0</span>)
                            </button>
                            <button class="btn btn-warning" onclick="window.loansManagement.sendAllReminders()">
                                <i class="fas fa-bell"></i> إرسال للجميع (${users.length})
                            </button>
                        </div>

                        <!-- Users List -->
                        <div class="reminders-list" id="reminders-list">
                            ${users.map(user => this.renderReminderUserCard(user)).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-check-circle"></i>
                            <h3>رائع! لا توجد تذكيرات معلقة</h3>
                            <p>جميع المستخدمين قاموا بتسديد أقساطهم لهذا الشهر</p>
                        </div>
                    `}
                </div>
            `;

        } catch (error) {
            console.error('Error displaying payment reminders:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>حدث خطأ في تحميل البيانات</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="window.loansManagement.displayPaymentReminders()">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    renderReminderUserCard(user) {
        const lastPaymentDate = user.last_payment_date
            ? new Date(user.last_payment_date).toLocaleDateString('en-US')
            : 'لا توجد دفعات';

        return `
            <div class="reminder-card" data-user-id="${user.user_id}" data-loan-id="${user.loan_id}">
                <div class="reminder-checkbox">
                    <input type="checkbox" id="reminder-${user.user_id}-${user.loan_id}"
                           class="reminder-select" onchange="window.loansManagement.updateSelectedRemindersCount()">
                </div>
                <div class="reminder-info">
                    <div class="reminder-header">
                        <h4>${user.user_name}</h4>
                        <span class="badge badge-warning">متأخر عن الدفع</span>
                    </div>
                    <div class="reminder-details">
                        <div class="detail-row">
                            <span class="label">مبلغ القرض:</span>
                            <span class="value">${FormatHelper.formatCurrency(user.loan_amount)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">القسط الشهري:</span>
                            <span class="value">${FormatHelper.formatCurrency(user.installment_amount)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">المبلغ المسدد:</span>
                            <span class="value">${FormatHelper.formatCurrency(user.total_paid)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">المتبقي:</span>
                            <span class="value highlight">${FormatHelper.formatCurrency(user.remaining_amount)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">آخر دفعة:</span>
                            <span class="value">${lastPaymentDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">البريد الإلكتروني:</span>
                            <span class="value">${user.email || 'غير متوفر'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">واتساب:</span>
                            <span class="value">${user.whatsapp || user.phone || 'غير متوفر'}</span>
                        </div>
                    </div>
                </div>
                <div class="reminder-actions">
                    <button class="btn btn-sm btn-primary"
                            onclick="window.loansManagement.sendSingleReminder(${user.user_id}, ${user.loan_id})">
                        <i class="fas fa-paper-plane"></i> إرسال تذكير
                    </button>
                    ${user.whatsapp || user.phone ? `
                        <button class="btn btn-sm btn-success"
                                onclick="window.loansManagement.sendWhatsAppReminderOnly(${user.user_id}, ${user.loan_id})"
                                title="إرسال تذكير عبر واتساب فقط">
                            <i class="fab fa-whatsapp"></i> واتساب
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    selectAllReminders() {
        document.querySelectorAll('.reminder-select').forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectedRemindersCount();
    }

    deselectAllReminders() {
        document.querySelectorAll('.reminder-select').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectedRemindersCount();
    }

    updateSelectedRemindersCount() {
        const selectedCount = document.querySelectorAll('.reminder-select:checked').length;
        const countElement = document.getElementById('selected-count');
        const sendSelectedBtn = document.getElementById('send-selected-btn');

        if (countElement) {
            countElement.textContent = selectedCount;
        }

        if (sendSelectedBtn) {
            sendSelectedBtn.disabled = selectedCount === 0;
        }
    }

    async sendSingleReminder(userId, loanId) {
        try {
            await apiCall(`/payment-reminders/send/${userId}/${loanId}`, 'POST');
            showToast('تم إرسال التذكير بنجاح', 'success');

            // Remove the card from the list
            const card = document.querySelector(`[data-user-id="${userId}"][data-loan-id="${loanId}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            }

            // Refresh the display after a short delay
            setTimeout(() => this.loadTab('payment-reminders'), 500);
        } catch (error) {
            console.error('Error sending reminder:', error);
            showToast(error.message || 'حدث خطأ في إرسال التذكير', 'error');
        }
    }

    async sendSelectedReminders() {
        const selectedCheckboxes = document.querySelectorAll('.reminder-select:checked');

        if (selectedCheckboxes.length === 0) {
            showToast('الرجاء تحديد مستخدم واحد على الأقل', 'warning');
            return;
        }

        const confirmMessage = `هل أنت متأكد من إرسال التذكير لـ ${selectedCheckboxes.length} مستخدم؟`;
        if (!confirm(confirmMessage)) {
            return;
        }

        let successCount = 0;
        let failCount = 0;

        showToast('جاري إرسال التذكيرات...', 'info');

        for (const checkbox of selectedCheckboxes) {
            const card = checkbox.closest('.reminder-card');
            const userId = card.dataset.userId;
            const loanId = card.dataset.loanId;

            try {
                await apiCall(`/payment-reminders/send/${userId}/${loanId}`, 'POST');
                successCount++;
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            } catch (error) {
                console.error(`Error sending reminder to user ${userId}:`, error);
                failCount++;
            }
        }

        // Show results
        if (successCount > 0) {
            showToast(`تم إرسال ${successCount} تذكير بنجاح`, 'success');
        }
        if (failCount > 0) {
            showToast(`فشل إرسال ${failCount} تذكير`, 'error');
        }

        // Refresh the display
        setTimeout(() => this.loadTab('payment-reminders'), 1000);
    }

    async sendAllReminders() {
        const confirmMessage = 'هل أنت متأكد من إرسال التذكير لجميع المستخدمين؟';
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            showToast('جاري إرسال التذكيرات...', 'info');
            const data = await apiCall('/payment-reminders/send-all', 'POST');
            const results = data.data;
            showToast(`تم إرسال ${results.successCount} تذكير بنجاح من أصل ${results.totalUsers}`, 'success');

            // Refresh the display
            setTimeout(() => this.loadTab('payment-reminders'), 1000);
        } catch (error) {
            console.error('Error sending all reminders:', error);
            showToast(error.message || 'حدث خطأ في إرسال التذكيرات', 'error');
        }
    }

    async sendWhatsAppReminderOnly(userId, loanId) {
        try {
            // Get the WhatsApp link directly and open it
            const data = await apiCall(`/payment-reminders/whatsapp-link/${userId}/${loanId}`);

            if (data.success && data.whatsappLink) {
                // Open WhatsApp Web with pre-filled message
                window.open(data.whatsappLink, '_blank');
                showToast('تم فتح واتساب. يرجى إرسال الرسالة', 'info');

                // Ask if sent successfully
                setTimeout(() => {
                    if (confirm('هل تم إرسال رسالة واتساب بنجاح؟')) {
                        // Update tracking in backend
                        apiCall(`/payment-reminders/mark-sent/${userId}/${loanId}`, 'POST')
                            .then(() => {
                                showToast('تم تسجيل إرسال التذكير', 'success');

                                // Remove the card from the list
                                const card = document.querySelector(`[data-user-id="${userId}"][data-loan-id="${loanId}"]`);
                                if (card) {
                                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                                    card.style.opacity = '0';
                                    card.style.transform = 'scale(0.95)';
                                    setTimeout(() => card.remove(), 300);
                                }

                                // Refresh the display
                                setTimeout(() => this.loadTab('payment-reminders'), 500);
                            })
                            .catch(err => {
                                console.error('Error marking as sent:', err);
                            });
                    }
                }, 2000);
            } else {
                showToast('فشل في إنشاء رابط واتساب', 'error');
            }
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            showToast(error.message || 'حدث خطأ في فتح واتساب', 'error');
        }
    }

    // Remove loan row from table after approval/rejection
    removeLoanRow(loanId) {
        // Find all table rows in the current view
        const rows = document.querySelectorAll('#loans-tab-content tbody tr');

        rows.forEach(row => {
            // Check if this row contains the loan ID
            const idCell = row.querySelector('td:first-child strong');
            if (idCell && idCell.textContent.includes(`#${loanId}`)) {
                // Animate row removal
                row.style.transition = 'opacity 0.3s ease-out';
                row.style.opacity = '0';

                setTimeout(() => {
                    row.remove();

                    // Check if table is now empty and show empty state
                    const remainingRows = document.querySelectorAll('#loans-tab-content tbody tr');
                    if (remainingRows.length === 0) {
                        const contentDiv = document.getElementById('loans-tab-content');
                        contentDiv.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h4>لا توجد طلبات قروض معلقة</h4>
                                <p>جميع الطلبات تم معالجتها</p>
                            </div>`;
                    } else {
                        // Update the count in the table header
                        const tableHeader = document.querySelector('#loans-tab-content .table-header h4');
                        if (tableHeader) {
                            const currentText = tableHeader.textContent;
                            const newCount = remainingRows.length;
                            tableHeader.innerHTML = currentText.replace(/\(\d+\)/, `(${newCount})`);
                        }
                    }
                }, 300);
            }
        });
    }

    // Remove payment row from table after approval/rejection
    removePaymentRow(paymentId) {
        // Find all table rows in the current view
        const rows = document.querySelectorAll('#loans-tab-content tbody tr');

        rows.forEach(row => {
            // Check if this row contains the payment ID
            const idCell = row.querySelector('td:first-child strong');
            if (idCell && idCell.textContent.includes(`#${paymentId}`)) {
                // Animate row removal
                row.style.transition = 'opacity 0.3s ease-out';
                row.style.opacity = '0';

                setTimeout(() => {
                    row.remove();

                    // Check if table is now empty and show empty state
                    const remainingRows = document.querySelectorAll('#loans-tab-content tbody tr');
                    if (remainingRows.length === 0) {
                        const contentDiv = document.getElementById('loans-tab-content');
                        contentDiv.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h4>لا توجد أقساط معلقة</h4>
                                <p>جميع الأقساط تم معالجتها</p>
                            </div>`;
                    } else {
                        // Update the count in the table header
                        const tableHeader = document.querySelector('#loans-tab-content .table-header h4');
                        if (tableHeader) {
                            const currentText = tableHeader.textContent;
                            const newCount = remainingRows.length;
                            tableHeader.innerHTML = currentText.replace(/\(\d+\)/, `(${newCount})`);
                        }
                    }
                }, 300);
            }
        });
    }
}

// Global instance
window.loansManagement = null;