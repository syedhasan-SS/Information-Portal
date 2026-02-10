# 🚀 Quick Start: Category Sync & Bulk Routing

## ✅ Status: DEPLOYED & READY

**Production URL**: https://information-portal-beryl.vercel.app

---

## 🎯 What's New

Two powerful features to save you hours of manual work:

1. **Sync from BigQuery** - Import all Zendesk categories automatically
2. **Bulk Setup** - Create multiple routing rules at once

---

## ⚡ Quick Start (5 Steps)

### Step 1: Add BigQuery Credentials (ONE-TIME)

**Option A - Vercel CLI**:
```bash
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON production
# Paste your service account JSON when prompted
vercel --prod
```

**Option B - Vercel Dashboard**:
1. Go to: https://vercel.com/syed-faez-hasan-rizvis-projects/information-portal/settings/environment-variables
2. Add variable: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
3. Paste service account JSON (get from tech team)
4. Save and redeploy

### Step 2: Sync Categories from BigQuery

1. Navigate to: https://information-portal-beryl.vercel.app/routing-config
2. Click **"Sync from BigQuery"** button (header, download icon)
3. Wait 30-60 seconds
4. See toast: "Processed X combinations, created Y categories"

### Step 3: Review Synced Categories

1. Go to Ticket Manager (`/ticket-config`)
2. Browse category hierarchy
3. Categories organized as L1 → L2 → L3
4. Department types auto-assigned

### Step 4: Create Routing Rules in Bulk

1. Go to Routing Configuration (`/routing-config`)
2. Click **"Bulk Setup"** button
3. Select categories (use checkboxes)
4. Configure common settings:
   - Target Department (required)
   - Auto-Assignment (optional)
   - Priority Boost (optional)
   - SLA Overrides (optional)
5. Click "Create X Routing Rules"

### Step 5: Verify & Done!

1. Routing rules table shows your new rules
2. Test by creating a ticket in one of those categories
3. Verify it routes to correct department

---

## 📊 Example Workflow

### Scenario: Set up Finance department routing

```
1. Sync categories → Get 50 categories including finance-related ones
2. Bulk Setup → Select 10 finance categories
3. Configure:
   - Target: Finance
   - Auto-assign: Yes (Round Robin)
   - Priority: +0
4. Create → 10 routing rules created in 5 seconds
5. Done! → All finance tickets now auto-route
```

**Time Saved**: Manual (10 min) vs Automated (5 sec) = **99% faster** 🚀

---

## 🆘 Troubleshooting

### "BigQuery credentials not configured"
→ Add `GOOGLE_APPLICATION_CREDENTIALS_JSON` to Vercel and redeploy

### "No available categories"
→ Run "Sync from BigQuery" first, or add categories manually in Ticket Manager

### "Failed to create routing rule"
→ Category might already have a rule. Check routing rules table.

### Need more help?
→ Read `CATEGORY_SYNC_GUIDE.md` for detailed documentation

---

## 📞 Quick Commands

```bash
# Test sync endpoint
curl -X POST https://information-portal-beryl.vercel.app/api/admin/sync-categories-from-bigquery \
  -H "x-user-email: syed.hasan@joinfleek.com"

# Check deployment status
vercel ls

# View environment variables
vercel env ls
```

---

## 📚 Full Documentation

- **User Guide**: `CATEGORY_SYNC_GUIDE.md`
- **Session Summary**: `SESSION_SUMMARY_FEB10_PART2.md`
- **General Reference**: `QUICK_REFERENCE.md`

---

## 🎊 You're All Set!

Once you add BigQuery credentials, you can:
✅ Sync categories automatically from Zendesk
✅ Create routing rules in bulk
✅ Save 99% of time on category management

**Happy routing!** 🎉
