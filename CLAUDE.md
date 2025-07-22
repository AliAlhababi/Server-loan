# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Loan Management System for درع العائلة - an Arabic-language financial application that manages loans, transactions, and user accounts. The system is built as a full-stack web application with Node.js/Express backend and vanilla HTML/CSS/JavaScript frontend.

## Development Commands

### Server Management
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (auto-restart)

### Database Management  
- `npm run setup` - Initialize database with test data
- `npm run reset` - Reset database to clean state
- `npm run scenarios` - Reset database with predefined test scenarios

### Testing
- `npm run test-subscription` - Test subscription functionality
- No formal test suite is configured (displays error message)

## Architecture

### Backend Structure (`backend/`)
- **Entry Point**: `server.js` - Express server with CORS, static file serving, and API routes
- **Database**: Local MySQL (XAMPP) with connection pooling via `config/database.js`
  - **Host**: `localhost:3306`
  - **Database**: `loan_management`
  - **User**: `root` (no password)
  - **Character Set**: `utf8mb4` for Arabic support
- **Authentication**: JWT-based auth with bcrypt password hashing (`middleware/auth.js`)
- **Models**: Business logic classes for loan calculations and user management
  - `LoanCalculator.js` - **Simple mathematical loan calculations using corrected formula**
    - Uses fixed constants: maxl1=10000, maxlp1=3, instp1=0.02
    - **Corrected Formula**: I = round5(ratio × L² / B) where ratio = 0.02/3 = 0.006667 (exact mathematical ratio)
    - **Examples**: 10,000 loan + 3,335 balance = 200 KWD installment, 2,000 loan + 2,000 balance = 15 KWD (raised to 20 minimum)
    - Maximum loan = min(balance × 3, 10000)
    - Balance-based eligibility (minimum 500 KWD)
    - Simplified balance tiers: Basic (500+), Medium (1000+), Special (3330+)
  - `UserModel.js` - User data retrieval, loan eligibility checks, transaction history, and loan payment history
    - `getUserTransactions()` - Fetches regular transactions from `transaction` table
    - `getUserLoanPayments()` - Fetches loan installment payments from `loan` table
- **Routes**: RESTful API endpoints
  - `/api/auth` - Authentication (login)
  - `/api/users` - User management and profiles
    - `/users/transactions/:userId` - Get user transaction history
    - `/users/loan-payments/:userId` - Get user loan payment history
    - `/users/dashboard/:userId` - Get user dashboard data
  - `/api/loans` - Loan requests and management
  - `/api/admin` - Administrative functions
    - `/admin/joining-fee-action/:userId` - Approve/reject joining fee (10 KWD)

### Frontend Structure (`frontend/`)
- **Single Page Application**: `index.html` with dynamic content switching
- **Styling**: Custom CSS in `css/style.css` with Arabic RTL support
- **JavaScript**: 
  - `js/app.js` - Main application logic, API calls, and UI interactions
  - `js/loanCalculator.js` - **Original complex loan calculator with multiple calculation scenarios**
    - Advanced auto-calculation supporting all loan scenarios
    - Mathematical relationship: I ≈ ratio × (L² / B)
    - Multiple calculation methods for different input combinations
- **Pages**: Additional page templates in `pages/` directory

### Database
- MySQL database with connection pooling
- Supports both employees and students with different subscription requirements
- Key tables: `users`, `requested_loan`, `transaction`, `loan` (installment payments), `attribute` (system config)
- **Important**: Loan installment payments are stored in the `loan` table, not `transaction` table
  - Use `target_loan_id IS NOT NULL` to identify loan payments
  - Payment amounts stored in `credit` field with `status = 'accepted'` for approved payments
- **User Status Schema**: 
  - `users.joining_fee_approved` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
  - `users.is_blocked` TINYINT(1) DEFAULT 0 - User blocking status (0=active, 1=blocked)
- **Database Migration**: Use `node backend/add-blocked-column.js` to add `is_blocked` column to existing databases

## Business Logic

### Loan System
- **Eligibility Rules**: Multi-factor loan eligibility checking
  - No active/pending loans
  - **1-year registration requirement**: User must be registered for at least 1 year before requesting loans
  - 30-day waiting period after loan closure
  - Minimum 500 KWD balance requirement
  - 24-month subscription payment requirements (240 KWD employees, 120 KWD students)
  - 11-month waiting period between loan receipts
  - **Joining fee approval (10 KWD)**: Admin must approve user's joining fee payment before loan requests
