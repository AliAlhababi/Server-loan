const { pool } = require('./config/database');

async function checkLoanTables() {
  try {
    console.log('Checking loan-related tables...');
    
    // Check requested_loan table
    console.log('\n=== REQUESTED_LOAN TABLE ===');
    const [requestedLoanColumns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'requested_loan'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('requested_loan table columns:');
    requestedLoanColumns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    // Check loan table
    console.log('\n=== LOAN TABLE ===');
    const [loanColumns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'loan'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('loan table columns:');
    loanColumns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    // Check some sample data
    console.log('\n=== SAMPLE DATA ===');
    const [sampleRequested] = await pool.execute('SELECT * FROM requested_loan LIMIT 2');
    console.log('Sample requested_loan data:', sampleRequested);
    
  } catch (error) {
    console.error('Error checking loan tables:', error.message);
  } finally {
    process.exit(0);
  }
}

checkLoanTables();