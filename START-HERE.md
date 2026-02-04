# 🚀 START HERE - One-Page Setup Guide

**Get your fully automated Information Portal running in 15 minutes!**

---

## ⚡ Super Quick Start (3 Commands)

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Set up BigQuery + n8n
npm run setup:complete

# 3. Import vendors & start
npm run import:vendors && npm run dev
```

**Done! Portal running at http://localhost:5000** 🎉

---

## 📋 What You Need

Before starting, have these ready:

### 1. BigQuery Service Account Key (5 min to get)
- Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dogwood-baton-345622
- Download JSON key
- Save as: `service-account-key.json` in project root

### 2. n8n Webhook URL (2 min to get)
- Open your n8n instance
- Create workflow → Add Webhook node
- Copy webhook URL
- Example: `https://your-n8n.com/webhook/xxxxx`

### 3. That's It!
Everything else is automated!

---

## 🎯 Step-by-Step Setup

### Step 1: Get BigQuery Credentials

**Option A: Interactive Helper**
```bash
npm run setup:bigquery
# Follow the on-screen instructions
```

**Option B: Manual**
1. Download key from Google Cloud Console
2. Move to project:
   ```bash
   mv ~/Downloads/dogwood-baton-*.json ./service-account-key.json
   ```

**Verify:**
```bash
ls -la service-account-key.json
# Should show the file
```

---

### Step 2: Import Vendors

```bash
npm run import:vendors
```

**What happens:**
- ✅ Connects to BigQuery
- ✅ Fetches all vendors from `aurora_postgres_public.vendors`
- ✅ Imports to portal database
- ✅ Shows summary: "150 vendors imported"

**Output example:**
```
🚀 Starting vendor import from BigQuery...
✅ Found 150 vendors in BigQuery
✅ Imported: vendor_fleek_moda (Fleek Moda)
✅ Updated: vendor_silverlane (Silverlane)
...
📊 Import Summary:
✅ New vendors imported: 145
🔄 Existing vendors updated: 5
```

---

### Step 3: Configure n8n (Optional but Recommended)

**Interactive setup:**
```bash
npm run setup:n8n
```

**Manual setup:**
Add to `.env`:
```bash
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
N8N_API_KEY=your-api-key  # Optional
```

---

### Step 4: Test Everything

```bash
npm run test:automation
```

**This tests:**
- ✅ BigQuery connection
- ✅ n8n integration
- ✅ Vendor API
- ✅ Order ID fetching
- ✅ Sync automation
- ✅ Workflow triggers

**Expected output:**
```
✅ BigQuery is connected!
✅ n8n is configured!
✅ Found 150 vendors in database
✅ Order IDs fetching works!
✅ Vendor sync automation works!
✅ n8n workflow trigger works!

Tests Passed: 6 / 6
🎉 ALL SYSTEMS READY!
```

---

### Step 5: Start the Portal

```bash
npm run dev
```

**Portal starts at:** http://localhost:5000

---

## 🧪 Quick Test: Create Your First Ticket

1. Open: http://localhost:5000
2. Login (or create account if first time)
3. Click "My Tickets" → "Create Ticket"
4. Click "Vendor Handle" field
5. Type "fleek" → See vendors in dropdown
6. Select a vendor
7. Watch "Fleek Order IDs" auto-load! 🎉
8. Select orders (multi-select works)
9. Fill other fields
10. Click "Create Ticket"

**Success!** ✅

---

## 🚀 Production Deployment (Vercel)

### Deploy via Vercel Dashboard (Easiest)

1. **Go to:** https://vercel.com/dashboard
2. **Select:** information-portal project
3. **Settings → Environment Variables**
4. **Add these:**

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:...

# BigQuery (IMPORTANT: Use JSON, not file path!)
BIGQUERY_PROJECT_ID=dogwood-baton-345622
BIGQUERY_DATASET=fleek_hub
BIGQUERY_ORDERS_TABLE=order_line_details
BIGQUERY_LOCATION=US
BIGQUERY_CREDENTIALS_JSON={"type":"service_account",...}
# ⚠️ Paste ENTIRE service-account-key.json as one line

# n8n (Optional)
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
N8N_API_KEY=your-api-key
```

5. **Save** → Auto-deploys in 2 minutes!

### Deploy via CLI

```bash
npm run setup:vercel
# Follow the instructions
```

---

## 🤖 Set Up Automation Workflows

### Import n8n Workflows

**Location:** `n8n-workflows/`

**Available:**
1. `1-scheduled-vendor-sync.json` - Auto-sync every 6 hours
2. `2-high-priority-ticket-alert.json` - Critical ticket alerts
3. `3-vendor-metrics-dashboard.json` - Daily Google Sheets reports

**How to import:**
1. Open n8n
2. Workflows → Import from File
3. Select JSON file
4. Update URLs/credentials
5. Activate!

**Detailed guide:** `n8n-workflows/README.md`

---

## 📊 Available npm Commands

### Setup & Configuration
```bash
npm run setup:complete     # Master setup wizard
npm run setup:bigquery     # BigQuery helper
npm run setup:n8n          # n8n configurator
npm run setup:vercel       # Vercel deployment guide
```

### Data Management
```bash
npm run import:vendors     # Import vendors from BigQuery
npm run sync:vendors       # Manual vendor sync
npm run sync:all           # Full BigQuery sync
npm run db:push            # Push schema changes
```

### Development
```bash
npm run dev                # Start dev server
npm run build              # Build for production
npm run check              # TypeScript check
npm run test:automation    # Test all automations
```

---

## 🎯 Success Checklist

After setup, you should have:

- [x] ✅ service-account-key.json in project root
- [x] ✅ Vendors imported (run `npm run import:vendors`)
- [x] ✅ n8n configured in .env
- [x] ✅ Tests passing (`npm run test:automation`)
- [x] ✅ Portal running (`npm run dev`)
- [x] ✅ Ticket creation working with vendor dropdown
- [x] ✅ Order IDs auto-loading from BigQuery
- [x] ✅ Deployed to Vercel (optional)
- [x] ✅ n8n workflows imported (optional)

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "BigQuery not connected"
```bash
# Check credentials
ls -la service-account-key.json

# Test connection
curl http://localhost:5000/api/bigquery/test
```

### "No vendors in dropdown"
```bash
# Import vendors
npm run import:vendors

# Verify
curl http://localhost:5000/api/vendors
```

### "Order IDs not loading"
```bash
# Test manually
curl "http://localhost:5000/api/bigquery/vendor/VENDOR_HANDLE/order-ids"
```

### "n8n not working"
```bash
# Check config
npm run setup:n8n

# Test
curl http://localhost:5000/api/n8n/status
```

---

## 📚 Documentation Index

| Topic | File |
|-------|------|
| **Quick Start** | `START-HERE.md` (this file) |
| **Ticket Creation** | `TICKET-CREATION-SOLUTION.md` |
| **Full Automation** | `AUTOMATION-SETUP.md` |
| **Complete Plan** | `COMPLETE-AUTOMATION-PLAN.md` |
| **n8n Workflows** | `n8n-workflows/README.md` |
| **BigQuery Setup** | `BIGQUERY_SETUP.md` |

---

## ⚡ TL;DR - Absolute Minimum

**To just get it running:**
```bash
# 1. Get BigQuery key from Google Cloud
# 2. Save as service-account-key.json
# 3. Run:
npm install
npm run import:vendors
npm run dev
```

**To get full automation:**
```bash
# 4. Configure n8n:
npm run setup:n8n
# Enter your webhook URL when prompted

# 5. Import workflows from n8n-workflows/ folder
# 6. Activate workflows in n8n
# 7. Done! Everything auto-syncs!
```

---

## 🎊 You're Ready!

Everything is set up for:
- ✅ Ticket creation with vendor handles
- ✅ Auto-loading Fleek order IDs
- ✅ BigQuery integration
- ✅ Automated data sync
- ✅ Real-time notifications
- ✅ Daily reports

**Start with:**
```bash
npm run setup:complete
```

**Then:**
```bash
npm run dev
```

**Create your first ticket and watch the automation magic! ✨**

---

**Questions? Run the setup wizard and it'll guide you through everything!**
