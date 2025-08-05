// Admin Dashboard Module
// Handles all admin-specific functionality

class AdminDashboard {
    constructor() {
        this.contentArea = document.getElementById('admin-content-area');
        this.currentView = 'main';
    }

    // Initialize admin dashboard
    async init() {
        console.log('🚀 Initializing admin dashboard...');
        await this.loadStats();
        console.log('✅ Stats loaded, now loading financial summary...');
        await this.loadFinancialSummary();
        console.log('✅ Financial summary loaded, setting up views...');
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

    // Load financial summary data
    async loadFinancialSummary() {
        try {
            console.log('🔄 Loading financial summary...');
            const result = await apiCall('/admin/financial-summary');
            console.log('📊 Financial summary result:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Update financial summary elements
                const totalSubscriptionsEl = document.getElementById('totalSubscriptions');
                const totalActiveLoansRemainingEl = document.getElementById('totalActiveLoansRemaining');
                const totalPendingLoansEl = document.getElementById('totalPendingLoans');
                const totalFeesPaidEl = document.getElementById('totalFeesPaid');
                const calculatedBalanceEl = document.getElementById('calculatedBalance');
                
                if (totalSubscriptionsEl) {
                    totalSubscriptionsEl.textContent = this.formatCurrency(data.totalSubscriptions || 0);
                }
                
                if (totalActiveLoansRemainingEl) {
                    totalActiveLoansRemainingEl.textContent = this.formatCurrency(data.totalActiveLoansRemaining || 0);
                }
                
                if (totalPendingLoansEl) {
                    totalPendingLoansEl.textContent = this.formatCurrency(data.totalPendingLoans || 0);
                }
                
                if (totalFeesPaidEl) {
                    totalFeesPaidEl.textContent = this.formatCurrency(data.totalFeesPaid || 0);
                }
                
                // Calculate and display the calculated balance
                const calculatedBalance = (data.totalSubscriptions || 0) - (data.totalActiveLoansRemaining || 0);
                if (calculatedBalanceEl) {
                    calculatedBalanceEl.textContent = this.formatCurrency(calculatedBalance);
                }
                
                // Store data globally for difference calculation
                window.financialSummaryData = data;
                window.financialSummaryData.calculatedBalance = calculatedBalance;
                
                console.log('Financial summary loaded:', data);
            } else {
                console.error('Financial summary API failed:', result);
                showToast('فشل في تحميل الملخص المالي: ' + (result.message || 'خطأ غير معروف'), 'error');
            }
        } catch (error) {
            console.error('Error loading financial summary:', error);
            showToast('خطأ في تحميل الملخص المالي: ' + error.message, 'error');
        }
    }

    // Format currency helper
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(amount);
    }

    // Setup event listeners for admin buttons (simplified)
    setupEventListeners() {
        // Legacy admin action buttons (currently hidden but kept for compatibility)
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
                        انقر على البطاقات أعلاه للوصول إلى أقسام الإدارة المختلفة
                    </p>
                </div>
                
            </div>
        `;
    }

    // Smooth scroll to content area when management section loads
    scrollToContentArea() {
        const contentArea = document.getElementById('admin-content-area');
        if (contentArea) {
            contentArea.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }
    }

    // Enhanced management navigation with smooth scrolling
    async navigateToSection(sectionFunction, ...args) {
        // Call the management function
        await sectionFunction(...args);
        
        // Smooth scroll to the content area after a brief delay
        setTimeout(() => {
            this.scrollToContentArea();
        }, 100);
    }

    // All tab management is now handled by separate files
}

// Make AdminDashboard globally available
window.AdminDashboard = AdminDashboard;

// Global instance
window.adminDashboard = null;

// Global function for calculating bank difference
function calculateDifference() {
    const actualBankInput = document.getElementById('actualBankAmount');
    const differenceRow = document.getElementById('differenceRow');
    const differenceStatusRow = document.getElementById('differenceStatusRow');
    const differenceAmountEl = document.getElementById('differenceAmount');
    const differenceStatusEl = document.getElementById('differenceStatus');
    const differenceLabelEl = document.getElementById('differenceLabel');
    
    if (!actualBankInput || !window.financialSummaryData) {
        showToast('لا توجد بيانات مالية متاحة', 'error');
        return;
    }
    
    const actualBankAmount = parseFloat(actualBankInput.value) || 0;
    const calculatedBalance = window.financialSummaryData.calculatedBalance || 0;
    
    if (actualBankAmount === 0) {
        showToast('يرجى إدخال الرصيد الفعلي للبنك', 'warning');
        return;
    }
    
    // Calculate difference
    const difference = actualBankAmount - calculatedBalance;
    
    // Remove existing difference classes
    differenceRow.classList.remove('positive', 'negative', 'zero');
    
    // Format and display difference
    const formattedDifference = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    }).format(Math.abs(difference));
    
    if (difference === 0) {
        // Perfect match
        differenceRow.classList.add('zero');
        differenceLabelEl.innerHTML = '<i class="fas fa-check-circle"></i> متطابق تماماً';
        differenceAmountEl.textContent = '0.000';
        differenceAmountEl.style.color = '#22c55e';
        differenceStatusEl.innerHTML = '<i class="fas fa-thumbs-up"></i> الأرصدة متطابقة بشكل مثالي';
        differenceStatusEl.style.color = '#22c55e';
    } else if (difference > 0) {
        // Bank has more money
        differenceRow.classList.add('positive');
        differenceLabelEl.innerHTML = '<i class="fas fa-arrow-up"></i> زيادة في البنك';
        differenceAmountEl.textContent = '+' + formattedDifference;
        differenceAmountEl.style.color = '#10b981';
        differenceStatusEl.innerHTML = '<i class="fas fa-plus-circle"></i> البنك لديه أموال إضافية';
        differenceStatusEl.style.color = '#10b981';
    } else {
        // Bank has less money (deficit)
        differenceRow.classList.add('negative');
        differenceLabelEl.innerHTML = '<i class="fas fa-arrow-down"></i> نقص في البنك';
        differenceAmountEl.textContent = '-' + formattedDifference;
        differenceAmountEl.style.color = '#ef4444';
        differenceStatusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> البنك لديه نقص في الأموال';
        differenceStatusEl.style.color = '#ef4444';
    }
    
    // Show the difference rows
    differenceRow.style.display = 'table-row';
    differenceStatusRow.style.display = 'table-row';
    
    // Show appropriate toast message
    if (difference === 0) {
        showToast('🎉 ممتاز! الأرصدة متطابقة تماماً', 'success');
    } else if (Math.abs(difference) < 1) {
        showToast('✅ فرق طفيف: ' + formattedDifference + ' دينار', 'success');
    } else if (Math.abs(difference) < 50) {
        showToast('⚠️ فرق متوسط: ' + formattedDifference + ' دينار', 'warning');
    } else {
        showToast('🚨 فرق كبير: ' + formattedDifference + ' دينار - يحتاج مراجعة', 'error');
    }
}

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

