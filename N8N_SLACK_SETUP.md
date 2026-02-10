# n8n Slack Integration Setup Guide

This guide explains how to set up Slack notifications through n8n workflows for maximum security and flexibility.

## 🔒 Why n8n for Slack Notifications?

**Security Benefits:**
- ✅ No direct Slack webhook exposure in application code
- ✅ No "unapproved app" warnings from Slack
- ✅ You control all workflows and permissions
- ✅ Easy to audit and modify without code changes
- ✅ Can route to multiple channels or services
- ✅ Better compliance for enterprise environments

**Flexibility Benefits:**
- ✅ Visual workflow builder - no coding needed
- ✅ Add filtering, routing, data transformation
- ✅ Route to multiple destinations (Slack, Email, Teams, etc.)
- ✅ Easy to enable/disable notifications
- ✅ Can add approval workflows or rate limiting

---

## 📋 Prerequisites

1. **n8n instance running** (cloud or self-hosted)
2. **Slack workspace** with admin access
3. **Slack Incoming Webhook** for your channel

---

## 🚀 Setup Steps

### Step 1: Create Slack Incoming Webhook

1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Manage** → **Custom Integrations** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Select channel: `#complaint-notifications`
5. Click **Add Incoming WebHooks Integration**
6. Copy the **Webhook URL**

---

### Step 2: Configure n8n Environment Variables

Add these environment variables to your application:

```bash
# n8n Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/slack-notifications
N8N_API_KEY=your-optional-api-key

# Application URL for ticket links
APP_URL=https://information-portal-beryl.vercel.app
```

**For Vercel:**
1. Go to Vercel Project → Settings → Environment Variables
2. Add `N8N_WEBHOOK_URL` with your n8n webhook URL
3. Optionally add `N8N_API_KEY` for security
4. Redeploy

---

### Step 3: Create n8n Workflows

I'll provide you with 4 workflow templates. Create each one in your n8n instance.

#### **Workflow 1: Ticket Created Notification**

**Webhook Path:** `/webhook/slack-notifications`

**Workflow Nodes:**
```
Webhook → Function (Format Message) → Slack → Set Success Response
```

**Webhook Settings:**
- Method: POST
- Path: `slack-notifications`
- Response: `Respond Immediately`

**Function Node (Format Message):**
```javascript
const data = $input.item.json.data;
const ticket = data.ticket;
const creator = data.creator;
const assignee = data.assignee;

// Build Slack Block Kit message
const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: `${ticket.priorityEmoji} New Ticket Created`,
      emoji: true
    }
  },
  {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Ticket:*\n<${ticket.url}|${ticket.number}>`
      },
      {
        type: "mrkdwn",
        text: `*Priority:*\n${ticket.priorityEmoji} ${ticket.priority}`
      },
      {
        type: "mrkdwn",
        text: `*Department:*\n${ticket.department}`
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
      text: `*Subject:* ${ticket.subject}\n*Vendor:* ${ticket.vendorHandle}`
    }
  }
];

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

return {
  json: {
    blocks: blocks,
    text: `New ticket: ${ticket.number} - ${ticket.subject}`
  }
};
```

**Slack Node Settings:**
- Webhook URL: Paste your Slack webhook URL
- Or use Slack OAuth if preferred

---

#### **Workflow 2: Ticket Assigned Notification**

Similar structure, but listen for `event === 'slack.ticket.assigned'`

**Function Node:**
```javascript
const data = $input.item.json.data;
const ticket = data.ticket;
const assignee = data.assignee;
const assigner = data.assigner;

const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: `${ticket.priorityEmoji} Ticket Assigned`,
      emoji: true
    }
  },
  {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Ticket:*\n<${ticket.url}|${ticket.number}>`
      },
      {
        type: "mrkdwn",
        text: `*Priority:*\n${ticket.priorityEmoji} ${ticket.priority}`
      }
    ]
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${assignee.email}* has been assigned to this ticket by ${assigner ? assigner.email : 'System'}`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Subject:* ${ticket.subject}\n*Department:* ${ticket.department}`
    }
  },
  {
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
  }
];

return {
  json: {
    blocks: blocks,
    text: `Ticket ${ticket.number} assigned to ${assignee.email}`
  }
};
```

---

#### **Workflow 3: Comment Mention Notification**

For `event === 'slack.comment.mention'`

**Function Node:**
```javascript
const data = $input.item.json.data;
const ticket = data.ticket;
const comment = data.comment;
const commenter = data.commenter;
const mentionedUsers = data.mentionedUsers;

const mentionsList = mentionedUsers.map(u => u.email).join(', ');

const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "💬 You were mentioned in a comment",
      emoji: true
    }
  },
  {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Ticket:*\n<${ticket.url}|${ticket.number}>`
      },
      {
        type: "mrkdwn",
        text: `*Mentioned:*\n${mentionsList}`
      }
    ]
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${commenter.email}* commented:\n> ${comment.text}`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Ticket Subject:* ${ticket.subject}`
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🔗 View Comment",
          emoji: true
        },
        url: ticket.url,
        style: "primary"
      }
    ]
  }
];

