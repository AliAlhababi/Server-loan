const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspectDatabase() {
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
    
    console.log('✅ Connected to database successfully!');
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log('\n=== TABLES ===');
    
    // Show tables
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    console.log('\n=== TABLE STRUCTURES ===');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n--- ${tableName.toUpperCase()} ---`);
      const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
      structure.forEach(col => {
        console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
      });
    }
    
    console.log('\n=== SAMPLE DATA ===');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n--- ${tableName.toUpperCase()} (First 5 rows) ---`);
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 5`);
        if (rows.length === 0) {
          console.log('  (No data)');
        } else {
          console.log(`  Found ${rows.length} rows:`);
          rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (error) {
        console.log(`  Error reading ${tableName}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

inspectDatabase();