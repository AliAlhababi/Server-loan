// Generate complete user import SQL script
const fs = require('fs');
const bcrypt = require('bcrypt');

// User data from JSON
const users = [
  {"id": "1", "Name": "احمد محمد حسن الحبابي", "Palance": "4300", "Loan": "5750", "Mempership Fee": "10"},
  {"id": "2", "Name": "احمد محمد الحبابي2", "Palance": "4310", "Loan": "12000", "Mempership Fee": "10"},
  {"id": "3", "Name": "بدريه عبدالله الخليفي", "Palance": "4490", "Loan": "0", "Mempership Fee": "10"},
  {"id": "4", "Name": "بدرية عبدالله الخليفي2", "Palance": "4150", "Loan": "7000", "Mempership Fee": "10"},
  {"id": "5", "Name": "حسن احمد محمد الحبابي", "Palance": "4140", "Loan": "10480", "Mempership Fee": "10"},
  {"id": "6", "Name": "حسن احمد الحبابي2", "Palance": "4140", "Loan": "0", "Mempership Fee": "10"},
  {"id": "7", "Name": "زينب احمد محمد الحبابي", "Palance": "3410", "Loan": "6870", "Mempership Fee": "10"},
  {"id": "8", "Name": "زينب احمد الحبابي 2", "Palance": "3410", "Loan": "0", "Mempership Fee": "10"},
  {"id": "9", "Name": "حيدر احمد باقر", "Palance": "80", "Loan": "0", "Mempership Fee": "10"},
  {"id": "10", "Name": "نرجس حيدر باقر", "Palance": "100", "Loan": "0", "Mempership Fee": "0"},
  {"id": "11", "Name": "مريم احمد محمد الحبابي", "Palance": "1240", "Loan": "0", "Mempership Fee": "0"},
  {"id": "12", "Name": "فاطمه احمد محمد الحبابي", "Palance": "1700", "Loan": "0", "Mempership Fee": "10"},
  {"id": "13", "Name": "محمد احمد محمد الحبابي", "Palance": "1240", "Loan": "0", "Mempership Fee": "0"},
  {"id": "14", "Name": "علي احمد محمد الحبابي", "Palance": "2505", "Loan": "1380", "Mempership Fee": "10"},
  {"id": "15", "Name": "علي احمد الحبابي 2", "Palance": "1700", "Loan": "1920", "Mempership Fee": "10"},
  {"id": "16", "Name": "زهراء مصطفي الخليفي", "Palance": "1775", "Loan": "0", "Mempership Fee": "10"},
  {"id": "17", "Name": "حسين علي احمد الحبابي", "Palance": "515", "Loan": "0", "Mempership Fee": "0"},
  {"id": "18", "Name": "احمد علي احمد الحبابي", "Palance": "185", "Loan": "0", "Mempership Fee": "0"},
  {"id": "19", "Name": "حسين محمود اشكناني", "Palance": "2720", "Loan": "0", "Mempership Fee": "10"},
  {"id": "20", "Name": "حسين محمود اشكناني2", "Palance": "2720", "Loan": "0", "Mempership Fee": "10"},
  {"id": "21", "Name": "عبدالمحسن فؤاد الحبابي", "Palance": "1450", "Loan": "0", "Mempership Fee": "10"},
  {"id": "22", "Name": "عبد العزيز محمد الحبابي", "Palance": "6400", "Loan": "8400", "Mempership Fee": "10"},
  {"id": "23", "Name": "احمد عبد العزيز الحبابي", "Palance": "6400", "Loan": "0", "Mempership Fee": "10"},
  {"id": "24", "Name": "عبدالعزيز الحبابي2", "Palance": "4175", "Loan": "0", "Mempership Fee": "10"},
  {"id": "25", "Name": "احمد عبدالعزيز الحبابي2", "Palance": "4175", "Loan": "0", "Mempership Fee": "10"},
  {"id": "26", "Name": "علي عبدالعزبز الحبابي 1", "Palance": "20", "Loan": "0", "Mempership Fee": "10"},
  {"id": "27", "Name": "فاطمة حسن الحبابي", "Palance": "4000", "Loan": "9600", "Mempership Fee": "10"},
  {"id": "28", "Name": "فاطمة حسن الحبابي2", "Palance": "4110", "Loan": "3940", "Mempership Fee": "10"},
  {"id": "29", "Name": "صيتة صلف السهلي", "Palance": "3520", "Loan": "0", "Mempership Fee": "10"},
  {"id": "30", "Name": "صيتة صلف 2", "Palance": "3520", "Loan": "3910", "Mempership Fee": "10"},
  {"id": "31", "Name": "لولوه حسين عيد البدر", "Palance": "4350", "Loan": "7800", "Mempership Fee": "10"},
  {"id": "32", "Name": "جعفر محمد حسن الحبابي", "Palance": "4960", "Loan": "8610", "Mempership Fee": "10"},
  {"id": "33", "Name": "جعفر محمد حسن الحبابي2", "Palance": "765", "Loan": "470", "Mempership Fee": "10"},
  {"id": "34", "Name": "احمد جعفر محمد الحبابي", "Palance": "3200", "Loan": "5745", "Mempership Fee": "10"},
  {"id": "37", "Name": "بتول جعفر محمد الحبابي", "Palance": "1685", "Loan": "0", "Mempership Fee": "10"},
  {"id": "38", "Name": "شهد علي الحبابي", "Palance": "100", "Loan": "0", "Mempership Fee": "10"},
  {"id": "39", "Name": "حسين محمد الحبابي 1", "Palance": "710", "Loan": "0", "Mempership Fee": "10"},
  {"id": "40", "Name": "محمد حسين الحبابي1", "Palance": "4000", "Loan": "0", "Mempership Fee": "10"},
  {"id": "41", "Name": "محمد حسين الحبابي2", "Palance": "4000", "Loan": "0", "Mempership Fee": "10"},
  {"id": "42", "Name": "جاسم محمد الحبابي", "Palance": "5", "Loan": "0", "Mempership Fee": "0"},
  {"id": "43", "Name": "ريم محمد الحبابي", "Palance": "210", "Loan": "0", "Mempership Fee": "0"},
  {"id": "44", "Name": "بدر عباس محمد الحبابي", "Palance": "2190", "Loan": "0", "Mempership Fee": "10"},
  {"id": "45", "Name": "بدر عباس الحبابي2", "Palance": "890", "Loan": "0", "Mempership Fee": "10"},
  {"id": "46", "Name": "انتهاء الظفيري", "Palance": "3270", "Loan": "9410", "Mempership Fee": "10"},
  {"id": "47", "Name": "انتهاء الظفيري2", "Palance": "1400", "Loan": "2585", "Mempership Fee": "10"},
  {"id": "48", "Name": "حورية رحيل الظفيري", "Palance": "1850", "Loan": "2360", "Mempership Fee": "10"},
  {"id": "49", "Name": "عباس محمد حسن الحبابي", "Palance": "3735", "Loan": "4220", "Mempership Fee": "10"},
  {"id": "50", "Name": "عباس محمد حسن الحبابي2", "Palance": "4040", "Loan": "0", "Mempership Fee": "10"},
  {"id": "51", "Name": "سعاد ايوب محمد", "Palance": "0", "Loan": "250", "Mempership Fee": "10"},
  {"id": "52", "Name": "سعاد ايوب محمد 2", "Palance": "2160", "Loan": "5490", "Mempership Fee": "10"},
  {"id": "53", "Name": "محمد عبدالكريم جنديل", "Palance": "1330", "Loan": "0", "Mempership Fee": "10"},
  {"id": "54", "Name": "عبير عباس محمد الحبابي", "Palance": "2550", "Loan": "5850", "Mempership Fee": "10"},
  {"id": "55", "Name": "فاطمه عباس الحبابي", "Palance": "1170", "Loan": "2080", "Mempership Fee": "10"},
  {"id": "56", "Name": "شيخه عباس الحبابي", "Palance": "2080", "Loan": "4140", "Mempership Fee": "10"},
  {"id": "57", "Name": "شيخة عباس الحبابي2", "Palance": "740", "Loan": "0", "Mempership Fee": "10"},
  {"id": "58", "Name": "محمد عدنان حسين رجب", "Palance": "3360", "Loan": "7270", "Mempership Fee": "10"},
  {"id": "59", "Name": "محمد عدنان رجب2", "Palance": "1460", "Loan": "0", "Mempership Fee": "10"},
  {"id": "60", "Name": "عدنان محمد عدنان حسين", "Palance": "1200", "Loan": "0", "Mempership Fee": "0"},
  {"id": "61", "Name": "علي محمد عدنان حسين", "Palance": "1200", "Loan": "0", "Mempership Fee": "0"},
  {"id": "62", "Name": "شوق محمد عدنان", "Palance": "440", "Loan": "0", "Mempership Fee": "0"},
  {"id": "63", "Name": "مصطفي عبد الله الخليفي 1", "Palance": "4410", "Loan": "3980", "Mempership Fee": "10"},
  {"id": "64", "Name": "مصطفي عبد الله الخليفي 2", "Palance": "3450", "Loan": "3060", "Mempership Fee": "10"},
  {"id": "65", "Name": "رقية مصطفي الخليفي", "Palance": "1445", "Loan": "3925", "Mempership Fee": "10"},
  {"id": "66", "Name": "رقية مصطفي الخليفي2", "Palance": "250", "Loan": "0", "Mempership Fee": "10"},
  {"id": "67", "Name": "حيدر فاضل شير1", "Palance": "240", "Loan": "0", "Mempership Fee": "10"},
  {"id": "68", "Name": "زينب مصطفي الخليفي", "Palance": "3440", "Loan": "3050", "Mempership Fee": "10"},
  {"id": "69", "Name": "مني عبدالله على الخليفي", "Palance": "4000", "Loan": "11280", "Mempership Fee": "10"},
  {"id": "70", "Name": "مني الخليفي 2", "Palance": "4000", "Loan": "4260", "Mempership Fee": "10"},
  {"id": "71", "Name": "ايات حسين الجدى", "Palance": "150", "Loan": "0", "Mempership Fee": "0"},
  {"id": "72", "Name": "فدك حسين الجدي", "Palance": "60", "Loan": "0", "Mempership Fee": "10"},
  {"id": "73", "Name": "سعاد عبدالله علي الخليفي1", "Palance": "2320", "Loan": "1740", "Mempership Fee": "10"},
  {"id": "74", "Name": "سعاد عبدالله علي الخليفي2", "Palance": "1680", "Loan": "0", "Mempership Fee": "10"},
  {"id": "75", "Name": "زهراء مرتضى محمد جعفر", "Palance": "735", "Loan": "0", "Mempership Fee": "10"},
  {"id": "76", "Name": "فاطمة مرتضى محمد جعفر", "Palance": "1360", "Loan": "935", "Mempership Fee": "10"},
  {"id": "77", "Name": "فاطمة مرتضي مهدي 2", "Palance": "1280", "Loan": "2795", "Mempership Fee": "10"},
  {"id": "78", "Name": "عبدالله مرتضى محمد جعفر", "Palance": "650", "Loan": "0", "Mempership Fee": "0"},
  {"id": "79", "Name": "يوسف جعفر محمد جعفر", "Palance": "2280", "Loan": "2280", "Mempership Fee": "10"},
  {"id": "80", "Name": "حوراء مرتضى محمد جعفر", "Palance": "5000", "Loan": "1630", "Mempership Fee": "10"},
  {"id": "81", "Name": "حوراء مرتضي محمد جعفر 2", "Palance": "450", "Loan": "0", "Mempership Fee": "10"},
  {"id": "82", "Name": "يعقوب يوسف جعفر محمد", "Palance": "1625", "Loan": "0", "Mempership Fee": "0"},
  {"id": "83", "Name": "علي يوسف جعفر", "Palance": "1495", "Loan": "0", "Mempership Fee": "0"},
  {"id": "84", "Name": "مني حسن الوايل1", "Palance": "4000", "Loan": "5750", "Mempership Fee": "10"},
  {"id": "85", "Name": "مني حسن الوايل2", "Palance": "4000", "Loan": "3980", "Mempership Fee": "10"},
  {"id": "86", "Name": "غدير اسعد التميمي", "Palance": "595", "Loan": "0", "Mempership Fee": "10"},
  {"id": "87", "Name": "كوثر اسعد التميمي", "Palance": "595", "Loan": "0", "Mempership Fee": "10"},
  {"id": "88", "Name": "زينب خالد حسين البغلي", "Palance": "3340", "Loan": "0", "Mempership Fee": "10"},
  {"id": "89", "Name": "حسن اسعد التميمي", "Palance": "765", "Loan": "0", "Mempership Fee": "10"},
  {"id": "90", "Name": "هاجر محمد العيسي1", "Palance": "4230", "Loan": "7250", "Mempership Fee": "10"},
  {"id": "91", "Name": "هاجر محمد العيسي2", "Palance": "700", "Loan": "0", "Mempership Fee": "10"},
  {"id": "92", "Name": "حسن عبدالله الحليفي1", "Palance": "2790", "Loan": "2270", "Mempership Fee": "10"},
  {"id": "93", "Name": "حسن عبدالله الخليفي2", "Palance": "4190", "Loan": "8880", "Mempership Fee": "10"},
  {"id": "94", "Name": "فاطمة احمد حسن رمضان 1", "Palance": "1020", "Loan": "0", "Mempership Fee": "10"},
  {"id": "95", "Name": "فاطمة احمد حسن رمضان 2", "Palance": "230", "Loan": "0", "Mempership Fee": "10"},
  {"id": "96", "Name": "فتوح عبدالرحمن الحبابي", "Palance": "4545", "Loan": "0", "Mempership Fee": "10"},
  {"id": "97", "Name": "فتوح عبدالرحمن الحبابي2", "Palance": "4780", "Loan": "10000", "Mempership Fee": "10"},
  {"id": "98", "Name": "حسين حسن النصر", "Palance": "5455", "Loan": "6735", "Mempership Fee": "10"},
  {"id": "99", "Name": "حبيب حسين حسن النصر", "Palance": "185", "Loan": "0", "Mempership Fee": "10"},
  {"id": "100", "Name": "فاطمه حسن محمد النصر", "Palance": "1600", "Loan": "3720", "Mempership Fee": "10"},
  {"id": "101", "Name": "زينب النصر", "Palance": "490", "Loan": "0", "Mempership Fee": "10"},
  {"id": "102", "Name": "علي حسين النصر", "Palance": "155", "Loan": "0", "Mempership Fee": "10"},
  {"id": "103", "Name": "محمد حسين حسن النصر", "Palance": "40", "Loan": "0", "Mempership Fee": "10"},
  {"id": "104", "Name": "أحمد حسين النصر", "Palance": "155", "Loan": "0", "Mempership Fee": "10"},
  {"id": "105", "Name": "سكينة موسي الرشيد", "Palance": "590", "Loan": "0", "Mempership Fee": "10"},
  {"id": "106", "Name": "سكينة موسي الرشيد2", "Palance": "880", "Loan": "0", "Mempership Fee": "10"},
  {"id": "107", "Name": "موسى احمد محمد الرشيد", "Palance": "4525", "Loan": "0", "Mempership Fee": "10"},
  {"id": "108", "Name": "موسي احمد الرشيد 2", "Palance": "4525", "Loan": "0", "Mempership Fee": "10"},
  {"id": "109", "Name": "عبدالله موسي الرشيد1", "Palance": "3330", "Loan": "1265", "Mempership Fee": "10"},
  {"id": "110", "Name": "فهد عبدالرحمن الحبابي1", "Palance": "800", "Loan": "0", "Mempership Fee": "10"},
  {"id": "111", "Name": "فهد عبدالرحمن الحبابي 2", "Palance": "1700", "Loan": "0", "Mempership Fee": "10"},
  {"id": "112", "Name": "فيصل عبدالرحمن محمد الحبابي", "Palance": "6110", "Loan": "11200", "Mempership Fee": "10"}
];

// Calculate installment amount using the system's formula
function calculateInstallment(loanAmount, balance) {
  if (loanAmount === 0) return 0;
  const rawInstallment = 0.006667 * (loanAmount * loanAmount) / balance;
  return Math.ceil(rawInstallment / 5) * 5; // Round to nearest 5 KWD
}

// Generate password hash for "1"
const passwordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // bcrypt hash for "1"

let sql = `-- Complete Database Reset and User Import Script
-- Database: family1_loan_management (Site A)
-- Generated automatically with all 112 users

USE family1_loan_management;

-- Start transaction for safety
START TRANSACTION;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Truncate all tables to reset AUTO_INCREMENT
TRUNCATE TABLE family_delegations;
TRUNCATE TABLE loan;
TRUNCATE TABLE requested_loan;
TRUNCATE TABLE transaction;
TRUNCATE TABLE users;

-- 2. Reset AUTO_INCREMENT counters
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE requested_loan AUTO_INCREMENT = 1;
ALTER TABLE loan AUTO_INCREMENT = 1;
ALTER TABLE transaction AUTO_INCREMENT = 1;
ALTER TABLE family_delegations AUTO_INCREMENT = 1;

-- 3. Insert admins with IDs 1 and 2
INSERT INTO users (user_id, Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) 
VALUES (1, 'ALI A M ALHABABI', '99999999', 'a.alhababi@outlook.com', '${passwordHash}', 'Admin', '99999999', 'admin', 0.00, '2024-01-29', 'approved', 0, NULL, NOW(), NOW());

INSERT INTO users (user_id, Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) 
VALUES (2, 'أحمد الحبابي', '99999998', 'aliali14141@gmail.com', '${passwordHash}', 'Admin', '99999998', 'admin', 0.00, '2025-07-29', 'approved', 0, NULL, NOW(), NOW());

-- 4. Import all regular users (starting from ID 3)
`;

