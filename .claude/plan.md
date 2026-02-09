# Implementation Plan: Dynamic Page & Feature Permissions System

## Overview
Create a comprehensive permissions management system that allows Admins/Owners to control:
1. **Page-level access** (role-based with user overrides)
2. **Feature-level controls** (CRUD actions, exports, UI sections, custom features)
3. **Centralized admin panel** for management
4. **Dynamic UI** that hides/shows elements based on permissions

## User Requirements
- ✅ Both role-based AND user-specific overrides
- ✅ Control CRUD actions, exports, UI sections, and custom features
- ✅ Centralized Admin Panel interface
- ✅ Hide disabled items from navigation + show access denied if accessed directly

---

## Architecture Design

### 1. Database Schema Extensions

#### New Table: `page_permissions`
```sql
CREATE TABLE page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR NOT NULL UNIQUE,           -- e.g., "tickets", "analytics", "users"
  display_name VARCHAR NOT NULL,              -- e.g., "Tickets", "Analytics Dashboard"
  description TEXT,
  category VARCHAR,                            -- e.g., "Core", "Admin", "Reports"
  is_active BOOLEAN DEFAULT true,
  default_enabled BOOLEAN DEFAULT true,        -- Default state for new roles
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### New Table: `page_features`
```sql
CREATE TABLE page_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR NOT NULL,                   -- Foreign key to page_permissions.page_key
  feature_key VARCHAR NOT NULL,                -- e.g., "create", "delete", "export", "bulk_actions"
  display_name VARCHAR NOT NULL,               -- e.g., "Create Ticket", "Delete Action"
  description TEXT,
  feature_type VARCHAR NOT NULL,               -- "crud", "export", "ui_section", "custom"
  is_active BOOLEAN DEFAULT true,
  default_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_key, feature_key)
);
```

#### New Table: `role_page_access`
```sql
CREATE TABLE role_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, page_key)
);

CREATE INDEX idx_role_page_access_role ON role_page_access(role_id);
CREATE INDEX idx_role_page_access_page ON role_page_access(page_key);
```

#### New Table: `role_feature_access`
```sql
CREATE TABLE role_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  feature_key VARCHAR NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, page_key, feature_key)
);

CREATE INDEX idx_role_feature_access_role ON role_feature_access(role_id);
CREATE INDEX idx_role_feature_access_page_feature ON role_feature_access(page_key, feature_key);
```

#### New Table: `user_page_access_overrides`
```sql
CREATE TABLE user_page_access_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL,                 -- Explicit override (true = grant, false = deny)
  reason TEXT,                                  -- Optional: why this override exists
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

CREATE INDEX idx_user_page_overrides_user ON user_page_access_overrides(user_id);
```

#### New Table: `user_feature_access_overrides`
```sql
CREATE TABLE user_feature_access_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  feature_key VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, page_key, feature_key)
);