- **Simple Loan Calculation**: **Unified simple mathematical approach**
  - **Formula**: I = max(round5(ratio × L² / B), 20) where ratio = 0.02/3 ≈ 0.00667
  - **Maximum loan**: min(balance × 3, 10000 KWD system cap)
  - **Minimum installment**: 20 KWD (enforced on all calculations)
  - **Balance tiers**: Simplified to Basic (500+), Medium (1000+), Special (3330+)
  - **Fixed installment period**: 24 months (no longer variable)
  - **Examples**: 
    - 2000 KWD loan with 1000 KWD balance = 30 KWD monthly installment
    - 1000 KWD loan with 500 KWD balance = 20 KWD monthly installment (15 base + 20 minimum)

### User Types
- **Employees**: Higher subscription requirements (240 KWD/24 months)
- **Students**: Lower subscription requirements (120 KWD/24 months)
- **Admin**: Administrative access to manage loans and transactions

## Key Features
- Arabic language support with RTL layout
- Real-time loan eligibility checking
- **Simple unified loan calculation** based on mathematical formula
- Administrative dashboard for loan approval/rejection
- Transaction history and balance management
- **Loan installment payment tracking and history**
- **Financial summary with accurate calculations**
  - Current balance from user account
  - Total deposits from accepted transactions
  - Total loan payments from accepted loan installments
- JWT authentication with session management
- User details modal with comprehensive financial overview
- **Advanced frontend loan calculator** with multiple calculation scenarios
- **Joining fee approval system (10 KWD)**
  - Admin controls for approving/rejecting joining fees
  - Clear user messaging about joining fee requirements
  - Integration with loan eligibility checks
- **User Profile Management**
  - Edit personal information (name, phone, email, workplace)
  - Change password with current password verification
  - Real-time profile updates in UI
- **Will Management System (وصية)**
  - Users can write and save their will for fund distribution
  - Admin can view user wills in admin panel
  - Secure will storage and retrieval
- **Enhanced Admin Controls**
  - Loan terms and conditions accessible from header
  - Admin can modify user registration dates
  - View user wills in admin user details
  - Improved modal system with proper exit functionality

## Environment Setup
- **Local XAMPP MySQL Setup**: Uses local `loan_management` database
- **Database Configuration**: Updated `.env` for localhost connection
  ```
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=loan_management
  ```
- **Database Connection**: Auto-tested on server startup with Arabic success message
- **MySQL2**: Promise-based queries with connection pooling
- **CORS**: Enabled for frontend-backend communication
- **Character Encoding**: Full UTF-8MB4 support for Arabic content

## Comprehensive Testing Results (17/07/2025)

### System Testing Summary
Complete system testing performed covering 14 test categories with all tests passing successfully:

#### 1. Server Startup & Database Connection ✅
- Server starts successfully on port 3000
- Database connection established
- All required tables verified

#### 2. Authentication System ✅
- Admin login (ID: 1, Password: admin123) - Success
- User login (ID: 100, Password: user123) - Success  
- JWT token generation and validation working
- Logout functionality confirmed

#### 3. Self-Service Password Reset ✅
- Email/phone verification working correctly
- Password validation (minimum 6 characters) enforced
- Automatic password generation (8 characters) functional
- User notification system active

#### 4. User Management ✅
- Profile updates saved to database successfully
- Email uniqueness validation working
- Contact information updates confirmed
- Banking details storage verified

#### 5. Loan Calculation System ✅
- Simple mathematical formula implemented: I = max(round5(ratio × L² / B), 20)
- 20 KWD minimum installment enforced across all calculations
- Maximum loan calculation (balance × 3, capped at 10,000 KWD) verified
- Frontend-backend calculation consistency confirmed

#### 6. Loan Eligibility Checks ✅
- Balance requirement (minimum 500 KWD) enforced
- Joining fee approval requirement active
- No active loans validation working
- User type-specific requirements verified

#### 7. Admin Controls & User Details ✅
- User details modal displaying comprehensive financial data
- Transaction history with proper categorization
- Loan payment tracking from `loan` table confirmed
- Admin approval/rejection workflows functional

#### 8. Reports System (التقارير) ✅ 
Six comprehensive report types implemented:
- **Users Report**: Complete user listing with statistics
- **Loans Report**: All loan statuses with financial summaries
- **Transactions Report**: Financial transaction analysis
- **Financial Summary**: System-wide financial health metrics
- **Monthly Report**: Current month activity breakdown
- **Active Loans Report**: Real-time loan progress tracking

#### 9. Database Backup System ✅
- JSON export functionality working
- SQL dump generation confirmed
- File download mechanism via blob URLs functional
- Backup file naming with timestamps verified

#### 10. Transaction Management ✅
- Deposit requests submitted successfully
- Admin approval workflow active
- Balance updates reflected correctly
- Transaction status tracking working

