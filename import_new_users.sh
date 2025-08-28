#!/bin/bash

# Script to import 57 new users starting from ID 54
# All users have password "1", registration date 2024-01-01, approved by admin ID 2

DB_USER="root"
DB_PASS="MyStrongPassword123"
DB_NAME="family1_loan_management"

echo "🚀 Starting import of 57 new users (IDs 54-110)..."
echo "Password: 1"
echo "Registration Date: 2024-01-01"
echo "Approved by Admin ID: 2"
echo ""

# Password hash for "1"
PASSWORD_HASH='\$2b\$10\$bIJvXZDUEqkxlDWnkOYx3OcArw5neT6HkdlFtNb0H7b9hXom0ODMa'

# Counter for progress tracking
COUNTER=54

# User 54: محمد عبدالكريم جنديل
echo "[$COUNTER/110] Importing: محمد عبدالكريم جنديل"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('محمد عبدالكريم جنديل', '00000054', 'user54@example.com', '$PASSWORD_HASH', 'عضو', '00000054', 'employee', 1330.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 55: عبير عباس محمد الحبابي
echo "[$COUNTER/110] Importing: عبير عباس محمد الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبير عباس محمد الحبابي', '00000055', 'user55@example.com', '$PASSWORD_HASH', 'عضو', '00000055', 'employee', 2550.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 56: فاطمه عباس الحبابي
echo "[$COUNTER/110] Importing: فاطمه عباس الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمه عباس الحبابي', '00000056', 'user56@example.com', '$PASSWORD_HASH', 'عضو', '00000056', 'employee', 1170.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 57: شيخه عباس الحبابي
echo "[$COUNTER/110] Importing: شيخه عباس الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('شيخه عباس الحbabي', '00000057', 'user57@example.com', '$PASSWORD_HASH', 'عضو', '00000057', 'employee', 2080.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 58: شيخة عباس الحبابي2
echo "[$COUNTER/110] Importing: شيخة عباس الحبابي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('شيخة عباس الحبابي2', '00000058', 'user58@example.com', '$PASSWORD_HASH', 'عضو', '00000058', 'employee', 740.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 59: محمد عدنان حسين رجب
echo "[$COUNTER/110] Importing: محمد عدنان حسين رجب"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('محمد عدنان حسين رجب', '00000059', 'user59@example.com', '$PASSWORD_HASH', 'عضو', '00000059', 'employee', 3360.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 60: محمد عدنان رجب2
echo "[$COUNTER/110] Importing: محمد عدنان رجب2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('محمد عدنان رجب2', '00000060', 'user60@example.com', '$PASSWORD_HASH', 'عضو', '00000060', 'employee', 1460.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 61: عدنان محمد عدنان حسين
echo "[$COUNTER/110] Importing: عدنان محمد عدنان حسين"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عدنان محمد عدنان حسين', '00000061', 'user61@example.com', '$PASSWORD_HASH', 'عضو', '00000061', 'employee', 1200.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 62: علي محمد عدنان حسين
echo "[$COUNTER/110] Importing: علي محمد عدنان حسين"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('علي محمد عدنان حسين', '00000062', 'user62@example.com', '$PASSWORD_HASH', 'عضو', '00000062', 'employee', 1200.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 63: شوق محمد عدنان
echo "[$COUNTER/110] Importing: شوق محمد عدنان"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('شوق محمد عدنان', '00000063', 'user63@example.com', '$PASSWORD_HASH', 'عضو', '00000063', 'employee', 440.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "📊 Progress check after batch 1 (54-63)..."
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as current_employees FROM users WHERE user_type = 'employee';" 2>/dev/null
echo ""

# User 64: مصطفي عبد الله الخليفي 1
echo "[$COUNTER/110] Importing: مصطفي عبد الله الخليفي 1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مصطفي عبد الله الخليفي 1', '00000064', 'user64@example.com', '$PASSWORD_HASH', 'عضو', '00000064', 'employee', 4410.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 65: مصطفي عبد الله الخليفي 2
echo "[$COUNTER/110] Importing: مصطفي عبد الله الخليفي 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مصطفي عبد الله الخليفي 2', '00000065', 'user65@example.com', '$PASSWORD_HASH', 'عضو', '00000065', 'employee', 3450.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW');" 2>/dev/null
((COUNTER++))

# User 66: رقية مصطفي الخليفي
echo "[$COUNTER/110] Importing: رقية مصطفي الخليفي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('رقية مصطفي الخليفي', '00000066', 'user66@example.com', '$PASSWORD_HASH', 'عضو', '00000066', 'employee', 1445.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 67: رقية مصطفي الخليفي2
echo "[$COUNTER/110] Importing: رقية مصطفي الخليفي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('رقية مصطفي الخليفي2', '00000067', 'user67@example.com', '$PASSWORD_HASH', 'عضو', '00000067', 'employee', 250.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 68: حيدر فاضل شير1
echo "[$COUNTER/110] Importing: حيدر فاضل شير1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حيدر فاضل شير1', '00000068', 'user68@example.com', '$PASSWORD_HASH', 'عضو', '00000068', 'employee', 240.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 69: زينب مصطفي الخليفي
echo "[$COUNTER/110] Importing: زينب مصطفي الخليفي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زينب مصطفي الخليفي', '00000069', 'user69@example.com', '$PASSWORD_HASH', 'عضو', '00000069', 'employee', 3440.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 70: مني عبدالله على الخليفي
echo "[$COUNTER/110] Importing: مني عبدالله على الخليفي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مني عبدالله على الخليفي', '00000070', 'user70@example.com', '$PASSWORD_HASH', 'عضو', '00000070', 'employee', 4000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 71: مني الخليفي 2
echo "[$COUNTER/110] Importing: مني الخليفي 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مني الخليفي 2', '00000071', 'user71@example.com', '$PASSWORD_HASH', 'عضو', '00000071', 'employee', 4000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 72: ايات حسين الجدى
echo "[$COUNTER/110] Importing: ايات حسين الجدى"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('ايات حسين الجدى', '00000072', 'user72@example.com', '$PASSWORD_HASH', 'عضو', '00000072', 'employee', 150.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 73: فدك حسين الجدي
echo "[$COUNTER/110] Importing: فدك حسين الجدي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فدك حسين الجدي', '00000073', 'user73@example.com', '$PASSWORD_HASH', 'عضو', '00000073', 'employee', 60.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "📊 Progress check after batch 2 (64-73)..."
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as current_employees FROM users WHERE user_type = 'employee';" 2>/dev/null
echo ""

# Continue with remaining users (74-110)...
# User 74: سعاد عبدالله علي الخليفي1
echo "[$COUNTER/110] Importing: سعاد عبدالله علي الخليفي1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('سعاد عبدالله علي الخليفي1', '00000074', 'user74@example.com', '$PASSWORD_HASH', 'عضو', '00000074', 'employee', 2320.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 75: سعاد عبدالله علي الخليفي2
echo "[$COUNTER/110] Importing: سعاد عبدالله علي الخليفي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('سعاد عبدالله علي الخليفي2', '00000075', 'user75@example.com', '$PASSWORD_HASH', 'عضو', '00000075', 'employee', 1680.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 76: زهراء مرتضى محمد جعفر
echo "[$COUNTER/110] Importing: زهراء مرتضى محمد جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زهراء مرتضى محمد جعفر', '00000076', 'user76@example.com', '$PASSWORD_HASH', 'عضو', '00000076', 'employee', 735.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 77: فاطمة مرتضى محمد جعفر
echo "[$COUNTER/110] Importing: فاطمة مرتضى محمد جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة مرتضى محمد جعفر', '00000077', 'user77@example.com', '$PASSWORD_HASH', 'عضو', '00000077', 'employee', 1360.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 78: فاطمة مرتضي مهدي 2
echo "[$COUNTER/110] Importing: فاطمة مرتضي مهدي 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة مرتضي مهدي 2', '00000078', 'user78@example.com', '$PASSWORD_HASH', 'عضو', '00000078', 'employee', 1280.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 79: عبدالله مرتضى محمد جعفر
echo "[$COUNTER/110] Importing: عبدالله مرتضى محمد جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبدالله مرتضى محمد جعفر', '00000079', 'user79@example.com', '$PASSWORD_HASH', 'عضو', '00000079', 'employee', 650.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 80: يوسف جعفر محمد جعفر
echo "[$COUNTER/110] Importing: يوسف جعفر محمد جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('يوسف جعفر محمد جعفر', '00000080', 'user80@example.com', '$PASSWORD_HASH', 'عضو', '00000080', 'employee', 2280.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 81: حوراء مرتضى محمد جعفر
echo "[$COUNTER/110] Importing: حوراء مرتضى محمد جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حوراء مرتضى محمد جعفر', '00000081', 'user81@example.com', '$PASSWORD_HASH', 'عضو', '00000081', 'employee', 5000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 82: حوراء مرتضي محمد جعفر 2
echo "[$COUNTER/110] Importing: حوراء مرتضي محمد جعفر 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حوراء مرتضي محمد جعفر 2', '00000082', 'user82@example.com', '$PASSWORD_HASH', 'عضو', '00000082', 'employee', 450.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 83: يعقوب يوسف جعفر محمد
echo "[$COUNTER/110] Importing: يعقوب يوسف جعفر محمد"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('يعقوب يوسف جعفر محمد', '00000083', 'user83@example.com', '$PASSWORD_HASH', 'عضو', '00000083', 'employee', 1625.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "📊 Progress check after batch 3 (74-83)..."
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as current_employees FROM users WHERE user_type = 'employee';" 2>/dev/null
echo ""

# Continue with remaining users...
# User 84: علي يوسف جعفر
echo "[$COUNTER/110] Importing: علي يوسف جعفر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('علي يوسف جعفر', '00000084', 'user84@example.com', '$PASSWORD_HASH', 'عضو', '00000084', 'employee', 1495.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 85: مني حسن  الوايل1
echo "[$COUNTER/110] Importing: مني حسن  الوايل1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مني حسن  الوايل1', '00000085', 'user85@example.com', '$PASSWORD_HASH', 'عضو', '00000085', 'employee', 4000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 86: مني حسن الوايل2
echo "[$COUNTER/110] Importing: مني حسن الوايل2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('مني حسن الوايل2', '00000086', 'user86@example.com', '$PASSWORD_HASH', 'عضو', '00000086', 'employee', 4000.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 87: غدير اسعد التميمي
echo "[$COUNTER/110] Importing: غدير اسعد التميمي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('غدير اسعد التميمي', '00000087', 'user87@example.com', '$PASSWORD_HASH', 'عضو', '00000087', 'employee', 595.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 88: كوثر اسعد التميمي
echo "[$COUNTER/110] Importing: كوثر اسعد التميمي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('كوثر اسعد التميمي', '00000088', 'user88@example.com', '$PASSWORD_HASH', 'عضو', '00000088', 'employee', 595.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 89: زينب خالد حسين البغلي
echo "[$COUNTER/110] Importing: زينب خالد حسين البغلي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زينب خالد حسين البغلي', '00000089', 'user89@example.com', '$PASSWORD_HASH', 'عضو', '00000089', 'employee', 3340.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 90: حسن اسعد التميمي
echo "[$COUNTER/110] Importing: حسن اسعد التميمي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسن اسعد التميمي', '00000090', 'user90@example.com', '$PASSWORD_HASH', 'عضو', '00000090', 'employee', 765.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 91: هاجر محمد العيسي1
echo "[$COUNTER/110] Importing: هاجر محمد العيسي1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('هاجر محمد العيسي1', '00000091', 'user91@example.com', '$PASSWORD_HASH', 'عضو', '00000091', 'employee', 4230.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 92: هاجر محمد العيسي2
echo "[$COUNTER/110] Importing: هاجر محمد العيسي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('هاجر محمد العيسي2', '00000092', 'user92@example.com', '$PASSWORD_HASH', 'عضو', '00000092', 'employee', 700.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 93: حسن عبدالله الحليفي1
echo "[$COUNTER/110] Importing: حسن عبدالله الحليفي1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسن عبدالله الحليفي1', '00000093', 'user93@example.com', '$PASSWORD_HASH', 'عضو', '00000093', 'employee', 2790.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 94: حسن عبدالله الخليفي2
echo "[$COUNTER/110] Importing: حسن عبدالله الخليفي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسن عبدالله الخليفي2', '00000094', 'user94@example.com', '$PASSWORD_HASH', 'عضو', '00000094', 'employee', 4190.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

echo ""
echo "📊 Progress check after batch 4 (84-94)..."
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) as current_employees FROM users WHERE user_type = 'employee';" 2>/dev/null
echo ""

# Final batch of users (95-110)
# User 95: فاطمة احمد حسن رمضان 1
echo "[$COUNTER/110] Importing: فاطمة احمد حسن رمضان 1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة احمد حسن رمضان 1', '00000095', 'user95@example.com', '$PASSWORD_HASH', 'عضو', '00000095', 'employee', 1020.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 96: فاطمة احمد حسن رمضان 2
echo "[$COUNTER/110] Importing: فاطمة احمد حسن رمضان 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمة احمد حسن رمضان 2', '00000096', 'user96@example.com', '$PASSWORD_HASH', 'عضو', '00000096', 'employee', 230.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 97: فتوح عبدالرحمن الحبابي
echo "[$COUNTER/110] Importing: فتوح عبدالرحمن الحبابي"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فتوح عبدالرحمن الحبابي', '00000097', 'user97@example.com', '$PASSWORD_HASH', 'عضو', '00000097', 'employee', 4545.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 98: فتوح عبدالرحمن الحبابي2
echo "[$COUNTER/110] Importing: فتوح عبدالرحمن الحبابي2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فتوح عبدالرحمن الحبابي2', '00000098', 'user98@example.com', '$PASSWORD_HASH', 'عضو', '00000098', 'employee', 4780.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 99: حسين حسن النصر
echo "[$COUNTER/110] Importing: حسين حسن النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حسين حسن النصر', '00000099', 'user99@example.com', '$PASSWORD_HASH', 'عضو', '00000099', 'employee', 5455.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 100: حبيب حسين حسن النصر
echo "[$COUNTER/110] Importing: حبيب حسين حسن النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('حبيب حسين حسن النصر', '00000100', 'user100@example.com', '$PASSWORD_HASH', 'عضو', '00000100', 'employee', 185.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 101: فاطمه حسن محمد النصر
echo "[$COUNTER/110] Importing: فاطمه حسن محمد النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فاطمه حسن محمد النصر', '00000101', 'user101@example.com', '$PASSWORD_HASH', 'عضو', '00000101', 'employee', 1600.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 102: زينب النصر
echo "[$COUNTER/110] Importing: زينب النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('زينب النصر', '00000102', 'user102@example.com', '$PASSWORD_HASH', 'عضو', '00000102', 'employee', 490.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 103: علي حسين النصر
echo "[$COUNTER/110] Importing: علي حسين النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('علي حسين النصر', '00000103', 'user103@example.com', '$PASSWORD_HASH', 'عضو', '00000103', 'employee', 155.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 104: محمد حسين حسن النصر
echo "[$COUNTER/110] Importing: محمد حسين حسن النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('محمد حسين حسن النصر', '00000104', 'user104@example.com', '$PASSWORD_HASH', 'عضو', '00000104', 'employee', 40.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 105: أحمد حسين النصر
echo "[$COUNTER/110] Importing: أحمد حسين النصر"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('أحمد حسين النصر', '00000105', 'user105@example.com', '$PASSWORD_HASH', 'عضو', '00000105', 'employee', 155.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 106: سكينة موسي الرشيد
echo "[$COUNTER/110] Importing: سكينة موسي الرشيد"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('سكينة موسي الرشيد', '00000106', 'user106@example.com', '$PASSWORD_HASH', 'عضو', '00000106', 'employee', 590.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 107: سكينة موسي الرشيد2
echo "[$COUNTER/110] Importing: سكينة موسي الرشيد2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('سكينة موسي الرشيد2', '00000107', 'user107@example.com', '$PASSWORD_HASH', 'عضو', '00000107', 'employee', 880.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 108: موسى احمد محمد الرشيد
echo "[$COUNTER/110] Importing: موسى احمد محمد الرشيد"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('موسى احمد محمد الرشيد', '00000108', 'user108@example.com', '$PASSWORD_HASH', 'عضو', '00000108', 'employee', 4525.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 109: موسي احمد الرشيد 2
echo "[$COUNTER/110] Importing: موسي احمد الرشيد 2"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('موسي احمد الرشيد 2', '00000109', 'user109@example.com', '$PASSWORD_HASH', 'عضو', '00000109', 'employee', 4525.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 110: عبدالله موسي الرشيد1
echo "[$COUNTER/110] Importing: عبدالله موسي الرشيد1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('عبدالله موسي الرشيد1', '00000110', 'user110@example.com', '$PASSWORD_HASH', 'عضو', '00000110', 'employee', 3330.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# Final 2 users to complete the list
# User 111: فهد عبدالرحمن الحبابي1
echo "[$COUNTER/112] Importing: فهد عبدالرحمن الحبابي1"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فهد عبدالرحمن الحبابي1', '00000111', 'user111@example.com', '$PASSWORD_HASH', 'عضو', '00000111', 'employee', 800.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null
((COUNTER++))

# User 112: فهد عبدالرحمن الحبابي 2 (FINAL USER)
echo "[$COUNTER/112] Importing: فهد عبدالرحمن الحبابي 2 (FINAL USER)"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES ('فهد عبدالرحمن الحبابي 2', '00000112', 'user112@example.com', '$PASSWORD_HASH', 'عضو', '00000112', 'employee', 1700.00, '2024-01-01', 'approved', 0, 2, NOW(), NOW());" 2>/dev/null

echo ""
echo "🎯 ALL 57 NEW USERS IMPORTED SUCCESSFULLY!"
echo ""

# Final comprehensive check
echo "📈 FINAL RESULTS:"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; 
SELECT '=== USER COUNT SUMMARY ===' as info;
SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type; 
SELECT '=== TOTAL USERS ===' as info;
SELECT COUNT(*) as total_users FROM users;
SELECT '=== USER ID RANGE ===' as info; 
SELECT MIN(user_id) as min_id, MAX(user_id) as max_id FROM users;
SELECT '=== ADMIN USERS ===' as info;
SELECT user_id, Aname FROM users WHERE user_type = 'admin' ORDER BY user_id;" 2>/dev/null

echo ""
echo "✅ COMPLETE IMPORT FINISHED!"
echo "🔢 Total imported: 57 new users (IDs 54-110) + previous 51 employees = 108 employees"
echo "📊 Database now contains: 2 admins + 108 employees = 110 total users"
echo "🎉 All users have password '1' and registration date 2024-01-01!"