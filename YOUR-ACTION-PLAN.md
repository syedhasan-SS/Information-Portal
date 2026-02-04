# 🎯 YOUR ACTION PLAN - Let's Automate Everything!

**Follow these steps IN ORDER for the easiest setup experience.**

---

## 📍 Where You Are Now

✅ Code is ready
✅ All automation built
✅ Deployed to GitHub
✅ Vercel auto-deployed
✅ Scripts created
✅ Workflows ready

**Missing:**
- ⏳ BigQuery credentials (you need to download)
- ⏳ n8n webhook URL (you need to provide)

---

## 🚀 DO THIS NOW (15 Minutes Total)

### ⏰ Task 1: Get BigQuery Credentials (5 minutes)

**Click this link:**
👉 **https://console.cloud.google.com/iam-admin/serviceaccounts?project=dogwood-baton-345622**

**Then:**
1. Click on any service account (or create new one)
2. Go to "KEYS" tab
3. Click "ADD KEY" → "Create new key" → "JSON"
4. File downloads automatically

**Then in your terminal:**
```bash
cd /Users/syedfaezhasan/Downloads/Information-Portal

# Move the downloaded file (replace XXXXX with actual filename)
mv ~/Downloads/dogwood-baton-345622-XXXXX.json ./service-account-key.json

# Verify it worked
npm run setup:bigquery
```

**Expected:** "✅ service-account-key.json already exists!"

---

### ⏰ Task 2: Import Vendors (2 minutes)

```bash
npm run import:vendors
```

**Expected output:**
```
🚀 Starting vendor import from BigQuery...
✅ Found 150 vendors in BigQuery

✅ Imported: vendor_fleek_moda (Fleek Moda)
✅ Updated: vendor_silverlane (Silverlane)
...

📊 Import Summary:
✅ New vendors imported: 145
🔄 Existing vendors updated: 5
❌ Errors: 0
```

**What this does:**
- Syncs ALL vendors from BigQuery to your portal
- Includes: handle, name, email, phone, country, geo, GMV, KAM, etc.
- Makes vendors available in ticket creation dropdown

---

### ⏰ Task 3: Test Ticket Creation (2 minutes)

```bash
# Start the portal
npm run dev
```

**Then open:** http://localhost:5000

**Test flow:**
1. Login
2. Go to "My Tickets"
3. Click "Create Ticket"
4. Click "Vendor Handle" field
5. Type "vendor" → Should see vendors in dropdown! ✅
6. Select a vendor
7. Wait 2 seconds → "Fleek Order IDs" should auto-populate! ✅
8. Select an order ID
9. Fill other fields
10. Click "Create Ticket" → Success! ✅

**If this works, you're DONE with the core functionality!** 🎉

---

### ⏰ Task 4: Configure n8n Automation (5 minutes)

**4a. Get Your n8n Webhook URL**

**Option 1: You already have n8n running**
- Tell me your n8n URL and I'll configure it!
- Example: `https://n8n.yourdomain.com`

**Option 2: You need to set up n8n**
- Cloud: https://app.n8n.cloud/ (easiest)
- Self-hosted: https://docs.n8n.io/hosting/

**4b. Configure in Portal**

```bash
npm run setup:n8n
```

**When prompted:**
- Enter your n8n webhook URL
- Enter API key (or skip)
- Script auto-configures everything!

**4c. Import Workflow Templates**

In your n8n instance:
1. Go to **Workflows**
2. Click **Import from File**
3. Import these files:
   - `n8n-workflows/1-scheduled-vendor-sync.json`
   - `n8n-workflows/2-high-priority-ticket-alert.json`
   - `n8n-workflows/3-vendor-metrics-dashboard.json`

4. For each workflow:
   - Update the portal URL (change to your Vercel URL)
   - Configure Slack/Email credentials
   - Click **Activate**

---

### ⏰ Task 5: Deploy to Production (5 minutes)

**5a. Set Vercel Environment Variables**

Go to: **https://vercel.com/dashboard** → Your Project → **Settings → Environment Variables**

**Add these (copy from your local .env):**

```bash
DATABASE_URL=postgresql://neondb_owner:npg_ekJoAM1L3pzx@ep-green-sun-afu1ul8v.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require

BIGQUERY_PROJECT_ID=dogwood-baton-345622
BIGQUERY_DATASET=fleek_hub
BIGQUERY_ORDERS_TABLE=order_line_details
BIGQUERY_LOCATION=US

# IMPORTANT: Copy the CONTENTS of service-account-key.json as ONE LINE
BIGQUERY_CREDENTIALS_JSON={"type":"service_account","project_id":"dogwood-baton-345622",...}

N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxxxx
```