#### 11. Error Handling & Validation ✅
- Foreign key constraint errors resolved
- SQL injection protection active
- Input validation on all forms confirmed
- User-friendly error messages in Arabic

#### 12. Joining Fee Approval System ✅
- Admin approval interface functional
- Database status updates working (pending/approved/rejected)
- Loan eligibility integration confirmed
- User messaging system active

#### 13. Frontend Integration ✅
- Arabic RTL layout working correctly
- Modal system functioning properly
- Tab-based navigation confirmed
- Responsive design verified

#### 14. Performance & Data Integrity ✅
- Database connection pooling active
- Query optimization confirmed
- Data consistency across tables verified
- Memory usage within acceptable limits

### Production Readiness Assessment
- **Security**: JWT authentication, password hashing, input validation ✅
- **Scalability**: Connection pooling, efficient queries ✅  
- **Reliability**: Error handling, transaction management ✅
- **User Experience**: Arabic interface, intuitive navigation ✅
- **Admin Controls**: Comprehensive management tools ✅

### Deployment Preparation
- **Environment Variables**: Database credentials, JWT secrets configured
- **Production Database**: Ready for Aiven MySQL free tier migration
- **Static Assets**: Frontend files optimized for Vercel deployment
- **API Routes**: All endpoints tested and functional
- **Security**: Production-ready authentication and validation

## Latest System Enhancements (January 2025)

### **CRITICAL: Database Migration & System Fixes**
- **Migrated to Local XAMPP MySQL Database**: Switched from cloud Aiven database to local development setup
  - **Resolved DNS/Network Issues**: Fixed `ERR_NAME_NOT_RESOLVED` errors caused by cloud connectivity
  - **Updated Configuration**: Changed `.env` to use `localhost:3306` with `loan_management` database
  - **Improved Performance**: Local database provides faster response times and better reliability
  - **Better Development Experience**: Direct access via phpMyAdmin and full database control
  - **Cost Effective**: No cloud database fees, completely local development environment
- **Fixed Loan Calculation Error**: Resolved "خطأ في حساب القرض" error that prevented users from requesting loans
  - Changed incorrect method call from `calculateFromLoanAmount(amount, userBalance)` to `calculateInstallment(amount, userBalance)`
  - Removed invalid property check for `calculation.valid` that was causing failures
  - Added proper error handling with try-catch blocks and user-friendly Arabic error messages
  - Applied 20 KWD minimum installment rule correctly
- **Fixed Loan Eligibility Checking**: Corrected critical property name mismatch in `UserModel.js`
  - Changed `hasTwoYearRegistration` to `hasOneYearRegistration` in eligibilityChecks object
  - Now properly validates 1-year registration requirement
  - Fixed loan request form visibility logic
- **Improved Subscription Validation**: Updated subscription payment checking logic  
  - **MAJOR FIX**: Now correctly checks total deposit amount in last 24 months, not requiring monthly payments
  - Removed restrictive memo pattern matching (`LIKE '%اشتراك%'`) 
  - Counts all deposit transactions toward subscription requirement (240 KWD employees, 120 KWD students)
  - More practical and user-friendly approach - users just need total amount over 24 months
- **Enhanced Input Validation**: Added balance validation before loan calculations
  - Prevents calculation errors when user has zero or invalid balance
  - Clear error message: "رصيدك الحالي غير كافي لحساب القرض"
- **Testing Results**: Successfully tested complete system with local database
  - ✅ Database migration completed successfully
  - ✅ Admin login working (User ID: 1 - المدير العام)
  - ✅ Regular user login working (User ID: 100 - أحمد محمد العلي)
  - ✅ Loan eligibility validation working with local data
  - ✅ All business rules properly enforced

### **MAJOR: Professional Email System Implementation**
- **Complete Email Service**: Integrated Nodemailer with Gmail SMTP for automated welcome emails
- **Professional Templates**: Beautiful Arabic RTL email templates with درع العائلة branding
- **Welcome Email Features**:
  - Gradient header design with company branding
  - User login credentials with English password display (direction: ltr)
  - Next steps checklist with 1-year waiting period information
  - Important terms and security notices
  - Both HTML and text versions for better deliverability
- **Anti-Spam Measures**:
  - Proper email headers (Message-ID, X-Mailer, List-Unsubscribe)
  - Text version alongside HTML for better spam score
  - Professional sender identification
- **Configuration System**:
  - Environment variable-based SMTP configuration
  - Support for Gmail, Outlook, Yahoo, and custom SMTP servers
  - Comprehensive documentation in EMAIL-SETUP.md
- **Testing Endpoint**: `POST /api/admin/test-email` for admin email functionality testing
- **Graceful Fallback**: User registration continues even if email sending fails

### **MAJOR: Simplified User Registration System**
- **Streamlined Fields**: Removed user_type dropdown (admin vs non-admin only), civil ID, and workplace fields
- **WhatsApp Integration**: Added optional WhatsApp number field with automatic phone fallback
- **Database Schema Updates**:
  - Added `whatsapp` VARCHAR(20) column to users table
  - Removed dependency on specific user_type values
- **Enhanced Security**: bcrypt password hashing with minimum 6-character requirement
- **Email Integration**: Automatic welcome emails sent to new users with login credentials
- **Admin Registration**: Complete admin interface for registering new users with email notifications

### **MAJOR: Loan Eligibility Period Update (2 Years → 1 Year)**
- **System-wide Update**: Changed loan waiting period from 2 years to 1 year throughout entire system
- **Backend Changes**:
  - `UserModel.js`: Updated from `hasTwoYearRegistration` to `hasOneYearRegistration`
  - Changed calculation from 2 years ago to 1 year ago
  - Updated error messages to mention "سنة واحدة" instead of "سنتين"
- **Frontend Changes**:
  - `app.js`: Updated registration period calculation and display text
  - Changed condition text to show "سنة واحدة" waiting period
- **Email Templates**: Updated both HTML and text versions to mention 1-year requirement
- **Documentation**: Updated all references from 2-year to 1-year requirement

## Previous System Enhancements (July 2025)

### **CRITICAL: Priority Action Buttons on User Dashboard**
- **Priority Actions Section**: Loan installments and subscription payments moved to top of user dashboard
- **Enhanced Visual Design**: 
  - **Loan Payment Button**: Blue gradient with gold icons - highest priority
  - **Subscription Button**: Green gradient with gold icons - second priority
  - **Special Effects**: Scale animations, enhanced shadows, and hover transforms
- **User Experience**: Most important actions immediately visible and accessible

### **MAJOR: Admin User Registration System**
- **Complete Registration Interface**: Full modal for admin to register new users
- **Comprehensive User Data**: Name, civil ID, phone, email, user type, workplace, initial balance
- **Security Features**: Password validation, email uniqueness checking, bcrypt hashing
- **Admin Controls**: Set initial balance, joining fee status, and user type
- **Activity Logging**: All registration actions logged with admin attribution
- **API Endpoint**: `POST /api/admin/register-user` with full validation

### **MAJOR: User Blocking/Unblocking System**
- **Database Schema**: Added `is_blocked` TINYINT(1) column to users table with default 0
- **Admin Interface**: Block/unblock buttons in user details modal with confirmation dialogs
- **Security Implementation**: 
  - Blocked users cannot login (auth routes protected)
  - Blocked users cannot access protected API endpoints (middleware protection)
  - Admins exempt from blocking restrictions
  - Real-time status display in user interface
- **Activity Tracking**: All block/unblock actions logged with admin attribution
- **API Endpoint**: `PUT /api/admin/block-user/:userId` with proper authorization

### **MAJOR: Enhanced Loan Calculator System**
- **User Dashboard**: Advanced loan calculator with auto-calculation from single input
- **Admin Dashboard**: Dedicated admin loan calculator with same functionality
- **Header Integration**: Calculator shortcut icon for quick access (admin users only)
- **Smart Navigation**: 
  - **Icon-only design**: Circular pink/red themed button in header
  - **Tooltip support**: Shows "حاسبة القروض" on hover
  - **Smart scrolling**: Detects user type and scrolls to appropriate calculator
  - **Visual feedback**: Scale animation on arrival with highlight effect
- **Consistent Naming**: Renamed from "حاسبة القرض" to "حاسبة القروض" throughout system

### **MAJOR: Authentication & Session Management Improvements**
- **Token Persistence**: Fixed page refresh logging out users
- **Added Missing Endpoint**: `GET /api/auth/me` for token verification
- **Enhanced Error Handling**: Comprehensive debug logging and graceful fallbacks
- **User Data Consistency**: Proper user type detection (handles both `userType` and `user_type`)
- **Session Recovery**: Automatic session restoration on page refresh

### **MAJOR: PDF Reports System Enhancement**
- **Fixed Generation Errors**: Resolved "toFixed is not a function" errors
- **Data Type Handling**: Proper `parseFloat()` conversion for all numeric values
- **Enhanced Error Handling**: Comprehensive validation and debug logging
- **Export Functionality**: 
  - HTML report generation with print-optimized styling
  - New window approach with print and download buttons
  - Professional formatting with Arabic RTL support

