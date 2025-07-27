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
                const pendingTransactionsEl = document.getElementById('pendingTransactions');
                
                if (totalUsersEl) {
                    totalUsersEl.textContent = stats.totalUsers || '0';
                    console.log('Updated total users:', stats.totalUsers);
                }
                
                if (pendingLoansEl) {
                    pendingLoansEl.textContent = stats.pendingLoans || '0';
                    console.log('Updated pending loans:', stats.pendingLoans);
                }
                
                if (pendingTransactionsEl) {
                    pendingTransactionsEl.textContent = stats.pendingTransactions || '0';
                    console.log('Updated pending transactions:', stats.pendingTransactions);
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
            const pendingTransactionsEl = document.getElementById('pendingTransactions');
            
            if (totalUsersEl) totalUsersEl.textContent = 'خطأ';
            if (pendingLoansEl) pendingLoansEl.textContent = 'خطأ';
            if (pendingTransactionsEl) pendingTransactionsEl.textContent = 'خطأ';
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
                            <i class="fas fa-credit-card"></i> المعاملات المعلقة (${document.getElementById('pendingTransactions').textContent})
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
});