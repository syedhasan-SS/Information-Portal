/**
 * Sync Slack User IDs with Information Portal Users
 *
 * This script fetches all Slack users and matches them with portal users by email.
 * It updates the slack_user_id field for matched users.
 *
 * Usage: npx tsx server/scripts/sync-slack-users.ts
 */

import { WebClient } from "@slack/web-api";
import { storage } from "../storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function syncSlackUserIds() {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;

    if (!botToken || botToken === 'xoxb-your-bot-token-here') {
      console.error("❌ SLACK_BOT_TOKEN not configured in .env");
      console.error("   Get your token from: https://api.slack.com/apps");
      process.exit(1);
    }

    console.log("🔄 Starting Slack user sync...\n");

    const client = new WebClient(botToken);

    // Get all Slack users
    console.log("📡 Fetching Slack users...");
    const result = await client.users.list();
    const slackUsers = (result.members || []) as any[];

    console.log(`✅ Found ${slackUsers.length} Slack users\n`);

    // Filter out bots and deleted users
    const activeSlackUsers = slackUsers.filter(
      (su) => !su.is_bot && !su.deleted && su.profile?.email
    );

    console.log(`✅ ${activeSlackUsers.length} active users with emails\n`);

    // Get all portal users
    console.log("📡 Fetching portal users...");
    const portalUsers = await storage.getUsers();
    console.log(`✅ Found ${portalUsers.length} portal users\n`);

    console.log("🔗 Matching users by email...\n");

    let matchedCount = 0;
    let notFoundCount = 0;
    let updatedCount = 0;

    for (const portalUser of portalUsers) {
      const slackUser = activeSlackUsers.find(
        (su: any) =>
          su.profile?.email?.toLowerCase() === portalUser.email.toLowerCase()
      );

      if (slackUser) {
        matchedCount++;

        // Check if already up to date
        if (portalUser.slackUserId === slackUser.id) {
          console.log(`ℹ️  ${portalUser.email} → ${slackUser.id} (already set)`);
          continue;
        }

        // Update slack_user_id
        await storage.db
          .update(users)
          .set({ slackUserId: slackUser.id })
          .where(eq(users.id, portalUser.id));

        updatedCount++;
        console.log(
          `✅ ${portalUser.email} → ${slackUser.id} (${slackUser.profile?.display_name || slackUser.profile?.real_name})`
        );
      } else {
        notFoundCount++;
        console.log(`⚠️  No Slack user found for ${portalUser.email}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SYNC SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total portal users:       ${portalUsers.length}`);
    console.log(`Matched with Slack:       ${matchedCount}`);
    console.log(`Updated:                  ${updatedCount}`);
    console.log(`Already synced:           ${matchedCount - updatedCount}`);
    console.log(`Not found in Slack:       ${notFoundCount}`);
    console.log("=".repeat(60));

    if (notFoundCount > 0) {
      console.log("\n⚠️  Some users not found in Slack:");
      console.log("   - They may not be in your Slack workspace");
      console.log("   - Their email in portal may differ from Slack email");
      console.log("   - You can manually set their slack_user_id in the database");
    }

    console.log("\n✅ Slack user ID sync complete!");
    console.log(
      "\n💡 Next step: Users with Slack IDs will now receive proper @mentions!"
    );
  } catch (error: any) {
    console.error("\n❌ Error syncing Slack user IDs:");
    console.error(error.message);

    if (error.data?.error === "missing_scope") {
      console.error("\n⚠️  Missing required Slack API scope!");
      console.error("   Add 'users:read' and 'users:read.email' scopes:");
      console.error("   1. Go to https://api.slack.com/apps");
      console.error("   2. Select your app");
      console.error("   3. Go to OAuth & Permissions");
      console.error("   4. Add Bot Token Scopes: users:read, users:read.email");
      console.error("   5. Reinstall app to workspace");
    }

    process.exit(1);
  }
}

// Run the sync
syncSlackUserIds();
