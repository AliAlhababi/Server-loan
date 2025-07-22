const { pool, testConnection } = require('./config/database.js');
const { createTables, insertSystemConfig } = require('./database-setup.js');
const { createTestUsers, createTestTransactions, createTestLoans } = require('./test-data.js');

async function setupDatabase() {
  try {
    console.log('🚀 بدء إعداد قاعدة البيانات...\n');

    // Test database connection
    await testConnection();

    // Create tables
    await createTables();

    // Insert system configuration
    await insertSystemConfig();

    // Create test users
    await createTestUsers();

    // Create test transactions
    await createTestTransactions();

    // Create test loans
    await createTestLoans();

    console.log('\n✅ تم إعداد قاعدة البيانات بنجاح!');
    console.log('\n📋 بيانات الدخول:');
    console.log('👨‍💼 المدير: المعرف = 1, كلمة المرور = admin123');
    console.log('👤 مستخدم تجريبي: المعرف = 100, كلمة المرور = user123');
    console.log('📚 طالب تجريبي: المعرف = 102, كلمة المرور = user123');
    console.log('⏳ مستخدم برسوم انضمام معلقة: المعرف = 103, كلمة المرور = user123');

  } catch (error) {
    console.error('❌ فشل في إعداد قاعدة البيانات:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Reset database (clean and recreate)
async function resetDatabase() {
  try {
    console.log('🔄 إعادة تعيين قاعدة البيانات...\n');
    await setupDatabase();
  } catch (error) {
    console.error('❌ فشل في إعادة تعيين قاعدة البيانات:', error.message);
    process.exit(1);
  }
}

// Check if script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === 'reset') {
    resetDatabase();
  } else {
    setupDatabase();
  }
}

module.exports = { setupDatabase, resetDatabase };