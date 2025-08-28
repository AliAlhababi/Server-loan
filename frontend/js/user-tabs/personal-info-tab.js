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
        console.log('User data for form:', user); // Debug log
        
        // Make sure we have the right field names (user might have Aname instead of name)
        const userName = user.name || user.Aname || '';
        const userEmail = user.email || '';
        const userPhone = user.phone || '';
        const userWhatsapp = user.whatsapp || '';
        
        console.log('Processed form values:', { userName, userEmail, userPhone, userWhatsapp });
        
        const modalHtml = `
            <div class="edit-profile-modal">
                <h3><i class="fas fa-user-edit"></i> تعديل المعلومات الشخصية</h3>
                <form id="editProfileForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editName">الاسم</label>
                            <input type="text" id="editName" name="name" value="${userName}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">البريد الإلكتروني</label>
                            <input type="email" id="editEmail" name="email" value="${userEmail}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editPhone">رقم الهاتف</label>
                            <input type="tel" id="editPhone" name="phone" value="${userPhone}" required>
                        </div>
                        <div class="form-group">
                            <label for="editWhatsapp">واتساب</label>
                            <input type="tel" id="editWhatsapp" name="whatsapp" value="${userWhatsapp}" 
                                   placeholder="أو سيستخدم رقم الهاتف">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="saveProfileBtn" class="btn btn-primary">
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
        
        // Setup button click handler instead of form submit
        setTimeout(() => {
            const saveBtn = document.getElementById('saveProfileBtn');
            const form = document.getElementById('editProfileForm');
            
            if (saveBtn && form) {
                saveBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Profile save button clicked'); // Debug log
                    
                    // Check form values directly before sending
                    const formData = new FormData(form);
                    const testData = Object.fromEntries(formData.entries());
                    console.log('DIRECT form check:', testData);
                    
                    // Create fake event with form as target
                    const fakeEvent = { target: form };
                    await this.handleProfileUpdate(fakeEvent);
                });
            } else {
                console.error('Save button or form not found!', { saveBtn, form });
            }
        }, 200);
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
        console.log('handleProfileUpdate called');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        console.log('Form data collected:', data);
        console.log('Name field:', data.name);
        console.log('Email field:', data.email);
        console.log('Phone field:', data.phone);
        console.log('User object before form:', this.userDashboard.getUser());
        
        // Add whatsapp field if not provided (use phone as default)
        if (!data.whatsapp || data.whatsapp.trim() === '') {
            data.whatsapp = data.phone;
        }
        
        console.log('About to call API with:', data);
        console.log('Current token:', localStorage.getItem('authToken'));
        
        try {
            showLoading(true);
            
            // Make API call with explicit error handling
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed - token expired');
                    showToast('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى', 'error');
                    // Don't auto-refresh, let user handle it
                    return;
                }
                
                // For 400 errors, try to get the detailed error message
                try {
                    const errorData = await response.json();
                    console.error('Server error details:', errorData);
                    throw new Error(errorData.message || `خطأ في الخادم: ${response.status}`);
                } catch (jsonError) {
                    console.error('Could not parse error response:', jsonError);
                    throw new Error(`خطأ في الخادم: ${response.status}`);
                }
            }
            
            const result = await response.json();
            console.log('API call successful:', result);
            
            showToast(result.message || 'تم تحديث الملف الشخصي بنجاح', 'success');
            hideModal();
            
            // Update user object with correct field names
            const user = this.userDashboard.getUser();
            user.name = data.name;
            user.Aname = data.name; // Backend uses Aname
            user.email = data.email;
            user.phone = data.phone;
            user.whatsapp = data.whatsapp;
            
            // Refresh user data from server to ensure consistency
            await refreshUserData();
            
            // Refresh the tab
            await this.load();
            
        } catch (error) {
            console.error('Profile update error:', error);
            showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
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
        
        console.log('Password change attempt...'); // Debug log
        
        try {
            showLoading(true);
            
            // Use direct fetch for better error handling (no auto-refresh)
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword
                })
            });
            
            console.log('Password change response status:', response.status);
            
            const result = await response.json();
            console.log('Password change response data:', result);
            
            if (!response.ok) {
                // Show specific error message from server without page refresh
                const errorMessage = result.message || 'خطأ في تغيير كلمة المرور';
                console.log('Password change failed:', errorMessage);
                showToast(errorMessage, 'error');
                return; // Stay on page, don't refresh
            }
            
            // Success - show message and close modal
            console.log('Password change successful');
            showToast(result.message || 'تم تغيير كلمة المرور بنجاح', 'success');
            hideModal();
            
            // Clear the form
            document.getElementById('changePasswordForm').reset();
            
        } catch (error) {
            console.error('Password change error:', error);
            showToast('خطأ في الاتصال بالخادم', 'error');
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