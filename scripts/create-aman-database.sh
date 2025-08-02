#!/bin/bash
# Create database for Site B (أمان) - Structure only, no data

echo "Creating database for أمان (Site B)..."

# Create the database
mysql -u root -pMyStrongPassword123 -e "CREATE DATABASE IF NOT EXISTS loan_system_aman CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Copy only the structure (no data) from existing database
mysqldump -u root -pMyStrongPassword123 --no-data family1_loan_management > structure_only.sql

# Import structure to new database
mysql -u root -pMyStrongPassword123 loan_system_aman < structure_only.sql

# Clean up
rm structure_only.sql

echo "✅ Database 'loan_system_aman' created successfully with table structure only!"
echo "📊 Site A: family1_loan_management (existing data)"
echo "📊 Site B: loan_system_aman (empty, ready for new data)"

# Show both databases
mysql -u root -pMyStrongPassword123 -e "SHOW DATABASES LIKE '%loan%';"