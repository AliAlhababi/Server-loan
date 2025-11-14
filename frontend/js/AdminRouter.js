// Admin Router Module
// Handles URL-based routing for admin interface to enable multi-tab support

class AdminRouter {
    constructor() {
        this.currentRoute = null;
        this.routes = new Map();
        this.isInitialized = false;
    }

    // Initialize the router
    init() {
        if (this.isInitialized) return;
        
        // Store the initial hash before we do anything
        const initialHash = window.location.hash;
        console.log('🔗 AdminRouter init with initial hash:', initialHash);
        
        // Register admin routes
        this.registerRoutes();
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleHashChange());
        window.addEventListener('popstate', () => this.handleHashChange());
        
        // Handle initial load and current hash
        if (window.location.hash) {
            console.log('🔗 Processing initial hash:', window.location.hash);
        }
        this.handleHashChange();
        
        this.isInitialized = true;
        console.log('✅ Admin Router initialized');
    }

    // Register all available admin routes
    registerRoutes() {
        // Main admin sections
        this.routes.set('admin/dashboard', {
            title: 'لوحة تحكم المدير',
            handler: () => this.showAdminDashboard()
        });

        this.routes.set('admin/users', {
            title: 'إدارة الأعضاء',
            handler: (params) => this.showUsersManagement(params)
        });

        this.routes.set('admin/users/details', {
            title: 'تفاصيل العضو',
            handler: (params) => this.showUserDetails(params)
        });

        this.routes.set('admin/loans', {
            title: 'إدارة القروض',
            handler: (params) => this.showLoansManagement(params)
        });

        this.routes.set('admin/loans/details', {
            title: 'تفاصيل القرض',
            handler: (params) => this.showLoanDetails(params)
        });

        this.routes.set('admin/transactions', {
            title: 'إدارة المعاملات',
            handler: (params) => this.showTransactionsManagement(params)
        });

        this.routes.set('admin/transactions/details', {
            title: 'تفاصيل المعاملة',
            handler: (params) => this.showTransactionDetails(params)
        });

        this.routes.set('admin/reports', {
            title: 'التقارير والإحصائيات',
            handler: (params) => this.showReportsManagement(params)
        });

        this.routes.set('admin/banks', {
            title: 'إدارة البنوك',
            handler: (params) => this.showBanksManagement(params)
        });

        this.routes.set('admin/family-delegations', {
            title: 'إدارة التفويض العائلي',
            handler: (params) => this.showFamilyDelegationsManagement(params)
        });

        this.routes.set('admin/tickets', {
            title: 'إدارة الرسائل',
            handler: (params) => this.showTicketsManagement(params)
        });

        this.routes.set('admin/whatsapp', {
            title: 'إدارة واتساب',
            handler: (params) => this.showWhatsAppManagement(params)
        });

        this.routes.set('admin/profile', {
            title: 'تعديل المعلومات الشخصية',
            handler: (params) => this.showProfileManagement(params)
        });
    }

    // Handle hash changes
    handleHashChange() {
        const hash = window.location.hash.slice(1); // Remove #
        console.log('📍 AdminRouter handling hash change:', hash);
        console.log('🔍 Full window.location.hash:', window.location.hash);
        console.log('🌐 Full window.location.href:', window.location.href);
        
        if (!hash) {
            // No hash, show default admin dashboard ONLY if we're not in a new tab context
            // Check if this is a fresh page load vs a new tab that should have a hash
            const isNewTab = document.referrer !== window.location.href && window.opener;
            
            if (currentUser && currentUser.isAdmin && !isNewTab) {
                console.log('🏠 No hash, navigating to admin dashboard');
                this.navigate('admin/dashboard');
            } else if (isNewTab) {
                console.log('🚫 Skipping default navigation - this appears to be a new tab that should have a hash');
            }
            return;
        }

        const { path, params } = this.parseHash(hash);
        console.log('🗺️ Parsed route - Path:', path, 'Params:', params);
        
        this.currentRoute = { path, params };
        
        const route = this.routes.get(path);
        if (route) {
            console.log('✅ Found route handler for:', path);
            // Update page title
            document.title = `${route.title} - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}`;
            
            // Call route handler
            route.handler(params);
        } else {
            console.warn(`❌ Unknown admin route: ${path}`);
            // Fallback to dashboard
            this.navigate('admin/dashboard');
        }
    }

    // Parse hash into path and parameters
    parseHash(hash) {
        const [path, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');
        
        return {
            path,
            params: Object.fromEntries(params.entries())
        };
    }

    // Navigate to a specific admin route
    navigate(path, params = {}) {
        console.log('🧭 AdminRouter.navigate called with:', path, params);
        console.trace('📞 Navigate call stack');
        
        const queryString = new URLSearchParams(params).toString();
        const hash = queryString ? `${path}?${queryString}` : path;
        
        console.log('🔄 Setting hash to:', hash);
        
        // Update URL without triggering page reload
        window.location.hash = hash;
    }

    // Open route in new tab
    openInNewTab(path, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const hash = queryString ? `${path}?${queryString}` : path;
        
        // Create clean URL without existing query parameters that might interfere
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const cleanUrl = `${baseUrl}#${hash}`;
        
        console.log('🔗 Opening new tab with clean URL:', cleanUrl);
        console.log('📍 Path:', path, 'Params:', params);
        console.log('🧹 Base URL (no query params):', baseUrl);
        
        // Use a more reliable method to open new tab with hash
        const link = document.createElement('a');
        link.href = cleanUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Temporarily add to DOM and click
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Route handlers - these will call the existing admin modules
    async showAdminDashboard() {
        // Ensure user is authenticated admin
        if (!currentUser || !currentUser.isAdmin) {
            window.location.hash = '';
            return;
        }

        // Show admin dashboard section and hide user dashboard
        document.getElementById('userDashboard').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        
        // Initialize admin dashboard if needed
        if (!window.adminDashboard) {
            window.adminDashboard = new AdminDashboard();
            await window.adminDashboard.init();
        } else {
            window.adminDashboard.showMainView();
        }

        // Ensure tab modules are initialized (needed for new tabs)
        if (!window.usersManagement || !window.loansManagement || !window.transactionsManagement) {
            console.log('🔧 Initializing tab modules for new tab...');
            window.adminDashboard.initializeTabModules();
            console.log('✅ Tab modules initialized');
        }
    }

    async showUsersManagement(params) {
        // Check if this is a new tab by looking at the URL
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone users management page');
            await this.renderStandaloneUsersManagement();
        } else {
            // Regular tab switching within existing dashboard
            await this.showAdminDashboard();
            
            console.log('👥 Showing users management, module available:', !!window.usersManagement);
            if (window.usersManagement) {
                await window.usersManagement.show();
            } else {
                console.error('❌ usersManagement module not available');
                throw new Error('Users management module not initialized');
            }
            
            // Handle sub-tabs if specified
            if (params.tab) {
                setTimeout(() => {
                    const tabButton = document.querySelector(`[data-tab="${params.tab}"]`);
                    if (tabButton) {
                        tabButton.click();
                    }
                }, 100);
            }
        }
    }

    async showUserDetails(params) {
        console.log('👤 AdminRouter.showUserDetails called with params:', params);
        
        if (params.id) {
            console.log('🔍 Loading user details for ID:', params.id);
            
            // Hide everything and show only the detail page
            this.showStandaloneDetailPage();
            
            // Show loading in the body
            document.body.innerHTML = `
                <div class="standalone-loading" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #f8f9fa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                ">
                    <div style="text-align: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #667eea;"></i>
                        <p style="margin-top: 16px; color: #6c757d; font-size: 16px;">جاري تحميل تفاصيل المستخدم...</p>
                    </div>
                </div>
            `;
            
            // Load user details immediately
            console.log('🚀 Calling renderStandaloneUserDetails');
            this.renderStandaloneUserDetails(params.id);
        } else {
            console.error('❌ No user ID provided in params');
        }
    }

    async showLoansManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone loans management page');
            await this.renderStandaloneLoansManagement();
        } else {
            await this.showAdminDashboard();
            await window.loansManagement.show();
            
            if (params.tab) {
                setTimeout(() => {
                    const tabButton = document.querySelector(`[data-tab="${params.tab}"]`);
                    if (tabButton) {
                        tabButton.click();
                    }
                }, 100);
            }
        }
    }

    async showLoanDetails(params) {
        await this.showLoansManagement();
        
        if (params.id && params.type) {
            setTimeout(async () => {
                if (params.type === 'request' && window.loansManagement.viewLoanRequest) {
                    await window.loansManagement.viewLoanRequest(params.id);
                } else if (params.type === 'payment' && window.loansManagement.viewLoanPayment) {
                    await window.loansManagement.viewLoanPayment(params.id);
                }
            }, 500);
        }
    }

    async showTransactionsManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone transactions management page');
            await this.renderStandaloneTransactionsManagement();
        } else {
            await this.showAdminDashboard();
            await window.transactionsManagement.show();
            
            if (params.tab) {
                setTimeout(() => {
                    const tabButton = document.querySelector(`[data-tab="${params.tab}"]`);
                    if (tabButton) {
                        tabButton.click();
                    }
                }, 100);
            }
        }
    }

    async showTransactionDetails(params) {
        console.log('💳 AdminRouter.showTransactionDetails called with params:', params);
        
        if (params.id) {
            console.log('🔍 Loading transaction details for ID:', params.id);
            
            // Hide everything and show only the detail page
            this.showStandaloneDetailPage();
            
            // Show loading in the body
            document.body.innerHTML = `
                <div class="standalone-loading" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #f8f9fa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                ">
                    <div style="text-align: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #667eea;"></i>
                        <p style="margin-top: 16px; color: #6c757d; font-size: 16px;">جاري تحميل تفاصيل المعاملة...</p>
                    </div>
                </div>
            `;
            
            // Load transaction details immediately
            console.log('🚀 Calling renderStandaloneTransactionDetails');
            this.renderStandaloneTransactionDetails(params.id);
        } else {
            console.error('❌ No transaction ID provided in params');
        }
    }

    async showReportsManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone reports management page');
            await this.renderStandaloneReportsManagement();
        } else {
            await this.showAdminDashboard();
            await window.reportsManagement.show();
        }
    }

    async showBanksManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone banks management page');
            await this.renderStandaloneBanksManagement();
        } else {
            await this.showAdminDashboard();
            await window.banksManagement.show();
        }
    }

    async showFamilyDelegationsManagement(params) {
        await this.showAdminDashboard();
        await window.familyDelegationsManagement.load();
    }

    async showTicketsManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone tickets management page');
            await this.renderStandaloneTicketsManagement();
        } else {
            await this.showAdminDashboard();
            await window.ticketsManagement.show();
        }
    }

    async showWhatsAppManagement(params) {
        // Check if this is a new tab
        const isStandaloneTab = !document.getElementById('adminDashboard') || 
                               window.location.search === '' && window.location.hash.startsWith('#admin/');
        
        if (isStandaloneTab) {
            console.log('🆕 Creating standalone WhatsApp management page');
            await this.renderStandaloneWhatsAppManagement();
        } else {
            await this.showAdminDashboard();
            await window.whatsappQueueManagement.show();
        }
    }

    async showProfileManagement(params) {
        await this.showAdminDashboard();
        // Open the profile edit modal
        if (typeof openEditProfileModal === 'function') {
            openEditProfileModal();
        }
    }

    // Helper method to get current route info
    getCurrentRoute() {
        return this.currentRoute;
    }

    // Helper method to check if we're in admin mode
    isAdminRoute() {
        return this.currentRoute && this.currentRoute.path.startsWith('admin/');
    }

    // Generate URL for a route
    generateUrl(path, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const hash = queryString ? `${path}?${queryString}` : path;
        return `${window.location.origin}${window.location.pathname}#${hash}`;
    }

    // Update current route parameters without changing path
    updateParams(newParams) {
        if (!this.currentRoute) return;
        
        const updatedParams = { ...this.currentRoute.params, ...newParams };
        this.navigate(this.currentRoute.path, updatedParams);
    }

    // Standalone detail page helper
    showStandaloneDetailPage() {
        // Hide all main sections
        const sections = ['login', 'dashboard', 'userDashboard', 'adminDashboard'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    // Standalone rendering methods (lightweight, no admin overhead)

    // Generic method to create standalone admin pages
    createStandalonePage(title, iconClass, contentMessage) {
        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <link rel="stylesheet" href="css/dashboard-styles.css">
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background: #f8f9fa;
                        color: #2c3e50;
                        direction: rtl;
                        margin: 0;
                        padding: 20px;
                    }
                    .standalone-container {
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    .page-header {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .page-header h1 {
                        color: #667eea;
                        font-size: 28px;
                        margin: 0;
                    }
                    .content-area {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        min-height: 600px;
                        padding: 40px;
                        text-align: center;
                        font-size: 18px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="standalone-container">
                    <div class="page-header">
                        <h1><i class="${iconClass}"></i> ${title}</h1>
                    </div>
                    
                    <div class="content-area">
                        ${contentMessage}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Render users management as standalone page
    async renderStandaloneUsersManagement() {
        try {
            const pageContent = `
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>إدارة الأعضاء - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <link rel="stylesheet" href="css/dashboard-styles.css">
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            background: #f8f9fa;
                            color: #2c3e50;
                            direction: rtl;
                            margin: 0;
                            padding: 20px;
                        }
                        .standalone-container {
                            max-width: 1400px;
                            margin: 0 auto;
                        }
                        .page-header {
                            background: white;
                            padding: 24px;
                            border-radius: 12px;
                            margin-bottom: 24px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            text-align: center;
                        }
                        .page-header h1 {
                            color: #667eea;
                            font-size: 28px;
                            margin: 0;
                        }
                        .users-content {
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            min-height: 600px;
                        }
                    </style>
                </head>
                <body>
                    <div class="standalone-container">
                        <div class="page-header">
                            <h1><i class="fas fa-users"></i> إدارة الأعضاء</h1>
                        </div>
                        
                        <div class="users-content" id="usersManagementContent">
                            <div style="padding: 40px; text-align: center;">
                                <i class="fas fa-spinner fa-spin"></i>
                                جاري تحميل بيانات الأعضاء...
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Standalone API helper (avoid conflicts)
                        const authToken = localStorage.getItem('authToken');
                        
                        // API call function for standalone pages
                        async function standaloneApiCall(endpoint, method = 'GET', data = null) {
                            const options = {
                                method,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            };
                            
                            if (authToken) {
                                options.headers['Authorization'] = 'Bearer ' + authToken;
                            }
                            
                            if (data) {
                                options.body = JSON.stringify(data);
                            }
                            
                            const response = await fetch(endpoint, options);
                            return await response.json();
                        }
                        
                        // Initialize users management in standalone mode
                        document.addEventListener('DOMContentLoaded', async function() {
                            if (!authToken) {
                                document.getElementById('usersManagementContent').innerHTML = 
                                    '<div style="padding: 40px; text-align: center; color: red;">يجب تسجيل الدخول أولاً</div>';
                                return;
                            }
                            
                            try {
                                // Load users data
                                const result = await standaloneApiCall('/admin/users');
                                
                                if (result.success && result.users) {
                                    let usersHtml = '<div style="padding: 20px;"><h3>قائمة الأعضاء (' + result.users.length + ' عضو)</h3><div class="users-grid">';
                                    
                                    result.users.forEach(user => {
                                        const statusColor = user.joining_fee_approved === 'approved' ? '#28a745' : 
                                                          user.joining_fee_approved === 'pending' ? '#ffc107' : '#dc3545';
                                        const statusText = user.joining_fee_approved === 'approved' ? 'مُعتمد' : 
                                                         user.joining_fee_approved === 'pending' ? 'قيد المراجعة' : 'مرفوض';
                                        
                                        usersHtml += \`
                                            <div class="user-card" style="background: white; margin: 10px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-right: 4px solid \${statusColor};">
                                                <h4>\${user.Aname} (#\${user.user_id})</h4>
                                                <p>الهاتف: \${user.phone || 'غير محدد'}</p>
                                                <p>الرصيد: \${user.balance || 0} د.ك</p>
                                                <p>الحالة: <span style="color: \${statusColor}; font-weight: bold;">\${statusText}</span></p>
                                                <small>تاريخ التسجيل: \${new Date(user.registration_date).toLocaleDateString('en-US')}</small>
                                            </div>
                                        \`;
                                    });
                                    
                                    usersHtml += '</div></div>';
                                    document.getElementById('usersManagementContent').innerHTML = usersHtml;
                                } else {
                                    document.getElementById('usersManagementContent').innerHTML = 
                                        '<div style="padding: 40px; text-align: center;">لا توجد بيانات أعضاء متاحة</div>';
                                }
                            } catch (error) {
                                console.error('Error loading users:', error);
                                document.getElementById('usersManagementContent').innerHTML = 
                                    '<div style="padding: 40px; text-align: center; color: red;">خطأ في تحميل بيانات الأعضاء</div>';
                            }
                        });
                    </script>
                </body>
                </html>
            `;

            document.open();
            document.write(pageContent);
            document.close();
            
        } catch (error) {
            console.error('Error rendering standalone users management:', error);
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; color: red;">
                    <h2>خطأ في تحميل إدارة الأعضاء</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // Render loans management as standalone page
    async renderStandaloneLoansManagement() {
        const pageContent = this.createStandalonePage('إدارة القروض', 'fas fa-hand-holding-usd', 'واجهة إدارة القروض متاحة في التبويب المستقل');
        document.open();
        document.write(pageContent);
        document.close();
    }

    // Render transactions management as standalone page
    async renderStandaloneTransactionsManagement() {
        const pageContent = this.createStandalonePage('إدارة المعاملات', 'fas fa-exchange-alt', 'واجهة إدارة المعاملات متاحة في التبويب المستقل');
        document.open();
        document.write(pageContent);
        document.close();
    }

    // Render reports management as standalone page
    async renderStandaloneReportsManagement() {
        const pageContent = this.createStandalonePage('التقارير والإحصائيات', 'fas fa-chart-pie', 'واجهة التقارير والملخص المالي متاحة في التبويب المستقل');
        document.open();
        document.write(pageContent);
        document.close();
    }

    // Render banks management as standalone page
    async renderStandaloneBanksManagement() {
        try {
            const pageContent = `
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>إدارة البنوك - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <link rel="stylesheet" href="css/dashboard-styles.css">
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            background: #f8f9fa;
                            color: #2c3e50;
                            direction: rtl;
                            margin: 0;
                            padding: 20px;
                        }
                        .standalone-container {
                            max-width: 1400px;
                            margin: 0 auto;
                        }
                        .page-header {
                            background: white;
                            padding: 24px;
                            border-radius: 12px;
                            margin-bottom: 24px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            text-align: center;
                        }
                        .page-header h1 {
                            color: #667eea;
                            font-size: 28px;
                            margin: 0;
                        }
                        .banks-content {
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            min-height: 600px;
                        }
                    </style>
                </head>
                <body>
                    <div class="standalone-container">
                        <div class="page-header">
                            <h1><i class="fas fa-university"></i> إدارة البنوك</h1>
                        </div>
                        
                        <div class="banks-content" id="banksManagementContent">
                            <div style="padding: 40px; text-align: center;">
                                <i class="fas fa-spinner fa-spin"></i>
                                جاري تحميل بيانات البنوك...
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Standalone API helper (avoid conflicts)
                        const authToken = localStorage.getItem('authToken');
                        
                        // API call function for standalone pages
                        async function standaloneApiCall(endpoint, method = 'GET', data = null) {
                            const options = {
                                method,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            };
                            
                            if (authToken) {
                                options.headers['Authorization'] = 'Bearer ' + authToken;
                            }
                            
                            if (data) {
                                options.body = JSON.stringify(data);
                            }
                            
                            const response = await fetch(endpoint, options);
                            return await response.json();
                        }
                        
                        // Initialize banks management in standalone mode
                        document.addEventListener('DOMContentLoaded', async function() {
                            if (!authToken) {
                                document.getElementById('banksManagementContent').innerHTML = 
                                    '<div style="padding: 40px; text-align: center; color: red;">يجب تسجيل الدخول أولاً</div>';
                                return;
                            }
                            
                            try {
                                // Load banks data
                                const result = await standaloneApiCall('/admin/banks');
                                
                                if (result.success && result.banks) {
                                    let banksHtml = '<div style="padding: 20px;"><h3>قائمة البنوك</h3><div class="banks-grid">';
                                    
                                    result.banks.forEach(bank => {
                                        banksHtml += \`
                                            <div class="bank-card" style="background: white; margin: 10px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <h4>\${bank.bank_name}</h4>
                                                <p>الرصيد: \${bank.balance} د.ك</p>
                                                <small>آخر تحديث: \${new Date(bank.updated_at).toLocaleDateString('en-US')}</small>
                                            </div>
                                        \`;
                                    });
                                    
                                    banksHtml += '</div></div>';
                                    document.getElementById('banksManagementContent').innerHTML = banksHtml;
                                } else {
                                    document.getElementById('banksManagementContent').innerHTML = 
                                        '<div style="padding: 40px; text-align: center;">لا توجد بيانات بنوك متاحة</div>';
                                }
                            } catch (error) {
                                console.error('Error loading banks:', error);
                                document.getElementById('banksManagementContent').innerHTML = 
                                    '<div style="padding: 40px; text-align: center; color: red;">خطأ في تحميل بيانات البنوك</div>';
                            }
                        });
                    </script>
                </body>
                </html>
            `;

            document.open();
            document.write(pageContent);
            document.close();
            
        } catch (error) {
            console.error('Error rendering standalone banks management:', error);
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; color: red;">
                    <h2>خطأ في تحميل إدارة البنوك</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // Render tickets management as standalone page
    async renderStandaloneTicketsManagement() {
        const pageContent = this.createStandalonePage('إدارة الرسائل', 'fas fa-envelope', 'واجهة إدارة الرسائل متاحة في التبويب المستقل');
        document.open();
        document.write(pageContent);
        document.close();
    }

    // Render WhatsApp management as standalone page
    async renderStandaloneWhatsAppManagement() {
        const pageContent = this.createStandalonePage('إدارة واتساب', 'fab fa-whatsapp', 'واجهة إدارة إشعارات الواتساب متاحة في التبويب المستقل');
        document.open();
        document.write(pageContent);
        document.close();
    }

    // Render user details using new modular class
    async renderStandaloneUserDetails(userId) {
        try {
            console.log('🚀 Starting UserDetailsPage with userId:', userId);
            
            // Use the new modular UserDetailsPage class
            if (window.UserDetailsPage) {
                const userDetailsPage = new window.UserDetailsPage();
                // Make it globally available for edit functions
                window.userDetailsPage = userDetailsPage;
                await userDetailsPage.init(userId);
            } else {
                console.error('❌ UserDetailsPage class not found! Make sure UserDetailsPage.js is loaded.');
                document.body.innerHTML = `
                    <div style="padding: 40px; text-align: center; direction: rtl;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                        <h2 style="color: #2c3e50; margin-bottom: 12px;">خطأ في تحميل الصفحة</h2>
                        <p style="color: #6c757d;">لم يتم العثور على وحدة تفاصيل المستخدم. يرجى إعادة تحميل الصفحة.</p>
                        <button onclick="window.close()" style="margin-top: 20px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            إغلاق
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; direction: rtl;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <h2 style="color: #2c3e50; margin-bottom: 12px;">خطأ في تحميل البيانات</h2>
                    <p style="color: #6c757d;">${error.message}</p>
                    <button onclick="window.close()" style="margin-top: 20px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        إغلاق
                    </button>
                </div>
            `;
        }
    }

    // Render transaction details as standalone page
    async renderStandaloneTransactionDetails(transactionId) {
        try {
            // Get transaction details from all transactions
            const result = await apiCall('/admin/all-transactions');
            const transaction = result.transactions.find(t => (t.transaction_id || t.id) == transactionId);
            
            if (!transaction) {
                throw new Error('المعاملة غير موجودة');
            }

            const pageContent = `
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>تفاصيل المعاملة #${transaction.transaction_id || transaction.id} - ${brandConfig?.brand?.displayName || 'نظام إدارة القروض'}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            background: #f8f9fa;
                            color: #2c3e50;
                            direction: rtl;
                            line-height: 1.6;
                        }
                        .standalone-container {
                            max-width: 1000px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .page-header {
                            background: white;
                            padding: 24px;
                            border-radius: 12px;
                            margin-bottom: 24px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            text-align: center;
                        }
                        .page-header h1 {
                            color: #667eea;
                            font-size: 28px;
                            margin-bottom: 8px;
                        }
                        .page-header .subtitle {
                            color: #6c757d;
                            font-size: 16px;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 600;
                            margin-top: 12px;
                        }
                        .status-badge.accepted { background: #d4edda; color: #155724; }
                        .status-badge.pending { background: #fff3cd; color: #856404; }
                        .status-badge.rejected { background: #f8d7da; color: #721c24; }
                        .info-section {
                            background: white;
                            border-radius: 12px;
                            padding: 24px;
                            margin-bottom: 24px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        .info-section h2 {
                            color: #667eea;
                            font-size: 20px;
                            margin-bottom: 20px;
                            border-bottom: 2px solid #e1e5e9;
                            padding-bottom: 12px;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                            gap: 16px;
                        }
                        .info-item {
                            background: #f8f9fa;
                            padding: 12px 16px;
                            border-radius: 8px;
                            border: 1px solid #e1e5e9;
                        }
                        .info-item label {
                            font-weight: 600;
                            color: #495057;
                            font-size: 13px;
                            display: block;
                            margin-bottom: 4px;
                        }
                        .info-item span {
                            color: #2c3e50;
                            font-size: 15px;
                        }
                        .amount.positive { color: #28a745; font-weight: 600; }
                        .amount.negative { color: #dc3545; font-weight: 600; }
                        .transaction-type.credit { color: #28a745; font-weight: 600; }
                        .transaction-type.debit { color: #dc3545; font-weight: 600; }
                        .balance-info {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 30px;
                            flex-wrap: wrap;
                        }
                        .balance-card {
                            background: #f8f9fa;
                            border: 2px solid #e1e5e9;
                            border-radius: 12px;
                            padding: 20px;
                            text-align: center;
                            min-width: 200px;
                        }
                        .balance-label {
                            font-size: 14px;
                            color: #6c757d;
                            margin-bottom: 8px;
                        }
                        .balance-amount {
                            font-size: 20px;
                            font-weight: 700;
                            color: #2c3e50;
                        }
                        .balance-operation {
                            background: #e9ecef;
                            border-radius: 50%;
                            width: 60px;
                            height: 60px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            font-weight: 600;
                            color: #495057;
                        }
                        .back-button {
                            position: fixed;
                            top: 20px;
                            left: 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 16px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            z-index: 1000;
                        }
                        .back-button:hover {
                            background: #5a6268;
                        }
                        @media (max-width: 768px) {
                            .standalone-container { padding: 12px; }
                            .info-grid { grid-template-columns: 1fr; }
                            .balance-info { flex-direction: column; gap: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <button class="back-button" onclick="window.close()">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                    
                    <div class="standalone-container">
                        <div class="page-header">
                            <h1><i class="fas fa-receipt"></i> تفاصيل المعاملة #${transaction.transaction_id || transaction.id}</h1>
                            <p class="subtitle">${transaction.memo || 'معاملة مالية'}</p>
                            <div class="status-badge ${transaction.status}">
                                ${transaction.status === 'accepted' ? 'مقبول' : transaction.status === 'rejected' ? 'مرفوض' : 'معلق'}
                            </div>
                        </div>

                        <div class="info-section">
                            <h2><i class="fas fa-info-circle"></i> معلومات المعاملة</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>رقم المعاملة</label>
                                    <span>#${transaction.transaction_id || transaction.id}</span>
                                </div>
                                <div class="info-item">
                                    <label>المستخدم</label>
                                    <span>${transaction.username || transaction.Aname || `المستخدم #${transaction.user_id}`}</span>
                                </div>
                                <div class="info-item">
                                    <label>نوع المعاملة</label>
                                    <span class="transaction-type ${transaction.credit > 0 ? 'credit' : 'debit'}">
                                        ${transaction.credit > 0 ? 'إيداع' : 'سحب'}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>المبلغ</label>
                                    <span class="amount ${transaction.credit > 0 ? 'positive' : 'negative'}">
                                        ${Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0)).toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} د.ك
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>تاريخ المعاملة</label>
                                    <span>${new Date(transaction.date).toLocaleDateString('en-US')}</span>
                                </div>
                                <div class="info-item">
                                    <label>الحالة</label>
                                    <span class="status-badge ${transaction.status}">
                                        ${transaction.status === 'accepted' ? 'مقبول' : transaction.status === 'rejected' ? 'مرفوض' : 'معلق'}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>الوصف</label>
                                    <span>${transaction.memo || 'لا يوجد وصف'}</span>
                                </div>
                                <div class="info-item">
                                    <label>المعتمد بواسطة</label>
                                    <span>${transaction.admin_name || 'غير محدد'}</span>
                                </div>
                            </div>
                        </div>

                        ${(transaction.balance_before !== undefined && transaction.balance_after !== undefined) ? `
                        <div class="info-section">
                            <h2><i class="fas fa-balance-scale"></i> معلومات الرصيد</h2>
                            <div class="balance-info">
                                <div class="balance-card">
                                    <div class="balance-label">الرصيد قبل المعاملة</div>
                                    <div class="balance-amount">${parseFloat(transaction.balance_before || 0).toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} د.ك</div>
                                </div>
                                <div class="balance-operation">
                                    <i class="fas fa-${transaction.credit > 0 ? 'plus' : 'minus'}"></i>
                                </div>
                                <div class="balance-card">
                                    <div class="balance-label">الرصيد بعد المعاملة</div>
                                    <div class="balance-amount">${parseFloat(transaction.balance_after || 0).toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} د.ك</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </body>
                </html>
            `;

            // Replace the entire document
            document.open();
            document.write(pageContent);
            document.close();

        } catch (error) {
            console.error('Error loading standalone transaction details:', error);
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <h2 style="color: #2c3e50; margin-bottom: 12px;">خطأ في تحميل البيانات</h2>
                    <p style="color: #6c757d;">${error.message}</p>
                    <button onclick="window.close()" style="margin-top: 20px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        إغلاق
                    </button>
                </div>
            `;
        }
    }


    // Render transaction details as full page
    async renderTransactionDetailsPage(transactionId) {
        const adminContentArea = document.getElementById('admin-content-area');
        if (!adminContentArea) return;

        try {
            // Get transaction details from all transactions
            const result = await apiCall('/admin/all-transactions');
            const transaction = result.transactions.find(t => (t.transaction_id || t.id) === transactionId);
            
            if (!transaction) {
                throw new Error('المعاملة غير موجودة');
            }

            const pageContent = `
                <div class="full-page-view transaction-details-full-page">
                    <!-- Header with back button -->
                    <div class="page-header">
                        <div class="header-left">
                            <button onclick="adminRouter.navigate('admin/transactions')" class="btn-back-to-list">
                                <i class="fas fa-arrow-right"></i> العودة لقائمة المعاملات
                            </button>
                        </div>
                        <div class="header-center">
                            <h1><i class="fas fa-receipt"></i> تفاصيل المعاملة #${transaction.transaction_id || transaction.id}</h1>
                            <p class="page-subtitle">${transaction.memo || 'معاملة مالية'}</p>
                        </div>
                        <div class="header-right">
                            <span class="status-badge ${transaction.status}">
                                ${transaction.status === 'accepted' ? 'مقبول' : transaction.status === 'rejected' ? 'مرفوض' : 'معلق'}
                            </span>
                        </div>
                    </div>

                    <!-- Main content area -->
                    <div class="page-content">
                        <!-- Transaction Information Section -->
                        <div class="info-section">
                            <h2><i class="fas fa-info-circle"></i> معلومات المعاملة</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>رقم المعاملة</label>
                                    <span>#${transaction.transaction_id || transaction.id}</span>
                                </div>
                                <div class="info-item">
                                    <label>المستخدم</label>
                                    <span>${transaction.username || transaction.Aname || `المستخدم #${transaction.user_id}`}</span>
                                </div>
                                <div class="info-item">
                                    <label>نوع المعاملة</label>
                                    <span class="transaction-type ${transaction.credit > 0 ? 'credit' : 'debit'}">
                                        ${transaction.credit > 0 ? 'إيداع' : 'سحب'}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>المبلغ</label>
                                    <span class="amount ${transaction.credit > 0 ? 'positive' : 'negative'}">
                                        ${window.formatCurrency ? window.formatCurrency(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0))) : parseFloat(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0))).toFixed(3) + ' د.ك'}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>تاريخ المعاملة</label>
                                    <span>${window.formatDate ? window.formatDate(transaction.date) : (transaction.date ? new Date(transaction.date).toLocaleDateString('en-US') : 'غير محدد')}</span>
                                </div>
                                <div class="info-item">
                                    <label>الحالة</label>
                                    <span class="status-badge ${transaction.status}">
                                        ${transaction.status === 'accepted' ? 'مقبول' : transaction.status === 'rejected' ? 'مرفوض' : 'معلق'}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>الوصف</label>
                                    <span>${transaction.memo || 'لا يوجد وصف'}</span>
                                </div>
                                <div class="info-item">
                                    <label>المعتمد بواسطة</label>
                                    <span>${transaction.admin_name || 'غير محدد'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- User Balance Information -->
                        <div class="info-section">
                            <h2><i class="fas fa-balance-scale"></i> معلومات الرصيد</h2>
                            <div class="balance-info">
                                <div class="balance-card">
                                    <div class="balance-label">الرصيد قبل المعاملة</div>
                                    <div class="balance-amount">${window.formatCurrency ? window.formatCurrency(transaction.balance_before || 0) : parseFloat(transaction.balance_before || 0).toFixed(3) + ' د.ك'}</div>
                                </div>
                                <div class="balance-operation">
                                    <i class="fas fa-${transaction.credit > 0 ? 'plus' : 'minus'}"></i>
                                    ${parseFloat(Math.abs(parseFloat(transaction.credit || 0) + parseFloat(transaction.debit || 0))).toFixed(3)} د.ك
                                </div>
                                <div class="balance-card">
                                    <div class="balance-label">الرصيد بعد المعاملة</div>
                                    <div class="balance-amount">${window.formatCurrency ? window.formatCurrency(transaction.balance_after || 0) : parseFloat(transaction.balance_after || 0).toFixed(3) + ' د.ك'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="page-actions">
                            ${transaction.status === 'pending' ? `
                                <button onclick="transactionsManagement.approveTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" class="btn btn-success">
                                    <i class="fas fa-check"></i> قبول المعاملة
                                </button>
                                <button onclick="transactionsManagement.rejectTransaction(${transaction.transaction_id || transaction.id}, 'transaction')" class="btn btn-danger">
                                    <i class="fas fa-times"></i> رفض المعاملة
                                </button>
                            ` : ''}
                            <button onclick="transactionsManagement.editTransaction(${transaction.transaction_id || transaction.id})" class="btn btn-primary">
                                <i class="fas fa-edit"></i> تعديل المعاملة
                            </button>
                            <button onclick="window.print()" class="btn btn-info">
                                <i class="fas fa-print"></i> طباعة
                            </button>
                        </div>
                    </div>
                </div>
            `;

            adminContentArea.innerHTML = pageContent;

        } catch (error) {
            console.error('Error loading transaction details page:', error);
            adminContentArea.innerHTML = `
                <div class="error-page">
                    <div class="error-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h2>خطأ في تحميل البيانات</h2>
                        <p>${error.message}</p>
                        <button onclick="adminRouter.navigate('admin/transactions')" class="btn btn-primary">
                            العودة لقائمة المعاملات
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Global router instance
window.adminRouter = new AdminRouter();

// Initialize router when DOM is ready or when admin user is authenticated
function initializeAdminRouter() {
    if (window.currentUser && window.currentUser.isAdmin && !window.adminRouter.isInitialized) {
        console.log('🚀 Initializing Admin Router for authenticated admin user');
        window.adminRouter.init();
    }
}

// Try to initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeAdminRouter);

// Also try to initialize when the page loads (in case DOM is already ready)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminRouter);
} else {
    initializeAdminRouter();
}

// Initialize when admin user becomes available (after login)
window.addEventListener('adminUserReady', initializeAdminRouter);

// Export for use in other modules
window.AdminRouter = AdminRouter;