// Admin Transactions Management Tab
// Handles all transaction-related admin functionality

class TransactionsManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.currentTab = 'pending';
    }

    // Show transactions management section
    async show() {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #28a745;">
                        <i class="fas fa-exchange-alt"></i> إدارة المعاملات المالية
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="pending">
                        <i class="fas fa-clock"></i> معاملات معلقة
                    </button>
                    <button class="admin-tab" data-tab="all">
                        <i class="fas fa-history"></i> جميع المعاملات
                    </button>
                </div>
                
                <div class="tab-content">
                    <div id="transactions-tab-content" class="tab-panel active">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupTabListeners();
        await this.loadTab('pending');
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
        const contentDiv = document.getElementById('transactions-tab-content');
        contentDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
        
        try {
            if (tab === 'pending') {
                const result = await apiCall('/admin/pending-transactions');
                this.displayPendingTransactions(result.transactions, contentDiv);
            } else {
                const result = await apiCall('/admin/all-transactions');
                this.displayAllTransactions(result.transactions, contentDiv);
            }
        } catch (error) {
            contentDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }

    // Display pending transactions
    displayPendingTransactions(transactions, container) {
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>لا توجد معاملات معلقة</h4>
                    <p>جميع المعاملات تم معالجتها</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-clock"></i> المعاملات المالية المعلقة (${transactions.length})</h4>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم المعاملة</th>
                            <th>اسم المستخدم</th>
                            <th>نوع المعاملة</th>
                            <th>المبلغ</th>
                            <th>الوصف</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(transaction => `
                            <tr>
                                <td><strong>#${transaction.transaction_id || transaction.id}</strong></td>
                                <td>
                                    <div class="user-info">
                                        <span class="user-name">${transaction.full_name}</span>
                                        <small>المعرف: ${transaction.user_id}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="transaction-type subscription">
                                        <i class="fas fa-money-bill-wave"></i>
                                        ${this.getTransactionTypeLabel(transaction)}
                                    </span>
                                </td>
                                <td class="amount-cell">
                                    <span class="amount ${transaction.credit > 0 ? 'credit' : 'debit'}">
                                        ${transaction.credit > 0 ? '+' : '-'}${formatCurrency(Math.abs(transaction.credit || transaction.debit))}
                                    </span>
                                </td>
                                <td>
                                    <span class="memo">${transaction.memo || 'غير محدد'}</span>
                                </td>
                                <td>
                                    <span class="date">${new Date(transaction.date).toLocaleDateString('ar-KW')}</span>
                                    <small>${new Date(transaction.date).toLocaleTimeString('ar-KW')}</small>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-success" onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="موافقة">
                                        <i class="fas fa-check"></i> موافقة
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="رفض">
                                        <i class="fas fa-times"></i> رفض
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="transactionsManagement.viewTransactionDetails(${transaction.transaction_id || transaction.id}, 'transaction')" title="التفاصيل">
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

    // Display all transactions
    displayAllTransactions(transactions, container) {
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>لا توجد معاملات</h4>
                    <p>لم يتم تسجيل أي معاملات مالية</p>
                </div>`;
            return;
        }

        const html = `
            <div class="data-table">
                <div class="table-header">
                    <h4><i class="fas fa-history"></i> جميع المعاملات المالية (${transactions.length})</h4>
                    <div class="table-filters">
                        <select id="statusFilter" onchange="transactionsManagement.filterTransactions()">
                            <option value="">جميع الحالات</option>
                            <option value="pending">معلق</option>
                            <option value="accepted">مقبول</option>
                            <option value="rejected">مرفوض</option>
                        </select>
                        <select id="typeFilter" onchange="transactionsManagement.filterTransactions()">
                            <option value="">جميع الأنواع</option>
                            <option value="credit">إيداع</option>
                            <option value="debit">سحب</option>
                            <option value="loan">قسط قرض</option>
                        </select>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>رقم المعاملة</th>
                            <th>اسم المستخدم</th>
                            <th>نوع المعاملة</th>
                            <th>المبلغ</th>
                            <th>الوصف</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(transaction => `
                            <tr data-status="${transaction.status}" data-type="${transaction.credit > 0 ? 'credit' : transaction.debit > 0 ? 'debit' : 'loan'}">
                                <td><strong>#${transaction.transaction_id || transaction.id}</strong></td>
                                <td>
                                    <div class="user-info">
                                        <span class="user-name">${transaction.full_name}</span>
                                        <small>المعرف: ${transaction.user_id}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="transaction-type subscription">
                                        <i class="fas fa-money-bill-wave"></i>
                                        ${this.getTransactionTypeLabel(transaction)}
                                    </span>
                                </td>
                                <td class="amount-cell">
                                    <span class="amount ${transaction.credit > 0 ? 'credit' : 'debit'}">
                                        ${transaction.credit > 0 ? '+' : '-'}${formatCurrency(Math.abs(transaction.credit || transaction.debit))}
                                    </span>
                                </td>
                                <td>
                                    <span class="memo">${transaction.memo || 'غير محدد'}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${transaction.status}">
                                        ${transaction.status === 'pending' ? 'معلق' : 
                                          transaction.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                                    </span>
                                </td>
                                <td>
                                    <span class="date">${new Date(transaction.date).toLocaleDateString('ar-KW')}</span>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-info" onclick="transactionsManagement.viewTransactionDetails(${transaction.transaction_id || transaction.id}, 'transaction')" title="التفاصيل">
                                        <i class="fas fa-eye"></i> عرض
                                    </button>
                                    ${transaction.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="موافقة">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="رفض">
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

    // Get transaction type label - for loan management system
    getTransactionTypeLabel(transaction) {
        if (transaction.credit > 0) {
            return 'دفع اشتراك';  // Subscription payment
        } else {
            return 'سحب';  // Withdrawal
        }
    }

    // Filter transactions
    filterTransactions() {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        const rows = document.querySelectorAll('#transactions-tab-content tbody tr');
        
        rows.forEach(row => {
            const status = row.getAttribute('data-status');
            const type = row.getAttribute('data-type');
            
            let showRow = true;
            
            if (statusFilter && status !== statusFilter) {
                showRow = false;
            }
            
            if (typeFilter && type !== typeFilter) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    }

    // Approve transaction - handle both loans and subscriptions
    async approveTransaction(transactionId, type) {
        if (!confirm('هل أنت متأكد من الموافقة على هذه المعاملة؟')) return;
        
        try {
            // Get transaction details first for WhatsApp notification
            let transactionDetails = null;
            let userDetails = null;
            
            try {
                if (type === 'loan_payment') {
                    // Get loan payment details
                    const allPaymentsResult = await apiCall('/admin/all-loan-payments');
                    transactionDetails = allPaymentsResult.loanPayments?.find(p => p.loan_id == transactionId);
                } else {
                    // Get transaction details
                    const allTransactionsResult = await apiCall('/admin/all-transactions');
                    transactionDetails = allTransactionsResult.transactions?.find(t => t.transaction_id == transactionId);
                }
                
                if (transactionDetails && transactionDetails.user_id) {
                    const userResult = await apiCall(`/admin/user-details/${transactionDetails.user_id}`);
                    userDetails = userResult.user;
                }
            } catch (detailError) {
                console.warn('Could not fetch transaction details for WhatsApp notification:', detailError);
            }

            // Determine endpoint based on transaction type
            // If it's from loan table, use loan-payment-action, otherwise use transaction-action
            const endpoint = (type === 'loan_payment') 
                ? `/admin/loan-payment-action/${transactionId}` 
                : `/admin/transaction-action/${transactionId}`;
                
            const result = await apiCall(endpoint, 'POST', { 
                action: 'accept' 
            });
            showToast(result.message, 'success');
            
            // Send WhatsApp notification if details are available
            if (transactionDetails && userDetails && (userDetails.whatsapp || userDetails.phone)) {
                try {
                    const phoneNumber = userDetails.whatsapp || userDetails.phone;
                    const userName = userDetails.Aname || transactionDetails.user_name || 'العضو';
                    
                    // Get user financial data for enhanced notifications
                    let userFinancials = null;
                    try {
                        const userTransactionsResult = await apiCall(`/users/transactions/${transactionDetails.user_id}`);
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
                    
                    if (type === 'loan_payment') {
                        // Loan payment notification
                        // Get loan summary for progress tracking
                        const totalPaid = transactionDetails.total_paid_for_loan || transactionDetails.credit || 0;
                        const loanAmount = transactionDetails.loan_amount || 0;
                        const remainingAmount = Math.max(0, loanAmount - totalPaid);
                        
                        const whatsappSent = Utils.sendWhatsAppNotification(
                            phoneNumber,
                            userName,
                            'loanPaymentApproved',
                            userFinancials,
                            FormatHelper.formatCurrency(transactionDetails.credit),
                            FormatHelper.formatCurrency(totalPaid),
                            FormatHelper.formatCurrency(loanAmount),
                            FormatHelper.formatCurrency(remainingAmount)
                        );
                        
                        if (whatsappSent) {
                            showToast('تم فتح واتساب ويب لإرسال إشعار دفعة القرض للعضو', 'info');
                        }
                    } else {
                        // Regular transaction notification
                        const amount = (transactionDetails.credit || 0) - (transactionDetails.debit || 0);
                        
                        const whatsappSent = Utils.sendWhatsAppNotification(
                            phoneNumber,
                            userName,
                            'transactionApproved',
                            userFinancials,
                            FormatHelper.formatCurrency(Math.abs(amount)),
                            transactionDetails.transaction_type
                        );
                        
                        if (whatsappSent) {
                            showToast('تم فتح واتساب ويب لإرسال إشعار المعاملة للعضو', 'info');
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

    // Reject transaction - handle both loans and subscriptions
    async rejectTransaction(transactionId, type) {
        const reason = prompt('سبب الرفض (اختياري):');
        if (reason === null) return; // User canceled
        
        if (!confirm('هل أنت متأكد من رفض هذه المعاملة؟')) return;
        
        try {
            // Determine endpoint based on transaction type
            const endpoint = (type === 'loan_payment') 
                ? `/admin/loan-payment-action/${transactionId}` 
                : `/admin/transaction-action/${transactionId}`;
                
            const result = await apiCall(endpoint, 'POST', { 
                action: 'reject',
                reason: reason || ''
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

    // View transaction details
    async viewTransactionDetails(transactionId, type) {
        try {
            const endpoint = type === 'transaction' 
                ? `/admin/transaction-details/${transactionId}` 
                : `/admin/loan-payment-details/${transactionId}`;
                
            const result = await apiCall(endpoint);
            const transaction = result.transaction || result.payment;
            
            const modalContent = `
                <div class="transaction-details-modal">
                    <h3><i class="fas fa-receipt"></i> تفاصيل المعاملة #${transaction.transaction_id || transaction.id}</h3>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> معلومات المستخدم</h4>
                            <div class="detail-item">
                                <label>الاسم:</label>
                                <span>${transaction.user_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>معرف المستخدم:</label>
                                <span>${transaction.user_id}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-money-bill-wave"></i> تفاصيل المعاملة</h4>
                            <div class="detail-item">
                                <label>نوع المعاملة:</label>
                                <span>${this.getTransactionTypeLabel(transaction)}</span>
                            </div>
                            <div class="detail-item">
                                <label>المبلغ:</label>
                                <span class="amount ${transaction.credit > 0 ? 'credit' : 'debit'}">
                                    ${formatCurrency(Math.abs(transaction.credit || transaction.debit))}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>الوصف:</label>
                                <span>${transaction.memo || 'غير محدد'}</span>
                            </div>
                            <div class="detail-item">
                                <label>الحالة:</label>
                                <span class="status-badge ${transaction.status}">
                                    ${transaction.status === 'pending' ? 'معلق' : 
                                      transaction.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>تاريخ المعاملة:</label>
                                <span>${new Date(transaction.date).toLocaleString('ar-KW')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        ${transaction.status === 'pending' ? `
                            <button onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction'); hideModal();" class="btn btn-success">
                                <i class="fas fa-check"></i> موافقة
                            </button>
                            <button onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction'); hideModal();" class="btn btn-danger">
                                <i class="fas fa-times"></i> رفض
                            </button>
                        ` : ''}
                        <button onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            showModal('تفاصيل المعاملة', modalContent);
            
        } catch (error) {
            // Fallback for when detailed endpoint doesn't exist
            showToast('عرض تفاصيل المعاملة - سيتم تطويرها قريباً', 'info');
        }
    }
}

// Global instance
window.transactionsManagement = null;