/**
 * Family Management Tab
 * Handles family delegation system with clean, consistent patterns
 */
class FamilyManagementTab {
    constructor() {
        this.familyStatus = null;
    }

    // Load family delegation data and render interface
    async load() {
        const familyContent = document.getElementById('familyContent');
        if (!familyContent) return;

        try {
            // Load family status
            await this.loadFamilyStatus();
            
            // Render appropriate view based on user's family status
            familyContent.innerHTML = this.generateInterface();
            
            // Setup event handlers
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات العائلة:', error);
            familyContent.innerHTML = this.generateErrorState(error.message);
        }
    }

    // Load user's family delegation status
    async loadFamilyStatus() {
        try {
            this.familyStatus = await apiCall('/family/status');
        } catch (error) {
            throw new Error(error.message || 'فشل في جلب حالة التفويض العائلي');
        }
    }

    // Generate main interface based on user's family status
    generateInterface() {
        if (this.familyStatus.isFamilyHead) {
            return this.generateFamilyHeadView();
        } else if (this.familyStatus.hasFamilyDelegation) {
            return this.generateFamilyMemberView();
        } else if (this.familyStatus.hasPendingHeadRequest) {
            return this.generatePendingHeadRequestView();
        } else {
            return this.generateNoFamilyView();
        }
    }

    // Generate view for approved family heads
    generateFamilyHeadView() {
        const familyMembers = this.familyStatus.familyMembers || [];
        
        return `
            <div class="family-head-container">
                <!-- Family Head Status Card -->
                <div class="loan-overview-card" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                    <div class="loan-header">
                        <div class="loan-icon">
                            <i class="fas fa-user-shield" style="font-size: 24px;"></i>
                        </div>
                        <div class="loan-info">
                            <h3>رب الأسرة</h3>
                            <p>يمكنك إدارة أفراد العائلة ودفع مدفوعاتهم</p>
                        </div>
                    </div>
                    <div class="loan-stats">
                        <div class="stat-item">
                            <span class="stat-value">${familyMembers.length}</span>
                            <span class="stat-label">أفراد العائلة</span>
                        </div>
                    </div>
                </div>

                <!-- Family Members Management -->
                <div class="user-info-card">
                    <div class="card-header">
                        <h4><i class="fas fa-users"></i> أفراد العائلة</h4>
                        <button class="action-btn primary" id="addFamilyMemberBtn">
                            <i class="fas fa-plus"></i> إضافة عضو
                        </button>
                    </div>
                    
                    ${familyMembers.length === 0 ? 
                        this.generateEmptyFamilyState() :
                        this.generateFamilyMembersList(familyMembers)
                    }
                </div>

                <!-- Payment Interface -->
                ${familyMembers.length > 0 ? this.generatePaymentInterface() : ''}
            </div>
        `;
    }

    // Generate view for family members under delegation
    generateFamilyMemberView() {
        const delegationInfo = this.familyStatus.delegationInfo;
        
        return `
            <div class="family-member-container">
                <!-- Delegation Status Card -->
                <div class="loan-overview-card" style="background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);">
                    <div class="loan-header">
                        <div class="loan-icon">
                            <i class="fas fa-handshake" style="font-size: 24px;"></i>
                        </div>
                        <div class="loan-info">
                            <h3>عضو في العائلة</h3>
                            <p>رب الأسرة: ${delegationInfo.head_name}</p>
                        </div>
                    </div>
                    <div class="loan-stats">
                        <div class="stat-item">
                            <span class="stat-value">نشط</span>
                            <span class="stat-label">حالة التفويض</span>
                        </div>
                    </div>
                </div>

                <!-- Delegation Details -->
                <div class="user-info-card">
                    <h4><i class="fas fa-info-circle"></i> معلومات التفويض العائلي</h4>
                    <div class="delegation-details">
                        <div class="detail-row">
                            <label>رب الأسرة:</label>
                            <span>${delegationInfo.head_name}</span>
                        </div>
                        <div class="detail-row">
                            <label>تاريخ التفويض:</label>
                            <span>${new Date(delegationInfo.created_date).toLocaleDateString('en-US')}</span>
                        </div>
                        <div class="detail-row">
                            <label>الحالة:</label>
                            <span class="status-badge approved">نشط</span>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="action-btn danger" id="revokeDelegationBtn" 
                                data-delegation-id="${delegationInfo.delegation_id}">
                            <i class="fas fa-times"></i> إلغاء التفويض
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate view for users with pending family head request
    generatePendingHeadRequestView() {
        const pendingRequest = this.familyStatus.pendingHeadRequest;
        
        return `
            <div class="pending-request-container">
                <!-- Pending Status Card -->
                <div class="loan-overview-card" style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);">
                    <div class="loan-header">
                        <div class="loan-icon">
                            <i class="fas fa-clock" style="font-size: 24px;"></i>
                        </div>
                        <div class="loan-info">
                            <h3>طلب رب الأسرة معلق</h3>
                            <p>في انتظار موافقة الإدارة</p>
                        </div>
                    </div>
                    <div class="loan-stats">
                        <div class="stat-item">
                            <span class="stat-value">معلق</span>
                            <span class="stat-label">الحالة</span>
                        </div>
                    </div>
                </div>

