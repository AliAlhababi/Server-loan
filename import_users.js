const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loan_management',
    charset: 'utf8mb4'
};

// User data from Excel
const userData = [
    ['احمد محمد حسن الحبابي', 4300, 5750, 10],
    ['احمد محمد الحبابي2', 4310, 12000, 10],
    ['بدريه عبدالله الخليفي', 4490, 0, 10],
    ['بدرية عبدالله الخليفي2', 4150, 7000, 10],
    ['حسن احمد محمد الحبابي', 4140, 10480, 10],
    ['حسن احمد الحبابي2', 4140, 0, 10],
    ['زينب احمد محمد الحبابي', 3410, 6870, 10],
    ['زينب احمد الحبابي 2', 3410, 0, 10],
    ['حيدر احمد باقر', 80, 0, 10],
    ['نرجس حيدر باقر', 100, 0, 0],
    ['مريم احمد محمد الحبابي', 1240, 0, 0],
    ['فاطمه احمد محمد الحبابي', 1700, 0, 10],
    ['محمد احمد محمد الحبابي', 1240, 0, 0],
    ['علي احمد محمد الحبابي', 2505, 1380, 10],
    ['علي احمد الحبابي 2', 1700, 1920, 10],
    ['زهراء مصطفي الخليفي', 1775, 0, 10],
    ['حسين علي احمد الحبابي', 515, 0, 0],
    ['احمد علي احمد الحبابي', 185, 0, 0],
    ['حسين محمود اشكناني', 2720, 0, 10],
    ['حسين محمود اشكناني2', 2720, 0, 10],
    ['عبدالمحسن فؤاد الحبابي', 1450, 0, 10],
    ['عبد العزيز محمد الحبابي', 6400, 8400, 10],
    ['احمد عبد العزيز الحبابي', 6400, 0, 10],
    ['عبدالعزيز الحبابي2', 4175, 0, 10],
    ['احمد عبدالعزيز الحبابي2', 4175, 0, 10],
    ['علي عبدالعزبز الحبابي 1', 20, 0, 10],
    ['فاطمة حسن الحبابي', 4000, 9600, 10],
    ['فاطمة حسن الحبابي2', 4110, 3940, 10],
    ['صيتة صلف السهلي', 3520, 0, 10],
    ['صيتة صلف 2', 3520, 3910, 10],
    ['لولوه حسين عيد البدر', 4350, 7800, 10],
    ['جعفر محمد حسن الحبابي', 4960, 8610, 10],
    ['جعفر محمد حسن الحبابي2', 765, 470, 10],
    ['احمد جعفر محمد الحبابي', 3200, 5745, 10],
    ['بتول جعفر محمد الحبابي', 1685, 0, 10],
    ['شهد علي الحبابي', 100, 0, 10],
    ['حسين محمد الحبابي 1', 710, 0, 10],
    ['محمد حسين الحبابي1', 4000, 0, 10],
    ['محمد حسين الحبابي2', 4000, 0, 10],
    ['جاسم محمد الحبابي', 5, 0, 0],
    ['ريم محمد الحبابي', 210, 0, 0],
    ['بدر عباس محمد الحبابي', 2190, 0, 10],
    ['بدر عباس الحبابي2', 890, 0, 10],
    ['انتهاء الظفيري', 3270, 9410, 10],
    ['انتهاء الظفيري2', 1400, 2585, 10],
    ['حورية رحيل الظفيري', 1850, 2360, 10],
    ['عباس محمد حسن الحبابي', 3735, 4220, 10],
    ['عباس محمد حسن الحبابي2', 4040, 0, 10],
    ['سعاد ايوب محمد', 0, 250, 10],
    ['سعاد ايوب محمد 2', 2160, 5490, 10],
    ['محمد عبدالكريم جنديل', 1330, 0, 10],
    ['عبير عباس محمد الحبابي', 2550, 5850, 10],
    ['فاطمه عباس الحبابي', 1170, 2080, 10],
    ['شيخه عباس الحبابي', 2080, 4140, 10],
    ['شيخة عباس الحبابي2', 740, 0, 10],
    ['محمد عدنان حسين رجب', 3360, 7270, 10],
    ['محمد عدنان رجب2', 1460, 0, 10],
    ['عدنان محمد عدنان حسين', 1200, 0, 0],
    ['علي محمد عدنان حسين', 1200, 0, 0],
    ['شوق محمد عدنان', 440, 0, 0],
    ['مصطفي عبد الله الخليفي 1', 4410, 3980, 10],
    ['مصطفي عبد الله الخليفي 2', 3450, 3060, 10],
    ['رقية مصطفي الخليفي', 1445, 3925, 10],
    ['رقية مصطفي الخليفي2', 250, 0, 10],
    ['حيدر فاضل شير1', 240, 0, 10],
    ['زينب مصطفي الخليفي', 3440, 3050, 10],
    ['مني عبدالله على الخليفي', 4000, 11280, 10],
    ['مني الخليفي 2', 4000, 4260, 10],
    ['ايات حسين الجدى', 150, 0, 0],
    ['فدك حسين الجدي', 60, 0, 10],
    ['سعاد عبدالله علي الخليفي1', 2320, 1740, 10],
    ['سعاد عبدالله علي الخليفي2', 1680, 0, 10],
    ['زهراء مرتضى محمد جعفر', 735, 0, 10],
    ['فاطمة مرتضى محمد جعفر', 1360, 935, 10],
    ['فاطمة مرتضي مهدي 2', 1280, 2795, 10],
    ['عبدالله مرتضى محمد جعفر', 650, 0, 0],
    ['يوسف جعفر محمد جعفر', 2280, 2280, 10],
    ['حوراء مرتضى محمد جعفر', 5000, 1630, 10],
    ['حوراء مرتضي محمد جعفر 2', 450, 0, 10],
    ['يعقوب يوسف جعفر محمد', 1625, 0, 0],
    ['علي يوسف جعفر', 1495, 0, 0],
    ['مني حسن الوايل1', 4000, 5750, 10],
    ['مني حسن الوايل2', 4000, 3980, 10],
    ['غدير اسعد التميمي', 595, 0, 10],
    ['كوثر اسعد التميمي', 595, 0, 10],
    ['زينب خالد حسين البغلي', 3340, 0, 10],
    ['حسن اسعد التميمي', 765, 0, 10],
    ['هاجر محمد العيسي1', 4230, 7250, 10],
    ['هاجر محمد العيسي2', 700, 0, 10],
    ['حسن عبدالله الحليفي1', 2790, 2270, 10],
    ['حسن عبدالله الخليفي2', 4190, 8880, 10],
    ['فاطمة احمد حسن رمضان 1', 1020, 0, 10],
    ['فاطمة احمد حسن رمضان 2', 230, 0, 10],
    ['فتوح عبدالرحمن الحبابي', 4545, 0, 10],
    ['فتوح عبدالرحمن الحبابي2', 4780, 10000, 10],
    ['حسين حسن النصر', 5455, 6930, 10],
    ['حبيب حسين حسن النصر', 185, 0, 10],
    ['فاطمه حسن محمد النصر', 1600, 3720, 10],
    ['زينب النصر', 480, 0, 10],
    ['علي حسين النصر', 155, 0, 10],
    ['محمد حسين حسن النصر', 40, 0, 10],
    ['أحمد حسين النصر', 155, 0, 10],
    ['سكينة موسي الرشيد', 590, 0, 10],
    ['سكينة موسي الرشيد2', 880, 0, 10],
    ['موسى احمد محمد الرشيد', 4525, 0, 10],
    ['موسي احمد الرشيد 2', 4525, 0, 10],
    ['عبدالله موسي الرشيد1', 3330, 1265, 10],
    ['فهد عبدالرحمن الحبابي1', 800, 0, 10],
    ['فهد عبدالرحمن الحبابي 2', 1700, 0, 10],
    ['فيصل عبدالرحمن محمد الحبابي', 6110, 11200, 10]
];

