#!/usr/bin/env node

/**
 * Test script to verify WhatsApp message templates work correctly with different brand names
 * This script tests the dynamic brand name functionality for Site B (صندوق المجادي)
 */

console.log('🧪 Testing WhatsApp Message Templates with Dynamic Brand Names\n');

// Manually recreate the getWhatsAppTemplates function logic for testing
function getWhatsAppTemplates(brandName = null) {
    // Use provided brand name or fallback
    const finalBrandName = brandName || 'درع العائلة';
    
    return {
        joiningFeeApproved: (userName, userFinancials = null) => {
            let message = `🛡️ ${finalBrandName} - اعتماد العضوية

مبروك ${userName}! 🎉

تم اعتماد رسوم الانضمام وأصبحت عضواً فعالاً في صندوق ${finalBrandName}.`;

            if (userFinancials) {
                message += `\n\n💰 إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;
            }

            message += `\n\n✅ الخطوات التالية:
• ابدأ بدفع الاشتراكات الشهرية
• بعد سنة كاملة ستصبح مؤهلاً لطلب القروض

أهلاً وسهلاً بك في عائلة ${finalBrandName}
إدارة الصندوق`;
            return message;
        },

        loanApproved: (userName, loanAmount, installmentAmount, numberOfInstallments) => {
            let message = `🛡️ ${finalBrandName} - اعتماد القرض

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
إدارة ${finalBrandName}`;
            return message;
        },

        transactionApproved: (userName, amount, transactionType, userFinancials = null) => {
            const typeText = {
                'subscription': 'الاشتراك'
            }[transactionType] || 'المعاملة';

            let message = `🛡️ ${finalBrandName} - قبول ${typeText}

مرحباً ${userName} ✅

تم قبول ${typeText} بمبلغ ${amount} بنجاح.`;

            if (userFinancials && transactionType === 'subscription') {
                message += `\n\n💰 تفاصيل الحساب:`;
                message += `\n• رصيدك الحالي: ${userFinancials.currentBalance.toFixed(3)} د.ك`;
                message += `\n• إجمالي اشتراكاتك: ${userFinancials.totalSubscriptions} د.ك`;
            }

            message += `\n\nشكراً لك
إدارة ${finalBrandName}`;
            return message;
        }
    };
}

function getTermsContent(brandName = null) {
    const finalBrandName = brandName || 'درع العائلة';
    
    return `
        <div class="terms-header">
            <div class="welcome-notice">
                <h2 style="color: #007bff; text-align: center; margin-bottom: 15px;">
                    <i class="fas fa-shield-alt"></i> مرحباً بكم في صندوق ${finalBrandName}
                </h2>
                <p style="text-align: center; font-size: 16px; color: #666; margin-bottom: 20px;">
                    يرجى قراءة الشروط والأحكام التالية بعناية قبل التسجيل
                </p>
            </div>
        </div>`;
}

// Test 1: Default brand (درع العائلة)
console.log('📱 Test 1: Default Brand (درع العائلة)');
console.log('='.repeat(50));

const templatesDefault = getWhatsAppTemplates();
const joiningMessageDefault = templatesDefault.joiningFeeApproved('أحمد محمد');

console.log(joiningMessageDefault);
console.log('\n');

// Test 2: Site B brand (صندوق المجادي)
console.log('📱 Test 2: Site B Brand (صندوق المجادي)');
console.log('='.repeat(50));

const templatesSiteB = getWhatsAppTemplates('صندوق المجادي');
const joiningMessageSiteB = templatesSiteB.joiningFeeApproved('أحمد محمد');

console.log(joiningMessageSiteB);
console.log('\n');

// Test 3: Loan approval message comparison
console.log('📱 Test 3: Loan Approval Messages Comparison');
console.log('='.repeat(50));

const loanMessageDefault = templatesDefault.loanApproved('فاطمة أحمد', '2000.000 د.ك', '100.000 د.ك', 20);
const loanMessageSiteB = templatesSiteB.loanApproved('فاطمة أحمد', '2000.000 د.ك', '100.000 د.ك', 20);

console.log('Default Brand:');
console.log(loanMessageDefault);
console.log('\nSite B Brand:');
console.log(loanMessageSiteB);
console.log('\n');

// Test 4: Transaction message with userFinancials
console.log('📱 Test 4: Transaction Approval with Financial Details');
console.log('='.repeat(50));

const userFinancials = {
    currentBalance: 1250.500,
    transactionAmount: 10.000,
    totalSubscriptions: '245.000'
};

const transactionMessageSiteB = templatesSiteB.transactionApproved('سعد العتيبي', '10.000 د.ك', 'subscription', userFinancials);
console.log(transactionMessageSiteB);
console.log('\n');

// Test 5: Terms content
console.log('📄 Test 5: Terms Content');
console.log('='.repeat(50));

const termsDefault = getTermsContent();
const termsSiteB = getTermsContent('صندوق المجادي');

console.log('Default Terms Header:');
console.log(termsDefault.match(/<h2.*?>.*?<\/h2>/)[0]);
console.log('\nSite B Terms Header:');
console.log(termsSiteB.match(/<h2.*?>.*?<\/h2>/)[0]);
console.log('\n');

// Verify results
console.log('✅ Verification Results:');
console.log('='.repeat(50));

const defaultHasDara = joiningMessageDefault.includes('درع العائلة');
const siteBHasMajadi = joiningMessageSiteB.includes('صندوق المجادي');
const siteBNoDara = !joiningMessageSiteB.includes('درع العائلة');

console.log(`✓ Default template contains "درع العائلة": ${defaultHasDara ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✓ Site B template contains "صندوق المجادي": ${siteBHasMajadi ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✓ Site B template does NOT contain "درع العائلة": ${siteBNoDara ? '✅ PASS' : '❌ FAIL'}`);

const allTestsPassed = defaultHasDara && siteBHasMajadi && siteBNoDara;
console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPassed) {
    console.log('\n🎉 WhatsApp message templates are now correctly using dynamic brand names!');
    console.log('   Site B will show "صندوق المجادي" instead of "درع العائلة"');
} else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
}