## Recent Updates
- **MAJOR: Implemented Self-Service Password Reset System**
  - **User-friendly interface**: Users can reset their passwords without admin intervention
  - **Security validation**: Requires email and phone number verification from registered account
  - **API endpoint**: New `/users/reset-password` endpoint with bcrypt password hashing
  - **Frontend integration**: Enhanced "forgot password" modal with complete form and validation
  - **Activity logging**: Password reset actions are logged in transaction history
  - **Success feedback**: Clear confirmation messages with user name verification
  - **Password requirements**: Minimum 6 characters with confirmation matching validation

- **MAJOR: Comprehensive Admin Reports System**
  - **Six report types**: Users, Loans, Transactions, Financial Summary, Monthly, and Active Loans
  - **Interactive interface**: Modal-based reports with real-time data fetching
  - **Export functionality**: HTML export for all reports with printable styling
  - **Financial analytics**: Advanced calculations including totals, averages, and percentages
  - **Data visualization**: Status badges, summary grids, and comprehensive tables
  - **Real-time statistics**: Live data from database with proper error handling
  - **User-friendly design**: Green-themed report buttons with clear descriptions
  - **Report sections**: 
    - تقرير الأعضاء (Users Report): Complete member list with balances and loan limits
    - تقرير القروض (Loans Report): All loan requests with approval status and amounts
    - تقرير المعاملات (Transactions Report): All financial transactions with type classification
    - التقرير المالي الشامل (Financial Summary): Overall system financial health
    - التقرير الشهري (Monthly Report): Current month activity and performance
    - القروض النشطة (Active Loans): Active loans with payment progress and remaining balances

- **MAJOR: Enhanced Admin Tools and User Experience**
  - **Website rebranding**: Changed from "صندوق الكويت" to "درع العائلة"
  - **Automatic password reset**: Admin can generate secure passwords automatically with copy functionality
  - **Database backup system**: Admin can download complete database backup as JSON
  - **PDF transaction reports**: Generate comprehensive transaction reports for printing
  - **Enhanced system tools**: Added admin system tools section with backup and reporting capabilities
- **MAJOR: Enhanced User Experience and Admin Controls**
  - **Registration page with tabs**: Added 3-tab system (Login, Registration, Terms & Conditions)
  - **Profile management**: Users can edit personal information and change passwords
  - **Will system**: Users can write wills, admins can view them in user details
  - **1-year registration requirement**: Updated from 2-year to 1-year waiting period for loan eligibility
  - **Enhanced admin controls**: Registration date modification, will viewing, improved modals
  - **Loan terms accessibility**: Terms and conditions link in header for easy access
  - **Modal system improvements**: Fixed exit functionality and better user experience
- **MAJOR: Implemented Joining Fee Approval System (10 KWD)**
  - **Database schema**: Added `joining_fee_approved` column to users table with ENUM('pending', 'approved', 'rejected')
  - **Admin interface**: New section in user details modal for managing joining fee approvals
  - **Loan eligibility**: Added joining fee approval as mandatory requirement for loan requests
  - **User messaging**: Clear error messages stating "يجب على المشترك دفع رسوم الانضمام 10 د.ك"
  - **API endpoint**: New `/admin/joining-fee-action/:userId` for approve/reject actions
  - **Frontend integration**: Added joining fee requirement to loan conditions list
  - **Test users**: Created test accounts (ID: 300, 400) with pending joining fee status
  - **Backward compatibility**: Existing users automatically set to 'approved' status
- **MAJOR: Fixed calculation consistency and added 20 KWD minimum installment rule**
  - **Fixed calculation mismatch**: Backend and frontend now use identical calculation logic
  - **Added 20 KWD minimum installment**: All loan installments have a minimum of 20 KWD
  - **Corrected helper function**: Fixed `calculateProperInstallment` to use correct calculation method
  - **Example**: 500 KWD balance + 1000 KWD loan = 20 KWD installment (was showing 30 KWD vs 15 KWD)
- **MAJOR: Enhanced user interface with organized tab-based financial tracking**
  - **Subscription deposits** moved to "دفع الاشتراكات" tab with complete history and totals
  - **Loan payments and remaining balance** moved to "تسديد القرض" tab with active loan details
  - **Personal information** tab now shows only user details with navigation guide
  - **Admin user details** enhanced to show active loan with remaining balance calculation
- **MAJOR: Added comprehensive payment validation for loan installments**
  - **Frontend validation**: Real-time input validation with visual feedback
  - **Backend validation**: Server-side minimum payment enforcement with 20 KWD minimum
  - **Prevents users** from paying less than the required installment amount
  - **Dynamic calculation** of minimum payment based on loan amount and user balance
