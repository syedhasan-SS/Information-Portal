-- Migration: Add user_column_preferences table
-- This table stores user-specific column visibility preferences for the ticket list

CREATE TABLE IF NOT EXISTS user_column_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visible_columns TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ucp_user_id_idx UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS ucp_user_idx ON user_column_preferences(user_id);

-- Set default columns for existing users based on their department type
-- Seller Support default columns: ticketId, vendor, department, category, issueType, priority, status, assignee, slaDue, aging, lastUpdated, actions
-- Customer Support default columns: ticketId, customer, department, category, issueType, priority, status, assignee, slaDue, aging, lastUpdated, actions

INSERT INTO user_column_preferences (user_id, visible_columns)
SELECT
  u.id,
  CASE
    WHEN u.department_type = 'Seller Support' THEN
      ARRAY['ticketId', 'vendor', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
    WHEN u.department_type = 'Customer Support' THEN
      ARRAY['ticketId', 'customer', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
    ELSE
      ARRAY['ticketId', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
  END as visible_columns
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_column_preferences ucp WHERE ucp.user_id = u.id
);
