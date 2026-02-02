# User Acceptance Test Cases - Information Portal

## Document Information
- **Version:** 1.0
- **Last Updated:** 2026-02-02
- **Author:** System Documentation

---

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [Dashboard](#2-dashboard)
3. [Ticket Management](#3-ticket-management)
4. [User Management](#4-user-management)
5. [Vendor Management](#5-vendor-management)
6. [Roles & Permissions Management](#6-roles--permissions-management)
7. [Analytics](#7-analytics)
8. [Ticket Configuration](#8-ticket-configuration)
9. [Navigation & UI](#9-navigation--ui)

---

## 1. Authentication & Authorization

### UAT-AUTH-001: User Login
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-001 |
| **Title** | Verify user can login with valid credentials |
| **Preconditions** | User account exists in the system |
| **Test Steps** | 1. Navigate to login page (/)<br>2. Enter valid email<br>3. Click Login/Submit |
| **Expected Result** | User is redirected to /dashboard |
| **Priority** | High |

### UAT-AUTH-002: Invalid Login Attempt
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-002 |
| **Title** | Verify system rejects invalid credentials |
| **Preconditions** | None |
| **Test Steps** | 1. Navigate to login page<br>2. Enter invalid/non-existent email<br>3. Click Login |
| **Expected Result** | Error message displayed, user remains on login page |
| **Priority** | High |

### UAT-AUTH-003: Session Persistence
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-003 |
| **Title** | Verify user session persists across page refresh |
| **Preconditions** | User is logged in |
| **Test Steps** | 1. Login successfully<br>2. Refresh the browser<br>3. Verify still logged in |
| **Expected Result** | User remains authenticated after refresh |
| **Priority** | Medium |

### UAT-AUTH-004: Logout Functionality
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-004 |
| **Title** | Verify user can logout successfully |
| **Preconditions** | User is logged in |
| **Test Steps** | 1. Click on profile dropdown<br>2. Click Logout |
| **Expected Result** | User is logged out and redirected to login page |
| **Priority** | High |

### UAT-AUTH-005: Protected Route Access
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-005 |
| **Title** | Verify unauthenticated users cannot access protected routes |
| **Preconditions** | User is not logged in |
| **Test Steps** | 1. Clear browser session<br>2. Try to access /dashboard directly |
| **Expected Result** | User is redirected to login page |
| **Priority** | High |

### UAT-AUTH-006: Role-Based Access Control
| Field | Value |
|-------|-------|
| **Test ID** | UAT-AUTH-006 |
| **Title** | Verify users can only access pages they have permission for |
| **Preconditions** | User logged in as Agent (limited permissions) |
| **Test Steps** | 1. Login as Agent<br>2. Try to access /users page<br>3. Try to access /roles page |
| **Expected Result** | Access denied or page not accessible for restricted routes |
| **Priority** | High |

---

## 2. Dashboard

### UAT-DASH-001: Dashboard Load
| Field | Value |
|-------|-------|
| **Test ID** | UAT-DASH-001 |
| **Title** | Verify dashboard loads with all components |
| **Preconditions** | User is logged in |
| **Test Steps** | 1. Navigate to /dashboard<br>2. Wait for page to load |
| **Expected Result** | Dashboard displays: ticket statistics, recent tickets, priority breakdown, navigation |
| **Priority** | High |

### UAT-DASH-002: Ticket Statistics Display
| Field | Value |
|-------|-------|
| **Test ID** | UAT-DASH-002 |
| **Title** | Verify ticket statistics are accurate |
| **Preconditions** | User is logged in with view:tickets permission |
| **Test Steps** | 1. Navigate to dashboard<br>2. View ticket counts (Open, In Progress, Resolved, etc.) |
| **Expected Result** | Statistics match actual ticket counts in the system |
| **Priority** | Medium |

### UAT-DASH-003: Navigation Links
| Field | Value |
|-------|-------|
| **Test ID** | UAT-DASH-003 |
| **Title** | Verify all navigation links work correctly |
| **Preconditions** | User logged in with appropriate permissions |
| **Test Steps** | 1. Click "All Tickets"<br>2. Click "My Tickets"<br>3. Click "Vendors"<br>4. Click "Analytics"<br>5. Click "Labs" dropdown items |
| **Expected Result** | Each link navigates to the correct page |
| **Priority** | High |

### UAT-DASH-004: Labs Dropdown Visibility
| Field | Value |
|-------|-------|
| **Test ID** | UAT-DASH-004 |
| **Title** | Verify Labs dropdown shows based on permissions |
| **Preconditions** | None |
| **Test Steps** | 1. Login as Owner - verify Labs dropdown visible with all items<br>2. Login as Agent - verify Labs dropdown not visible or limited |
| **Expected Result** | Labs dropdown visibility matches user permissions |
| **Priority** | Medium |

### UAT-DASH-005: Labs Dropdown Items
| Field | Value |
|-------|-------|
| **Test ID** | UAT-DASH-005 |
| **Title** | Verify Labs dropdown contains correct items |
| **Preconditions** | User logged in with view:config, view:users, view:roles permissions |
| **Test Steps** | 1. Click Labs dropdown<br>2. Verify items: Ticket Manager, User Management, Roles Management |
| **Expected Result** | All three items visible and clickable |
| **Priority** | Medium |

---

## 3. Ticket Management

### UAT-TKT-001: View All Tickets
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-001 |
| **Title** | Verify user can view all tickets |
| **Preconditions** | User has view:all_tickets or view:department_tickets permission |
| **Test Steps** | 1. Navigate to /tickets<br>2. View ticket list |
| **Expected Result** | Ticket list displays with columns: ID, Title, Status, Priority, Assignee, etc. |
| **Priority** | High |

### UAT-TKT-002: Create New Ticket
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-002 |
| **Title** | Verify authorized user can create a new ticket |
| **Preconditions** | User has create:tickets permission and is in Seller Support or Customer Support |
| **Test Steps** | 1. Click "New Ticket" button<br>2. Fill required fields (Title, Department, Category, etc.)<br>3. Submit |
| **Expected Result** | Ticket created successfully, appears in ticket list |
| **Priority** | High |

### UAT-TKT-003: Create Ticket - Seller Support
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-003 |
| **Title** | Verify Seller Support agent sees vendorHandle field |
| **Preconditions** | User is Agent in Seller Support sub-department |
| **Test Steps** | 1. Click New Ticket<br>2. Check for vendorHandle field |
| **Expected Result** | vendorHandle field is visible and required |
| **Priority** | Medium |

### UAT-TKT-004: Create Ticket - Customer Support
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-004 |
| **Title** | Verify Customer Support agent sees customer field |
| **Preconditions** | User is Agent in Customer Support |
| **Test Steps** | 1. Click New Ticket<br>2. Check for customer field |
| **Expected Result** | Customer field is visible and required |
| **Priority** | Medium |

### UAT-TKT-005: Create Ticket - Restricted for Other Agents
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-005 |
| **Title** | Verify agents outside Seller/Customer Support cannot create tickets |
| **Preconditions** | User is Agent in a different department |
| **Test Steps** | 1. Login as Agent in Tech department<br>2. Check if "New Ticket" button is visible |
| **Expected Result** | New Ticket button is not visible or disabled |
| **Priority** | High |

### UAT-TKT-006: View Ticket Details
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-006 |
| **Title** | Verify user can view ticket details |
| **Preconditions** | Ticket exists in system |
| **Test Steps** | 1. Navigate to /tickets<br>2. Click on a ticket row |
| **Expected Result** | Ticket detail page opens showing all ticket information |
| **Priority** | High |

### UAT-TKT-007: Edit Ticket
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-007 |
| **Title** | Verify user can edit ticket details |
| **Preconditions** | User has edit:tickets permission |
| **Test Steps** | 1. Open ticket details<br>2. Edit fields (status, priority, assignee)<br>3. Save changes |
| **Expected Result** | Changes saved successfully, reflected in ticket list |
| **Priority** | High |

### UAT-TKT-008: Add Comment to Ticket
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-008 |
| **Title** | Verify user can add comments to a ticket |
| **Preconditions** | Ticket exists, user has access |
| **Test Steps** | 1. Open ticket details<br>2. Type comment in comment box<br>3. Submit comment |
| **Expected Result** | Comment added and displayed in ticket history |
| **Priority** | Medium |

### UAT-TKT-009: Filter Tickets by Department
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-009 |
| **Title** | Verify ticket filtering by department works |
| **Preconditions** | Multiple tickets exist across departments |
| **Test Steps** | 1. Navigate to /tickets<br>2. Select department filter<br>3. Apply filter |
| **Expected Result** | Only tickets from selected department displayed |
| **Priority** | Medium |

### UAT-TKT-010: My Tickets View
| Field | Value |
|-------|-------|
| **Test ID** | UAT-TKT-010 |
| **Title** | Verify My Tickets shows only user's assigned tickets |
| **Preconditions** | User has tickets assigned to them |
| **Test Steps** | 1. Navigate to /my-tickets |
| **Expected Result** | Only tickets assigned to current user are displayed |
| **Priority** | High |

---

## 4. User Management

### UAT-USR-001: View Users List
| Field | Value |
|-------|-------|
| **Test ID** | UAT-USR-001 |
| **Title** | Verify admin can view all users |
| **Preconditions** | User has view:users permission |
| **Test Steps** | 1. Navigate to /users (via Labs > User Management) |
| **Expected Result** | User list displays with columns: Name, Email, Role, Department, Status |
| **Priority** | High |

### UAT-USR-002: Create New User
| Field | Value |
|-------|-------|
| **Test ID** | UAT-USR-002 |
| **Title** | Verify admin can create a new user |
| **Preconditions** | User has create:users permission |
| **Test Steps** | 1. Click "Add User"<br>2. Fill required fields<br>3. Select role and department<br>4. Submit |
| **Expected Result** | User created, appears in user list |
| **Priority** | High |

### UAT-USR-003: Edit User
| Field | Value |
|-------|-------|
| **Test ID** | UAT-USR-003 |
| **Title** | Verify admin can edit user details |
| **Preconditions** | User has edit:users permission |
| **Test Steps** | 1. Click Edit on a user<br>2. Modify role/department<br>3. Save |
| **Expected Result** | Changes saved and reflected |
| **Priority** | High |

### UAT-USR-004: Deactivate User
| Field | Value |
|-------|-------|
| **Test ID** | UAT-USR-004 |
| **Title** | Verify admin can deactivate a user |
| **Preconditions** | User has edit:users permission |
| **Test Steps** | 1. Edit user<br>2. Set isActive to false<br>3. Save |
| **Expected Result** | User deactivated, cannot login |
| **Priority** | Medium |

### UAT-USR-005: Multi-Role Assignment
| Field | Value |
|-------|-------|
| **Test ID** | UAT-USR-005 |
| **Title** | Verify user can be assigned multiple roles |
| **Preconditions** | Multi-role support enabled |
| **Test Steps** | 1. Edit user<br>2. Assign multiple roles (e.g., Manager + Lead)<br>3. Save |
| **Expected Result** | User has combined permissions from all assigned roles |
| **Priority** | Medium |

---

## 5. Vendor Management

### UAT-VND-001: View Vendors List
| Field | Value |
|-------|-------|
| **Test ID** | UAT-VND-001 |
| **Title** | Verify user can view vendors list |
| **Preconditions** | User has view:vendors permission |
| **Test Steps** | 1. Navigate to /vendors |
| **Expected Result** | Vendor list displays with handle, name, email |
| **Priority** | High |

### UAT-VND-002: Create Vendor
| Field | Value |
|-------|-------|
| **Test ID** | UAT-VND-002 |
| **Title** | Verify user can create a new vendor |
| **Preconditions** | User has create:vendors permission |
| **Test Steps** | 1. Click "Add Vendor"<br>2. Enter handle, name, email<br>3. Submit |
| **Expected Result** | Vendor created successfully |
| **Priority** | Medium |

### UAT-VND-003: View Vendor Profile
| Field | Value |
|-------|-------|
| **Test ID** | UAT-VND-003 |
| **Title** | Verify vendor profile page displays correctly |
| **Preconditions** | Vendor exists |
| **Test Steps** | 1. Click on vendor in list |
| **Expected Result** | Vendor profile shows details and associated tickets |
| **Priority** | Medium |

### UAT-VND-004: Vendor Search/Lookup
| Field | Value |
|-------|-------|
| **Test ID** | UAT-VND-004 |
| **Title** | Verify vendor can be searched by handle |
| **Preconditions** | Vendors exist in system |
| **Test Steps** | 1. In ticket creation, type vendor handle<br>2. Verify autocomplete/search works |
| **Expected Result** | Matching vendors appear in suggestions |
| **Priority** | Medium |

---

## 6. Roles & Permissions Management

### UAT-ROLE-001: View Roles Page
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-001 |
| **Title** | Verify Roles page loads with all tabs |
| **Preconditions** | User has view:roles permission |
| **Test Steps** | 1. Navigate to Labs > Roles Management<br>2. Verify page loads |
| **Expected Result** | Page shows tabs: System Roles, Custom Roles, Permissions, Hardcoded Defaults |
| **Priority** | High |

### UAT-ROLE-002: View System Roles
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-002 |
| **Title** | Verify System Roles tab displays all system roles |
| **Preconditions** | On Roles page |
| **Test Steps** | 1. Click "System Roles" tab |
| **Expected Result** | Shows: Owner, Admin, Head, Manager, Lead, Associate, Agent with their permissions count |
| **Priority** | High |

### UAT-ROLE-003: Edit System Role Permissions
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-003 |
| **Title** | Verify admin can edit permissions for system role |
| **Preconditions** | User has edit:roles permission |
| **Test Steps** | 1. Click Actions > Edit Permissions on a system role<br>2. Add/remove permissions<br>3. Save |
| **Expected Result** | Permissions updated, role name remains unchanged |
| **Priority** | High |

### UAT-ROLE-004: Create Custom Role
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-004 |
| **Title** | Verify admin can create a custom role |
| **Preconditions** | User has create:roles permission |
| **Test Steps** | 1. Click "Create Role"<br>2. Enter name, display name, description<br>3. Select permissions<br>4. Save |
| **Expected Result** | Custom role created, appears in Custom Roles tab |
| **Priority** | High |

### UAT-ROLE-005: Edit Custom Role
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-005 |
| **Title** | Verify admin can edit custom role |
| **Preconditions** | Custom role exists |
| **Test Steps** | 1. Click Edit on custom role<br>2. Modify name/permissions<br>3. Save |
| **Expected Result** | Changes saved successfully |
| **Priority** | Medium |

### UAT-ROLE-006: Delete Custom Role
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-006 |
| **Title** | Verify admin can delete custom role |
| **Preconditions** | Custom role exists, user has delete:roles permission |
| **Test Steps** | 1. Click Delete on custom role<br>2. Confirm deletion |
| **Expected Result** | Role deleted, removed from list |
| **Priority** | Medium |

### UAT-ROLE-007: Cannot Delete System Role
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-007 |
| **Title** | Verify system roles cannot be deleted |
| **Preconditions** | On System Roles tab |
| **Test Steps** | 1. Check actions menu for system role |
| **Expected Result** | Delete option not available for system roles |
| **Priority** | High |

### UAT-ROLE-008: View Permissions Tab
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-008 |
| **Title** | Verify Permissions tab displays all permissions by category |
| **Preconditions** | On Roles page |
| **Test Steps** | 1. Click "Permissions" tab |
| **Expected Result** | Permissions grouped by category: General, Tickets, Users, Vendors, Analytics, Settings |
| **Priority** | Medium |

### UAT-ROLE-009: Create Permission
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-009 |
| **Title** | Verify admin can create a new permission |
| **Preconditions** | User has create:roles permission |
| **Test Steps** | 1. Click "Create Permission" on Permissions tab<br>2. Enter name (e.g., view:reports)<br>3. Enter display name<br>4. Select category from dropdown<br>5. Add description<br>6. Save |
| **Expected Result** | Permission created, appears in appropriate category |
| **Priority** | High |

### UAT-ROLE-010: Create Permission - New Category
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-010 |
| **Title** | Verify user can create permission with new category |
| **Preconditions** | On Create Permission dialog |
| **Test Steps** | 1. Click Category dropdown<br>2. Select "Create new category"<br>3. Enter new category name<br>4. Complete and save |
| **Expected Result** | Permission created with new category, new category appears in list |
| **Priority** | Medium |

### UAT-ROLE-011: Edit Permission
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-011 |
| **Title** | Verify admin can edit permission |
| **Preconditions** | Permission exists |
| **Test Steps** | 1. Click Edit on permission<br>2. Modify display name/description<br>3. Save |
| **Expected Result** | Changes saved (system permission: only displayName and description editable) |
| **Priority** | Medium |

### UAT-ROLE-012: Delete Custom Permission
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-012 |
| **Title** | Verify admin can delete custom permission |
| **Preconditions** | Custom permission exists |
| **Test Steps** | 1. Click Delete on custom permission<br>2. Confirm deletion |
| **Expected Result** | Permission deleted, removed from all roles that had it |
| **Priority** | Medium |

### UAT-ROLE-013: Cannot Delete System Permission
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-013 |
| **Title** | Verify system permissions cannot be deleted |
| **Preconditions** | On Permissions tab |
| **Test Steps** | 1. Check actions menu for system permission |
| **Expected Result** | Delete option not available for system permissions |
| **Priority** | High |

### UAT-ROLE-014: Hardcoded Defaults Tab
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-014 |
| **Title** | Verify Hardcoded Defaults tab shows fallback permissions |
| **Preconditions** | On Roles page |
| **Test Steps** | 1. Click "Hardcoded Defaults" tab |
| **Expected Result** | Shows all roles with their default permissions from code |
| **Priority** | Low |

### UAT-ROLE-015: Seed Defaults
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-015 |
| **Title** | Verify Seed Defaults populates database |
| **Preconditions** | Database permissions/roles tables are empty |
| **Test Steps** | 1. Click "Seed Defaults" button<br>2. Wait for completion |
| **Expected Result** | System roles and permissions created in database |
| **Priority** | Medium |

### UAT-ROLE-016: Category Dropdown Behavior
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ROLE-016 |
| **Title** | Verify category dropdown works correctly |
| **Preconditions** | On Create Permission dialog |
| **Test Steps** | 1. Click Category dropdown<br>2. Select a category<br>3. Click dropdown again and select different category |
| **Expected Result** | Dropdown works smoothly, no Ctrl+Z undo issues |
| **Priority** | Medium |

---

## 7. Analytics

### UAT-ANA-001: View Analytics Page
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ANA-001 |
| **Title** | Verify Analytics page loads |
| **Preconditions** | User has view:analytics permission |
| **Test Steps** | 1. Navigate to /analytics |
| **Expected Result** | Analytics dashboard displays charts and metrics |
| **Priority** | Medium |

### UAT-ANA-002: Access Denied Without Permission
| Field | Value |
|-------|-------|
| **Test ID** | UAT-ANA-002 |
| **Title** | Verify users without permission cannot access analytics |
| **Preconditions** | User does not have view:analytics permission |
| **Test Steps** | 1. Try to navigate to /analytics |
| **Expected Result** | Access denied or redirected |
| **Priority** | Medium |

---

## 8. Ticket Configuration

### UAT-CFG-001: View Ticket Config Page
| Field | Value |
|-------|-------|
| **Test ID** | UAT-CFG-001 |
| **Title** | Verify Ticket Config page loads |
| **Preconditions** | User has view:config permission |
| **Test Steps** | 1. Navigate to Labs > Ticket Manager |
| **Expected Result** | Configuration page displays categories, issue types, etc. |
| **Priority** | Medium |

### UAT-CFG-002: Manage Categories
| Field | Value |
|-------|-------|
| **Test ID** | UAT-CFG-002 |
| **Title** | Verify admin can manage ticket categories |
| **Preconditions** | User has edit:config permission |
| **Test Steps** | 1. Add new category<br>2. Edit existing category<br>3. Delete category |
| **Expected Result** | CRUD operations work correctly |
| **Priority** | Medium |

### UAT-CFG-003: Manage Departments
| Field | Value |
|-------|-------|
| **Test ID** | UAT-CFG-003 |
| **Title** | Verify admin can manage departments |
| **Preconditions** | User has edit:config permission |
| **Test Steps** | 1. View departments<br>2. Add sub-department<br>3. Edit department |
| **Expected Result** | Department hierarchy managed correctly |
| **Priority** | Medium |

---

## 9. Navigation & UI

### UAT-NAV-001: Responsive Design
| Field | Value |
|-------|-------|
| **Test ID** | UAT-NAV-001 |
| **Title** | Verify UI is responsive on different screen sizes |
| **Preconditions** | None |
| **Test Steps** | 1. View on desktop (1920px)<br>2. View on tablet (768px)<br>3. View on mobile (375px) |
| **Expected Result** | UI adapts appropriately to screen size |
| **Priority** | Medium |

### UAT-NAV-002: Notifications Bell
| Field | Value |
|-------|-------|
| **Test ID** | UAT-NAV-002 |
| **Title** | Verify notifications bell shows unread count |
| **Preconditions** | User has unread notifications |
| **Test Steps** | 1. Check notifications bell in header |
| **Expected Result** | Badge shows unread count, clicking opens notifications |
| **Priority** | Medium |

### UAT-NAV-003: Profile Dropdown
| Field | Value |
|-------|-------|
| **Test ID** | UAT-NAV-003 |
| **Title** | Verify profile dropdown functionality |
| **Preconditions** | User is logged in |
| **Test Steps** | 1. Click on profile avatar<br>2. Verify options: Profile, Logout |
| **Expected Result** | Dropdown shows user info and options |
| **Priority** | Medium |

### UAT-NAV-004: Back Button
| Field | Value |
|-------|-------|
| **Test ID** | UAT-NAV-004 |
| **Title** | Verify Back button navigation works |
| **Preconditions** | User is on a sub-page (e.g., /roles) |
| **Test Steps** | 1. Click Back button in header |
| **Expected Result** | User returns to dashboard |
| **Priority** | Low |

### UAT-NAV-005: Toast Notifications
| Field | Value |
|-------|-------|
| **Test ID** | UAT-NAV-005 |
| **Title** | Verify toast notifications appear for actions |
| **Preconditions** | None |
| **Test Steps** | 1. Create a ticket<br>2. Create a permission<br>3. Delete an item |
| **Expected Result** | Success/Error toasts appear and auto-dismiss |
| **Priority** | Low |

---

## Test Execution Summary

| Module | Total Tests | Passed | Failed | Blocked |
|--------|------------|--------|--------|---------|
| Authentication | 6 | | | |
| Dashboard | 5 | | | |
| Ticket Management | 10 | | | |
| User Management | 5 | | | |
| Vendor Management | 4 | | | |
| Roles & Permissions | 16 | | | |
| Analytics | 2 | | | |
| Ticket Configuration | 3 | | | |
| Navigation & UI | 5 | | | |
| **TOTAL** | **56** | | | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Product Owner | | | |
| Development Lead | | | |
