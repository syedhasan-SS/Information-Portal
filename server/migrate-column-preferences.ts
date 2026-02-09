import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateColumnPreferences() {
  console.log("🚀 Starting user column preferences migration...");

  try {
    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_column_preferences (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        visible_columns TEXT[] NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT ucp_user_id_idx UNIQUE (user_id)
      )
    `);
    console.log("✅ Created user_column_preferences table");

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS ucp_user_idx ON user_column_preferences(user_id)
    `);
    console.log("✅ Created index on user_id");

    // Insert default preferences for existing users
    await db.execute(sql`
      INSERT INTO user_column_preferences (user_id, visible_columns)
      SELECT
        u.id,
        CASE
          WHEN u.sub_department = 'Seller Support' THEN
            ARRAY['ticketId', 'vendor', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
          WHEN u.sub_department = 'Customer Support' THEN
            ARRAY['ticketId', 'customer', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
          ELSE
            ARRAY['ticketId', 'department', 'category', 'issueType', 'priority', 'status', 'assignee', 'slaDue', 'aging', 'lastUpdated', 'source', 'actions']
        END as visible_columns
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_column_preferences ucp WHERE ucp.user_id = u.id
      )
    `);
    console.log("✅ Set default column preferences for existing users");

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrateColumnPreferences();
