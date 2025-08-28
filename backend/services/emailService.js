const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const brandConfig = require('../../config/brandConfig');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templateCache = new Map();
        this.initTransporter();
    }

    initTransporter() {
        // Get email configuration from brand config
        const emailConfig = brandConfig.getEmailConfig();
        
        const config = {
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure || false,
            requireTLS: true,
            auth: emailConfig.auth,
            // Extended timeout settings for slow networks
            connectionTimeout: 60000, // 60 seconds
            greetingTimeout: 30000,
            socketTimeout: 60000,
            dnsTimeout: 30000,
            // TLS options for compatibility
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            },
            // Debug logging
            debug: process.env.NODE_ENV === 'development',
            logger: process.env.NODE_ENV === 'development'
        };

        this.transporter = nodemailer.createTransport(config);
        console.log('✅ Email service configured successfully');
        console.log(`📧 Using: ${config.host}:${config.port} with user: ${config.auth.user}`);
        
        // Test connection if in development
        if (process.env.NODE_ENV === 'development') {
            this.testConnection().then(result => {
                if (result.success) {
                    console.log('✅ SMTP connection test successful');
                } else {
                    console.log('❌ SMTP connection test failed:', result.message);
                }
            });
        }
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            return {
                success: true,
                message: 'SMTP connection verified successfully'
            };
        } catch (error) {
            console.error('SMTP connection failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Brand-aware template loading methods
    loadTemplate(templateName, templateType = 'email') {
        const cacheKey = `${templateType}_${templateName}_${brandConfig.getBrandName()}`;
        
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey);
        }

        const brand = brandConfig.getBrandName();
        const templatesConfig = brandConfig.getSection('templates');
        
        // Try brand-specific template first
        let templatePath = path.join(templatesConfig.emailPath, 'brands', brand, `${templateName}.hbs`);
        
        if (!fs.existsSync(templatePath)) {
            // Fall back to shared template
            templatePath = path.join(templatesConfig.sharedPath, `${templateName}.hbs`);
        }

        if (!fs.existsSync(templatePath)) {
            console.warn(`Template not found: ${templateName} for brand ${brand}`);
            return null;
        }

        try {
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateSource);
            
            this.templateCache.set(cacheKey, compiledTemplate);
            return compiledTemplate;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return null;
        }
    }

    loadLayoutTemplate() {
        const cacheKey = `layout_${brandConfig.getBrandName()}`;
        
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey);
        }

        const templatesConfig = brandConfig.getSection('templates');
        const layoutPath = path.join(templatesConfig.sharedPath, 'layout.hbs');

        if (!fs.existsSync(layoutPath)) {
            console.warn('Layout template not found, using fallback');
            return null;
        }

        try {
            const layoutSource = fs.readFileSync(layoutPath, 'utf8');
            const compiledLayout = handlebars.compile(layoutSource);
            
            this.templateCache.set(cacheKey, compiledLayout);
            return compiledLayout;
        } catch (error) {
            console.error('Error loading layout template:', error);
            return null;
        }
    }

    renderEmailWithTemplate(templateName, data) {
        const template = this.loadTemplate(templateName);
        const layout = this.loadLayoutTemplate();
        
        if (!template) {
            console.warn(`Falling back to hardcoded template for ${templateName}`);
            return null;
        }

        // Prepare template data with brand information
        const templateData = {
            ...data,
            brand: brandConfig.getSection('brand'),
            currentDate: new Date().toLocaleDateString('en-US')
        };

        try {
            const bodyContent = template(templateData);
            
            if (layout) {
                return layout({
                    ...templateData,
                    body: bodyContent,
                    subject: data.subject || `رسالة من ${brandConfig.getBrandDisplayName()}`
                });
            } else {
                return bodyContent;
            }
        } catch (error) {
            console.error(`Error rendering template ${templateName}:`, error);
            return null;
        }
    }

    async sendWelcomeEmail(email, fullName, userId, password) {
        const brandDisplayName = brandConfig.getBrandDisplayName();
        const emailConfig = brandConfig.getEmailConfig();
        
        // Try to use dynamic template first
        const htmlContent = this.renderEmailWithTemplate('welcome', {
            userName: fullName,
            userId: userId,
            email: email,
            emailDelivered: true,
            subject: `مرحباً بك في ${brandDisplayName} - تفاصيل حسابك الجديد`
        }) || this.getWelcomeEmailHTML(fullName, userId, password); // Fallback to hardcoded
        
        const textContent = this.getWelcomeEmailText(fullName, userId, password);

        const mailOptions = {
            from: {
                name: emailConfig.from.name,
                address: emailConfig.from.address
            },
            to: email,
            subject: `مرحباً بك في ${brandDisplayName} - تفاصيل حسابك الجديد`,
            html: htmlContent,
            text: textContent,
            headers: {
                'Message-ID': `<${Date.now()}-${userId}@${brandConfig.getSection('brand').domain}>`,
                'X-Mailer': `${brandDisplayName} System`,
                'List-Unsubscribe': `<mailto:unsubscribe@${brandConfig.getSection('brand').domain}>`
            }
        };

        try {
            console.log(`📧 Attempting to send welcome email to ${email}...`);
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Welcome email sent to ${email}:`, result.messageId);
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error(`❌ Failed to send welcome email to ${email}:`, error);
            
            // Provide more specific error handling
            let userFriendlyMessage = 'خطأ في إرسال البريد الإلكتروني';
            if (error.code === 'EDNS' || error.code === 'ETIMEOUT') {
                userFriendlyMessage = 'مشكلة في الاتصال بخادم البريد الإلكتروني';
            } else if (error.code === 'EAUTH') {
                userFriendlyMessage = 'خطأ في مصادقة البريد الإلكتروني';
            }
            
            return {
                success: false,
                error: error.message,
                userMessage: userFriendlyMessage
            };
        }
    }

    getWelcomeEmailHTML(fullName, userId, password) {
        return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مرحباً بك في درع العائلة</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            direction: rtl;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        .welcome-message {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        .credentials-box {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background-color: white;
            border-radius: 5px;
            border-right: 4px solid #667eea;
        }
        .credential-label {
            font-weight: bold;
            color: #495057;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            background-color: #e9ecef;
            padding: 5px 10px;
            border-radius: 3px;
            direction: ltr;
            text-align: left;
        }
        .steps-list {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
        .steps-list h3 {
            color: #155724;
            margin-top: 0;
        }
        .steps-list ol {
            margin: 10px 0;
            padding-right: 20px;
        }
        .steps-list li {
            margin: 8px 0;
            color: #155724;
        }
        .important-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .important-note h4 {
            color: #856404;
            margin-top: 0;
        }
        .footer {
            background-color: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer a {
            color: #6c757d;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ درع العائلة</h1>
            <p>نظام إدارة القروض والمعاملات المالية</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <h2>مرحباً بك ${fullName}!</h2>
                <p>نحن سعداء بانضمامك إلى عائلة درع العائلة. تم إنشاء حسابك بنجاح وأصبح بإمكانك الوصول إلى جميع خدماتنا المالية.</p>
            </div>
            
            <div class="credentials-box">
                <h3>معلومات تسجيل الدخول</h3>
                <div class="credential-item">
                    <span class="credential-label">رقم المستخدم:</span>
                    <span class="credential-value">${userId}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">كلمة المرور:</span>
                    <span class="credential-value" style="direction: ltr;">${password}</span>
                </div>
            </div>
            
            <div class="steps-list">
                <h3>الخطوات التالية:</h3>
                <ol>
                    <li><strong>تسجيل الدخول</strong> باستخدام المعلومات المرسلة إليك</li>
                    <li><strong>تحديث ملفك الشخصي</strong> وإضافة المعلومات المطلوبة</li>
                    <li><strong>انتظار سنة كاملة</strong> من تاريخ التسجيل لتصبح مؤهلاً لطلب القروض</li>
                    <li><strong>دفع الاشتراكات المطلوبة</strong> (240 د.ك خلال 24 شهر)</li>
                    <li><strong>دفع رسوم الانضمام</strong> (10 د.ك) والحصول على موافقة الإدارة</li>
                </ol>
            </div>
            
            <div class="important-note">
                <h4>⚠️ ملاحظة مهمة:</h4>
                <ul>
                    <li>احتفظ بمعلومات تسجيل الدخول في مكان آمن</li>
                    <li>لا تشارك كلمة المرور مع أي شخص آخر</li>
                    <li>يمكنك تغيير كلمة المرور من خلال ملفك الشخصي</li>
                    <li>في حالة فقدان كلمة المرور، يمكنك إعادة تعيينها بنفسك</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>درع العائلة</strong> - نظام إدارة القروض والمعاملات المالية</p>
            <p>هذا البريد الإلكتروني تلقائي، يرجى عدم الرد عليه.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getWelcomeEmailText(fullName, userId, password) {
        return `
مرحباً بك في درع العائلة!

عزيزي/عزيزتي ${fullName}،

نحن سعداء بانضمامك إلى عائلة درع العائلة. تم إنشاء حسابك بنجاح وأصبح بإمكانك الوصول إلى جميع خدماتنا المالية.

معلومات تسجيل الدخول:
- رقم المستخدم: ${userId}
- كلمة المرور: ${password}

الخطوات التالية:
1. تسجيل الدخول باستخدام المعلومات المرسلة إليك
2. تحديث ملفك الشخصي وإضافة المعلومات المطلوبة
3. انتظار سنة كاملة من تاريخ التسجيل لتصبح مؤهلاً لطلب القروض
4. دفع الاشتراكات المطلوبة (240 د.ك خلال 24 شهر)
5. دفع رسوم الانضمام (10 د.ك) والحصول على موافقة الإدارة

ملاحظات مهمة:
- احتفظ بمعلومات تسجيل الدخول في مكان آمن
- لا تشارك كلمة المرور مع أي شخص آخر
- يمكنك تغيير كلمة المرور من خلال ملفك الشخصي
- في حالة فقدان كلمة المرور، يمكنك إعادة تعيينها بنفسك

مرحباً بك مرة أخرى!

درع العائلة
نظام إدارة القروض والمعاملات المالية

هذا البريد الإلكتروني تلقائي، يرجى عدم الرد عليه.
        `;
    }

    // Joining Fee Approval Email
    async sendJoiningFeeApprovalEmail(email, fullName, status, userFinancials = null) {
        const isApproved = status === 'approved';
        const subject = isApproved ? 
            'تم اعتماد رسوم الانضمام - مرحباً بك في درع العائلة' : 
            'تحديث حالة رسوم الانضمام - درع العائلة';
        
        const htmlContent = this.getJoiningFeeEmailHTML(fullName, status, userFinancials);
        const textContent = this.getJoiningFeeEmailText(fullName, status, userFinancials);

        return await this.sendEmail(email, subject, htmlContent, textContent);
    }

    // Loan Approval/Rejection Email
    async sendLoanStatusEmail(email, fullName, loanData, status, adminName, userFinancials = null) {
        const isApproved = status === 'approved';
        const subject = isApproved ? 
            `تم اعتماد طلب القرض ${loanData.loanAmount} د.ك - درع العائلة` : 
            'تحديث حالة طلب القرض - درع العائلة';
        
        const htmlContent = this.getLoanStatusEmailHTML(fullName, loanData, status, adminName, userFinancials);
        const textContent = this.getLoanStatusEmailText(fullName, loanData, status, adminName, userFinancials);

        return await this.sendEmail(email, subject, htmlContent, textContent);
    }

    // Transaction Approval/Rejection Email
    async sendTransactionStatusEmail(email, fullName, transactionData, status, adminName, userFinancials = null) {
        const isApproved = status === 'accepted';
        const subject = isApproved ? 
            `تم قبول المعاملة ${transactionData.amount} د.ك - درع العائلة` : 
            'تحديث حالة المعاملة المالية - درع العائلة';
        
        const htmlContent = this.getTransactionStatusEmailHTML(fullName, transactionData, status, adminName, userFinancials);
        const textContent = this.getTransactionStatusEmailText(fullName, transactionData, status, adminName, userFinancials);

        return await this.sendEmail(email, subject, htmlContent, textContent);
    }

    // Loan Payment Approval/Rejection Email
    async sendLoanPaymentStatusEmail(email, fullName, paymentData, status, adminName, loanSummary, userFinancials = null) {
        const isApproved = status === 'accepted';
        const subject = isApproved ? 
            `تم قبول دفعة القرض ${paymentData.amount} د.ك - درع العائلة` : 
            'تحديث حالة دفعة القرض - درع العائلة';
        
        const htmlContent = this.getLoanPaymentStatusEmailHTML(fullName, paymentData, status, adminName, loanSummary, userFinancials);
        const textContent = this.getLoanPaymentStatusEmailText(fullName, paymentData, status, adminName, loanSummary, userFinancials);

        return await this.sendEmail(email, subject, htmlContent, textContent);
    }

    // Generic email sender
    async sendEmail(email, subject, htmlContent, textContent) {
        const mailOptions = {
            from: {
                name: process.env.EMAIL_FROM_NAME || 'درع العائلة',
                address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || process.env.SMTP_USER || 'aal7babi2@gmail.com'
            },
            to: email,
            subject: subject,
            html: htmlContent,
            text: textContent,
            headers: {
                'Message-ID': `<${Date.now()}-${Math.random()}@daraalfamilia.com>`,
                'X-Mailer': 'درع العائلة System',
                'List-Unsubscribe': '<mailto:unsubscribe@daraalfamilia.com>'
            }
        };

        try {
            console.log(`📧 Attempting to send email to ${email}: ${subject}`);
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${email}:`, result.messageId);
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error(`❌ Failed to send email to ${email}:`, error);
            
            let userFriendlyMessage = 'خطأ في إرسال البريد الإلكتروني';
            if (error.code === 'EDNS' || error.code === 'ETIMEOUT') {
                userFriendlyMessage = 'مشكلة في الاتصال بخادم البريد الإلكتروني';
            } else if (error.code === 'EAUTH') {
                userFriendlyMessage = 'خطأ في مصادقة البريد الإلكتروني';
            }
            
            return {
                success: false,
                error: error.message,
                userMessage: userFriendlyMessage
            };
        }
    }

    // Email Template: Joining Fee Status
    getJoiningFeeEmailHTML(fullName, status, userFinancials = null) {
        const isApproved = status === 'approved';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'معتمدة' : 'مرفوضة';
        const statusIcon = isApproved ? '✅' : '❌';

        return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث حالة رسوم الانضمام</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ درع العائلة</h1>
            <p>تحديث حالة رسوم الانضمام</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <h2>مرحباً ${fullName}</h2>
                <p>نود إعلامك بتحديث حالة رسوم الانضمام الخاصة بك في صندوق درع العائلة.</p>
            </div>
            
            <div class="status-box" style="border-color: ${statusColor}; background-color: ${statusColor}15;">
                <h3 style="color: ${statusColor};">${statusIcon} حالة رسوم الانضمام: ${statusText}</h3>
                <div class="status-details">
                    <p><strong>المبلغ:</strong> 10.000 د.ك</p>
                    <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('en-US')}</p>
                    <p><strong>الحالة:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                </div>
            </div>

            ${userFinancials ? `
            <div class="financial-summary">
                <h3>📊 الوضع المالي الحالي</h3>
                <div class="financial-grid">
                    <div class="financial-item">
                        <span class="label">الرصيد الحالي:</span>
                        <span class="value">${userFinancials.currentBalance}</span>
                    </div>
                    <div class="financial-item">
                        <span class="label">إجمالي الاشتراكات:</span>
                        <span class="value">${userFinancials.totalSubscriptions} د.ك</span>
                    </div>
                </div>
            </div>
            ` : ''}

            ${isApproved ? `
            <div class="steps-list">
                <h3>الخطوات التالية:</h3>
                <ol>
                    <li>يمكنك الآن الوصول إلى جميع خدمات الصندوق</li>
                    <li>ابدأ بدفع الاشتراكات الشهرية للوصول إلى 240 د.ك خلال 24 شهر</li>
                    <li>بعد سنة كاملة ستصبح مؤهلاً لطلب القروض</li>
                    <li>تأكد من الحفاظ على رصيد 500 د.ك على الأقل للاستفادة من القروض</li>
                </ol>
            </div>
            ` : `
            <div class="important-note">
                <h4>ملاحظة مهمة:</h4>
                <p>للأسف تم رفض رسوم الانضمام. يرجى التواصل مع الإدارة للحصول على مزيد من المعلومات حول الأسباب والخطوات المطلوبة.</p>
            </div>
            `}
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
    }

    // Email Template: Loan Status
    getLoanStatusEmailHTML(fullName, loanData, status, adminName) {
        const isApproved = status === 'approved';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'معتمد' : 'مرفوض';
        const statusIcon = isApproved ? '✅' : '❌';

        return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث حالة طلب القرض</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ درع العائلة</h1>
            <p>تحديث حالة طلب القرض</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <h2>مرحباً ${fullName}</h2>
                <p>نود إعلامك بتحديث حالة طلب القرض الخاص بك.</p>
            </div>
            
            <div class="status-box" style="border-color: ${statusColor}; background-color: ${statusColor}15;">
                <h3 style="color: ${statusColor};">${statusIcon} حالة طلب القرض: ${statusText}</h3>
                <div class="loan-details">
                    <div class="detail-row">
                        <span>مبلغ القرض:</span>
                        <span style="font-weight: bold;">${loanData.loanAmount} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>القسط الشهري:</span>
                        <span style="font-weight: bold;">${loanData.installmentAmount} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>عدد الأقساط:</span>
                        <span style="font-weight: bold;">${loanData.numberOfInstallments} قسط</span>
                    </div>
                    <div class="detail-row">
                        <span>المدير المعتمد:</span>
                        <span style="font-weight: bold;">${adminName}</span>
                    </div>
                    <div class="detail-row">
                        <span>تاريخ الطلب:</span>
                        <span>${new Date(loanData.requestDate).toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>

            ${isApproved ? `
            <div class="steps-list">
                <h3>الخطوات التالية:</h3>
                <ol>
                    <li>يمكنك الآن البدء في دفع الأقساط الشهرية</li>
                    <li>ادفع ${loanData.installmentAmount} د.ك شهرياً لمدة ${loanData.numberOfInstallments} شهر</li>
                    <li>يمكنك دفع أكثر من قسط في أي وقت للتسديد المبكر</li>
                    <li>ستتلقى تأكيد عبر البريد الإلكتروني عند قبول كل دفعة</li>
                </ol>
            </div>
            <div class="important-note">
                <h4>💡 تذكير مهم:</h4>
                <p>هذا القرض بدون فوائد - ستدفع ${loanData.loanAmount} د.ك فقط موزعة على ${loanData.numberOfInstallments} قسط.</p>
            </div>
            ` : `
            <div class="important-note">
                <h4>سبب الرفض:</h4>
                <p>${loanData.notes || 'لم يتم استيفاء شروط القرض المطلوبة. يرجى التواصل مع الإدارة للحصول على مزيد من التفاصيل.'}</p>
            </div>
            `}
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
    }

    // Email Template: Transaction Status 
    getTransactionStatusEmailHTML(fullName, transactionData, status, adminName, totalSubscriptions = null) {
        const isApproved = status === 'accepted';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'مقبولة' : 'مرفوضة';
        const statusIcon = isApproved ? '✅' : '❌';
        const isSubscription = transactionData.transaction_type === 'subscription';

        return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث حالة المعاملة المالية</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ درع العائلة</h1>
            <p>تحديث حالة المعاملة المالية</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <h2>مرحباً ${fullName}</h2>
                <p>نود إعلامك بتحديث حالة المعاملة المالية الخاصة بك.</p>
            </div>
            
            <div class="status-box" style="border-color: ${statusColor}; background-color: ${statusColor}15;">
                <h3 style="color: ${statusColor};">${statusIcon} حالة المعاملة: ${statusText}</h3>
                <div class="transaction-details">
                    <div class="detail-row">
                        <span>نوع المعاملة:</span>
                        <span style="font-weight: bold;">${this.getTransactionTypeText(transactionData.transaction_type)}</span>
                    </div>
                    <div class="detail-row">
                        <span>المبلغ:</span>
                        <span style="font-weight: bold;">${transactionData.amount} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>الوصف:</span>
                        <span>${transactionData.memo || 'لا يوجد وصف'}</span>
                    </div>
                    <div class="detail-row">
                        <span>المدير المعتمد:</span>
                        <span style="font-weight: bold;">${adminName}</span>
                    </div>
                    <div class="detail-row">
                        <span>تاريخ المعاملة:</span>
                        <span>${new Date(transactionData.date).toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>

            ${isApproved && isSubscription && totalSubscriptions ? `
            <div class="subscription-summary">
                <h4>📊 ملخص اشتراكاتك</h4>
                <div class="subscription-details">
                    <div class="detail-row">
                        <span>إجمالي الاشتراكات:</span>
                        <span style="font-weight: bold; color: #28a745;">${totalSubscriptions} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>هذا الاشتراك:</span>
                        <span style="font-weight: bold;">${transactionData.amount} د.ك</span>
                    </div>
                </div>
                <div style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin-top: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #155724;">
                        💡 <strong>شكراً لك على الاشتراك المستمر!</strong> اشتراكاتك تساهم في نمو رصيدك وتؤهلك للحصول على قروض أكبر.
                    </p>
                </div>
            </div>
            ` : ''}

            ${isApproved ? `
            <div class="success-message">
                <h4>✅ تم قبول المعاملة بنجاح!</h4>
                <p>تم تحديث رصيدك وسيظهر التغيير في حسابك خلال دقائق قليلة.</p>
            </div>
            ` : `
            <div class="important-note">
                <h4>❌ تم رفض المعاملة</h4>
                <p>للأسف تم رفض هذه المعاملة. يرجى التواصل مع الإدارة للحصول على مزيد من التفاصيل.</p>
            </div>
            `}
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
    }

    // Email Template: Loan Payment Status
    getLoanPaymentStatusEmailHTML(fullName, paymentData, status, adminName, loanSummary) {
        const isApproved = status === 'accepted';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'مقبولة' : 'مرفوضة';
        const statusIcon = isApproved ? '✅' : '❌';

        return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث حالة دفعة القرض</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ درع العائلة</h1>
            <p>تحديث حالة دفعة القرض</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <h2>مرحباً ${fullName}</h2>
                <p>نود إعلامك بتحديث حالة دفعة القرض التي قمت بإرسالها.</p>
            </div>
            
            <div class="status-box" style="border-color: ${statusColor}; background-color: ${statusColor}15;">
                <h3 style="color: ${statusColor};">${statusIcon} حالة الدفعة: ${statusText}</h3>
                <div class="payment-details">
                    <div class="detail-row">
                        <span>مبلغ الدفعة:</span>
                        <span style="font-weight: bold;">${paymentData.amount} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>ملاحظات:</span>
                        <span>${paymentData.memo || 'لا توجد ملاحظات'}</span>
                    </div>
                    <div class="detail-row">
                        <span>المدير المعتمد:</span>
                        <span style="font-weight: bold;">${adminName}</span>
                    </div>
                    <div class="detail-row">
                        <span>تاريخ الدفعة:</span>
                        <span>${new Date(paymentData.date).toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>

            ${isApproved && loanSummary ? `
            <div class="loan-progress">
                <h4>📊 ملخص حالة القرض</h4>
                <div class="progress-details">
                    <div class="detail-row">
                        <span>إجمالي القرض:</span>
                        <span style="font-weight: bold;">${loanSummary.totalLoan} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>المبلغ المسدد:</span>
                        <span style="font-weight: bold; color: #28a745;">${loanSummary.totalPaid} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>القرض:</span>
                        <span style="font-weight: bold; color: #dc3545;">${loanSummary.remainingAmount} د.ك</span>
                    </div>
                    <div class="detail-row">
                        <span>نسبة السداد:</span>
                        <span style="font-weight: bold;">${loanSummary.completionPercentage}%</span>
                    </div>
                </div>
                
                ${loanSummary.isCompleted ? `
                <div class="completion-celebration">
                    <h4 style="color: #28a745;">🎉 مبروك! تم سداد القرض بالكامل!</h4>
                    <p>لقد أكملت سداد قرضك بنجاح. يمكنك الآن طلب قرض جديد بعد مرور 30 يوماً.</p>
                </div>
                ` : `
                <div class="next-payment">
                    <h5>💡 تذكير:</h5>
                    <p>القسط التالي المطلوب: <strong>${loanSummary.nextInstallment} د.ك</strong></p>
                </div>
                `}
            </div>
            ` : ''}

            ${!isApproved ? `
            <div class="important-note">
                <h4>❌ تم رفض الدفعة</h4>
                <p>للأسف تم رفض دفعة القرض. يرجى التواصل مع الإدارة للحصول على مزيد من التفاصيل والتأكد من صحة المبلغ.</p>
            </div>
            ` : ''}
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
    }

    // Helper methods for text versions
    getJoiningFeeEmailText(fullName, status) {
        const statusText = status === 'approved' ? 'معتمدة' : 'مرفوضة';
        return `درع العائلة - تحديث حالة رسوم الانضمام\n\nمرحباً ${fullName}\n\nحالة رسوم الانضمام: ${statusText}\nالمبلغ: 10.000 د.ك\nالتاريخ: ${new Date().toLocaleDateString('en-US')}\n\nدرع العائلة\nنظام إدارة القروض والمعاملات المالية`;
    }

    getLoanStatusEmailText(fullName, loanData, status, adminName) {
        const statusText = status === 'approved' ? 'معتمد' : 'مرفوض';
        return `درع العائلة - تحديث حالة طلب القرض\n\nمرحباً ${fullName}\n\nحالة طلب القرض: ${statusText}\nمبلغ القرض: ${loanData.loanAmount} د.ك\nالقسط الشهري: ${loanData.installmentAmount} د.ك\nالمدير المعتمد: ${adminName}\n\nدرع العائلة`;
    }

    getTransactionStatusEmailText(fullName, transactionData, status, adminName, totalSubscriptions = null) {
        const statusText = status === 'accepted' ? 'مقبولة' : 'مرفوضة';
        const isSubscription = transactionData.transaction_type === 'subscription';
        
        let text = `درع العائلة - تحديث حالة المعاملة\n\nمرحباً ${fullName}\n\nحالة المعاملة: ${statusText}\nالمبلغ: ${transactionData.amount} د.ك\nالمدير المعتمد: ${adminName}`;
        
        if (status === 'accepted' && isSubscription && totalSubscriptions) {
            text += `\n\nملخص اشتراكاتك:\nإجمالي الاشتراكات: ${totalSubscriptions} د.ك\nهذا الاشتراك: ${transactionData.amount} د.ك`;
        }
        
        return text + '\n\nدرع العائلة';
    }

    getLoanPaymentStatusEmailText(fullName, paymentData, status, adminName, loanSummary) {
        const statusText = status === 'accepted' ? 'مقبولة' : 'مرفوضة';
        let text = `درع العائلة - تحديث حالة دفعة القرض\n\nمرحباً ${fullName}\n\nحالة الدفعة: ${statusText}\nمبلغ الدفعة: ${paymentData.amount} د.ك\nالمدير المعتمد: ${adminName}`;
        
        if (status === 'accepted' && loanSummary) {
            text += `\n\nملخص القرض:\nالمبلغ المسدد: ${loanSummary.totalPaid} د.ك\nالقرض: ${loanSummary.remainingAmount} د.ك`;
        }
        
        return text + '\n\nدرع العائلة';
    }

    // Helper methods
    getTransactionTypeText(type) {
        const types = {
            'deposit': 'إيداع',
            'withdrawal': 'سحب',
            'subscription': 'اشتراك شهري',
            'joining_fee': 'رسوم انضمام'
        };
        return types[type] || type;
    }

    getEmailStyles() {
        return `<style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 30px; }
            .welcome-message { font-size: 18px; color: #333; margin-bottom: 20px; }
            .status-box { border: 2px solid; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px; }
            .steps-list { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0; }
            .important-note { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .footer { background-color: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px; }
        </style>`;
    }

    getEmailFooter() {
        return `<div class="footer">
            <p><strong>درع العائلة</strong> - نظام إدارة القروض والمعاملات المالية</p>
            <p>هذا البريد الإلكتروني تلقائي، يرجى عدم الرد عليه.</p>
        </div>`;
    }
}

module.exports = new EmailService();