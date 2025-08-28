#!/bin/bash

# Extract only the user insertion part from the complete script
sed -n '/-- 5. Import all 112 regular users/,/-- 6. Create joining fee transactions/p' /root/Loan-Management-System/corrected_complete_import.sql | head -n -2 > /root/Loan-Management-System/users_extract.sql

echo "Extracted user insertions to users_extract.sql"