CREATE INDEX idx_user_feature_overrides_user ON user_feature_access_overrides(user_id);
```

---

### 2. Pre-Defined Pages & Features Structure

#### Pages to Manage:
```typescript
const DEFAULT_PAGES = [
  { key: "dashboard", name: "Dashboard", category: "Core" },
  { key: "tickets", name: "Tickets", category: "Core" },
  { key: "users", name: "User Management", category: "Admin" },
  { key: "vendors", name: "Vendor Management", category: "Admin" },
  { key: "analytics", name: "Analytics", category: "Reports" },
  { key: "attendance", name: "Attendance", category: "HR" },
  { key: "attendance-checkin", name: "Check In/Out", category: "HR" },
  { key: "attendance-team", name: "Team Status", category: "HR" },
  { key: "leave-management", name: "Leave Management", category: "HR" },
  { key: "org-hierarchy", name: "Org Hierarchy", category: "Admin" },
  { key: "ticket-config", name: "Ticket Configuration", category: "Settings" },
  { key: "routing-config", name: "Routing Rules", category: "Settings" },
  { key: "roles", name: "Roles & Permissions", category: "Settings" },
  { key: "admin-tools", name: "Admin Tools", category: "Settings" },
  { key: "product-requests", name: "Product Requests", category: "Product" },
];
```

#### Features per Page:
```typescript
const DEFAULT_FEATURES = {
  tickets: [
    { key: "create", name: "Create Ticket", type: "crud" },
    { key: "edit", name: "Edit Ticket", type: "crud" },
    { key: "delete", name: "Delete Ticket", type: "crud" },
    { key: "export", name: "Export CSV", type: "export" },
    { key: "bulk_actions", name: "Bulk Actions", type: "custom" },
    { key: "view_all", name: "View All Tickets", type: "custom" },
    { key: "view_department", name: "View Department Tickets", type: "custom" },
    { key: "view_assigned", name: "View Assigned Tickets", type: "custom" },
  ],
  users: [
    { key: "create", name: "Create User", type: "crud" },
    { key: "edit", name: "Edit User", type: "crud" },
    { key: "delete", name: "Delete User", type: "crud" },
    { key: "export", name: "Export Users", type: "export" },
    { key: "bulk_invite", name: "Bulk Invite", type: "custom" },
    { key: "view_all", name: "View All Users", type: "custom" },
    { key: "view_department", name: "View Department Users", type: "custom" },
  ],
  vendors: [
    { key: "create", name: "Create Vendor", type: "crud" },
    { key: "edit", name: "Edit Vendor", type: "crud" },
    { key: "delete", name: "Delete Vendor", type: "crud" },
    { key: "export", name: "Export Vendors", type: "export" },
  ],
  analytics: [
    { key: "view_dashboard", name: "View Dashboard", type: "ui_section" },
    { key: "view_reports", name: "View Reports", type: "ui_section" },
    { key: "export_reports", name: "Export Reports", type: "export" },
  ],
  attendance: [
    { key: "view_history", name: "View History", type: "custom" },
    { key: "export", name: "Export Reports", type: "export" },
    { key: "view_all", name: "View All Attendance", type: "custom" },
    { key: "view_department", name: "View Department Attendance", type: "custom" },
  ],
  "attendance-checkin": [
    { key: "checkin", name: "Check In", type: "crud" },
    { key: "checkout", name: "Check Out", type: "crud" },
    { key: "break", name: "Break Management", type: "custom" },
  ],
  "attendance-team": [
    { key: "view_team", name: "View Team Status", type: "custom" },
    { key: "view_department", name: "View Department Status", type: "custom" },
  ],
  "leave-management": [
    { key: "create", name: "Submit Leave Request", type: "crud" },
    { key: "approve", name: "Approve/Reject Leave", type: "custom" },
    { key: "view_all", name: "View All Requests", type: "custom" },
  ],
  "org-hierarchy": [
    { key: "view_hierarchy", name: "View Hierarchy", type: "ui_section" },
    { key: "edit_structure", name: "Edit Structure", type: "crud" },
  ],
  roles: [
    { key: "create", name: "Create Role", type: "crud" },
    { key: "edit", name: "Edit Role", type: "crud" },
    { key: "delete", name: "Delete Role", type: "crud" },
    { key: "assign_permissions", name: "Assign Permissions", type: "custom" },
  ],
  // ... more pages
};
```

---

### 3. Frontend Hook: `usePageAccess`

```typescript
// client/src/hooks/use-page-access.tsx
export function usePageAccess() {
  const { user } = useAuth();

  // Cache page/feature access
  const { data: pageAccess } = useQuery({
    queryKey: ['page-access', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/page-access/my-access', {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      return res.json(); // { pages: {...}, features: {...} }
    },
    enabled: !!user,
  });

  const canAccessPage = (pageKey: string): boolean => {
    return pageAccess?.pages?.[pageKey] ?? false;
  };

  const canAccessFeature = (pageKey: string, featureKey: string): boolean => {
    return pageAccess?.features?.[pageKey]?.[featureKey] ?? false;
  };

  const getAccessiblePages = (): string[] => {
    return Object.keys(pageAccess?.pages || {}).filter(key => pageAccess.pages[key]);
  };

  return { canAccessPage, canAccessFeature, getAccessiblePages, pageAccess };
}
```

---

### 4. Enhanced ProtectedRoute Component

```typescript
// Update client/src/components/ProtectedRoute.tsx
<ProtectedRoute
  pageKey="tickets"  // New prop for page-level check
  requiredPermission="view:tickets"  // Keep existing permission check
>
  <TicketsPage />
</ProtectedRoute>
```

Logic:
1. Check authentication
2. Check `pageKey` access if provided (via usePageAccess)
3. Check traditional permissions if provided
4. Show access denied or render children

---

### 5. Feature Guard Component

```typescript
// client/src/components/FeatureGuard.tsx
<FeatureGuard pageKey="tickets" featureKey="create">
  <Button>Create Ticket</Button>
</FeatureGuard>
```

Returns `null` if user can't access the feature (hides it completely).

---

### 6. Backend API Endpoints

#### Page Access Management
```
GET    /api/page-access/pages                    - List all defined pages
GET    /api/page-access/features/:pageKey        - Get features for a page
POST   /api/page-access/pages                    - Create custom page definition
PUT    /api/page-access/pages/:pageKey           - Update page definition
```

#### Role Page/Feature Configuration
```
GET    /api/page-access/roles/:roleId            - Get role's page/feature access
PUT    /api/page-access/roles/:roleId/pages      - Bulk update role's page access
PUT    /api/page-access/roles/:roleId/features   - Bulk update role's feature access
```

#### User Override Management
```
GET    /api/page-access/users/:userId            - Get user's overrides
PUT    /api/page-access/users/:userId/pages      - Set user's page overrides
PUT    /api/page-access/users/:userId/features   - Set user's feature overrides
DELETE /api/page-access/users/:userId/overrides  - Clear user's overrides
```

#### Current User Access
```
GET    /api/page-access/my-access                - Get current user's effective access
                                                   (resolves role + user overrides)