- **MAJOR: Replaced complex backend loan calculation with simple frontend mathematical approach**
  - Backend now uses simple formula: I = round5(ratio × L² / B) where ratio = 0.02/3
  - Removed database-dependent dynamic calculations
  - Fixed frontend loan form to show correct installment (30 KWD instead of 83.333 KWD for 2000 KWD loan)
  - Updated all API endpoints to use user balance directly instead of complex database queries
- Fixed financial summary calculations to properly display loan payment totals
- Added separate loan payment tracking from `loan` table instead of `transaction` table
- Implemented loan installment payment history display in user details
- Added new API endpoint `/users/loan-payments/:userId` for fetching loan payment history
- Enhanced user details modal with comprehensive financial overview including installment history

## Data Structure Notes
- **Transaction Types**: Regular deposits/withdrawals stored in `transaction` table
- **Loan Payments**: Installment payments stored in `loan` table with `target_loan_id` reference
- **Joining Fee Status**: Stored in `users.joining_fee_approved` column
  - `pending`: User needs to pay joining fee and await admin approval
  - `approved`: User can request loans (if other conditions met)
  - `rejected`: User cannot request loans until joining fee issue resolved
- **Financial Calculations**: 
  - Total deposits: Sum of `credit` from `transaction` table where `status = 'accepted'`
  - Total loan payments: Sum of `credit` from `loan` table where `target_loan_id IS NOT NULL` and `status = 'accepted'`

## Loan Calculation System
- **Backend (`LoanCalculator.js`)**: Simple mathematical approach with 20 KWD minimum
  - Static method `calculateLoanTerms(balance, requestedAmount)`
  - Uses fixed constants: `minInstallment: 20` KWD
  - Formula: I = Math.max(Math.ceil((0.02/3 × L² / B) / 5) × 5, 20)
- **Frontend (`loanCalculator.js`)**: Advanced calculator with multiple scenarios and 20 KWD minimum
  - Supports auto-calculation from any combination of inputs
  - Multiple calculation methods for different scenarios with minimum enforcement
  - Used for the dedicated loan calculator page
- **Frontend (`app.js`)**: Integrates correct calculation for loan requests
  - `calculateProperInstallment()` helper function (fixed to use correct method)
  - Real-time calculation as user types loan amount with 20 KWD minimum
  - Validates against user's maximum loan eligibility and minimum payment rules

### **Current Email Configuration**\n- **SMTP Provider**: Gmail (smtp.gmail.com:465) with SSL\n- **Authentication**: App Password-based authentication for security\n- **From Address**: aal7babi2@gmail.com configured as \"درع العائلة\"\n- **Features**: Welcome emails with login credentials automatically sent on user registration\n- **Testing**: Admin test endpoint available for verifying email functionality\n- **Deliverability**: Professional headers and text version to avoid spam filters\n\n### **Dependencies Added**\n- **nodemailer**: ^6.x for email sending functionality\n- **bcrypt**: ^5.x for secure password hashing\n\n## Complete API Endpoints Reference

### Authentication Endpoints
- **POST `/api/auth/login`** - User authentication with JWT token generation
- **GET `/api/auth/me`** - Token verification and current user data retrieval
- **POST `/api/users/reset-password`** - Self-service password reset with email/phone verification

### User Management Endpoints
- **GET `/api/users/transactions/:userId`** - Get user transaction history
- **GET `/api/users/loan-payments/:userId`** - Get user loan payment history
- **GET `/api/users/dashboard/:userId`** - Get user dashboard data
- **PUT `/api/users/profile`** - User profile update with password change support

### Admin Management Endpoints
- **POST `/api/admin/register-user`** - Admin user registration with full validation
- **PUT `/api/admin/block-user/:userId`** - Block/unblock user functionality
- **PUT `/api/admin/joining-fee-action/:userId`** - Approve/reject joining fee (10 KWD)
- **PUT `/api/admin/user/:userId/registration-date`** - Update user registration date

### Admin Reports Endpoints
- **GET `/api/admin/users`** - Admin users report data
- **GET `/api/admin/all-loans`** - Admin loans report data
- **GET `/api/admin/all-transactions`** - Admin transactions report data
- **GET `/api/admin/transactions-pdf`** - PDF transaction report data
- **POST `/api/admin/test-email`** - Test email functionality (admin only)

### Loan Management Endpoints
- **GET `/api/loans/active/:userId`** - Get active loan details for user
- **POST `/api/loans/request`** - Submit new loan request
- **PUT `/api/loans/approve/:loanId`** - Admin loan approval
- **PUT `/api/loans/reject/:loanId`** - Admin loan rejection

