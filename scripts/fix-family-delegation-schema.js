const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFamilyDelegationSchema() {
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

    // Add delegation_type column
    console.log('Adding delegation_type column...');
    try {
      await connection.execute(`
        ALTER TABLE family_delegations 
        ADD COLUMN delegation_type ENUM('family_head_request', 'member_delegation') DEFAULT 'member_delegation'
      `);
      console.log('✅ Added delegation_type column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ delegation_type column already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Update existing self-delegation records
    console.log('Updating existing self-delegation records...');
    const [updateResult] = await connection.execute(`
      UPDATE family_delegations 
      SET delegation_type = 'family_head_request' 
      WHERE family_head_id = family_member_id
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} self-delegation records`);

    // Add indexes
    console.log('Adding indexes...');
    const indexes = [
      'CREATE INDEX idx_delegation_type ON family_delegations(delegation_type)',
      'CREATE INDEX idx_head_status_type ON family_delegations(family_head_id, delegation_status, delegation_type)',
      'CREATE INDEX idx_member_status_type ON family_delegations(family_member_id, delegation_status, delegation_type)'
    ];

    for (const indexQuery of indexes) {
      try {
        await connection.execute(indexQuery);
        console.log(`✅ Added index: ${indexQuery.split(' ')[2]}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️ Index ${indexQuery.split(' ')[2]} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    // Add constraint for delegation type consistency
    console.log('Adding delegation type consistency constraint...');
    try {
      await connection.execute(`
        ALTER TABLE family_delegations 
        ADD CONSTRAINT chk_delegation_type_consistency 
        CHECK (
          (delegation_type = 'family_head_request' AND family_head_id = family_member_id) OR
          (delegation_type = 'member_delegation' AND family_head_id != family_member_id)
        )
      `);
      console.log('✅ Added delegation type consistency constraint');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_CHECK_CONSTRAINT_DUP_NAME') {
        console.log('⚠️ Delegation type consistency constraint already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Update any 'active' status to 'approved'
    console.log('Updating status consistency...');
    const [statusUpdateResult] = await connection.execute(`
      UPDATE family_delegations SET delegation_status = 'approved' WHERE delegation_status = 'active'
    `);
    console.log(`✅ Updated ${statusUpdateResult.affectedRows} records from 'active' to 'approved'`);

    console.log('✅ Database schema migration completed successfully');

  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
fixFamilyDelegationSchema().catch(console.error);