const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testPasswords() {
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
    
    console.log('🔍 Testing password authentication...');
    
    // Get all users
    const [users] = await connection.execute('SELECT user_id, Aname, email, password FROM users ORDER BY user_id');
    
    console.log('\n=== USER PASSWORD VERIFICATION ===');
    
    for (const user of users) {
      console.log(`\nUser: ${user.Aname} (${user.email})`);
      console.log(`User ID: ${user.user_id}`);
      console.log(`Stored hash: ${user.password}`);
      
      // Test password "123456"
      const isValid = await bcrypt.compare('123456', user.password);
      console.log(`Password "123456" valid: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      if (!isValid) {
        // Try to generate a new hash for 123456
        const newHash = await bcrypt.hash('123456', 10);
        console.log(`New hash for "123456": ${newHash}`);
        
        // Test the new hash
        const newHashValid = await bcrypt.compare('123456', newHash);
        console.log(`New hash test: ${newHashValid ? '✅ Valid' : '❌ Invalid'}`);
      }
    }
    
    // Also test the exact hash we used
    const testHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    console.log('\n=== HASH VERIFICATION ===');
    console.log(`Testing hash: ${testHash}`);
    const hashTest = await bcrypt.compare('123456', testHash);
    console.log(`Hash test result: ${hashTest ? '✅ Valid' : '❌ Invalid'}`);
    
    // Try other common passwords
    const commonPasswords = ['password', 'admin', 'test', '123456789', 'qwerty'];
    console.log('\n=== TESTING OTHER PASSWORDS ===');
    for (const pwd of commonPasswords) {
      const test = await bcrypt.compare(pwd, testHash);
      console.log(`Password "${pwd}": ${test ? '✅ Match' : '❌ No match'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testPasswords();