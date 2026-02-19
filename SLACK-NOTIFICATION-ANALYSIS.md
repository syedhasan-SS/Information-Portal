# 🔍 Slack Notification System - Current vs Required

## 📋 Your Requirements

1. ✅ **Segregated on department level** - Notifications sent to department-specific channels
2. ⚠️ **Member and manager must be tagged as @mentions** - Partially implemented
3. ✅ **Ticket link should be clickable** - Already working

---

## 🎯 Current Implementation Analysis

### ✅ **Requirement 1: Department Segregation**

**Status:** ✅ **ALREADY WORKING**

The system already routes notifications to department-specific channels:

```typescript
// server/slack-web-api.ts - Line 40
function getChannel(department?: string): string {
  if (department) {
    const deptChannel = process.env[`SLACK_CHANNEL_${department.toUpperCase()}`];
    if (deptChannel) return deptChannel;
  }
  return process.env.SLACK_CHANNEL_ID || '#flow-complaint-notifications';
}
```

**How it works:**
- CX tickets → `SLACK_CHANNEL_CX` (e.g., #flow-tickets-cx)
- Finance tickets → `SLACK_CHANNEL_FINANCE` (e.g., #flow-tickets-finance)
- Operations tickets → `SLACK_CHANNEL_OPERATIONS`
- QA tickets → `SLACK_CHANNEL_QA`
- Fallback → Main channel if department-specific not configured

**What you need to do:**
- Set up department channels in Slack
- Add channel IDs to `.env` file
- That's it! Already coded and ready.

---

### ⚠️ **Requirement 2: @Mentions for Member and Manager**

**Status:** ⚠️ **PARTIALLY IMPLEMENTED** - Needs Enhancement

#### **What Currently Works:**

**Comment Mentions** (Line 248-358):
```typescript
export async function sendSlackCommentMention(
  ticket: Ticket,
  comment: Comment,
  commenter: User,
  mentionedUsers: User[],
  managers?: User[]
)
```

✅ **Already tags mentioned users:**
- Users with `slackUserId` → Tagged as `<@U123456>` (real @mention)
- Users without `slackUserId` → Shows email only
- Managers can be passed and tagged

✅ **Uses `link_names: true`** - Triggers actual Slack notifications

#### **What's Missing:**

For **Ticket Created/Assigned notifications** (Lines 80-243):

❌ **Assignee is NOT @mentioned** - Shows email only:
```typescript
// Current code (Line 136)
text: `*Assigned to:* ${assignee.email}`  // ❌ No @mention
```

❌ **Manager is NOT notified at all** - No manager parameter in function

#### **What Needs to Be Added:**

1. **Auto-tag assignee when ticket is created/assigned**
2. **Auto-tag manager when ticket is created/assigned**
3. **Fetch manager info from user's `managerId` field**

---

### ✅ **Requirement 3: Clickable Ticket Link**

**Status:** ✅ **ALREADY WORKING**

All notifications include clickable ticket links:

```typescript
// Line 106
text: `*Ticket:*\n<${ticketUrl}|${ticket.ticketNumber}>`

// Line 153
text: `🔗 <${ticketUrl}|View Ticket in Portal>`
```

**Format:** `<URL|Display Text>` - Slack's standard link format

**Examples:**
- `<https://portal.com/ticket/abc123|SS00021>`
- `<https://portal.com/ticket/abc123|View Ticket in Portal>`

✅ Fully clickable
✅ Redirects to ticket page
✅ Works in all notification types

---

## 📊 Detailed Feature Matrix

| Feature | Ticket Created | Ticket Assigned | Comment Mention | Ticket Resolved | Urgent Alert |
|---------|----------------|-----------------|-----------------|-----------------|--------------|
| **Department Routing** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Clickable Link** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **@Mention Assignee** | ❌ No | ❌ No | ✅ Yes* | N/A | ❌ No |
| **@Mention Manager** | ❌ No | ❌ No | ✅ Yes* | ❌ No | ❌ No |
| **Priority Emoji** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ✅ Yes |

*Only if explicitly passed to function and user has `slackUserId`

---

## 🔧 What Needs to Be Fixed

### **1. Add @Mentions to Ticket Created Notification**

**Current Code (Line 80-169):**
```typescript
export async function sendSlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User  // ⚠️ No manager parameter
): Promise<boolean> {
  // ...
  if (assignee) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Assigned to:* ${assignee.email}`,  // ❌ Email only, no @mention
      },
    });
  }
  // ❌ No manager notification
}
```

**What's Needed:**
```typescript
export async function sendSlackTicketCreated(
  ticket: Ticket,
  creator?: User,
  assignee?: User,
  manager?: User  // ✅ Add manager parameter
): Promise<boolean> {
  // ...
  if (assignee) {
    // ✅ Build @mention string
    const assigneeMention = assignee.slackUserId
      ? `<@${assignee.slackUserId}>`
      : assignee.email;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Assigned to:* ${assigneeMention}`,  // ✅ @mention
      },
    });
  }

  // ✅ Add manager notification
  if (manager && manager.slackUserId) {
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `👔 *Manager notified:* <@${manager.slackUserId}>`,
      }],
    });
  }

  // ✅ Add link_names to trigger notifications
  await client.chat.postMessage({
    channel: getChannel(ticket.department),
    text: `New ticket created: ${ticket.ticketNumber}`,
    blocks,
    link_names: true,  // ✅ Required for @mentions to work
  });
}
```

---

### **2. Add @Mentions to Ticket Assigned Notification**

**Current Code (Line 174-243):**
```typescript
text: `*${assignee.email}* has been assigned...`  // ❌ Email only
```

**Needs:**
```typescript
const assigneeMention = assignee.slackUserId
  ? `<@${assignee.slackUserId}>`
  : assignee.email;

text: `*${assigneeMention}* has been assigned...`  // ✅ @mention
```

---

### **3. Fetch Manager Automatically**

**Need a helper function:**
```typescript
/**
 * Get user's manager from database
 */
async function getUserManager(userId: string): Promise<User | undefined> {
  const user = await storage.getUserById(userId);
  if (!user || !user.managerId) return undefined;

  return await storage.getUserById(user.managerId);
}
```

**Then use it:**
```typescript
// When creating/assigning ticket
const assignee = await storage.getUserById(ticket.assigneeId);
const manager = assignee ? await getUserManager(assignee.id) : undefined;

await sendSlackTicketCreated(ticket, creator, assignee, manager);
```

---

## 🚨 Critical Missing: Slack User IDs

### **Problem:**

For @mentions to work, users MUST have their `slackUserId` stored in the database.

**Check current data:**
```sql
SELECT email, name, slack_user_id
FROM users
WHERE slack_user_id IS NOT NULL;
```

**If most users have `NULL` slack_user_id:**
- @mentions won't work
- Only emails will be shown
- No Slack notifications triggered

### **Solution:**

1. **Get Slack User IDs from Slack API:**
```typescript
// Get all Slack users
const result = await slackClient.users.list();
const slackUsers = result.members;

// Match by email
for (const slackUser of slackUsers) {
  const email = slackUser.profile?.email;
  if (email) {
    await db.update(users)
      .set({ slackUserId: slackUser.id })
      .where(eq(users.email, email));
  }
}
```

2. **Or manually add for key users first:**
```sql
UPDATE users
SET slack_user_id = 'U01234ABCD'
WHERE email = 'syed.hasan@joinfleek.com';
```

---

## 📝 Summary: What Works vs What's Needed

### ✅ **Already Working:**
1. ✅ Department-specific channel routing
2. ✅ Clickable ticket links
3. ✅ @Mentions in comment notifications
4. ✅ Priority emojis
5. ✅ Professional message formatting
6. ✅ `link_names: true` support

### ⚠️ **Needs Enhancement:**
1. ⚠️ Add @mentions to ticket created notifications
2. ⚠️ Add @mentions to ticket assigned notifications
3. ⚠️ Auto-fetch and notify managers
4. ⚠️ Ensure all users have `slackUserId` populated

### ❌ **Not Implemented Yet:**
1. ❌ Multi-channel routing (urgent → both dept + urgent channel)
2. ❌ Escalation channel routing
3. ❌ SLA breach channel routing

---

## 🎯 Recommended Action Plan

### **Phase 1: Fix @Mentions (Priority: HIGH)**

1. **Populate Slack User IDs** (30 mins)
   - Run sync script to map emails to Slack IDs
   - Verify key users have IDs

2. **Update Notification Functions** (1 hour)
   - Add manager parameter to `sendSlackTicketCreated`
   - Add manager parameter to `sendSlackTicketAssigned`
   - Update calls to fetch and pass manager

3. **Test @Mentions** (15 mins)
   - Create test ticket
   - Verify assignee gets @mentioned
   - Verify manager gets @mentioned

### **Phase 2: Department Channels (Priority: MEDIUM)**

1. **Create Slack Channels** (10 mins)
   - As per SLACK-DEPARTMENT-CHANNELS-SETUP.md

2. **Configure .env** (5 mins)
   - Add channel IDs

3. **Deploy and Test** (15 mins)

### **Phase 3: Advanced Routing (Priority: LOW)**

1. Implement multi-channel routing
2. Add escalation channel
3. Add SLA breach channel

---

## 🔍 Quick Test Checklist

After implementing fixes, test:

- [ ] Create CX ticket with assignee → Goes to #flow-tickets-cx
- [ ] Check assignee gets @mentioned → Should see `<@U123456>`
- [ ] Check manager gets notified → Should see "Manager notified: @ManagerName"
- [ ] Click ticket link → Should open ticket page
- [ ] Assign ticket to someone → Assignee gets @mentioned
- [ ] Add comment with @mention → Mentioned user gets notification

---

## 📞 Need Help?

**For @mentions to work:**
1. User MUST have `slack_user_id` in database
2. Bot MUST be in the channel
3. MUST use `link_names: true` in API call
4. MUST use format `<@U123456>` (with angle brackets)

**For department routing to work:**
1. Channels MUST exist in Slack
2. Channel IDs MUST be in `.env`
3. Bot MUST be invited to each channel
4. Format: `SLACK_CHANNEL_CX=C123456789`
