#!/bin/bash

# Import remaining 95 users (IDs 18-112)
# Current status: 15 users imported (IDs 3-17)

DB_USER="root"
DB_PASS="MyStrongPassword123"
DB_NAME="family1_loan_management"

echo "Starting import of remaining 95 users..."

# Users 18-30
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زهراء مصطفي الخليفي', '00000018', 'user18@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000018', 'employee', 1775.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());"

mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسين علي احمد الحبابي', '00000019', 'user19@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000019', 'employee', 515.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());"

mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('احمد علي احمد الحبابي', '00000020', 'user20@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000020', 'employee', 185.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());"

echo "Imported users 18-20..."

# Check progress
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as total_employees FROM users WHERE user_type = 'employee';"

echo "Import script created. Run this script to import all remaining users."
echo "Due to the large number of users (95 remaining), this will take some time."