/**
 * Run Activity Log Migration
 *
 * This script creates the ticket_activity_log table in the production database.
 * Run this once after deploying the activity log feature.
 *
 * Usage: tsx script/run-activity-log-migration.ts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if table already exists
    const checkTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ticket_activity_log'
      );
    `);

    if (checkTableResult.rows[0].exists) {
      console.log('ℹ️  Table ticket_activity_log already exists. Skipping migration.');
      return;
    }

    // Read migration file
    const sqlPath = join(__dirname, '..', 'migrations', 'create-ticket-activity-log.sql');
    console.log('📄 Reading migration file:', sqlPath);
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('🔄 Running migration...\n');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - ticket_activity_log table created');
    console.log('   - Indexes created for ticketId and createdAt');
    console.log('\n🎉 Activity log feature is now ready to use!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
