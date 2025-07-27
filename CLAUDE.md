# CLAUDE.md

**Loan Management System for درع العائلة**  
Arabic financial cooperative system with streamlined loan management and admin controls.

## Quick Commands

```bash
npm start          # Production server (port 3002)
npm run dev        # Development with nodemon
npm test          # Run Jest tests (configured)
```

## System Architecture (July 2025)

### Tech Stack
- **Backend**: Node.js/Express.js with MySQL 8.0+
- **Frontend**: Unified modular JavaScript SPA with Arabic RTL support
- **Authentication**: JWT tokens with bcrypt
- **Database**: MySQL with proper indexing and foreign key constraints
- **Dashboard**: Single `UserDashboardLoader` for users + `AdminDashboard` for admin (cleaned up duplicate user dashboard systems)

### Key Components
```
backend/
├── models/UserModel.js & LoanCalculator.js    # Centralized loan logic
├── routes/auth.js, loans.js, admin.js, users.js  # API endpoints  
├── controllers/                               # Business logic controllers
├── services/emailService.js & UserService.js # Core services
frontend/
├── js/user-dashboard-loader.js               # Single dashboard system (cleaned up)
├── js/admin-dashboard.js                     # Admin dashboard system
├── js/user-tabs/                            # Modular user tab system
├── js/admin-tabs/                           # Admin management interface
└── js/shared/LoanStatusHelper.js            # Unified loan status logic
```

## Database Schema (Current)

### Core Tables

#### `users` Table
```sql
- user_id (PK, AUTO_INCREMENT)
- Aname (varchar(100)) - Full name in Arabic
- phone (varchar(20))
- email (varchar(100), UNIQUE)
- password (varchar(255)) - bcrypt hashed
- workplace (varchar(100))
- whatsapp (varchar(20))
- user_type (ENUM: 'employee', 'admin') - Default: 'employee' (عضو أو إداري)
- balance (decimal(10,2)) - Current account balance
- registration_date (date)
- joining_fee_approved (ENUM: 'pending', 'approved', 'rejected')
- is_blocked (tinyint(1)) - Account blocking status
- will_content (text) - Will/inheritance content
- created_at, updated_at (timestamps)
```

#### `requested_loan` Table
```sql
- loan_id (PK, AUTO_INCREMENT)
- user_id (FK to users)
- loan_amount (decimal(10,2))
- installment_amount (decimal(10,2))
- status (ENUM: 'pending', 'approved', 'rejected')
- request_date (timestamp)
- approval_date (timestamp, nullable)
- admin_id (FK to users, nullable)
- notes (text, nullable)
- loan_closed_date (datetime, nullable) - When loan is fully paid
```

#### `loan` Table (Payment Records)
```sql
- loan_id (PK, AUTO_INCREMENT)
- user_id (FK to users)
- target_loan_id (FK to requested_loan)
- credit (decimal(10,2)) - Payment amount
- memo (varchar(255)) - Payment description
- status (ENUM: 'pending', 'accepted', 'rejected')
- date (timestamp)
- admin_id (FK to users, nullable)
```

#### `transaction` Table
```sql
- transaction_id (PK, AUTO_INCREMENT)
- user_id (FK to users)
- debit (decimal(10,2)) - Amount debited
- credit (decimal(10,2)) - Amount credited
- memo (varchar(255))
- status (ENUM: 'pending', 'accepted', 'rejected')
- transaction_type (ENUM: 'deposit', 'withdrawal', 'subscription', 'joining_fee')
- date (timestamp)
- admin_id (FK to users, nullable)
```

#### `attribute` Table (System Configuration)
```sql
- id (PK, AUTO_INCREMENT)
- attribute_name (varchar(100), UNIQUE)
- attribute_value (text)
- description (text)
- created_at, updated_at (timestamps)
```

### Database Features
- **Foreign Key Constraints**: Proper referential integrity with CASCADE/SET NULL
- **Optimized Indexes**: Primary keys, foreign keys, and custom indexes for performance
- **Custom Indexes**: 
  - `idx_loan_closed_date` on requested_loan
  - `idx_user_loan_closure` on (user_id, loan_closed_date)
- **UTF8MB4 Collation**: Full Unicode support for Arabic text
- **Decimal Precision**: 10,2 for all monetary values (handles up to 99,999,999.99)

## Loan System

### 7-Point Eligibility Tests (Centralized Logic)
1. ✅ **Account not blocked** (`is_blocked = 0`)
2. ✅ **Joining fee approved** (`joining_fee_approved = 'approved'`)  
3. ✅ **Minimum balance (500 KWD)** (`balance >= 500`)
4. ✅ **One year registration** (`registration_date <= 1 year ago`)
5. ✅ **No active loans** (no `requested_loan` with `status = 'approved'` and `total_paid < loan_amount`)
6. ✅ **Subscription payments (240 KWD minimum within 24 months)** (from `transaction` table)
7. ✅ **30 days since last loan closure** (`loan_closed_date` check with countdown display)

