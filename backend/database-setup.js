const { pool } = require('./config/database.js');

// Database schema setup
async function createTables() {
  try {
    console.log('🔄 إنشاء جداول قاعدة البيانات...');

    // Disable foreign key checks temporarily
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Drop all tables that might exist (in reverse order of creation)
    const dropTables = [
      'DROP TABLE IF EXISTS feedback',
      'DROP TABLE IF EXISTS loan',
      'DROP TABLE IF EXISTS requested_loan', 
      'DROP TABLE IF EXISTS transaction',
      'DROP TABLE IF EXISTS users',
      'DROP TABLE IF EXISTS attribute'
    ];

    for (const query of dropTables) {
      await pool.execute(query);
    }

    // Create attribute table first (no foreign keys)
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

    // Create users table (no foreign keys)
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

    // Re-enable foreign key checks
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

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
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
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
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
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
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (target_loan_id) REFERENCES requested_loan(loan_id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✅ تم إنشاء جداول قاعدة البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    throw error;
  }
}

// Insert system configuration
async function insertSystemConfig() {
  try {
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

    console.log('✅ تم إدراج إعدادات النظام بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إدراج إعدادات النظام:', error.message);
    throw error;
  }
}

module.exports = { createTables, insertSystemConfig };