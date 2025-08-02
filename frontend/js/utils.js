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
        return isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('en-US');
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
                <!-- <li><strong>الحد الأدنى للاشتراك:</strong> 240 د.ك خلال 24 شهر لإمكانية طلب القروض</li> --> <!-- TEMPORARILY DISABLED -->
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
                <!-- <li><strong>الاشتراكات المطلوبة:</strong> دفع 240 د.ك على الأقل خلال 24 شهر</li> --> <!-- TEMPORARILY DISABLED -->
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
    },

    // WhatsApp utility - format phone number for international format
    formatWhatsAppNumber: (phoneNumber, countryCode = '965') => {
        if (!phoneNumber) return null;
        
        // Clean the phone number - remove all non-digits
        let cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        
        // Remove leading zeros
        cleanNumber = cleanNumber.replace(/^0+/, '');
        
        // If number already starts with country code, use as is
        if (cleanNumber.startsWith(countryCode)) {
            return cleanNumber;
        }
        
        // Add country code for Kuwait (965) by default
        return countryCode + cleanNumber;
    },

    // Generate WhatsApp chat URL
    getWhatsAppChatUrl: (phoneNumber, message = '', useWeb = true) => {
        const formattedNumber = Utils.formatWhatsAppNumber(phoneNumber);
        if (!formattedNumber) return null;
        
        const encodedMessage = encodeURIComponent(message);
        const baseUrl = useWeb ? 'https://web.whatsapp.com/send' : 'https://wa.me';
        
        if (useWeb) {
            return `${baseUrl}?phone=${formattedNumber}${message ? `&text=${encodedMessage}` : ''}`;
        } else {
            return `${baseUrl}/${formattedNumber}${message ? `?text=${encodedMessage}` : ''}`;
        }
    },

    // Open WhatsApp chat in new window (defaults to WhatsApp Web)
    openWhatsAppChat: (phoneNumber, message = '', useWeb = true) => {
        const url = Utils.getWhatsAppChatUrl(phoneNumber, message, useWeb);
        if (url) {
            // Open in new tab with specific window features for WhatsApp Web
            if (useWeb) {
                window.open(url, '_blank', 'width=1200,height=700,scrollbars=yes,resizable=yes');
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            return true;
        }
        return false;
    },

    // Open WhatsApp Web specifically (explicit method)
    openWhatsAppWeb: (phoneNumber, message = '') => {
        return Utils.openWhatsAppChat(phoneNumber, message, true);
    },

    // Open WhatsApp mobile/desktop app (explicit method)
    openWhatsAppApp: (phoneNumber, message = '') => {
        return Utils.openWhatsAppChat(phoneNumber, message, false);
    },

    // WhatsApp notification message templates
    getWhatsAppTemplates: () => ({
        joiningFeeApproved: (userName, userFinancials = null) => {
            let message = `🛡️ درع العائلة - اعتماد العضوية

مبروك ${userName}! 🎉

تم اعتماد رسوم الانضمام وأصبحت عضواً فعالاً في صندوق درع العائلة.`;

            if (userFinancials) {
                message += `\n\n💰 إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;

                /* TEMPORARILY DISABLED - 240 KWD requirement
                const remaining = Math.max(0, 240 - parseFloat(userFinancials.totalSubscriptions));
                if (remaining > 0) {
                    message += `\n• المتبقي للوصول لـ240 د.ك: ${remaining.toFixed(3)} د.ك`;
                } else {
                    message += `\n• 🎉 وصلت للحد المطلوب للقروض!`;
                }
                */
            }

            message += `\n\n✅ الخطوات التالية:
• ابدأ بدفع الاشتراكات الشهرية
<!-- • الهدف: 240 د.ك خلال 24 شهر للتأهل للقروض --> <!-- TEMPORARILY DISABLED -->
• بعد سنة كاملة ستصبح مؤهلاً لطلب القروض

أهلاً وسهلاً بك في عائلة درع العائلة
إدارة الصندوق`;
            return message;
        },

        joiningFeeRejected: (userName) => `🛡️ درع العائلة - تحديث العضوية

مرحباً ${userName}

للأسف لم يتم اعتماد رسوم الانضمام في الوقت الحالي.

📞 يرجى التواصل معنا للاستفسار عن الأسباب والخطوات المطلوبة.

شكراً لتفهمك
إدارة درع العائلة`,

        loanApproved: (userName, loanAmount, installmentAmount, numberOfInstallments, userFinancials = null) => {
            let message = `🛡️ درع العائلة - اعتماد القرض

مبروك ${userName}! 💰

تم اعتماد طلب القرض بالتفاصيل التالية:

💰 مبلغ القرض: ${loanAmount}
📅 القسط الشهري: ${installmentAmount}
🔢 عدد الأقساط: ${numberOfInstallments} قسط`;

            message += `\n\n✅ يمكنك الآن:
• البدء بدفع الأقساط من خلال النظام
• متابعة حالة القرض من حسابك
• التواصل معنا عند الحاجة

تهانينا وبالتوفيق!
إدارة درع العائلة`;
            return message;
        },

        loanRejected: (userName, loanAmount) => `🛡️ درع العائلة - تحديث طلب القرض

مرحباً ${userName}

للأسف لم يتم اعتماد طلب القرض بمبلغ ${loanAmount} في الوقت الحالي.

📞 يرجى التواصل معنا للاستفسار عن الأسباب وإمكانية إعادة التقديم لاحقاً.

شكراً لتفهمك
إدارة درع العائلة`,

        transactionApproved: (userName, amount, transactionType, userFinancials = null) => {
            const typeText = {
                'deposit': 'الإيداع',
                'withdrawal': 'السحب', 
                'subscription': 'الاشتراك',
                'joining_fee': 'رسوم الانضمام'
            }[transactionType] || 'المعاملة';

            let message = `🛡️ درع العائلة - قبول ${typeText}

مرحباً ${userName} ✅

تم قبول ${typeText} بمبلغ ${amount} بنجاح.`;

            if (userFinancials && transactionType === 'subscription') {
                message += `\n\n💰 إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;
                
                /* TEMPORARILY DISABLED - 240 KWD requirement
                const remaining = Math.max(0, 240 - parseFloat(userFinancials.totalSubscriptions));
                if (remaining > 0) {
                    message += `\n• المتبقي للوصول لـ240 د.ك: ${remaining.toFixed(3)} د.ك`;
                } else {
                    message += `\n• 🎉 مبروك! وصلت للحد المطلوب للتأهل للقروض`;
                }
                */
            }

            message += `\n\nشكراً لك
إدارة درع العائلة`;
            return message;
        },

        transactionRejected: (userName, amount, transactionType) => {
            const typeText = {
                'deposit': 'الإيداع',
                'withdrawal': 'السحب',
                'subscription': 'الاشتراك', 
                'joining_fee': 'رسوم الانضمام'
            }[transactionType] || 'المعاملة';

            return `🛡️ درع العائلة - رفض ${typeText}

مرحباً ${userName}

للأسف لم يتم قبول ${typeText} بمبلغ ${amount}.

📞 يرجى التواصل معنا للاستفسار عن الأسباب.

شكراً لتفهمك
إدارة درع العائلة`;
        },

        loanPaymentApproved: (userName, paymentAmount, totalPaid, loanAmount, remainingAmount, userFinancials = null) => {
            // Extract numeric values for calculations (remove 'د.ك' suffix)
            const numericTotalPaid = parseFloat(totalPaid.toString().replace(/[^\d.-]/g, '')) || 0;
            const numericLoanAmount = parseFloat(loanAmount.toString().replace(/[^\d.-]/g, '')) || 0;
            const numericPaymentAmount = parseFloat(paymentAmount.toString().replace(/[^\d.-]/g, '')) || 0;
            
            // Recalculate remaining amount to ensure consistency
            const recalculatedRemaining = Math.max(0, numericLoanAmount - numericTotalPaid);
            const completionPercentage = numericLoanAmount > 0 ? Math.round((numericTotalPaid / numericLoanAmount) * 100) : 0;
            const isCompleted = recalculatedRemaining <= 0.01; // Allow for small decimal precision errors

            let message = `🛡️ درع العائلة - قبول دفعة القرض

مرحباً ${userName} ✅

تم قبول دفعة القرض بمبلغ ${paymentAmount}.

📊 ملخص القرض:
• إجمالي القرض: ${loanAmount}
• المدفوع: ${totalPaid}
• المتبقي: ${recalculatedRemaining.toFixed(3)} د.ك
• نسبة الإنجاز: ${completionPercentage}%`;

            if (isCompleted) {
                message += `\n\n🎉 مبروك! تم سداد القرض بالكامل
🗓️ يمكنك طلب قرض جديد بعد 30 يوماً`;
            } else {
                message += `\n\n💡 استمر في دفع الأقساط حسب الجدول المحدد`;
            }

            message += `\n\nشكراً لك
إدارة درع العائلة`;
            return message;
        },

        loanPaymentRejected: (userName, paymentAmount) => `🛡️ درع العائلة - رفض دفعة القرض

مرحباً ${userName}

للأسف لم يتم قبول دفعة القرض بمبلغ ${paymentAmount}.

📞 يرجى التواصل معنا للاستفسار عن الأسباب وإعادة تقديم الدفعة.

شكراً لتفهمك
إدارة درع العائلة`
    }),

    // Send WhatsApp notification after approval
    sendWhatsAppNotification: (phoneNumber, userName, templateType, userFinancials = null, ...templateArgs) => {
        const templates = Utils.getWhatsAppTemplates();
        let message = '';

        try {
            switch (templateType) {
                case 'joiningFeeApproved':
                    message = templates.joiningFeeApproved(userName, userFinancials);
                    break;
                case 'joiningFeeRejected':
                    message = templates.joiningFeeRejected(userName);
                    break;
                case 'loanApproved':
                    message = templates.loanApproved(userName, templateArgs[0], templateArgs[1], templateArgs[2], userFinancials);
                    break;
                case 'loanRejected':
                    message = templates.loanRejected(userName, templateArgs[0]);
                    break;
                case 'transactionApproved':
                    message = templates.transactionApproved(userName, templateArgs[0], templateArgs[1], userFinancials);
                    break;
                case 'transactionRejected':
                    message = templates.transactionRejected(userName, templateArgs[0], templateArgs[1]);
                    break;
                case 'loanPaymentApproved':
                    message = templates.loanPaymentApproved(userName, templateArgs[0], templateArgs[1], templateArgs[2], templateArgs[3], userFinancials);
                    break;
                case 'loanPaymentRejected':
                    message = templates.loanPaymentRejected(userName, templateArgs[0]);
                    break;
                default:
                    console.warn('Unknown WhatsApp template type:', templateType);
                    return false;
            }

            // Open WhatsApp Web with the message
            return Utils.openWhatsAppWeb(phoneNumber, message);
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
            return false;
        }
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    Utils.initTermsContent();
    Utils.initLoadingContent();
});