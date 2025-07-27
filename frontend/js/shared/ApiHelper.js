// API Helper - Centralized API management
class ApiHelper {
    
    // Common API call wrapper with error handling
    static async call(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('token');
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            };
            
            const config = { ...defaultOptions, ...options };
            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }
            
            const response = await fetch(`/api${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Loan-specific API calls
    static async getUserLoanHistory(userId, limit = 50) {
        return this.call(`/users/loans/history/${userId}?limit=${limit}`);
    }
    
    static async getUserActiveLoan(userId) {
        return this.call(`/loans/active/${userId}`);
    }
    
    static async checkLoanEligibility(userId) {
        return this.call(`/users/loans/eligibility/${userId}`);
    }
    
    static async submitLoanPayment(amount, memo = '') {
        return this.call('/loans/payment', {
            method: 'POST',
            body: { amount, memo }
        });
    }
    
    static async requestLoan(amount) {
        return this.call('/loans/request', {
            method: 'POST',
            body: { amount }
        });
    }
    
    // User-specific API calls
    static async getUserTransactions(userId, limit = 50) {
        return this.call(`/users/transactions/${userId}?limit=${limit}`);
    }
    
    static async getUserInfo(userId) {
        return this.call(`/users/${userId}`);
    }
    
    // Admin-specific API calls
    static async getPendingLoans() {
        return this.call('/admin/pending-loans');
    }
    
    static async getPendingLoanPayments() {
        return this.call('/admin/pending-loan-payments');
    }
    
    static async approveLoanAction(loanId, action, reason = '') {
        return this.call(`/admin/loan-action/${loanId}`, {
            method: 'POST',
            body: { action, reason }
        });
    }
    
    static async approveLoanPayment(paymentId, action, reason = '') {
        return this.call(`/admin/loan-payment-action/${paymentId}`, {
            method: 'POST',
            body: { action, reason }
        });
    }
}

// Export for global use and maintain backward compatibility
window.ApiHelper = ApiHelper;

// Maintain backward compatibility with existing apiCall function
if (typeof apiCall === 'undefined') {
    window.apiCall = (endpoint, options) => ApiHelper.call(endpoint, options);
}