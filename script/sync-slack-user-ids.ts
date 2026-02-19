/**
 * Sync Slack User IDs from Slack Workspace to Database
 * Maps users by email and stores their Slack User ID for @mentions
 */

import { WebClient } from '@slack/web-api';
import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function syncSlackUserIds() {
  console.log('🔄 Starting Slack User ID Sync...\n');

  // Check for Slack bot token
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ SLACK_BOT_TOKEN not found in .env file');
    console.error('   Please add your Slack bot token to continue.\n');
    process.exit(1);
  }

  const slack = new WebClient(botToken);

  try {
    // Fetch all users from Slack workspace
    console.log('📥 Fetching users from Slack workspace...');
    const result = await slack.users.list();

    if (!result.members) {
      console.error('❌ No members returned from Slack API');
      process.exit(1);
    }

    const slackUsers = result.members.filter(
      (member: any) =>
        !member.deleted &&
        !member.is_bot &&
        member.profile?.email
    );

    console.log(`✅ Found ${slackUsers.length} active Slack users with emails\n`);

    // Fetch all users from database
    console.log('📥 Fetching users from database...');
    const dbUsers = await db.select().from(users);
    console.log(`✅ Found ${dbUsers.length} users in database\n`);

    // Match and update
    console.log('🔄 Matching users by email...\n');

    let matched = 0;
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const dbUser of dbUsers) {
      const slackUser = slackUsers.find(
        (su: any) => su.profile?.email?.toLowerCase() === dbUser.email.toLowerCase()
      );

      if (slackUser) {
        matched++;

        // Check if already up to date
        if (dbUser.slackUserId === slackUser.id) {
          console.log(`⏭️  ${dbUser.email} - Already has correct Slack ID`);
          skipped++;
          continue;
        }

        // Update database
        await db
          .update(users)
          .set({ slackUserId: slackUser.id })
          .where(eq(users.id, dbUser.id));

        console.log(`✅ ${dbUser.email} → ${slackUser.id} (${slackUser.profile?.display_name || slackUser.real_name})`);
        updated++;
      } else {
        console.log(`⚠️  ${dbUser.email} - Not found in Slack workspace`);
        notFound++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Sync Summary:');
    console.log('='.repeat(80));
    console.log(`✅ Total Database Users: ${dbUsers.length}`);
    console.log(`✅ Total Slack Users: ${slackUsers.length}`);
    console.log(`✅ Matched: ${matched}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Already Up-to-Date: ${skipped}`);
    console.log(`⚠️  Not Found in Slack: ${notFound}`);
    console.log('='.repeat(80));

    if (updated > 0) {
      console.log('\n✨ Slack User IDs synced successfully!');
      console.log('   @mentions will now work for matched users.\n');
    } else if (skipped > 0) {
      console.log('\n✨ All users already have Slack IDs!\n');
    }

    if (notFound > 0) {
      console.log(`\n⚠️  ${notFound} users not found in Slack workspace:`);
      console.log('   These users may have different emails in Slack,');
      console.log('   or may not be in your Slack workspace yet.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error syncing Slack User IDs:', error.message);

    if (error.data?.error === 'invalid_auth') {
      console.error('\n   Your SLACK_BOT_TOKEN appears to be invalid.');
      console.error('   Please check your token in the .env file.\n');
    } else if (error.data?.error === 'missing_scope') {
      console.error('\n   Your Slack bot is missing the "users:read" and "users:read.email" scopes.');
      console.error('   Please add these scopes in your Slack app settings.\n');
    }

    process.exit(1);
  }
}

// Run sync
syncSlackUserIds();