### Loan Calculation (Modularized)
- **Installment Formula**: `I = 0.006667 × (L² / B)` (rounded to nearest 5 KWD)
- **Period Calculation**: `Math.ceil(L / I)` with 6-month minimum (dynamic, no hardcoded duration)
- **Total Repayment**: Exactly equals loan amount (adjusted final payment, no interest/fees)
- **Maximum Loan**: Lesser of `balance × 3` or `10,000 KWD`
- **Minimum Installment**: 20 KWD (except final payment)
- **Payment Structure**: No processing fees - users pay only the loan amount
- **Centralized Logic**: All calculations use `LoanCalculator` model for consistency

### Loan Status Logic (Unified)
- **Active Loans**: `status = 'approved'` AND `total_paid < loan_amount`
- **Completed Loans**: `status = 'approved'` AND `total_paid >= loan_amount`
- **Status Consistency**: Both user and admin views use `LoanStatusHelper` for uniform status detection
- **Auto-Closure**: Loans automatically get `loan_closed_date` when fully paid (status remains 'approved')

### Payment System
- **User Interface**: Single modern form with progress tracking and credit history
- **Credit History**: Collapsible section showing all previous payments with status
- **Admin Approval**: Required for all loan payments
- **Exact Repayment**: Final installment adjusted to prevent overpayment
- **Real-time Validation**: Enforces minimum amounts with smart final payment handling
- **Payment Tracking**: Individual payment records with admin approver info
- **Completion Logic**: Payments tab shows completion message when no active loans

## Admin Features

### Enhanced User Management
- **Comprehensive User Details Modal**: Full user information with payment history
- **Subscription Payments Table**: Shows all accepted subscription transactions
- **Loan Installments Table**: Shows all loan payments with status and admin info
- **Professional Card Design**: Large, easy-to-read cards with color-coded status
- **Vertical Layout**: Stacked tables for better viewing and data comprehension
- **Action Buttons**: Direct access to edit user and block/unblock functionality

### Loan Management
- **Detailed Approval Process**: Admin sees complete repayment plans before approval
- **Payment Schedule Display**: Shows exact payment breakdown with final payment handling
- **Zero Installment Protection**: Prevents and repairs loans with calculation errors
- **Enhanced Loan Information**: Complete loan details with user balance and requirements
- **Pending Loans Tab**: Approve/reject loan requests with full context
- **Pending Payments Tab**: Approve/reject installment payments with history
- **Payment Tracking**: Full visibility of payment history with admin attribution

### API Endpoints
```
# Authentication Endpoints
/auth/register                      # Public user registration with email
/auth/login                         # User login with user ID and password
/auth/me                           # Get current user information
/auth/change-password              # Change user password
/auth/reset-password               # Admin password reset

# User Endpoints
/users/loans/eligibility/:userId    # Check loan eligibility with 7 tests
/users/loans/history/:userId        # Get complete loan history
/users/loans/payments/:userId       # Get payment history (credit history)
/users/transactions/:userId         # Get user transaction history
/loans/active/:userId               # Get active loan details (excludes completed)
/loans/payment                      # Submit loan payment

# Admin Endpoints
/admin/register-user                # Admin user registration (with balance control)
/admin/pending-loans                # Get pending loan requests
/admin/pending-loan-payments        # Get pending payment approvals
/admin/loan-action/:loanId          # Approve/reject loans
/admin/loan-payment-action/:paymentId # Approve/reject payments
/admin/user-details/:userId         # Get comprehensive user details
/admin/users                        # Get all users for management
```

## User Experience

### Loan Request
- **Individual Test Display**: Visual pass/fail indicators for each requirement
- **30-Day Countdown**: Shows remaining days until next loan eligibility
- **Dynamic Calculations**: No hardcoded durations - shows actual computed periods
- **Accurate Descriptions**: Clarifies 2% formula vs processing fees
- **Real-time Calculation**: Shows exact installment periods and amounts
- **Modern Interface**: Clean, focused design without unnecessary elements

### Payment Interface  
- **Single Form**: One input field, one button, optional notes
- **Credit History Display**: Collapsible section with all payment records
- **Payment Status Tracking**: Shows pending/approved/rejected status with admin info
- **Smart Validation**: Enforces minimums with final payment adjustment
- **Progress Tracking**: Visual loan progress with remaining balance
- **Quick Actions**: "القسط المطلوب" button for minimum amount
- **Completion State**: Shows celebration message when all loans are completed

### Loan History Tab (Enhanced)
- **Modular Status Logic**: Uses `LoanStatusHelper` for consistent status detection
- **Accurate Completion Detection**: Based on `total_paid >= loan_amount`
- **Complete History**: All previous loans with status and payment details
- **Filtering & Sorting**: Filter by status, sort by date/amount
- **Payment Details**: Individual loan payment breakdowns
- **Status Indicators**: Clear visual status for each loan (active/completed/rejected)

