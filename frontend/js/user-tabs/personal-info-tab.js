// Personal Information Tab Module
// Handles user personal information display and editing

class PersonalInfoTab {
    constructor(userDashboard) {
        this.userDashboard = userDashboard;
    }

    // Load personal information content
    async load() {
        const user = this.userDashboard.getUser();
        const infoContent = document.getElementById('personalInfoContent');
        
        if (infoContent) {
            infoContent.innerHTML = `
                <div class="user-info-card">
                    <h4><i class="fas fa-user"></i> المعلومات الشخصية</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>الاسم:</label>
                            <span>${user.name}</span>
                        </div>
                        <div class="info-item">
                            <label>البريد الإلكتروني:</label>
                            <span>${user.email || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <label>رقم الهاتف:</label>
                            <span>${user.phone || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <label>واتساب:</label>
                            <span>${user.whatsapp || user.phone || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <label>مكان العمل:</label>
                            <span>${user.workplace || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <label>الرصيد الحالي:</label>
                            <span class="balance">${formatCurrency(user.balance)}</span>
                        </div>
                        <div class="info-item">
                            <label>تاريخ التسجيل:</label>
                            <span>${Utils.formatDate(user.registration_date)}</span>
                        </div>
                        <div class="info-item">
                            <label>نوع العضوية:</label>
                            <span>${user.user_type === 'admin' ? 'مدير' : 'عضو'}</span>
                        </div>
                        <div class="info-item">
                            <label>حالة رسوم الانضمام:</label>
                            <span class="joining-fee-status ${user.joining_fee_approved}">
                                ${user.joining_fee_approved === 'approved' ? 'موافق' : 
                                  user.joining_fee_approved === 'pending' ? 'معلق' : 'مرفوض'}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>حالة الحساب:</label>
                            <span class="account-status ${user.is_blocked ? 'blocked' : 'active'}">
                                ${user.is_blocked ? 'محظور' : 'نشط'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button onclick="personalInfoTab.showEditProfile()" class="btn btn-primary">
                            <i class="fas fa-edit"></i> تعديل المعلومات
                        </button>
                        <button onclick="personalInfoTab.showChangePassword()" class="btn btn-secondary">
                            <i class="fas fa-key"></i> تغيير كلمة المرور
                        </button>
                        <button onclick="personalInfoTab.refreshData()" class="btn btn-info">
                            <i class="fas fa-sync-alt"></i> تحديث البيانات
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Show edit profile modal
    showEditProfile() {
        const user = this.userDashboard.getUser();
        const modalHtml = `
            <div class="edit-profile-modal">
                <h3><i class="fas fa-user-edit"></i> تعديل المعلومات الشخصية</h3>
                <form id="editProfileForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editName">الاسم</label>
                            <input type="text" id="editName" name="name" value="${user.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">البريد الإلكتروني</label>
                            <input type="email" id="editEmail" name="email" value="${user.email || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editPhone">رقم الهاتف</label>
                            <input type="tel" id="editPhone" name="phone" value="${user.phone || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editWhatsapp">واتساب</label>
                            <input type="tel" id="editWhatsapp" name="whatsapp" value="${user.whatsapp || ''}" 
                                   placeholder="أو سيستخدم رقم الهاتف">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editWorkplace">مكان العمل</label>
                            <input type="text" id="editWorkplace" name="workplace" value="${user.workplace || ''}">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> حفظ التغييرات
                        </button>
                        <button type="button" onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('تعديل المعلومات', modalHtml);
        
        // Setup form handler
        setTimeout(() => {
            document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileUpdate(e);
            });
        }, 100);
    }

    // Show change password modal
    showChangePassword() {
        const modalHtml = `
            <div class="change-password-modal">
                <h3><i class="fas fa-key"></i> تغيير كلمة المرور</h3>
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label for="currentPassword">كلمة المرور الحالية</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">كلمة المرور الجديدة</label>
                        <input type="password" id="newPassword" name="newPassword" minlength="1" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">تأكيد كلمة المرور الجديدة</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" minlength="1" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> تغيير كلمة المرور
                        </button>
                        <button type="button" onclick="hideModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('تغيير كلمة المرور', modalHtml);
        
        // Setup form handler
        setTimeout(() => {
            document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePasswordChange(e);
            });
        }, 100);
    }

    // Handle profile update
    async handleProfileUpdate(e) {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            showLoading(true);
            const result = await apiCall('/users/profile', 'PUT', data);
            showToast(result.message, 'success');
            hideModal();
            
            // Update user object
            Object.assign(this.userDashboard.getUser(), data);
            
            // Refresh the tab
            await this.load();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Handle password change
    async handlePasswordChange(e) {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (data.newPassword !== data.confirmPassword) {
            showToast('كلمات المرور الجديدة غير متطابقة', 'error');
            return;
        }
        
        try {
            showLoading(true);
            const result = await apiCall('/users/change-password', 'PUT', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            showToast(result.message, 'success');
            hideModal();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Refresh user data
    async refreshData() {
        try {
            showLoading(true);
            await refreshUserData();
            await this.load(); // Reload the personal info tab
            showToast('تم تحديث البيانات بنجاح', 'success');
        } catch (error) {
            showToast('خطأ في تحديث البيانات', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Make PersonalInfoTab globally available
window.PersonalInfoTab = PersonalInfoTab;