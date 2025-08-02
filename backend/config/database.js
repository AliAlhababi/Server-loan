const mysql = require('mysql2/promise');
const brandConfig = require('../../config/brandConfig');

// Get database configuration from brand config
const dbConfig = brandConfig.getDatabaseConfig();

// Create connection pool
const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
  charset: dbConfig.charset,
  timezone: dbConfig.timezone,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  } : false
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ قاعدة البيانات متصلة بنجاح - ${brandConfig.getBrandDisplayName()}`);
    console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    console.error(`Database config: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };