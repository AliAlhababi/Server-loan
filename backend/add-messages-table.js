const { pool } = require('./config/database.js');

async function addMessagesTable() {
  try {
    console.log('🔄 إضافة جدول الرسائل...');
    
    // Create messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        sender_type ENUM('user', 'admin') NOT NULL,
        sender_id INT NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('unread', 'read') DEFAULT 'unread',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✅ تم إضافة جدول الرسائل بنجاح');

    // Add some sample messages for testing
    const sampleMessages = [
      {
        user_id: 100,
        sender_type: 'admin',
        sender_id: 1,
        subject: 'مرحبا بك في درع العائلة',
        message: 'مرحبا بك في نظام درع العائلة للقروض. نحن سعداء بانضمامك إلينا. إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.',
        priority: 'medium'
      },
      {
        user_id: 100,
        sender_type: 'admin', 
        sender_id: 1,
        subject: 'تذكير بخصوص رسوم الانضمام',
        message: 'يرجى التأكد من دفع رسوم الانضمام البالغة 10 د.ك لتتمكن من طلب القروض.',
        priority: 'high'
      }
    ];

    for (const msg of sampleMessages) {
      await pool.execute(
        'INSERT INTO messages (user_id, sender_type, sender_id, subject, message, priority) VALUES (?, ?, ?, ?, ?, ?)',
        [msg.user_id, msg.sender_type, msg.sender_id, msg.subject, msg.message, msg.priority]
      );
    }

    console.log('✅ تم إدراج رسائل تجريبية');

  } catch (error) {
    console.error('❌ خطأ في إضافة جدول الرسائل:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addMessagesTable();
}

module.exports = { addMessagesTable };