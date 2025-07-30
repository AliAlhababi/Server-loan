/**
 * Family Delegations Management Tab
 * Handles admin approval/rejection of family delegation requests with unified patterns
 */
class FamilyDelegationsManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.pendingDelegations = [];
        this.allDelegations = [];
        this.currentView = 'pending'; // 'pending' or 'all'
    }

    // Load family delegations management interface
    async load() {
        try {
            console.log('Loading family delegations management...');
            
            // Load data concurrently
            await Promise.all([
                this.loadPendingDelegations(),
                this.loadAllDelegations()
            ]);
            
            // Generate interface
            const content = this.generateInterface();
            this.adminDashboard.contentArea.innerHTML = content;
            
            // Setup event handlers
            this.setupEventHandlers();
            
            console.log('Family delegations management loaded successfully');
        } catch (error) {
            console.error('Error loading family delegations management:', error);
            this.adminDashboard.contentArea.innerHTML = this.generateErrorState(error.message);
        }
    }

    // Load pending delegation requests using unified API helper
    async loadPendingDelegations() {
        try {
            const data = await apiCall('/admin/pending-family-delegations');
            this.pendingDelegations = data.delegations || [];
            console.log('Loaded pending delegations:', this.pendingDelegations.length);
            console.log('Sample delegation data:', this.pendingDelegations[0]);
        } catch (error) {
            console.error('خطأ في جلب طلبات التفويض المعلقة:', error);
            this.pendingDelegations = [];
            throw error;
        }
    }

    // Load all delegation requests using unified API helper
    async loadAllDelegations() {
        try {
            const data = await apiCall('/admin/all-family-delegations');
            this.allDelegations = data.delegations || [];
            console.log('Loaded all delegations:', this.allDelegations.length);
        } catch (error) {
            console.error('خطأ في جلب جميع التفويضات:', error);
            this.allDelegations = [];
            throw error;
        }
    }

    // Generate management interface
    generateInterface() {
        return `
            <div class="family-delegations-management">
                <div class="section-header">
                    <h3><i class="fas fa-handshake"></i> إدارة التفويض العائلي</h3>
                    <div class="view-toggle">
                        <button class="toggle-btn ${this.currentView === 'pending' ? 'active' : ''}" 
                                data-view="pending">
                            <i class="fas fa-clock"></i>
                            المعلقة (${this.pendingDelegations.length})
                        </button>
                        <button class="toggle-btn ${this.currentView === 'all' ? 'active' : ''}" 
                                data-view="all">
                            <i class="fas fa-list"></i>
                            جميع الطلبات (${this.allDelegations.length})
                        </button>
                    </div>
                </div>

                <div class="delegations-content">
                    ${this.currentView === 'pending' ? this.generatePendingView() : this.generateAllView()}
                </div>
            </div>
        `;
    }

    // Generate pending delegations view
    generatePendingView() {
        if (this.pendingDelegations.length === 0) {
            return this.generateEmptyState(
                'fa-check-circle',
                'لا توجد طلبات معلقة',
                'جميع طلبات التفويض العائلي تم معالجتها',
                '#28a745'
            );
        }

        // Group by delegation type for better organization
        const familyHeadRequests = this.pendingDelegations.filter(d => d.delegation_type === 'family_head_request');
        const memberDelegations = this.pendingDelegations.filter(d => d.delegation_type === 'member_delegation');

        return `
            <div class="pending-delegations">
                ${familyHeadRequests.length > 0 ? `
                    <div class="delegation-group">
                        <h4 class="group-header">
                            <i class="fas fa-user-shield"></i>
                            طلبات رب الأسرة (${familyHeadRequests.length})
                        </h4>
                        <div class="delegations-grid">
                            ${familyHeadRequests.map(delegation => this.generateDelegationCard(delegation, true)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${memberDelegations.length > 0 ? `
                    <div class="delegation-group">
                        <h4 class="group-header">
                            <i class="fas fa-users"></i>
                            طلبات انضمام للعائلة (${memberDelegations.length})
                        </h4>
                        <div class="delegations-grid">
                            ${memberDelegations.map(delegation => this.generateDelegationCard(delegation, true)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Generate all delegations view
    generateAllView() {
        if (this.allDelegations.length === 0) {
            return this.generateEmptyState(
                'fa-handshake',
                'لا توجد طلبات تفويض',
                'لم يتم تقديم أي طلبات تفويض عائلي بعد',
                '#6c757d'
            );
        }

        // Group by status for better visualization
        const statusGroups = this.allDelegations.reduce((groups, delegation) => {
            const status = delegation.delegation_status;
            if (!groups[status]) groups[status] = [];
            groups[status].push(delegation);
            return groups;
        }, {});

        // Define status order for consistent display
        const statusOrder = ['pending', 'approved', 'rejected', 'revoked'];
        
        return `
            <div class="all-delegations">
                ${statusOrder.map(status => {
                    const delegations = statusGroups[status] || [];
                    if (delegations.length === 0) return '';
                    
                    return `
                        <div class="status-group">
                            <h4 class="status-header ${status}">
                                <i class="fas ${this.getStatusIcon(status)}"></i>
                                ${this.getStatusLabel(status)} (${delegations.length})
                            </h4>
                            <div class="delegations-grid">
                                ${delegations.map(delegation => this.generateDelegationCard(delegation, false)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Generate individual delegation card
    generateDelegationCard(delegation, showActions = false) {
        console.log('Generating delegation card for:', delegation.delegation_id, delegation);
        
        const statusClass = delegation.delegation_status;
        const statusLabel = this.getStatusLabel(delegation.delegation_status);
        const delegationType = delegation.delegation_type;
        const isHeadRequest = delegationType === 'family_head_request';
        
        return `
            <div class="delegation-card ${statusClass} ${delegationType}" data-delegation-id="${delegation.delegation_id}">
                <div class="card-header">
                    <div class="delegation-info">
                        <div class="delegation-title">
                            <i class="fas ${isHeadRequest ? 'fa-user-shield' : 'fa-handshake'}"></i>
                            ${isHeadRequest ? 'طلب رب أسرة' : 'طلب انضمام عائلي'}
                        </div>
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="delegation-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${new Date(delegation.created_date).toLocaleDateString('ar-SA')}
                    </div>
                </div>

                <div class="delegation-details">
                    ${isHeadRequest ? 
                        this.generateHeadRequestDetails(delegation) : 
                        this.generateMemberDelegationDetails(delegation)
                    }
                    
                    ${delegation.notes ? `
                        <div class="detail-section">
                            <label><i class="fas fa-sticky-note"></i> ملاحظات الطلب:</label>
                            <p class="notes">${delegation.notes}</p>
                        </div>
                    ` : ''}

                    ${delegation.admin_notes ? `
                        <div class="detail-section">
                            <label><i class="fas fa-user-shield"></i> ملاحظات الإدارة:</label>
                            <p class="admin-notes">${delegation.admin_notes}</p>
                        </div>
                    ` : ''}

                    ${delegation.admin_name ? `
                        <div class="detail-section">
                            <div class="admin-info">
                                <div class="admin-details">
                                    <label><i class="fas fa-user-cog"></i> تمت المعالجة بواسطة:</label>
                                    <span>${delegation.admin_name}</span>
                                </div>
                                ${delegation.approved_date ? `
                                    <div class="admin-details">
                                        <label><i class="fas fa-clock"></i> تاريخ المعالجة:</label>
                                        <span>${new Date(delegation.approved_date).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>

                ${showActions ? this.generateCardActions(delegation) : ''}
            </div>
        `;
    }

    // Generate head request specific details
    generateHeadRequestDetails(delegation) {
        return `
            <div class="detail-section">
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="user-details">
                        <h6>${delegation.head_name}</h6>
                        <small>معرف المستخدم: ${delegation.family_head_id}</small>
                        <small class="balance">الرصيد: ${formatCurrency(delegation.head_balance)}</small>
                    </div>
                </div>
                <div class="request-summary">
                    <p><i class="fas fa-info-circle"></i> يطلب المستخدم أن يصبح رب أسرة لإدارة الحسابات العائلية</p>
                </div>
            </div>
        `;
    }

    // Generate member delegation specific details
    generateMemberDelegationDetails(delegation) {
        return `
            <div class="detail-section">
                <div class="delegation-relationship">
                    <div class="user-info">
                        <div class="user-avatar head">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="user-details">
                            <label>رب الأسرة:</label>
                            <h6>${delegation.head_name}</h6>
                            <small>معرف: ${delegation.family_head_id}</small>
                            <small class="balance">الرصيد: ${formatCurrency(delegation.head_balance)}</small>
                        </div>
                    </div>
                    
                    <div class="relationship-arrow">
                        <i class="fas fa-arrow-left"></i>
                    </div>
                    
                    <div class="user-info">
                        <div class="user-avatar member">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <label>العضو المفوض:</label>
                            <h6>${delegation.member_name}</h6>
                            <small>معرف: ${delegation.family_member_id}</small>
                            <small class="balance">الرصيد: ${formatCurrency(delegation.member_balance)}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate card actions for pending delegations
    generateCardActions(delegation) {
        const isHeadRequest = delegation.delegation_type === 'family_head_request';
        const actionText = isHeadRequest ? 'طلب رب الأسرة' : 'طلب التفويض';
        
        return `
            <div class="card-actions">
                <button class="action-btn success approve-btn" 
                        data-delegation-id="${delegation.delegation_id}"
                        data-delegation-type="${delegation.delegation_type}"
                        data-head-name="${delegation.head_name}"
                        data-member-name="${delegation.member_name}">
                    <i class="fas fa-check"></i> موافقة على ${actionText}
                </button>
                <button class="action-btn danger reject-btn" 
                        data-delegation-id="${delegation.delegation_id}"
                        data-delegation-type="${delegation.delegation_type}"
                        data-head-name="${delegation.head_name}"
                        data-member-name="${delegation.member_name}">
                    <i class="fas fa-times"></i> رفض ${actionText}
                </button>
            </div>
        `;
    }

    // Generate empty state
    generateEmptyState(icon, title, description, color = '#6c757d') {
        return `
            <div class="empty-state">
                <i class="fas ${icon}" style="font-size: 48px; color: ${color}; margin-bottom: 20px;"></i>
                <h4>${title}</h4>
                <p>${description}</p>
            </div>
        `;
    }

    // Generate error state
    generateErrorState(errorMessage) {
        return `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>خطأ في تحميل إدارة التفويض العائلي</h4>
                <p>${errorMessage}</p>
                <button class="action-btn primary" onclick="this.load()">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Get status icon
    getStatusIcon(status) {
        const icons = {
            pending: 'fa-clock',
            approved: 'fa-check-circle', 
            rejected: 'fa-times-circle',
            revoked: 'fa-ban'
        };
        return icons[status] || 'fa-question-circle';
    }

    // Get status label
    getStatusLabel(status) {
        const labels = {
            pending: 'معلق',
            approved: 'موافق عليه',
            rejected: 'مرفوض',
            revoked: 'ملغي'
        };
        return labels[status] || status;
    }

    // Setup event handlers
    setupEventHandlers() {
        // View toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view && view !== this.currentView) {
                    this.currentView = view;
                    this.load(); // Reload interface
                }
            });
        });

        // Approve buttons
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delegationId = e.currentTarget.dataset.delegationId;
                const delegationType = e.currentTarget.dataset.delegationType;
                const headName = e.currentTarget.dataset.headName;
                const memberName = e.currentTarget.dataset.memberName;
                
                console.log('Approve button clicked:', { delegationId, delegationType, headName, memberName });
                
                if (!delegationId) {
                    console.error('Delegation ID is missing!', e.currentTarget);
                    Utils.showToast('خطأ: معرف التفويض مفقود', 'error');
                    return;
                }
                
                this.showActionModal(delegationId, 'approve', delegationType, headName, memberName);
            });
        });

        // Reject buttons
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delegationId = e.currentTarget.dataset.delegationId;
                const delegationType = e.currentTarget.dataset.delegationType;
                const headName = e.currentTarget.dataset.headName;
                const memberName = e.currentTarget.dataset.memberName;
                
                console.log('Reject button clicked:', { delegationId, delegationType, headName, memberName });
                
                if (!delegationId) {
                    console.error('Delegation ID is missing!', e.currentTarget);
                    Utils.showToast('خطأ: معرف التفويض مفقود', 'error');
                    return;
                }
                
                this.showActionModal(delegationId, 'reject', delegationType, headName, memberName);
            });
        });
    }

    // Show action confirmation modal with enhanced UI
    showActionModal(delegationId, action, delegationType, headName, memberName) {
        const isHeadRequest = delegationType === 'family_head_request';
        const actionText = action === 'approve' ? 'موافقة على' : 'رفض';
        const requestType = isHeadRequest ? 'طلب رب الأسرة' : 'طلب التفويض العائلي';
        const actionColor = action === 'approve' ? 'success' : 'danger';
        const actionIcon = action === 'approve' ? 'fa-check' : 'fa-times';
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h4>
                        <i class="fas ${actionIcon}"></i>
                        ${actionText} ${requestType}
                    </h4>
                    <button class="close-btn">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="delegation-summary">
                        ${isHeadRequest ? `
                            <div class="summary-item">
                                <i class="fas fa-user-shield"></i>
                                <div>
                                    <strong>طالب رب الأسرة:</strong>
                                    <span>${headName}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="summary-item">
                                <i class="fas fa-user-shield"></i>
                                <div>
                                    <strong>رب الأسرة:</strong>
                                    <span>${headName}</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <i class="fas fa-user"></i>
                                <div>
                                    <strong>العضو المفوض:</strong>
                                    <span>${memberName}</span>
                                </div>
                            </div>
                        `}
                    </div>
                    
                    <div class="form-group">
                        <label for="adminNotes">
                            <i class="fas fa-sticky-note"></i>
                            ملاحظات الإدارة (اختياري):
                        </label>
                        <textarea id="adminNotes" rows="3" 
                                  placeholder="أدخل أي ملاحظات أو توضيحات إضافية..."
                                  class="form-control"></textarea>
                    </div>
                    
                    <div class="action-confirmation">
                        <i class="fas fa-info-circle"></i>
                        <span>
                            ${action === 'approve' 
                                ? `سيتم ${isHeadRequest ? 'منح المستخدم صلاحيات رب الأسرة' : 'تفعيل التفويض العائلي'} فور الموافقة`
                                : 'سيتم رفض الطلب نهائياً ولن يمكن التراجع عن هذا الإجراء'
                            }
                        </span>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="action-btn ${actionColor} confirm-btn" 
                            data-delegation-id="${delegationId}" 
                            data-action="${action}">
                        <i class="fas ${actionIcon}"></i>
                        تأكيد ${actionText}
                    </button>
                    <button class="action-btn secondary cancel-btn">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on textarea for better UX
        setTimeout(() => {
            const textarea = modal.querySelector('#adminNotes');
            if (textarea) textarea.focus();
        }, 100);
        
        // Setup modal event handlers
        this.setupModalEvents(modal, delegationId, action);
    }

    // Setup modal event handlers
    setupModalEvents(modal, delegationId, action) {
        // Close button
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Cancel button
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Confirm button
        modal.querySelector('.confirm-btn').addEventListener('click', async () => {
            const confirmBtn = modal.querySelector('.confirm-btn');
            const adminNotes = modal.querySelector('#adminNotes').value.trim();
            
            // Disable button and show loading
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            
            try {
                await this.processDelegationAction(delegationId, action, adminNotes);
                this.closeModal(modal);
            } catch (error) {
                // Re-enable button on error
                confirmBtn.disabled = false; 
                confirmBtn.innerHTML = `<i class="fas ${action === 'approve' ? 'fa-check' : 'fa-times'}"></i> تأكيد ${action === 'approve' ? 'الموافقة' : 'الرفض'}`;
            }
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Close modal
    closeModal(modal) {
        if (modal && modal.parentNode) {
            document.body.removeChild(modal);
        }
    }

    // Process delegation approval/rejection using unified API helper
    async processDelegationAction(delegationId, action, adminNotes) {
        try {
            const result = await apiCall(`/admin/family-delegation-action/${delegationId}`, 'POST', {
                action,
                adminNotes
            });
            
            Utils.showToast(result.message || 'تم معالجة الطلب بنجاح', 'success');
            
            // Reload data and interface
            await this.load();
            
            // Update admin dashboard stats if available
            if (this.adminDashboard.loadStats) {
                await this.adminDashboard.loadStats();
            }
            
        } catch (error) {
            console.error('Error processing delegation action:', error);
            Utils.showToast(error.message || 'خطأ في معالجة الطلب', 'error');
            throw error; // Re-throw to handle in modal
        }
    }
}

// Export for global use
window.FamilyDelegationsManagement = FamilyDelegationsManagement;