## Technical Implementation

### Modular Architecture (NEW)
- **LoanStatusHelper**: Centralized loan status logic across all components
- **FormatHelper**: Consistent currency and date formatting
- **ApiHelper**: Unified API management (optional - maintains backward compatibility)
- **Shared Utilities**: Reduce code duplication and ensure consistency

### Loan Calculation Logic
```javascript
// Uses centralized LoanCalculator class
const calculator = new LoanCalculator();
const installmentData = calculator.calculateInstallment(loanAmount, userBalance);
const monthlyInstallment = installmentData.amount;

// Period calculation  
const period = Math.max(Math.ceil(loanAmount / monthlyInstallment), 6);

// Final payment adjustment (handled automatically)
const wholePeriods = Math.floor(loanAmount / monthlyInstallment);
const finalPayment = loanAmount - (wholePeriods * monthlyInstallment);
```

### Database Operations
- **Loan Payments**: Use `loan_id` as primary key for payment approvals
- **Status Updates**: 'pending' → 'accepted'/'rejected' by admin
- **Eligibility Checks**: Single unified method with individual test results
- **30-Day Tracking**: Proper `loan_closed_date` checking with day countdown
- **Column Consistency**: All queries use correct `credit` column (not `amount`)
- **Smart Auto-Closure**: Loans marked as closed when `total_paid >= loan_amount`
- **Completion Logic**: Fixed auto-closure to only set `loan_closed_date`, not change status

## Email Service & User Registration ✅

### Smart Email System
- **Professional Email Templates**: Beautiful Arabic RTL HTML emails with responsive design
- **Welcome Email Content**: User credentials, setup instructions, updated subscription requirements (240 KWD)
- **Gmail SMTP/TLS Integration**: Enhanced connection with timeout handling and DNS fallback
- **Intelligent Error Handling**: Specific user-friendly error messages for different failure types

### Enhanced Registration System
```
Public Registration: /auth/register
- ✅ Form validation (name, email, phone, password)
- ✅ Duplicate email checking
- ✅ Password hashing with bcrypt
- ✅ Smart credential display modal with email status
- ✅ User ID prominently displayed with copy functionality
- ✅ Mandatory acknowledgment system before login access

Admin Registration: /admin/register-user  
- ✅ Admin-only endpoint with authentication
- ✅ Full user profile setup capability
- ✅ Manual balance and joining fee control
- ✅ Email notification integration with status feedback
```

### Email Configuration
```bash
# Environment Variables (.env)
EMAIL_HOST=smtp.gmail.com           # SMTP server
EMAIL_PORT=587                      # TLS port (recommended)
EMAIL_USER=your-email@gmail.com     # Gmail address
EMAIL_PASSWORD=your-app-password    # Gmail app password (16-character)
EMAIL_FROM_NAME=درع العائلة         # Sender name
EMAIL_FROM_ADDRESS=your-email@gmail.com # From address
```

## Recent Updates & Fixes (July 2025)

### Critical Bug Fixes ✅
- **Fixed Loan Completion Logic**: Loans no longer disappear from user dashboard after completion
- **Corrected Auto-Closure Behavior**: Only sets `loan_closed_date`, keeps status as 'approved'
- **Fixed Zero Installment Calculation**: Resolved division by zero issues using proper field names
- **Unified Status Detection**: Both user and admin views now use consistent completion logic
- **Repaired Installment Calculations**: Added admin repair tool for fixing broken loan records

### Major Enhancements ✅
- **Modular Architecture**: Introduced shared utilities (`LoanStatusHelper`, `FormatHelper`, `ApiHelper`)
- **Enhanced Admin User Details**: Comprehensive modal with subscription and loan payment tables
- **Professional Card Design**: Large, admin-friendly cards with color-coded status indicators
- **Loan Management Improvements**: Detailed repayment plans and payment schedules for admin approval
- **Code Consolidation**: Removed duplicate calculation logic across components

### User Experience Improvements ✅
- **Consistent Status Logic**: Loan history and payment tabs now show identical status information
- **Completion Celebration**: Payment tab shows success message when all loans are completed
- **Better Admin Interface**: Enhanced user details with comprehensive payment history
- **Improved Navigation**: Fixed tab switching and button click handlers
- **Professional Styling**: Better visual hierarchy and information presentation

---

**System Status**: ✅ Production Ready & Fully Functional  
**Database Schema**: ✅ Updated & Documented (July 2025)  
**Last Update**: July 2025 - Modular Architecture & Enhanced Admin Interface  
**Key Achievement**: Unified loan status logic and comprehensive admin user management  
**Architecture**: Modular design with shared utilities for consistency  
**Admin Features**: Complete user overview with payment history and professional interface  
**Status Logic**: Centralized and consistent across all components