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
        <div class="terms-section">
            <h3><i class="fas fa-calendar-alt"></i> قواعد استلام المستحقات</h3>
            <ul class="terms-list">
                <li>يتم استلام المستحقات بعد سنة بحد أقصى إذا لم يكن العضو قد اقترض من قبل</li>
                <li>يتم استلام المستحقات بعد سنتين من تاريخ تسديد آخر قسط للقرض</li>
            </ul>
        </div>
        <div class="terms-section">
            <h3><i class="fas fa-hand-holding-usd"></i> شروط الاقتراض</h3>
            <ul class="terms-list">
                <li>يجب أن يمضي على اشتراك العضو بالصندوق سنة كاملة من تاريخ دفع أول اشتراك وأن يكون سهمه بالصندوق قد وصل إلى 500 دينار على الأقل</li>
                <li>يمكن الاقتراض على كفالة أحد أعضاء الصندوق للقاصرين</li>
                <li>عند الحصول على قرض يجب التوقيع على مستندات بقيمة القرض لضمان تسديد قيمة القرض ومن ثم يمكن استرجاع المستندات بعد سداد القرض بالكامل</li>
                <li>يسمح فتح حساب آخر لنفس المشترك للاستفادة والحصول على قرضين من الصندوق</li>
                <li>في حال فتح الحساب الثاني لمشترك قديم بالصندوق يحق له تقديم قرض بعد 6 أشهر بشرط فتح الحساب الثاني وبنفس النسب والشروط المذكورة أعلاه للصندوق</li>
                <li>في حالة سداد القرض مبكراً، وبعد مرور 11 شهر على الأقل من تاريخ استلام القرض يستطيع تقديم قرض جديد وعلى حسب الدور</li>
                <li>لا يجوز للمشتركين سحب جزء من الرصيد في أي حال من الأحوال</li>
                <li>عند الاضطرار لإغلاق حساب مشترك قاصر (طفل) يجب توقيع الوالدين على النموذج المعد لذلك</li>
            </ul>
        </div>
        <div class="terms-section">
            <h3><i class="fas fa-user-check"></i> التسجيل والعضوية</h3>
            <ul class="terms-list">
                <li>رسوم الانضمام للصندوق 10 دنانير كويتية غير قابلة للاسترداد</li>
                <li>يجب دفع الاشتراكات الشهرية بانتظام للحفاظ على العضوية</li>
                <li>العضو مسؤول عن تحديث بياناته الشخصية ووسائل الاتصال</li>
                <li>يحق للإدارة حظر العضوية في حالة مخالفة الشروط والأحكام</li>
            </ul>
        </div>
        <div class="terms-section">
            <h3><i class="fas fa-envelope"></i> التواصل والإشعارات</h3>
            <ul class="terms-list">
                <li>سيتم إرسال تأكيد التسجيل عبر البريد الإلكتروني المقدم</li>
                <li>جميع الإشعارات المالية والإدارية ستُرسل عبر البريد الإلكتروني والواتساب</li>
                <li>العضو مسؤول عن التحقق من البريد الإلكتروني بانتظام</li>
                <li>في حالة تغيير البريد الإلكتروني، يجب إشعار الإدارة فوراً</li>
            </ul>
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