return {
  json: {
    blocks: blocks,
    text: `${commenter.email} mentioned ${mentionsList} in ticket ${ticket.number}`
  }
};
```

---

#### **Workflow 4: Ticket Resolved Notification**

For `event === 'slack.ticket.resolved'`

**Function Node:**
```javascript
const data = $input.item.json.data;
const ticket = data.ticket;
const resolver = data.resolver;

const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "✅ Ticket Resolved",
      emoji: true
    }
  },
  {
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Ticket:*\n<${ticket.url}|${ticket.number}>`
      },
      {
        type: "mrkdwn",
        text: `*Resolved By:*\n${resolver.email}`
      }
    ]
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Subject:* ${ticket.subject}\n*Department:* ${ticket.department}`
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🔗 View Ticket",
          emoji: true
        },
        url: ticket.url
      }
    ]
  }
];

return {
  json: {
    blocks: blocks,
    text: `Ticket ${ticket.number} resolved by ${resolver.email}`
  }
};
```

---

### Step 4: Single Webhook with Event Routing (Recommended)

Instead of 4 separate workflows, create ONE workflow that routes based on event type:

```
Webhook → Switch (on event) → [4 branches] → Slack
```

**Switch Node Configuration:**
- Mode: `Rules`
- Rules based on `{{ $json.event }}`
  - `slack.ticket.created`
  - `slack.ticket.assigned`
  - `slack.comment.mention`
  - `slack.ticket.resolved`

---

## 🎨 Advanced Features

### **1. Route by Priority**

Add a Switch node after Webhook to route urgent tickets to different channels:

```javascript
// In Switch node
if ($json.data.ticket.priority === 'Urgent') {
  return [0]; // Route to urgent channel
} else {
  return [1]; // Route to normal channel
}
```

### **2. Route by Department**

Send CX tickets to `#cx-tickets`, Finance to `#finance-tickets`, etc.

### **3. Add Rate Limiting**

Prevent notification spam by adding delay/throttle nodes.

### **4. Add Approval Workflows**

For critical actions, add human approval before sending notifications.

### **5. Multi-Destination Routing**

Send to Slack + Email + Teams simultaneously by splitting the workflow.

---

## 🧪 Testing

### Test Payload for Ticket Created:

```json
{
  "event": "slack.ticket.created",
  "data": {
    "ticket": {
      "id": "test-id",
      "number": "TS00001",
      "subject": "Test Ticket",
      "priority": "High",
      "priorityEmoji": "🟠",
      "department": "Tech",
      "vendorHandle": "test-vendor",
      "status": "New",
      "url": "https://information-portal-beryl.vercel.app/ticket/test-id"
    },
    "creator": {
      "id": "user-1",
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Tech"
    },
    "assignee": null,
    "timestamp": "2025-02-09T10:00:00.000Z"
  }
}
```

Send this via cURL to test:
```bash
curl -X POST https://your-n8n-instance.com/webhook/slack-notifications \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

---

## 📊 Monitoring

In n8n, you can:
- View execution history for each workflow
- See success/failure rates
- Debug with execution logs
- Set up alerts for failed executions

---

## 🔧 Troubleshooting

### Notifications not working?
1. Check n8n webhook is active
2. Verify `N8N_WEBHOOK_URL` in Vercel
3. Check n8n execution logs
4. Test webhook with cURL
5. Verify Slack webhook URL in n8n workflow

### Want to disable temporarily?
- Just deactivate the n8n workflow - no code changes needed!

### Need to change message format?
- Edit the Function node in n8n - no code deployment needed!

---

## 📝 Summary

**You Control Everything:**
- ✅ All Slack credentials stay in n8n (not in code)
- ✅ Easy to modify message formats
- ✅ Easy to route to different channels
- ✅ Can disable/enable without code changes
- ✅ Full audit trail in n8n
- ✅ Can add approval workflows
- ✅ Can route to multiple destinations

**The application just sends data to n8n, and n8n handles the rest!**

---

**Documentation Updated:** February 9, 2025
**Version:** 1.0.0
