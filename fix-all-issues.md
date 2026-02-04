# Comprehensive Fix for All 5 Issues

## Issue Analysis:

### 1. Ticket Configuration Not Visible
- **Root Cause**: Admin role has `view:config` but Labs dropdown checks for it
- **Status**: Actually fixed already, just needs refresh/logout

### 2. Cannot Edit Permissions in Roles Page
- **Root Cause**: Admin role missing `edit:roles`, `create:roles`, `edit:config` permissions
- **Fix**: Add these permissions to Admin role

### 3. Cannot Manage Users from Hierarchy
- **Root Cause**: Org hierarchy page doesn't have click handlers to edit users
- **Fix**: Add click handlers to navigate to user edit

### 4. No Reportees Bulk Assignment
- **Root Cause**: Only "Reports To" exists, no reverse relationship UI
- **Fix**: Add reportees selector in user management

### 5. Reports To Dropdown Not Searchable
- **Root Cause**: Using basic Select component without search
- **Fix**: Implement Combobox with search functionality

## Permissions to Add to Admin Role:
- edit:roles
- create:roles
- edit:users
- create:users
- delete:users
- edit:vendors
- create:vendors
- delete:vendors
