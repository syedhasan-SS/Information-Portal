# Information Portal - UAT Test Plan for Google Sheets
**Date:** February 3, 2026
**Tester:** _____________
**Build/Version:** _____________

---

## How to Use This Document
1. Copy each section into separate Google Sheets tabs
2. Mark status as: ✅ PASS | ❌ FAIL | ⏸️ BLOCKED | ⬜ NOT TESTED
3. Add notes/screenshots in the "Notes" column
4. Focus on PRIORITY 1 tests first, then PRIORITY 2

---

## TAB 1: PRIORITY 1 - CRITICAL USER JOURNEYS

### Section A: Login & Authentication

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P1-AUTH-001 | Login with Owner | 1. Go to login page<br>2. Enter owner credentials<br>3. Click Login | Redirect to dashboard, see full statistics | ⬜ | |
| P1-AUTH-002 | Login with Admin | 1. Enter admin credentials<br>2. Click Login | Redirect to dashboard, see admin view | ⬜ | |
| P1-AUTH-003 | Login with Agent | 1. Enter agent credentials<br>2. Click Login | Redirect to dashboard, limited view | ⬜ | |
| P1-AUTH-004 | Invalid login | 1. Enter wrong email/password<br>2. Click Login | Error message shown, stay on login page | ⬜ | |
| P1-AUTH-005 | Logout | 1. Click profile menu<br>2. Click Logout | Redirect to login page, session cleared | ⬜ | |

### Section B: Owner Role - Core Features

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P1-OWN-001 | View Dashboard | 1. Login as Owner<br>2. Check dashboard | All statistics visible (total tickets, by status, by department) | ⬜ | |
| P1-OWN-002 | View All Tickets | 1. Navigate to All Tickets | Can see tickets from ALL departments | ⬜ | |
| P1-OWN-003 | Create Ticket | 1. Click New Ticket<br>2. Fill: Title, Description, Priority, Department<br>3. Click Submit | Ticket created with ID, visible in list | ⬜ | |
| P1-OWN-004 | Edit Ticket | 1. Open any ticket<br>2. Click Edit<br>3. Change status to "In Progress"<br>4. Save | Status updated successfully | ⬜ | |
| P1-OWN-005 | Delete Ticket | 1. Open any ticket<br>2. Click Delete<br>3. Confirm | Ticket deleted (only Owner can delete) | ⬜ | |
| P1-OWN-006 | Access User Management | 1. Click Labs dropdown<br>2. Click User Management | User list page opens | ⬜ | |
| P1-OWN-007 | Create User | 1. User Management → Add User<br>2. Fill form (name, email, role, department)<br>3. Submit | User created successfully | ⬜ | |
| P1-OWN-008 | Access Roles Management | 1. Labs → Roles Management | Roles page opens with tabs | ⬜ | |
| P1-OWN-009 | View System Roles | 1. Roles page → System Roles tab | See 7 system roles (Owner, Admin, Head, Manager, Lead, Associate, Agent) | ⬜ | |
| P1-OWN-010 | Create Permission | 1. Roles → Permissions tab<br>2. Click Create Permission<br>3. Fill: name, category, description<br>4. Save | Permission created and visible in list | ⬜ | |
| P1-OWN-011 | Access Analytics | 1. Click Analytics in nav | Analytics dashboard visible with charts | ⬜ | |
| P1-OWN-012 | Access Vendors | 1. Click Vendors in nav | Vendor list visible | ⬜ | |

### Section C: Admin Role - Permission Restrictions

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P1-ADM-001 | View Dashboard | 1. Login as Admin | Dashboard visible | ⬜ | |
| P1-ADM-002 | View All Tickets | 1. Navigate to All Tickets | Can see all tickets | ⬜ | |
| P1-ADM-003 | Create User | 1. User Management → Add User | Can create user | ⬜ | |
| P1-ADM-004 | Edit User | 1. User Management → Edit user | Can edit user details | ⬜ | |
| P1-ADM-005 | Delete User BLOCKED | 1. User Management → Try to delete user | NO delete button/option visible | ⬜ | |
| P1-ADM-006 | Access Roles | 1. Labs → Roles | Can access roles page | ⬜ | |
| P1-ADM-007 | Edit Role Permissions | 1. Edit any role → Change permissions | Can modify permissions | ⬜ | |
| P1-ADM-008 | Delete Role BLOCKED | 1. Try to delete any role | NO delete button/option visible | ⬜ | |
| P1-ADM-009 | Delete Vendor BLOCKED | 1. Vendors → Try to delete | NO delete option (Admin can create/edit only) | ⬜ | |

### Section D: Agent Role - Seller Support

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P1-SS-001 | Login as SS Agent | 1. Login with Seller Support Agent credentials | Dashboard shows Seller Support dept only | ⬜ | |
| P1-SS-002 | View Department Tickets | 1. Navigate to All Tickets | Only Seller Support tickets visible | ⬜ | |
| P1-SS-003 | Create Ticket Allowed | 1. Check for New Ticket button | Button IS visible (SS can create) | ⬜ | |
| P1-SS-004 | Create Ticket with Vendor | 1. New Ticket → Fill form<br>2. Enter vendorHandle<br>3. Submit | Ticket created with vendor linked | ⬜ | |
| P1-SS-005 | Vendor Autocomplete | 1. New Ticket → Start typing vendor handle | Suggestions appear | ⬜ | |
| P1-SS-006 | Cannot Access Labs | 1. Check navigation | Labs dropdown NOT visible | ⬜ | |
| P1-SS-007 | Cannot Access Analytics | 1. Check navigation | Analytics NOT visible | ⬜ | |

### Section E: Agent Role - Other Departments

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P1-AGT-001 | Login as Tech Agent | 1. Login with Tech dept agent | Dashboard shows Tech dept only | ⬜ | |
| P1-AGT-002 | View Department Tickets | 1. Navigate to tickets | Only Tech tickets visible | ⬜ | |
| P1-AGT-003 | Cannot Create Ticket | 1. Check navigation | New Ticket button NOT visible | ⬜ | |
| P1-AGT-004 | Can Edit Tickets | 1. Open any ticket → Edit | Can edit department tickets | ⬜ | |
| P1-AGT-005 | Cannot Delete Tickets | 1. Open ticket → Check options | No delete option | ⬜ | |

---

## TAB 2: PRIORITY 2 - ROLE-BASED ACCESS CONTROL

### Section A: Head Role

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-HEAD-001 | Login as Head | 1. Login with Head credentials (any dept) | Dashboard visible | ⬜ | |
| P2-HEAD-002 | Department Scope | 1. View All Tickets | Only own department tickets visible | ⬜ | |
| P2-HEAD-003 | User Visibility | 1. User Management (if visible) | Only department users shown | ⬜ | |
| P2-HEAD-004 | Create Ticket | 1. New Ticket → Submit | Ticket auto-assigned to own dept | ⬜ | |
| P2-HEAD-005 | Edit Tickets | 1. Edit any dept ticket | Can edit successfully | ⬜ | |
| P2-HEAD-006 | Cannot Delete | 1. Check ticket actions | Delete option NOT available | ⬜ | |
| P2-HEAD-007 | Cannot Access Roles | 1. Try to access /roles or Labs→Roles | Access denied or not visible | ⬜ | |
| P2-HEAD-008 | View Analytics | 1. Click Analytics | Analytics visible | ⬜ | |
| P2-HEAD-009 | Vendors Read-Only | 1. Navigate to Vendors | Can view, cannot create/edit/delete | ⬜ | |

### Section B: Manager Role

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-MGR-001 | Login as Manager | 1. Login with Manager credentials | Dashboard visible | ⬜ | |
| P2-MGR-002 | Department Tickets | 1. View tickets | Only department tickets visible | ⬜ | |
| P2-MGR-003 | Create Ticket | 1. New Ticket → Submit | Can create tickets | ⬜ | |
| P2-MGR-004 | Edit Ticket | 1. Edit dept ticket | Can edit | ⬜ | |
| P2-MGR-005 | No Analytics | 1. Check navigation | Analytics NOT visible | ⬜ | |
| P2-MGR-006 | No User Management | 1. Check Labs dropdown | User Management NOT visible | ⬜ | |

### Section C: Lead Role

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-LEAD-001 | Login as Lead | 1. Login with Lead credentials | Dashboard visible | ⬜ | |
| P2-LEAD-002 | Team Scope Only | 1. View tickets | Only team tickets visible (not full dept) | ⬜ | |
| P2-LEAD-003 | Create Ticket | 1. New Ticket → Submit | Can create | ⬜ | |
| P2-LEAD-004 | Edit Team Ticket | 1. Edit ticket | Can edit | ⬜ | |
| P2-LEAD-005 | No User Management | 1. Check Labs | User Management NOT visible | ⬜ | |

### Section D: Associate Role

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-ASSOC-001 | Login as Associate | 1. Login with Associate credentials | Dashboard visible | ⬜ | |
| P2-ASSOC-002 | Assigned Tickets Only | 1. View My Tickets | Only tickets assigned to me | ⬜ | |
| P2-ASSOC-003 | Create Ticket | 1. New Ticket → Submit | Can create | ⬜ | |
| P2-ASSOC-004 | Edit Own Ticket | 1. Edit assigned ticket | Can edit | ⬜ | |
| P2-ASSOC-005 | Limited Visibility | 1. Try to view All Tickets | Limited scope | ⬜ | |
| P2-ASSOC-006 | No Admin Features | 1. Check navigation | Labs NOT visible | ⬜ | |

---

## TAB 3: PRIORITY 2 - FEATURE TESTING

### Section A: Ticket Management Features

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-TKT-001 | Ticket List View | 1. Navigate to All Tickets | List displayed with pagination | ⬜ | |
| P2-TKT-002 | Ticket Detail View | 1. Click any ticket | Full detail page opens | ⬜ | |
| P2-TKT-003 | Filter by Status | 1. All Tickets → Filter by "Open" | Only open tickets shown | ⬜ | |
| P2-TKT-004 | Filter by Priority | 1. Filter by "High" priority | Only high priority tickets | ⬜ | |
| P2-TKT-005 | Filter by Department | 1. Filter by specific department | Department tickets only | ⬜ | |
| P2-TKT-006 | Search Tickets | 1. Enter keyword in search<br>2. Press Enter | Matching tickets shown | ⬜ | |
| P2-TKT-007 | Update Status | 1. Edit ticket → Change status → Save | Status updated | ⬜ | |
| P2-TKT-008 | Add Comment | 1. Ticket detail → Add comment → Submit | Comment appears in timeline | ⬜ | |
| P2-TKT-009 | File Attachment | 1. Create/Edit ticket → Attach file → Submit | File uploaded successfully | ⬜ | |
| P2-TKT-010 | Reassign Ticket | 1. Edit → Change assignee → Save | Ticket reassigned | ⬜ | |

### Section B: User Management Features

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-USR-001 | User List View | 1. Labs → User Management | User list with details | ⬜ | |
| P2-USR-002 | Create User | 1. Add User → Fill all fields → Submit | User created, appears in list | ⬜ | |
| P2-USR-003 | Duplicate Email | 1. Create user with existing email | Error: email already exists | ⬜ | |
| P2-USR-004 | Edit User Role | 1. Edit user → Change role → Save | Role updated | ⬜ | |
| P2-USR-005 | Multi-Role Assignment | 1. Edit user → Assign multiple roles → Save | Multiple roles assigned | ⬜ | |
| P2-USR-006 | Change Department | 1. Edit user → Change dept → Save | Department updated, ticket visibility changes | ⬜ | |
| P2-USR-007 | Deactivate User | 1. Edit user → Toggle isActive to OFF → Save | User cannot login | ⬜ | |
| P2-USR-008 | Filter by Role | 1. User list → Filter by role | Filtered results | ⬜ | |
| P2-USR-009 | Filter by Department | 1. User list → Filter by dept | Department users only | ⬜ | |

### Section C: Roles & Permissions

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-ROLE-001 | View System Roles | 1. Roles → System Roles tab | 7 roles listed | ⬜ | |
| P2-ROLE-002 | View Custom Roles | 1. Roles → Custom Roles tab | Custom roles (if any) | ⬜ | |
| P2-ROLE-003 | View Permissions | 1. Roles → Permissions tab | Permissions grouped by category | ⬜ | |
| P2-ROLE-004 | View Hardcoded Defaults | 1. Roles → Hardcoded Defaults tab | Fallback permissions shown | ⬜ | |
| P2-ROLE-005 | Edit System Role Perms | 1. System Roles → Edit → Change perms → Save | Permissions updated | ⬜ | |
| P2-ROLE-006 | System Role Name Locked | 1. Try to edit system role name | Name field disabled/greyed out | ⬜ | |
| P2-ROLE-007 | Create Custom Role | 1. Custom Roles → Create Role → Fill → Save | New role created | ⬜ | |
| P2-ROLE-008 | Edit Custom Role | 1. Custom Roles → Edit → Modify → Save | Changes saved | ⬜ | |
| P2-ROLE-009 | Delete Custom Role | 1. Custom Roles → Delete → Confirm | Role deleted | ⬜ | |
| P2-ROLE-010 | Cannot Delete System | 1. System Roles → Check for delete | No delete option available | ⬜ | |
| P2-ROLE-011 | Create Permission | 1. Permissions → Create → Fill → Save | Permission created | ⬜ | |
| P2-ROLE-012 | New Category | 1. Create Permission → "Create new category" → Enter name | New category created | ⬜ | |
| P2-ROLE-013 | Edit Permission | 1. Permissions → Edit → Modify → Save | Changes saved | ⬜ | |
| P2-ROLE-014 | System Perm Locked | 1. Try to edit system permission name | Name/category disabled | ⬜ | |
| P2-ROLE-015 | Delete Custom Perm | 1. Delete custom permission → Confirm | Permission deleted | ⬜ | |
| P2-ROLE-016 | Cannot Delete System Perm | 1. Check system permission | No delete option | ⬜ | |

### Section D: Vendor Management

| Test ID | Test Scenario | Test Steps | Expected Result | Status | Notes |
|---------|--------------|------------|-----------------|--------|-------|
| P2-VND-001 | View Vendor List | 1. Navigate to Vendors | Vendor list displayed | ⬜ | |
| P2-VND-002 | Create Vendor | 1. Add Vendor → Fill form → Save | Vendor created | ⬜ | |
| P2-VND-003 | Duplicate Handle | 1. Create vendor with existing handle | Error: handle exists | ⬜ | |
| P2-VND-004 | Edit Vendor | 1. Edit vendor → Modify → Save | Changes saved | ⬜ | |
| P2-VND-005 | View Vendor Profile | 1. Click vendor from list | Vendor profile page opens | ⬜ | |
| P2-VND-006 | Vendor Tickets | 1. Vendor profile → View tickets tab | All related tickets shown | ⬜ | |
| P2-VND-007 | Search Vendor | 1. Search by vendor handle | Matching vendors shown | ⬜ | |
| P2-VND-008 | Delete Vendor (Owner only) | 1. Delete vendor → Confirm | Vendor deleted | ⬜ | |

---

## TAB 4: PRIORITY 3 - DEPARTMENT-SPECIFIC TESTING

### Finance Department Tests

| Test ID | Test Scenario | User Role | Test Steps | Expected Result | Status | Notes |
|---------|--------------|-----------|------------|-----------------|--------|-------|
| P3-FIN-001 | Finance Tickets Only | Finance Head | All Tickets → Check visibility | Only Finance tickets | ⬜ | |
| P3-FIN-002 | Assign to Finance | Admin | Create ticket → Assign Finance | Visible to Finance team | ⬜ | |
| P3-FIN-003 | Finance Dashboard | Finance Agent | Login → View dashboard | Finance stats only | ⬜ | |
| P3-FIN-004 | Cross-Dept Block | Finance Manager | Check other dept tickets | Cannot see other depts | ⬜ | |

### Operations Department Tests

| Test ID | Test Scenario | User Role | Test Steps | Expected Result | Status | Notes |
|---------|--------------|-----------|------------|-----------------|--------|-------|
| P3-OPS-001 | Ops Tickets Only | Ops Head | All Tickets | Only Ops tickets | ⬜ | |
| P3-OPS-002 | Ops Agent Access | Ops Agent | My Tickets | Assigned Ops tickets | ⬜ | |
| P3-OPS-003 | Ops Dashboard | Ops Manager | Dashboard | Ops-specific stats | ⬜ | |

### Tech Department Tests

| Test ID | Test Scenario | User Role | Test Steps | Expected Result | Status | Notes |
|---------|--------------|-----------|------------|-----------------|--------|-------|
| P3-TECH-001 | Tech Tickets Only | Tech Head | All Tickets | Tech tickets only | ⬜ | |
| P3-TECH-002 | Bug Reports | Tech Agent | View technical tickets | Tech category visible | ⬜ | |

### CX - Customer Support Tests

| Test ID | Test Scenario | User Role | Test Steps | Expected Result | Status | Notes |
|---------|--------------|-----------|------------|-----------------|--------|-------|
| P3-CS-001 | Create Customer Ticket | CS Agent | New Ticket with customer field | Ticket created | ⬜ | |
| P3-CS-002 | Customer Field Visible | CS Agent | Create ticket form | Customer field shown | ⬜ | |

---

## TAB 5: TEST SUMMARY & SIGN-OFF

### Test Execution Summary

| Priority | Total Tests | Passed | Failed | Blocked | Not Run | % Complete |
|----------|------------|--------|--------|---------|---------|------------|
| Priority 1 - Critical | 52 | | | | | 0% |
| Priority 2 - RBAC | 27 | | | | | 0% |
| Priority 2 - Features | 46 | | | | | 0% |
| Priority 3 - Departments | 11 | | | | | 0% |
| **TOTAL** | **136** | **0** | **0** | **0** | **136** | **0%** |

### Defects/Issues Found

| Issue ID | Test ID | Severity | Description | Status | Assigned To |
|----------|---------|----------|-------------|--------|-------------|
| | | | | | |
| | | | | | |

**Severity Levels:**
- **CRITICAL:** System crash, data loss, security breach
- **HIGH:** Major feature broken, workaround exists
- **MEDIUM:** Feature partially working
- **LOW:** UI/cosmetic issue

### Test Environment

| Item | Details |
|------|---------|
| URL | |
| Browser | |
| Database | |
| Test Data | |

### Sign-Off

| Role | Name | Status | Date | Signature |
|------|------|--------|------|-----------|
| Tester | | | | |
| QA Lead | | | | |
| Product Owner | | | | |

### Acceptance Criteria

- [ ] All Priority 1 tests passed
- [ ] No CRITICAL or HIGH severity defects open
- [ ] All role-based access controls verified
- [ ] All department restrictions working
- [ ] System performance acceptable

---

## Quick Testing Tips

1. **Start with Priority 1** - These are the most critical user journeys
2. **Test with real data** - Create actual tickets, users, vendors
3. **Take screenshots** - Especially for failures
4. **Test edge cases** - Try invalid inputs, boundary conditions
5. **Cross-browser** - Test on Chrome, Firefox, Safari
6. **Mobile responsive** - Check on phone/tablet if applicable

## Status Legend
- ✅ **PASS** - Test passed successfully
- ❌ **FAIL** - Test failed, bug found
- ⏸️ **BLOCKED** - Cannot test due to dependency
- ⬜ **NOT TESTED** - Not yet executed

---

**Document Created:** February 3, 2026
**For:** Information Portal UAT
**Format:** Google Sheets Ready
