const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  let connection;
  try {
    console.log('🔄 Creating database structure...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'family1_loan_management',
      charset: 'utf8mb4'
    });
    
    console.log('✅ Connected to database successfully!');
    
    // 1. Create users table
    console.log('📝 Creating users table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`user_id\` int NOT NULL AUTO_INCREMENT,
        \`Aname\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full name in Arabic',
        \`phone\` varchar(20) DEFAULT NULL,
        \`email\` varchar(100) NOT NULL,
        \`password\` varchar(255) NOT NULL COMMENT 'bcrypt hashed password',
        \`workplace\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`whatsapp\` varchar(20) DEFAULT NULL,
        \`user_type\` enum('employee','admin') NOT NULL DEFAULT 'employee' COMMENT 'عضو أو إداري',
        \`balance\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Current account balance',
        \`registration_date\` date NOT NULL,
        \`joining_fee_approved\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        \`is_blocked\` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Account blocking status',
        \`will_content\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Will/inheritance content',
        \`approved_by_admin_id\` int DEFAULT NULL COMMENT 'Admin who approved joining fee',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`user_id\`),
        UNIQUE KEY \`email\` (\`email\`),
        KEY \`idx_user_type\` (\`user_type\`),
        KEY \`idx_joining_fee_approved\` (\`joining_fee_approved\`),
        KEY \`idx_is_blocked\` (\`is_blocked\`),
        KEY \`fk_approved_by_admin\` (\`approved_by_admin_id\`)
      ) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add foreign key constraint for users table (self-referencing)
    try {
      await connection.execute(`
        ALTER TABLE \`users\` 
        ADD CONSTRAINT \`fk_approved_by_admin\` 
        FOREIGN KEY (\`approved_by_admin_id\`) 
        REFERENCES \`users\` (\`user_id\`) 
        ON DELETE SET NULL
      `);
    } catch (fkError) {
      if (!fkError.message.includes('Duplicate key name')) {
        console.log('⚠️  Foreign key constraint may already exist:', fkError.message);
      }
    }
    
    // 2. Create requested_loan table
    console.log('📝 Creating requested_loan table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`requested_loan\` (
        \`loan_id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`loan_amount\` decimal(10,2) NOT NULL,
        \`installment_amount\` decimal(10,2) NOT NULL,
        \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        \`request_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`approval_date\` timestamp NULL DEFAULT NULL,
        \`admin_id\` int DEFAULT NULL,
        \`notes\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        \`loan_closed_date\` datetime DEFAULT NULL COMMENT 'When loan is fully paid',
        \`admin_override\` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Was this loan approved via admin override?',
        \`override_reason\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Admin reason for override',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`loan_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_admin_id\` (\`admin_id\`),
        KEY \`idx_loan_closed_date\` (\`loan_closed_date\`),
        KEY \`idx_user_loan_closure\` (\`user_id\`,\`loan_closed_date\`),
        KEY \`idx_admin_override\` (\`admin_override\`),
        CONSTRAINT \`fk_requested_loan_admin\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_requested_loan_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=2001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 3. Create loan table
    console.log('📝 Creating loan table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`loan\` (
        \`loan_id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`target_loan_id\` int NOT NULL COMMENT 'FK to requested_loan',
        \`credit\` decimal(10,2) NOT NULL COMMENT 'Payment amount',
        \`memo\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment description',
        \`status\` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        \`date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`admin_id\` int DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`loan_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_target_loan_id\` (\`target_loan_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_admin_id\` (\`admin_id\`),
        CONSTRAINT \`fk_loan_admin\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_loan_target\` FOREIGN KEY (\`target_loan_id\`) REFERENCES \`requested_loan\` (\`loan_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_loan_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=3001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 4. Create transaction table
    console.log('📝 Creating transaction table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`transaction\` (
        \`transaction_id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`debit\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Amount debited',
        \`credit\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Amount credited',
        \`memo\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`status\` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        \`transaction_type\` enum('deposit','withdrawal','subscription','joining_fee') NOT NULL,
        \`date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`admin_id\` int DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`transaction_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_transaction_type\` (\`transaction_type\`),
        KEY \`idx_admin_id\` (\`admin_id\`),
        KEY \`idx_date\` (\`date\`),
        CONSTRAINT \`fk_transaction_admin\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_transaction_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=4001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 5. Create attribute table
    console.log('📝 Creating attribute table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`attribute\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`attribute_name\` varchar(100) NOT NULL,
        \`attribute_value\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        \`description\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`attribute_name\` (\`attribute_name\`)
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Create loan_payment_reminders table
    console.log('📝 Creating loan_payment_reminders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`loan_payment_reminders\` (
        \`reminder_id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`loan_id\` int NOT NULL COMMENT 'FK to requested_loan',
        \`last_payment_date\` datetime DEFAULT NULL COMMENT 'Last accepted payment date',
        \`last_reminder_sent\` datetime DEFAULT NULL COMMENT 'Last reminder sent date',
        \`reminder_count\` int NOT NULL DEFAULT '0' COMMENT 'Number of reminders sent',
        \`status\` enum('active','paused','completed') NOT NULL DEFAULT 'active' COMMENT 'Reminder status',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`reminder_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_loan_id\` (\`loan_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_last_reminder_sent\` (\`last_reminder_sent\`),
        CONSTRAINT \`fk_reminder_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_reminder_loan\` FOREIGN KEY (\`loan_id\`) REFERENCES \`requested_loan\` (\`loan_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=5001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Create admin_overrides table
    console.log('📝 Creating admin_overrides table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`admin_overrides\` (
        \`override_id\` int NOT NULL AUTO_INCREMENT,
        \`admin_id\` int NOT NULL COMMENT 'Admin who performed the override',
        \`user_id\` int NOT NULL COMMENT 'User receiving the loan',
        \`loan_id\` int NOT NULL COMMENT 'Loan that was overridden',
        \`override_type\` varchar(50) NOT NULL DEFAULT 'loan_eligibility' COMMENT 'Type of override',
        \`failed_requirements\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Comma-separated list of failed eligibility tests',
        \`override_reason\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Admin justification in Arabic',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`override_id\`),
        KEY \`idx_admin_id\` (\`admin_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_loan_id\` (\`loan_id\`),
        KEY \`idx_created_at\` (\`created_at\`),
        CONSTRAINT \`fk_override_admin\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_override_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_override_loan\` FOREIGN KEY (\`loan_id\`) REFERENCES \`requested_loan\` (\`loan_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ All tables created successfully!');

    // 8. Insert system configuration
    console.log('📝 Inserting system configuration...');
    await connection.execute(`
      INSERT IGNORE INTO \`attribute\` (\`attribute_name\`, \`attribute_value\`, \`description\`) VALUES
      ('system_name', 'صندوق الكوثر', 'System name in Arabic'),
      ('minimum_balance', '500', 'Minimum balance required for loan eligibility'),
      ('minimum_subscription', '240', 'Minimum subscription amount required in 24 months'),
      ('loan_formula_rate', '0.006667', 'Loan calculation rate (2% annually / 12 months / 25)'),
      ('maximum_loan_multiplier', '3', 'Maximum loan as multiple of balance'),
      ('maximum_loan_amount', '10000', 'Maximum loan amount in KWD'),
      ('minimum_installment', '20', 'Minimum installment amount in KWD'),
      ('minimum_loan_period', '6', 'Minimum loan period in months')
    `);
    
    // 8. Insert admin users
    console.log('📝 Inserting admin users...');
    await connection.execute(`
      INSERT IGNORE INTO \`users\` (\`user_id\`, \`Aname\`, \`phone\`, \`email\`, \`password\`, \`workplace\`, \`whatsapp\`, \`user_type\`, \`balance\`, \`registration_date\`, \`joining_fee_approved\`, \`is_blocked\`, \`approved_by_admin_id\`) VALUES
      (1001, 'أحمد المدير', '+96599123456', 'admin1@daraalfamily.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'إدارة النظام', '+96599123456', 'admin', 0.00, '2024-01-01', 'approved', 0, NULL),
      (1002, 'سارة المساعدة', '+96599654321', 'admin2@daraalfamily.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'إدارة النظام', '+96599654321', 'admin', 0.00, '2024-01-01', 'approved', 0, NULL)
    `);
    
    // 9. Insert test users
    console.log('📝 Inserting test users...');
    await connection.execute(`
      INSERT IGNORE INTO \`users\` (\`user_id\`, \`Aname\`, \`phone\`, \`email\`, \`password\`, \`workplace\`, \`whatsapp\`, \`user_type\`, \`balance\`, \`registration_date\`, \`joining_fee_approved\`, \`is_blocked\`, \`approved_by_admin_id\`) VALUES
      (2001, 'محمد التجريبي', '+96599111111', 'mohammed@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'شركة الاختبار', '+96599111111', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
      (2002, 'فاطمة النشطة', '+96599222222', 'fatima@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'مؤسسة التطوير', '+96599222222', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
      (2003, 'عمر المعلق', '+96599333333', 'omar@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'الشركة الجديدة', '+96599333333', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
      (2004, 'ليلى المحجوبة', '+96599444444', 'layla@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'المؤسسة القديمة', '+96599444444', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
      (2005, 'خالد الجديد', '+96599555555', 'khalid@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'شركة الإنشاءات', '+96599555555', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL)
    `);
    
    console.log('✅ Database setup complete!');
    console.log('');
    console.log('=== SUMMARY ===');
    console.log('📋 Tables created: users, requested_loan, loan, transaction, attribute, loan_payment_reminders');
    console.log('👤 Admin users: 2 (password: 123456)');
    console.log('🧪 Test users: 5 (password: 123456)');
    console.log('⚙️  System configuration: 8 settings');
    console.log('');
    console.log('🎉 Your database is ready to use!');
    
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase();