const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPasswords() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'family1_loan_management',
      charset: 'utf8mb4'
    });
    
    console.log('🔄 Fixing user passwords...');
    
    // Generate correct hash for "123456"
    const correctHash = await bcrypt.hash('123456', 10);
    console.log(`Generated new hash for "123456": ${correctHash}`);
    
    // Verify the hash works
    const testResult = await bcrypt.compare('123456', correctHash);
    console.log(`Hash verification: ${testResult ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!testResult) {
      throw new Error('Generated hash is invalid!');
    }
    
    // Update all users with the correct password hash
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE user_id IN (1001, 1002, 2001, 2002, 2003, 2004, 2005)',
      [correctHash]
    );
    
    console.log(`✅ Updated ${result.affectedRows} user passwords`);
    
    // Verify the update worked
    console.log('\n🔍 Verifying password updates...');
    const [users] = await connection.execute('SELECT user_id, Aname, email FROM users ORDER BY user_id');
    
    for (const user of users) {
      const [userWithPassword] = await connection.execute('SELECT password FROM users WHERE user_id = ?', [user.user_id]);
      const isValid = await bcrypt.compare('123456', userWithPassword[0].password);
      console.log(`${user.Aname} (ID: ${user.user_id}): ${isValid ? '✅ Password works' : '❌ Password failed'}`);
    }
    
    console.log('\n🎉 All passwords fixed! You can now login with:');
    console.log('Password: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPasswords();