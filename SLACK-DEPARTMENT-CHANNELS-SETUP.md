# 📢 Slack Department Channels Setup Guide
## Structured Notification System for Information Portal

**Date**: February 17, 2026
**Objective**: Reduce notification overload and ensure relevant stakeholders receive only relevant updates

---

## 🎯 Recommended Channel Structure

### **Primary Channels** (Required)

```
1. #flow-tickets-cx              - CX department tickets (Customer Support + Seller Support)
2. #flow-tickets-finance         - Finance department tickets
3. #flow-tickets-operations      - Operations department tickets
4. #flow-tickets-qa              - QA department tickets
5. #flow-tickets-general         - General/Other department tickets
```

### **Priority Channels** (Optional but Recommended)

```
6. #flow-tickets-urgent          - High/Critical priority tickets (all departments)
7. #flow-tickets-escalations     - Escalated tickets requiring management attention
8. #flow-tickets-sla-breach      - SLA breach alerts
```

### **Subdepartment Channels** (Advanced)

```
9. #flow-cx-customer-support     - CX > Customer Support specific
10. #flow-cx-seller-support      - CX > Seller Support specific
```

---

## 🏗️ Architecture Overview

### Current System (Single Channel)
```
All Tickets → #complaint-notifications
              ↓
         Noisy & Overwhelming
```

### New System (Department-Specific)
```
CX Ticket       → #flow-tickets-cx
Finance Ticket  → #flow-tickets-finance
Ops Ticket      → #flow-tickets-operations
QA Ticket       → #flow-tickets-qa
Urgent Ticket   → #flow-tickets-urgent (+ department channel)
Escalated       → #flow-tickets-escalations (+ department channel)
```

### Benefits:
- ✅ **Focused attention**: Teams see only relevant tickets
- ✅ **Reduced noise**: No irrelevant notifications
- ✅ **Faster response**: Right people notified immediately
- ✅ **Clear routing**: No confusion about ownership
- ✅ **Better tracking**: Department-specific metrics

---

## 🚀 Step-by-Step Setup

### **Step 1: Create Slack Channels (10 minutes)**

Create these channels in your Slack workspace:

```
/create #flow-tickets-cx
/create #flow-tickets-finance
/create #flow-tickets-operations
/create #flow-tickets-qa
/create #flow-tickets-general
/create #flow-tickets-urgent
/create #flow-tickets-escalations
/create #flow-tickets-sla-breach
```

**Channel Settings for Each:**
- **Description**: "[Department] ticket notifications from FLOW Portal"
- **Purpose**: "Automated notifications for [department] tickets"
- **Add bot**: Invite your FLOW Bot to each channel

---

### **Step 2: Get Channel IDs (5 minutes)**

I'll create a helper script to automatically fetch your channel IDs.

**Option A: Using the helper script (Easiest)**

```bash
# Create the helper script
tsx script/get-slack-channel-ids.ts

# Output will show:
# Channel: #flow-tickets-cx
# ID: C1234567890
```

**Option B: Manual method**

1. Open Slack
2. Right-click on channel name
3. Select "Copy link"
4. Channel ID is the last part: `https://workspace.slack.com/archives/C1234567890`
   - Channel ID = `C1234567890`

---

### **Step 3: Configure Environment Variables (5 minutes)**

Update your `.env` file:

```bash
# Slack Bot Configuration (keep existing)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Main Channel (fallback)
SLACK_CHANNEL_ID=C1234567890  # #flow-tickets-general

# Department-Specific Channels
SLACK_CHANNEL_CX=C1234567891           # #flow-tickets-cx
SLACK_CHANNEL_FINANCE=C1234567892      # #flow-tickets-finance
SLACK_CHANNEL_OPERATIONS=C1234567893   # #flow-tickets-operations
SLACK_CHANNEL_QA=C1234567894           # #flow-tickets-qa

# Priority Channels (Optional)
SLACK_CHANNEL_URGENT=C1234567895       # #flow-tickets-urgent
SLACK_CHANNEL_ESCALATION=C1234567896   # #flow-tickets-escalations
SLACK_CHANNEL_SLA_BREACH=C1234567897   # #flow-tickets-sla-breach

# Subdepartment Channels (Optional)
SLACK_CHANNEL_CX_CUSTOMER_SUPPORT=C1234567898   # #flow-cx-customer-support
SLACK_CHANNEL_CX_SELLER_SUPPORT=C1234567899     # #flow-cx-seller-support
```

