# BigQuery + n8n Automation Setup

Complete guide for setting up automated workflows between your Information Portal, BigQuery, and n8n.

## 🎯 What's Automated

### 1. **Vendor Data Sync**
- Auto-sync vendors from BigQuery → Portal database
- Update vendor metrics (GMV, order counts, tiers)
- Runs on schedule or on-demand

### 2. **Ticket Automation**
- Auto-create tickets from BigQuery complaint data
- Link Fleek orders to tickets automatically
- Trigger n8n workflows on ticket events

### 3. **n8n Workflow Integration**
- Ticket created/updated/assigned/resolved events
- Vendor sync notifications
- Custom automation triggers

---

## 📋 Prerequisites

### 1. BigQuery Credentials
You need a Google Cloud service account key with BigQuery access.

**Get the key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `dogwood-baton-345622`
3. Navigate to: **IAM & Admin → Service Accounts**
4. Create/select service account
5. Grant roles: **BigQuery Data Viewer** + **BigQuery Job User**
6. Create JSON key → Download

### 2. n8n Configuration
You need your n8n webhook URL and optionally an API key.

**Get from n8n:**
1. Open your n8n instance
2. Create a webhook workflow or use existing one
3. Copy the webhook URL
4. (Optional) Set up API key in n8n settings

---

## ⚙️ Configuration

### Step 1: Add Environment Variables

Update your `.env` file:

```bash
# BigQuery Configuration
BIGQUERY_PROJECT_ID=dogwood-baton-345622
BIGQUERY_DATASET=fleek_hub
BIGQUERY_ORDERS_TABLE=order_line_details
BIGQUERY_LOCATION=US

# Option A: Use JSON key file (recommended for local development)
BIGQUERY_CREDENTIALS_PATH=./service-account-key.json

# Option B: Inline JSON (for Vercel deployment)
# BIGQUERY_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# n8n Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
N8N_API_KEY=your-n8n-api-key-if-required

# Alternative variable names (also supported)
n8n_webhook_url=https://your-n8n-instance.com/webhook/your-webhook-id
n8n_api_key=your-api-key
```

### Step 2: Add Service Account Key (if using file)

Place your downloaded JSON key file in the project root:
```bash
mv ~/Downloads/service-account-key.json ./service-account-key.json
```

**Important:** This file is in `.gitignore` - never commit it!

### Step 3: Test the Connection

```bash
# Test BigQuery connection
curl http://localhost:5000/api/bigquery/test

# Test n8n configuration
curl http://localhost:5000/api/n8n/status
```

Expected responses:
```json
// BigQuery test
{
  "connected": true,
  "configured": true
}

// n8n status
{
  "configured": true,
  "apiKeySet": true,
  "webhookUrlSet": true
}
```

---

## 🚀 Usage

### Manual Triggers (API Endpoints)

#### 1. Sync Vendors from BigQuery
```bash
POST http://localhost:5000/api/automation/bigquery/sync-vendors

# Response:
{
  "success": true,
  "message": "Vendor sync completed",
  "results": {
    "imported": 145,
    "updated": 5,
    "errors": 0
  }
}
```

#### 2. Sync Vendor Metrics
```bash
POST http://localhost:5000/api/automation/bigquery/sync-metrics

# Response:
{
  "success": true,
  "message": "Metrics sync completed",
  "vendorsUpdated": 150
}
```

#### 3. Full Sync (All Automations)
```bash
POST http://localhost:5000/api/automation/bigquery/sync-all

# Response:
{
  "success": true,
  "message": "Full BigQuery sync completed"
}
```

#### 4. Trigger Custom n8n Workflow
```bash
POST http://localhost:5000/api/n8n/trigger
Content-Type: application/json

{
  "event": "custom.event",
  "data": {
    "key": "value"
  }
}
```

### Scheduled Automation (via n8n)

#### Option A: n8n Scheduler → Portal

Create an n8n workflow with a **Schedule Trigger**:

```
Schedule (Cron: 0 */6 * * *)  →  HTTP Request
```

**HTTP Request Node Config:**
- Method: POST
- URL: `https://your-portal.vercel.app/api/automation/bigquery/sync-all`
- Authentication: None (or add if you implement auth)

This runs every 6 hours automatically.

#### Option B: Portal → n8n Webhooks

Your portal automatically triggers n8n workflows on these events:

| Event | When | Data Sent |
|-------|------|-----------|
| `ticket.created` | New ticket created | Full ticket object |
| `ticket.updated` | Ticket modified | Updated ticket data |
| `ticket.assigned` | Ticket assigned to user | Ticket + assignee info |
| `ticket.resolved` | Ticket marked resolved | Ticket + resolution notes |
| `vendor.sync.complete` | Vendor sync finishes | Import/update counts |
| `bigquery.sync.complete` | Full sync finishes | Sync summary |

**n8n Webhook Workflow Example:**
```
Webhook Trigger → Filter (event = "ticket.created") → Send Email/Slack
```

---

## 🔧 n8n Workflow Examples

### Example 1: Auto-Sync on Schedule

```
Schedule (Daily 2 AM)
  ↓
HTTP Request (POST to /api/automation/bigquery/sync-all)
  ↓
IF error
  ↓
Send Slack Alert
```

### Example 2: Notify on High-Priority Ticket

```
Webhook (Listen for ticket.created)
  ↓
IF data.priorityTier = "Critical"
  ↓
Send Email to Manager
  ↓
Create Slack Channel
  ↓
Post to Microsoft Teams
```

### Example 3: Vendor Data Pipeline

```
Schedule (Every 6 hours)
  ↓
HTTP Request (Sync vendors)
  ↓
HTTP Request (Sync metrics)
  ↓
BigQuery Insert (Log sync results)
  ↓
Google Sheets (Update dashboard)
```

---

## 📊 Available BigQuery Tables

Your project has access to:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `aurora_postgres_public.vendors` | Vendor master data | handle, name, gmv_tier, kam, zone |
| `fleek_hub.order_line_details` | Order/transaction data | fleek_id, vendor, gmv, order_date |

### Custom Queries

You can query BigQuery directly from the portal:

```typescript
// In server code
import { BigQuery } from '@google-cloud/bigquery';

const query = `
  SELECT vendor, COUNT(*) as order_count
  FROM \`dogwood-baton-345622.fleek_hub.order_line_details\`
  WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY vendor
  ORDER BY order_count DESC
  LIMIT 10
`;
```

---

## 🔐 Security Notes

1. **Never commit credentials** - `.gitignore` already includes:
   - `service-account-key.json`
   - `.env`

2. **Vercel Environment Variables**:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all BigQuery and n8n variables
   - Use `BIGQUERY_CREDENTIALS_JSON` (inline) for production

3. **n8n API Key**: Optional but recommended for production

---

## 🐛 Troubleshooting

### BigQuery "Permission Denied"
```bash
# Check service account has these roles:
- BigQuery Data Viewer
- BigQuery Job User
```

### n8n Webhooks Not Triggering
```bash
# Verify webhook URL is accessible:
curl -X POST https://your-n8n-instance.com/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Vendor Sync Errors
```bash
# Check BigQuery connection:
curl http://localhost:5000/api/bigquery/test

# Check table exists:
SELECT * FROM `dogwood-baton-345622.aurora_postgres_public.vendors` LIMIT 1
```

---

## 📈 Monitoring

### Portal Logs
```bash
# Development
npm run dev

# Check logs for:
[BigQuery Automation] ...
[n8n] ...
```

### n8n Execution Logs
- Check n8n dashboard → Executions
- View webhook trigger history
- Monitor for errors

---

## 🎉 Quick Start Checklist

- [ ] Add `BIGQUERY_PROJECT_ID` to `.env`
- [ ] Add service account key file OR inline JSON
- [ ] Add `N8N_WEBHOOK_URL` to `.env`
- [ ] Test BigQuery: `curl http://localhost:5000/api/bigquery/test`
- [ ] Test n8n: `curl http://localhost:5000/api/n8n/status`
- [ ] Run manual sync: `POST /api/automation/bigquery/sync-vendors`
- [ ] Create n8n schedule workflow for auto-sync
- [ ] Set up ticket event webhooks in n8n
- [ ] Deploy to Vercel with environment variables

---

## 🚀 Next Steps

1. **Test vendor sync** - Run manual sync to verify data flow
2. **Set up n8n schedules** - Automate daily/hourly syncs
3. **Create notification workflows** - Alert on high-priority tickets
4. **Build dashboards** - Use BigQuery data for analytics
5. **Expand automations** - Add more custom workflows

Need help? Check the logs or reach out! 🙌