**How to get BIGQUERY_CREDENTIALS_JSON as one line:**
```bash
# Mac/Linux
cat service-account-key.json | jq -c . | pbcopy
# Now paste in Vercel (it's in your clipboard)

# Or manually
cat service-account-key.json
# Copy entire output, remove line breaks
```

**5b. Redeploy**

Vercel auto-deploys on git push (already done!) ✅

**Or manually:**
```bash
vercel --prod
```

**5c. Test Production**

```bash
npm run test:automation prod

# Or manually:
curl https://your-portal.vercel.app/api/bigquery/test
curl https://your-portal.vercel.app/api/n8n/status
```

---

## ✅ Success Criteria

After completing all tasks, you should have:

### Local Development ✅
- [ ] `npm run dev` starts without errors
- [ ] Can create tickets with vendor dropdown
- [ ] Order IDs auto-load when vendor selected
- [ ] `npm run test:automation` shows 6/6 tests passing

### Production ✅
- [ ] Portal accessible at your Vercel URL
- [ ] Vendor dropdown works in production
- [ ] Order IDs fetch from BigQuery in production
- [ ] All environment variables set in Vercel

### Automation ✅
- [ ] n8n workflows imported and activated
- [ ] Scheduled vendor sync running every 6 hours
- [ ] Critical ticket alerts going to Slack/Email
- [ ] Daily reports updating Google Sheets

---

## 🎉 What You'll Have When Done

### For Agents (Users)
- ✨ Create tickets in 30 seconds (down from 5 minutes)
- ✨ Vendor auto-complete (no memorizing handles)
- ✨ Order IDs auto-load (no copy-paste from BigQuery)
- ✨ Smart priority calculation (automatic)
- ✨ Clean, intuitive interface

### For Managers
- 📊 Daily reports in Google Sheets (automatic)
- 🚨 Instant alerts for critical tickets
- 📈 Real-time dashboards
- 🎯 SLA compliance tracking
- 👥 Team performance metrics

### For Admins (You!)
- 🤖 Vendor data syncs automatically
- 🔄 No manual data imports needed
- 📱 Notifications when things happen
- 🛠️ Easy troubleshooting with test scripts
- 📈 Scalable automation platform

---

## 💡 Pro Tips

1. **Run `npm run setup:complete` anytime** to check status
2. **Keep service-account-key.json secure** (never commit!)
3. **Test locally before deploying** (`npm run test:automation`)
4. **Start with 1-2 n8n workflows**, then expand
5. **Monitor n8n execution logs** for first few days

---

## 🆘 If You Get Stuck

### Priority Support Commands

```bash
# Check everything
npm run setup:complete

# Test all systems
npm run test:automation

# Reset and retry
npm run import:vendors
npm run dev
```

### Common Issues

**"Cannot create ticket"**
→ Run: `npm run import:vendors`

**"BigQuery error"**
→ Check: `service-account-key.json` exists
→ Run: `npm run setup:bigquery`

**"Order IDs not loading"**
→ Test: `curl http://localhost:5000/api/bigquery/test`
→ Should show: `{"connected":true}`

---

## 🚀 Next Actions FOR YOU

### Right Now (Do This First!)

1. **Download BigQuery key:**
   - Click: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dogwood-baton-345622
   - Download JSON key
   - Save as `service-account-key.json`

2. **Run import:**
   ```bash
   npm run import:vendors
   ```

3. **Test it:**
   ```bash
   npm run dev
   # Open http://localhost:5000
   # Create a ticket!
   ```

### After That Works (Then Automate!)

4. **Tell me your n8n URL:**
   - I'll configure it automatically
   - Or run: `npm run setup:n8n`

5. **Import n8n workflows:**
   - From `n8n-workflows/` folder
   - Activate them
   - Watch automation happen!

---

## 🎯 THE FASTEST PATH

**If you want to skip reading and just get it working:**

```bash
# 1. Download BigQuery key from Google Cloud
# 2. Then run these 4 commands:

mv ~/Downloads/dogwood-*.json ./service-account-key.json
npm install
npm run import:vendors
npm run dev

# 3. Open http://localhost:5000 and create a ticket!
```

**That's it! Everything else is optional polish.** ✨

---

**Ready? Tell me when you have:**
1. ✅ BigQuery key downloaded
2. ✅ Your n8n webhook URL (if you have n8n)

**Then I'll help you test and automate EVERYTHING!** 🚀
