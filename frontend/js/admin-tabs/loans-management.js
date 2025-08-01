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
                    <button class="admin-tab ${defaultTab === 'all-payments' ? 'active' : ''}" data-tab="all-payments">
                        <i class="fas fa-history"></i> سجل المدفوعات
                    </button>
                    <button class="admin-tab ${defaultTab === 'all' ? 'active' : ''}" data-tab="all">
                        <i class="fas fa-list"></i> جميع الطلبات
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
            } else if (tab === 'all-payments') {
                const result = await apiCall('/admin/all-loan-payments');
                this.displayAllLoanPayments(result.loanPayments || [], contentDiv);
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
                            <th>الرصيد الحالي</th>
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
                                <td class="balance-cell">
                                    <span class="balance">${formatCurrency(loan.current_balance)}</span>
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
                    <div class="table-filters">
                        <select id="statusFilter" onchange="loansManagement.filterLoans()">
                            <option value="">جميع الحالات</option>
                            <option value="pending">معلق</option>
                            <option value="approved">موافق عليه</option>
                            <option value="rejected">مرفوض</option>
                        </select>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم الطلب</th>
                            <th>اسم المقترض</th>
                            <th>مبلغ القرض</th>
                            <th>القسط الشهري</th>
                            <th>الحالة</th>
                            <th>تاريخ الطلب</th>
                            <th>معالج بواسطة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loans.map(loan => `
                            <tr data-status="${loan.status}">
                                <td><strong>#${loan.loan_id}</strong></td>
                                <td>
                                    <div class="user-info">
                                        <span class="user-name">${loan.full_name}</span>
                                        <small>المعرف: ${loan.user_id}</small>
                                    </div>
                                </td>
                                <td class="amount-cell">
                                    <span class="amount">${formatCurrency(loan.loan_amount)}</span>
                                </td>
                                <td class="installment-cell">
                                    <span class="installment">${formatCurrency(loan.installment_amount)}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${loan.status}">
                                        ${loan.status === 'pending' ? 'معلق' : 
                                          loan.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                                    </span>
                                </td>
                                <td>
                                    <span class="date">${new Date(loan.request_date).toLocaleDateString('en-US')}</span>
                                </td>
                                <td>
                                    <span class="admin-name">${loan.admin_name || 'غير محدد'}</span>
                                </td>
                                <td class="actions-cell">
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
                                    <button class="btn btn-sm btn-info" onclick="loansManagement.viewPaymentDetails('${paymentId}')" title="التفاصيل">
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
    async approveLoan(loanId) {
        if (!confirm('هل أنت متأكد من الموافقة على هذا القرض؟')) return;
        
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
                action: 'approve' 
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
            
            // Refresh current tab
            await this.loadTab(this.currentTab);
            
            // Refresh admin stats
            await this.adminDashboard.loadStats();
            
        } catch (error) {
            showToast(error.message, 'error');
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
            
            // Refresh current tab
            await this.loadTab(this.currentTab);
            
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
            
            // Refresh current tab
            await this.loadTab(this.currentTab);
            
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
            
            // Refresh current tab
            await this.loadTab(this.currentTab);
            
            // Refresh admin stats
            await this.adminDashboard.loadStats();
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // View payment details
    async viewPaymentDetails(paymentId) {
        showToast('عرض تفاصيل الدفعة - سيتم تطويرها قريباً', 'info');
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
}

// Global instance
window.loansManagement = null;