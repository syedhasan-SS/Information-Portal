# 🚀 Quick Slack Setup - Get Your Bot Token

## Current Status
✅ Slack Web API integration is **fully implemented** in your code
✅ Notifications are ready to send to `#complaint-notifications`
⏳ Just need to configure your Slack Bot Token

---

## 🎯 5-Minute Setup

### Step 1: Create Slack App (2 minutes)

1. **Go to:** https://api.slack.com/apps
2. Click **"Create New App"** → Choose **"From scratch"**
3. **App Name:** `FLOW Complaint Portal`
4. **Workspace:** Select your JoinFleek workspace
5. Click **"Create App"**

### Step 2: Add Bot Permissions (1 minute)

1. In your app dashboard, click **"OAuth & Permissions"** (left sidebar)
2. Scroll to **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add:
   - ✅ `chat:write` - Send messages as the bot
   - ✅ `chat:write.public` - Send to any public channel

### Step 3: Install to Workspace (1 minute)

1. Scroll up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Click **"Allow"**
4. **COPY THE BOT TOKEN** (starts with `xoxb-...`) ⚠️

### Step 4: Invite Bot to Channel (30 seconds)

1. Open Slack → Go to `#complaint-notifications`
2. Type: `/invite @FLOW Complaint Portal`
3. Hit Enter

### Step 5: Add Token to Vercel (1 minute)

1. **Go to:** https://vercel.com/dashboard
2. Select **Information Portal** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add"** and enter:

```
Variable Name: SLACK_BOT_TOKEN
Value: [Paste your xoxb-... token here]
```

5. Click **"Save"**
6. **Important:** Go to **Deployments** → Click **"Redeploy"** on the latest deployment

---

## ✅ That's It! Test Your Setup

1. Create a test ticket in your portal
2. Check `#complaint-notifications` in Slack
3. You should see a beautifully formatted notification! 🎉

---

## 🎨 What You'll Get

Your Slack notifications will show:

**When tickets are created:**
```
🟠 New Ticket Created
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Priority: 🟠 High
Department: Seller Support
Created By: john@joinfleek.com

Subject: Payment pending since 27th Jan
Vendor: unique-clothing

Assigned to: jane@joinfleek.com

[🔗 View Ticket]
```

**When tickets are assigned:**
```
🟠 Ticket Assigned
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Priority: 🟠 High

jane@joinfleek.com has been assigned to this ticket

[🔗 View Ticket]
```

**When someone is mentioned in comments:**
```
💬 You were mentioned in a comment
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Mentioned: jane@joinfleek.com, john@joinfleek.com

manager@joinfleek.com commented:
> Can you both review this case?

[🔗 View Comment]
```

**When urgent tickets are created:**
```
🚨 URGENT TICKET ALERT
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00011
Priority: 🔴 Urgent

⚠️ This ticket requires immediate attention!

[🔗 View Urgent Ticket]
```

**When tickets are resolved:**
```
✅ Ticket Resolved
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Resolved By: jane@joinfleek.com

[🔗 View Ticket]
```

---

## 🔧 Troubleshooting

**Not seeing notifications?**

1. **Check bot is in channel:**
   - Go to `#complaint-notifications`
   - Type `/invite @FLOW Complaint Portal`

2. **Check token in Vercel:**
   - Verify `SLACK_BOT_TOKEN` starts with `xoxb-`
   - Make sure you clicked **"Redeploy"** after adding it

3. **Test manually:**
   ```bash
   curl -X POST https://slack.com/api/chat.postMessage \
     -H "Authorization: Bearer YOUR_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "channel": "#complaint-notifications",
       "text": "Test from curl"
     }'
   ```

4. **Check Vercel logs:**
   - Go to Vercel → Your project → Logs
   - Look for `[Slack]` messages

---

## 📚 More Details

For comprehensive documentation including advanced features, troubleshooting, and customization options, see:

- **Full Setup Guide:** `SLACK_BOT_TOKEN_SETUP.md`
- **Code Implementation:** `server/slack-web-api.ts`

---

**Setup Time:** ~5 minutes
**Status:** Ready to activate! 🚀