```

---

### 7. Admin Panel UI Structure

#### Main Page: `/admin/page-permissions`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Page & Feature Permissions                                 │
│  Configure access control for pages and features by role    │
├─────────────────────────────────────────────────────────────┤
│  [View By: Role ▼]  [Category: All ▼]  [Search...]         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ROLE: Admin                                    [Edit Mode] │
│                                                              │
│  Core Pages                                                  │
│  ✅ Dashboard          [Configure Features →]               │
│  ✅ Tickets            [Configure Features →]               │
│                                                              │
│  Admin Pages                                                 │
│  ✅ Users              [Configure Features →]               │
│  ✅ Vendors            [Configure Features →]               │
│  ✅ Org Hierarchy      [Configure Features →]               │
│                                                              │
│  Reports                                                     │
│  ✅ Analytics          [Configure Features →]               │
│                                                              │
│  HR                                                          │
│  ✅ Attendance         [Configure Features →]               │
│  ✅ Check In/Out       [Configure Features →]               │
│  ✅ Team Status        [Configure Features →]               │
│  ✅ Leave Management   [Configure Features →]               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Feature Configuration Modal** (when clicking "Configure Features"):
```
┌─────────────────────────────────────────────────────────────┐
│  Configure Features: Tickets (for Admin role)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CRUD Actions                                                │
│  ✅ Create Ticket                                            │
│  ✅ Edit Ticket                                              │
│  ✅ Delete Ticket                                            │
│                                                              │
│  Export Functions                                            │
│  ✅ Export CSV                                               │
│                                                              │
│  Custom Features                                             │
│  ✅ Bulk Actions                                             │
│  ✅ View All Tickets                                         │
│  ✅ View Department Tickets                                  │
│  ✅ View Assigned Tickets                                    │
│                                                              │
│              [Cancel]  [Save Changes]                        │
└─────────────────────────────────────────────────────────────┘
```

**User Override Panel**:
```
┌─────────────────────────────────────────────────────────────┐
│  User-Specific Overrides                                     │
├─────────────────────────────────────────────────────────────┤
│  [Select User: John Doe ▼]                 [Add Override +] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Overrides for: John Doe (Manager)                  │
│                                                              │
│  ❌ Analytics          [Reason: Temporary restriction]      │
│     └─ Expires: Never                      [Remove]         │
│                                                              │
│  ✅ Users > Delete User [Reason: Special permission]        │
│     └─ Granted by: Admin  Created: 2 days ago  [Remove]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 8. Navigation Menu Dynamic Filtering

Update `Sidebar.tsx` or navigation component:

```typescript
const { canAccessPage } = usePageAccess();

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'tickets', label: 'Tickets', path: '/tickets' },
  { key: 'users', label: 'Users', path: '/users' },
  // ... more items
].filter(item => canAccessPage(item.key));
```

---

### 9. Permission Resolution Logic

**Priority Order**:
1. **User Override** (highest priority) - if exists, use this
2. **Role-Based Access** - check role's page/feature access
3. **Default Setting** - use page/feature's default_enabled flag

**Backend Method**:
```typescript
async function resolvePageAccess(userId: string, pageKey: string): Promise<boolean> {
  // 1. Check user override
  const override = await db.getUserPageOverride(userId, pageKey);
  if (override !== null) return override.isEnabled;

  // 2. Check role access
  const user = await db.getUser(userId);
  const roleAccess = await db.getRolePageAccess(user.role, pageKey);
  if (roleAccess !== null) return roleAccess.isEnabled;

  // 3. Use page default
  const page = await db.getPage(pageKey);
  return page?.defaultEnabled ?? true;
}

async function resolveFeatureAccess(userId: string, pageKey: string, featureKey: string): Promise<boolean> {
  // Same logic for features
  // 1. User override
  // 2. Role access
  // 3. Feature default
}
```

---

### 10. Seed Data Script

Create initial pages/features for all existing pages:

