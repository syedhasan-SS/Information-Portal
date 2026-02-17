-- Add slack_user_id column to users table for Slack integration
-- This enables proper @mentions in Slack notifications

ALTER TABLE users
ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- Add index for faster lookups when mapping users to Slack IDs
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);

-- Add comment for documentation
COMMENT ON COLUMN users.slack_user_id IS 'Slack User ID for @mentions in notifications (e.g., U01234ABCD)';
