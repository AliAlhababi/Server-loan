// Admin Banks Management Tab
// Handles all bank-related admin functionality

class BanksManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.currentTab = 'list';
        this.banks = [];
        this.editingBankId = null;
    }

    // Show banks management section
    async show() {
        this.adminDashboard.contentArea.innerHTML = `
            <div class="management-section">
                <div class="section-header">
                    <h3 style="color: #28a745;">
                        <i class="fas fa-university"></i> إدارة البنوك
                    </h3>
                    <button onclick="adminDashboard.showMainView()" class="btn-back">
                        <i class="fas fa-arrow-right"></i> العودة
                    </button>
                </div>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="list">
                        <i class="fas fa-list"></i> قائمة البنوك
                    </button>
                    <button class="admin-tab" data-tab="add">
                        <i class="fas fa-plus"></i> إضافة بنك
                    </button>
                    <button class="admin-tab" data-tab="summary">
                        <i class="fas fa-chart-pie"></i> الملخص المالي
                    </button>
                </div>
                
                <div class="tab-content">
                    <div id="banks-tab-content" class="tab-panel active">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupTabListeners();
        await this.loadTab('list');
    }

    // Setup tab listeners
    setupTabListeners() {
        setTimeout(() => {
            const tabs = this.adminDashboard.contentArea.querySelectorAll('.admin-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabName = tab.getAttribute('data-tab');
                    this.switchTab(tabName);
                });
            });
        }, 100);
    }

    // Switch between tabs
    async switchTab(tabName) {
        // Update active tab
        const tabs = this.adminDashboard.contentArea.querySelectorAll('.admin-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        const activeTab = this.adminDashboard.contentArea.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');

        this.currentTab = tabName;
        await this.loadTab(tabName);
    }

    // Load specific tab content
    async loadTab(tabName) {
        const contentDiv = this.adminDashboard.contentArea.querySelector('#banks-tab-content');
        
        switch(tabName) {
            case 'list':
                await this.loadBanksList(contentDiv);
                break;
            case 'add':
                this.loadAddBankForm(contentDiv);
                break;
            case 'summary':
                await this.loadBanksSummary(contentDiv);
                break;
        }
    }

    // Load banks list
    async loadBanksList(container) {
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> جاري تحميل قائمة البنوك...
                </div>
            `;

            console.log('🔍 Making API call to /admin/banks...');
            const result = await apiCall('/admin/banks');
            console.log('📊 API call result:', result);

            if (result && result.success) {
                this.banks = result.banks || [];
                this.renderBanksList(container);
            } else {
                throw new Error(result?.message || 'فشل في تحميل قائمة البنوك');
            }
        } catch (error) {
            console.error('خطأ في تحميل البنوك:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    خطأ في تحميل قائمة البنوك: ${error.message}
                    <br><small>تحقق من صحة تسجيل الدخول أو تواصل مع الدعم الفني</small>
                </div>
            `;
        }
    }

    // Render banks list
    renderBanksList(container) {
        if (this.banks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-university fa-3x"></i>
                    <h4>لا توجد بنوك مسجلة</h4>
                    <p>لم يتم إضافة أي بنوك بعد. انقر على "إضافة بنك" لإضافة البنك الأول.</p>
                    <button onclick="banksManagement.switchTab('add')" class="btn btn-primary">
                        <i class="fas fa-plus"></i> إضافة بنك جديد
                    </button>
                </div>
            `;
            return;
        }

        const totalBalance = this.banks.reduce((sum, bank) => sum + parseFloat(bank.balance), 0);

        container.innerHTML = `
            <div class="banks-list-header">
                <div class="summary-card">
                    <div class="summary-info">
                        <span class="count">${this.banks.length}</span>
                        <span class="label">بنك مسجل</span>
                    </div>
                    <div class="summary-info">
                        <span class="amount">${FormatHelper.formatCurrency(totalBalance)}</span>
                        <span class="label">إجمالي الأرصدة</span>
                    </div>
                </div>
                <button onclick="banksManagement.switchTab('add')" class="btn btn-primary">
                    <i class="fas fa-plus"></i> إضافة بنك جديد
                </button>
            </div>
            
            <div class="banks-grid">
                ${this.banks.map(bank => this.renderBankCard(bank)).join('')}
            </div>
        `;
    }

    // Render individual bank card
    renderBankCard(bank) {
        const formattedDate = FormatHelper.formatDate(bank.created_at);
        
        return `
            <div class="bank-card">
                <div class="bank-header">
                    <div class="bank-icon">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="bank-info">
                        <h4 class="bank-name">${bank.bank_name}</h4>
                        <span class="bank-balance">${FormatHelper.formatCurrency(bank.balance)}</span>
                    </div>
                </div>
                
                ${bank.description ? `
                    <div class="bank-description">
                        <i class="fas fa-info-circle"></i>
                        ${bank.description}
                    </div>
                ` : ''}
                
                <div class="bank-meta">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>أُنشئ بواسطة: ${bank.created_by_admin_name || 'غير محدد'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>تاريخ الإنشاء: ${formattedDate}</span>
                    </div>
                </div>
                
                <div class="bank-actions">
                    <button onclick="banksManagement.editBank(${bank.bank_id})" class="btn btn-sm btn-secondary">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button onclick="banksManagement.deleteBank(${bank.bank_id}, '${bank.bank_name}')" class="btn btn-sm btn-danger">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    }

    // Load add/edit bank form
    loadAddBankForm(container, bank = null) {
        const isEditing = bank !== null;
        const title = isEditing ? 'تعديل البنك' : 'إضافة بنك جديد';
        
        container.innerHTML = `
            <div class="form-container">
                <h4><i class="fas fa-university"></i> ${title}</h4>
                
                <form id="bank-form" class="bank-form">
                    <div class="form-group">
                        <label for="bank_name">اسم البنك *</label>
                        <input type="text" id="bank_name" name="bank_name" required 
                               value="${bank ? bank.bank_name : ''}"
                               placeholder="مثال: البنك الأهلي الكويتي">
                    </div>
                    
                    <div class="form-group">
                        <label for="balance">الرصيد الحالي *</label>
                        <input type="number" id="balance" name="balance" required 
                               step="0.01" min="0"
                               value="${bank ? bank.balance : ''}"
                               placeholder="0.00">
                        <small class="form-help">ادخل الرصيد بالدينار الكويتي</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">وصف البنك</label>
                        <textarea id="description" name="description" rows="3"
                                  placeholder="وصف اختياري للبنك...">${bank ? (bank.description || '') : ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> ${isEditing ? 'حفظ التعديلات' : 'إضافة البنك'}
                        </button>
                        <button type="button" onclick="banksManagement.switchTab('list')" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Setup form handler
        setTimeout(() => {
            const form = container.querySelector('#bank-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (isEditing) {
                    this.updateBank(bank.bank_id);
                } else {
                    this.createBank();
                }
            });
        }, 100);
    }

    // Load banks summary
    async loadBanksSummary(container) {
        try {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> جاري تحميل الملخص المالي...
                </div>
            `;

            const result = await apiCall('/admin/banks-summary');

            if (result.success) {
                this.renderBanksSummary(container, result.summary);
            } else {
                throw new Error(result.message || 'فشل في تحميل الملخص المالي');
            }
        } catch (error) {
            console.error('خطأ في تحميل الملخص:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    خطأ في تحميل الملخص المالي: ${error.message}
                </div>
            `;
        }
    }

    // Render banks summary
    renderBanksSummary(container, summary) {
        container.innerHTML = `
            <div class="summary-section">
                <h4><i class="fas fa-chart-pie"></i> الملخص المالي للبنوك</h4>
                
                <div class="summary-cards">
                    <div class="summary-card large">
                        <div class="card-icon">
                            <i class="fas fa-university"></i>
                        </div>
                        <div class="card-content">
                            <h3>${summary.total_banks}</h3>
                            <p>إجمالي البنوك المسجلة</p>
                        </div>
                    </div>
                    
                    <div class="summary-card large primary">
                        <div class="card-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div class="card-content">
                            <h3>${FormatHelper.formatCurrency(summary.total_balance)}</h3>
                            <p>إجمالي أرصدة البنوك</p>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <div class="info-card">
                        <h5><i class="fas fa-info-circle"></i> معلومات مهمة</h5>
                        <ul>
                            <li>يتم استخدام أرصدة البنوك في حساب الملخص المالي الإجمالي للنظام</li>
                            <li>يمكن للإدارة إضافة وتعديل وحذف البنوك حسب الحاجة</li>
                            <li>يتم عرض الفرق بين الأرصدة المحسوبة والأرصدة الفعلية في لوحة التحكم</li>
                            <li>جميع العمليات يتم تسجيلها مع معلومات المشرف الذي قام بها</li>
                        </ul>
                    </div>
                </div>
                
                <button onclick="banksManagement.switchTab('list')" class="btn btn-primary">
                    <i class="fas fa-list"></i> عرض قائمة البنوك
                </button>
            </div>
        `;
    }

    // Create new bank
    async createBank() {
        try {
            const form = document.getElementById('bank-form');
            const formData = new FormData(form);
            
            const bankData = {
                bank_name: formData.get('bank_name').trim(),
                balance: parseFloat(formData.get('balance')),
                description: formData.get('description').trim()
            };

            // Validate data
            if (!bankData.bank_name) {
                throw new Error('اسم البنك مطلوب');
            }
            if (isNaN(bankData.balance) || bankData.balance < 0) {
                throw new Error('الرصيد يجب أن يكون رقماً صحيحاً أكبر من أو يساوي صفر');
            }

            const result = await apiCall('/admin/banks', 'POST', bankData);

            if (result.success) {
                Utils.showToast('تم إضافة البنك بنجاح', 'success');
                await this.switchTab('list');
            } else {
                throw new Error(result.message || 'فشل في إضافة البنك');
            }
        } catch (error) {
            console.error('خطأ في إضافة البنك:', error);
            Utils.showToast(`خطأ في إضافة البنك: ${error.message}`, 'error');
        }
    }

    // Edit bank
    async editBank(bankId) {
        try {
            const result = await apiCall(`/admin/banks/${bankId}`);

            if (result.success) {
                this.editingBankId = bankId;
                
                // Update active tab
                const tabs = this.adminDashboard.contentArea.querySelectorAll('.admin-tab');
                tabs.forEach(tab => tab.classList.remove('active'));
                const activeTab = this.adminDashboard.contentArea.querySelector(`[data-tab="add"]`);
                if (activeTab) activeTab.classList.add('active');
                
                this.currentTab = 'add';
                
                // Load the edit form directly
                const container = this.adminDashboard.contentArea.querySelector('#banks-tab-content');
                this.loadAddBankForm(container, result.bank);
            } else {
                throw new Error(result.message || 'فشل في تحميل بيانات البنك');
            }
        } catch (error) {
            console.error('خطأ في تحميل البنك:', error);
            Utils.showToast(`خطأ في تحميل البنك: ${error.message}`, 'error');
        }
    }

    // Update bank
    async updateBank(bankId) {
        try {
            const form = document.getElementById('bank-form');
            const formData = new FormData(form);
            
            const bankData = {
                bank_name: formData.get('bank_name').trim(),
                balance: parseFloat(formData.get('balance')),
                description: formData.get('description').trim()
            };

            // Validate data
            if (!bankData.bank_name) {
                throw new Error('اسم البنك مطلوب');
            }
            if (isNaN(bankData.balance) || bankData.balance < 0) {
                throw new Error('الرصيد يجب أن يكون رقماً صحيحاً أكبر من أو يساوي صفر');
            }

            const result = await apiCall(`/admin/banks/${bankId}`, 'PUT', bankData);

            if (result.success) {
                Utils.showToast('تم تحديث البنك بنجاح', 'success');
                this.editingBankId = null;
                await this.switchTab('list');
            } else {
                throw new Error(result.message || 'فشل في تحديث البنك');
            }
        } catch (error) {
            console.error('خطأ في تحديث البنك:', error);
            Utils.showToast(`خطأ في تحديث البنك: ${error.message}`, 'error');
        }
    }

    // Delete bank
    async deleteBank(bankId, bankName) {
        const confirmed = confirm(`هل أنت متأكد من حذف البنك "${bankName}"؟\n\nلن يتم حذف البنك نهائياً، بل سيتم إخفاؤه من القائمة.`);

        if (!confirmed) return;

        try {
            const result = await apiCall(`/admin/banks/${bankId}`, 'DELETE');

            if (result.success) {
                Utils.showToast(result.message, 'success');
                await this.loadTab('list');
            } else {
                throw new Error(result.message || 'فشل في حذف البنك');
            }
        } catch (error) {
            console.error('خطأ في حذف البنك:', error);
            Utils.showToast(`خطأ في حذف البنك: ${error.message}`, 'error');
        }
    }
}

// Make it globally available
window.BanksManagement = BanksManagement;