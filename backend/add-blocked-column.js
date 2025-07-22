const { pool } = require('./config/database');

async function addBlockedColumn() {
    try {
        console.log('🔧 Adding is_blocked column to users table...');
        
        // Check if column already exists
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'is_blocked'
        `);
        
        if (columns.length > 0) {
            console.log('✅ is_blocked column already exists');
            return;
        }
        
        // Add the is_blocked column
        await pool.execute(`
            ALTER TABLE users 
            ADD COLUMN is_blocked TINYINT(1) DEFAULT 0 COMMENT 'User blocked status: 0=active, 1=blocked'
        `);
        
        console.log('✅ Successfully added is_blocked column to users table');
        
        // Verify the column was added
        const [newColumns] = await pool.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'is_blocked'
        `);
        
        if (newColumns.length > 0) {
            console.log('✅ Column verification successful:', newColumns[0]);
        }
        
    } catch (error) {
        console.error('❌ Error adding is_blocked column:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the migration
addBlockedColumn()
    .then(() => {
        console.log('🎉 Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });