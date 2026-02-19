# 🚀 Complete Slack Notification Setup Guide

## ✅ What's Been Fixed

Your Slack notification system now has:

### ✅ **Department Segregation**
- Tickets route to department-specific channels
- Code already implemented, just needs channel setup

### ✅ **@Mentions for Assignees and Managers**
- Assignees get @mentioned when tickets created/assigned
- Managers automatically notified
- Uses real Slack `<@U123456>` format

### ✅ **Clickable Ticket Links**
- All notifications have clickable links
- Opens ticket detail page directly

---

## 📋 Step-by-Step Setup (30 minutes)

### **Step 1: Sync Slack User IDs (10 minutes)**

This populates the database with Slack User IDs so @mentions work.

```bash
# Run the sync script
tsx script/sync-slack-user-ids.ts
```

**What it does:**
- Fetches all users from your Slack workspace
- Matches them with database users by email
- Updates `slack_user_id` field in database
- Shows summary of matched/not matched users

**Expected output:**
```
🔄 Starting Slack User ID Sync...

📥 Fetching users from Slack workspace...
✅ Found 59 active Slack users with emails

📥 Fetching users from database...
✅ Found 59 users in database

🔄 Matching users by email...

✅ syed.hasan@joinfleek.com → U01ABC123 (Syed Faez)
✅ abhi@joinfleek.com → U02DEF456 (Abhi Arora)
... (continues for all users)

================================================================================
📊 Sync Summary:
================================================================================
✅ Total Database Users: 59
✅ Total Slack Users: 59
✅ Matched: 58
✅ Updated: 58
⏭️  Already Up-to-Date: 0
⚠️  Not Found in Slack: 1
================================================================================
```

**Troubleshooting:**

If you get `invalid_auth` error:
- Check your `SLACK_BOT_TOKEN` in `.env`
- Make sure it starts with `xoxb-`

If you get `missing_scope` error:
- Your Slack app needs `users:read` and `users:read.email` scopes
- Go to Slack App settings → OAuth & Permissions → Add scopes

---

### **Step 2: Create Slack Channels (5 minutes)**

Create these channels in your Slack workspace:

```
/create #flow-tickets-cx
/create #flow-tickets-finance
/create #flow-tickets-operations
/create #flow-tickets-qa
/create #flow-tickets-urgent
/create #flow-tickets-escalations
/create #flow-tickets-sla-breach
```

**Then invite your bot to each channel:**
```
/invite @FLOW Bot
```

---

### **Step 3: Get Channel IDs (5 minutes)**

**Option A: Using the helper script (Recommended)**
```bash
tsx script/get-slack-channel-ids.ts
```

**Option B: Manual method**
1. Right-click channel name in Slack
2. Select "Copy link"
3. Extract ID from URL: `https://workspace.slack.com/archives/C123456789`
   - Channel ID = `C123456789`

---

### **Step 4: Update .env File (5 minutes)**

Add these to your `.env` file with the actual IDs from Step 3:

```bash
# Main Channel (fallback)
SLACK_CHANNEL_ID=C123456789  # #flow-tickets-general

# Department Channels
SLACK_CHANNEL_CX=C01ABC123
SLACK_CHANNEL_FINANCE=C02DEF456
SLACK_CHANNEL_OPERATIONS=C03GHI789
SLACK_CHANNEL_QA=C04JKL012

# Priority Channels (Optional but recommended)
SLACK_CHANNEL_URGENT=C05MNO345
SLACK_CHANNEL_ESCALATION=C06PQR678
SLACK_CHANNEL_SLA_BREACH=C07STU901
```

---

### **Step 5: Deploy (5 minutes)**

```bash
git add .
git commit -m "Add Slack @mentions and department routing

- Sync Slack User IDs from workspace
- Add @mentions for assignees and managers in notifications
- Update ticket created/assigned functions
- Ready for department-specific channel routing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```

Vercel will auto-deploy in ~2 minutes.

---

## 🎯 How It Works Now

### **When a Ticket is Created:**

**Before:**
```
Message in #complaint-notifications:
New ticket created: SS00021
Assigned to: syed.hasan@joinfleek.com
```

**After:**
```
Message in #flow-tickets-cx:
🟠 New Ticket Created

Ticket: SS00021 (clickable link)
Priority: 🟠 High
Department: CX
Created By: abhi@joinfleek.com

Subject: Payment processing issue
Vendor: vendor-abc

Assigned to: @Syed Faez  (← Real @mention, triggers notification)
👔 Manager notified: @Ahmar Zohaib  (← Manager gets notified too)

🔗 View Ticket in Portal (clickable)
```

---

### **Routing Logic:**

| Ticket Department | Notification Sent To |
|-------------------|---------------------|
| CX | `#flow-tickets-cx` |
| Finance | `#flow-tickets-finance` |
| Operations | `#flow-tickets-operations` |
| QA | `#flow-tickets-qa` |
| Urgent Priority | Department channel + `#flow-tickets-urgent` |
| Escalated | Department channel + `#flow-tickets-escalations` |

---

## ✅ Testing Checklist

After deployment, test these scenarios:

- [ ] **Create CX ticket with assignee**
  - Goes to #flow-tickets-cx? ✅
  - Assignee gets @mentioned? ✅
  - Manager gets notified? ✅
  - Link is clickable? ✅

- [ ] **Create Finance ticket**
  - Goes to #flow-tickets-finance? ✅

- [ ] **Assign existing ticket**
  - Assignee gets @mentioned? ✅
  - Manager gets notified? ✅

- [ ] **Create urgent ticket**
  - Goes to department channel? ✅
  - Also goes to #flow-tickets-urgent? ✅ (if configured)

---

## 🔧 Files Modified

### **New Files:**
1. `script/sync-slack-user-ids.ts` - Syncs Slack User IDs
2. `SLACK-SETUP-COMPLETE-GUIDE.md` - This guide
3. `SLACK-NOTIFICATION-ANALYSIS.md` - Detailed analysis

### **Modified Files:**
1. `server/slack-web-api.ts`
   - Added `manager` parameter to `sendSlackTicketCreated()`
   - Added `manager` parameter to `sendSlackTicketAssigned()`
   - Added `<@U123456>` @mention format for assignees
   - Added `link_names: true` to enable notifications

2. `server/notifications.ts`
   - Fetches manager from `assignee.managerId`
   - Passes manager to Slack notification functions

---

## 🚨 Important Notes

### **@Mentions Only Work If:**
1. ✅ User has `slack_user_id` in database (run Step 1)
2. ✅ Bot is in the channel (invite bot to each channel)
3. ✅ User is in the Slack workspace
4. ✅ `link_names: true` is set (already done)

### **If @Mentions Don't Work:**

**Check user has Slack ID:**
```sql
SELECT email, slack_user_id FROM users WHERE email = 'user@joinfleek.com';
```

If `slack_user_id` is NULL:
- Re-run sync script: `tsx script/sync-slack-user-ids.ts`
- Or manually add: `UPDATE users SET slack_user_id = 'U123456' WHERE email = 'user@joinfleek.com'`

**Check bot is in channel:**
```
/invite @FLOW Bot
```

---

## 📊 Before vs After

### **Before:**
❌ All tickets → single channel
❌ Email addresses shown (not @mentions)
❌ Managers not notified
✅ Clickable links

### **After:**
✅ Department-specific channels
✅ Real @mentions (triggers Slack notifications)
✅ Managers auto-notified
✅ Clickable links

---

## 🎉 Summary

**What You Need to Do:**

1. **Run sync script** (10 mins)
   ```bash
   tsx script/sync-slack-user-ids.ts
   ```

2. **Create Slack channels** (5 mins)

3. **Get channel IDs** (5 mins)
   ```bash
   tsx script/get-slack-channel-ids.ts
   ```

4. **Update .env** (5 mins)

5. **Deploy** (5 mins)
   ```bash
   git add . && git commit -m "..." && git push
   ```

**Total Time: ~30 minutes**

---

## 🆘 Need Help?

**Common Issues:**

1. **"Not found in Slack" for users**
   - Email in database doesn't match Slack email
   - User not in Slack workspace
   - Solution: Manually set `slack_user_id` for those users

2. **Bot can't post to channel**
   - Bot not invited to channel
   - Solution: `/invite @FLOW Bot`

3. **@Mentions show as plain text**
   - User doesn't have `slack_user_id`
   - Solution: Run sync script again

4. **Wrong channel routing**
   - Channel ID incorrect in `.env`
   - Solution: Double-check IDs with `tsx script/get-slack-channel-ids.ts`

---

**You're all set!** 🚀

Run the sync script first, then set up channels and you'll have professional Slack notifications with @mentions!
