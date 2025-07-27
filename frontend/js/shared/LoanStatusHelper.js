// Loan Status Helper - Centralized loan status logic
class LoanStatusHelper {
    
    // Determine if a loan is actually completed based on payments
    static isLoanCompleted(loan) {
        const totalPaid = parseFloat(loan.total_paid || 0);
        const loanAmount = parseFloat(loan.loan_amount || 0);
        return loan.status === 'approved' && (totalPaid >= loanAmount);
    }
    
    // Determine if a loan is active (approved but not completed)
    static isLoanActive(loan) {
        const totalPaid = parseFloat(loan.total_paid || 0);
        const loanAmount = parseFloat(loan.loan_amount || 0);
        return loan.status === 'approved' && (totalPaid < loanAmount);
    }
    
    // Get loan status class for CSS styling
    static getLoanStatusClass(loan) {
        if (this.isLoanCompleted(loan)) return 'completed';
        if (this.isLoanActive(loan)) return 'active';
        if (loan.status === 'pending') return 'pending';
        return 'rejected';
    }
    
    // Get loan status text in Arabic
    static getLoanStatusText(loan) {
        if (this.isLoanCompleted(loan)) return 'مكتمل';
        if (this.isLoanActive(loan)) return 'نشط';
        if (loan.status === 'pending') return 'معلق';
        return 'مرفوض';
    }
    
    // Calculate loan progress metrics
    static getLoanProgress(loan) {
        const totalPaid = parseFloat(loan.total_paid || 0);
        const loanAmount = parseFloat(loan.loan_amount || 0);
        const installmentAmount = parseFloat(loan.installment_amount || 1);
        const remainingAmount = loanAmount - totalPaid;
        const totalInstallments = Math.ceil(loanAmount / installmentAmount);
        const paidInstallments = Math.floor(totalPaid / installmentAmount);
        const progressPercentage = loanAmount > 0 ? (totalPaid / loanAmount) * 100 : 0;
        
        return {
            totalPaid,
            remainingAmount,
            totalInstallments,
            paidInstallments,
            progressPercentage: Math.min(progressPercentage, 100)
        };
    }
    
    // Filter loans by status
    static filterLoansByStatus(loans, filter) {
        switch (filter) {
            case 'completed':
                return loans.filter(loan => this.isLoanCompleted(loan));
            case 'active':
                return loans.filter(loan => this.isLoanActive(loan));
            case 'pending':
                return loans.filter(loan => loan.status === 'pending');
            case 'rejected':
                return loans.filter(loan => loan.status === 'rejected');
            case 'all':
            default:
                return [...loans];
        }
    }
}

// Export for use in other modules
window.LoanStatusHelper = LoanStatusHelper;