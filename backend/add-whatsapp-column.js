const { pool } = require('./config/database');

async function addWhatsappColumn() {
  try {
    console.log('Adding WhatsApp column to users table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp'
    `);
    
    if (columns.length > 0) {
      console.log('✅ WhatsApp column already exists');
      return;
    }
    
    // Add whatsapp column
    await pool.execute(`
      ALTER TABLE users 
      ADD COLUMN whatsapp VARCHAR(20) AFTER phone
    `);
    
    console.log('✅ WhatsApp column added successfully');
    
    // Verify the column was added
    const [verification] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp'
    `);
    
    if (verification.length > 0) {
      console.log('✅ WhatsApp column verified in database');
    } else {
      console.log('❌ Failed to add WhatsApp column');
    }
    
  } catch (error) {
    console.error('❌ Error adding WhatsApp column:', error.message);
  } finally {
    process.exit(0);
  }
}

addWhatsappColumn();