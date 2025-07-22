# Email Configuration Guide for درع العائلة

## Overview
The system now supports automatic email sending for new user registrations. This guide explains how to configure email settings for different SMTP providers.

## ✅ Features Implemented
- **Welcome Emails**: Automatic welcome emails with login credentials for new users
- **Professional Templates**: Arabic RTL email templates with company branding
- **Multiple SMTP Support**: Gmail, Outlook, Yahoo, and custom SMTP servers
- **Testing Endpoint**: Admin can test email functionality
- **Graceful Fallback**: Registration continues even if email fails

## 🔧 Quick Setup (Gmail - Recommended)

### Step 1: Prepare Gmail Account
1. Enable 2-Factor Authentication on your Gmail account
2. Go to your Google Account settings
3. Navigate to Security → 2-Step Verification → App passwords
4. Generate a new App Password for "Mail"
5. Copy the 16-character password (remove spaces)

### Step 2: Configure Environment Variables
Add these to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM_NAME=درع العائلة
EMAIL_FROM_ADDRESS=your-email@gmail.com
```

### Step 3: Test Configuration
1. Login as admin
2. Use the email test endpoint: `POST /api/admin/test-email`
3. Check if email is sent successfully

## 🔧 Alternative SMTP Providers

### Microsoft Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

## 📧 Email Service Features

### Welcome Email Contents
- Company branding with gradient header
- User login credentials (ID and password)
- Next steps checklist
- Important terms and conditions
- Security notices
- Arabic RTL layout support

### Security Features
- Secure SMTP connections (TLS/SSL)
- App passwords (no plain passwords)
- Graceful error handling
- No email credentials logged

## 🧪 Testing Email Functionality

### Admin Test Endpoint
```bash
POST /api/admin/test-email
Authorization: Bearer <admin-jwt-token>
```

This endpoint will:
1. Test SMTP connection
2. Send a test welcome email
3. Return connection and sending status

### Manual Testing
1. Register a new user through admin panel
2. Check if welcome email is sent
3. Verify email formatting and content

## 💰 Cost Information

### Gmail (Free Tier)
- **Cost**: Free
- **Limits**: 100 emails per day for regular accounts
- **Recommended for**: Small organizations

### Google Workspace
- **Cost**: $6/user/month
- **Limits**: Higher sending limits
- **Recommended for**: Business use

### Third-party Services
- **SendGrid**: $19.95/month for 40,000 emails
- **Mailgun**: $35/month for 50,000 emails
- **Amazon SES**: $0.10 per 1,000 emails

## 🔧 Production Deployment

### Vercel Environment Variables
Add these in your Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each EMAIL_* variable
4. Redeploy the application

### Environment Variable Security
- Never commit `.env` files to version control
- Use strong, unique app passwords
- Rotate passwords regularly
- Monitor email sending logs

## 🐛 Troubleshooting

### Common Issues

**"Email service not configured"**
- Check if all required environment variables are set
- Verify variable names match exactly

**"Authentication failed"**
- For Gmail: Ensure you're using App Password, not regular password
- For other providers: Verify username/password combination

**"Connection timeout"**
- Check SMTP host and port settings
- Verify network connectivity
- Try different ports (587, 465, 25)

**Emails not delivered**
- Check spam folders
- Verify recipient email addresses
- Monitor SMTP provider limits

### Debug Logs
The system provides detailed console logging:
- ✅ Successful configurations
- ❌ Failed configurations
- 📧 Email sending attempts
- Connection test results

## 📝 API Endpoints

### Send Welcome Email (Automatic)
Called automatically during user registration via admin panel.

### Test Email Connection
```
POST /api/admin/test-email
```
Returns connection status and sends test email.

## 🔄 Future Enhancements
- Password reset emails
- Loan approval notifications
- Monthly statements via email
- SMS integration for critical notifications
- Email templates customization

## 📞 Support
For email configuration issues:
1. Check this documentation first
2. Verify environment variables
3. Test with admin endpoint
4. Check console logs for detailed error messages