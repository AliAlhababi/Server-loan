const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFamilyHeadConstraint() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'loan_management'
    });

    console.log('Connected to database');

    // Try to drop the constraint directly - if it doesn't exist, we'll catch the error
    console.log('Attempting to drop constraint chk_no_self_delegation...');
    try {
      await connection.execute('ALTER TABLE family_delegations DROP CONSTRAINT chk_no_self_delegation');
      console.log('✅ Constraint dropped successfully');
    } catch (dropError) {
      if (dropError.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('Constraint chk_no_self_delegation does not exist, skipping...');
      } else {
        throw dropError;
      }
    }

    console.log('✅ Database migration completed successfully');

  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('Constraint may already be dropped or does not exist');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
fixFamilyHeadConstraint();