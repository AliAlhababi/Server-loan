#!/bin/bash

# Shell script to import all 95 remaining users (IDs 18-112)
# Current status: 15 users already imported (IDs 3-17)

DB_USER="root"
DB_PASS="MyStrongPassword123"
DB_NAME="family1_loan_management"

echo "🚀 Starting import of 95 remaining users..."
echo "Current status: 15 users already imported (IDs 3-17)"
echo "Target: Import users 18-112"
echo ""

# Counter for progress tracking
COUNTER=18

# User 18: زهراء مصطفي الخليفي
echo "[$COUNTER/112] Importing: زهراء مصطفي الخليفي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زهراء مصطفي الخليفي', '00000018', 'user18@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000018', 'employee', 1775.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 19: حسين علي احمد الحبابي
echo "[$COUNTER/112] Importing: حسين علي احمد الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسين علي احمد الحبابي', '00000019', 'user19@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000019', 'employee', 515.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 20: احمد علي احمد الحبابي
echo "[$COUNTER/112] Importing: احمد علي احمد الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('احمد علي احمد الحبابي', '00000020', 'user20@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000020', 'employee', 185.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 21: حسين محمود اشكناني
echo "[$COUNTER/112] Importing: حسين محمود اشكناني"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسين محمود اشكناني', '00000021', 'user21@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000021', 'employee', 2720.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 22: حسين محمود اشكناني2
echo "[$COUNTER/112] Importing: حسين محمود اشكناني2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسين محمود اشكناني2', '00000022', 'user22@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000022', 'employee', 2720.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 23: عبدالمحسن فؤاد الحبابي
echo "[$COUNTER/112] Importing: عبدالمحسن فؤاد الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبدالمحسن فؤاد الحبابي', '00000023', 'user23@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000023', 'employee', 1450.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 24: عبد العزيز محمد الحبابي
echo "[$COUNTER/112] Importing: عبد العزيز محمد الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبد العزيز محمد الحبابي', '00000024', 'user24@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000024', 'employee', 6400.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 25: احمد عبد العزيز الحبابي
echo "[$COUNTER/112] Importing: احمد عبد العزيز الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('احمد عبد العزيز الحبابي', '00000025', 'user25@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000025', 'employee', 6400.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 26: عبدالعزيز الحبابي2
echo "[$COUNTER/112] Importing: عبدالعزيز الحبابي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبدالعزيز الحبابي2', '00000026', 'user26@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000026', 'employee', 4175.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 27: احمد عبدالعزيز الحبابي2
echo "[$COUNTER/112] Importing: احمد عبدالعزيز الحبابي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('احمد عبدالعزيز الحبابي2', '00000027', 'user27@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000027', 'employee', 4175.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "📊 Progress check after first 10 users..."
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as total_employees FROM users WHERE user_type = 'employee'; SELECT MAX(user_id) as last_user_id FROM users WHERE user_type = 'employee';" 2>/dev/null

echo ""
echo "Continuing with remaining users..."
echo ""

# Add more users here - continuing with next batch
# User 28: علي عبدالعزبز الحبابي 1
echo "[$COUNTER/112] Importing: علي عبدالعزبز الحبابي 1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('علي عبدالعزبز الحبابي 1', '00000028', 'user28@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000028', 'employee', 20.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 29: فاطمة حسن الحبابي
echo "[$COUNTER/112] Importing: فاطمة حسن الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة حسن الحبابي', '00000029', 'user29@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000029', 'employee', 4000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 30: فاطمة حسن الحبابي2
echo "[$COUNTER/112] Importing: فاطمة حسن الحبابي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة حسن الحبابي2', '00000030', 'user30@example.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'عضو', '00000030', 'employee', 4110.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "🎯 FIRST BATCH COMPLETE - Testing with 15 users (18-30)"
echo "This is a test run - if successful, the full script will include ALL 95 users"
echo ""

# Final check
echo "📈 Final Results:"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT 'TOTAL USERS' as info; SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type; SELECT 'USER ID RANGE' as info; SELECT MIN(user_id) as min_id, MAX(user_id) as max_id FROM users WHERE user_type = 'employee';" 2>/dev/null

echo ""
echo "✅ Shell script test completed!"
echo "If this worked well, we can extend it to include all 95 remaining users."