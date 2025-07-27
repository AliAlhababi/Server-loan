const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        // Use TLS on port 587 instead of SSL on port 465 for better compatibility
        const config = {
            host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
            secure: false, // Use TLS instead of SSL
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER || process.env.SMTP_USER || 'aal7babi2@gmail.com',
                pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
            },
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

    async sendWelcomeEmail(email, fullName, userId, password) {
        const htmlContent = this.getWelcomeEmailHTML(fullName, userId, password);
        const textContent = this.getWelcomeEmailText(fullName, userId, password);

        const mailOptions = {
            from: {
                name: process.env.EMAIL_FROM_NAME || 'درع العائلة',
                address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || process.env.SMTP_USER || 'aal7babi2@gmail.com'
            },
            to: email,
            subject: 'مرحباً بك في درع العائلة - تفاصيل حسابك الجديد',
            html: htmlContent,
            text: textContent,
            headers: {
                'Message-ID': `<${Date.now()}-${userId}@daraalfamilia.com>`,
                'X-Mailer': 'درع العائلة System',
                'List-Unsubscribe': '<mailto:unsubscribe@daraalfamilia.com>'
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
}

module.exports = new EmailService();