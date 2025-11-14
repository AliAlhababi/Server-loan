#!/usr/bin/env node

// Test Site B email with logo
process.env.BRAND_NAME = 'siteB';

const emailService = require('./backend/services/emailService');
const brandConfig = require('./backend/config/brandConfig');

async function testLogoEmail() {
    const testEmails = [
        'almajadi.t@gmail.com',
        'a_al7babi2@hotmail.com'
    ];

    console.log('🧪 Testing Site B email with NEW CUSTOM DOMAIN...');
    console.log(`🏢 Brand: ${brandConfig.getBrandDisplayName()}`);
    console.log(`🌐 Domain: ${brandConfig.getSection('brand').domain}`);
    console.log(`🖼️ Logo URL: ${brandConfig.getSection('brand').logoUrl}`);
    console.log(`📧 Full Logo URL: https://${brandConfig.getSection('brand').domain}${brandConfig.getSection('brand').logoUrl}`);
    console.log(`📮 From: info@al-almajadi.com`);
    console.log('─'.repeat(50));

    for (const testEmail of testEmails) {
        console.log(`\n📧 Sending to: ${testEmail}`);

        try {
            // Send welcome email with logo
            const result = await emailService.sendWelcomeEmail(
                testEmail,
                'أحمد محمد المجادي',
                'MB2025TEST',
                'TestPass123'
            );

            if (result.success) {
                console.log(`✅ Email sent successfully to ${testEmail}!`);
                console.log(`📧 Message ID: ${result.messageId}`);
            } else {
                console.log(`❌ Failed to send email to ${testEmail}:`, result.error);
            }

        } catch (error) {
            console.error(`❌ Error sending to ${testEmail}:`, error);
        }
    }
}

testLogoEmail().then(() => {
    console.log('✅ Logo test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});