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

            // Get card elements
            const maxLoanCard = document.getElementById('maxLoanCard');
            const originalLoanCard = document.getElementById('originalLoanCard');
            const remainingLoanCard = document.getElementById('remainingLoanCard');
            const noLoanCard = document.getElementById('noLoanCard');
            const originalLoanAmount = document.getElementById('originalLoanAmount');
            const remainingLoanAmount = document.getElementById('remainingLoanAmount');

            if (dashboard.activeLoan) {
                // User has active loan - show two separate cards
                const originalAmount = dashboard.activeLoan.loan_amount;
                const remainingAmount = dashboard.activeLoan.remaining_amount;

                // Update values
                if (originalLoanAmount) {
                    originalLoanAmount.textContent = formatCurrency(originalAmount);
                }
                if (remainingLoanAmount) {
                    remainingLoanAmount.textContent = formatCurrency(remainingAmount);
                    remainingLoanAmount.style.color = '#28a745';
                    remainingLoanAmount.style.fontWeight = 'bold';
                }

                // Show loan cards, hide others
                if (originalLoanCard) originalLoanCard.style.display = 'block';
                if (remainingLoanCard) remainingLoanCard.style.display = 'block';
                if (maxLoanCard) maxLoanCard.style.display = 'none';
                if (noLoanCard) noLoanCard.style.display = 'none';

                console.log('Active loan displayed - Original:', originalAmount, 'Remaining:', remainingAmount);
            } else {
                // No active loan - show eligibility cards
                if (originalLoanCard) originalLoanCard.style.display = 'none';
                if (remainingLoanCard) remainingLoanCard.style.display = 'none';
                if (maxLoanCard) maxLoanCard.style.display = 'block';
                if (noLoanCard) noLoanCard.style.display = 'block';

                console.log('No active loan - showing eligibility');
            }
        } catch (error) {
            console.error('Error updating loan status:', error);

            // Get card elements for error handling
            const maxLoanCard = document.getElementById('maxLoanCard');
            const originalLoanCard = document.getElementById('originalLoanCard');
            const remainingLoanCard = document.getElementById('remainingLoanCard');
            const noLoanCard = document.getElementById('noLoanCard');
            const loanStatusElement = document.getElementById('loanStatus');

            // Hide loan cards and show error in no-loan card
            if (originalLoanCard) originalLoanCard.style.display = 'none';
            if (remainingLoanCard) remainingLoanCard.style.display = 'none';
            if (maxLoanCard) maxLoanCard.style.display = 'block';
            if (noLoanCard) {
                noLoanCard.style.display = 'block';
                if (loanStatusElement) {
                    loanStatusElement.textContent = 'خطأ في التحميل';
                    loanStatusElement.className = 'stat-value error';
                }
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
                    
                    // Scroll to tab content for priority tabs
                    if (button.classList.contains('priority-tab')) {
                        this.scrollToTabContent(targetTab);
                    }
                }
            });
        });

        // Setup priority action buttons
        this.setupPriorityActions();
    }

    // Scroll to tab content section
    scrollToTabContent(targetTab) {
        const tabContent = document.getElementById(`${targetTab}Tab`);
        if (tabContent) {
            // Scroll to the tab content with smooth animation
            tabContent.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Alternative: Scroll to user dashboard tabs section
            const tabsSection = document.querySelector('.user-dashboard-tabs');
            if (tabsSection) {
                tabsSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
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
    document.getElementById('messagesModal').style.display = 'block';
    showMessagesTab('send'); // Default to send tab
    loadMessageHistory(); // Load history in background
};

window.showLoanRequest = () => {
    if (window.userDashboardLoader) {
        window.userDashboardLoader.switchToTab('loan');
    }
};

// Messages Modal Functions
window.closeMessagesModal = () => {
    document.getElementById('messagesModal').style.display = 'none';
};

window.showMessagesTab = (tabName) => {
    // Hide all tab contents
    document.querySelectorAll('.messages-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.messages-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(tabName + 'MessageTab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active class to the correct tab button
    const tabButtons = document.querySelectorAll('.messages-tab');
    if (tabName === 'send' && tabButtons[0]) {
        tabButtons[0].classList.add('active');
    } else if (tabName === 'history' && tabButtons[1]) {
        tabButtons[1].classList.add('active');
    }
};

window.loadMessageHistory = async () => {
    try {
        // Use userDashboardLoader to get user data
        if (!window.userDashboardLoader || !window.userDashboardLoader.getUser()) {
            showToast('خطأ في تحديد هوية المستخدم', 'error');
            return;
        }

        const user = window.userDashboardLoader.getUser();
        const result = await apiCall(`/messages/${user.user_id}`);
        
        if (result.success) {
            displayMessageHistory(result.tickets);
        } else {
            throw new Error(result.message || 'فشل في تحميل الرسائل');
        }
    } catch (error) {
        console.error('Error loading message history:', error);
        document.getElementById('messageHistoryContent').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>حدث خطأ في تحميل الرسائل</p>
            </div>
        `;
    }
};

window.displayMessageHistory = (tickets) => {
    const historyContainer = document.getElementById('messageHistoryContent');
    
    if (!tickets || tickets.length === 0) {
        historyContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>لا توجد رسائل سابقة</p>
                <small>ستظهر رسائلك هنا بعد إرسالها</small>
            </div>
        `;
        return;
    }

    const messagesHTML = tickets.map(ticket => `
        <div class="message-card">
            <div class="message-header">
                <div>
                    <div class="message-subject">${ticket.subject}</div>
                    <div class="message-meta">
                        <span><i class="fas fa-calendar"></i> ${FormatHelper.formatDate(ticket.created_at)}</span>
                        <span><i class="fas fa-tag"></i> ${ticket.category_arabic}</span>
                    </div>
                </div>
                <div style="text-align: left;">
                    <span class="message-status ${ticket.status}">${ticket.status_arabic}</span>
                    <span class="message-priority ${ticket.priority}">${ticket.priority_arabic}</span>
                </div>
            </div>
            <div class="message-content">
                ${ticket.message.replace(/\n/g, '<br>')}
            </div>
            ${ticket.admin_notes ? `
                <div class="message-admin-notes">
                    <strong><i class="fas fa-user-shield"></i> ملاحظات الإدارة:</strong><br>
                    ${ticket.admin_notes.replace(/\n/g, '<br>')}
                    ${ticket.resolved_by_name ? `<br><small>بواسطة: ${ticket.resolved_by_name}</small>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');

    historyContainer.innerHTML = messagesHTML;
};

// Send Message Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const sendMessageForm = document.getElementById('sendMessageForm');
    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const messageData = {
                subject: formData.get('subject'),
                message: formData.get('message')
            };

            try {
                // Disable submit button during request
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                }
                
                const result = await apiCall('/messages', 'POST', messageData);
                
                if (result.success) {
                    showToast(result.message || 'تم إرسال الرسالة بنجاح', 'success');
                    e.target.reset();
                    loadMessageHistory(); // Refresh history
                    showMessagesTab('history'); // Switch to history tab
                } else {
                    throw new Error(result.message || 'فشل في إرسال الرسالة');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                showToast(error.message || 'حدث خطأ في إرسال الرسالة', 'error');
            } finally {
                // Re-enable submit button
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الرسالة';
                }
            }
        });
    }
});