// User Dashboard Loader Module
// Manages the loading and coordination of all user dashboard tabs

class UserDashboardLoader {
    constructor() {
        this.user = null;
        this.currentTab = 'info';
        this.tabs = {};
        this.initialized = false;
    }

    // Initialize the dashboard system
    async init(user) {
        console.log('Initializing user dashboard loader...');
        this.user = user;
        
        // Update user stats in main dashboard
        this.updateUserStats();
        
        // Initialize all tab modules
        await this.initializeTabs();
        
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Load initial tab
        await this.loadTab('info');
        
        this.initialized = true;
        console.log('User dashboard loader initialized successfully');
    }

    // Update user statistics display
    updateUserStats() {
        const userBalanceEl = document.getElementById('userBalance');
        const maxLoanAmountEl = document.getElementById('maxLoanAmount');
        
        if (userBalanceEl) {
            userBalanceEl.textContent = formatCurrency(this.user.balance);
        }
        
        if (maxLoanAmountEl) {
            maxLoanAmountEl.textContent = formatCurrency(this.user.maxLoanAmount);
        }
        
        // Update loan status by calling dashboard API
        this.updateLoanStatus();
    }
    
    // Update loan status from dashboard API
    async updateLoanStatus() {
        try {
            const result = await apiCall(`/users/dashboard/${this.user.user_id}`);
            const dashboard = result.dashboard;
            
            const loanStatusElement = document.getElementById('loanStatus');
            if (loanStatusElement) {
                if (dashboard.activeLoan) {
                    const statusText = `قرض نشط - ${formatCurrency(dashboard.activeLoan.remaining_amount)} متبقي`;
                    loanStatusElement.textContent = statusText;
                    loanStatusElement.className = 'stat-value active-loan';
                    console.log('Loan status updated to:', statusText);
                } else {
                    loanStatusElement.textContent = 'لا يوجد قرض نشط';
                    loanStatusElement.className = 'stat-value no-loan';
                    console.log('Loan status updated to: لا يوجد قرض نشط');
                }
            }
        } catch (error) {
            console.error('Error updating loan status:', error);
            const loanStatusElement = document.getElementById('loanStatus');
            if (loanStatusElement) {
                loanStatusElement.textContent = 'خطأ في التحميل';
                loanStatusElement.className = 'stat-value error';
            }
        }
    }

    // Initialize all tab modules
    async initializeTabs() {
        try {
            // Initialize Personal Info Tab
            if (window.PersonalInfoTab) {
                this.tabs.info = new window.PersonalInfoTab(this);
                window.personalInfoTab = this.tabs.info;
            }

            // Initialize Transactions Tab
            if (window.TransactionsTab) {
                this.tabs.transactions = new window.TransactionsTab(this);
                window.transactionsTab = this.tabs.transactions;
            }

            // Initialize Subscriptions Tab
            if (window.SubscriptionsTab) {
                this.tabs.subscriptions = new window.SubscriptionsTab(this);
                window.subscriptionsTab = this.tabs.subscriptions;
            }

            // Initialize Loan Payments Tab
            if (window.LoanPaymentsTab) {
                this.tabs['loan-payments'] = new window.LoanPaymentsTab(this);
                window.loanPaymentsTab = this.tabs['loan-payments'];
            }

            // Initialize Loan Request Tab
            if (window.LoanRequestTab) {
                this.tabs.loan = new window.LoanRequestTab(this);
                window.loanRequestTab = this.tabs.loan;
            }

            // Initialize Loan History Tab
            if (window.LoanHistoryTab) {
                this.tabs['loan-history'] = new window.LoanHistoryTab(this);
                window.loanHistoryTab = this.tabs['loan-history'];
            }

            // Initialize Family Management Tab
            if (window.FamilyManagementTab) {
                this.tabs['family'] = new window.FamilyManagementTab(this);
                window.familyManagementTab = this.tabs['family'];
            }

            console.log('All dashboard tabs initialized:', Object.keys(this.tabs));
        } catch (error) {
            console.error('Error initializing tabs:', error);
        }
    }

