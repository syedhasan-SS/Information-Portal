-- Fix the "atta" user's corrupted role data
-- Run this directly in your database console

-- First, let's see the current state
SELECT id, email, name, role, roles
FROM users
WHERE email LIKE '%atta%';

-- Update atta's role to match what you want (change 'Admin' to desired role)
-- This sets both role and roles to Admin
UPDATE users
SET
  role = 'Admin',
  roles = ARRAY['Admin'],
  updated_at = NOW()
WHERE email LIKE '%atta%';

-- Verify the fix
SELECT id, email, name, role, roles
FROM users
WHERE email LIKE '%atta%';

-- If atta should have multiple roles (e.g., Admin + Associate), use this instead:
-- UPDATE users
-- SET
--   role = 'Admin',
--   roles = ARRAY['Admin', 'Associate'],
--   updated_at = NOW()
-- WHERE email LIKE '%atta%';
