# n8n Workflow Templates

Pre-built n8n workflows for automating your Information Portal.

## 📦 Available Workflows

### 1. Scheduled Vendor Sync from BigQuery
**File:** `1-scheduled-vendor-sync.json`

**What it does:**
- Runs every 6 hours automatically
- Syncs vendors from BigQuery to Portal database
- Sends Slack notifications on success/failure

**Setup:**
1. Import workflow into n8n
2. Update Slack channel names (`#alerts`)
3. Add Slack credentials
4. Activate workflow

---

### 2. High Priority Ticket Alert
**File:** `2-high-priority-ticket-alert.json`

**What it does:**
- Listens for new ticket creation events
- Checks if ticket is Critical priority
- Sends Slack alert + Email to manager

**Setup:**
1. Import workflow into n8n
2. Copy the Webhook URL
3. Add to Portal .env:
   ```bash
   N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
   ```
4. Configure Slack channel (`#urgent-tickets`)
5. Set manager email address
6. Activate workflow

**How to test:**
```bash
# Create a critical priority ticket in the portal
# Or test manually:
curl -X POST https://your-n8n.com/webhook/xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ticket.created",
    "data": {
      "ticketNumber": "TEST-001",
      "vendorHandle": "test-vendor",
      "subject": "Critical Issue",
      "priorityTier": "Critical",
      "priorityBadge": "P0"
    }
  }'
```

---

### 3. Vendor Metrics to Google Sheets Dashboard
**File:** `3-vendor-metrics-dashboard.json`

**What it does:**
- Runs daily at 8 AM
- Fetches all vendors from Portal API
- Updates Google Sheets with latest metrics
- Sends Slack notification when complete

**Setup:**
1. Create a Google Sheet
2. Copy the Sheet ID from URL
3. Import workflow into n8n
4. Replace `your-google-sheet-id` with actual ID
5. Add Google Sheets credentials
6. Configure Slack channel (`#reports`)
7. Activate workflow

**Sheet Columns:**
- Vendor Handle
- Vendor Name
- GMV Tier
- GMV 90 Day
- KAM
- Zone
- Region
- Persona
- Last Updated

---

## 🚀 Quick Start

### Import Workflows

**Method 1: Via n8n UI**
1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select the JSON file
4. Update configuration
5. Activate

**Method 2: Via n8n CLI**
```bash
n8n import:workflow --input=./n8n-workflows/1-scheduled-vendor-sync.json
```

### Configure Portal Integration

Add your n8n webhook URL to `.env`:
```bash
# For workflow #2 (High Priority Ticket Alert)
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/ticket-created

# Optional: For API-based integration
N8N_API_KEY=your-api-key
N8N_BASE_URL=https://your-n8n.com
```

### Test Connection

```bash
# Check n8n status
curl http://localhost:5000/api/n8n/status

# Test workflow trigger
curl -X POST http://localhost:5000/api/n8n/trigger \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {"message": "Hello from Portal!"}}'
```

---

## 🔧 Customization

### Change Schedule
Edit the `Schedule` node:
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 8 AM: `0 8 * * *`
- Weekdays at 9 AM: `0 9 * * 1-5`

### Add More Notifications

**Discord:**
- Add Discord node
- Set webhook URL
- Connect to workflow

**Microsoft Teams:**
- Add Teams node
- Configure incoming webhook
- Connect to workflow

**SMS (Twilio):**
- Add Twilio node
- Set phone numbers
- Connect to workflow

---

## 📊 Workflow Events

Your Portal automatically sends these events to n8n:

| Event | Trigger | Data Included |
|-------|---------|---------------|
| `ticket.created` | New ticket created | Full ticket object |
| `ticket.updated` | Ticket modified | Updated fields |
| `ticket.assigned` | Ticket assigned | Assignee info |
| `ticket.resolved` | Ticket resolved | Resolution notes |
| `vendor.sync.complete` | Vendor sync done | Import/update counts |
| `bigquery.sync.complete` | Full sync done | Summary stats |
| `bigquery.sync.failed` | Sync error | Error message |

### Create Custom Event Handlers

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "custom-event"
      }
    },
    {
      "name": "Filter by Event",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "dataPropertyName": "event",
        "rules": {
          "rules": [
            {
              "value": "ticket.created",
              "output": 0
            },
            {
              "value": "ticket.assigned",
              "output": 1
            }
          ]
        }
      }
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Workflow Not Triggering

1. Check webhook URL in `.env`
2. Verify workflow is activated in n8n
3. Check n8n execution logs
4. Test with curl:
   ```bash
   curl -X POST https://your-n8n.com/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Slack Notifications Not Sending

1. Add Slack OAuth credentials in n8n
2. Verify channel name (include #)
3. Check bot has access to channel
4. Test Slack node in isolation

### Google Sheets Not Updating

1. Add Google Sheets OAuth credentials
2. Share sheet with service account email
3. Verify sheet ID is correct
4. Check node execution logs

---

## 💡 Advanced Use Cases

### Multi-Stage Approval
```
Ticket Created → Is High Value? → Notify Manager → Wait for Approval → Auto-Assign
```

### Intelligent Routing
```
Ticket Created → Analyze Category → Route to Specialized Team → Notify on Slack
```

### SLA Monitoring
```
Schedule Every Hour → Check Overdue Tickets → Send Escalation → Update Priority
```

### Vendor Performance Tracking
```
Schedule Daily → Fetch Metrics → Calculate KPIs → Update Dashboard → Alert if Threshold
```

---

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community](https://community.n8n.io/)
- [Workflow Templates](https://n8n.io/workflows/)
- [Portal API Documentation](../AUTOMATION-SETUP.md)

---

## 🎉 Next Steps

1. ✅ Import workflow templates
2. ✅ Configure webhook URLs
3. ✅ Add notification credentials
4. ✅ Test each workflow
5. ✅ Activate workflows
6. ✅ Monitor execution logs
7. ✅ Create custom workflows

Happy automating! 🚀
