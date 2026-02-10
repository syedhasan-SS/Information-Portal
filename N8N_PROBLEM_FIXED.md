# ✅ n8n Problem FIXED - February 10, 2026

## 🎯 Problem Identified

The n8n workflow JSON files had **incorrect SQL queries** that didn't match the documentation!

### ❌ What Was Wrong

The 5 workflow JSON files were querying **non-existent or wrong tables**:

1. **Workflows 1 & 2**: Using `zendesk_new.ticket` table
   - This table doesn't have vendor/customer order data
   - Wrong fields: `vendor_handle`, `requester_email`, `requester_name`

2. **Workflows 3 & 4**: Using `orders.active_orders` table
   - This table **doesn't exist** in BigQuery
   - Wrong parameter access: `$json.params.vendorHandle` (should be `$json.query.vendorHandle`)

3. **Workflow 5**: Using `orders.all_orders` table
   - This table **doesn't exist** in BigQuery
   - Wrong parameter access: `$json.params.vendorHandle` (should be `$json.query.vendorHandle`)

### ✅ What's Fixed

All 5 workflows now use the **correct data source**: `fleek_hub.order_line_details`

---

## 📊 Updated SQL Queries

### 1. Get All Vendor Handles ✅
**Before**:
```sql
SELECT DISTINCT vendor_handle
FROM `dogwood-baton-345622.zendesk_new.ticket`
WHERE vendor_handle IS NOT NULL
ORDER BY vendor_handle ASC
```

**After**:
```sql
SELECT DISTINCT vendor as vendor_handle
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor IS NOT NULL
ORDER BY vendor ASC
```

---

### 2. Get All Customer Handles ✅
**Before**:
```sql
SELECT DISTINCT requester_email, requester_name
FROM `dogwood-baton-345622.zendesk_new.ticket`
WHERE requester_email IS NOT NULL
ORDER BY requester_email ASC
```

**After**:
```sql
SELECT DISTINCT customer_id, customer_email, customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE customer_email IS NOT NULL
ORDER BY customer_email ASC
LIMIT 5000
```

---

### 3. Get Vendor Active Orders ✅
**Before**:
```sql
SELECT order_id, order_status, order_date, order_amount
FROM `dogwood-baton-345622.orders.active_orders`
WHERE vendor_handle = '{{ $json.params.vendorHandle }}'
AND order_status IN ('pending', 'processing', 'shipped')
ORDER BY order_date DESC
LIMIT 100
```

**After**:
```sql
SELECT order_id, fleek_id, order_number, ol_financial_status,
       latest_status, created_at as order_date,
       gmv_post_all_discounts as order_amount,
       customer_email, customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = '{{ $json.query.vendorHandle }}'
  AND ol_financial_status IN ('pending', 'authorized', 'partially_paid', 'paid')
ORDER BY created_at DESC
LIMIT 100
```

---

### 4. Get Customer Active Orders ✅
**Before**:
```sql
SELECT order_id, order_status, order_date, order_amount, vendor_handle
FROM `dogwood-baton-345622.orders.active_orders`
WHERE customer_email = '{{ $json.params.customerId }}'
  AND order_status IN ('pending', 'processing', 'shipped')
ORDER BY order_date DESC
LIMIT 100
```

**After**:
```sql
SELECT order_id, fleek_id, order_number, ol_financial_status,
       latest_status, created_at as order_date,
       gmv_post_all_discounts as order_amount, vendor
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE customer_email = '{{ $json.query.customerId }}'
  AND ol_financial_status IN ('pending', 'authorized', 'partially_paid', 'paid')
ORDER BY created_at DESC
LIMIT 100
```

---

### 5. Get Vendor GMV ✅
**Before**:
```sql
SELECT vendor_handle, SUM(order_amount) as total_gmv,
       COUNT(DISTINCT order_id) as total_orders,
       MIN(order_date) as first_order_date,
       MAX(order_date) as last_order_date
FROM `dogwood-baton-345622.orders.all_orders`
WHERE vendor_handle = '{{ $json.params.vendorHandle }}'
  AND order_status = 'completed'
GROUP BY vendor_handle
```

**After**:
```sql
SELECT vendor as vendor_handle,
       SUM(gmv_post_all_discounts) as total_gmv,
       COUNT(DISTINCT order_id) as total_orders,
       MIN(created_at) as first_order_date,
       MAX(created_at) as last_order_date
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = '{{ $json.query.vendorHandle }}'
  AND ol_financial_status = 'paid'
GROUP BY vendor
```

---

## 🔧 Key Changes Summary

### Data Source
- ❌ **Old**: `zendesk_new.ticket`, `orders.active_orders`, `orders.all_orders`
- ✅ **New**: `fleek_hub.order_line_details` (single source of truth)

### Field Mappings
| Old Field | New Field | Type |
|-----------|-----------|------|
| `vendor_handle` | `vendor` | Vendor name |
| `requester_email` | `customer_email` | Customer email |
| `requester_name` | `customer_name` | Customer name |
| `order_status` | `ol_financial_status` | Order financial status |
| `order_date` | `created_at` | Order creation date |
| `order_amount` | `gmv_post_all_discounts` | Order GMV amount |
| N/A | `fleek_id` | Fleek internal ID |
| N/A | `order_number` | Order number |
| N/A | `latest_status` | Latest order status |

