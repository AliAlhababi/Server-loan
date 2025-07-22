const { pool, testConnection } = require('./config/database.js');
const bcrypt = require('bcryptjs');

async function basicReset() {
  try {
    console.log('🚀 إنشاء قاعدة بيانات جديدة بسيطة...\n');

    await testConnection();

    // Drop database and recreate using query instead of execute
    await pool.query('DROP DATABASE IF EXISTS loan_management');
    await pool.query('CREATE DATABASE loan_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await pool.query('USE loan_management');
    
    console.log('🔄 تم إنشاء قاعدة البيانات الجديدة');

    // Create basic users table first
    await pool.execute(`
      CREATE TABLE users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        Aname VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255) NOT NULL,
        workplace VARCHAR(100),
        whatsapp VARCHAR(20),
        user_type ENUM('employee', 'admin') DEFAULT 'employee',
        balance DECIMAL(10,2) DEFAULT 0.00,
        registration_date DATE NOT NULL,
        joining_fee_approved ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        is_blocked TINYINT(1) DEFAULT 0,
        will_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create other tables
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
        admin_id INT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

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
        notes TEXT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.execute(`
      CREATE TABLE loan (
        loan_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        target_loan_id INT NOT NULL,
        credit DECIMAL(10,2) NOT NULL,
        memo VARCHAR(255),
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_id INT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✅ تم إنشاء جداول قاعدة البيانات');

    // Insert system configuration
    console.log('🔄 إدراج إعدادات النظام...');
    const configs = [
      ['system_name', 'درع العائلة', 'اسم النظام'],
      ['max_loan_amount', '10000', 'الحد الأقصى لمبلغ القرض'],
      ['min_balance', '500', 'الحد الأدنى للرصيد'],
      ['loan_ratio', '0.00667', 'نسبة حساب القسط الشهري'],
      ['min_installment', '20', 'الحد الأدنى للقسط الشهري'],
      ['joining_fee', '10', 'رسوم الانضمام'],
      ['employee_subscription', '240', 'اشتراك الأعضاء (24 شهر)']
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
    
    const users = [
      [1, 'المدير العام', '12345678', 'admin@daraalqila.com', adminPassword, 'admin', 1000.00, '2022-01-01', 'approved', '12345678'],
      [100, 'أحمد محمد العلي', '99887766', 'ahmed@example.com', userPassword, 'employee', 2000.00, '2023-01-01', 'approved', '99887766'],
      [101, 'فاطمة خالد الصالح', '99887767', 'fatima@example.com', userPassword, 'employee', 500.00, '2023-02-01', 'approved', '99887767'],
      [102, 'محمد عبدالله الكندري', '99887768', 'mohammed@example.com', userPassword, 'employee', 1500.00, '2023-03-01', 'approved', '99887768'],
      [103, 'نورا سعد الرشيد', '99887769', 'nora@example.com', userPassword, 'employee', 3000.00, '2023-04-01', 'pending', '99887769'],
      [104, 'سالم ناصر المطيري', '99887770', 'salem@example.com', userPassword, 'employee', 1800.00, '2024-06-01', 'approved', '99887770'],
      [105, 'مريم عبدالرحمن الأنصاري', '99887771', 'mariam@example.com', userPassword, 'employee', 5000.00, '2023-05-01', 'approved', '99887771']
    ];

    for (const [id, name, phone, email, password, type, balance, regDate, joinFee, whatsapp] of users) {
      await pool.execute(`
        INSERT INTO users (user_id, Aname, phone, email, password, user_type, balance, registration_date, joining_fee_approved, whatsapp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, name, phone, email, password, type, balance, regDate, joinFee, whatsapp]);
    }

    // Create comprehensive test transactions
    console.log('🔄 إنشاء المعاملات التجريبية...');
    const transactions = [
      // User 100 - Ahmed (eligible for loans)
      [100, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-01-01', 1],
      [100, 0, 240, 'دفع اشتراك سنوي 2023', 'accepted', 'subscription', '2023-06-01', 1],
      [100, 0, 240, 'دفع اشتراك سنوي 2024', 'accepted', 'subscription', '2024-01-01', 1],
      [100, 0, 1000, 'إيداع نقدي', 'accepted', 'deposit', '2024-03-01', 1],
      [100, 0, 500, 'إيداع نقدي إضافي', 'accepted', 'deposit', '2024-05-01', 1],
      
      // User 101 - Fatima (minimum balance)
      [101, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-02-01', 1],
      [101, 0, 240, 'دفع اشتراك سنوي 2023', 'accepted', 'subscription', '2023-07-01', 1],
      [101, 0, 240, 'دفع اشتراك سنوي 2024', 'accepted', 'subscription', '2024-02-01', 1],
      [101, 0, 20, 'إيداع صغير', 'accepted', 'deposit', '2024-06-01', 1],
      
      // User 102 - Mohammed (employee)
      [102, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-03-01', 1],
      [102, 0, 240, 'دفع اشتراك سنوي 2023', 'accepted', 'subscription', '2023-08-01', 1],
      [102, 0, 240, 'دفع اشتراك سنوي 2024', 'accepted', 'subscription', '2024-03-01', 1],
      [102, 0, 800, 'إيداع نقدي', 'accepted', 'deposit', '2024-04-01', 1],
      [102, 0, 700, 'إيداع إضافي', 'accepted', 'deposit', '2024-06-15', 1],
      
      // User 103 - Nora (pending joining fee)
      [103, 0, 10, 'رسوم الانضمام', 'pending', 'joining_fee', '2023-04-01', null],
      [103, 0, 240, 'دفع اشتراك سنوي', 'pending', 'subscription', '2023-09-01', null],
      [103, 0, 1500, 'إيداع نقدي', 'pending', 'deposit', '2024-07-15', null],
      
      // User 104 - Salem (recently registered)
      [104, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2024-06-01', 1],
      [104, 0, 240, 'دفع اشتراك سنوي', 'pending', 'subscription', '2024-07-10', null],
      [104, 0, 800, 'إيداع نقدي', 'accepted', 'deposit', '2024-06-15', 1],
      
      // User 105 - Mariam (high balance)
      [105, 0, 10, 'رسوم الانضمام', 'accepted', 'joining_fee', '2023-05-01', 1],
      [105, 0, 240, 'دفع اشتراك سنوي 2023', 'accepted', 'subscription', '2023-09-01', 1],
      [105, 0, 240, 'دفع اشتراك سنوي 2024', 'accepted', 'subscription', '2024-05-01', 1],
      [105, 0, 2000, 'إيداع كبير', 'accepted', 'deposit', '2024-06-01', 1],
      [105, 0, 3000, 'إيداع كبير إضافي', 'accepted', 'deposit', '2024-07-01', 1]
    ];

    for (const [userId, debit, credit, memo, status, type, date, adminId] of transactions) {
      await pool.execute(`
        INSERT INTO transaction (user_id, debit, credit, memo, status, transaction_type, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, debit, credit, memo, status, type, date, adminId]);
    }

    // Create test loan requests
    console.log('🔄 إنشاء طلبات القروض التجريبية...');
    
    const loans = [
      [1, 100, 2000, 30, 'approved', '2024-06-01', '2024-06-02', 1, 'قرض موافق عليه للمستخدم أحمد'],
      [2, 105, 3000, 40, 'pending', '2024-07-10', null, null, 'طلب قرض قيد المراجعة'],
      [3, 102, 1200, 25, 'rejected', '2024-05-15', '2024-05-16', 1, 'مرفوض - عدم استيفاء شروط الطالب']
    ];

    for (const [loanId, userId, amount, installment, status, reqDate, appDate, adminId, notes] of loans) {
      await pool.execute(`
        INSERT INTO requested_loan (loan_id, user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [loanId, userId, amount, installment, status, reqDate, appDate, adminId, notes]);
    }

    // Create loan payment records
    console.log('🔄 إنشاء سجلات دفع الأقساط...');
    const payments = [
      [100, 1, 30, 'قسط شهري - يونيو 2024', 'accepted', '2024-06-15', 1],
      [100, 1, 30, 'قسط شهري - يوليو 2024', 'accepted', '2024-07-15', 1],
      [100, 1, 30, 'قسط شهري - أغسطس 2024', 'pending', '2024-07-20', null]
    ];

    for (const [userId, targetLoanId, credit, memo, status, date, adminId] of payments) {
      await pool.execute(`
        INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, targetLoanId, credit, memo, status, date, adminId]);
    }

    console.log('\n🎉 تم إنشاء قاعدة البيانات والبيانات التجريبية بنجاح!\n');
    console.log('📋 بيانات الدخول للاختبار:');
    console.log('════════════════════════════════════════');
    console.log('👨‍💼 المدير العام');
    console.log('   المعرف: 1 | كلمة المرور: admin123');
    console.log('');
    console.log('👤 أحمد محمد العلي (مؤهل للقروض - له قرض نشط)');
    console.log('   المعرف: 100 | كلمة المرور: user123');
    console.log('   الرصيد: 2000 د.ك | الاشتراكات: مدفوعة');
    console.log('');
    console.log('👤 فاطمة خالد الصالح (الحد الأدنى للرصيد)');
    console.log('   المعرف: 101 | كلمة المرور: user123');
    console.log('   الرصيد: 500 د.ك | الاشتراكات: مدفوعة');
    console.log('');
    console.log('👤 محمد عبدالله الكندري (موظف)');
    console.log('   المعرف: 102 | كلمة المرور: user123');
    console.log('   الرصيد: 1500 د.ك | الاشتراكات: مدفوعة');
    console.log('');
    console.log('⏳ نورا سعد الرشيد (رسوم انضمام معلقة)');
    console.log('   المعرف: 103 | كلمة المرور: user123');
    console.log('   الرصيد: 3000 د.ك | المعاملات: معلقة');
    console.log('');
    console.log('🕒 سالم ناصر المطيري (مسجل حديثاً - غير مؤهل)');
    console.log('   المعرف: 104 | كلمة المرور: user123');
    console.log('   الرصيد: 1800 د.ك | تسجيل: يونيو 2024');
    console.log('');
    console.log('💰 مريم عبدالرحمن الأنصاري (رصيد عالي - طلب قرض معلق)');
    console.log('   المعرف: 105 | كلمة المرور: user123');
    console.log('   الرصيد: 5000 د.ك | طلب قرض: 3000 د.ك');
    console.log('════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error('تفاصيل الخطأ:', error);
  } finally {
    await pool.end();
  }
}

basicReset();