const nodemailer = require('nodemailer');

// Email service configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      // Check if all required environment variables are present
      const {
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_USER,
        EMAIL_PASSWORD,
        EMAIL_FROM_NAME,
        EMAIL_FROM_ADDRESS
      } = process.env;

      if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
        console.log('📧 Email service not configured - missing environment variables');
        console.log('Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD');
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT) || 587,
        secure: (EMAIL_PORT == 465), // true for 465, false for other ports
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD
        },
        // Additional configuration for Gmail
        ...(EMAIL_HOST.includes('gmail') && {
          service: 'gmail',
          auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD // Use App Password for Gmail
          }
        })
      });

      this.fromName = EMAIL_FROM_NAME || 'درع العائلة';
      this.fromAddress = EMAIL_FROM_ADDRESS || EMAIL_USER;
      this.isConfigured = true;

      console.log('✅ Email service configured successfully');
      console.log(`📧 Using: ${EMAIL_HOST} with user: ${EMAIL_USER}`);

    } catch (error) {
      console.error('❌ Email service configuration failed:', error.message);
      this.isConfigured = false;
    }
  }

  async sendWelcomeEmail(email, fullName, userId, password) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const emailContent = {
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: email,
      subject: 'مرحباً بك في درع العائلة - تأكيد التسجيل',
      html: this.generateWelcomeEmailHTML(fullName, userId, password, email),
      // Add headers to prevent spam
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@example.com>',
        'Message-ID': `<${Date.now()}.${Math.random()}@${this.fromAddress.split('@')[1]}>`,
        'X-Mailer': 'درع العائلة System',
        'X-Priority': '3',
        'Importance': 'Normal'
      },
      // Add text version to improve deliverability
      text: this.generateWelcomeEmailText(fullName, userId, password, email)
    };

    try {
      console.log(`📧 Sending welcome email to: ${email}`);
      const info = await this.transporter.sendMail(emailContent);
      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateWelcomeEmailText(fullName, userId, password, email) {
    return `
مرحباً بك في درع العائلة

مرحباً ${fullName}

نرحب بك في صندوق درع العائلة. تم تسجيل حسابك بنجاح ويمكنك الآن الدخول إلى النظام.

بيانات تسجيل الدخول:
- رقم المستخدم: ${userId}
- كلمة المرور: ${password}
- البريد الإلكتروني: ${email}

الخطوات التالية:
1. تسجيل الدخول إلى النظام باستخدام بياناتك أعلاه
2. دفع رسوم الانضمام 10 دنانير كويتية
3. انتظار موافقة الإدارة على رسوم الانضمام
4. البدء في دفع الاشتراكات الشهرية
5. يمكن التقدم للقروض بعد سنة واحدة من التسجيل

معلومات مهمة:
- رسوم الانضمام: 10 دنانير كويتية غير قابلة للاسترداد
- فترة الانتظار: سنة واحدة من تاريخ التسجيل قبل التقدم للقروض
- الحد الأدنى للرصيد: 500 دينار كويتي للحصول على قرض

ملاحظة أمنية:
يرجى الاحتفاظ ببيانات تسجيل الدخول في مكان آمن. لا تشارك كلمة المرور مع أي شخص آخر.

درع العائلة
نظام إدارة القروض والمدخرات
    `;
  }

  generateWelcomeEmailHTML(fullName, userId, password, email) {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مرحباً بك في درع العائلة</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">مرحباً بك في درع العائلة</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">نظام إدارة القروض والمدخرات</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">مرحباً ${fullName} 👋</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0 0 30px 0;">
              نرحب بك في صندوق درع العائلة. تم تسجيل حسابك بنجاح ويمكنك الآن الدخول إلى النظام.
            </p>
            
            <!-- Login Details -->
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 30px 0; border-right: 4px solid #667eea;">
              <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px;">🔑 بيانات تسجيل الدخول:</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                <p style="margin: 0 0 10px 0; color: #333;"><strong>رقم المستخدم:</strong> <span style="color: #667eea; font-size: 18px; font-weight: bold;">${userId}</span></p>
                <p style="margin: 0 0 10px 0; color: #333;"><strong>كلمة المرور:</strong> <span style="color: #dc3545; font-size: 16px; font-weight: bold; direction: ltr; display: inline-block;">${password}</span></p>
                <p style="margin: 0; color: #333;"><strong>البريد الإلكتروني:</strong> ${email}</p>
              </div>
            </div>
            
            <!-- Next Steps -->
            <div style="background: #e3f2fd; padding: 25px; border-radius: 10px; margin: 30px 0; border-right: 4px solid #2196f3;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">📋 الخطوات التالية:</h3>
              <ol style="color: #333; line-height: 1.8; margin: 0; padding-right: 20px;">
                <li>تسجيل الدخول إلى النظام باستخدام بياناتك أعلاه</li>
                <li><strong>دفع رسوم الانضمام 10 دنانير كويتية</strong></li>
                <li>انتظار موافقة الإدارة على رسوم الانضمام</li>
                <li>البدء في دفع الاشتراكات الشهرية</li>
                <li>يمكن التقدم للقروض بعد سنة واحدة من التسجيل</li>
              </ol>
            </div>
            
            <!-- Important Terms -->
            <div style="background: #fff3cd; padding: 25px; border-radius: 10px; margin: 30px 0; border-right: 4px solid #ffc107;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">⚠️ معلومات مهمة:</h3>
              <ul style="color: #333; line-height: 1.8; margin: 0; padding-right: 20px;">
                <li><strong>رسوم الانضمام:</strong> 10 دنانير كويتية غير قابلة للاسترداد</li>
                <li><strong>فترة الانتظار:</strong> سنة واحدة من تاريخ التسجيل قبل التقدم للقروض</li>
                <li><strong>الحد الأدنى للرصيد:</strong> 500 دينار كويتي للحصول على قرض</li>
                <li><strong>الإشعارات:</strong> ستُرسل عبر البريد الإلكتروني والواتساب</li>
              </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <p style="color: #666; margin: 0 0 20px 0;">جاهز للبدء؟</p>
              <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🚀 دخول النظام الآن
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 30px 0; border-right: 4px solid #dc3545;">
              <h4 style="color: #721c24; margin: 0 0 10px 0; font-size: 16px;">🔐 ملاحظة أمنية:</h4>
              <p style="color: #721c24; margin: 0; font-size: 14px; line-height: 1.5;">
                يرجى الاحتفاظ ببيانات تسجيل الدخول في مكان آمن. لا تشارك كلمة المرور مع أي شخص آخر.
                يمكنك تغيير كلمة المرور من داخل النظام بعد تسجيل الدخول.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 20px;">درع العائلة</h3>
            <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">نظام إدارة القروض والمدخرات</p>
            <p style="color: #999; margin: 0; font-size: 12px;">
              في حالة وجود أي استفسارات، يرجى التواصل مع الإدارة<br>
              هذا البريد الإلكتروني تم إرساله تلقائياً، يرجى عدم الرد عليه
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email connectivity
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email server connection successful');
      return { success: true, message: 'Email server connection successful' };
    } catch (error) {
      console.error('❌ Email server connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();