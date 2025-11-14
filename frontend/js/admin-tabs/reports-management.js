// Admin Reports Management Tab
// Handles all reporting functionality

class ReportsManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
    }

    // Show reports management section
    async show() {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #ffc107;">
                        <i class="fas fa-chart-pie"></i> الصندوق - الملخص المالي
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <!-- Financial Summary Table -->
                <div class="financial-summary-section" style="margin-bottom: 30px;">
                    <div class="financial-summary-table">
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>البيان</th>
                                    <th>المبلغ (دينار كويتي)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="summary-row">
                                    <td class="summary-label">
                                        <i class="fas fa-coins text-success"></i>
                                        إجمالي الاشتراكات
                                    </td>
                                    <td class="summary-value" id="totalSubscriptions">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </td>
                                </tr>
                                <tr class="summary-row">
                                    <td class="summary-label">
                                        <i class="fas fa-hand-holding-usd text-warning"></i>
                                        القروض النشطة المتبقية
                                    </td>
                                    <td class="summary-value" id="totalActiveLoansRemaining">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </td>
                                </tr>
                                <tr class="summary-row calculation-row">
                                    <td class="summary-label">
                                        <i class="fas fa-calculator text-secondary"></i>
                                        الرصيد المحسوب
                                    </td>
                                    <td class="summary-value" id="calculatedBalance">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </td>
                                </tr>
                                <tr class="summary-row bank-row">
                                    <td class="summary-label">
                                        <i class="fas fa-university text-success"></i>
                                        إجمالي أرصدة البنوك المسجلة
                                    </td>
                                    <td class="summary-value" id="totalBanksBalanceSummary">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </td>
                                </tr>
                                <tr class="summary-row difference-auto-row">
                                    <td class="summary-label">
                                        <i class="fas fa-balance-scale"></i>
                                        الفرق (البنوك المسجلة - المحسوب)
                                    </td>
                                    <td class="summary-value" id="banksDifference">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="section-header" style="margin-top: 30px;">
                    <h3 style="color: #17a2b8;">
                        <i class="fas fa-chart-bar"></i> التقارير التفصيلية
                    </h3>
                </div>
                
                <div class="reports-grid">
                    <div class="report-card" onclick="reportsManagement.generateReport('users')">
                        <div class="report-icon users">
                            <i class="fas fa-users"></i>
                        </div>
                        <h4>تقرير الأعضاء</h4>
                        <p>قائمة شاملة بجميع الأعضاء مع الرصيد وحدود القروض</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                    
                    <div class="report-card" onclick="reportsManagement.generateReport('loans')">
                        <div class="report-icon loans">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <h4>تقرير القروض</h4>
                        <p>تفاصيل جميع طلبات القروض مع حالة الموافقة والمبالغ</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                    
                    <div class="report-card" onclick="reportsManagement.generateReport('transactions')">
                        <div class="report-icon transactions">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <h4>تقرير المعاملات</h4>
                        <p>سجل المعاملات المالية مع تصنيف الأنواع والحالات</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                    
                    <div class="report-card" onclick="reportsManagement.generateReport('financial')">
                        <div class="report-icon financial">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <h4>التقرير المالي الشامل</h4>
                        <p>ملخص الوضع المالي العام مع المؤشرات الرئيسية</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                    
                    <div class="report-card" onclick="reportsManagement.generateReport('monthly')">
                        <div class="report-icon monthly">
                            <i class="fas fa-calendar-month"></i>
                        </div>
                        <h4>التقرير الشهري</h4>
                        <p>نشاط الشهر الحالي والإحصائيات</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                    
                    <div class="report-card" onclick="reportsManagement.generateReport('active-loans')">
                        <div class="report-icon active-loans">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                        <h4>القروض النشطة</h4>
                        <p>القروض النشطة مع تقدم السداد والمبالغ المتبقية</p>
                        <button class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> عرض التقرير
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Load financial summary data
        await this.loadFinancialSummary();
    }

    // Load financial summary data (moved from admin dashboard)
    async loadFinancialSummary() {
        try {
            console.log('🔄 Loading financial summary in Treasury tab...');
            const result = await apiCall('/admin/financial-summary');
            console.log('📊 Financial summary result:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Update financial summary elements
                const totalSubscriptionsEl = document.getElementById('totalSubscriptions');
                const totalActiveLoansRemainingEl = document.getElementById('totalActiveLoansRemaining');
                const calculatedBalanceEl = document.getElementById('calculatedBalance');
                const totalBanksBalanceSummaryEl = document.getElementById('totalBanksBalanceSummary');
                const banksDifferenceEl = document.getElementById('banksDifference');
                
                if (totalSubscriptionsEl) {
                    totalSubscriptionsEl.textContent = this.formatCurrency(data.totalSubscriptions || 0);
                }
                
                if (totalActiveLoansRemainingEl) {
                    totalActiveLoansRemainingEl.textContent = this.formatCurrency(data.totalActiveLoansRemaining || 0);
                }
                
                // Use calculated balance from backend (more accurate)
                const calculatedBalance = data.calculatedBalance || 0;
                if (calculatedBalanceEl) {
                    calculatedBalanceEl.textContent = this.formatCurrency(calculatedBalance);
                }
                
                // Total banks balance (from banks table)
                const totalBanksBalance = data.totalBanksBalance || 0;
                if (totalBanksBalanceSummaryEl) {
                    totalBanksBalanceSummaryEl.textContent = this.formatCurrency(totalBanksBalance);
                }
                
                // Calculate difference: registered banks - calculated
                const difference = totalBanksBalance - calculatedBalance;
                if (banksDifferenceEl) {
                    banksDifferenceEl.textContent = this.formatCurrency(difference);
                    banksDifferenceEl.classList.remove('positive', 'negative', 'zero');
                    
                    if (difference > 0) {
                        banksDifferenceEl.classList.add('positive');
                    } else if (difference < 0) {
                        banksDifferenceEl.classList.add('negative');
                    } else {
                        banksDifferenceEl.classList.add('zero');
                    }
                }
                
                console.log('Financial summary loaded in Treasury tab:', data);
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
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Generate report
    async generateReport(type) {
        showToast(`جاري إنشاء تقرير ${this.getReportTitle(type)}...`, 'info');
        
        try {
            switch (type) {
                case 'users':
                    await this.generateUsersReport();
                    break;
                case 'loans':
                    await this.generateLoansReport();
                    break;
                case 'transactions':
                    await this.generateTransactionsReport();
                    break;
                case 'financial':
                    await this.generateFinancialReport();
                    break;
                case 'monthly':
                    await this.generateMonthlyReport();
                    break;
                case 'active-loans':
                    await this.generateActiveLoansReport();
                    break;
                default:
                    showToast('نوع التقرير غير مدعوم', 'error');
            }
        } catch (error) {
            console.error('Report generation error:', error);
            showToast(`خطأ في إنشاء التقرير: ${error.message}`, 'error');
        }
    }

    // Get report title
    getReportTitle(type) {
        const titles = {
            'users': 'الأعضاء',
            'loans': 'القروض',
            'transactions': 'المعاملات',
            'financial': 'المالي الشامل',
            'monthly': 'الشهري',
            'active-loans': 'القروض النشطة'
        };
        return titles[type] || type;
    }

    // Generate Users Report
    async generateUsersReport() {
        const result = await apiCall('/admin/users');
        const users = result.users;
        
        const reportHtml = this.generateUsersReportHtml(users);
        this.displayReport('تقرير الأعضاء', reportHtml);
    }

    // Generate users report HTML
    generateUsersReportHtml(users) {
        const activeUsers = users.filter(u => !u.is_blocked && u.joining_fee_approved === 'approved').length;
        const blockedUsers = users.filter(u => u.is_blocked).length;
        const pendingUsers = users.filter(u => u.joining_fee_approved === 'pending').length;
        const totalBalance = users.reduce((sum, user) => sum + parseFloat(user.balance || 0), 0);
        const totalActiveLoans = users.reduce((sum, user) => sum + parseFloat(user.current_loan_amount || 0), 0);

        return `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-users"></i> تقرير الأعضاء</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                
                <div class="report-summary">
                    <h3>ملخص الإحصائيات</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${users.length}</div>
                            <div class="stat-label">إجمالي الأعضاء</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${activeUsers}</div>
                            <div class="stat-label">الأعضاء النشطين</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${pendingUsers}</div>
                            <div class="stat-label">الأعضاء المعلقين</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${blockedUsers}</div>
                            <div class="stat-label">الأعضاء المحظورين</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${formatCurrency(totalBalance)}</div>
                            <div class="stat-label">إجمالي الأرصدة</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${formatCurrency(totalActiveLoans)}</div>
                            <div class="stat-label">إجمالي القروض النشطة</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-table">
                    <h3>تفاصيل الأعضاء</h3>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>المعرف</th>
                                <th>الاسم</th>
                                <th>النوع</th>
                                <th>البريد الإلكتروني</th>
                                <th>الرصيد</th>
                                <th>القرض النشط</th>
                                <th>تاريخ التسجيل</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.user_id}</td>
                                    <td>${user.Aname}</td>
                                    <td>${user.user_type === 'employee' ? 'عضو' : 'إداري'}</td>
                                    <td>${user.email || '-'}</td>
                                    <td>${formatCurrency(user.balance)}</td>
                                    <td>${formatCurrency(user.current_loan_amount || 0)}</td>
                                    <td>${Utils.formatDate(user.registration_date)}</td>
                                    <td>
                                        ${user.is_blocked ? 'محظور' : 
                                          user.joining_fee_approved === 'approved' ? 'نشط' : 'معلق'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Generate Loans Report
    async generateLoansReport() {
        const result = await apiCall('/admin/all-loans');
        const loans = result.loans;
        
        const reportHtml = this.generateLoansReportHtml(loans);
        this.displayReport('تقرير القروض', reportHtml);
    }

    // Generate loans report HTML
    generateLoansReportHtml(loans) {
        const pendingLoans = loans.filter(l => l.status === 'pending').length;
        const approvedLoans = loans.filter(l => l.status === 'approved').length;
        const rejectedLoans = loans.filter(l => l.status === 'rejected').length;
        const totalAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0);
        const approvedAmount = loans.filter(l => l.status === 'approved')
            .reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0);
        const totalRemainingAmount = loans.filter(l => l.status === 'approved')
            .reduce((sum, loan) => sum + parseFloat(loan.remaining_amount || 0), 0);

        return `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-money-bill-wave"></i> تقرير القروض</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                
                <div class="report-summary">
                    <h3>ملخص القروض</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${loans.length}</div>
                            <div class="stat-label">إجمالي الطلبات</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${pendingLoans}</div>
                            <div class="stat-label">الطلبات المعلقة</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${approvedLoans}</div>
                            <div class="stat-label">الطلبات الموافق عليها</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${rejectedLoans}</div>
                            <div class="stat-label">الطلبات المرفوضة</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${formatCurrency(totalAmount)}</div>
                            <div class="stat-label">إجمالي المبالغ المطلوبة</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${formatCurrency(approvedAmount)}</div>
                            <div class="stat-label">المبالغ الموافق عليها</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${formatCurrency(totalRemainingAmount)}</div>
                            <div class="stat-label">إجمالي المبالغ المتبقية</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-table">
                    <h3>تفاصيل طلبات القروض</h3>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>رقم الطلب</th>
                                <th>المقترض</th>
                                <th>مبلغ القرض</th>
                                <th>القسط الشهري</th>
                                <th>القرض</th>
                                <th>الحالة</th>
                                <th>تاريخ الطلب</th>
                                <th>معالج بواسطة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loans.map(loan => `
                                <tr>
                                    <td>${loan.loan_id}</td>
                                    <td>${loan.full_name}</td>
                                    <td>${formatCurrency(loan.loan_amount)}</td>
                                    <td>${formatCurrency(loan.installment_amount)}</td>
                                    <td>${loan.status === 'approved' ? formatCurrency(loan.remaining_amount || loan.loan_amount) : '-'}</td>
                                    <td>
                                        ${loan.status === 'pending' ? 'معلق' :
                                          loan.status === 'approved' ? 'موافق' : 'مرفوض'}
                                    </td>
                                    <td>${new Date(loan.request_date).toLocaleDateString('en-US')}</td>
                                    <td>${loan.admin_name || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Generate other reports (simplified for now)
    async generateTransactionsReport() {
        const result = await apiCall('/admin/all-transactions');
        const transactions = result.transactions;
        
        const reportHtml = `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-exchange-alt"></i> تقرير المعاملات</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                <div class="report-summary">
                    <p>إجمالي المعاملات: ${transactions.length}</p>
                </div>
            </div>
        `;
        
        this.displayReport('تقرير المعاملات', reportHtml);
    }

    async generateFinancialReport() {
        const reportHtml = `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-chart-pie"></i> التقرير المالي الشامل</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                <div class="report-summary">
                    <p>التقرير المالي الشامل - قيد التطوير</p>
                </div>
            </div>
        `;
        
        this.displayReport('التقرير المالي الشامل', reportHtml);
    }

    async generateMonthlyReport() {
        const reportHtml = `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-calendar-month"></i> التقرير الشهري</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                <div class="report-summary">
                    <p>التقرير الشهري - قيد التطوير</p>
                </div>
            </div>
        `;
        
        this.displayReport('التقرير الشهري', reportHtml);
    }

    async generateActiveLoansReport() {
        const reportHtml = `
            <div class="report-content">
                <div class="report-header">
                    <h2><i class="fas fa-hand-holding-usd"></i> تقرير القروض النشطة</h2>
                    <p class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
                </div>
                <div class="report-summary">
                    <p>تقرير القروض النشطة - قيد التطوير</p>
                </div>
            </div>
        `;
        
        this.displayReport('تقرير القروض النشطة', reportHtml);
    }

    // Display report in a new window/modal
    displayReport(title, htmlContent) {
        // Get brand name from global brandConfig or use fallback
        const brandName = (typeof brandConfig !== 'undefined' && brandConfig?.brand?.displayName) || 'نظام إدارة القروض';
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - ${brandName}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        direction: rtl;
                        margin: 0;
                        padding: 20px;
                        background: #f8f9fa;
                    }
                    .report-content {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .report-header {
                        text-align: center;
                        border-bottom: 3px solid #007bff;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .report-header h2 {
                        color: #007bff;
                        margin: 0;
                        font-size: 28px;
                    }
                    .report-date {
                        color: #6c757d;
                        margin: 10px 0 0;
                    }
                    .report-summary {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 30px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-top: 20px;
                    }
                    .stat-item {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        text-align: center;
                        border: 1px solid #dee2e6;
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #007bff;
                        margin-bottom: 5px;
                    }
                    .stat-label {
                        color: #6c757d;
                        font-size: 14px;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    .print-table th,
                    .print-table td {
                        border: 1px solid #dee2e6;
                        padding: 12px 8px;
                        text-align: center;
                    }
                    .print-table th {
                        background: #007bff;
                        color: white;
                        font-weight: bold;
                    }
                    .print-table tbody tr:nth-child(even) {
                        background: #f8f9fa;
                    }
                    .action-buttons {
                        text-align: center;
                        margin: 30px 0;
                        page-break-inside: avoid;
                    }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        margin: 0 10px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        text-decoration: none;
                        font-weight: bold;
                    }
                    .btn-primary {
                        background: #007bff;
                        color: white;
                    }
                    .btn-success {
                        background: #28a745;
                        color: white;
                    }
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .action-buttons { display: none; }
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> طباعة التقرير
                    </button>
                    <button class="btn btn-success" onclick="downloadReport()">
                        <i class="fas fa-download"></i> تحميل التقرير
                    </button>
                </div>
                
                <script>
                    function downloadReport() {
                        const element = document.querySelector('.report-content');
                        const opt = {
                            margin: 1,
                            filename: '${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2 },
                            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                        };
                        // Note: This would need html2pdf library
                        alert('تحميل التقرير - يتطلب مكتبة إضافية');
                    }
                </script>
            </body>
            </html>
        `;

        // Open report in new window
        const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        if (reportWindow) {
            reportWindow.document.write(fullHtml);
            reportWindow.document.close();
            showToast('تم فتح التقرير في نافذة جديدة', 'success');
        } else {
            // Fallback to modal if popup blocked
            showModal(title, htmlContent);
        }
    }
}

// Global instance
window.reportsManagement = null;