# 🚀 Immediate Action Plan - n8n Fix

## ⚡ Quick Overview

**Problem**: n8n workflows had wrong SQL queries (using non-existent tables)
**Status**: ✅ **FIXED** - All workflow JSON files corrected
**Action Required**: You need to **re-import** workflows to n8n

---

## 📋 Step-by-Step Instructions

### Step 1: Login to n8n (2 minutes)
```
Go to: https://app.n8n.cloud
Login with your credentials
```

### Step 2: Delete Old Workflows (3 minutes)
Delete these 5 workflows (they have wrong SQL):
1. "1. Get All Vendor Handles"
2. "2. Get All Customer Handles"
3. "3. Get Vendor Active Orders"
4. "4. Get Customer Active Orders"
5. "5. Get Vendor GMV"

**How to delete**:
- Find each workflow in your list
- Click the 3 dots menu (⋮)
- Select "Delete"
- Confirm deletion

### Step 3: Import Corrected Workflows (5 minutes)
Import these files (from your project folder):
```
n8n-workflows/1-get-all-vendor-handles.json
n8n-workflows/2-get-all-customer-handles.json
n8n-workflows/3-get-vendor-active-orders.json
n8n-workflows/4-get-customer-active-orders.json
n8n-workflows/5-get-vendor-gmv.json
```

**How to import**:
1. Click "+ Add workflow" or "Import from File"
2. Select a JSON file
3. Repeat for all 5 files

### Step 4: Configure BigQuery Credentials (10 minutes)
For EACH of the 5 workflows:
1. Open the workflow
2. Click on the "BigQuery" node
3. Click "Create New Credential"
4. Select "Google BigQuery OAuth2 API"
5. Fill in:
   - **Project ID**: `dogwood-baton-345622`
   - Follow OAuth flow or paste service account JSON
6. Test connection
7. Save

### Step 5: Activate All Workflows (2 minutes)
For each workflow:
1. Open the workflow
2. Toggle "Active" switch (top right)
3. Verify it shows "Active" status

### Step 6: Get Webhook URLs (5 minutes)
For each workflow:
1. Open the workflow
2. Click on the "Webhook" node
3. Copy the **Production URL**

Save these URLs (you'll need them later):
```
Workflow 1: https://your-n8n.../webhook/api/vendors/all
Workflow 2: https://your-n8n.../webhook/api/customers/all
Workflow 3: https://your-n8n.../webhook/api/orders/vendor/:vendorHandle
Workflow 4: https://your-n8n.../webhook/api/orders/customer/:customerId
Workflow 5: https://your-n8n.../webhook/api/vendor/:vendorHandle/gmv
```

### Step 7: Test Webhooks (5 minutes)
Use curl or Postman to test each endpoint:

```bash
# Test 1: Get vendors
curl "https://your-n8n.../webhook/api/vendors/all"

# Test 2: Get customers
curl "https://your-n8n.../webhook/api/customers/all"

# Test 3: Get vendor orders (replace with real vendor name)
curl "https://your-n8n.../webhook/api/orders/vendor/unique-clothing"

# Test 4: Get customer orders (replace with real email)
curl "https://your-n8n.../webhook/api/orders/customer/test@example.com"

# Test 5: Get vendor GMV (replace with real vendor name)
curl "https://your-n8n.../webhook/api/vendor/unique-clothing/gmv"
```

**Expected results**: JSON arrays with data

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] All 5 workflows imported successfully
- [ ] BigQuery credentials configured in each workflow
- [ ] All 5 workflows showing "Active" status
- [ ] All 5 webhook URLs collected
- [ ] Test 1 (vendors) returns JSON array
- [ ] Test 2 (customers) returns JSON array
- [ ] Test 3 (vendor orders) returns order data
- [ ] Test 4 (customer orders) returns order data
- [ ] Test 5 (vendor GMV) returns GMV metrics

---

## 🆘 Troubleshooting

### Problem: BigQuery Authentication Fails
**Solution**:
1. Ensure you're using the correct Google account
2. Verify project ID is `dogwood-baton-345622`
3. Check that your service account has BigQuery Data Viewer permissions

### Problem: Workflow Returns Empty Array
**Solution**:
1. Check that table `fleek_hub.order_line_details` exists
2. Verify table has data
3. Check BigQuery permissions

### Problem: 404 Not Found on Webhook
**Solution**:
1. Ensure workflow is **Active** (not just saved)
2. Copy the exact Production URL from the Webhook node
3. Check for typos in the URL

### Problem: Parameters Not Working
**Solution**:
- For vendor orders: Use actual vendor name from your data
- For customer orders: Use actual customer email from your data
- Ensure no URL encoding issues (spaces, special characters)

---

## 📞 Need Help?

If you encounter issues:
1. Check n8n execution logs (in workflow view)
2. Look for error messages in the BigQuery node
3. Verify the SQL query is running in BigQuery console
4. Share the specific error message

---

## 🎯 What's Next?

After successful webhook testing:

### Next Steps (In Order)
1. **Add webhook URLs to Vercel environment variables**
2. **Integrate endpoints into portal ticket form**
3. **Update vendor details page to use GMV endpoint**
4. **Add BigQuery credentials for vendor sync**

---

## 📁 Reference Files

All details are documented in:
- `N8N_PROBLEM_FIXED.md` - Complete technical details
- `N8N_COMPLETE_SUMMARY.md` - Original integration summary
- `N8N_WORKFLOWS_FINAL.md` - Final SQL queries
- `SESSION_SUMMARY_FEB10_PART3.md` - This session summary

---

**Total Time**: ~30 minutes
**Complexity**: Medium (straightforward if you follow steps)
**Priority**: High (required for ticket form autocomplete)

---

**Created**: February 10, 2026
**Status**: Ready to execute
**Next Review**: After webhook testing complete
