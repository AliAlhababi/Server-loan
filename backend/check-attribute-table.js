const { pool } = require('./config/database');

async function checkAttributeTable() {
  try {
    console.log('Checking attribute table structure...');
    
    // Check if table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'attribute'
    `);
    
    if (tables.length === 0) {
      console.log('❌ attribute table does not exist');
      return;
    }
    
    // Check column definition
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attribute'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Attribute table columns:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    // Check existing data
    const [data] = await pool.execute('SELECT * FROM attribute LIMIT 5');
    console.log('\nExisting data:');
    console.log(data);
    
  } catch (error) {
    console.error('Error checking attribute table:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAttributeTable();