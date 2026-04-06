-- Add slack_ts column to comments table for proper Slack deduplication.
-- Stores the Slack message timestamp so the sync endpoint can check
-- "has this Slack message already been imported?" directly on the comment
-- rather than relying on the activity log (which was missing it).

ALTER TABLE comments
ADD COLUMN IF NOT EXISTS slack_ts TEXT;

-- Unique index: one portal comment per Slack message per ticket.
-- ON CONFLICT DO NOTHING in the insert will prevent duplicates at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_slack_ts
  ON comments (ticket_id, slack_ts)
  WHERE slack_ts IS NOT NULL;

-- Cleanup: remove duplicate Slack-sourced comments, keeping the oldest one per ticket per body.
-- This cleans up previously duplicated messages caused by the missing slackTs bug.
DELETE FROM comments
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY ticket_id, body, author
        ORDER BY created_at ASC
      ) AS rn
    FROM comments
    WHERE source = 'slack'
      AND slack_ts IS NULL
  ) ranked
  WHERE rn > 1
);
