# 🔧 Final Manual Fix Steps - n8n Workflows

## 🎯 Current Status

**The Problem:** MCP tool updates have broken webhook registration in workflows 3, 4, and 5. The only solution is to manually recreate the webhook nodes in the n8n UI.

**What's Working:**
- ✅ Workflow 1 (Get All Vendors) - Working
- ✅ Workflow 2 (Get All Customers) - Working

**What's Broken:**
- ❌ Workflow 3 (Vendor Orders) - Webhook registered but empty response
- ❌ Workflow 4 (Customer Orders) - Webhook not registered (404)
- ❌ Workflow 5 (Vendor GMV) - Webhook not registered (404)

---

## ✅ Step-by-Step Fix (15 minutes total)

### Workflow 3: Get Vendor Orders

1. **Go to:** https://n8n.joinfleek.com
2. **Open:** "3. Get Vendor Active Orders"
3. **Delete:** "Webhook - Get Vendor Orders" node
4. **Add:** New "Webhook" node
   - **Path:** `api/orders/vendor/:vendorHandle`
   - **HTTP Method:** GET
   - **Response Mode:** Respond to Webhook
5. **Connect:** Webhook → BigQuery → Respond to Webhook
6. **Save** (Ctrl+S)
7. **Activate** (toggle in top right)
8. **Copy webhook URL** from the webhook node
9. **Test:**
   ```bash
   curl "https://n8n.joinfleek.com/webhook/{NEW_ID}/api/orders/vendor/creed-vintage"
   ```

---

### Workflow 4: Get Customer Orders

1. **Go to:** https://n8n.joinfleek.com
2. **Open:** "4. Get Customer Active Orders"
3. **Delete:** "Webhook - Get Customer Orders" node
4. **Add:** New "Webhook" node
   - **Path:** `api/orders/customer/:customerId`
   - **HTTP Method:** GET
   - **Response Mode:** Respond to Webhook
5. **Connect:** Webhook → BigQuery → Respond to Webhook
6. **Save** (Ctrl+S)
7. **Activate** (toggle in top right)
8. **Copy webhook URL** from the webhook node
9. **Test:**
   ```bash
   curl "https://n8n.joinfleek.com/webhook/{NEW_ID}/api/orders/customer/eviegen2009@outlook.com"
   ```

---

### Workflow 5: Get Vendor GMV

1. **Go to:** https://n8n.joinfleek.com
2. **Open:** "5. Get Vendor GMV"
3. **Delete:** "Webhook - Get Vendor GMV" node
4. **Add:** New "Webhook" node
   - **Path:** `api/vendor/:vendorHandle/gmv`
   - **HTTP Method:** GET
   - **Response Mode:** Respond to Webhook
5. **Connect:** Webhook → BigQuery → Respond to Webhook
6. **Save** (Ctrl+S)
7. **Activate** (toggle in top right)
8. **Copy webhook URL** from the webhook node
9. **Test:**
   ```bash
   curl "https://n8n.joinfleek.com/webhook/{NEW_ID}/api/vendor/creed-vintage/gmv"
   ```

---

## 📋 SQL Queries (Already Configured)

The BigQuery nodes are already set up with the correct queries. You only need to recreate the webhook nodes.

### Workflow 3 Query:
```sql
SELECT
  order_id, fleek_id, order_number,
  ol_financial_status, latest_status,
  created_at as order_date,
  gmv_post_all_discounts as order_amount,
  customer_email, customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = '{{ $json.params["vendorHandle"] }}'
ORDER BY created_at DESC
LIMIT 500
```
**Returns:** ALL orders for a vendor (not just active ones)

### Workflow 4 Query:
```sql
SELECT
  order_id, fleek_id, order_number,
  ol_financial_status, latest_status,
  created_at as order_date,
  gmv_post_all_discounts as order_amount,
  vendor
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE customer_email = '{{ $json.params["customerId"] }}'
ORDER BY created_at DESC
LIMIT 500
```
**Returns:** ALL orders for a customer

### Workflow 5 Query:
```sql
SELECT
  vendor as vendor_handle,
  SUM(pre_discounted_gmv) as total_gmv,
  COUNT(DISTINCT order_id) as total_orders,
  MIN(order_created_date) as first_order_date,
  MAX(order_created_date) as last_order_date
FROM `dogwood-baton-345622.fleek_raw.order_line_finance_details`
WHERE vendor = '{{ $json.params["vendorHandle"] }}'
  AND ol_financial_status = 'Paid'
  AND order_created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
GROUP BY vendor
```
**Returns:** GMV for last month only

---

## 🧪 Expected Test Results

### Workflow 3 (Vendor Orders):
```bash
curl "https://n8n.joinfleek.com/webhook/{ID}/api/orders/vendor/creed-vintage"
```
**Expected:** JSON array with ~15,000 orders for creed-vintage

### Workflow 4 (Customer Orders):
```bash
curl "https://n8n.joinfleek.com/webhook/{ID}/api/orders/customer/eviegen2009@outlook.com"
```
**Expected:** JSON array with orders for that customer

### Workflow 5 (Vendor GMV):
```bash
curl "https://n8n.joinfleek.com/webhook/{ID}/api/vendor/creed-vintage/gmv"
```
**Expected:** JSON object with GMV metrics for last month

---

## 📝 After Fixing - Update Portal

Once all webhooks are working, add the new URLs to your Vercel environment:

```bash
# Update these with your NEW webhook IDs
vercel env add N8N_VENDOR_ORDERS_ENDPOINT production
# Paste: https://n8n.joinfleek.com/webhook/{NEW_ID}/api/orders/vendor

vercel env add N8N_CUSTOMER_ORDERS_ENDPOINT production
# Paste: https://n8n.joinfleek.com/webhook/{NEW_ID}/api/orders/customer

vercel env add N8N_VENDOR_GMV_ENDPOINT production
# Paste: https://n8n.joinfleek.com/webhook/{NEW_ID}/api/vendor
```

---

## ❓ Why Manual Fix Is Required

**The Issue:** n8n generates a unique `webhookId` when you create a webhook node in the UI. This ID is used to register the webhook with n8n's webhook system.

**What Happened:** When MCP updated/recreated nodes, the `webhookId` was lost or not properly regenerated.

**Why MCP Can't Fix:** The `webhookId` is an internal n8n property that's only generated when nodes are created through the UI, not via API/MCP.

**The Only Solution:** Manually recreate the webhook nodes in the n8n UI so they get proper `webhookId` values.

---

## ✅ Summary

**Time Required:** 5 minutes per workflow = 15 minutes total

**Steps per workflow:**
1. Delete webhook node
2. Add new webhook node
3. Set path and method
4. Connect nodes
5. Save and activate
6. Copy new URL
7. Test

**What's Already Done:**
- ✅ SQL queries corrected
- ✅ BigQuery nodes using native n8n-nodes-base.googleBigQuery
- ✅ Correct tables and columns
- ✅ Parameters properly configured
- ✅ Logic updated (all orders, not just active)

**What You Need to Do:**
- 🔧 Recreate 3 webhook nodes in n8n UI

---

**Created:** February 11, 2026
**Issue:** Webhook registration broken after MCP updates
**Solution:** Manual webhook node recreation
**Priority:** High - required for portal integration
