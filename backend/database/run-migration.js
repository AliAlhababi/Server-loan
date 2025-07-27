const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Running admin segmentation migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-admin-segmentation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await pool.execute(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Optionally assign existing users to first admin
    const assignQuery = `
      UPDATE users 
      SET approved_by_admin_id = (
        SELECT user_id 
        FROM users AS u2 
        WHERE u2.user_type = 'admin' 
        LIMIT 1
      ) 
      WHERE user_type = 'employee' AND approved_by_admin_id IS NULL
    `;
    
    const result = await pool.execute(assignQuery);
    console.log(`✅ Assigned ${result[0].affectedRows} existing users to first admin`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();