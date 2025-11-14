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
                const transactions = result.transactions || [];
                // Calculate running balances for pending transactions
                await this.calculateRunningBalances(transactions);
                this.displayPendingTransactions(transactions, contentDiv);
            } else {
                const result = await apiCall('/admin/all-transactions');
                const transactions = result.transactions || [];
                // Calculate running balances for all transactions
                await this.calculateRunningBalances(transactions);
                this.displayAllTransactions(transactions, contentDiv);
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
                            <th>الرصيد المحدث</th>
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
                                        ${transaction.credit > 0 ? '+' : '-'}${formatCurrency(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0)))}
                                    </span>
                                </td>
                                <td class="balance-cell">
                                    <span class="balance">
                                        ${formatCurrency(transaction.running_balance || '0.000')}
                                    </span>
                                </td>
                                <td>
                                    <span class="memo">${transaction.memo || 'غير محدد'}</span>
                                </td>
                                <td>
                                    <span class="date">${new Date(transaction.date).toLocaleDateString('en-US')}</span>
                                    <small>${new Date(transaction.date).toLocaleTimeString('ar-KW')}</small>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-success" onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="موافقة">
                                        <i class="fas fa-check"></i> موافقة
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="رفض">
                                        <i class="fas fa-times"></i> رفض
                                    </button>
                                    <button class="btn btn-sm btn-info" 
                                            onclick="transactionsManagement.viewTransactionDetails(${transaction.transaction_id || transaction.id}, 'transaction')"
                                            title="عرض التفاصيل">
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
                            <th>الرصيد المحدث</th>
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
                                        ${transaction.credit > 0 ? '+' : '-'}${formatCurrency(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0)))}
                                    </span>
                                </td>
                                <td class="balance-cell">
                                    <span class="balance">
                                        ${formatCurrency(transaction.running_balance || '0.000')}
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
                                    <span class="date">${new Date(transaction.date).toLocaleDateString('en-US')}</span>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-info" 
                                            onclick="transactionsManagement.viewTransactionDetails(${transaction.transaction_id || transaction.id}, 'transaction')"
                                            title="عرض التفاصيل">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="transactionsManagement.editTransaction(${transaction.transaction_id || transaction.id})" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="transactionsManagement.deleteTransaction(${transaction.transaction_id || transaction.id})" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ${transaction.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="موافقة">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" title="رفض">
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

            // WhatsApp notifications are now handled automatically by the backend
            // and queued for batch sending through the WhatsApp queue management system

            // Remove the approved row from the table instead of reloading entire tab
            this.removeTransactionRow(transactionId);

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

            // Remove the rejected row from the table instead of reloading entire tab
            this.removeTransactionRow(transactionId);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Remove transaction row from table after approval/rejection
    removeTransactionRow(transactionId) {
        // Find all table rows in the current view
        const rows = document.querySelectorAll('#transactions-tab-content tbody tr');

        rows.forEach(row => {
            // Check if this row contains the transaction ID
            const idCell = row.querySelector('td:first-child strong');
            if (idCell && idCell.textContent.includes(`#${transactionId}`)) {
                // Animate row removal
                row.style.transition = 'opacity 0.3s ease-out';
                row.style.opacity = '0';

                setTimeout(() => {
                    row.remove();

                    // Check if table is now empty and show empty state
                    const remainingRows = document.querySelectorAll('#transactions-tab-content tbody tr');
                    if (remainingRows.length === 0) {
                        const contentDiv = document.getElementById('transactions-tab-content');
                        contentDiv.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h4>لا توجد معاملات معلقة</h4>
                                <p>جميع المعاملات تم معالجتها</p>
                            </div>`;
                    } else {
                        // Update the count in the table header
                        const tableHeader = document.querySelector('#transactions-tab-content .table-header h4');
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

    // View transaction details - used for modal/popup display (Ctrl+Click behavior)  
    async viewTransactionDetails(transactionId, type) {
        try {
            // Get transaction details from all transactions
            const result = await apiCall('/admin/all-transactions');
            const transaction = result.transactions.find(t => (t.transaction_id || t.id) === transactionId);
            
            if (!transaction) {
                showToast('لا يمكن العثور على تفاصيل المعاملة', 'error');
                return;
            }

            // Get user details to ensure we have phone number
            let userDetails = null;
            try {
                const userResult = await apiCall(`/admin/user-details/${transaction.user_id}`);
                userDetails = userResult.user;
            } catch (error) {
                console.warn('Could not fetch user details:', error);
            }

            // Use phone from user details or fallback to transaction data
            const phoneNumber = userDetails?.whatsapp || userDetails?.phone || transaction.phone;
            
            // Use name from user details or fallback to transaction data
            const userName = userDetails?.Aname || transaction.user_name || 'غير محدد';
            
            const modalContent = `
                <div class="transaction-details-modal">
                    <h3><i class="fas fa-receipt"></i> تفاصيل المعاملة #${transaction.transaction_id || transaction.id}</h3>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> معلومات المستخدم</h4>
                            <div class="detail-item">
                                <label>الاسم:</label>
                                <span>${userName}</span>
                            </div>
                            <div class="detail-item">
                                <label>معرف المستخدم:</label>
                                <span>${transaction.user_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>رقم الهاتف:</label>
                                <span>${phoneNumber || 'غير محدد'}</span>
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
                                    ${formatCurrency(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0)))}
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
                        ${transaction.status === 'accepted' && phoneNumber ? `
                            <button onclick="transactionsManagement.openWhatsAppWithMessage(${transaction.transaction_id || transaction.id}, 'transaction', '${phoneNumber}')" class="btn btn-info">
                                <i class="fab fa-whatsapp"></i> فتح واتساب
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

    // Open transaction details in new tab
    openTransactionDetailsInNewTab(transactionId) {
        if (window.adminRouter) {
            window.adminRouter.openInNewTab('admin/transactions/details', { id: transactionId });
        } else {
            console.warn('Admin router not available');
        }
    }

    // Edit transaction
    async editTransaction(transactionId) {
        try {
            // Get transaction details first
            const result = await apiCall(`/admin/all-transactions`);
            const transaction = result.transactions.find(t => (t.transaction_id || t.id) === transactionId);
            
            if (!transaction) {
                showToast('المعاملة غير موجودة', 'error');
                return;
            }

            let modalContent = `
                <form id="editTransactionForm">
                    <div class="form-group">
                        <label>المبلغ</label>
                        <input type="number" name="amount" step="0.001" 
                               value="${Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0))}" 
                               required min="0.001">
                    </div>
                    <div class="form-group">
                        <label>نوع المعاملة</label>
                        <select name="type" required>
                            <option value="credit" ${transaction.credit > 0 ? 'selected' : ''}>إيداع</option>
                            <option value="debit" ${transaction.debit > 0 ? 'selected' : ''}>سحب</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>الوصف</label>
                        <textarea name="memo" rows="3">${transaction.memo || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>الحالة</label>
                        <select name="status" required>
                            <option value="pending" ${transaction.status === 'pending' ? 'selected' : ''}>معلق</option>
                            <option value="accepted" ${transaction.status === 'accepted' ? 'selected' : ''}>مقبول</option>
                            <option value="rejected" ${transaction.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>نوع المعاملة</label>
                        <select name="transactionType">
                            <option value="subscription" ${transaction.transaction_type === 'subscription' ? 'selected' : ''}>اشتراك</option>
                            <option value="deposit" ${transaction.transaction_type === 'deposit' ? 'selected' : ''}>إيداع</option>
                            <option value="withdrawal" ${transaction.transaction_type === 'withdrawal' ? 'selected' : ''}>سحب</option>
                        </select>
                    </div>
                </form>
            `;

            modalContent += `
                <div class="modal-actions">
                    <button onclick="transactionsManagement.saveTransactionEdit(${transactionId})" class="btn btn-success">
                        <i class="fas fa-save"></i> تحديث
                    </button>
                    <button onclick="hideModal()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            `;
            
            showModal('تعديل المعاملة', modalContent);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Save transaction edit
    async saveTransactionEdit(transactionId) {
        try {
            const form = document.getElementById('editTransactionForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            await apiCall(`/admin/update-transaction/${transactionId}`, 'PUT', data);
            showToast('تم تحديث المعاملة بنجاح', 'success');
            hideModal();

            // Update the transaction row instead of reloading entire tab
            this.updateTransactionRow(transactionId, data);

            // Refresh admin stats
            await this.adminDashboard.loadStats();

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Helper: Update transaction row after edit
    updateTransactionRow(transactionId, updatedData) {
        // Find all table rows in the current view
        const rows = document.querySelectorAll('#transactions-tab-content tbody tr');

        rows.forEach(row => {
            // Check if this row contains the transaction ID
            const idCell = row.querySelector('td:first-child strong');
            if (idCell && idCell.textContent.includes(`#${transactionId}`)) {
                // Update the amount if changed
                const amountCell = row.querySelector('.amount-cell .amount');
                if (amountCell && updatedData.amount) {
                    const amount = parseFloat(updatedData.amount);
                    const sign = updatedData.type === 'credit' ? '+' : '-';
                    amountCell.className = `amount ${updatedData.type}`;
                    amountCell.textContent = `${sign}${formatCurrency(amount)}`;
                }

                // Update the memo if changed
                const memoCell = row.querySelector('.memo');
                if (memoCell && updatedData.memo) {
                    memoCell.textContent = updatedData.memo;
                }

                // Update status badge if changed
                if (updatedData.status) {
                    const statusBadge = row.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.className = `status-badge ${updatedData.status}`;
                        statusBadge.textContent = updatedData.status === 'pending' ? 'معلق' :
                                                  updatedData.status === 'accepted' ? 'مقبول' : 'مرفوض';
                    }
                }

                // Highlight the updated row briefly
                row.style.transition = 'background-color 0.5s';
                row.style.backgroundColor = '#dbeafe';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 1000);
            }
        });
    }

    // Delete transaction
    async deleteTransaction(transactionId) {
        if (!confirm('هل أنت متأكد من حذف هذه المعاملة؟ هذا الإجراء لا يمكن التراجع عنه وسيتم تعديل رصيد المستخدم تلقائياً.')) {
            return;
        }

        try {
            showLoading(true);
            await apiCall(`/admin/delete-transaction/${transactionId}`, 'DELETE');
            showToast('تم حذف المعاملة بنجاح', 'success');
            await this.loadTab(this.currentTab); // Refresh data
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Open WhatsApp Web with transaction notification message
    async openWhatsAppWithMessage(transactionId, type, phoneNumber) {
        try {
            showLoading(true);
            
            // Get transaction details for the message
            const result = await apiCall('/admin/all-transactions');
            const transaction = result.transactions.find(t => (t.transaction_id || t.id) === transactionId);
            
            if (!transaction) {
                showToast('لا يمكن العثور على تفاصيل المعاملة', 'error');
                return;
            }
            
            // Get user details
            const userResult = await apiCall(`/admin/user-details/${transaction.user_id}`);
            const userDetails = userResult.user;
            
            // Get brand configuration for correct branding
            const brandResult = await apiCall('/admin/whatsapp/config');
            const brandName = brandResult.success ? brandResult.data.brandName : 'نظام إدارة القروض';
            
            // Format phone number (remove + and ensure it starts with country code)
            let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
            if (formattedPhone.startsWith('00')) {
                formattedPhone = formattedPhone.substring(2);
            } else if (!formattedPhone.startsWith('965') && formattedPhone.length === 8) {
                formattedPhone = '965' + formattedPhone; // Add Kuwait country code
            }
            
            // Create the message based on transaction details
            const amount = Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0));
            const transactionType = transaction.credit > 0 ? 'إيداع اشتراك' : 'سحب';
            const statusText = transaction.status === 'accepted' ? 'تمت الموافقة عليها' : 
                              transaction.status === 'rejected' ? 'تم رفضها' : 'معلقة';
            const adminName = currentUser?.Aname || 'الإدارة';
            const transactionDate = new Date(transaction.date).toLocaleDateString('ar-KW');
            
            const message = `🔔 *إشعار من ${brandName}*

السلام عليكم ${userDetails?.Aname || 'عزيزي العضو'}

📋 *تحديث حالة المعاملة:*
• رقم المعاملة: #${transaction.transaction_id || transaction.id}
• نوع المعاملة: ${transactionType}
• المبلغ: ${formatCurrency(amount)} دينار كويتي
• الحالة: ${statusText} ✅
• التاريخ: ${transactionDate}
${transaction.memo ? `• الوصف: ${transaction.memo}` : ''}`;

            // Create WhatsApp Web URL
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp Web in a new tab
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            
            showToast('تم فتح واتساب ويب مع الرسالة', 'success');
            hideModal();
            
        } catch (error) {
            console.error('WhatsApp open error:', error);
            showToast('خطأ في فتح واتساب: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Calculate running balance for each transaction (admin version)
    async calculateRunningBalances(transactions) {
        if (!transactions || transactions.length === 0) return;

        // Group transactions by user ID
        const transactionsByUser = {};
        transactions.forEach(transaction => {
            const userId = transaction.user_id;
            if (!transactionsByUser[userId]) {
                transactionsByUser[userId] = [];
            }
            transactionsByUser[userId].push(transaction);
        });

        // Calculate running balance for each user's transactions
        for (const userId in transactionsByUser) {
            const userTransactions = transactionsByUser[userId];
            
            // Get user's current balance
            try {
                const userResult = await apiCall(`/admin/user-details/${userId}`);
                const currentBalance = parseFloat(userResult.user?.balance) || 0;

                // Sort transactions by date (oldest first)
                const sortedTransactions = [...userTransactions].sort((a, b) => {
                    const dateA = new Date(a.date || a.transaction_date);
                    const dateB = new Date(b.date || b.transaction_date);
                    return dateA - dateB;
                });

                // Calculate total changes from accepted transactions
                let totalChanges = 0;
                sortedTransactions.forEach(transaction => {
                    if (transaction.status === 'accepted') {
                        if (transaction.credit > 0) {
                            totalChanges += parseFloat(transaction.credit);
                        } else {
                            totalChanges -= parseFloat(transaction.debit);
                        }
                    }
                });

                // Calculate starting balance
                let runningBalance = currentBalance - totalChanges;

                // Calculate forward and assign running balances
                sortedTransactions.forEach(transaction => {
                    if (transaction.status === 'accepted') {
                        if (transaction.credit > 0) {
                            runningBalance += parseFloat(transaction.credit);
                        } else {
                            runningBalance -= parseFloat(transaction.debit);
                        }
                        transaction.running_balance = runningBalance;
                    } else {
                        // For pending/rejected transactions, balance doesn't change
                        transaction.running_balance = runningBalance;
                    }
                });

            } catch (error) {
                console.warn(`Could not fetch balance for user ${userId}:`, error);
                // Set default balance for this user's transactions
                userTransactions.forEach(transaction => {
                    transaction.running_balance = 0;
                });
            }
        }
    }
}

// Global instance
window.transactionsManagement = null;