-- Production Database Setup for درع العائلة Loan Management System
-- Created: July 2025
-- Contains: Complete schema + 2 admins + 5 test users (clean state)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create database
CREATE DATABASE IF NOT EXISTS `family1_loan_management` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `family1_loan_management`;

-- =====================================================
-- TABLE STRUCTURE
-- =====================================================

-- Users table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `Aname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full name in Arabic',
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'bcrypt hashed password',
  `workplace` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `user_type` enum('employee','admin') NOT NULL DEFAULT 'employee' COMMENT 'عضو أو إداري',
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Current account balance',
  `registration_date` date NOT NULL,
  `joining_fee_approved` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Account blocking status',
  `will_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Will/inheritance content',
  `approved_by_admin_id` int DEFAULT NULL COMMENT 'Admin who approved joining fee',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_joining_fee_approved` (`joining_fee_approved`),
  KEY `idx_is_blocked` (`is_blocked`),
  KEY `fk_approved_by_admin` (`approved_by_admin_id`),
  CONSTRAINT `fk_approved_by_admin` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Requested loan table
DROP TABLE IF EXISTS `requested_loan`;
CREATE TABLE `requested_loan` (
  `loan_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `loan_amount` decimal(10,2) NOT NULL,
  `installment_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `request_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_date` timestamp NULL DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `loan_closed_date` datetime DEFAULT NULL COMMENT 'When loan is fully paid',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`loan_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_loan_closed_date` (`loan_closed_date`),
  KEY `idx_user_loan_closure` (`user_id`,`loan_closed_date`),
  CONSTRAINT `fk_requested_loan_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_requested_loan_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan payments table
DROP TABLE IF EXISTS `loan`;
CREATE TABLE `loan` (
  `loan_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_loan_id` int NOT NULL COMMENT 'FK to requested_loan',
  `credit` decimal(10,2) NOT NULL COMMENT 'Payment amount',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment description',
  `status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`loan_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_target_loan_id` (`target_loan_id`),
  KEY `idx_status` (`status`),
  KEY `idx_admin_id` (`admin_id`),
  CONSTRAINT `fk_loan_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_loan_target` FOREIGN KEY (`target_loan_id`) REFERENCES `requested_loan` (`loan_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loan_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction table
DROP TABLE IF EXISTS `transaction`;
CREATE TABLE `transaction` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `debit` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Amount debited',
  `credit` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Amount credited',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `transaction_type` enum('deposit','withdrawal','subscription','joining_fee') NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_date` (`date`),
  CONSTRAINT `fk_transaction_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attribute table (System Configuration)
DROP TABLE IF EXISTS `attribute`;
CREATE TABLE `attribute` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attribute_name` varchar(100) NOT NULL,
  `attribute_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attribute_name` (`attribute_name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TEST DATA INSERTION
-- =====================================================

-- System Configuration
INSERT INTO `attribute` (`attribute_name`, `attribute_value`, `description`) VALUES
('system_name', 'درع العائلة', 'System name in Arabic'),
('minimum_balance', '500', 'Minimum balance required for loan eligibility'),
('minimum_subscription', '240', 'Minimum subscription amount required in 24 months'),
('loan_formula_rate', '0.006667', 'Loan calculation rate (2% annually / 12 months / 25)'),
('maximum_loan_multiplier', '3', 'Maximum loan as multiple of balance'),
('maximum_loan_amount', '10000', 'Maximum loan amount in KWD'),
('minimum_installment', '20', 'Minimum installment amount in KWD'),
('minimum_loan_period', '6', 'Minimum loan period in months');

-- Insert 2 Admin Users (password: 123456)
-- bcrypt hash for '123456': $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO `users` (`user_id`, `Aname`, `phone`, `email`, `password`, `workplace`, `whatsapp`, `user_type`, `balance`, `registration_date`, `joining_fee_approved`, `is_blocked`, `approved_by_admin_id`) VALUES
(1001, 'أحمد المدير', '+96599123456', 'admin1@daraalfamily.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'إدارة النظام', '+96599123456', 'admin', 0.00, '2024-01-01', 'approved', 0, NULL),
(1002, 'سارة المساعدة', '+96599654321', 'admin2@daraalfamily.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'إدارة النظام', '+96599654321', 'admin', 0.00, '2024-01-01', 'approved', 0, NULL);

-- Insert 5 Test Users (password: 123456, no transactions)
INSERT INTO `users` (`user_id`, `Aname`, `phone`, `email`, `password`, `workplace`, `whatsapp`, `user_type`, `balance`, `registration_date`, `joining_fee_approved`, `is_blocked`, `approved_by_admin_id`) VALUES
(2001, 'محمد التجريبي', '+96599111111', 'mohammed@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'شركة الاختبار', '+96599111111', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
(2002, 'فاطمة النشطة', '+96599222222', 'fatima@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'مؤسسة التطوير', '+96599222222', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
(2003, 'عمر المعلق', '+96599333333', 'omar@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'الشركة الجديدة', '+96599333333', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
(2004, 'ليلى المحجوبة', '+96599444444', 'layla@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'المؤسسة القديمة', '+96599444444', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL),
(2005, 'خالد الجديد', '+96599555555', 'khalid@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'شركة الإنشاءات', '+96599555555', 'employee', 0.00, '2025-07-31', 'pending', 0, NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- DATABASE SUMMARY
-- =====================================================
/*
USERS CREATED:
Admin Users (Password: 123456):
- ID 1001: أحمد المدير (admin1@daraalfamily.com)
- ID 1002: سارة المساعدة (admin2@daraalfamily.com)

Test Users (Password: 123456, Clean State):
- ID 2001: محمد التجريبي (mohammed@test.com)
- ID 2002: فاطمة النشطة (fatima@test.com)
- ID 2003: عمر المعلق (omar@test.com)
- ID 2004: ليلى المحجوبة (layla@test.com)
- ID 2005: خالد الجديد (khalid@test.com)

All users have:
- Password: 123456
- Balance: 0.00 KWD
- Registration date: Today (2025-07-31)
- Joining fee status: Pending
- No transactions, loans, or payment history

This database is ready for clean production testing.
*/