// Generate user inserts
users.forEach((user, index) => {
  const newUserId = index + 3; // Start from ID 3 (after the 2 admins)
  const phone = String(newUserId).padStart(8, '0');
  const email = `user${newUserId}@example.com`;
  const membershipStatus = user["Mempership Fee"] === "10" ? 'approved' : 'pending';
  
  sql += `-- User ${newUserId}: ${user.Name} (Original ID ${user.id})
INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) 
VALUES ('${user.Name}', '${phone}', '${email}', '${passwordHash}', 'عضو', '${phone}', 'employee', ${user.Palance}.00, '2024-01-01', '${membershipStatus}', 0, 2, NOW(), NOW());

`;
});

// Generate joining fee transactions
sql += `-- 5. Create joining fee transactions for users who paid 10 KWD
`;

users.forEach((user, index) => {
  if (user["Mempership Fee"] === "10") {
    const newUserId = index + 3;
    sql += `INSERT INTO transaction (user_id, debit, credit, memo, status, transaction_type, date, admin_id, created_at, updated_at)
VALUES (${newUserId}, 0.00, 10.00, 'رسوم انضمام', 'accepted', 'joining_fee', '2024-01-01 10:00:00', 2, NOW(), NOW());

`;
  }
});

// Generate loan records
sql += `-- 6. Create active loans for users who have loans > 0
`;

