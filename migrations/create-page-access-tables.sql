-- Page Access Control System
-- Allows admins to control page and feature access by role with user-specific overrides

-- Table: page_permissions
-- Stores all available pages in the system
CREATE TABLE IF NOT EXISTS page_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  is_active BOOLEAN DEFAULT true,
  default_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: page_features
-- Stores all features within each page
CREATE TABLE IF NOT EXISTS page_features (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR NOT NULL,
  feature_key VARCHAR NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  feature_type VARCHAR NOT NULL CHECK (feature_type IN ('crud', 'export', 'ui_section', 'custom')),
  is_active BOOLEAN DEFAULT true,
  default_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(page_key, feature_key)
);

-- Table: role_page_access
-- Defines which pages each role can access
CREATE TABLE IF NOT EXISTS role_page_access (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_role_page_access_role ON role_page_access(role_id);
CREATE INDEX IF NOT EXISTS idx_role_page_access_page ON role_page_access(page_key);

-- Table: role_feature_access
-- Defines which features within pages each role can access
CREATE TABLE IF NOT EXISTS role_feature_access (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  feature_key VARCHAR NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, page_key, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_role_feature_access_role ON role_feature_access(role_id);
CREATE INDEX IF NOT EXISTS idx_role_feature_access_page_feature ON role_feature_access(page_key, feature_key);

-- Table: user_page_access_overrides
-- User-specific overrides for page access (overrides role settings)
CREATE TABLE IF NOT EXISTS user_page_access_overrides (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_user_page_overrides_user ON user_page_access_overrides(user_id);

-- Table: user_feature_access_overrides
-- User-specific overrides for feature access (overrides role settings)
CREATE TABLE IF NOT EXISTS user_feature_access_overrides (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key VARCHAR NOT NULL,
  feature_key VARCHAR NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, page_key, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_user ON user_feature_access_overrides(user_id);

-- Insert default pages
INSERT INTO page_permissions (page_key, display_name, category, description) VALUES
  ('dashboard', 'Dashboard', 'Core', 'Main dashboard and overview'),
  ('tickets', 'Tickets', 'Core', 'Ticket management and tracking'),
  ('users', 'User Management', 'Admin', 'Manage system users'),
  ('vendors', 'Vendor Management', 'Admin', 'Manage vendors and suppliers'),
  ('analytics', 'Analytics', 'Reports', 'View analytics and reports'),
  ('attendance', 'Attendance Reports', 'HR', 'Attendance history and reports'),
  ('attendance-checkin', 'Check In/Out', 'HR', 'Daily check-in and check-out'),
  ('attendance-team', 'Team Status', 'HR', 'Real-time team attendance status'),
  ('leave-management', 'Leave Management', 'HR', 'Leave requests and approvals'),
  ('org-hierarchy', 'Org Hierarchy', 'Admin', 'Organization structure'),
  ('ticket-config', 'Ticket Configuration', 'Settings', 'Configure ticket system'),
  ('routing-config', 'Routing Rules', 'Settings', 'Configure ticket routing'),
  ('roles', 'Roles & Permissions', 'Settings', 'Manage roles and permissions'),
  ('admin-tools', 'Admin Tools', 'Settings', 'Administrative tools'),
  ('product-requests', 'Product Requests', 'Product', 'Product request management')
ON CONFLICT (page_key) DO NOTHING;

-- Insert default features for tickets page
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('tickets', 'create', 'Create Ticket', 'crud', 'Create new tickets'),
  ('tickets', 'edit', 'Edit Ticket', 'crud', 'Edit existing tickets'),
  ('tickets', 'delete', 'Delete Ticket', 'crud', 'Delete tickets'),
  ('tickets', 'export', 'Export CSV', 'export', 'Export tickets to CSV'),
  ('tickets', 'bulk_actions', 'Bulk Actions', 'custom', 'Perform bulk operations on tickets'),
  ('tickets', 'view_all', 'View All Tickets', 'custom', 'View all tickets in system'),
  ('tickets', 'view_department', 'View Department Tickets', 'custom', 'View tickets in user department'),
  ('tickets', 'view_assigned', 'View Assigned Tickets', 'custom', 'View tickets assigned to user')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Insert default features for users page
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('users', 'create', 'Create User', 'crud', 'Create new users'),
  ('users', 'edit', 'Edit User', 'crud', 'Edit user details'),
  ('users', 'delete', 'Delete User', 'crud', 'Delete users'),
  ('users', 'export', 'Export Users', 'export', 'Export user list'),
  ('users', 'bulk_invite', 'Bulk Invite', 'custom', 'Bulk invite users'),
  ('users', 'view_all', 'View All Users', 'custom', 'View all system users'),
  ('users', 'view_department', 'View Department Users', 'custom', 'View users in department')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Insert default features for vendors page
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('vendors', 'create', 'Create Vendor', 'crud', 'Create new vendors'),
  ('vendors', 'edit', 'Edit Vendor', 'crud', 'Edit vendor details'),
  ('vendors', 'delete', 'Delete Vendor', 'crud', 'Delete vendors'),
  ('vendors', 'export', 'Export Vendors', 'export', 'Export vendor list')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Insert default features for analytics page
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('analytics', 'view_dashboard', 'View Dashboard', 'ui_section', 'View analytics dashboard'),
  ('analytics', 'view_reports', 'View Reports', 'ui_section', 'View detailed reports'),
  ('analytics', 'export_reports', 'Export Reports', 'export', 'Export analytics data')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Insert default features for attendance pages
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('attendance', 'view_history', 'View History', 'custom', 'View attendance history'),
  ('attendance', 'export', 'Export Reports', 'export', 'Export attendance reports'),
  ('attendance', 'view_all', 'View All Attendance', 'custom', 'View all user attendance'),
  ('attendance', 'view_department', 'View Department Attendance', 'custom', 'View department attendance'),
  ('attendance-checkin', 'checkin', 'Check In', 'crud', 'Perform check-in'),
  ('attendance-checkin', 'checkout', 'Check Out', 'crud', 'Perform check-out'),
  ('attendance-checkin', 'break', 'Break Management', 'custom', 'Manage break times'),
  ('attendance-team', 'view_team', 'View Team Status', 'custom', 'View team attendance status'),
  ('attendance-team', 'view_department', 'View Department Status', 'custom', 'View department status'),
  ('leave-management', 'create', 'Submit Leave Request', 'crud', 'Submit new leave requests'),
  ('leave-management', 'approve', 'Approve/Reject Leave', 'custom', 'Approve or reject leave requests'),
  ('leave-management', 'view_all', 'View All Requests', 'custom', 'View all leave requests')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Insert default features for roles page
INSERT INTO page_features (page_key, feature_key, display_name, feature_type, description) VALUES
  ('roles', 'create', 'Create Role', 'crud', 'Create new roles'),
  ('roles', 'edit', 'Edit Role', 'crud', 'Edit role details'),
  ('roles', 'delete', 'Delete Role', 'crud', 'Delete roles'),
  ('roles', 'assign_permissions', 'Assign Permissions', 'custom', 'Assign permissions to roles')
ON CONFLICT (page_key, feature_key) DO NOTHING;

-- Grant full access to Owner and Admin roles by default
-- This ensures they can access everything immediately after migration
INSERT INTO role_page_access (role_id, page_key, is_enabled)
SELECT r.id, p.page_key, true
FROM roles r
CROSS JOIN page_permissions p
WHERE r.name IN ('Owner', 'Admin')
ON CONFLICT (role_id, page_key) DO NOTHING;

INSERT INTO role_feature_access (role_id, page_key, feature_key, is_enabled)
SELECT r.id, f.page_key, f.feature_key, true
FROM roles r
CROSS JOIN page_features f
WHERE r.name IN ('Owner', 'Admin')
ON CONFLICT (role_id, page_key, feature_key) DO NOTHING;

-- Verification query
SELECT 'Page Access Control tables created successfully!' AS message,
       (SELECT COUNT(*) FROM page_permissions) AS pages_count,
       (SELECT COUNT(*) FROM page_features) AS features_count,
       (SELECT COUNT(*) FROM role_page_access) AS role_page_access_count,
       (SELECT COUNT(*) FROM role_feature_access) AS role_feature_access_count;
