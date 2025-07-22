const { pool } = require('./config/database.js');
const bcrypt = require('bcryptjs');

// Create test users
async function createTestUsers() {
  try {
    console.log('🔄 إنشاء المستخدمين التجريبيين...');

    // Admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.execute(`
      INSERT INTO users (user_id, Aname, phone, email, password, user_type, balance, registration_date, joining_fee_approved)
      VALUES (1, 'المدير العام', '12345678', 'admin@daraalqila.com', ?, 'admin', 1000.00, '2022-01-01', 'approved')
    `, [adminPassword]);

    // Test employees with different scenarios
    const userPassword = await bcrypt.hash('user123', 10);
    
    const testUsers = [
      // User with good balance and approved joining fee
      [100, 'أحمد محمد العلي', '99887766', 'ahmed@example.com', userPassword, 'employee', 2000.00, '2022-06-01', 'approved'],
      
      // User with minimum balance
      [101, 'فاطمة خالد الصالح', '99887767', 'fatima@example.com', userPassword, 'employee', 500.00, '2022-07-01', 'approved'],
      
      // Student user
      [102, 'محمد عبدالله الكندري', '99887768', 'mohammed@example.com', userPassword, 'student', 1500.00, '2022-08-01', 'approved'],
      
      // User with pending joining fee
      [103, 'نورا سعد الرشيد', '99887769', 'nora@example.com', userPassword, 'employee', 3000.00, '2022-09-01', 'pending'],
      
      // Recently registered user (less than 2 years)
      [104, 'سالم ناصر المطيري', '99887770', 'salem@example.com', userPassword, 'employee', 1800.00, '2024-01-01', 'approved'],
      
      // User with high balance
      [105, 'مريم عبدالرحمن الأنصاري', '99887771', 'mariam@example.com', userPassword, 'employee', 5000.00, '2022-05-01', 'approved'],
    ];

    for (const user of testUsers) {
      await pool.execute(`
        INSERT INTO users (user_id, Aname, phone, email, password, user_type, balance, registration_date, joining_fee_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, user);
    }

    console.log('✅ تم إنشاء المستخدمين التجريبيين بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدمين:', error.message);
    throw error;
  }
}

// Create test transactions
async function createTestTransactions() {
  try {
    console.log('🔄 إنشاء المعاملات التجريبية...');

    const transactions = [
      // Subscription payments for user 100
      [100, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2023-01-15', 1],
      [100, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2024-01-15', 1],
      
      // Deposit for user 100
      [100, 0, 1000, 'إيداع نقدي', 'accepted', 'deposit', '2024-03-01', 1],
      
      // Subscription payments for user 101
      [101, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2023-02-01', 1],
      [101, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2024-02-01', 1],
      
      // Student subscription for user 102
      [102, 0, 120, 'دفع اشتراك طالب', 'accepted', 'subscription', '2023-01-10', 1],
      [102, 0, 120, 'دفع اشتراك طالب', 'accepted', 'subscription', '2024-01-10', 1],
      [102, 0, 800, 'إيداع نقدي', 'accepted', 'deposit', '2024-02-15', 1],
      
      // Pending transactions
      [103, 0, 500, 'إيداع نقدي', 'pending', 'deposit', '2024-07-01', null],
      [104, 0, 240, 'دفع اشتراك سنوي', 'pending', 'subscription', '2024-07-10', null],
      
      // Joining fee payments
      [100, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2022-06-01', 1],
      [101, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2022-07-01', 1],
      [102, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2022-08-01', 1],
      [103, 0, 10, 'رسوم الانضمام', 'pending', 'joining_fee', '2022-09-01', null],
      [105, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2022-05-01', 1],
    ];

    for (const transaction of transactions) {
      await pool.execute(`
        INSERT INTO transaction (user_id, debit, credit, memo, status, transaction_type, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, transaction);
    }

    console.log('✅ تم إنشاء المعاملات التجريبية بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إنشاء المعاملات:', error.message);
    throw error;
  }
}

// Create test loan requests
async function createTestLoans() {
  try {
    console.log('🔄 إنشاء طلبات القروض التجريبية...');

    // Approved loan for user 100
    await pool.execute(`
      INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes)
      VALUES (1, 100, 2000, 30, 'approved', '2024-06-01', '2024-06-02', 1, 'قرض موافق عليه')
    `);

    // Pending loan for user 101
    await pool.execute(`
      INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, admin_id, notes)
      VALUES (2, 101, 1000, 20, 'pending', '2024-07-01', null, 'طلب قرض قيد المراجعة')
    `);

    // Rejected loan for user 102
    await pool.execute(`
      INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes)
      VALUES (3, 102, 1500, 25, 'rejected', '2024-05-15', '2024-05-16', 1, 'مرفوض - عدم استيفاء الشروط')
    `);

    // Create loan installment payments for approved loan
    const loanPayments = [
      [100, 1, 30, 'قسط شهري - يونيو 2024', 'accepted', '2024-06-15', 1],
      [100, 1, 30, 'قسط شهري - يوليو 2024', 'accepted', '2024-07-15', 1],
      [100, 1, 30, 'قسط شهري - أغسطس 2024', 'pending', '2024-07-18', null],
    ];

    for (const payment of loanPayments) {
      await pool.execute(`
        INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, payment);
    }

    console.log('✅ تم إنشاء القروض والأقساط التجريبية بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إنشاء القروض:', error.message);
    throw error;
  }
}

module.exports = { createTestUsers, createTestTransactions, createTestLoans };