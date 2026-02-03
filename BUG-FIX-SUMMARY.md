# Bug Fix: Role Assignment Not Working Properly

## Problem Description
When changing a user's roles from:
- **First**: Associate (single role)
- **Then**: Admin (primary) + Associate (secondary)

The role assignment was not updating correctly, and Admin permissions were not showing.

## Root Cause
The user schema has **two fields** for roles:
1. `role` (text) - Singular, primary role field (legacy)
2. `roles` (text[]) - Array of roles for multi-role support

The frontend was updating the `roles` array but **NOT** updating the `role` field. This caused the permission calculation logic to use stale data from the `role` field.

## Files Modified

### 1. `/server/routes.ts`
Fixed three endpoints to sync the `role` field when `roles` array is updated:

#### POST /api/users (Create User)
- Added logic to set `role = roles[0]` when creating users with multiple roles

#### PATCH /api/users/:id (Update User)
- Added logic to set `role = roles[0]` when updating user roles

#### PUT /api/users/:id (Full Update User)
- Added logic to set `role = roles[0]` when replacing user data

### 2. Database Fix Script
Created `/fix-user-roles.sql` to fix existing users with corrupted data

## How the Fix Works

```typescript
// When updating user roles
const updates = { ...req.body };

if (updates.roles && Array.isArray(updates.roles) && updates.roles.length > 0) {
  updates.role = updates.roles[0]; // Sync primary role with first role in array
}

await storage.updateUser(req.params.id, updates);
```

## Testing Steps

### 1. Fix Existing Data (Run Once)
```bash
# Connect to your database
psql <your-database-url>

# Run the fix script
\i fix-user-roles.sql
```

### 2. Test Role Assignment
1. **Login as Owner/Admin**
2. **Go to User Management**
3. **Edit user "atta"**:
   - Set Primary Role: **Admin**
   - Set Secondary Roles: **Associate**
   - Click Save
4. **Logout and login as "atta"**
5. **Verify**:
   - ✅ Can see "All Tickets" (Admin permission)
   - ✅ Can access User Management (Admin permission)
   - ✅ Can access Roles Management (Admin permission)
   - ❌ CANNOT delete users/roles (Admin restriction)

### 3. Test Multiple Role Changes
1. **Change atta from Admin+Associate to just Associate**
   - Should lose Admin permissions
   - Should only see assigned tickets
2. **Change back to Admin+Associate**
   - Should regain Admin permissions
   - Should see all tickets again

## Permission Calculation Logic
From `/server/storage.ts:1250`:
```typescript
const userRoleNames = user.roles && user.roles.length > 0
  ? user.roles   // Use roles array if it exists
  : [user.role]; // Fallback to singular role field
```

With this fix, both fields are always in sync, so permissions are calculated correctly.

## UAT Test Case

Add this to your UAT test sheet:

| Test ID | Feature | Test Scenario | Steps | Expected Result | Status |
|---------|---------|---------------|-------|-----------------|--------|
| BUG-001 | Users | Change user roles | 1. Edit user "atta"<br>2. Change from Associate to Admin+Associate<br>3. Save<br>4. Login as atta | Admin permissions visible (All Tickets, User Mgmt, Roles) | ⬜ |
| BUG-002 | Users | Remove secondary role | 1. Edit user "atta"<br>2. Change from Admin+Associate to just Associate<br>3. Save<br>4. Login as atta | Only Associate permissions (My Tickets only) | ⬜ |
| BUG-003 | Users | Multiple role changes | 1. Edit user<br>2. Change role multiple times<br>3. Verify after each change | Permissions update correctly each time | ⬜ |

## Restart Required
After applying the code changes:
```bash
# Restart the server
npm run dev
```

## Status
- ✅ Code fixed in server/routes.ts
- ✅ Database migration script created
- ⬜ Database migration needs to be run
- ⬜ Server needs restart
- ⬜ Testing needed

## Questions?
If the issue persists after:
1. Running the SQL fix script
2. Restarting the server
3. Clearing browser cache

Then check:
- Database logs for any errors
- Browser DevTools Network tab for API responses
- Console logs for any errors
