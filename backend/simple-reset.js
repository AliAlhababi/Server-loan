const { pool, testConnection } = require('./config/database.js');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  try {
    console.log('🚀 بدء إعداد قاعدة البيانات الجديد...\n');

    // Test connection
    await testConnection();
    console.log('✅ قاعدة البيانات متصلة بنجاح');

    // Disable foreign key checks
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Drop all tables
    const tables = ['loan', 'requested_loan', 'transaction', 'users', 'attribute'];
    for (const table of tables) {
      await pool.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    console.log('🔄 تم حذف الجداول القديمة');

    // Create users table
    await pool.execute(`
      CREATE TABLE users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        Aname VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255) NOT NULL,
        workplace VARCHAR(100),
        whatsapp VARCHAR(20),
        user_type ENUM('employee', 'student', 'admin') DEFAULT 'employee',
        balance DECIMAL(10,2) DEFAULT 0.00,
        registration_date DATE NOT NULL,
        joining_fee_approved ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        is_blocked TINYINT(1) DEFAULT 0,
        will_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create attribute table
    await pool.execute(`
      CREATE TABLE attribute (
        id INT PRIMARY KEY AUTO_INCREMENT,
        attribute_name VARCHAR(100) UNIQUE NOT NULL,
        attribute_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create transaction table
    await pool.execute(`
      CREATE TABLE transaction (
        transaction_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        debit DECIMAL(10,2) DEFAULT 0.00,
        credit DECIMAL(10,2) DEFAULT 0.00,
        memo VARCHAR(255),
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        transaction_type ENUM('deposit', 'withdrawal', 'subscription', 'joining_fee') DEFAULT 'deposit',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_id INT,
        INDEX idx_user_id (user_id),
        INDEX idx_admin_id (admin_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create requested_loan table
    await pool.execute(`
      CREATE TABLE requested_loan (
        loan_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        loan_amount DECIMAL(10,2) NOT NULL,
        installment_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approval_date TIMESTAMP NULL,
        admin_id INT,
        notes TEXT,
        INDEX idx_user_id (user_id),
        INDEX idx_admin_id (admin_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create loan table (for installment payments)
    await pool.execute(`
      CREATE TABLE loan (
        loan_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        target_loan_id INT NOT NULL,
        credit DECIMAL(10,2) NOT NULL,
        memo VARCHAR(255),
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_id INT,
        INDEX idx_user_id (user_id),
        INDEX idx_target_loan_id (target_loan_id),
        INDEX idx_admin_id (admin_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Re-enable foreign key checks
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ تم إنشاء جداول قاعدة البيانات بنجاح');

    // Insert system configuration
    const configs = [
      ['system_name', 'درع العائلة', 'اسم النظام'],
      ['max_loan_amount', '10000', 'الحد الأقصى لمبلغ القرض'],
      ['min_balance', '500', 'الحد الأدنى للرصيد'],
      ['loan_ratio', '0.00667', 'نسبة حساب القسط الشهري'],
      ['min_installment', '20', 'الحد الأدنى للقسط الشهري'],
      ['joining_fee', '10', 'رسوم الانضمام'],
      ['employee_subscription', '240', 'اشتراك الموظفين (24 شهر)'],
      ['student_subscription', '120', 'اشتراك الطلاب (24 شهر)']
    ];

    for (const [name, value, desc] of configs) {
      await pool.execute(
        'INSERT INTO attribute (attribute_name, attribute_value, description) VALUES (?, ?, ?)',
        [name, value, desc]
      );
    }

    // Create test users
    console.log('🔄 إنشاء المستخدمين التجريبيين...');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    // Admin user
    await pool.execute(`
      INSERT INTO users (user_id, Aname, phone, email, password, user_type, balance, registration_date, joining_fee_approved, whatsapp)
      VALUES (1, 'المدير العام', '12345678', 'admin@daraalqila.com', ?, 'admin', 1000.00, '2022-01-01', 'approved', '12345678')
    `, [adminPassword]);

    // Test users with different scenarios
    const testUsers = [
      [100, 'أحمد محمد العلي', '99887766', 'ahmed@example.com', userPassword, 'employee', 2000.00, '2023-01-01', 'approved', '99887766'],
      [101, 'فاطمة خالد الصالح', '99887767', 'fatima@example.com', userPassword, 'employee', 500.00, '2023-02-01', 'approved', '99887767'],
      [102, 'محمد عبدالله الكندري', '99887768', 'mohammed@example.com', userPassword, 'student', 1500.00, '2023-03-01', 'approved', '99887768'],
      [103, 'نورا سعد الرشيد', '99887769', 'nora@example.com', userPassword, 'employee', 3000.00, '2023-04-01', 'pending', '99887769'],
      [104, 'سالم ناصر المطيري', '99887770', 'salem@example.com', userPassword, 'employee', 1800.00, '2024-06-01', 'approved', '99887770'],
      [105, 'مريم عبدالرحمن الأنصاري', '99887771', 'mariam@example.com', userPassword, 'employee', 5000.00, '2023-05-01', 'approved', '99887771'],
    ];

    for (const user of testUsers) {
      await pool.execute(`
        INSERT INTO users (user_id, Aname, phone, email, password, user_type, balance, registration_date, joining_fee_approved, whatsapp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, user);
    }

    // Create test transactions
    console.log('🔄 إنشاء المعاملات التجريبية...');
    
    const transactions = [
      // Subscription and deposit payments for users
      [100, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2023-06-01', 1],
      [100, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2024-01-01', 1],
      [100, 0, 1000, 'إيداع نقدي', 'accepted', 'deposit', '2024-03-01', 1],
      [100, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-01-01', 1],
      
      [101, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2023-07-01', 1],
      [101, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2024-02-01', 1],
      [101, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-02-01', 1],
      
      [102, 0, 120, 'دفع اشتراك طالب', 'accepted', 'subscription', '2023-08-01', 1],
      [102, 0, 120, 'دفع اشتراك طالب', 'accepted', 'subscription', '2024-03-01', 1],
      [102, 0, 800, 'إيداع نقدي', 'accepted', 'deposit', '2024-04-01', 1],
      [102, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-03-01', 1],
      
      [105, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2023-09-01', 1],
      [105, 0, 240, 'دفع اشتراك سنوي', 'accepted', 'subscription', '2024-05-01', 1],
      [105, 0, 2000, 'إيداع نقدي', 'accepted', 'deposit', '2024-06-01', 1],
      [105, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-05-01', 1],
      
      // Pending transactions
      [103, 0, 500, 'إيداع نقدي', 'pending', 'deposit', '2024-07-15', null],
      [104, 0, 240, 'دفع اشتراك سنوي', 'pending', 'subscription', '2024-07-10', null],
    ];

    for (const transaction of transactions) {
      await pool.execute(`
        INSERT INTO transaction (user_id, debit, credit, memo, status, transaction_type, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, transaction);
    }

    // Create test loan requests
    console.log('🔄 إنشاء طلبات القروض التجريبية...');
    
    // Approved loan for user 100
    await pool.execute(`
      INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes)
      VALUES (1, 100, 2000, 30, 'approved', '2024-06-01', '2024-06-02', 1, 'قرض موافق عليه')
    `);

    // Pending loan for user 105
    await pool.execute(`
      INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, admin_id, notes)
      VALUES (2, 105, 3000, 40, 'pending', '2024-07-10', null, 'طلب قرض قيد المراجعة')
    `);

    // Create loan installment payments
    const loanPayments = [
      [100, 1, 30, 'قسط شهري - يونيو 2024', 'accepted', '2024-06-15', 1],
      [100, 1, 30, 'قسط شهري - يوليو 2024', 'accepted', '2024-07-15', 1],
    ];

    for (const payment of loanPayments) {
      await pool.execute(`
        INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, payment);
    }

    console.log('\n✅ تم إعداد قاعدة البيانات بنجاح!');
    console.log('\n📋 بيانات الدخول للاختبار:');
    console.log('👨‍💼 المدير العام: المعرف = 1, كلمة المرور = admin123');
    console.log('👤 أحمد محمد العلي (مؤهل للقروض): المعرف = 100, كلمة المرور = user123');
    console.log('👤 فاطمة خالد الصالح (رصيد أدنى): المعرف = 101, كلمة المرور = user123');
    console.log('📚 محمد عبدالله الكندري (طالب): المعرف = 102, كلمة المرور = user123');
    console.log('⏳ نورا سعد الرشيد (رسوم انضمام معلقة): المعرف = 103, كلمة المرور = user123');
    console.log('🕒 سالم ناصر المطيري (مسجل حديثاً): المعرف = 104, كلمة المرور = user123');
    console.log('💰 مريم عبدالرحمن الأنصاري (رصيد عالي): المعرف = 105, كلمة المرور = user123');

  } catch (error) {
    console.error('❌ فشل في إعادة تعيين قاعدة البيانات:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the reset
resetDatabase();