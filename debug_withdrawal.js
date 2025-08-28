// Debug script to test withdrawal transaction logic

const mysql = require('mysql2/promise');

async function debugWithdrawal() {
    let connection;
    try {
        // Test database connection (using default settings)
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'loan_management'
        });

        console.log('Connected to database');

        // Get a test user's current balance
        const [users] = await connection.execute(
            'SELECT user_id, Aname, balance FROM users WHERE user_type = "employee" LIMIT 1'
        );
        
        if (users.length === 0) {
            console.log('No users found');
            return;
        }

        const testUser = users[0];
        console.log('Test user:', testUser);

        // Test the withdrawal logic step by step
        const withdrawalAmount = 50; // Test amount
        const userId = testUser.user_id;
        
        console.log(`\nTesting withdrawal of ${withdrawalAmount} KWD from user ${userId}`);
        console.log(`Current balance: ${testUser.balance} KWD`);
        
        // Calculate what would happen
        const credit = 0;
        const debit = withdrawalAmount;
        const balanceChange = credit - debit; // Should be -50
        const newBalance = parseFloat(testUser.balance) + balanceChange;
        
        console.log('Calculated values:');
        console.log('- Credit:', credit);
        console.log('- Debit:', debit);
        console.log('- Balance Change:', balanceChange);
        console.log('- New Balance:', newBalance);
        
        // Check if there are any constraints on the users table
        const [constraints] = await connection.execute(`
            SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, CHECK_CLAUSE 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = 'users' AND tc.TABLE_SCHEMA = 'loan_management'
        `);
        
        console.log('\nTable constraints:', constraints);

        // Check recent withdrawal transactions
        const [recentWithdrawals] = await connection.execute(`
            SELECT transaction_id, user_id, credit, debit, memo, status, date 
            FROM transaction 
            WHERE debit > 0 
            ORDER BY date DESC 
            LIMIT 5
        `);
        
        console.log('\nRecent withdrawal transactions:');
        recentWithdrawals.forEach(tx => {
            console.log(`- ID: ${tx.transaction_id}, Debit: ${tx.debit}, Memo: ${tx.memo}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugWithdrawal();