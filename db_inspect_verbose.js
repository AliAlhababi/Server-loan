const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspectDatabase() {
  let connection;
  try {
    console.log('=== DATABASE CONNECTION INFO ===');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    
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
    
    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('\n=== AVAILABLE DATABASES ===');
    databases.forEach(db => {
      const dbName = Object.values(db)[0];
      console.log(`- ${dbName}`);
    });
    
    // Show tables
    console.log('\n=== TABLES IN CURRENT DATABASE ===');
    try {
      const [tables] = await connection.execute('SHOW TABLES');
      if (tables.length === 0) {
        console.log('❌ No tables found in database!');
        
        // Check if we can access the database at all
        const [dbCheck] = await connection.execute('SELECT DATABASE() as current_db');
        console.log('Current database:', dbCheck[0].current_db);
        
        return;
      }
      
      console.log(`Found ${tables.length} tables:`);
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
        
        // Show count
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  Total rows: ${countResult[0].count}`);
      }
      
      console.log('\n=== SAMPLE DATA ===');
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        console.log(`\n--- ${tableName.toUpperCase()} (First 3 rows) ---`);
        try {
          const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
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
      
    } catch (tablesError) {
      console.error('❌ Error fetching tables:', tablesError.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

inspectDatabase();