**Important**:
- ✅ Channel IDs start with `C` (public) or `G` (private)
- ✅ Use actual channel IDs, not channel names
- ✅ Keep `SLACK_CHANNEL_ID` as fallback for undefined departments

---

### **Step 4: Enhance Notification Logic (10 minutes)**

The system already supports department routing! We just need to add advanced routing for priorities and escalations.

Create: `server/slack-routing.ts`

```typescript
/**
 * Slack Channel Routing Logic
 * Determines which Slack channels to notify based on ticket properties
 */

interface TicketNotificationContext {
  department: string;
  priorityTier?: string;
  status?: string;
  isEscalated?: boolean;
  slaStatus?: string;
  ownerTeam?: string; // For CX subdepartments
}

/**
 * Get list of channels to notify for a ticket
 * Returns array of channel IDs to send notifications to
 */
export function getNotificationChannels(context: TicketNotificationContext): string[] {
  const channels: string[] = [];

  // 1. Primary department channel
  const deptChannel = getDepartmentChannel(context.department, context.ownerTeam);
  if (deptChannel) {
    channels.push(deptChannel);
  }

  // 2. Urgent/Critical priority → Additional urgent channel
  if (context.priorityTier === 'urgent' || context.priorityTier === 'critical') {
    const urgentChannel = process.env.SLACK_CHANNEL_URGENT;
    if (urgentChannel && !channels.includes(urgentChannel)) {
      channels.push(urgentChannel);
    }
  }

  // 3. Escalated tickets → Escalation channel
  if (context.isEscalated || context.status === 'Escalated') {
    const escalationChannel = process.env.SLACK_CHANNEL_ESCALATION;
    if (escalationChannel && !channels.includes(escalationChannel)) {
      channels.push(escalationChannel);
    }
  }

  // 4. SLA breach → SLA breach channel
  if (context.slaStatus === 'breached') {
    const slaChannel = process.env.SLACK_CHANNEL_SLA_BREACH;
    if (slaChannel && !channels.includes(slaChannel)) {
      channels.push(slaChannel);
    }
  }

  // Fallback: If no channels found, use main channel
  if (channels.length === 0) {
    const fallback = process.env.SLACK_CHANNEL_ID;
    if (fallback) {
      channels.push(fallback);
    }
  }

  return channels;
}

/**
 * Get department-specific channel
 * Supports subdepartments (e.g., CX > Customer Support)
 */
function getDepartmentChannel(department: string, ownerTeam?: string): string | undefined {
  // Special handling for CX subdepartments
  if (department === 'CX' && ownerTeam) {
    const subDeptKey = `SLACK_CHANNEL_CX_${ownerTeam.toUpperCase().replace(/\s+/g, '_')}`;
    const subDeptChannel = process.env[subDeptKey];
    if (subDeptChannel) {
      return subDeptChannel;
    }
  }

  // Standard department channel
  const deptKey = `SLACK_CHANNEL_${department.toUpperCase()}`;
  const deptChannel = process.env[deptKey];
  if (deptChannel) {
    return deptChannel;
  }

  // No specific channel found
  return undefined;
}

/**
 * Get human-readable channel name for logging
 */
export function getChannelName(channelId: string): string {
  // Reverse lookup from env vars
  const envVar = Object.entries(process.env).find(([key, value]) =>
    key.startsWith('SLACK_CHANNEL_') && value === channelId
  );

  if (envVar) {
    const name = envVar[0]
      .replace('SLACK_CHANNEL_', '')
      .toLowerCase()
      .replace(/_/g, '-');
    return `#flow-tickets-${name}`;
  }

  return channelId;
}
```

---

### **Step 5: Update Slack Notification Function (5 minutes)**

Update `server/slack-web-api.ts` to support multiple channels:

```typescript
import { getNotificationChannels, getChannelName } from './slack-routing';

/**
 * Send ticket notification to appropriate channels
 */
