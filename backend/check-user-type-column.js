const { pool } = require('./config/database');

async function checkUserTypeColumn() {
  try {
    console.log('Checking user_type column definition...');
    
    // Check column definition
    const [columns] = await pool.execute(`
      SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'user_type'
    `);
    
    if (columns.length > 0) {
      console.log('user_type column details:', columns[0]);
      
      // If it's an ENUM, show the allowed values
      const columnType = columns[0].COLUMN_TYPE;
      if (columnType.includes('enum')) {
        console.log('Allowed values for user_type:', columnType);
      }
    }
    
    // Check existing user_type values in the database
    const [existingValues] = await pool.execute(`
      SELECT DISTINCT user_type, COUNT(*) as count
      FROM users 
      GROUP BY user_type
    `);
    
    console.log('Existing user_type values in database:');
    existingValues.forEach(row => {
      console.log(`- "${row.user_type}" (${row.count} users)`);
    });
    
  } catch (error) {
    console.error('Error checking user_type column:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUserTypeColumn();