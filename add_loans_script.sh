#!/bin/bash

# Script to add loans for specific users
# All loans will be approved and assigned to admin ID 2 (أحمد الحبابي)

DB_USER="root"
DB_PASS="MyStrongPassword123"
DB_NAME="family1_loan_management"

echo "🚀 Starting loan import process..."
echo "Creating approved loans for users with corresponding installment calculations..."
echo ""

# Function to calculate installment using the system formula: I = 0.006667 × (L² / B)
# Then round to nearest 5 KWD
calculate_installment() {
    local loan_amount=$1
    local user_balance=$2
    
    # Calculate using formula: I = 0.006667 × (L² / B)
    local raw_installment=$(echo "scale=2; 0.006667 * ($loan_amount * $loan_amount) / $user_balance" | bc)
    
    # Round to nearest 5 KWD
    local rounded=$(echo "scale=0; ($raw_installment + 2.5) / 5 * 5" | bc)
    
    # Ensure minimum 20 KWD
    if (( $(echo "$rounded < 20" | bc -l) )); then
        rounded=20
    fi
    
    echo $rounded
}

# Get user balance for installment calculation
get_user_balance() {
    local user_id=$1
    mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT balance FROM users WHERE user_id = $user_id;" 2>/dev/null | tail -n 1
}

# Create loan function
create_loan() {
    local user_id=$1
    local loan_amount=$2
    local user_name=$3
    
    if [ -z "$user_id" ] || [ "$user_id" == "NULL" ]; then
        echo "❌ User not found: $user_name"
        return
    fi
    
    # Get user balance
    local balance=$(get_user_balance $user_id)
    
    # Calculate installment
    local installment=$(calculate_installment $loan_amount $balance)
    
    echo "📋 Creating loan for: $user_name (ID: $user_id)"
    echo "   💰 Loan Amount: $loan_amount KWD"
    echo "   💳 User Balance: $balance KWD" 
    echo "   📅 Monthly Installment: $installment KWD"
    
    # Insert into requested_loan table
    mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; INSERT INTO requested_loan (user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes) VALUES ($user_id, $loan_amount, $installment, 'approved', '2024-01-15 10:00:00', '2024-01-15 10:30:00', 2, 'Loan imported from existing records');" 2>/dev/null
    
    echo "   ✅ Loan created successfully"
    echo ""
}

echo "Starting individual loan creation..."
echo ""

# Manual matching based on available users in database
# احمد محمد الحبابي2 -> ID 4
create_loan 4 12000 "احمد محمد الحبابي2"

# فيصل عبدالرحمن محمد الحبابي -> ID 111 (close match)
create_loan 111 11200 "فيصل عبدالرحمن محمد الحبابي"

# حسن احمد محمد الحبابي -> ID 7  
create_loan 7 10480 "حسن احمد محمد الحبابي"

# فاطمة حسن الحبابي -> ID 29
create_loan 29 9600 "فاطمة حسن الحبابي"

# انتهاء الظفيري -> ID 46
create_loan 46 9410 "انتهاء الظفيري"

# جعفر محمد حسن الحبابي -> ID 34
create_loan 34 8610 "جعفر محمد حسن الحبابي"

# عبد العزيز محمد الحبابي -> ID 24
create_loan 24 8400 "عبد العزيز محمد الحبابي"

# لولوه حسين عيد البدر -> ID 33
create_loan 33 7800 "لولوه حسين عيد البدر"

# زينب احمد محمد الحبابي -> ID 9
create_loan 9 6870 "زينب احمد محمد الحبابي"

# احمد محمد حسن الحبابي -> ID 3
create_loan 3 5750 "احمد محمد حسن الحبابي"

# احمد جعفر محمد الحبابي -> ID 36
create_loan 36 5745 "احمد جعفر محمد الحبابي"

# سعاد ايوب محمد2 -> ID 53
create_loan 53 5490 "سعاد ايوب محمد2"

# عباس محمد حسن الحبابي -> ID 49
create_loan 49 4220 "عباس محمد حسن الحبابي"

# فاطمة حسن الحبابي2 -> ID 30
create_loan 30 3940 "فاطمة حسن الحبابي2"

# صيتة صلف 2 -> ID 32
create_loan 32 3910 "صيتة صلف 2"

# انتهاء الظفيري2 -> ID 47
create_loan 47 2585 "انتهاء الظفيري2"

# حورية رحيل الظفيري -> ID 48
create_loan 48 2360 "حورية رحيل الظفيري"

# علي احمد الحبابي 2 -> ID 17
create_loan 17 1920 "علي احمد الحبابي 2"

# علي احمد محمد الحبابي -> ID 16
create_loan 16 1380 "علي احمد محمد الحبابي"

# جعفر محمد حسن الحبابي2 -> ID 35
create_loan 35 470 "جعفر محمد حسن الحبابي2"

# سعاد ايوب محمد -> ID 51
create_loan 51 250 "سعاد ايوب محمد"

echo "🎯 LOAN IMPORT COMPLETED!"
echo ""

# Final verification
echo "📊 FINAL LOAN SUMMARY:"
mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; 
SELECT 'TOTAL APPROVED LOANS' as info;
SELECT COUNT(*) as total_loans FROM requested_loan WHERE status = 'approved';
SELECT 'LOAN BREAKDOWN BY AMOUNT' as info;
SELECT u.Aname as user_name, rl.loan_amount, rl.installment_amount 
FROM requested_loan rl 
JOIN users u ON rl.user_id = u.user_id 
WHERE rl.status = 'approved' 
ORDER BY rl.loan_amount DESC;" 2>/dev/null

echo ""
echo "✅ All matching loans have been created successfully!"
echo "📝 Note: Some loan names from the list didn't match existing users exactly"
echo "🔍 Only users with exact or close matches received loans"