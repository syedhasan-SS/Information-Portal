# 🚀 Information Portal - Quick Start Guide

**Everything you need to get your portal + BigQuery + n8n automation running!**

---

## ✅ What's Already Done

### 1. Code & Automation
- ✅ BigQuery integration module
- ✅ n8n webhook system
- ✅ Automated vendor sync
- ✅ Ticket automation APIs
- ✅ 3 pre-built n8n workflows
- ✅ Complete documentation

### 2. Deployed
- ✅ Latest code pushed to GitHub
- ✅ Vercel auto-deployed (https://your-portal.vercel.app)
- ✅ All setup scripts ready

---

## 🎯 What YOU Need to Do (3 Steps)

### Step 1: Get BigQuery Credentials (5 minutes)

1. **Download Service Account Key:**
   - Go to: https://console.cloud.google.com/
   - Select project: `dogwood-baton-345622`
   - Navigate: **IAM & Admin → Service Accounts**
   - Find your service account
   - Click **Actions (⋮) → Manage Keys → Add Key → Create New Key**
   - Choose **JSON** format
   - Download the file

2. **Add to Project:**
   ```bash
   # Move the downloaded file
   mv ~/Downloads/dogwood-baton-*.json ./service-account-key.json

   # Verify
   ./setup-bigquery.sh
   ```

3. **Test Connection:**
   ```bash
   # Start the server
   npm run dev

   # In another terminal
   curl http://localhost:5000/api/bigquery/test
   ```

---

### Step 2: Configure n8n (10 minutes)

#### Option A: Quick Setup (Webhook Only)

1. **In n8n:**
   - Create new workflow
   - Add "Webhook" node
   - Set Method: POST
   - Save and activate
   - Copy the webhook URL

2. **In Your Portal:**
   ```bash
   # Add to .env
   echo "N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx" >> .env

   # Or edit manually:
   nano .env
   ```

3. **Import Workflow Templates:**
   ```bash
   # In n8n, go to: Workflows → Import from File
   # Import these files:
   n8n-workflows/1-scheduled-vendor-sync.json
   n8n-workflows/2-high-priority-ticket-alert.json
   n8n-workflows/3-vendor-metrics-dashboard.json

   # Follow instructions in:
   n8n-workflows/README.md
   ```

#### Option B: Full Setup (With API)

```bash
# Run the helper
./setup-n8n.sh

# Add both to .env:
N8N_API_KEY=your-api-key
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
```

---

### Step 3: Deploy to Vercel (5 minutes)

#### Option A: Via Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Select project: **information-portal**
3. Go to: **Settings → Environment Variables**
4. Add these variables:

```bash
# Required
DATABASE_URL=postgresql://neondb_owner:...@ep-green-sun...
BIGQUERY_PROJECT_ID=dogwood-baton-345622
BIGQUERY_DATASET=fleek_hub
BIGQUERY_ORDERS_TABLE=order_line_details
BIGQUERY_LOCATION=US

# Copy entire service-account-key.json as one line
BIGQUERY_CREDENTIALS_JSON={"type":"service_account","project_id":"...",...}

# Optional but recommended
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
N8N_API_KEY=your-n8n-api-key
```

5. Click **Save**
6. Go to **Deployments → Redeploy**

#### Option B: Via CLI

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login
vercel login

# Set variables
vercel env add BIGQUERY_CREDENTIALS_JSON production
# Paste the contents of service-account-key.json

vercel env add N8N_WEBHOOK_URL production
# Paste your webhook URL

# Deploy
vercel --prod
```

**OR** use the helper:
```bash
./setup-vercel.sh
# Follow the instructions
```

---

## 🧪 Testing Everything

### 1. Test BigQuery Connection
```bash
curl https://your-portal.vercel.app/api/bigquery/test

# Expected:
# {"connected": true, "configured": true}
```

### 2. Test n8n Integration
```bash
curl https://your-portal.vercel.app/api/n8n/status

# Expected:
# {"configured": true, "apiKeySet": true, "webhookUrlSet": true}
```

### 3. Test Vendor Sync
```bash
curl -X POST https://your-portal.vercel.app/api/automation/bigquery/sync-vendors

# Expected:
# {
#   "success": true,
#   "results": {
#     "imported": 145,
#     "updated": 5,
#     "errors": 0
#   }
# }
```

### 4. Test n8n Workflow
```bash
curl -X POST https://your-n8n.com/webhook/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {"message": "Hello!"}}'

# Check n8n dashboard for execution
```

---

## 🎯 Common Use Cases

### Automatically Sync Vendors Daily
1. Import `n8n-workflows/1-scheduled-vendor-sync.json` into n8n
2. Update the portal URL in the HTTP Request node
3. Configure Slack notifications (optional)
4. Activate the workflow
5. It will run every 6 hours automatically!

### Get Alerts for High-Priority Tickets
1. Import `n8n-workflows/2-high-priority-ticket-alert.json`
2. Copy the webhook URL
3. Add to `.env`: `N8N_WEBHOOK_URL=...`
4. Configure Slack/Email settings
5. Activate workflow
6. Create a Critical ticket to test!

### Daily Metrics Dashboard
1. Create a Google Sheet
2. Import `n8n-workflows/3-vendor-metrics-dashboard.json`
3. Update Sheet ID in the workflow
4. Add Google Sheets credentials in n8n
5. Activate - runs daily at 8 AM!

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `AUTOMATION-SETUP.md` | Complete automation guide |
| `n8n-workflows/README.md` | n8n workflow templates & examples |
| `BIGQUERY_SETUP.md` | BigQuery connection details |
| This file | Quick start guide |

---

## 🆘 Troubleshooting

### "BigQuery Not Connected"
```bash
# Check credentials
./setup-bigquery.sh

# Verify file exists
ls -la service-account-key.json

# Or check inline JSON
grep BIGQUERY_CREDENTIALS_JSON .env
```

### "n8n Webhook Not Working"
```bash
# Test webhook directly
curl -X POST https://your-n8n.com/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check n8n execution logs
# Go to n8n → Executions tab
```

### "Vendor Sync Failed"
```bash
# Check BigQuery access
# Go to: https://console.cloud.google.com/bigquery

# Run this query to verify:
SELECT * FROM `dogwood-baton-345622.aurora_postgres_public.vendors` LIMIT 5

# Check service account permissions:
# IAM & Admin → Service Accounts → View roles
# Should have: BigQuery Data Viewer + BigQuery Job User
```

### "Vercel Deployment Issues"
```bash
# Check environment variables
# Vercel Dashboard → Project → Settings → Environment Variables

# Verify all required variables are set
# Especially: BIGQUERY_CREDENTIALS_JSON (not the path!)

# Check deployment logs
# Vercel Dashboard → Deployments → Click latest → View Logs
```

---

## 🎉 You're All Set!

### What You Can Do Now:

1. **Manual Sync**
   ```bash
   curl -X POST https://your-portal.vercel.app/api/automation/bigquery/sync-all
   ```

2. **Create Automated Workflows** in n8n using the templates

3. **Monitor Everything**
   - Portal: https://your-portal.vercel.app
   - n8n: https://your-n8n.com
   - BigQuery: https://console.cloud.google.com/bigquery

4. **Build Custom Automations**
   - See `AUTOMATION-SETUP.md` for API endpoints
   - Check `n8n-workflows/README.md` for workflow examples

---

## 🚀 Next Steps

1. ✅ Set up BigQuery credentials
2. ✅ Configure n8n webhook
3. ✅ Deploy to Vercel
4. ✅ Test all integrations
5. ✅ Import n8n workflows
6. ✅ Create your first automation!

---

## 💡 Pro Tips

- **Use the setup wizard:** `./setup-complete.sh` to check status anytime
- **Keep credentials secure:** Never commit `service-account-key.json`
- **Monitor n8n executions:** Check for failed workflows regularly
- **Scale gradually:** Start with 1-2 workflows, then expand
- **Document custom workflows:** Keep track of what you build!

---

## 📞 Need Help?

- Check the documentation files
- Review n8n execution logs
- Test endpoints with curl
- Run `./setup-complete.sh` to verify configuration

**Happy Automating! 🎊**
