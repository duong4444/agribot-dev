-- Migration script to consolidate SUPER_ADMIN role into ADMIN
-- Run this script to update existing database records

-- Update all users with SUPER_ADMIN role to ADMIN
UPDATE users 
SET role = 'ADMIN' 
WHERE role = 'SUPER_ADMIN';

-- Verify the migration
SELECT COUNT(*) as admin_users 
FROM users 
WHERE role = 'ADMIN';

SELECT COUNT(*) as farmer_users 
FROM users 
WHERE role = 'FARMER';

-- Should return 0
SELECT COUNT(*) as remaining_super_admin 
FROM users 
WHERE role = 'SUPER_ADMIN';
