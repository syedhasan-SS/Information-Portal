# Slack Integration Setup Guide

This guide explains how to set up Slack notifications for the FLOW Complaint Management Portal.

## Features

The Slack integration sends rich, formatted notifications for:

✅ **Ticket Created** - When a new ticket is created, with creator and assignee info
✅ **Ticket Assigned** - When a ticket is assigned to a user
✅ **Comment Mentions** - When users are @mentioned in comments
✅ **Ticket Resolved** - When a ticket is marked as solved

All notifications include:
- Direct link to the ticket
- Priority indicators with emojis
- User mentions (e.g., @john.doe)
- Ticket details (number, subject, department)
- Action buttons to view the ticket

## Setup Instructions

### Step 1: Create a Slack Webhook

1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Manage** → **Custom Integrations** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Select the channel where you want notifications (e.g., `#ticket-notifications`)
5. Click **Add Incoming WebHooks Integration**
6. Copy the **Webhook URL** (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### Step 2: Configure Environment Variables

Add the following environment variable to your `.env` file:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional: App URL for ticket links (defaults to production URL)
APP_URL=https://information-portal-beryl.vercel.app
```

For **Vercel deployment**, add the environment variable:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `SLACK_WEBHOOK_URL` with your webhook URL
4. Redeploy your application

### Step 3: Test the Integration

1. Create a new ticket in the portal
2. Check your configured Slack channel
3. You should see a formatted notification with ticket details

## Optional: User Mention Mapping

Currently, user mentions in Slack use the format `@username` based on email addresses.

For **proper Slack user tagging** (e.g., `<@U123456>`), you can:

### Option A: Manual Mapping (Simple)
Add a mapping table in your database to link user emails to Slack User IDs.

### Option B: Slack API (Advanced)
1. Create a Slack App with `users:read` and `users:read.email` permissions
2. Get a **Bot User OAuth Token**
3. Add to environment variables:
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

4. Update `getSlackUserId()` function in `/server/slack-integration.ts` to lookup Slack User IDs via API

## Notification Examples

### Ticket Created
```
🟠 New Ticket Created
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Priority: 🟠 High
Department: Seller Support
Created By: @john.doe

Subject: Payment pending since 27th Jan
Vendor: unique-clothing

Assigned to: @jane.smith

[View Ticket]
```

### Ticket Assigned
```
🟠 Ticket Assigned
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Priority: 🟠 High

@jane.smith has been assigned to this ticket by @admin

Subject: Payment pending since 27th Jan
Department: Seller Support

[View Ticket]
```

### Comment Mention
```
💬 You were mentioned in a comment
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket: SS00010
Mentioned: @jane.smith, @john.doe

@manager commented:
> Can you both review this case and provide an update?

Ticket Subject: Payment pending since 27th Jan

[View Comment]
```

## Troubleshooting

### Notifications not appearing?
1. **Check webhook URL** - Ensure `SLACK_WEBHOOK_URL` is set correctly in environment variables
2. **Check channel** - Verify the webhook is configured for the correct channel
3. **Check logs** - Look for `[Slack]` prefixed messages in server logs
4. **Test webhook** - Use curl to test:
```bash
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from FLOW"}'
```

### Webhook expired?
- Slack webhooks don't expire, but can be revoked
- Regenerate the webhook if needed from Slack settings

### Want different channels for different notifications?
You can create multiple webhooks and modify the code to use different webhooks based on:
- Ticket department
- Priority level
- Notification type

## Advanced Configuration

### Custom Channel per Department

Modify `/server/slack-integration.ts` to use department-specific webhooks:

```typescript
function getSlackWebhook(department: string): string {
  const webhooks = {
    'CX': process.env.SLACK_WEBHOOK_CX,
    'Finance': process.env.SLACK_WEBHOOK_FINANCE,
    'Tech': process.env.SLACK_WEBHOOK_TECH,
  };
  return webhooks[department] || process.env.SLACK_WEBHOOK_URL || '';
}
```

### Priority-Based Channels

Send urgent tickets to a different channel:

```typescript
const webhookUrl = ticket.priorityTier === 'Urgent'
  ? process.env.SLACK_WEBHOOK_URGENT
  : process.env.SLACK_WEBHOOK_URL;
```

## Support

For issues or questions:
1. Check server logs for `[Slack]` error messages
2. Verify webhook URL in Vercel environment variables
3. Test webhook independently using curl
4. Review Slack App settings if using Bot Token

---

**Documentation Updated:** February 9, 2025
**Version:** 1.0.0
