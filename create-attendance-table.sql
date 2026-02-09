-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Login (Check-in) Details
  login_time TIMESTAMP NOT NULL,
  login_location JSONB,
  login_device_info TEXT,

  -- Logout (Check-out) Details
  logout_time TIMESTAMP,
  logout_location JSONB,
  logout_device_info TEXT,

  -- Calculated Fields
  work_duration INTEGER, -- Duration in minutes
  status TEXT NOT NULL DEFAULT 'active',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS attendance_user_id_idx ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS attendance_login_time_idx ON attendance_records(login_time);
CREATE INDEX IF NOT EXISTS attendance_status_idx ON attendance_records(status);

-- Verify table was created
SELECT 'Table created successfully!' AS message;