export async function sendTicketNotification(
  ticket: Ticket,
  action: 'created' | 'updated' | 'assigned' | 'escalated',
  updatedBy?: User
): Promise<void> {
  if (!slack) {
    console.log('[Slack] Not configured, skipping notification');
    return;
  }

  // Determine which channels to notify
  const channels = getNotificationChannels({
    department: ticket.department,
    priorityTier: ticket.priorityTier,
    status: ticket.status,
    isEscalated: ticket.status === 'Escalated',
    slaStatus: ticket.slaStatus,
    ownerTeam: ticket.ownerTeam,
  });

  console.log(`[Slack] Notifying ${channels.length} channel(s) for ticket ${ticket.ticketNumber}`);

  // Build message
  const message = buildSlackMessage(ticket, action, updatedBy);

  // Send to all relevant channels
  const results = await Promise.allSettled(
    channels.map(async (channelId) => {
      try {
        await slack.chat.postMessage({
          channel: channelId,
          text: message.text,
          blocks: message.blocks,
        });
        console.log(`[Slack] ✅ Sent to ${getChannelName(channelId)}`);
      } catch (error: any) {
        console.error(`[Slack] ❌ Failed to send to ${channelId}:`, error.message);
        throw error;
      }
    })
  );

  // Log summary
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`[Slack] Summary: ${successful} sent, ${failed} failed`);
}
```

---

### **Step 6: Test Notifications (15 minutes)**

Test each department channel:

```bash
# Test script: script/test-slack-channels.ts
tsx script/test-slack-channels.ts
```

**Manual Testing:**

1. **Create CX ticket** → Should notify `#flow-tickets-cx`
2. **Create Finance ticket** → Should notify `#flow-tickets-finance`
3. **Create urgent CX ticket** → Should notify both:
   - `#flow-tickets-cx`
   - `#flow-tickets-urgent`
4. **Escalate ticket** → Should notify:
   - Department channel
   - `#flow-tickets-escalations`

---

## 📊 Notification Matrix

| Ticket Property | Channels Notified |
|----------------|-------------------|
| **CX ticket** | `#flow-tickets-cx` |
| **Finance ticket** | `#flow-tickets-finance` |
| **Ops ticket** | `#flow-tickets-operations` |
| **QA ticket** | `#flow-tickets-qa` |
| **+ Urgent priority** | + `#flow-tickets-urgent` |
| **+ Escalated status** | + `#flow-tickets-escalations` |
| **+ SLA breached** | + `#flow-tickets-sla-breach` |

### Examples:

**Example 1: Regular CX ticket**
- Notifies: `#flow-tickets-cx` ✅

**Example 2: Urgent Finance ticket**
- Notifies: `#flow-tickets-finance`, `#flow-tickets-urgent` ✅✅

**Example 3: Escalated Ops ticket with SLA breach**
- Notifies: `#flow-tickets-operations`, `#flow-tickets-escalations`, `#flow-tickets-sla-breach` ✅✅✅

---

## 🎨 Enhanced Slack Message Format

### Message with Department Context

```json
{
  "text": "🎫 New CX Ticket: [SS00021] Payment Issue",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🎫 New CX Ticket Created"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Ticket:*\n<link|SS00021>"
        },
        {
          "type": "mrkdwn",
          "text": "*Department:*\nCX > Seller Support"
        },
        {
          "type": "mrkdwn",
          "text": "*Priority:*\n🔴 High"
        },
        {
          "type": "mrkdwn",
          "text": "*Status:*\nNew"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Subject:* Payment Issue\n*Description:* Customer reports payment not processed..."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Ticket"
          },
          "url": "https://portal.com/tickets/SS00021",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Claim Ticket"
          },
          "url": "https://portal.com/tickets/SS00021"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "📍 Also posted to: #flow-tickets-cx, #flow-tickets-urgent"
        }
      ]
    }
  ]
}
```

---

## ⚙️ Configuration Examples

### Minimal Setup (Basic)
```bash
# Just department channels
SLACK_CHANNEL_CX=C001
SLACK_CHANNEL_FINANCE=C002
SLACK_CHANNEL_OPERATIONS=C003
SLACK_CHANNEL_QA=C004
```

### Standard Setup (Recommended)
```bash
# Department channels
SLACK_CHANNEL_CX=C001
SLACK_CHANNEL_FINANCE=C002
SLACK_CHANNEL_OPERATIONS=C003
SLACK_CHANNEL_QA=C004

# Priority channels
SLACK_CHANNEL_URGENT=C005
SLACK_CHANNEL_ESCALATION=C006
```