let loanId = 1;
users.forEach((user, index) => {
  const loanAmount = parseFloat(user.Loan);
  if (loanAmount > 0) {
    const newUserId = index + 3;
    const balance = parseFloat(user.Palance);
    const installmentAmount = calculateInstallment(loanAmount, balance);
    
    sql += `-- Loan ${loanId} for user ${newUserId}: ${user.Name} (${loanAmount} KWD loan)
INSERT INTO requested_loan (user_id, loan_amount, installment_amount, status, request_date, approval_date, admin_id, notes, created_at, updated_at)
VALUES (${newUserId}, ${loanAmount}.00, ${installmentAmount}.00, 'approved', '2024-02-01 10:00:00', '2024-02-01 11:00:00', 2, 'قرض معتمد', NOW(), NOW());

`;
    loanId++;
  }
});

sql += `-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show results
SELECT 'DATABASE RESET AND COMPLETE IMPORT COMPLETED' as status;
SELECT 'ADMIN USERS' as info;
SELECT user_id, Aname, user_type FROM users WHERE user_type = 'admin' ORDER BY user_id;

SELECT 'TOTAL USER COUNT' as info;
SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type;

SELECT 'USERS WITH LOANS' as info;
SELECT COUNT(*) as users_with_active_loans FROM requested_loan WHERE status = 'approved';

SELECT 'USERS WITH JOINING FEES PAID' as info;
SELECT COUNT(*) as users_with_joining_fees FROM transaction WHERE transaction_type = 'joining_fee' AND status = 'accepted';

SELECT 'SAMPLE USERS' as info;
SELECT user_id, Aname, balance, joining_fee_approved FROM users WHERE user_type = 'employee' ORDER BY user_id LIMIT 10;

COMMIT;
`;

// Write the SQL file
fs.writeFileSync('/root/Loan-Management-System/final_complete_import.sql', sql, 'utf8');
console.log('Complete import SQL script generated successfully!');
console.log(`Total users to import: ${users.length}`);
console.log(`Users with loans: ${users.filter(u => parseFloat(u.Loan) > 0).length}`);
console.log(`Users with joining fees: ${users.filter(u => u["Mempership Fee"] === "10").length}`);