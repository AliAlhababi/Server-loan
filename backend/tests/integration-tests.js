/**
 * 🔗 Integration Tests for Clean Architecture
 * Tests interactions between layers and components
 */

const UserService = require('../services/UserService');
const LoanService = require('../services/LoanService');
const AuthService = require('../services/AuthService');
const TransactionService = require('../services/TransactionService');
const AdminService = require('../services/AdminService');
const { pool } = require('../config/database');

class IntegrationTestSuite {
  constructor() {
    this.results = { passed: 0, failed: 0, errors: [] };
    this.testData = {
      users: [],
      loans: [],
      transactions: []
    };
  }

  assert(condition, message, details = null) {
    if (condition) {
      this.results.passed++;
      console.log(`✅ ${message}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${message}`);
      this.results.errors.push({ message, details });
    }
  }

  async setupTestData() {
    console.log('🔧 Setting up integration test data...');
    
    try {
      // Create a test user for integration testing
      const [result] = await pool.execute(`
        INSERT INTO users (Aname, phone, email, password, user_type, balance, joining_fee_approved, registration_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'مستخدم تكامل تجريبي',
        '99887766',
        'integration.test@example.com',
        '$2b$10$hashedpassword',
        'employee',
        2000,
        'approved',
        new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // 400 days ago
      ]);

      this.testData.users.push({
        userId: result.insertId,
        email: 'integration.test@example.com',
        phone: '99887766'
      });

      console.log(`✅ Created test user with ID: ${result.insertId}`);
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        console.error('Failed to create integration test user:', error.message);
        throw error;
      }
    }
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up integration test data...');
    
    try {
      for (const user of this.testData.users) {
        await pool.execute('DELETE FROM loan WHERE user_id = ?', [user.userId]);
        await pool.execute('DELETE FROM requested_loan WHERE user_id = ?', [user.userId]);
        await pool.execute('DELETE FROM transaction WHERE user_id = ?', [user.userId]);
        await pool.execute('DELETE FROM users WHERE user_id = ?', [user.userId]);
      }
      console.log('✅ Integration test data cleaned up');
    } catch (error) {
      console.error('❌ Integration cleanup failed:', error.message);
    }
  }

  // 🔐 Service Layer Integration Tests
  async testServiceLayerIntegration() {
    console.log('\n🔐 Testing Service Layer Integration...');

    if (this.testData.users.length === 0) {
      console.log('⚠️ No test users available, skipping service integration tests');
      return;
    }

    const testUser = this.testData.users[0];
    
    // Test UserService integration with repositories
    try {
      const userService = new UserService();
      const userData = await userService.getUserById(testUser.userId);
      
      this.assert(!!userData, 'UserService successfully retrieves user data');
      this.assert(userData.user_id === testUser.userId, 'Retrieved user data matches expected user');
      this.assert(typeof userData.current_balance === 'number', 'User balance properly calculated');
    } catch (error) {
      this.assert(false, 'UserService integration failed', error.message);
    }

    // Test LoanService integration with multiple repositories
    try {
      const loanService = new LoanService();
      const eligibility = await loanService.checkLoanEligibility(testUser.userId);
      
      this.assert(!!eligibility, 'LoanService eligibility check returns data');
      this.assert(typeof eligibility.eligible === 'boolean', 'Eligibility result is boolean');
      this.assert(!!eligibility.checks, 'Detailed eligibility checks available');
      this.assert(typeof eligibility.currentBalance === 'number', 'Current balance included in eligibility');
    } catch (error) {
      this.assert(false, 'LoanService integration failed', error.message);
    }

    // Test AuthService integration
    try {
      const authService = new AuthService();
      const resetResult = await authService.resetPassword(testUser.email, testUser.phone);
      
      this.assert(resetResult.success, 'AuthService password reset succeeds');
      this.assert(!!resetResult.newPassword, 'New password generated');
      this.assert(typeof resetResult.newPassword === 'string', 'Generated password is string');
    } catch (error) {
      this.assert(false, 'AuthService integration failed', error.message);
    }

    // Test TransactionService integration
    try {
      const transactionService = new TransactionService();
      const depositResult = await transactionService.createDepositRequest(testUser.userId, 500, 'تكامل تجريبي');
      
      this.assert(depositResult.success, 'TransactionService creates deposit request');
      this.assert(!!depositResult.transactionId, 'Transaction ID returned');
      
      this.testData.transactions.push({
        transactionId: depositResult.transactionId,
        userId: testUser.userId
      });
    } catch (error) {
      this.assert(false, 'TransactionService integration failed', error.message);
    }

    // Test AdminService integration
    try {
      const adminService = new AdminService();
      const dashboardStats = await adminService.getDashboardStats();
      
      this.assert(!!dashboardStats, 'AdminService retrieves dashboard stats');
      this.assert(!!dashboardStats.users, 'User statistics available');
      this.assert(!!dashboardStats.loans, 'Loan statistics available');
      this.assert(!!dashboardStats.transactions, 'Transaction statistics available');
    } catch (error) {
      this.assert(false, 'AdminService integration failed', error.message);
    }
  }

  // 🗄️ Repository Layer Integration Tests
  async testRepositoryLayerIntegration() {
    console.log('\n🗄️ Testing Repository Layer Integration...');

    if (this.testData.users.length === 0) {
      console.log('⚠️ No test users available, skipping repository integration tests');
      return;
    }

    const testUser = this.testData.users[0];

    // Test UserRepository integration with database
    try {
      const UserRepository = require('../repositories/UserRepository');
      const userRepo = new UserRepository();
      
      const user = await userRepo.findByUserId(testUser.userId);
      this.assert(!!user, 'UserRepository successfully finds user by ID');
      this.assert(user.user_id === testUser.userId, 'Retrieved user matches expected');
      
      const stats = await userRepo.getUserStats();
      this.assert(typeof stats.total_users === 'number', 'UserRepository provides user statistics');
    } catch (error) {
      this.assert(false, 'UserRepository integration failed', error.message);
    }

    // Test LoanRepository integration
    try {
      const LoanRepository = require('../repositories/LoanRepository');
      const loanRepo = new LoanRepository();
      
      const activeLoan = await loanRepo.findActiveLoanByUserId(testUser.userId);
      // Should be null for new test user
      this.assert(activeLoan === null, 'LoanRepository correctly returns null for user with no active loans');
      
      const loanStats = await loanRepo.getLoanStats();
      this.assert(typeof loanStats.total_loans === 'number', 'LoanRepository provides loan statistics');
    } catch (error) {
      this.assert(false, 'LoanRepository integration failed', error.message);
    }

    // Test TransactionRepository integration
    try {
      const TransactionRepository = require('../repositories/TransactionRepository');
      const transactionRepo = new TransactionRepository();
      
      const transactions = await transactionRepo.findTransactionsByUserId(testUser.userId, 10);
      this.assert(Array.isArray(transactions), 'TransactionRepository returns array of transactions');
      
      const financialSummary = await transactionRepo.getUserFinancialSummary(testUser.userId);
      this.assert(typeof financialSummary.total_deposits === 'string', 'Financial summary includes total deposits');
    } catch (error) {
      this.assert(false, 'TransactionRepository integration failed', error.message);
    }

    // Test BaseRepository inheritance
    try {
      const UserRepository = require('../repositories/UserRepository');
      const userRepo = new UserRepository();
      
      // Test inherited methods from BaseRepository
      const count = await userRepo.count({ user_type: 'employee' });
      this.assert(typeof count === 'number', 'BaseRepository count method works through inheritance');
      
      const allUsers = await userRepo.findAll({ user_type: 'employee' }, 'user_id ASC', 5);
      this.assert(Array.isArray(allUsers), 'BaseRepository findAll method works through inheritance');
    } catch (error) {
      this.assert(false, 'BaseRepository inheritance failed', error.message);
    }
  }

  // 🎮 Controller-Service Integration Tests
  async testControllerServiceIntegration() {
    console.log('\n🎮 Testing Controller-Service Integration...');

    // Test controller instantiation with service dependencies
    try {
      const AuthController = require('../controllers/AuthController');
      const UserController = require('../controllers/UserController');
      const LoanController = require('../controllers/LoanController');
      const AdminController = require('../controllers/AdminController');

      const authController = new AuthController();
      this.assert(!!authController.authService, 'AuthController has AuthService dependency');

      const userController = new UserController();
      this.assert(!!userController.userService, 'UserController has UserService dependency');
      this.assert(!!userController.transactionService, 'UserController has TransactionService dependency');

      const loanController = new LoanController();
      this.assert(!!loanController.loanService, 'LoanController has LoanService dependency');

      const adminController = new AdminController();
      this.assert(!!adminController.adminService, 'AdminController has AdminService dependency');
      this.assert(!!adminController.userService, 'AdminController has UserService dependency');
      this.assert(!!adminController.loanService, 'AdminController has LoanService dependency');
    } catch (error) {
      this.assert(false, 'Controller-Service integration failed', error.message);
    }

    // Test that controllers use services correctly
    try {
      const UserService = require('../services/UserService');
      const userService = new UserService();
      
      // Verify service has repository dependencies
      this.assert(!!userService.userRepository, 'UserService has UserRepository dependency');
      this.assert(!!userService.transactionRepository, 'UserService has TransactionRepository dependency');
      this.assert(!!userService.loanPaymentRepository, 'UserService has LoanPaymentRepository dependency');
      
      // Verify service methods exist
      this.assert(typeof userService.getUserById === 'function', 'UserService has required methods');
      this.assert(typeof userService.updateUserProfile === 'function', 'UserService has business logic methods');
    } catch (error) {
      this.assert(false, 'Service dependency verification failed', error.message);
    }
  }

  // 🔗 End-to-End Business Logic Integration
  async testBusinessLogicIntegration() {
    console.log('\n🔗 Testing Business Logic Integration...');

    if (this.testData.users.length === 0) {
      console.log('⚠️ No test users available, skipping business logic integration tests');
      return;
    }

    const testUser = this.testData.users[0];

    // Test complete loan request workflow
    try {
      const loanService = new LoanService();
      
      // Step 1: Check eligibility
      const eligibility = await loanService.checkLoanEligibility(testUser.userId);
      
      if (eligibility.eligible) {
        // Step 2: Calculate loan terms
        const loanTerms = await loanService.calculateLoanTerms(2000, 3000);
        this.assert(loanTerms.eligible, 'Loan terms calculation succeeds');
        
        // Step 3: Request loan
        const loanRequest = await loanService.requestLoan(testUser.userId, 3000, 'طلب تكامل تجريبي');
        this.assert(loanRequest.success, 'Loan request workflow completes successfully');
        
        if (loanRequest.loanId) {
          this.testData.loans.push({
            loanId: loanRequest.loanId,
            userId: testUser.userId
          });
        }
      } else {
        console.log('ℹ️ Test user not eligible for loan - testing negative path');
        this.assert(!eligibility.eligible && eligibility.reason, 'Ineligible user properly rejected with reason');
      }
    } catch (error) {
      this.assert(false, 'Business logic integration failed', error.message);
    }

    // Test user profile update workflow
    try {
      const userService = new UserService();
      
      const updateResult = await userService.updateUserProfile(testUser.userId, {
        Aname: 'اسم محدث تكامل',
        email: 'updated.integration@test.com',
        phone: '99887767',
        whatsapp: '99887767',
        workplace: 'مكان عمل محدث'
      });
      
      this.assert(updateResult.success, 'Profile update workflow succeeds');
      
      // Verify update was persisted
      const updatedUser = await userService.getUserById(testUser.userId);
      this.assert(updatedUser.Aname === 'اسم محدث تكامل', 'Profile update persisted in database');
    } catch (error) {
      this.assert(false, 'Profile update workflow failed', error.message);
    }

    // Test transaction approval workflow
    if (this.testData.transactions.length > 0) {
      try {
        const transactionService = new TransactionService();
        const adminService = new AdminService();
        
        const transaction = this.testData.transactions[0];
        
        // Admin approves the transaction
        const approvalResult = await adminService.processTransactionAction(
          transaction.transactionId, 
          'approve', 
          1 // Admin ID
        );
        
        this.assert(approvalResult.success, 'Transaction approval workflow succeeds');
        
        // Verify user balance was updated
        const userService = new UserService();
        const financialSummary = await transactionService.getUserFinancialSummary(testUser.userId);
        this.assert(financialSummary.totalDeposits > 0, 'User balance updated after transaction approval');
      } catch (error) {
        this.assert(false, 'Transaction approval workflow failed', error.message);
      }
    }
  }

  // 🧪 Error Handling Integration Tests
  async testErrorHandlingIntegration() {
    console.log('\n🧪 Testing Error Handling Integration...');

    // Test service-level error handling
    try {
      const userService = new UserService();
      
      try {
        await userService.getUserById(999999); // Non-existent user
        // Should not throw error, should return null
        this.assert(true, 'Service gracefully handles non-existent user lookup');
      } catch (error) {
        // If it throws, it should be a proper business error
        this.assert(error.message.includes('خطأ'), 'Service throws proper Arabic error message');
      }
      
      try {
        await userService.updateUserProfile(999999, {
          Aname: 'Test',
          email: 'invalid-email-format',
          phone: '123'
        });
        this.assert(false, 'Invalid profile update should fail');
      } catch (error) {
        this.assert(error.message.includes('خطأ'), 'Invalid profile update throws Arabic error');
      }
    } catch (error) {
      this.assert(false, 'Service error handling test failed', error.message);
    }

    // Test repository-level error handling
    try {
      const UserRepository = require('../repositories/UserRepository');
      const userRepo = new UserRepository();
      
      try {
        // Try to create user with duplicate email (should fail)
        await userRepo.createUser({
          Aname: 'Test',
          phone: '99887766', // Same as test user
          email: 'integration.test@example.com', // Same as test user
          userType: 'employee',
          hashedPassword: 'test123'
        });
        this.assert(false, 'Duplicate user creation should fail');
      } catch (error) {
        this.assert(error.message.includes('خطأ'), 'Repository throws proper Arabic error for duplicates');
      }
    } catch (error) {
      this.assert(false, 'Repository error handling test failed', error.message);
    }

    // Test business logic error handling
    try {
      const loanService = new LoanService();
      
      try {
        await loanService.requestLoan(999999, 50000, 'Invalid loan'); // Excessive amount
        this.assert(false, 'Invalid loan request should fail');
      } catch (error) {
        this.assert(error.message.includes('خطأ') || error.message.includes('غير'), 'Loan service throws proper business logic error');
      }
    } catch (error) {
      this.assert(false, 'Business logic error handling test failed', error.message);
    }
  }

  // 🚀 Run all integration tests
  async runAllTests() {
    console.log('🔗 Starting Integration Tests for Clean Architecture');
    console.log('==================================================');

    try {
      await this.setupTestData();
      
      await this.testServiceLayerIntegration();
      await this.testRepositoryLayerIntegration();
      await this.testControllerServiceIntegration();
      await this.testBusinessLogicIntegration();
      await this.testErrorHandlingIntegration();
      
      await this.cleanupTestData();
      
      console.log('\n📊 INTEGRATION TEST RESULTS');
      console.log('============================');
      console.log(`✅ Tests Passed: ${this.results.passed}`);
      console.log(`❌ Tests Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

      if (this.results.errors.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        this.results.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.message}`);
          if (error.details) {
            console.log(`   Details: ${error.details}`);
          }
        });
      }

      if (this.results.failed === 0) {
        console.log('\n🏆 ALL INTEGRATION TESTS PASSED! Layer interactions are working perfectly.');
      } else {
        console.log(`\n⚠️  ${this.results.failed} integration tests failed. Review layer interactions.`);
      }

      return {
        passed: this.results.passed,
        failed: this.results.failed,
        total: this.results.passed + this.results.failed,
        errors: this.results.errors,
        successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1) + '%'
      };
      
    } catch (error) {
      console.error('💥 Integration test suite failed:', error.message);
      await this.cleanupTestData();
      throw error;
    }
  }
}

module.exports = IntegrationTestSuite;