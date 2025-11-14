const mysql = require('mysql2/promise');
const fs = require('fs');

async function updateDatabase(siteConfig) {
  let connection;
  try {
    const { siteName, envFile } = siteConfig;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Updating ${siteName} database for override feature...`);
    console.log(`${'='.repeat(60)}\n`);

    // Load site-specific environment variables
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    // Create connection with site-specific vars
    connection = await mysql.createConnection({
      host: envVars.DB_HOST || '127.0.0.1',
      port: envVars.DB_PORT || 3306,
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log(`✅ Connected to ${siteName} database: ${envVars.DB_NAME}`);

    // 1. Add override columns to requested_loan table
    console.log('\n📝 Adding override columns to requested_loan table...');
    try {
      await connection.execute(`
        ALTER TABLE requested_loan
        ADD COLUMN admin_override TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Was this loan approved via admin override?'
      `);
      console.log('✅ Added admin_override column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  admin_override column already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE requested_loan
        ADD COLUMN override_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Admin reason for override'
      `);
      console.log('✅ Added override_reason column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  override_reason column already exists');
      } else {
        throw error;
      }
    }

    // Add index for admin_override
    try {
      await connection.execute(`
        ALTER TABLE requested_loan
        ADD INDEX idx_admin_override (admin_override)
      `);
      console.log('✅ Added index on admin_override column');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index idx_admin_override already exists');
      } else {
        throw error;
      }
    }

    // 2. Create admin_overrides audit table
    console.log('\n📝 Creating admin_overrides table...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS admin_overrides (
          override_id INT PRIMARY KEY AUTO_INCREMENT,
          admin_id INT NOT NULL COMMENT 'Admin who performed the override',
          user_id INT NOT NULL COMMENT 'User receiving the loan',
          loan_id INT NOT NULL COMMENT 'Loan that was overridden',
          override_type VARCHAR(50) NOT NULL DEFAULT 'loan_eligibility' COMMENT 'Type of override',
          failed_requirements TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Comma-separated list of failed eligibility tests',
          override_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Admin justification in Arabic',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_admin_id (admin_id),
          INDEX idx_user_id (user_id),
          INDEX idx_loan_id (loan_id),
          INDEX idx_created_at (created_at),
          CONSTRAINT fk_override_admin FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
          CONSTRAINT fk_override_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          CONSTRAINT fk_override_loan FOREIGN KEY (loan_id) REFERENCES requested_loan(loan_id) ON DELETE CASCADE
        ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created admin_overrides table');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  admin_overrides table already exists');
      } else {
        throw error;
      }
    }

    // 3. Verify tables
    console.log('\n🔍 Verifying database structure...');

    const [requestedLoanColumns] = await connection.execute(`
      SHOW COLUMNS FROM requested_loan WHERE Field IN ('admin_override', 'override_reason')
    `);

    console.log(`✅ requested_loan has ${requestedLoanColumns.length}/2 override columns`);

    const [overrideTables] = await connection.execute(`
      SHOW TABLES LIKE 'admin_overrides'
    `);

    if (overrideTables.length > 0) {
      console.log('✅ admin_overrides table exists');

      // Count existing overrides
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM admin_overrides');
      console.log(`📊 Total overrides logged: ${count[0].total}`);
    }

    console.log(`\n✨ ${siteName} database updated successfully!\n`);

  } catch (error) {
    console.error(`❌ Error updating ${siteConfig.siteName} database:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  console.log('\n🚀 Starting database migration for admin override feature...\n');

  const sites = [
    {
      siteName: 'Site A (صندوق الكوثر)',
      envFile: '.env.siteA'
    },
    {
      siteName: 'Site B (صندوق المجادي)',
      envFile: '.env.siteB'
    }
  ];

  for (const site of sites) {
    try {
      await updateDatabase(site);
    } catch (error) {
      console.error(`\n❌ Failed to update ${site.siteName}:`, error.message);
      console.error('Continuing with next site...\n');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Database migration completed for all sites!');
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

// Run migration
main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