async function importUsers() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('Starting user import...');
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const [name, balance, loanAmount, joiningFee] of userData) {
            try {
                // Generate default password (user will change later)
                const defaultPassword = '123456';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                
                // Set joining fee status based on value
                const joiningFeeApproved = joiningFee === 10 ? 'approved' : 'pending';
                
                // Generate placeholder email (will be updated later)
                const placeholderEmail = `user${Math.random().toString(36).substr(2, 9)}@temp.local`;
                
                // Insert user
                const userResult = await connection.execute(`
                    INSERT INTO users (
                        Aname, 
                        phone, 
                        email, 
                        password, 
                        workplace, 
                        whatsapp, 
                        user_type, 
                        balance, 
                        registration_date, 
                        joining_fee_approved, 
                        is_blocked
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    name.trim(),
                    null, // phone - will be added later
                    placeholderEmail, // placeholder email - will be updated later  
                    hashedPassword,
                    'غير محدد', // workplace placeholder
                    null, // whatsapp - will be added later
                    'employee',
                    balance,
                    new Date().toISOString().split('T')[0], // today's date
                    joiningFeeApproved,
                    0 // not blocked
                ]);
                
                const userId = userResult[0].insertId;
                
                // Add joining fee transaction if approved
                if (joiningFee === 10) {
                    await connection.execute(`
                        INSERT INTO transaction (
                            user_id, 
                            debit, 
                            credit, 
                            memo, 
                            status, 
                            transaction_type, 
                            date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        userId,
                        0,
                        10,
                        'رسوم الانضمام - 10 دينار',
                        'accepted',
                        'joining_fee',
                        new Date()
                    ]);
                }
                
                // Add loan if exists
                if (loanAmount > 0) {
                    await connection.execute(`
                        INSERT INTO requested_loan (
                            user_id, 
                            loan_amount, 
                            installment_amount, 
                            status, 
                            request_date, 
                            approval_date
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        userId,
                        loanAmount,
                        Math.ceil(loanAmount / 12), // rough installment calculation
                        'approved',
                        new Date(),
                        new Date()
                    ]);
                }
                
                successCount++;
                console.log(`✓ Added user: ${name} (ID: ${userId})`);
                
            } catch (error) {
                skipCount++;
                console.log(`✗ Skipped user: ${name} - Error: ${error.message}`);
            }
        }
        
        console.log('\n=== Import Summary ===');
        console.log(`Total users processed: ${userData.length}`);
        console.log(`Successfully added: ${successCount}`);
        console.log(`Skipped: ${skipCount}`);
        console.log('\nDefault password for all users: 123456');
        console.log('Users can change their password after first login.');
        
    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the import
importUsers();