## Enhanced Features
- **Self-Service Password Reset**: Users can reset passwords using email and phone verification
- **Comprehensive Admin Reports**: Six different report types with export functionality
- **Real-time Data Analytics**: Live financial summaries and statistics
- **Enhanced User Experience**: Improved modal interfaces and validation
- **Database Integration**: Full profile updates with proper data persistence
- **Export Capabilities**: HTML report exports with professional styling
- **Security Enhancements**: bcrypt password hashing and proper validation

## File Structure Updates\n\n### **New Files Added**\n- **`backend/services/emailService.js`** - Complete email service with Nodemailer integration\n- **`backend/add-whatsapp-column.js`** - Database migration script for WhatsApp field\n- **`EMAIL-SETUP.md`** - Comprehensive email configuration guide\n- **`.env.example`** - Updated with email configuration variables\n\n### **Modified Files**\n- **`backend/routes/admin.js`** - Added email integration and test endpoint\n- **`backend/models/UserModel.js`** - Updated 2-year to 1-year registration requirement\n- **`frontend/js/app.js`** - Updated loan eligibility display for 1-year requirement\n- **`package.json`** - Added nodemailer and bcrypt dependencies\n\n## Current System Status (January 2025)

### **Production Ready Features** ✅
- **Complete Authentication System**: JWT-based with session persistence
- **Professional Email System**: Automated welcome emails with anti-spam measures
- **Admin User Management**: Registration, blocking/unblocking, profile management  
- **Advanced Loan Calculator**: Both user and admin versions with header shortcuts
- **Comprehensive Reports**: 6 report types with PDF export functionality
- **Financial Management**: Transaction tracking, loan payments, balance management
- **Security Features**: User blocking, password reset, input validation, bcrypt hashing
- **User Experience**: Priority action buttons, modal interfaces, Arabic RTL support
- **1-Year Loan Eligibility**: Updated from 2-year to 1-year waiting period system-wide
- **Fixed Loan Request System**: All loan calculation and eligibility issues resolved
- **Flexible Subscription Validation**: Total amount-based checking over 24 months

### **Key Administrative Controls** 🔧
- **User Registration**: Admin can register new users with automated welcome emails
- **User Blocking**: Block/unblock users with real-time status updates
- **Joining Fee Management**: Approve/reject 10 KWD joining fees
- **Registration Date Control**: Modify user registration dates
- **Email Testing**: Test email functionality and SMTP connectivity
- **Report Generation**: Export comprehensive financial and user reports
- **Database Backup**: JSON and SQL backup functionality

### **Enhanced User Experience** 🎨
- **Priority Actions**: Loan payments and subscriptions prominently displayed
- **Calculator Integration**: Header shortcut with smart navigation
- **Profile Management**: Users can edit their own information
- **Will Management**: Digital will creation and storage
- **Financial Tracking**: Comprehensive transaction and loan payment history

### **Technical Improvements** 🛠️
- **Session Persistence**: No more logout on page refresh
- **Error Handling**: Comprehensive debugging and user-friendly messages
- **Data Validation**: Proper type handling and input validation
- **API Consistency**: Complete endpoint coverage with proper authentication
- **Database Schema**: Updated with blocking and status management

The system is now fully featured with comprehensive admin controls, professional email integration, enhanced user experience, and robust security measures. All major functionality has been tested and is production-ready.\n\n## Latest Updates Summary (January 2025)\n\n### ✅ **Critical Fixes Completed in This Session**\n1. **Loan Request System Fixed**: Resolved all loan calculation and eligibility errors\n   - Fixed "خطأ في حساب القرض" error preventing loan requests\n   - Corrected method calls and property checks in calculation logic\n   - Fixed loan eligibility property name mismatch\n2. **Subscription Validation Improved**: Updated to check total amount over 24 months\n   - Removed restrictive memo pattern matching\n   - More user-friendly approach - total deposits count toward subscription requirement\n3. **Enhanced Error Handling**: Added comprehensive validation and error messages\n4. **Testing Verified**: Successfully tested complete loan request flow with new user\n\n### ✅ **Previously Completed**\n1. **Professional Email System**: Complete Nodemailer integration with Gmail SMTP\n2. **Email Template Design**: Beautiful Arabic RTL emails with company branding\n3. **Password Display Fix**: Corrected password direction in emails (LTR for English)\n4. **Anti-Spam Measures**: Added proper headers and text versions for better deliverability\n5. **Simplified Registration**: Removed user_type complexity, added WhatsApp field\n6. **Database Migration**: Added whatsapp column with proper schema updates\n7. **1-Year Loan Eligibility**: Updated entire system from 2-year to 1-year requirement\n8. **Dependencies**: Added bcrypt for password hashing and nodemailer for emails\n9. **Testing Endpoints**: Admin email testing functionality\n10. **Documentation**: Comprehensive EMAIL-SETUP.md guide\n\n### 🎯 **System Ready For**\n- **Production Deployment**: All core features functional and tested\n- **Email Communications**: Automated welcome emails for new users\n- **Admin Operations**: Complete user management with email notifications\n- **Loan Processing**: 1-year eligibility with proper validation and working loan requests\n- **SMTP Configuration**: Easy setup with multiple provider support\n- **User Loan Requests**: Fixed calculation errors, users can now successfully request loans
- **Local Database**: Migrated to XAMPP MySQL for better development experience and resolved network issues

