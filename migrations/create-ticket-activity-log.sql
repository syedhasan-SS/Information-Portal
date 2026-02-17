-- Create ticket activity log table
-- Tracks all changes made to tickets for audit trail and transparency

CREATE TABLE IF NOT EXISTS ticket_activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket reference
  ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  ticket_number VARCHAR NOT NULL,

  -- Activity type
  action VARCHAR NOT NULL CHECK (action IN (
    'created',
    'updated',
    'status_changed',
    'assigned',
    'reassigned',
    'unassigned',
    'priority_changed',
    'department_changed',
    'comment_added',
    'resolved',
    'closed',
    'reopened',
    'tags_updated',
    'field_updated'
  )),

  -- Who performed the action
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR NOT NULL,
  user_name VARCHAR NOT NULL,

  -- What changed
  field_name VARCHAR, -- e.g., 'status', 'assigneeId', 'priority'
  old_value TEXT, -- Previous value (JSON for complex objects)
  new_value TEXT, -- New value (JSON for complex objects)

  -- Additional context
  description TEXT, -- Human-readable description
  metadata JSONB, -- Additional data (e.g., comment text, tag changes)

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON ticket_activity_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_created_at ON ticket_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_action ON ticket_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_user_id ON ticket_activity_log(user_id);

-- Comments
COMMENT ON TABLE ticket_activity_log IS 'Audit trail for all ticket changes and activities';
COMMENT ON COLUMN ticket_activity_log.action IS 'Type of activity/change performed';
COMMENT ON COLUMN ticket_activity_log.field_name IS 'Name of the field that changed (for field_updated action)';
COMMENT ON COLUMN ticket_activity_log.metadata IS 'Additional context like comment text, attachments, etc.';
