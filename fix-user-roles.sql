-- Fix for existing users with mismatched role/roles fields
-- This script syncs the singular 'role' field with the first role in the 'roles' array

-- Fix specific user "atta" (if needed)
-- UPDATE users
-- SET role = roles[1]
-- WHERE email LIKE '%atta%'
--   AND roles IS NOT NULL
--   AND array_length(roles, 1) > 0;

-- Fix ALL users where roles array exists but role field doesn't match
UPDATE users
SET role = roles[1]
WHERE roles IS NOT NULL
  AND array_length(roles, 1) > 0
  AND role != roles[1];

-- Verify the fix
SELECT id, email, name, role, roles
FROM users
WHERE roles IS NOT NULL
  AND array_length(roles, 1) > 0;
