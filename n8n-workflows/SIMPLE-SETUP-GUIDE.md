# Simple n8n Slack Setup - Copy & Paste Method

Can't find the import button? No problem! Here's how to set it up manually in 5 minutes.

## 🎯 Step-by-Step Setup

### 1. Create New Workflow in n8n

- Open n8n
- Click **"New Workflow"** (usually top right or in workflows list)
- Name it: **"FLOW Slack Notifications"**

---

### 2. Add Webhook Node (First Node)

**Click "+" to add node → Search "Webhook" → Add it**

**Configure the Webhook node:**
- **HTTP Method:** POST
- **Path:** `slack-notifications`
- **Response Mode:** "Respond Immediately"

**Note:** After saving, n8n will show you the webhook URL. Copy it - you'll need it later!

Example: `https://your-n8n-instance.com/webhook/slack-notifications`

---

### 3. Add IF/Switch Node (Optional but Recommended)

**Click "+" after Webhook → Search "IF" → Add it**

**Configure IF node:**
- **Condition:** String
- **Value 1:** `={{$json.event}}`
- **Operation:** Equal
- **Value 2:** `slack.ticket.created`

This checks if the event is a ticket creation. You can add more IF nodes for other events later.

---

### 4. Add Function Node (Format the Message)

**Click "+" after IF (on the "true" branch) → Search "Code" or "Function" → Add it**

**Paste this code in the Function node:**

```javascript
// Get data from webhook
const data = $input.item.json.data;
const ticket = data.ticket;
const creator = data.creator;
const assignee = data.assignee;

// Build Slack message with Block Kit
const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: `${ticket.priorityEmoji || '🔵'} New Ticket Created`,
      emoji: true
    }
  },
  {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Ticket:*\n${ticket.number}`
      },
      {
        type: "mrkdwn",
        text: `*Priority:*\n${ticket.priority || 'Normal'}`
      },
      {
        type: "mrkdwn",
        text: `*Department:*\n${ticket.department || 'General'}`
      },
      {
        type: "mrkdwn",
        text: `*Created By:*\n${creator ? creator.email : 'Unknown'}`
      }
    ]
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Subject:* ${ticket.subject}\n*Vendor:* ${ticket.vendorHandle || 'N/A'}`
    }
  }
];

// Add assignee info if available
if (assignee) {
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Assigned to:* ${assignee.email}`
    }
  });
} else {
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Status:* Unassigned - Waiting for assignment"
    }
  });
}

// Add action button
blocks.push({
  type: "actions",
  elements: [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: "🔗 View Ticket",
        emoji: true
      },
      url: ticket.url,
      style: "primary"
    }
  ]
});

// Return formatted message
return {
  json: {
    blocks: blocks,
    text: `New ticket: ${ticket.number} - ${ticket.subject}`
  }
};
```

---

### 5. Add HTTP Request Node (Send to Slack)

**Click "+" after Function → Search "HTTP Request" → Add it**

**Configure HTTP Request node:**
- **Method:** POST
- **URL:** `YOUR_SLACK_WEBHOOK_URL` (paste your Slack webhook here!)
- **Send Body:** ✅ Enabled
- **Body Content Type:** JSON
- **Specify Body:** Using Fields Below
- **Body Parameters:**
  - Field 1: Name: `blocks`, Value: `={{$json.blocks}}`
  - Field 2: Name: `text`, Value: `={{$json.text}}`

**Where to get Slack webhook URL:**
1. Go to your Slack workspace
2. Apps → Incoming Webhooks
3. Find your `#complaint-notifications` webhook
4. Copy the URL (looks like: `https://hooks.slack.com/services/...`)

---

### 6. Add Response Node (Optional)

**Click "+" after HTTP Request → Search "Respond to Webhook" → Add it**

**Configure:**
- **Response Mode:** JSON
- **Response Body:** `={{ { "success": true, "message": "Notification sent" } }}`

---

### 7. Activate the Workflow

- At the top of the workflow, there's a **toggle switch** (Active/Inactive)
- Click it to **Activate** the workflow
- The webhook is now live!

---

## 🔗 Connect to Your Application

### 1. Get Your n8n Webhook URL

In the Webhook node, you'll see:
- **Production URL:** `https://your-n8n-instance.com/webhook/slack-notifications`
- **Copy this URL!**

### 2. Add to Vercel

1. Go to **Vercel Dashboard**
2. Select your **Information Portal** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add**
5. Name: `N8N_WEBHOOK_URL`
6. Value: Paste your n8n webhook URL
7. Click **Save**
8. **Redeploy** your application (Vercel will prompt you)

---

## 🧪 Test It!

### Test from n8n:

1. In n8n workflow, click **"Execute Workflow"** button
2. The Webhook node should show "Waiting for webhook call"
3. Click **"Listen for Test Event"**

### Test Payload:

Send this to your n8n webhook URL using curl or Postman:

```json
{
  "event": "slack.ticket.created",
  "data": {
    "ticket": {
      "id": "test-123",
      "number": "TS00001",
      "subject": "Test Notification",
      "priority": "High",
      "priorityEmoji": "🟠",
      "department": "Tech",
      "vendorHandle": "test-vendor",
      "url": "https://information-portal-beryl.vercel.app/ticket/test-123"
    },
    "creator": {
      "email": "test@joinfleek.com",
      "name": "Test User"
    },
    "assignee": null
  },
  "timestamp": "2025-02-09T12:00:00.000Z"
}
```

### Using curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook/slack-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "event": "slack.ticket.created",
    "data": {
      "ticket": {
        "number": "TS00001",
        "subject": "Test Notification",
        "priority": "High",
        "priorityEmoji": "🟠",
        "department": "Tech",
        "url": "https://information-portal-beryl.vercel.app/ticket/test-123"
      },
      "creator": {
        "email": "test@joinfleek.com"
      }
    }
  }'
```

**Check your Slack channel** - you should see the notification! 🎉

---

## 🎨 Add More Events (Optional)

To handle other events (ticket assigned, mentions, resolved), duplicate the workflow and change:

1. The IF condition to check for different events:
   - `slack.ticket.assigned`
   - `slack.comment.mention`
   - `slack.ticket.resolved`

2. The Function code to format different messages

**See `N8N_SLACK_SETUP.md` for code for all event types.**

---

## 🔧 Troubleshooting

### "Webhook not found"
- Make sure workflow is **Active** (toggle at top)
- Check the webhook path is `slack-notifications`

### "Slack not receiving messages"
- Verify Slack webhook URL in HTTP Request node
- Test Slack webhook independently:
  ```bash
  curl -X POST YOUR_SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text":"Test from curl"}'
  ```

### "Application not sending to n8n"
- Verify `N8N_WEBHOOK_URL` in Vercel environment variables
- Redeploy after adding environment variable
- Check application logs for `[n8n-Slack]` messages

---

## ✅ You're Done!

Your workflow should now:
1. Receive webhook calls from your application
2. Format beautiful Slack messages
3. Send to `#complaint-notifications` channel

**Next ticket created in your portal will automatically notify Slack!** 🚀

