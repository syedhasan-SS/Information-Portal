# 🚀 Enhanced Slack Notifications Guide

**Date**: February 17, 2026
**Version**: 2.0 - Enhanced with @mentions, manager notifications, and department channels

---

## 🎯 What's New in Version 2.0

### 1. **Proper Slack @Mentions**
- Users with Slack User IDs will receive actual @mentions in Slack
- This triggers push notifications, desktop alerts, and badge counts
- No more missed notifications!

### 2. **Auto-Manager Notifications**
- When a team member is @mentioned, their manager is automatically notified
- Managers see context: "Your team member was mentioned in ticket..."
- Helps managers stay informed about their team's work

### 3. **Department-Specific Channels**
- Configure separate Slack channels for each department
- Finance tickets → #finance-tickets
- Operations tickets → #operations-tickets
- Reduces noise and improves focus

---

## 📋 Setup Instructions

### Step 1: Database Migration (REQUIRED)

Run the migration to add `slack_user_id` column:

```bash
# Connect to your database and run:
psql $DATABASE_URL -f migrations/add-slack-user-id.sql

# Or if using Drizzle:
npm run db:push
```

This adds the `slack_user_id` column to the users table.

---

### Step 2: Get Slack User IDs for Your Team

You need to map each user to their Slack User ID for @mentions to work.

#### Method 1: Get Slack IDs Programmatically (Recommended)

1. Go to https://api.slack.com/apps
2. Click your app "FLOW - Notification Bot"
3. Go to **"OAuth & Permissions"**
4. Ensure `users:read` and `users:read.email` scopes are added
5. Use this script to fetch user IDs:

```typescript
// server/scripts/sync-slack-users.ts
import { storage } from "../storage";
import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function syncSlackUserIds() {
  try {
    // Get all Slack users
    const result = await client.users.list();
    const slackUsers = result.members || [];

    // Get all portal users
    const portalUsers = await storage.getUsers();

    // Match by email and update slack_user_id
    for (const portalUser of portalUsers) {
      const slackUser = slackUsers.find(
        (su: any) => su.profile?.email?.toLowerCase() === portalUser.email.toLowerCase()
      );

      if (slackUser) {
        await storage.db
          .update(users)
          .set({ slackUserId: slackUser.id })
          .where(eq(users.id, portalUser.id));

        console.log(`✅ Mapped ${portalUser.email} → ${slackUser.id}`);
      } else {
        console.log(`⚠️  No Slack user found for ${portalUser.email}`);
      }
    }

    console.log("✅ Slack user ID sync complete!");
  } catch (error) {
    console.error("❌ Error syncing Slack user IDs:", error);
  }
}

syncSlackUserIds();
```

Run it:
```bash
npx tsx server/scripts/sync-slack-users.ts
```

#### Method 2: Manual Entry

Update user records directly:

```sql
-- Find Slack User ID manually:
-- 1. Open Slack
-- 2. Click on user's profile
-- 3. Click "..." → "Copy member ID"
-- 4. Update in database:

UPDATE users
SET slack_user_id = 'U01234ABCD'
WHERE email = 'john.doe@joinfleek.com';
```

---

### Step 3: Configure Department Channels (Optional but Recommended)

Add these to your Vercel environment variables:

```bash
# Main fallback channel
SLACK_CHANNEL_ID=#flow-complaint-notifications

# Department-specific channels
SLACK_CHANNEL_FINANCE=#finance-tickets
SLACK_CHANNEL_OPERATIONS=#operations-tickets
SLACK_CHANNEL_MARKETPLACE=#marketplace-tickets
SLACK_CHANNEL_TECH=#tech-tickets
SLACK_CHANNEL_SUPPLY=#supply-tickets
SLACK_CHANNEL_GROWTH=#growth-tickets
SLACK_CHANNEL_CX=#cx-tickets
```

To add to Vercel:

```bash
# Add each channel variable
echo -n "#finance-tickets" | vercel env add SLACK_CHANNEL_FINANCE production
echo -n "#operations-tickets" | vercel env add SLACK_CHANNEL_OPERATIONS production
echo -n "#marketplace-tickets" | vercel env add SLACK_CHANNEL_MARKETPLACE production
echo -n "#tech-tickets" | vercel env add SLACK_CHANNEL_TECH production
echo -n "#supply-tickets" | vercel env add SLACK_CHANNEL_SUPPLY production
echo -n "#growth-tickets" | vercel env add SLACK_CHANNEL_GROWTH production
echo -n "#cx-tickets" | vercel env add SLACK_CHANNEL_CX production
```

**Important**: Invite the bot to each department channel:
```
/invite @FLOW - Notification Bot
```

If you don't configure department channels, all notifications go to the main `SLACK_CHANNEL_ID`.

---

### Step 4: Set Up Manager Relationships

Ensure users have their `managerId` set in the database:

```sql
-- Example: Set Jane as John's manager
UPDATE users
SET manager_id = (SELECT id FROM users WHERE email = 'jane.manager@joinfleek.com')
WHERE email = 'john.doe@joinfleek.com';
```

Or update via the admin panel (if you have one).

---

## 🧪 Testing

### Test 1: Basic Notification
1. Create a test ticket in Finance department
2. Check `#finance-tickets` (or main channel if not configured)
3. Verify notification appears

### Test 2: @Mention Without Slack ID
1. Create a comment: "Hey @john.doe can you check this?"
2. User gets in-app notification
3. Slack shows: "Mentioned: john.doe@joinfleek.com" (no @mention)

### Test 3: @Mention With Slack ID
1. Ensure user has `slack_user_id` set
2. Create comment: "Hey @john.doe please review"
3. User gets in-app notification + Slack @mention
4. Slack shows: "Mentioned: @john.doe" (clickable, sends push notification)

### Test 4: Manager Notification
1. John (managerId = Jane's ID) gets mentioned
2. Jane receives notification: "Your team member was mentioned..."
3. Both John and Jane get Slack notifications
4. Jane's notification shows: "Managers notified: @jane"

### Test 5: Department Channel Routing
1. Create Finance ticket → goes to #finance-tickets
2. Create Operations ticket → goes to #operations-tickets
3. Create ticket with no dept channel configured → goes to main channel

---

## 📊 Notification Types and Behavior

| Event | Slack Channel | @Mentions | Manager Notified |
|-------|---------------|-----------|------------------|
| Ticket Created | Department channel | Assignee (if has Slack ID) | No |
| Ticket Assigned | Department channel | Assignee (if has Slack ID) | No |
| Comment @Mention | Department channel | **Yes** (mentioned users) | **Yes** (their managers) |
| Urgent Ticket | Department channel | No | No |
| Ticket Resolved | Department channel | No | No |

---

## 🔧 How It Works

### @Mention Flow

1. **User comments**: "Hey @john.doe and @jane.smith please review"
2. **System extracts mentions**: `@john.doe`, `@jane.smith`
3. **System finds users** by email or name match
4. **Checks for Slack IDs**:
   - John has `slack_user_id` = `U123ABC` → becomes `<@U123ABC>`
   - Jane has no `slack_user_id` → shows `jane.smith@joinfleek.com`
5. **Finds managers**:
   - John's manager is Sarah (`slack_user_id` = `U456DEF`)
   - Jane's manager is Sarah (same)
   - Sarah gets notified once (deduplicated)
6. **Sends Slack message**:
   ```
   💬 You were mentioned in a comment

   Mentioned: <@U123ABC>, jane.smith@joinfleek.com

   john.commenter commented:
   > Hey @john.doe and @jane.smith please review

   👔 Managers notified: <@U456DEF>
   ```
7. **John gets**:
   - ✅ Push notification on phone
   - ✅ Desktop notification
   - ✅ Slack badge count increments
   - ✅ In-app notification in portal

8. **Jane gets**:
   - ⚠️ No push (no Slack ID)
   - ✅ In-app notification in portal

9. **Sarah (manager) gets**:
   - ✅ Push notification
   - ✅ Desktop notification
   - ✅ In-app notification: "Your team member was mentioned"

---

## 🎨 Slack Message Format

### With Slack IDs (Proper @Mentions)
```
💬 You were mentioned in a comment

Ticket: SS00123
Mentioned: @john.doe, @jane.smith

alice.commenter commented:
> Can you both review the refund process?

Ticket Subject: Customer refund request

👔 Managers notified: @sarah.manager

🔗 View Comment in Portal
```

### Without Slack IDs (Email Fallback)
```
💬 You were mentioned in a comment

Ticket: SS00123
Mentioned: john.doe@joinfleek.com, jane.smith@joinfleek.com

alice.commenter commented:
> Can you both review the refund process?

Ticket Subject: Customer refund request

🔗 View Comment in Portal
```

---

## ❓ FAQ

**Q: Why don't I get push notifications when mentioned?**
A: You need a `slack_user_id` set. Run the sync script or manually add your Slack User ID.

**Q: How do I find my Slack User ID?**
A: In Slack: Click your profile → "..." → "Copy member ID"

**Q: Can I disable manager notifications?**
A: Yes, modify `server/notifications.ts` and remove the manager notification section.

**Q: What if I don't have department channels?**
A: All notifications go to `SLACK_CHANNEL_ID` (main channel). It still works!

**Q: Do @mentions work for non-Slack users?**
A: Yes! They get in-app notifications. Slack shows their email instead of @mention.

**Q: Can I mention someone not in the system?**
A: No, only users with accounts in the Information Portal can be mentioned.

---

## 🚀 Deployment

After making changes:

```bash
# Commit all changes
git add -A
git commit -m "Enhanced Slack notifications with @mentions and manager notifications"
git push origin main

# Vercel auto-deploys (3-5 minutes)
```

**Post-deployment**:
1. Run database migration
2. Sync Slack user IDs
3. Configure department channels
4. Test @mentions
5. Verify manager notifications

---

## 📝 Summary

**What You Get**:
- ✅ Real Slack @mentions (push notifications)
- ✅ Auto-manager notifications
- ✅ Department-specific channels
- ✅ Better notification visibility
- ✅ Reduced missed alerts

**What You Need**:
- Run database migration
- Set `slack_user_id` for users
- Configure department channels (optional)
- Invite bot to all channels

---

**Questions?** Check the code or contact the development team!
