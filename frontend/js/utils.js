// Utility Functions - Optimized
const Utils = {
    // DOM helper
    $(id) { return document.getElementById(id); },
    
    // Format currency
    formatCurrency: (amount) => parseFloat(amount || 0).toFixed(3),
    
    // Format date safely
    formatDate: (dateString) => {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar-KW');
    },
    
    // Loading state
    showLoading: (show) => {
        const spinner = Utils.$('loadingSpinner');
        if (spinner) spinner.style.display = show ? 'flex' : 'none';
    },
    
    // Toast notifications
    showToast: (message, type = 'info') => {
        const container = Utils.$('toastContainer') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    },
    
    // Terms content template
    getTermsContent: () => `
        <div class="terms-header">
            <div class="welcome-notice">
                <h2 style="color: #007bff; text-align: center; margin-bottom: 15px;">
                    <i class="fas fa-shield-alt"></i> مرحباً بكم في صندوق درع العائلة
                </h2>
                <p style="text-align: center; font-size: 16px; color: #666; margin-bottom: 20px;">
                    يرجى قراءة الشروط والأحكام التالية بعناية قبل التسجيل
                </p>
            </div>
        </div>

        <div class="terms-section registration-rules">
            <h3><i class="fas fa-user-plus"></i> قواعد التسجيل والانضمام</h3>
            <div class="important-notice">
                <p><strong>⚠️ مهم:</strong> بتسجيلك في هذا النظام، فإنك توافق على جميع الشروط والأحكام المذكورة أدناه</p>
            </div>
            <ul class="terms-list">
                <li><strong>رسوم الانضمام:</strong> 10 دنانير كويتية غير قابلة للاسترداد</li>
                <li><strong>الاشتراك الشهري:</strong> يجب دفع الاشتراكات بانتظام للحفاظ على العضوية النشطة</li>
                <li><strong>الحد الأدنى للاشتراك:</strong> 240 د.ك خلال 24 شهر لإمكانية طلب القروض</li>
                <li><strong>صحة البيانات:</strong> جميع البيانات المدخلة يجب أن تكون صحيحة ومحدثة</li>
                <li><strong>موافقة الإدارة:</strong> العضوية تحتاج موافقة من الإدارة بعد التسجيل</li>
                <li><strong>التزام أخلاقي:</strong> الالتزام بآداب التعامل واحترام نظام الصندوق</li>
            </ul>
        </div>

        <div class="terms-section">
            <h3><i class="fas fa-hand-holding-usd"></i> شروط الاقتراض (7 شروط أساسية)</h3>
            <ol class="terms-list numbered">
                <li><strong>عدم حظر الحساب:</strong> يجب أن يكون الحساب نشطاً وغير محظور</li>
                <li><strong>موافقة رسوم الانضمام:</strong> يجب أن تكون رسوم الانضمام معتمدة من الإدارة</li>
                <li><strong>الحد الأدنى للرصيد:</strong> 500 د.ك على الأقل في الحساب</li>
                <li><strong>سنة عضوية:</strong> مرور سنة كاملة على تاريخ التسجيل</li>
                <li><strong>عدم وجود قروض نشطة:</strong> لا يوجد أي قرض قائم لم يتم سداده</li>
                <li><strong>الاشتراكات المطلوبة:</strong> دفع 240 د.ك على الأقل خلال 24 شهر</li>
                <li><strong>30 يوم من آخر قرض:</strong> مرور 30 يوماً على الأقل من تاريخ إغلاق آخر قرض</li>
            </ol>
        </div>

        <div class="terms-section">
            <h3><i class="fas fa-calculator"></i> نظام حساب القروض</h3>
            <ul class="terms-list">
                <li><strong>الحد الأقصى للقرض:</strong> الأقل من (الرصيد × 3) أو 10,000 د.ك</li>
                <li><strong>الحد الأدنى للقسط:</strong> 20 د.ك (ما عدا القسط الأخير)</li>
                <li><strong>فترة السداد:</strong> محسوبة تلقائياً بحد أدنى 6 أشهر</li>
                <li><strong>بدون فوائد:</strong> تسدد قيمة القرض فقط بدون أي رسوم إضافية</li>
                <li><strong>معادلة الحساب:</strong> I = 0.006667 × (L² / B) مقرباً لأقرب 5 د.ك</li>
            </ul>
        </div>

        <div class="terms-section">
            <h3><i class="fas fa-calendar-alt"></i> قواعد استلام المستحقات</h3>
            <ul class="terms-list">
                <li>يتم استلام المستحقات بعد سنة بحد أقصى إذا لم يكن العضو قد اقترض من قبل</li>
                <li>يتم استلام المستحقات بعد سنتين من تاريخ تسديد آخر قسط للقرض</li>
                <li>في حالة سداد القرض مبكراً، وبعد مرور 11 شهر على الأقل يمكن تقديم قرض جديد</li>
                <li>لا يجوز للمشتركين سحب جزء من الرصيد في أي حال من الأحوال</li>
            </ul>
        </div>

        <div class="terms-section">
            <h3><i class="fas fa-exclamation-triangle"></i> القواعد والالتزامات</h3>
            <ul class="terms-list">
                <li>عند الحصول على قرض يجب التوقيع على مستندات ضمان لتسديد القرض</li>
                <li>يمكن الاقتراض على كفالة أحد أعضاء الصندوق للقاصرين</li>
                <li>يسمح فتح حساب ثاني لنفس المشترك للحصول على قرضين</li>
                <li>للحساب الثاني: يحق تقديم قرض بعد 6 أشهر بنفس الشروط</li>
                <li>عند إغلاق حساب قاصر يجب توقيع الوالدين</li>
                <li>يحق للإدارة حظر العضوية في حالة مخالفة الشروط</li>
            </ul>
        </div>

        <div class="terms-section">
            <h3><i class="fas fa-envelope"></i> التواصل والإشعارات</h3>
            <ul class="terms-list">
                <li>سيتم إرسال تأكيد التسجيل وبيانات الدخول عبر البريد الإلكتروني</li>
                <li>جميع الإشعارات المالية والإدارية ستُرسل عبر البريد الإلكتروني والواتساب</li>
                <li>العضو مسؤول عن التحقق من البريد الإلكتروني بانتظام</li>
                <li>في حالة تغيير البريد الإلكتروني، يجب إشعار الإدارة فوراً</li>
                <li>العضو مسؤول عن تحديث بياناته الشخصية ووسائل الاتصال</li>
            </ul>
        </div>

        <div class="terms-footer">
            <div class="acceptance-notice">
                <p style="background: #f8f9fa; padding: 15px; border-right: 4px solid #007bff; margin: 20px 0;">
                    <i class="fas fa-info-circle"></i>
                    <strong>بالضغط على "أوافق على الشروط والأحكام" فإنك تؤكد قراءتك وفهمك وموافقتك على جميع البنود المذكورة أعلاه.</strong>
                </p>
            </div>
        </div>
    `,
    
    // Initialize terms content
    initTermsContent: () => {
        const termsContent = Utils.getTermsContent();
        ['termsContentTemplate', 'terms-content-placeholder', 'terms-content-modal', 'terms-content-popup']
            .forEach(id => {
                const el = Utils.$(id) || document.querySelector(`.${id}`);
                if (el) el.innerHTML = termsContent;
            });
    },
    
    // Initialize loading content
    initLoadingContent: () => {
        document.querySelectorAll('.loading-content').forEach(el => {
            el.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
        });
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    Utils.initTermsContent();
    Utils.initLoadingContent();
});