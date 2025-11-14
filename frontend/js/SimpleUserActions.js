// Simple User Actions - Global functions for deposit/withdrawal
// This ensures the functions are ALWAYS available regardless of which system loads

console.log('🔧 Loading SimpleUserActions...');

// Simple deposit function
window.simpleDeposit = async function(userId) {
    console.log('💰 simpleDeposit called with userId:', userId);
    
    const amount = prompt('أدخل مبلغ الإيداع (د.ك):');
    if (!amount || parseFloat(amount) <= 0) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
    }
    
    const memo = prompt('ملاحظات (اختياري):') || 'إيداع من المدير';
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/add-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: JSON.stringify({
                userId: userId,
                amount: parseFloat(amount),
                memo: memo,
                transactionType: 'deposit',
                status: 'accepted'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'خطأ في الخادم');
        }
        
        alert('تم إضافة الإيداع بنجاح');
        window.location.reload();
        
    } catch (error) {
        console.error('Deposit error:', error);
        alert('خطأ: ' + error.message);
    }
};

// Simple withdrawal function
window.simpleWithdrawal = async function(userId) {
    console.log('💸 simpleWithdrawal called with userId:', userId);
    
    // Get user balance first
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/user-details/${userId}`, {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'خطأ في الخادم');
        }
        
        const currentBalance = result.user?.balance || 0;
        const amount = prompt(`الرصيد الحالي: ${parseFloat(currentBalance).toFixed(3)} د.ك\n\nأدخل مبلغ السحب (د.ك):`);
        
        if (!amount || parseFloat(amount) <= 0) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }
        
        if (parseFloat(amount) > currentBalance) {
            alert('المبلغ أكبر من الرصيد المتاح');
            return;
        }
        
        const memo = prompt('ملاحظات (اختياري):') || 'سحب من المدير';
        
        const withdrawalResponse = await fetch('/api/admin/add-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: JSON.stringify({
                userId: userId,
                amount: parseFloat(amount),
                memo: memo,
                transactionType: 'withdrawal',
                status: 'accepted'
            })
        });
        
        const withdrawalResult = await withdrawalResponse.json();
        
        if (!withdrawalResponse.ok) {
            throw new Error(withdrawalResult.message || 'خطأ في الخادم');
        }
        
        alert('تم إضافة السحب بنجاح');
        window.location.reload();
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        alert('خطأ: ' + error.message);
    }
};

// Legacy function names for compatibility
window.showDepositModal = function() {
    console.log('⚠️ Legacy showDepositModal called - redirecting to simple version');
    // Try to get userId from current context
    const userId = window.currentUserData?.user_id || prompt('أدخل رقم المستخدم:');
    if (userId) {
        window.simpleDeposit(userId);
    }
};

window.showWithdrawalModal = function() {
    console.log('⚠️ Legacy showWithdrawalModal called - redirecting to simple version');
    // Try to get userId from current context
    const userId = window.currentUserData?.user_id || prompt('أدخل رقم المستخدم:');
    if (userId) {
        window.simpleWithdrawal(userId);
    }
};

console.log('✅ SimpleUserActions loaded successfully');
console.log('✅ Global functions available:', {
    simpleDeposit: typeof window.simpleDeposit,
    simpleWithdrawal: typeof window.simpleWithdrawal,
    showDepositModal: typeof window.showDepositModal,
    showWithdrawalModal: typeof window.showWithdrawalModal
});