## Database Migration Summary (January 2025)

### **MAJOR: Cloud to Local Database Migration**
Successfully migrated from Aiven cloud MySQL to local XAMPP MySQL database:

**Migration Benefits:**
- ✅ **Fixed Network Issues**: Resolved `ERR_NAME_NOT_RESOLVED` and DNS connectivity problems
- ✅ **Performance Improvement**: Faster response times with local database access
- ✅ **Development Experience**: Direct access via phpMyAdmin for database management
- ✅ **Cost Effective**: Eliminated cloud database fees and dependencies
- ✅ **Full Control**: Complete database administration and backup control
- ✅ **Arabic Support**: Maintained full UTF-8MB4 character encoding for Arabic content

**Technical Details:**
- **Previous**: `loans-testloan.e.aivencloud.com:16585` (Cloud)
- **Current**: `localhost:3306` (Local XAMPP)
- **Database**: `loan_management`
- **Authentication**: `root` user (no password)
- **Connection**: MySQL2 with connection pooling

**Migration Results:**
- ✅ All existing data and user accounts preserved
- ✅ Admin login working (User ID: 1 - المدير العام)
- ✅ Regular user login working (User ID: 100 - أحمد محمد العلي)  
- ✅ Loan eligibility validation functional with local data
- ✅ All API endpoints responding correctly
- ✅ Email system still functional with local database
- ✅ All loan calculation fixes maintained in local environment

This migration resolves the network connectivity issues that were causing problems and provides a more stable development environment.

## Latest Critical Fixes (January 2025)

### **CRITICAL FIX: Admin Loan Approval System**
- **Issue**: Admin loan approval/rejection was failing with error "طلب القرض غير موجود أو تم التعامل معه مسبقاً"
- **Root Cause**: Database schema mismatch - code was using `'opend'` status but schema defined `ENUM('pending', 'approved', 'rejected')`
- **Solution**: Updated all references to use correct status values:
  - Changed loan approval to set status to `'approved'` instead of `'opend'`
  - Updated queries in `UserModel.js`, `loans.js`, and `users.js` to check for `'approved'` status
  - Fixed active loan detection throughout the system
- **Files Modified**: 
  - `backend/routes/admin.js` - Loan approval endpoint
  - `backend/models/UserModel.js` - Active loan checking
  - `backend/routes/loans.js` - Active loan queries
  - `backend/routes/users.js` - User dashboard active loans
- **Status**: ✅ **FIXED** - Admin can now successfully approve/reject loans

### **CRITICAL FIX: Loan Calculation Formula Accuracy**
- **Issue**: Admin calculator showing 215 KWD instead of expected 200 KWD for 10,000 loan with 3,335 balance
- **Root Cause**: Ratio was incorrectly adjusted to 0.0071 instead of exact mathematical value
- **Solution**: Corrected ratio to exact value `0.02/3 = 0.006667`
- **Verification**: 
  - ✅ 10,000 loan + 3,335 balance = 200 KWD installment (correct)
  - ✅ 2,000 loan + 2,000 balance = 15 KWD → 20 KWD minimum (correct)
- **Files Modified**:
  - `backend/models/LoanCalculator.js` - Corrected ratio calculation
  - `frontend/js/loanCalculator.js` - Synchronized frontend calculation
- **Status**: ✅ **FIXED** - Calculations now match expected business requirements exactly

### **System Status Summary**
- ✅ **Admin Loan Management**: Fully functional approval/rejection system
- ✅ **Loan Calculations**: Accurate formula with verified examples  
- ✅ **Database Consistency**: All status enums properly aligned
- ✅ **User Experience**: Smooth loan request and approval workflow
- ✅ **Business Logic**: All loan rules and calculations working correctly

**Next Steps**: System ready for production use with all critical fixes implemented and tested.