                <!-- Request Details -->
                <div class="user-info-card">
                    <h4><i class="fas fa-file-alt"></i> تفاصيل الطلب</h4>
                    <div class="request-details">
                        <div class="detail-row">
                            <label>تاريخ الطلب:</label>
                            <span>${new Date(pendingRequest.created_date).toLocaleDateString('en-US')}</span>
                        </div>
                        <div class="detail-row">
                            <label>الحالة:</label>
                            <span class="status-badge pending">معلق</span>
                        </div>
                        ${pendingRequest.notes ? `
                            <div class="detail-row">
                                <label>الملاحظات:</label>
                                <p class="notes">${pendingRequest.notes}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-actions">
                        <button class="action-btn danger" id="cancelHeadRequestBtn" 
                                data-delegation-id="${pendingRequest.delegation_id}">
                            <i class="fas fa-times"></i> إلغاء الطلب
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate view for users with no family delegation
    generateNoFamilyView() {
        return `
            <div class="no-family-container">
                <!-- Welcome Card -->
                <div class="user-info-card text-center">
                    <div class="welcome-section">
                        <i class="fas fa-users" style="font-size: 48px; color: #6c757d; margin-bottom: 16px;"></i>
                        <h4>التفويض العائلي</h4>
                        <p>نظام يتيح لرب الأسرة إدارة المدفوعات نيابة عن أفراد العائلة</p>
                    </div>
                    
                    <!-- Action Options -->
                    <div class="family-options">
                        <div class="option-card" id="requestFamilyHeadBtn">
                            <div class="option-icon">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div class="option-content">
                                <h5>أصبح رب أسرة</h5>
                                <p>يمكنك إضافة أفراد العائلة ودفع مدفوعاتهم</p>
                            </div>
                        </div>
                        
                        <div class="option-card" id="requestJoinFamilyBtn">
                            <div class="option-icon">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <div class="option-content">
                                <h5>انضم لأسرة موجودة</h5>
                                <p>اطلب من رب الأسرة إدارة حسابك</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-note">
                        <i class="fas fa-info-circle"></i>
                        <span>جميع طلبات التفويض العائلي تتطلب موافقة الإدارة</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate empty family state
    generateEmptyFamilyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-user-plus" style="font-size: 32px; color: #6c757d; margin-bottom: 12px;"></i>
                <h5>لا يوجد أفراد عائلة</h5>
                <p>ابدأ بإضافة أعضاء جدد للعائلة</p>
            </div>
        `;
    }

    // Generate family members list
    generateFamilyMembersList(familyMembers) {
        return `
            <div class="family-members-list">
                ${familyMembers.map(member => this.generateFamilyMemberCard(member)).join('')}
            </div>
        `;
    }

    // Generate individual family member card
    generateFamilyMemberCard(member) {
        const hasLoan = member.loan_id && member.loan_status === 'approved' && !member.loan_closed_date;
        const loanProgress = hasLoan ? Math.round((parseFloat(member.total_paid) / parseFloat(member.loan_amount)) * 100) : 0;
        
        return `
            <div class="member-card">
                <div class="member-info">
                    <div class="member-details">
                        <h6>${member.member_name}</h6>
                        <small>معرف المستخدم: ${member.family_member_id}</small>
                        <small>الرصيد: ${formatCurrency(member.member_balance)}</small>
                    </div>
                    <div class="member-status">
                        <span class="status-badge approved">نشط</span>
                    </div>
                </div>
                
                ${hasLoan ? `
                    <div class="member-loan-info">
                        <div class="loan-overview-card" style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); margin: 12px 0; padding: 16px; border-radius: 8px;">
                            <div class="loan-header">
                                <div class="loan-icon">
                                    <i class="fas fa-hand-holding-usd" style="font-size: 18px; color: white;"></i>
                                </div>
                                <div class="loan-info">
                                    <h6 style="color: white; margin: 0;">قرض نشط</h6>
                                    <small style="color: rgba(255,255,255,0.8);">القرض #${member.loan_id}</small>
                                </div>
                            </div>
                            <div class="loan-stats" style="margin-top: 12px;">
                                <div class="stat-row">
                                    <div class="stat-item">
                                        <span class="stat-value" style="color: white;">${formatCurrency(member.loan_amount)}</span>
                                        <span class="stat-label" style="color: rgba(255,255,255,0.8);">إجمالي القرض</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value" style="color: white;">${formatCurrency(member.total_paid)}</span>
                                        <span class="stat-label" style="color: rgba(255,255,255,0.8);">المسدد</span>
                                    </div>
                                </div>
                                <div class="stat-row">
                                    <div class="stat-item">
                                        <span class="stat-value" style="color: white;">${formatCurrency(member.remaining_amount)}</span>
                                        <span class="stat-label" style="color: rgba(255,255,255,0.8);">المتبقي</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value" style="color: white;">${loanProgress}%</span>
                                        <span class="stat-label" style="color: rgba(255,255,255,0.8);">مكتمل</span>
                                    </div>
                                </div>
                                <div class="loan-progress" style="margin-top: 8px;">
                                    <div class="progress-bar" style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                                        <div class="progress-fill" style="background: white; height: 100%; width: ${loanProgress}%; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="member-actions">
                    <button class="action-btn primary small pay-subscription-btn" 
                            data-member-id="${member.family_member_id}" 
                            data-member-name="${member.member_name}">
                        <i class="fas fa-credit-card"></i> دفع اشتراك
                    </button>
                    ${hasLoan ? `
                        <button class="action-btn secondary small pay-loan-btn" 
                                data-member-id="${member.family_member_id}" 
                                data-member-name="${member.member_name}"
                                data-loan-id="${member.loan_id}"
                                data-installment="${member.installment_amount}">
                            <i class="fas fa-hand-holding-usd"></i> دفع قسط (${formatCurrency(member.installment_amount)})
                        </button>
                    ` : ''}
                    <button class="action-btn danger small remove-member-btn" 
                            data-delegation-id="${member.delegation_id}"
                            data-member-name="${member.member_name}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Generate payment interface
    generatePaymentInterface() {
        return `
            <div class="user-info-card" id="paymentInterface" style="display: none;">
                <h4><i class="fas fa-money-bill-wave"></i> دفع نيابة عن العضو</h4>
                
                <form id="familyPaymentForm">
                    <div class="form-group">
                        <label>العضو:</label>
                        <select id="selectedMember" required>
                            <option value="">اختر العضو</option>
                            ${this.familyStatus.familyMembers.map(member => 
                                `<option value="${member.family_member_id}">${member.member_name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>نوع الدفع:</label>
                        <select id="paymentType" required>
                            <option value="">اختر نوع الدفع</option>
                            <option value="subscription">اشتراك شهري</option>
                            <option value="loan">دفعة قرض</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="loanSelectGroup" style="display: none;">
                        <label>القرض:</label>
                        <select id="selectedLoan">
                            <option value="">اختر القرض</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>المبلغ (د.ك):</label>
                        <input type="number" id="paymentAmount" step="0.001" min="0.001" required>
                    </div>
                    
                    <div class="form-group">
                        <label>ملاحظات:</label>
                        <textarea id="paymentMemo" rows="2" placeholder="ملاحظات إضافية (اختياري)"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="action-btn primary">
                            <i class="fas fa-paper-plane"></i> إرسال الدفعة
                        </button>
                        <button type="button" class="action-btn secondary" id="cancelPaymentBtn">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Generate error state
    generateErrorState(errorMessage) {
        return `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>خطأ في تحميل بيانات العائلة</h4>
                <p>${errorMessage}</p>
                <button class="action-btn primary" onclick="this.load()">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    // Setup all event handlers
    setupEventHandlers() {
        // Family head actions
        this.setupFamilyHeadEvents();
        
        // Family member actions  
        this.setupFamilyMemberEvents();
        
        // No family actions
        this.setupNoFamilyEvents();
        
        // Pending request actions
        this.setupPendingRequestEvents();
        
        // Payment interface
        this.setupPaymentEvents();
    }

    // Setup family head event handlers
    setupFamilyHeadEvents() {
        const addMemberBtn = document.getElementById('addFamilyMemberBtn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => this.showAddMemberModal());
        }

        // Payment buttons
        document.querySelectorAll('.pay-subscription-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.dataset.memberId;
                const memberName = e.target.dataset.memberName;
                this.showPaymentInterface(memberId, memberName, 'subscription');
            });
        });

        document.querySelectorAll('.pay-loan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.dataset.memberId;
                const memberName = e.target.dataset.memberName;
                const loanId = e.target.dataset.loanId;
                const installment = e.target.dataset.installment;
                this.showPaymentInterface(memberId, memberName, 'loan', { loanId, installment });
            });
        });

        // Remove member buttons
        document.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delegationId = e.target.dataset.delegationId;
                const memberName = e.target.dataset.memberName;
                this.removeFamilyMember(delegationId, memberName);
            });
        });
    }

    // Setup family member event handlers
    setupFamilyMemberEvents() {
        const revokeBtn = document.getElementById('revokeDelegationBtn');
        if (revokeBtn) {
            revokeBtn.addEventListener('click', (e) => {
                const delegationId = e.target.dataset.delegationId;
                this.revokeDelegation(delegationId);
            });
        }
    }

    // Setup no family event handlers
    setupNoFamilyEvents() {
        const requestHeadBtn = document.getElementById('requestFamilyHeadBtn');
        if (requestHeadBtn) {
            requestHeadBtn.addEventListener('click', () => this.requestBecomesFamilyHead());
        }

        const joinFamilyBtn = document.getElementById('requestJoinFamilyBtn');
        if (joinFamilyBtn) {
            joinFamilyBtn.addEventListener('click', () => this.requestJoinFamily());
        }
    }

    // Setup pending request event handlers
    setupPendingRequestEvents() {
        const cancelBtn = document.getElementById('cancelHeadRequestBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                const delegationId = e.target.dataset.delegationId;
                this.cancelFamilyHeadRequest(delegationId);
            });
        }
    }

    // Setup payment interface events
    setupPaymentEvents() {
        const paymentForm = document.getElementById('familyPaymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }

        const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
        if (cancelPaymentBtn) {
            cancelPaymentBtn.addEventListener('click', () => this.hidePaymentInterface());
        }

        const paymentType = document.getElementById('paymentType');
        if (paymentType) {
            paymentType.addEventListener('change', (e) => {
                const loanGroup = document.getElementById('loanSelectGroup');
                if (e.target.value === 'loan') {
                    loanGroup.style.display = 'block';
                    this.loadMemberLoans();
                } else {
                    loanGroup.style.display = 'none';
                }
            });
        }
    }

    // ================== ACTION METHODS ==================

    // Show add member modal
    async showAddMemberModal() {
        const memberId = prompt('أدخل معرف المستخدم المراد إضافته للعائلة:');
        if (memberId && !isNaN(memberId)) {
            try {
                await apiCall('/family/add-member', 'POST', {
                    memberId: parseInt(memberId),
                    notes: 'إضافة عضو من واجهة المستخدم'
                });
                
                Utils.showToast('تم إرسال طلب إضافة العضو للموافقة من الإدارة', 'success');
                this.load(); // Reload the tab
            } catch (error) {
                console.error('خطأ في إضافة العضو:', error);
                Utils.showToast(error.message || 'خطأ في إضافة العضو', 'error');
            }
        } else if (memberId !== null) {
            Utils.showToast('يرجى إدخال معرف مستخدم صحيح', 'error');
        }
    }

    // Request to become family head
    async requestBecomesFamilyHead() {
        const notes = prompt('سبب رغبتك في أن تصبح رب أسرة (اختياري):');
        if (notes !== null) { // User didn't cancel
            try {
                await apiCall('/family/request-family-head', 'POST', { 
                    notes: notes || 'طلب أن يصبح رب أسرة' 
                });
                Utils.showToast('تم إرسال طلب أن تصبح رب أسرة للمراجعة من الإدارة', 'success');
                this.load(); // Reload to show updated status
            } catch (error) {
                console.error('خطأ في طلب أن يصبح رب أسرة:', error);
                Utils.showToast(error.message || 'خطأ في إرسال الطلب', 'error');
            }
        }
    }

    // Request to join existing family
    async requestJoinFamily() {
        const familyHeadId = prompt('أدخل معرف رب الأسرة الذي ترغب في الانضمام إليه:');
        if (familyHeadId && !isNaN(familyHeadId)) {
            const notes = prompt('ملاحظات إضافية (اختياري):');
            if (notes !== null) { // User didn't cancel
                try {
                    await apiCall('/family/request-join-family', 'POST', {
                        familyHeadId: parseInt(familyHeadId),
                        notes: notes || 'طلب انضمام للعائلة'
                    });
                    Utils.showToast('تم إرسال طلب الانضمام للمراجعة من الإدارة', 'success');
                    this.load(); // Reload to show updated status
                } catch (error) {
                    console.error('خطأ في طلب الانضمام:', error);
                    Utils.showToast(error.message || 'خطأ في إرسال الطلب', 'error');
                }
            }
        } else if (familyHeadId !== null) {
            Utils.showToast('يرجى إدخال معرف مستخدم صحيح', 'error');
        }
    }

    // Remove family member
    async removeFamilyMember(delegationId, memberName) {
        if (confirm(`هل أنت متأكد من إزالة ${memberName} من العائلة؟`)) {
            try {
                await apiCall(`/family/revoke-delegation/${delegationId}`, 'DELETE');
                Utils.showToast('تم إزالة العضو من العائلة', 'success');
                this.load(); // Reload the tab
            } catch (error) {
                console.error('خطأ في إزالة العضو:', error);
                Utils.showToast(error.message || 'خطأ في إزالة العضو', 'error');
            }
        }
    }

    // Revoke delegation
    async revokeDelegation(delegationId) {
        if (confirm('هل أنت متأكد من إلغاء التفويض العائلي؟')) {
            try {
                await apiCall(`/family/revoke-delegation/${delegationId}`, 'DELETE');
                Utils.showToast('تم إلغاء التفويض العائلي', 'success');
                this.load(); // Reload the tab
            } catch (error) {
                console.error('خطأ في إلغاء التفويض:', error);
                Utils.showToast(error.message || 'خطأ في إلغاء التفويض', 'error');
            }
        }
    }

    // Cancel family head request
    async cancelFamilyHeadRequest(delegationId) {
        if (confirm('هل أنت متأكد من إلغاء طلب أن تصبح رب أسرة؟')) {
            try {
                await apiCall(`/family/revoke-delegation/${delegationId}`, 'DELETE');
                Utils.showToast('تم إلغاء طلب رب الأسرة', 'success');
                this.load(); // Reload the tab
            } catch (error) {
                console.error('خطأ في إلغاء الطلب:', error);
                Utils.showToast(error.message || 'خطأ في إلغاء الطلب', 'error');
            }
        }
    }

    // Show payment interface
    showPaymentInterface(memberId, memberName, paymentType, loanData = null) {
        const paymentInterface = document.getElementById('paymentInterface');
        const selectedMember = document.getElementById('selectedMember');
        const paymentTypeSelect = document.getElementById('paymentType');
        const paymentAmount = document.getElementById('paymentAmount');
        
        if (paymentInterface && selectedMember && paymentTypeSelect) {
            selectedMember.value = memberId;
            paymentTypeSelect.value = paymentType;
            
            if (paymentType === 'loan') {
                document.getElementById('loanSelectGroup').style.display = 'block';
                this.loadMemberLoans(memberId);
                
                // Pre-fill with installment amount if available
                if (loanData && loanData.installment && paymentAmount) {
                    paymentAmount.value = loanData.installment;
                }
            } else {
                // Clear amount for subscription payments
                if (paymentAmount) {
                    paymentAmount.value = '';
                    paymentAmount.setAttribute('placeholder', 'أدخل المبلغ');
                }
            }
            
            paymentInterface.style.display = 'block';
            paymentInterface.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Hide payment interface
    hidePaymentInterface() {
        const paymentInterface = document.getElementById('paymentInterface');
        if (paymentInterface) {
            paymentInterface.style.display = 'none';
            document.getElementById('familyPaymentForm').reset();
            document.getElementById('loanSelectGroup').style.display = 'none';
        }
    }

    // Load member loans for loan payment
    async loadMemberLoans(memberId) {
        try {
            const selectedLoan = document.getElementById('selectedLoan');
            if (!selectedLoan) return;
            
            // Clear existing options
            selectedLoan.innerHTML = '<option value="">اختر القرض</option>';
            
            // Find the member's loan info from family status
            const member = this.familyStatus.familyMembers.find(m => m.family_member_id == memberId);
            if (member && member.loan_id && member.loan_status === 'approved' && !member.loan_closed_date) {
                const loanOption = document.createElement('option');
                loanOption.value = member.loan_id;
                loanOption.textContent = `القرض #${member.loan_id} - ${formatCurrency(member.remaining_amount)} متبقي`;
                selectedLoan.appendChild(loanOption);
                
                // Auto-select the loan if it's the only one
                selectedLoan.value = member.loan_id;
                
                // Set suggested payment amount to installment amount
                const paymentAmount = document.getElementById('paymentAmount');
                if (paymentAmount && member.installment_amount) {
                    paymentAmount.value = member.installment_amount;
                    paymentAmount.setAttribute('placeholder', `الحد الأدنى: ${formatCurrency(member.installment_amount)}`);
                }
            } else {
                const noLoanOption = document.createElement('option');
                noLoanOption.value = '';
                noLoanOption.textContent = 'لا يوجد قروض نشطة';
                noLoanOption.disabled = true;
                selectedLoan.appendChild(noLoanOption);
            }
        } catch (error) {
            console.error('خطأ في تحميل قروض العضو:', error);
            Utils.showToast('خطأ في تحميل بيانات القروض', 'error');
        }
    }

    // Handle payment form submission
    async handlePaymentSubmit(e) {
        e.preventDefault();
        
        const formData = {
            memberId: document.getElementById('selectedMember').value,
            paymentType: document.getElementById('paymentType').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            memo: document.getElementById('paymentMemo').value
        };
        
        if (formData.paymentType === 'loan') {
            formData.targetLoanId = parseInt(document.getElementById('selectedLoan').value);
        }
        
        try {
            await apiCall('/family/make-payment', 'POST', formData);
            Utils.showToast('تم إرسال الدفعة للموافقة من الإدارة', 'success');
            this.hidePaymentInterface();
        } catch (error) {
            console.error('خطأ في إرسال الدفعة:', error);
            Utils.showToast(error.message || 'خطأ في إرسال الدفعة', 'error');
        }
    }
}

// Export for global use
window.FamilyManagementTab = FamilyManagementTab;