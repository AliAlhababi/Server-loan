const { pool } = require('./config/database');

async function checkTransactionTable() {
  try {
    console.log('Checking transaction table structure...');
    
    // Check column definition
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'transaction'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Transaction table columns:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
  } catch (error) {
    console.error('Error checking transaction table:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTransactionTable();