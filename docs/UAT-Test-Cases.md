# Information Portal - User Acceptance Test Cases

> **Document Version:** 2.0
> **Last Updated:** February 2026
> **Status:** Ready for Testing

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [1. Role-Based Testing](#1-role-based-testing) | Tests organized by user role |
| [2. Department-Based Testing](#2-department-based-testing) | Tests specific to each department |
| [3. Feature Testing](#3-feature-testing) | Tests by feature/module |
| [4. Permission Matrix](#4-permission-matrix) | Permission verification grid |
| [5. Test Execution Tracker](#5-test-execution-tracker) | Progress tracking |

---

# 1. Role-Based Testing

## 1.1 Owner Role Testing

> **Role Description:** Full system access with all permissions
> **Expected Permissions:** 24 (all permissions)

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| OWN-001 | Access Dashboard | Login as Owner → Navigate to Dashboard | Full dashboard with all statistics visible | ⬜ |
| OWN-002 | View All Tickets | Navigate to All Tickets page | Can see tickets from ALL departments | ⬜ |
| OWN-003 | Create Ticket | Click New Ticket → Fill form → Submit | Ticket created successfully | ⬜ |
| OWN-004 | Delete Ticket | Open ticket → Click Delete | Ticket deleted (Owner only) | ⬜ |
| OWN-005 | Access User Management | Labs → User Management | Can view, create, edit, delete users | ⬜ |
| OWN-006 | Access Roles Management | Labs → Roles Management | Can manage all roles and permissions | ⬜ |
| OWN-007 | Delete System Role | Try to delete "Admin" role | Should be blocked (system role) | ⬜ |
| OWN-008 | Create Custom Role | Create Role → Add permissions | Custom role created successfully | ⬜ |
| OWN-009 | Delete Custom Role | Delete a custom role | Custom role deleted | ⬜ |
| OWN-010 | Create Permission | Permissions tab → Create Permission | Permission created and available | ⬜ |
| OWN-011 | Access Analytics | Navigate to Analytics | Full analytics dashboard visible | ⬜ |
| OWN-012 | Access Ticket Config | Labs → Ticket Manager | Can configure categories, departments | ⬜ |
| OWN-013 | Manage Vendors | Navigate to Vendors | Full CRUD on vendors | ⬜ |

---

## 1.2 Admin Role Testing

> **Role Description:** Administrative access (no delete users/roles)
> **Expected Permissions:** 21 permissions

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| ADM-001 | Access Dashboard | Login as Admin | Full dashboard visible | ⬜ |
| ADM-002 | View All Tickets | Navigate to All Tickets | Can see all tickets | ⬜ |
| ADM-003 | Create/Edit Users | User Management → Add/Edit | Can create and edit users | ⬜ |
| ADM-004 | Delete User Blocked | Try to delete a user | Should NOT have delete option | ⬜ |
| ADM-005 | Edit System Role Permissions | Edit "Agent" role permissions | Can modify permissions | ⬜ |
| ADM-006 | Delete Role Blocked | Try to delete any role | Should NOT have delete option | ⬜ |
| ADM-007 | Create Custom Role | Create new custom role | Role created successfully | ⬜ |
| ADM-008 | Access Analytics | Navigate to Analytics | Full access | ⬜ |
| ADM-009 | Manage Vendors | Vendors page | Can create, edit (not delete) | ⬜ |

---

## 1.3 Head Role Testing

> **Role Description:** Department leadership access
> **Expected Permissions:** 9 permissions (department scoped)

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| HEAD-001 | View Department Tickets | Navigate to Tickets | Only sees own department tickets | ⬜ |
| HEAD-002 | View Department Users | User Management | Only sees users in own department | ⬜ |
| HEAD-003 | Create Ticket | Create new ticket | Ticket assigned to own department | ⬜ |
| HEAD-004 | Edit Ticket | Edit any department ticket | Can edit tickets in department | ⬜ |
| HEAD-005 | Cannot Delete Ticket | Check ticket actions | Delete option NOT available | ⬜ |
| HEAD-006 | Cannot Access Roles | Try to access /roles | Access denied or not visible | ⬜ |
| HEAD-007 | Cannot Access Config | Try to access /ticket-config | Access denied or not visible | ⬜ |
| HEAD-008 | View Analytics | Navigate to Analytics | Analytics visible | ⬜ |
| HEAD-009 | View Vendors (Read Only) | Navigate to Vendors | Can view, cannot create/edit | ⬜ |

---

## 1.4 Manager Role Testing

> **Role Description:** Team management access
> **Expected Permissions:** 6 permissions

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| MGR-001 | View Department Tickets | Navigate to Tickets | Only department tickets visible | ⬜ |
| MGR-002 | View Department Users | Check user visibility | Only department users visible | ⬜ |
| MGR-003 | Create Ticket | Create new ticket | Can create tickets | ⬜ |
| MGR-004 | Edit Ticket | Edit department ticket | Can edit | ⬜ |
| MGR-005 | No Analytics Access | Check Analytics nav | Analytics NOT visible | ⬜ |
| MGR-006 | No User Management | Check Labs dropdown | User Management NOT visible | ⬜ |

---

## 1.5 Lead Role Testing

> **Role Description:** Team lead access
> **Expected Permissions:** 6 permissions

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| LEAD-001 | View Team Tickets | Navigate to Tickets | Only team tickets visible | ⬜ |
| LEAD-002 | Create Ticket | Create new ticket | Can create tickets | ⬜ |
| LEAD-003 | Edit Ticket | Edit team ticket | Can edit | ⬜ |
| LEAD-004 | No Department View | Check ticket scope | Cannot see other teams | ⬜ |
| LEAD-005 | No User Management | Check navigation | User Management NOT visible | ⬜ |

---

## 1.6 Associate Role Testing

> **Role Description:** Standard employee access
> **Expected Permissions:** 5 permissions

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| ASSOC-001 | View Assigned Tickets | Navigate to My Tickets | Only assigned tickets visible | ⬜ |
| ASSOC-002 | Create Ticket | Create new ticket | Can create tickets | ⬜ |
| ASSOC-003 | Edit Own Ticket | Edit assigned ticket | Can edit | ⬜ |
| ASSOC-004 | Cannot See Others | Check All Tickets | Limited visibility | ⬜ |
| ASSOC-005 | No Admin Features | Check Labs | Labs NOT visible | ⬜ |

---

## 1.7 Agent Role Testing

> **Role Description:** Support agent access (department-scoped)
> **Expected Permissions:** 6 permissions + department restrictions

### Test Scenarios

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| AGT-001 | View Department Tickets | Navigate to Tickets | All department tickets visible | ⬜ |
| AGT-002 | View My Tickets | Navigate to My Tickets | Assigned tickets visible | ⬜ |
| AGT-003 | Edit Ticket | Edit department ticket | Can edit | ⬜ |
| AGT-004 | No Admin Access | Check Labs dropdown | Labs NOT visible | ⬜ |
| AGT-005 | No Analytics | Check Analytics | Analytics NOT visible | ⬜ |

### Agent - Seller Support Specific

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| AGT-SS-001 | Can Create Ticket | Check New Ticket button | Button visible and functional | ⬜ |
| AGT-SS-002 | Vendor Handle Required | Create ticket form | vendorHandle field visible & required | ⬜ |
| AGT-SS-003 | Vendor Autocomplete | Type vendor handle | Suggestions appear | ⬜ |

### Agent - Customer Support Specific

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| AGT-CS-001 | Can Create Ticket | Check New Ticket button | Button visible and functional | ⬜ |
| AGT-CS-002 | Customer Field Required | Create ticket form | customer field visible & required | ⬜ |

### Agent - Other Departments

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| AGT-OTH-001 | Cannot Create Ticket | Check New Ticket button | Button NOT visible | ⬜ |
| AGT-OTH-002 | Can View Only | Check permissions | View and edit only | ⬜ |

---

# 2. Department-Based Testing

## 2.1 Finance Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| FIN-001 | View Finance Tickets | Finance Head | All Tickets → Filter by Finance | Only Finance tickets shown | ⬜ |
| FIN-002 | Assign to Finance | Admin | Create ticket → Assign to Finance | Ticket visible to Finance team | ⬜ |
| FIN-003 | Finance Agent View | Finance Agent | Login → Dashboard | Finance statistics only | ⬜ |
| FIN-004 | Cross-dept Visibility | Finance Manager | Check other dept tickets | Cannot see other departments | ⬜ |

## 2.2 Operations Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| OPS-001 | View Ops Tickets | Ops Head | All Tickets → Filter by Operations | Only Ops tickets shown | ⬜ |
| OPS-002 | Ops Agent Access | Ops Agent | Login → My Tickets | Assigned Ops tickets | ⬜ |
| OPS-003 | Ops Dashboard Stats | Ops Manager | Dashboard | Ops-specific statistics | ⬜ |

## 2.3 Marketplace Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| MKT-001 | View Marketplace Tickets | MKT Head | All Tickets | Marketplace tickets only | ⬜ |
| MKT-002 | Product Listing Issues | MKT Agent | Create ticket for listing | Proper category available | ⬜ |

## 2.4 Tech Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| TECH-001 | View Tech Tickets | Tech Head | All Tickets | Tech tickets only | ⬜ |
| TECH-002 | Bug Reports | Tech Agent | View bug tickets | Technical category tickets | ⬜ |
| TECH-003 | Platform Issues | Tech Lead | Filter by issue type | Platform issues visible | ⬜ |

## 2.5 CX Department (Seller Support & Customer Support)

### Seller Support Sub-Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| SS-001 | Create Seller Ticket | SS Agent | New Ticket with vendorHandle | Ticket created with vendor | ⬜ |
| SS-002 | Vendor Lookup | SS Agent | Search vendor by handle | Vendor details shown | ⬜ |
| SS-003 | View Vendor Profile | SS Agent | Click vendor link | Vendor profile page opens | ⬜ |
| SS-004 | Vendor Ticket History | SS Agent | Vendor profile → Tickets | All vendor tickets listed | ⬜ |

### Customer Support Sub-Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| CS-001 | Create Customer Ticket | CS Agent | New Ticket with customer | Ticket created with customer info | ⬜ |
| CS-002 | Customer Field | CS Agent | Create ticket form | Customer field visible | ⬜ |

## 2.6 Supply Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| SUP-001 | View Supply Tickets | Supply Head | All Tickets | Supply chain tickets | ⬜ |
| SUP-002 | Inventory Issues | Supply Agent | Filter by category | Inventory tickets shown | ⬜ |

## 2.7 Growth Department

| ID | Scenario | User Role | Steps | Expected Result | Status |
|----|----------|-----------|-------|-----------------|--------|
| GRW-001 | View Growth Tickets | Growth Head | All Tickets | Growth/expansion tickets | ⬜ |
| GRW-002 | Business Dev Issues | Growth Manager | Create BD ticket | Proper categories available | ⬜ |

---

# 3. Feature Testing

## 3.1 Authentication & Session

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| AUTH-001 | Login | Valid credentials | Enter email → Submit | Redirect to dashboard | ⬜ |
| AUTH-002 | Login | Invalid credentials | Enter wrong email | Error message shown | ⬜ |
| AUTH-003 | Session | Persistence | Login → Refresh page | Stay logged in | ⬜ |
| AUTH-004 | Session | Timeout | Leave idle → Return | Session valid or re-login | ⬜ |
| AUTH-005 | Logout | Clean logout | Click Logout | Redirect to login, session cleared | ⬜ |
| AUTH-006 | Protected Routes | Direct URL access | Access /dashboard without login | Redirect to login | ⬜ |

## 3.2 Ticket Management

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| TKT-001 | Create | Basic creation | Fill required fields → Submit | Ticket created with ID | ⬜ |
| TKT-002 | Create | With attachment | Add file → Submit | File uploaded successfully | ⬜ |
| TKT-003 | View | Ticket list | Navigate to All Tickets | List with pagination | ⬜ |
| TKT-004 | View | Ticket detail | Click on ticket | Full details shown | ⬜ |
| TKT-005 | Edit | Update status | Change status → Save | Status updated | ⬜ |
| TKT-006 | Edit | Reassign | Change assignee → Save | New assignee notified | ⬜ |
| TKT-007 | Filter | By status | Select status filter | Filtered results | ⬜ |
| TKT-008 | Filter | By priority | Select priority filter | Filtered results | ⬜ |
| TKT-009 | Filter | By department | Select department | Dept tickets only | ⬜ |
| TKT-010 | Search | By keyword | Enter search term | Matching tickets | ⬜ |
| TKT-011 | Comment | Add comment | Type comment → Submit | Comment added to ticket | ⬜ |
| TKT-012 | Comment | @mention | Type @username | User notified | ⬜ |

## 3.3 User Management

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| USR-001 | Create | New user | Fill form → Submit | User created, email sent | ⬜ |
| USR-002 | Create | Duplicate email | Use existing email | Error: duplicate | ⬜ |
| USR-003 | Edit | Update role | Change role → Save | Role updated | ⬜ |
| USR-004 | Edit | Multi-role | Assign multiple roles | Combined permissions | ⬜ |
| USR-005 | Edit | Change department | Assign new dept | Ticket visibility changes | ⬜ |
| USR-006 | Deactivate | Set inactive | Toggle isActive | User cannot login | ⬜ |
| USR-007 | Delete | Remove user | Delete user | User removed | ⬜ |
| USR-008 | View | User list | Navigate to Users | Paginated list | ⬜ |
| USR-009 | Filter | By role | Filter by role | Filtered users | ⬜ |
| USR-010 | Filter | By department | Filter by dept | Dept users only | ⬜ |

## 3.4 Roles & Permissions Management

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| ROLE-001 | View | System roles tab | Click System Roles | 7 system roles listed | ⬜ |
| ROLE-002 | View | Custom roles tab | Click Custom Roles | Custom roles (if any) | ⬜ |
| ROLE-003 | View | Permissions tab | Click Permissions | Grouped by category | ⬜ |
| ROLE-004 | View | Hardcoded defaults | Click Hardcoded Defaults | Fallback permissions shown | ⬜ |
| ROLE-005 | Edit | System role perms | Edit → Change perms → Save | Permissions updated | ⬜ |
| ROLE-006 | Edit | System role name | Try to change name | Name field disabled | ⬜ |
| ROLE-007 | Create | Custom role | Create Role → Fill → Save | New role available | ⬜ |
| ROLE-008 | Edit | Custom role | Edit → Modify → Save | Changes saved | ⬜ |
| ROLE-009 | Delete | Custom role | Delete → Confirm | Role removed | ⬜ |
| ROLE-010 | Delete | System role | Try to delete | No delete option | ⬜ |
| ROLE-011 | Create | Permission | Create Permission | New permission created | ⬜ |
| ROLE-012 | Create | Permission + new category | Select "Create new category" | Category created | ⬜ |
| ROLE-013 | Edit | Permission | Edit → Modify → Save | Changes saved | ⬜ |
| ROLE-014 | Edit | System permission | Try to edit name | Name/category disabled | ⬜ |
| ROLE-015 | Delete | Custom permission | Delete → Confirm | Permission removed | ⬜ |
| ROLE-016 | Delete | System permission | Try to delete | No delete option | ⬜ |
| ROLE-017 | Seed | Seed defaults | Click Seed Defaults | DB populated | ⬜ |

## 3.5 Vendor Management

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| VND-001 | View | Vendor list | Navigate to Vendors | All vendors listed | ⬜ |
| VND-002 | Create | New vendor | Add Vendor → Fill → Save | Vendor created | ⬜ |
| VND-003 | Create | Duplicate handle | Use existing handle | Error: duplicate | ⬜ |
| VND-004 | Edit | Update vendor | Edit → Modify → Save | Changes saved | ⬜ |
| VND-005 | View | Vendor profile | Click vendor | Profile page opens | ⬜ |
| VND-006 | View | Vendor tickets | Vendor profile → Tickets | Related tickets shown | ⬜ |
| VND-007 | Search | By handle | Type in search | Matching vendors | ⬜ |
| VND-008 | Delete | Remove vendor | Delete vendor | Vendor removed | ⬜ |

## 3.6 Analytics

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| ANA-001 | View | Dashboard | Navigate to Analytics | Charts and metrics | ⬜ |
| ANA-002 | Filter | Date range | Select date range | Filtered data | ⬜ |
| ANA-003 | Filter | By department | Select department | Dept analytics | ⬜ |
| ANA-004 | Access | Without permission | Login as Agent → Try Analytics | Access denied | ⬜ |

## 3.7 Notifications

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| NTF-001 | Bell | Unread count | Check notification bell | Badge shows count | ⬜ |
| NTF-002 | View | Notification list | Click bell | List of notifications | ⬜ |
| NTF-003 | Mark | As read | Click notification | Marked as read | ⬜ |
| NTF-004 | Trigger | Ticket assigned | Assign ticket to user | User gets notification | ⬜ |
| NTF-005 | Trigger | Comment mention | @mention user | User gets notification | ⬜ |
| NTF-006 | Trigger | Ticket resolved | Resolve ticket | Creator notified | ⬜ |

## 3.8 Navigation & UI

| ID | Feature | Test Case | Steps | Expected | Status |
|----|---------|-----------|-------|----------|--------|
| NAV-001 | Labs | Dropdown visible | Check nav (with perms) | Labs dropdown visible | ⬜ |
| NAV-002 | Labs | Items based on perms | Check dropdown items | Only permitted items | ⬜ |
| NAV-003 | Responsive | Mobile view | Resize to mobile | Navigation adapts | ⬜ |
| NAV-004 | Responsive | Tablet view | Resize to tablet | Layout adjusts | ⬜ |
| NAV-005 | Profile | Dropdown | Click avatar | Profile menu opens | ⬜ |
| NAV-006 | Back | Navigation | Click Back button | Returns to dashboard | ⬜ |
| NAV-007 | Toast | Success message | Complete action | Toast appears | ⬜ |
| NAV-008 | Toast | Error message | Cause error | Error toast appears | ⬜ |

---

# 4. Permission Matrix

## 4.1 Role vs Permission Grid

| Permission | Owner | Admin | Head | Manager | Lead | Associate | Agent |
|------------|:-----:|:-----:|:----:|:-------:|:----:|:---------:|:-----:|
| view:dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view:tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create:tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️* |
| edit:tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| delete:tickets | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view:all_tickets | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view:department_tickets | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| view:team_tickets | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| view:assigned_tickets | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| view:users | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| create:users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit:users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete:users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view:vendors | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| create:vendors | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit:vendors | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete:vendors | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view:analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| view:config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit:config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| view:roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| create:roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit:roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete:roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **⚠️* Agent create:tickets:** Only Seller Support and Customer Support agents can create tickets. Other department agents cannot.

## 4.2 Permission Verification Tests

| ID | Test | How to Verify | Status |
|----|------|---------------|--------|
| PERM-001 | Owner has all permissions | Login as Owner, verify all features accessible | ⬜ |
| PERM-002 | Admin cannot delete | Login as Admin, verify no delete options for users/roles | ⬜ |
| PERM-003 | Head sees department only | Login as Head, verify ticket visibility limited | ⬜ |
| PERM-004 | Manager no analytics | Login as Manager, verify Analytics not in nav | ⬜ |
| PERM-005 | Lead sees team only | Login as Lead, verify team-scoped view | ⬜ |
| PERM-006 | Associate assigned only | Login as Associate, verify My Tickets scope | ⬜ |
| PERM-007 | Agent dept scoped | Login as Agent, verify department scope | ⬜ |
| PERM-008 | SS Agent can create | Login as Seller Support Agent, verify New Ticket | ⬜ |
| PERM-009 | CS Agent can create | Login as Customer Support Agent, verify New Ticket | ⬜ |
| PERM-010 | Other Agent no create | Login as Tech Agent, verify no New Ticket | ⬜ |

---

# 5. Test Execution Tracker

## 5.1 Summary Dashboard

| Category | Total | Passed | Failed | Blocked | Not Run |
|----------|:-----:|:------:|:------:|:-------:|:-------:|
| Role-Based (Owner) | 13 | | | | |
| Role-Based (Admin) | 9 | | | | |
| Role-Based (Head) | 9 | | | | |
| Role-Based (Manager) | 6 | | | | |
| Role-Based (Lead) | 5 | | | | |
| Role-Based (Associate) | 5 | | | | |
| Role-Based (Agent) | 12 | | | | |
| Department Tests | 18 | | | | |
| Feature - Auth | 6 | | | | |
| Feature - Tickets | 12 | | | | |
| Feature - Users | 10 | | | | |
| Feature - Roles | 17 | | | | |
| Feature - Vendors | 8 | | | | |
| Feature - Analytics | 4 | | | | |
| Feature - Notifications | 6 | | | | |
| Feature - Navigation | 8 | | | | |
| Permission Verification | 10 | | | | |
| **TOTAL** | **158** | | | | |

## 5.2 Test Execution Log

| Date | Tester | Tests Executed | Pass | Fail | Notes |
|------|--------|----------------|------|------|-------|
| | | | | | |
| | | | | | |
| | | | | | |

## 5.3 Defects Found

| ID | Test Case | Description | Severity | Status |
|----|-----------|-------------|----------|--------|
| | | | | |
| | | | | |

---

# 6. Sign-Off

## 6.1 Test Completion Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Product Owner | | | |
| Development Lead | | | |
| Business Analyst | | | |

## 6.2 UAT Acceptance Criteria

- [ ] All critical test cases passed
- [ ] No severity 1 (Critical) defects open
- [ ] No severity 2 (High) defects open that block core functionality
- [ ] All role-based access controls verified
- [ ] All department restrictions verified
- [ ] Performance acceptable under normal load

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not Tested |
| ✅ | Passed |
| ❌ | Failed |
| ⏸️ | Blocked |
| ⚠️ | Conditional |

---

*Document generated for Information Portal UAT*
