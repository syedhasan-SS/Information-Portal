# Slack Bot Token Setup Guide

This guide will help you create a Slack Bot Token and configure it for the FLOW Complaint Management Portal.

## ✅ What We Built

Direct integration using **Slack Web API** with Bot Token - no webhooks needed!

**Benefits:**
- ✅ **No n8n required** - Direct from app to Slack
- ✅ **More secure** - Bot tokens are more secure than webhooks
- ✅ **More features** - Can update messages, add reactions, etc.
- ✅ **Better control** - Manage everything from Slack App dashboard
- ✅ **Real user mentions** - Can tag actual Slack users (optional upgrade)

---

## 🚀 Setup Steps

### **Step 1: Create Slack App**

1. Go to: **https://api.slack.com/apps**
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. **App Name:** `FLOW Complaint Portal`
5. **Workspace:** Select your JoinFleek workspace
6. Click **"Create App"**

---

### **Step 2: Add Bot Token Scopes**

1. In your app dashboard, click **"OAuth & Permissions"** (left sidebar)
2. Scroll down to **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"**
4. Add these two scopes:
   - `chat:write` - Send messages as the bot
   - `chat:write.public` - Send messages to any public channel

---

### **Step 3: Install App to Workspace**

1. Scroll back up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. You'll see a **Bot User OAuth Token** (starts with `xoxb-...`)
5. **Copy this token!** ⚠️ Keep it secure!

---

### **Step 4: Invite Bot to Channel**

1. Open Slack
2. Go to `#complaint-notifications` channel
3. Type: `/invite @FLOW Complaint Portal`
4. Or click channel name → **Integrations** → **Add apps** → Select your bot

---

### **Step 5: Add to Vercel Environment Variables**

1. Go to **Vercel Dashboard**
2. Select **Information Portal** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```bash
SLACK_BOT_TOKEN=xoxb-your-actual-token-here
SLACK_CHANNEL_ID=#complaint-notifications
APP_URL=https://information-portal-beryl.vercel.app
```

5. Click **Save**
6. **Redeploy** your application

---

### **Step 6: Test It!**

1. Create a test ticket in your portal
2. Check `#complaint-notifications` in Slack
3. You should see a beautifully formatted notification! 🎉

---

## 📋 Environment Variables Summary

Add these to Vercel:

| Variable | Value | Description |
|----------|-------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-...` | Your Bot User OAuth Token from Step 3 |
| `SLACK_CHANNEL_ID` | `#complaint-notifications` | Channel where notifications go |
| `APP_URL` | `https://information-portal-beryl.vercel.app` | For ticket links |

---

## 🎨 Notification Examples

### **Ticket Created:**
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

### **Ticket Assigned:**
```
🟠 Ticket Assigned
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Priority: 🟠 High

jane@joinfleek.com has been assigned to this ticket by admin@joinfleek.com

Subject: Payment pending since 27th Jan
Department: Seller Support

[🔗 View Ticket]
```

### **Comment Mention:**
```
💬 You were mentioned in a comment
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Mentioned: jane@joinfleek.com, john@joinfleek.com

manager@joinfleek.com commented:
> Can you both review this case and provide an update?

Ticket Subject: Payment pending since 27th Jan

[🔗 View Comment]
```

### **Urgent Alert:**
```
🚨 URGENT TICKET ALERT
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00011
Priority: 🔴 Urgent
Department: Finance
Created By: support@joinfleek.com

Subject: Critical payment issue - vendor threatening legal action
Vendor: major-supplier

⚠️ This ticket requires immediate attention!

[🔗 View Urgent Ticket]
```

---

## 🔧 Troubleshooting

### **Notifications not appearing?**

1. **Check bot is in channel:**
   - Go to `#complaint-notifications`
   - Type `/invite @FLOW Complaint Portal`

2. **Check bot token:**
   - Verify `SLACK_BOT_TOKEN` in Vercel starts with `xoxb-`
   - Verify it's not expired

3. **Check permissions:**
   - Go to https://api.slack.com/apps
   - Select your app
   - OAuth & Permissions → Verify `chat:write` and `chat:write.public` scopes

4. **Check logs:**
   - Vercel → Your project → Logs
   - Look for `[Slack]` messages

### **Bot token expired?**

- Go to your Slack App settings
- OAuth & Permissions
- Click **"Reinstall App"**
- Copy new token and update Vercel

### **Want to test manually?**

Run this in your terminal:

```bash
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#complaint-notifications",
    "text": "Test from FLOW portal"
  }'
```

---

## 🎯 Advanced Features (Optional)

### **1. Real Slack User Mentions**

Instead of showing emails, you can mention actual Slack users:

1. Add scope: `users:read` and `users:read.email`
2. Use Slack API to lookup user by email
3. Replace email mentions with `<@U123456>` format

### **2. Multiple Channels**

Route different ticket types to different channels:

```typescript
// In slack-web-api.ts, modify getChannel():
function getChannel(department?: string, priority?: string): string {
  if (priority === 'Urgent') return '#urgent-alerts';
  if (department === 'Finance') return '#finance-tickets';
  if (department === 'CX') return '#cx-tickets';
  return '#complaint-notifications';
}
```

Then add channel IDs to Vercel:
```
SLACK_CHANNEL_GENERAL=#complaint-notifications
SLACK_CHANNEL_URGENT=#urgent-alerts
SLACK_CHANNEL_CX=#cx-tickets
```

### **3. Interactive Buttons**

Add buttons to assign tickets directly from Slack (requires more setup).

### **4. Update Messages**

When ticket status changes, update the original Slack message instead of posting new one:
- Store message timestamp in database
- Use `chat.update` API instead of `chat.postMessage`

---

## 🔒 Security Best Practices

1. **Never commit** `SLACK_BOT_TOKEN` to git
2. **Rotate tokens** periodically
3. **Use environment variables** only
4. **Monitor usage** in Slack App dashboard
5. **Limit scopes** to only what's needed

---

## 📞 Support

**Slack App Settings:** https://api.slack.com/apps

**Need Help?**
- Check Slack App Event Subscriptions for errors
- Review Vercel logs for `[Slack]` messages
- Test bot token with curl command above

---

**Setup Complete!** 🎉

Your portal will now send beautiful, real-time notifications to Slack whenever:
- New tickets are created
- Tickets are assigned
- Users are @mentioned in comments
- Tickets are resolved
- Urgent tickets need attention

No n8n or webhooks required - direct, secure, and powerful! 🚀
