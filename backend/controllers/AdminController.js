// Import new modular controllers
const DashboardController = require('./DashboardController');
const UserManagementController = require('./UserManagementController');
const LoanManagementController = require('./LoanManagementController');
const TransactionController = require('./TransactionController');

// Re-export dashboard methods
exports.getDashboardStats = DashboardController.getDashboardStats;
exports.getDetailedStats = DashboardController.getDetailedStats;  
exports.getRecentActivity = DashboardController.getRecentActivity;
exports.getFinancialSummary = DashboardController.getFinancialSummary;

// Re-export user management methods
exports.getAllUsers = UserManagementController.getAllUsers;
exports.registerUser = UserManagementController.registerUser;
exports.toggleBlockUser = UserManagementController.toggleBlockUser;
exports.joiningFeeAction = UserManagementController.joiningFeeAction;
exports.getUserDetails = UserManagementController.getUserDetails;
exports.updateUser = UserManagementController.updateUser;
exports.fixLoanInstallments = UserManagementController.fixLoanInstallments;

// Re-export loan management methods
exports.loanAction = LoanManagementController.loanAction;
exports.getLoanDetails = LoanManagementController.getLoanDetails;
exports.getPendingLoans = LoanManagementController.getPendingLoans;
exports.getAllLoans = LoanManagementController.getAllLoans;
exports.closeLoan = LoanManagementController.closeLoan;
exports.getLoansEligibleForClosure = LoanManagementController.getLoansEligibleForClosure;
exports.autoCloseLoans = LoanManagementController.autoCloseLoans;

// Enhanced loan management CRUD methods
exports.searchUsers = UserManagementController.searchUsers;
exports.testError = LoanManagementController.testError;
exports.addLoan = LoanManagementController.addLoan;
exports.updateLoan = LoanManagementController.updateLoan;
exports.deleteLoan = LoanManagementController.deleteLoan;
exports.getLoanPayments = LoanManagementController.getLoanPayments;

// Re-export transaction methods
exports.getPendingTransactions = TransactionController.getPendingTransactions;
exports.getAllTransactions = TransactionController.getAllTransactions;
exports.transactionAction = TransactionController.transactionAction;
exports.loanPaymentAction = TransactionController.loanPaymentAction;
exports.getPendingLoanPayments = TransactionController.getPendingLoanPayments;
exports.getAllLoanPayments = TransactionController.getAllLoanPayments;
exports.getTransactionDetails = TransactionController.getTransactionDetails;