const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function updateDatabase(envFile) {
  let connection;
  try {
    // Load environment variables from file
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });

    console.log(`\n🔄 Updating database for ${envVars.SITE_NAME || envFile}...`);
    console.log(`📦 Database: ${envVars.DB_NAME}`);

    // Create connection
    connection = await mysql.createConnection({
      host: envVars.DB_HOST || '127.0.0.1',
      port: envVars.DB_PORT || 3306,
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to database successfully!');

    // Create loan_payment_reminders table
    console.log('📝 Creating loan_payment_reminders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`loan_payment_reminders\` (
        \`reminder_id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`loan_id\` int NOT NULL COMMENT 'FK to requested_loan',
        \`last_payment_date\` datetime DEFAULT NULL COMMENT 'Last accepted payment date',
        \`last_reminder_sent\` datetime DEFAULT NULL COMMENT 'Last reminder sent date',
        \`reminder_count\` int NOT NULL DEFAULT '0' COMMENT 'Number of reminders sent',
        \`status\` enum('active','paused','completed') NOT NULL DEFAULT 'active' COMMENT 'Reminder status',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`reminder_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_loan_id\` (\`loan_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_last_reminder_sent\` (\`last_reminder_sent\`),
        CONSTRAINT \`fk_reminder_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_reminder_loan\` FOREIGN KEY (\`loan_id\`) REFERENCES \`requested_loan\` (\`loan_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB AUTO_INCREMENT=5001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log(`✅ Database ${envVars.DB_NAME} updated successfully!`);
    console.log(`📋 Table created: loan_payment_reminders`);

  } catch (error) {
    console.error(`❌ Database update error for ${envFile}:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function updateAllDatabases() {
  console.log('========================================');
  console.log('🚀 Starting Multi-Site Database Update');
  console.log('========================================');

  const envFiles = ['.env.siteA', '.env.siteB'];

  for (const envFile of envFiles) {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      try {
        await updateDatabase(filePath);
      } catch (error) {
        console.error(`Failed to update database for ${envFile}`);
      }
    } else {
      console.warn(`⚠️  ${envFile} not found, skipping...`);
    }
  }

  console.log('\n========================================');
  console.log('✅ Multi-Site Database Update Complete!');
  console.log('========================================\n');
}

updateAllDatabases();
