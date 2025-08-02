// Admin Dashboard Module
// Handles all admin-specific functionality

class AdminDashboard {
    constructor() {
        this.contentArea = document.getElementById('admin-content-area');
        this.currentView = 'main';
    }

    // Initialize admin dashboard
    async init() {
        console.log('Initializing admin dashboard...');
        await this.loadStats();
        this.showMainView();
        this.setupEventListeners();
        this.initializeTabModules();
    }

    // Initialize tab modules
    initializeTabModules() {
        // Create instances of tab modules
        window.loansManagement = new LoansManagement(this);
        window.transactionsManagement = new TransactionsManagement(this);
        window.usersManagement = new UsersManagement(this);
        window.reportsManagement = new ReportsManagement(this);
        window.familyDelegationsManagement = new FamilyDelegationsManagement(this);
    }

    // Load admin statistics
    async loadStats() {
        try {
            console.log('Loading admin dashboard stats...');
            const result = await apiCall('/admin/dashboard-stats');
            console.log('Stats loaded successfully:', result);
            
            if (result.success && result.stats) {
                const stats = result.stats;
                
                // Update DOM elements with error checking
                const totalUsersEl = document.getElementById('totalUsers');
                const pendingLoansEl = document.getElementById('pendingLoans');
                const pendingSubscriptionsEl = document.getElementById('pendingSubscriptions');
                const pendingLoanPaymentsEl = document.getElementById('pendingLoanPayments');
                const pendingFamilyDelegationsEl = document.getElementById('pendingFamilyDelegations');
                
                if (totalUsersEl) {
                    totalUsersEl.textContent = stats.totalUsers || '0';
                    console.log('Updated total users:', stats.totalUsers);
                }
                
                if (pendingLoansEl) {
                    pendingLoansEl.textContent = stats.pendingLoans || '0';
                    console.log('Updated pending loans:', stats.pendingLoans);
                }
                
                if (pendingSubscriptionsEl) {
                    pendingSubscriptionsEl.textContent = stats.pendingSubscriptions || '0';
                    console.log('Updated pending subscriptions:', stats.pendingSubscriptions);
                }
                
                if (pendingLoanPaymentsEl) {
                    pendingLoanPaymentsEl.textContent = stats.pendingLoanPayments || '0';
                    console.log('Updated pending loan payments:', stats.pendingLoanPayments);
                }
                
                if (pendingFamilyDelegationsEl) {
                    pendingFamilyDelegationsEl.textContent = stats.pendingFamilyDelegations || '0';
                    console.log('Updated pending family delegations:', stats.pendingFamilyDelegations);
                }
            } else {
                console.error('Invalid response format:', result);
                showToast('تنسيق استجابة غير صحيح', 'error');
            }
            
        } catch (error) {
            console.error('Error loading admin stats:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            showToast('خطأ في تحميل الإحصائيات: ' + error.message, 'error');
            
            // Set default values on error
            const totalUsersEl = document.getElementById('totalUsers');
            const pendingLoansEl = document.getElementById('pendingLoans');
            const pendingSubscriptionsEl = document.getElementById('pendingSubscriptions');
            const pendingLoanPaymentsEl = document.getElementById('pendingLoanPayments');
            const pendingFamilyDelegationsEl = document.getElementById('pendingFamilyDelegations');
            
            if (totalUsersEl) totalUsersEl.textContent = 'خطأ';
            if (pendingLoansEl) pendingLoansEl.textContent = 'خطأ';
            if (pendingSubscriptionsEl) pendingSubscriptionsEl.textContent = 'خطأ';
            if (pendingLoanPaymentsEl) pendingLoanPaymentsEl.textContent = 'خطأ';
            if (pendingFamilyDelegationsEl) pendingFamilyDelegationsEl.textContent = 'خطأ';
        }
    }

    // Setup event listeners for admin buttons
    setupEventListeners() {
        // Add event listeners using data attributes
        const buttons = document.querySelectorAll('.action-btn.admin[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const action = button.getAttribute('data-action');
                
                switch(action) {
                    case 'loans':
                        await window.loansManagement.show();
                        break;
                    case 'transactions':
                        await window.transactionsManagement.show();
                        break;
                    case 'users':
                        await window.usersManagement.show();
                        break;
                    case 'family-delegations':
                        await window.familyDelegationsManagement.load();
                        break;
                    case 'reports':
                        await window.reportsManagement.show();
                        break;
                }
            });
        });
    }

    // Show main dashboard view
    showMainView() {
        this.currentView = 'main';
        this.contentArea.innerHTML = `
            <div class="admin-main-view">
                <div class="welcome-section">
                    <h3 style="text-align: center; color: #667eea; margin-bottom: 30px;">
                        <i class="fas fa-tachometer-alt"></i> لوحة تحكم المدير
                    </h3>
                    <p style="text-align: center; color: #555; font-size: 16px;">
                        اختر قسماً من الأقسام أعلاه لإدارة القروض، المعاملات، الأعضاء، أو عرض التقارير
                    </p>
                </div>
                
                <div class="quick-actions" style="margin-top: 30px;">
                    <h4 style="color: #333; margin-bottom: 15px;">
                        <i class="fas fa-bolt"></i> إجراءات سريعة
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                        <button class="quick-action-btn" onclick="loansManagement.show()">
                            <i class="fas fa-clock"></i> الطلبات المعلقة (${document.getElementById('pendingLoans').textContent})
                        </button>
                        <button class="quick-action-btn" onclick="transactionsManagement.show()">
                            <i class="fas fa-coins"></i> اشتراكات معلقة (${document.getElementById('pendingSubscriptions')?.textContent || '0'})
                        </button>
                        <button class="quick-action-btn" onclick="loansManagement.show('payments')">
                            <i class="fas fa-credit-card"></i> أقساط قروض معلقة (${document.getElementById('pendingLoanPayments')?.textContent || '0'})
                        </button>
                        <button class="quick-action-btn" onclick="usersManagement.show()">
                            <i class="fas fa-users"></i> إدارة الأعضاء
                        </button>
                        <button class="quick-action-btn" onclick="reportsManagement.show()">
                            <i class="fas fa-chart-bar"></i> التقارير
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // All tab management is now handled by separate files

    // All functionality moved to separate tab files
}

// Make AdminDashboard globally available
window.AdminDashboard = AdminDashboard;

// Global instance
window.adminDashboard = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!window.adminDashboard) {
        window.adminDashboard = new AdminDashboard();
    }
    
    // Initialize system reports functionality
    initializeSystemReports();
});

// System Reports & Backup functionality
function initializeSystemReports() {
    const sqlBackupBtn = document.getElementById('sqlBackupBtn');
    const financialReportBtn = document.getElementById('financialReportBtn');
    const excelBackupBtn = document.getElementById('excelBackupBtn');
    const excelToPdfBtn = document.getElementById('excelToPdfBtn');
    
    if (sqlBackupBtn) {
        sqlBackupBtn.addEventListener('click', handleSQLBackupDownload);
    }
    
    if (financialReportBtn) {
        financialReportBtn.addEventListener('click', handleFinancialReportDownload);
    }
    
    if (excelBackupBtn) {
        excelBackupBtn.addEventListener('click', handleExcelBackupDownload);
    }
    
    if (excelToPdfBtn) {
        excelToPdfBtn.addEventListener('click', handleExcelToPDFDownload);
    }
}

// Handle SQL Backup Download
async function handleSQLBackupDownload() {
    const btn = document.getElementById('sqlBackupBtn');
    const originalContent = btn.innerHTML;
    
    try {
        // Show loading state
        btn.classList.add('loading');
        btn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <div class="btn-content">
                <span class="btn-title">جاري إنشاء النسخة الاحتياطية...</span>
                <small class="btn-desc">يرجى الانتظار، قد يستغرق بعض الوقت</small>
            </div>
        `;
        btn.disabled = true;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/download-sql-backup', {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في تحميل النسخة الاحتياطية');
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Utils.showToast('تم تحميل النسخة الاحتياطية بنجاح', 'success');
        
    } catch (error) {
        console.error('SQL Backup error:', error);
        Utils.showToast('خطأ في تحميل النسخة الاحتياطية: ' + error.message, 'error');
    } finally {
        // Restore button state
        btn.classList.remove('loading');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// Handle Financial Report Download  
async function handleFinancialReportDownload() {
    const btn = document.getElementById('financialReportBtn');
    const originalContent = btn.innerHTML;
    
    try {
        // Show loading state
        btn.classList.add('loading');
        btn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <div class="btn-content">
                <span class="btn-title">جاري إنشاء التقرير المالي...</span>
                <small class="btn-desc">جمع البيانات وإنشاء ملف التقرير</small>
            </div>
        `;
        btn.disabled = true;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/download-transactions-report', {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'فشل في إنشاء التقرير المالي' }));
            throw new Error(error.message || 'فشل في إنشاء التقرير المالي');
        }
        
        // Download the report file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_report_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Utils.showToast('تم تحميل التقرير المالي بنجاح', 'success');
        
    } catch (error) {
        console.error('Financial Report error:', error);
        Utils.showToast('خطأ في إنشاء التقرير المالي: ' + error.message, 'error');
    } finally {
        // Restore button state
        btn.classList.remove('loading');
        btn.innerHTML = originalContent;
        btn.disabled = false;  
    }
}

// Handle Excel Backup Download
async function handleExcelBackupDownload() {
    const btn = document.getElementById('excelBackupBtn');
    const originalContent = btn.innerHTML;
    
    try {
        // Show loading state
        btn.classList.add('loading');
        btn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <div class="btn-content">
                <span class="btn-title">Creating Excel Backup...</span>
                <small class="btn-desc">Generating Excel file with Arabic support</small>
            </div>
        `;
        btn.disabled = true;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/download-excel-backup', {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to create Excel backup' }));
            throw new Error(error.message || 'Failed to create Excel backup');
        }
        
        // Download the Excel file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Utils.showToast('Excel backup downloaded successfully', 'success');
        
    } catch (error) {
        console.error('Excel backup error:', error);
        Utils.showToast('Error creating Excel backup: ' + error.message, 'error');
    } finally {
        // Restore button state
        btn.classList.remove('loading');
        btn.innerHTML = originalContent;
        btn.disabled = false;  
    }
}

// Handle Excel to PDF Download
async function handleExcelToPDFDownload() {
    const btn = document.getElementById('excelToPdfBtn');
    const originalContent = btn.innerHTML;
    
    try {
        // Show loading state
        btn.classList.add('loading');
        btn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <div class="btn-content">
                <span class="btn-title">Converting to PDF...</span>
                <small class="btn-desc">Creating Excel and converting to PDF with Arabic text</small>
            </div>
        `;
        btn.disabled = true;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/download-excel-as-pdf', {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to convert Excel to PDF' }));
            throw new Error(error.message || 'Failed to convert Excel to PDF');
        }
        
        // Download the PDF file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_backup_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Utils.showToast('Excel to PDF backup downloaded successfully', 'success');
        
    } catch (error) {
        console.error('Excel to PDF error:', error);
        Utils.showToast('Error converting Excel to PDF: ' + error.message, 'error');
    } finally {
        // Restore button state
        btn.classList.remove('loading');
        btn.innerHTML = originalContent;
        btn.disabled = false;  
    }
}

