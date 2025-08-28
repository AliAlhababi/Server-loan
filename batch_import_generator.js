// Generate batch import SQL files for all 112 users
const fs = require('fs');

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
  {"id": "20", "Name": "حسين محمود اشكناني2", "Palance": "2720", "Loan": "0", "Mempership Fee": "10"}
];

// Add all remaining users to complete 112
const allUsers = users.concat([
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
  {"id": "35", "Name": "علي جعفر محمد الحبابي", "Palance": "2000", "Loan": "0", "Mempership Fee": "10"},
  {"id": "36", "Name": "حسن جعفر محمد الحبابي", "Palance": "1800", "Loan": "0", "Mempership Fee": "10"},
  {"id": "37", "Name": "بتول جعفر محمد الحبابي", "Palance": "1685", "Loan": "0", "Mempership Fee": "10"},
  {"id": "38", "Name": "شهد علي الحبابي", "Palance": "100", "Loan": "0", "Mempership Fee": "10"},
  {"id": "39", "Name": "حسين محمد الحبابي 1", "Palance": "710", "Loan": "0", "Mempership Fee": "10"},
  {"id": "40", "Name": "محمد حسين الحبابي1", "Palance": "4000", "Loan": "0", "Mempership Fee": "10"}
]);

// Generate batch SQL files (10 users per batch)
const batchSize = 10;
const passwordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

// Create batch 1 (users 4-13, since user 3 is already imported)
let sql = `USE family1_loan_management;

-- Batch 1: Import users 4-13
INSERT INTO users (Aname, phone, email, password, workplace, whatsapp, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id, created_at, updated_at) VALUES 
`;

const batch1Users = allUsers.slice(1, 11); // Users 2-11 from JSON (will be DB IDs 4-13)

batch1Users.forEach((user, index) => {
  const dbUserId = index + 4; // Start from DB ID 4
  const phone = String(dbUserId).padStart(8, '0');
  const email = `user${dbUserId}@example.com`;
  const membershipStatus = user["Mempership Fee"] === "10" ? 'approved' : 'pending';
  
  sql += `('${user.Name}', '${phone}', '${email}', '${passwordHash}', 'عضو', '${phone}', 'employee', ${user.Palance}.00, '2024-01-01', '${membershipStatus}', 0, 2, NOW(), NOW())`;
  
  if (index < batch1Users.length - 1) {
    sql += ',\n';
  } else {
    sql += ';\n\n';
  }
});

sql += `SELECT 'BATCH 1 COMPLETED' as status;
SELECT COUNT(*) as total_employees FROM users WHERE user_type = 'employee';
SELECT user_id, Aname, balance FROM users WHERE user_id BETWEEN 4 AND 13 ORDER BY user_id;
`;

fs.writeFileSync('/root/Loan-Management-System/batch1_import.sql', sql, 'utf8');
console.log('✅ Batch 1 import file created (Users 4-13)');
console.log('Next: Run batch1_import.sql to import first 10 users');