    // Setup tab navigation system
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.user-tab');
        const tabContents = document.querySelectorAll('.user-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const targetTab = button.getAttribute('data-tab');
                
                if (targetTab && targetTab !== this.currentTab) {
                    // Update active states
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    tabContents.forEach(content => {
                        if (content.id === `${targetTab}Tab`) {
                            content.classList.add('active');
                        } else {
                            content.classList.remove('active');
                        }
                    });

                    // Load tab content
                    await this.loadTab(targetTab);
                }
            });
        });

        // Setup priority action buttons
        this.setupPriorityActions();
    }

    // Setup priority action buttons
    setupPriorityActions() {
        // Loan Payment Priority Button
        const loanPaymentBtn = document.querySelector('[onclick="showLoanPayment()"]');
        if (loanPaymentBtn) {
            loanPaymentBtn.onclick = (e) => {
                e.preventDefault();
                this.switchToTab('loan-payments');
            };
        }

        // Subscription Payment Priority Button  
        const subscriptionBtn = document.querySelector('[onclick="showDeposit()"]');
        if (subscriptionBtn) {
            subscriptionBtn.onclick = (e) => {
                e.preventDefault();
                this.switchToTab('subscriptions');
            };
        }

        // Other priority buttons
        const userInfoBtn = document.querySelector('[onclick="showUserInfo()"]');
        if (userInfoBtn) {
            userInfoBtn.onclick = (e) => {
                e.preventDefault();
                this.switchToTab('info');
            };
        }

        const loanRequestBtn = document.querySelector('[onclick="showLoanRequest()"]');
        if (loanRequestBtn) {
            loanRequestBtn.onclick = (e) => {
                e.preventDefault();
                this.switchToTab('loan');
            };
        }
    }

    // Load specific tab content
    async loadTab(tabName) {
        console.log(`Loading tab: ${tabName}`);
        
        try {
            // Show loading state
            this.showTabLoading(tabName);
            
            // Load tab content if module exists
            if (this.tabs[tabName] && typeof this.tabs[tabName].load === 'function') {
                await this.tabs[tabName].load();
                this.currentTab = tabName;
                console.log(`Tab ${tabName} loaded successfully`);
            } else {
                console.warn(`Tab module not found: ${tabName}`);
                this.showTabError(tabName, `Tab module "${tabName}" not available`);
            }
        } catch (error) {
            console.error(`Error loading tab ${tabName}:`, error);
            this.showTabError(tabName, error.message);
        }
    }

    // Show loading state for tab
    showTabLoading(tabName) {
        const tabContent = document.getElementById(`${tabName}Content`);
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="tab-loading">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>جاري التحميل...</p>
                </div>
            `;
        }
    }

    // Show error state for tab
    showTabError(tabName, errorMessage) {
        const tabContent = document.getElementById(`${tabName}Content`);
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="tab-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h4>خطأ في تحميل التبويب</h4>
                    <p>${errorMessage}</p>
                    <button onclick="userDashboardLoader.loadTab('${tabName}')" class="btn btn-secondary">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    // Switch to specific tab programmatically
    async switchToTab(tabName) {
        const tabButtons = document.querySelectorAll('.user-tab');
        const tabContents = document.querySelectorAll('.user-tab-content');
        const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}Tab`);
        
        if (!targetButton || !targetContent) {
            console.warn(`Tab not found: ${tabName}`);
            return;
        }

        // Update UI states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        targetContent.classList.add('active');
        
        // Load content
        await this.loadTab(tabName);
        
        // Scroll to top of dashboard
        const dashboard = document.getElementById('userDashboard');
        if (dashboard) {
            dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Refresh current tab
    async refreshCurrentTab() {
        if (this.currentTab) {
            await this.loadTab(this.currentTab);
        }
    }

    // Refresh all tabs (clear cached data)
    async refreshAllTabs() {
        for (const [tabName, tabInstance] of Object.entries(this.tabs)) {
            if (tabInstance && typeof tabInstance.load === 'function') {
                try {
                    await tabInstance.load();
                } catch (error) {
                    console.error(`Error refreshing tab ${tabName}:`, error);
                }
            }
        }
    }

    // Get current tab instance
    getCurrentTab() {
        return this.tabs[this.currentTab] || null;
    }

    // Check if tab exists
    hasTab(tabName) {
        return this.tabs.hasOwnProperty(tabName);
    }
    
    // Get user data (for tabs compatibility)
    getUser() {
        return this.user;
    }
    
    // Refresh dashboard stats (for tabs to call after updates)
    async refreshStats() {
        this.updateUserStats();
    }

    // Update user data across all tabs
    updateUserData(newUserData) {
        this.user = { ...this.user, ...newUserData };
        this.updateUserStats();
        
        // Notify all tabs of user data update
        Object.values(this.tabs).forEach(tabInstance => {
            if (tabInstance && typeof tabInstance.updateUser === 'function') {
                tabInstance.updateUser(this.user);
            }
        });
    }

    // Cleanup function
    destroy() {
        // Remove event listeners and cleanup
        Object.values(this.tabs).forEach(tabInstance => {
            if (tabInstance && typeof tabInstance.destroy === 'function') {
                tabInstance.destroy();
            }
        });
        
        this.tabs = {};
        this.user = null;
        this.initialized = false;
        console.log('User dashboard loader destroyed');
    }
}

// Make UserDashboardLoader globally available
window.UserDashboardLoader = UserDashboardLoader;

// Global instance
window.userDashboardLoader = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!window.userDashboardLoader) {
        window.userDashboardLoader = new UserDashboardLoader();
    }
});

// Legacy compatibility functions for existing code
window.showUserInfo = () => {
    if (window.userDashboardLoader) {
        window.userDashboardLoader.switchToTab('info');
    }
};

window.showLoanPayment = () => {
    if (window.userDashboardLoader) {
        window.userDashboardLoader.switchToTab('loan-payments');
    }
};

window.showDeposit = () => {
    if (window.userDashboardLoader) {
        window.userDashboardLoader.switchToTab('subscriptions');
    }
};

window.showMessages = () => {
    showToast('سيتم إضافة الرسائل قريباً', 'info');
};

window.showLoanRequest = () => {
    if (window.userDashboardLoader) {
        window.userDashboardLoader.switchToTab('loan');
    }
};