### Parameter Access
- ❌ **Old**: `$json.params.vendorHandle`
- ✅ **New**: `$json.query.vendorHandle`

---

## 📁 Files Updated

All 5 workflow JSON files have been corrected:

1. ✅ `/n8n-workflows/1-get-all-vendor-handles.json`
2. ✅ `/n8n-workflows/2-get-all-customer-handles.json`
3. ✅ `/n8n-workflows/3-get-vendor-active-orders.json`
4. ✅ `/n8n-workflows/4-get-customer-active-orders.json`
5. ✅ `/n8n-workflows/5-get-vendor-gmv.json`

---

## 🚀 Next Steps

### 1. Re-import Workflows to n8n

You need to **delete and re-import** the workflows in your n8n instance:

**Option A: Via n8n UI**
1. Login to n8n: https://app.n8n.cloud
2. **Delete** the old 5 workflows (they have wrong SQL)
3. Click **Import from File**
4. Import all 5 updated JSON files from `/n8n-workflows/` folder

**Option B: Via n8n API** (if you have access)
```bash
# Delete old workflows
curl -X DELETE https://your-n8n.app.n8n.cloud/api/v1/workflows/yMw9sbPKicHQ26E1
curl -X DELETE https://your-n8n.app.n8n.cloud/api/v1/workflows/CCsSUCyQI7cjzO3R
curl -X DELETE https://your-n8n.app.n8n.cloud/api/v1/workflows/IX2FSNcvJdc5DeZn
curl -X DELETE https://your-n8n.app.n8n.cloud/api/v1/workflows/iCk9icYwePHK7M9k
curl -X DELETE https://your-n8n.app.n8n.cloud/api/v1/workflows/UJ0OrfKMsLYBvlSE

# Import new workflows (via UI is easier)
```

### 2. Configure BigQuery Credentials

In each imported workflow:
1. Click on the **BigQuery node**
2. Set up your Google BigQuery credentials
3. Test the connection

### 3. Activate Workflows

After importing and configuring credentials:
1. Open each workflow
2. Click **Activate** toggle (top right)
3. Verify status shows "Active"

### 4. Get Webhook URLs

For each workflow:
1. Click on the **Webhook node**
2. Copy the **Production URL**
3. Save it for portal integration

Expected URL format:
```
https://your-n8n.app.n8n.cloud/webhook/api/vendors/all
https://your-n8n.app.n8n.cloud/webhook/api/customers/all
https://your-n8n.app.n8n.cloud/webhook/api/orders/vendor/:vendorHandle
https://your-n8n.app.n8n.cloud/webhook/api/orders/customer/:customerId
https://your-n8n.app.n8n.cloud/webhook/api/vendor/:vendorHandle/gmv
```

### 5. Test the Webhooks

Test each endpoint with curl:

```bash
# 1. Test vendors
curl "https://your-n8n.../webhook/api/vendors/all"

# 2. Test customers
curl "https://your-n8n.../webhook/api/customers/all"

# 3. Test vendor orders (replace VENDOR_NAME)
curl "https://your-n8n.../webhook/api/orders/vendor/VENDOR_NAME"

# 4. Test customer orders (replace EMAIL)
curl "https://your-n8n.../webhook/api/orders/customer/customer@example.com"

# 5. Test vendor GMV (replace VENDOR_NAME)
curl "https://your-n8n.../webhook/api/vendor/VENDOR_NAME/gmv"
```

### 6. Add to Portal Environment Variables

Once tested, add webhook URLs to Vercel:

```bash
vercel env add N8N_VENDORS_ENDPOINT production
# Paste: https://your-n8n.../webhook/api/vendors/all

vercel env add N8N_CUSTOMERS_ENDPOINT production
# Paste: https://your-n8n.../webhook/api/customers/all

vercel env add N8N_VENDOR_ORDERS_ENDPOINT production
# Paste: https://your-n8n.../webhook/api/orders/vendor

vercel env add N8N_CUSTOMER_ORDERS_ENDPOINT production
# Paste: https://your-n8n.../webhook/api/orders/customer

vercel env add N8N_VENDOR_GMV_ENDPOINT production
# Paste: https://your-n8n.../webhook/api/vendor
```

---

## ✅ Problem Resolution Summary

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Wrong BigQuery tables | ✅ Fixed | All queries now use `fleek_hub.order_line_details` |
| Non-existent tables | ✅ Fixed | Removed references to `orders.*` tables |
| Wrong field names | ✅ Fixed | Updated to correct field names from `fleek_hub` |
| Wrong parameter access | ✅ Fixed | Changed `$json.params` to `$json.query` |
| Incomplete data fields | ✅ Fixed | Added `fleek_id`, `order_number`, `latest_status` |

---

## 🎉 Expected Results After Fix

Once you re-import and activate the workflows:

1. **Vendor Autocomplete**: Will show all vendors from actual order data
2. **Customer Autocomplete**: Will show customers with email and name
3. **Dynamic Order Loading**: Will correctly filter orders by vendor/customer
4. **Accurate GMV**: Will calculate from paid orders only
5. **No Data Mixing**: Vendor and customer data stay completely separate

---

**Fixed**: February 10, 2026
**Status**: ✅ All workflow JSON files corrected
**Action Required**: Re-import workflows to n8n and activate
