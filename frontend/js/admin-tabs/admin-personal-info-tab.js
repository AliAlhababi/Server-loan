// Admin Personal Information Tab Module
// Handles admin personal information display and editing

class AdminPersonalInfoTab {
    constructor() {
        // This tab doesn't need a dashboard reference like user tabs
    }

    // Show admin edit profile modal
    async showEditProfile() {
        try {
            // Get current admin user data
            if (!currentUser) {
                showToast('لم يتم العثور على بيانات المستخدم', 'error');
                return;
            }

            const user = currentUser;
            console.log('Admin user data for form:', user); // Debug log
            
            // Make sure we have the right field names (user might have Aname instead of name)
            const userName = user.name || user.Aname || '';
            const userEmail = user.email || '';
            const userPhone = user.phone || '';
            const userWhatsapp = user.whatsapp || '';
            
            console.log('Processed admin form values:', { userName, userEmail, userPhone, userWhatsapp });
            
            const modalHtml = `
                <div class="admin-edit-profile-modal">
                    <h3><i class="fas fa-user-edit"></i> تعديل المعلومات الشخصية - مدير</h3>
                    <form id="adminEditProfileForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditName">الاسم الكامل</label>
                                <input type="text" id="adminEditName" name="name" value="${userName}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminEditEmail">البريد الإلكتروني</label>
                                <input type="email" id="adminEditEmail" name="email" value="${userEmail}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditPhone">رقم الهاتف</label>
                                <input type="tel" id="adminEditPhone" name="phone" value="${userPhone}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminEditWhatsapp">واتساب</label>
                                <input type="tel" id="adminEditWhatsapp" name="whatsapp" value="${userWhatsapp}" 
                                       placeholder="أو سيستخدم رقم الهاتف">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="saveAdminProfileBtn" class="btn btn-primary">
                                <i class="fas fa-save"></i> حفظ التغييرات
                            </button>
                            <button type="button" id="changeAdminPasswordBtn" class="btn btn-secondary">
                                <i class="fas fa-key"></i> تغيير كلمة المرور
                            </button>
                            <button type="button" onclick="hideModal()" class="btn btn-outline-secondary">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal('تعديل المعلومات الشخصية', modalHtml);
            
            // Setup button click handlers
            setTimeout(() => {
                const saveBtn = document.getElementById('saveAdminProfileBtn');
                const changePasswordBtn = document.getElementById('changeAdminPasswordBtn');
                const form = document.getElementById('adminEditProfileForm');
                
                if (saveBtn && form) {
                    saveBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Admin profile save button clicked'); // Debug log
                        
                        // Create fake event with form as target
                        const fakeEvent = { target: form };
                        await this.handleAdminProfileUpdate(fakeEvent);
                    });
                } else {
                    console.error('Save button or form not found!', { saveBtn, form });
                }

                if (changePasswordBtn) {
                    changePasswordBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showChangePassword();
                    });
                }
            }, 200);
            
        } catch (error) {
            console.error('Error showing admin edit profile:', error);
            showToast('حدث خطأ في عرض نموذج التعديل', 'error');
        }
    }

    // Show change password modal for admin
    showChangePassword() {
        const modalHtml = `
            <div class="admin-change-password-modal">
                <h3><i class="fas fa-key"></i> تغيير كلمة المرور - مدير</h3>
                <form id="adminChangePasswordForm">
                    <div class="form-group">
                        <label for="adminCurrentPassword">كلمة المرور الحالية</label>
                        <input type="password" id="adminCurrentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="adminNewPassword">كلمة المرور الجديدة</label>
                        <input type="password" id="adminNewPassword" name="newPassword" minlength="1" required>
                    </div>
                    <div class="form-group">
                        <label for="adminConfirmPassword">تأكيد كلمة المرور الجديدة</label>
                        <input type="password" id="adminConfirmPassword" name="confirmPassword" minlength="1" required>
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
            document.getElementById('adminChangePasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAdminPasswordChange(e);
            });
        }, 100);
    }

    // Handle admin profile update
    async handleAdminProfileUpdate(e) {
        console.log('handleAdminProfileUpdate called');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        console.log('Admin form data collected:', data);
        
        // Add whatsapp field if not provided (use phone as default)
        if (!data.whatsapp || data.whatsapp.trim() === '') {
            data.whatsapp = data.phone;
        }
        
        console.log('About to call admin API with:', data);
        console.log('Current token:', localStorage.getItem('authToken'));
        
        try {
            showLoading(true);
            
            // Make API call to admin profile update endpoint
            const response = await fetch('/api/admin/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });
            
            console.log('Admin profile response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed - token expired');
                    showToast('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى', 'error');
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
            console.log('Admin profile API call successful:', result);
            
            showToast(result.message || 'تم تحديث الملف الشخصي بنجاح', 'success');
            hideModal();
            
            // Update current user object with correct field names
            if (currentUser) {
                currentUser.name = data.name;
                currentUser.Aname = data.name; // Backend uses Aname
                currentUser.email = data.email;
                currentUser.phone = data.phone;
                currentUser.whatsapp = data.whatsapp;
            }
            
            // Refresh user data from server to ensure consistency
            await refreshUserData();
            
        } catch (error) {
            console.error('Admin profile update error:', error);
            showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Handle admin password change
    async handleAdminPasswordChange(e) {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (data.newPassword !== data.confirmPassword) {
            showToast('كلمات المرور الجديدة غير متطابقة', 'error');
            return;
        }
        
        console.log('Admin password change attempt...'); // Debug log
        
        try {
            showLoading(true);
            
            // Use admin password change endpoint
            const response = await fetch('/api/admin/change-password', {
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
            
            console.log('Admin password change response status:', response.status);
            
            const result = await response.json();
            console.log('Admin password change response data:', result);
            
            if (!response.ok) {
                // Show specific error message from server without page refresh
                const errorMessage = result.message || 'خطأ في تغيير كلمة المرور';
                console.log('Admin password change failed:', errorMessage);
                showToast(errorMessage, 'error');
                return; // Stay on page, don't refresh
            }
            
            // Success - show message and close modal
            console.log('Admin password change successful');
            showToast(result.message || 'تم تغيير كلمة المرور بنجاح', 'success');
            hideModal();
            
            // Clear the form
            document.getElementById('adminChangePasswordForm').reset();
            
        } catch (error) {
            console.error('Admin password change error:', error);
            showToast('خطأ في الاتصال بالخادم', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Global function for admin profile modal (called from HTML)
function openEditProfileModal() {
    if (!window.adminPersonalInfoTab) {
        window.adminPersonalInfoTab = new AdminPersonalInfoTab();
    }
    window.adminPersonalInfoTab.showEditProfile();
}

// Make AdminPersonalInfoTab globally available
window.AdminPersonalInfoTab = AdminPersonalInfoTab;