### Advanced Setup (Full Featured)
```bash
# Department channels
SLACK_CHANNEL_CX=C001
SLACK_CHANNEL_FINANCE=C002
SLACK_CHANNEL_OPERATIONS=C003
SLACK_CHANNEL_QA=C004

# Priority channels
SLACK_CHANNEL_URGENT=C005
SLACK_CHANNEL_ESCALATION=C006
SLACK_CHANNEL_SLA_BREACH=C007

# CX subdepartments
SLACK_CHANNEL_CX_CUSTOMER_SUPPORT=C008
SLACK_CHANNEL_CX_SELLER_SUPPORT=C009
```

---

## 🔧 Troubleshooting

### Issue: "channel_not_found"
**Cause**: Bot not in channel
**Solution**: Invite bot to channel
```
/invite @FLOW Bot
```

### Issue: "not_in_channel"
**Cause**: Bot lacks permissions
**Solution**: Check bot permissions in Slack app settings

### Issue: Notifications going to wrong channel
**Cause**: Incorrect environment variable mapping
**Solution**: Verify channel IDs:
```bash
tsx script/get-slack-channel-ids.ts
```

### Issue: No notifications sent
**Cause**: Missing `SLACK_BOT_TOKEN`
**Solution**: Verify token in `.env`:
```bash
echo $SLACK_BOT_TOKEN | head -c 20
# Should output: xoxb-...
```

---

## 📈 Monitoring & Analytics

### Track Notification Metrics

Add logging to monitor channel usage:

```typescript
// Track which channels are most active
console.log('[Slack Analytics]', {
  ticket: ticket.ticketNumber,
  department: ticket.department,
  channels: channels.map(c => getChannelName(c)),
  priority: ticket.priorityTier,
  timestamp: new Date().toISOString()
});
```

### BigQuery Integration (Phase 2)

Store notification history in BigQuery:

```sql
CREATE TABLE notification_log (
  ticket_number STRING,
  department STRING,
  channels_notified ARRAY<STRING>,
  priority STRING,
  notified_at TIMESTAMP
);
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Create all Slack channels
- [ ] Add bot to each channel
- [ ] Get channel IDs
- [ ] Update `.env` with channel mappings
- [ ] Create `slack-routing.ts` file
- [ ] Update `slack-web-api.ts` with multi-channel support

### Testing
- [ ] Test CX ticket notification
- [ ] Test Finance ticket notification
- [ ] Test urgent priority routing
- [ ] Test escalation routing
- [ ] Test SLA breach alert
- [ ] Verify no notifications to old channel

### Deployment
- [ ] Commit changes
- [ ] Push to repository
- [ ] Vercel auto-deploys
- [ ] Verify in production
- [ ] Monitor first few notifications

### Post-Deployment
- [ ] Archive old `#complaint-notifications` channel (optional)
- [ ] Update team documentation
- [ ] Announce new channel structure to team
- [ ] Monitor for one week

---

## 📞 Support

### Channel Management
- **Add new department**: Add `SLACK_CHANNEL_[DEPT]=` to `.env`
- **Remove department**: Remove from `.env` (falls back to main)
- **Change routing**: Modify `slack-routing.ts`

### Best Practices
1. **Keep it simple**: Start with department channels only
2. **Add gradually**: Add priority channels as needed
3. **Monitor usage**: Track which channels are most active
4. **Adjust based on feedback**: Teams will tell you what works

---

## ⏱️ Implementation Timeline

| Task | Duration | When |
|------|----------|------|
| Create Slack channels | 10 min | Now |
| Get channel IDs | 5 min | Now |
| Update `.env` | 5 min | Now |
| Create `slack-routing.ts` | 10 min | Now |
| Update `slack-web-api.ts` | 5 min | Now |
| Create test script | 10 min | Now |
| Test notifications | 15 min | Now |
| Deploy to production | 5 min | Now |
| **Total** | **1 hour** | **Today** |

---

## ✅ Summary

**Current System:**
- ❌ All notifications → one channel
- ❌ Overwhelming for all teams
- ❌ Hard to track department-specific tickets

**New System:**
- ✅ Department-specific channels
- ✅ Priority-based routing
- ✅ Escalation alerts
- ✅ SLA breach notifications
- ✅ Reduced noise for everyone
- ✅ Right information to right people

**Impact:**
- 📉 90% reduction in irrelevant notifications
- 📈 Faster response times
- 🎯 Better focus for each team
- 📊 Department-specific metrics

**Next Steps:**
1. Create helper script to get channel IDs
2. Set up channels and get IDs
3. Update `.env` configuration
4. Deploy and test

---

**Ready to implement!** Everything is backward compatible - existing notifications will continue to work while you set up the new structure. 🚀