```typescript
// server/seed-page-permissions.ts
async function seedPagePermissions() {
  // Insert default pages
  for (const page of DEFAULT_PAGES) {
    await db.upsertPage(page);
  }

  // Insert default features for each page
  for (const [pageKey, features] of Object.entries(DEFAULT_FEATURES)) {
    for (const feature of features) {
      await db.upsertFeature(pageKey, feature);
    }
  }

  // Set default access for all existing roles
  const roles = await db.getRoles();
  for (const role of roles) {
    // Owner/Admin get everything by default
    if (role.name === 'Owner' || role.name === 'Admin') {
      await db.setRoleFullAccess(role.id);
    } else {
      // Others get based on current permission system
      await db.migrateRolePermissionsToPageAccess(role.id);
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Database & Backend (Server-Side)
1. ✅ Create 6 new database tables
2. ✅ Add TypeScript types in `shared/schema.ts`
3. ✅ Add storage methods in `server/storage.ts`
4. ✅ Create API routes for page/feature management
5. ✅ Create seed script for default pages/features
6. ✅ Add permission resolution logic

### Phase 2: Frontend Hooks & Components
7. ✅ Create `usePageAccess` hook
8. ✅ Create `FeatureGuard` component
9. ✅ Update `ProtectedRoute` component
10. ✅ Update navigation/sidebar filtering

### Phase 3: Admin Panel UI
11. ✅ Create main admin panel page (`/admin/page-permissions`)
12. ✅ Build role-based page/feature toggle UI
13. ✅ Build user override management UI
14. ✅ Add feature configuration modal

### Phase 4: Integration
15. ✅ Add `pageKey` prop to all route definitions
16. ✅ Wrap CRUD buttons with `FeatureGuard`
17. ✅ Wrap export buttons with `FeatureGuard`
18. ✅ Test across all pages
19. ✅ Document for administrators

---

## Migration Strategy

1. **No Breaking Changes**: Existing permission system continues to work
2. **Gradual Rollout**: Page access defaults to existing permissions initially
3. **Admin Control**: Only Owner/Admin can access new admin panel
4. **Backward Compatible**: If page/feature not configured, defaults to "enabled"

---

## Security Considerations

1. **Owner/Admin Only**: Only Owner and Admin roles can manage page permissions
2. **Audit Trail**: Log all permission changes with who made them and when
3. **Database Validation**: Backend validates all access checks, frontend is just UI
4. **No Bypass**: Users can't bypass by manipulating URLs (backend checks)
5. **Session Management**: Permissions refresh on login/logout

---

## Example Usage Scenarios

### Scenario 1: Disable Analytics for Managers
1. Admin goes to Page Permissions panel
2. Selects "Manager" role
3. Finds "Analytics" page
4. Toggles OFF
5. All Managers lose access immediately

### Scenario 2: Grant Special Permission to One User
1. Admin goes to User Overrides section
2. Selects user "Jane Doe (Agent)"
3. Clicks "Add Override"
4. Grants "Users > Delete User" permission
5. Adds reason: "Temporary cleanup duty"
6. Jane can now delete users despite being an Agent

### Scenario 3: Disable Export for All Agents
1. Admin selects "Agent" role
2. Opens "Tickets" page features
3. Unchecks "Export CSV"
4. Saves
5. All Agents see Tickets page but no Export button

---

## Files to Create/Modify

### New Files (12):
1. `shared/schema-page-access.ts` - Database schemas
2. `server/storage-page-access.ts` - Database methods
3. `server/routes-page-access.ts` - API endpoints
4. `server/seed-page-permissions.ts` - Seed script
5. `client/src/hooks/use-page-access.tsx` - Hook
6. `client/src/components/FeatureGuard.tsx` - Component
7. `client/src/pages/admin/page-permissions.tsx` - Admin UI
8. `client/src/pages/admin/user-overrides.tsx` - User override UI
9. `client/src/components/admin/RolePageMatrix.tsx` - Matrix view
10. `client/src/components/admin/FeatureConfigModal.tsx` - Modal
11. `client/src/components/admin/UserOverridePanel.tsx` - Override panel
12. `migrations/create-page-access-tables.sql` - Migration

### Modified Files (5):
1. `shared/schema.ts` - Import page access schemas
2. `server/storage.ts` - Import page access methods
3. `server/routes.ts` - Import page access routes
4. `client/src/components/ProtectedRoute.tsx` - Add pageKey support
5. `client/src/App.tsx` - Add pageKey to routes

---

## Estimated Implementation Time
- Phase 1 (Backend): 4-6 hours
- Phase 2 (Frontend Hooks): 2-3 hours
- Phase 3 (Admin UI): 5-7 hours
- Phase 4 (Integration): 3-4 hours
- **Total**: 14-20 hours of development

---

## Benefits

✅ **Granular Control**: Admins control every page and feature
✅ **Flexible**: Role-based defaults + user-specific overrides
✅ **User-Friendly**: Centralized admin panel for easy management
✅ **Secure**: Backend validation prevents bypass
✅ **Clean UI**: Unauthorized items hidden from view
✅ **Audit Ready**: Track all permission changes
✅ **Scalable**: Easy to add new pages/features
✅ **No Breaking Changes**: Works alongside existing permissions
