# 📊 n8n Workflows Status Report

**Date**: February 13, 2026
**Total Workflows**: 6 (5 active + 1 inactive)

---

## ✅ WORKING WORKFLOWS (2/5)

### 1. Get All Vendor Handles ✅
- **ID**: yMw9sbPKicHQ26E1
- **Status**: Active & Working
- **Webhook URL**: `https://n8n.joinfleek.com/webhook/api/vendors/all`
- **Returns**: 1,588 vendors
- **Data Format**:
  ```json
  [
    {"handle": "creed-vintage", "name": "Creed Vintage"},
    {"handle": "diamond", "name": "Diamond"}
  ]
  ```
- **Integration**: ✅ Integrated into portal `/api/vendors`
- **SQL Query**:
  ```sql
  SELECT DISTINCT
    vendor as vendor_handle,
    INITCAP(REPLACE(vendor, '-', ' ')) as vendor_name
  FROM `dogwood-baton-345622.fleek_hub.order_line_details`
  WHERE vendor IS NOT NULL AND vendor != ''
  ORDER BY vendor ASC
  ```
- **Usage**: Populates vendor dropdown in ticket creation form

---

### 2. Get All Customer Handles ✅
- **ID**: CCsSUCyQI7cjzO3R
- **Status**: Active & Working
- **Webhook URL**: `https://n8n.joinfleek.com/webhook/api/customers/all`
- **Returns**: 5,000 customers (LIMIT 5000)
- **Data Format**:
  ```json
  [
    {
      "customerId": "9383432519918",
      "customerEmail": "customer@example.com",
      "customerName": "John Doe"
    }
  ]
  ```
- **Integration**: ✅ Integrated into portal `/api/customers`
- **SQL Query**:
  ```sql
  SELECT DISTINCT
    CAST(customer_id AS STRING) as customer_id,
    customer_email,
    customer_name
  FROM `dogwood-baton-345622.fleek_hub.order_line_details`
  WHERE customer_email IS NOT NULL
  ORDER BY customer_email ASC
  LIMIT 5000
  ```
- **Usage**: Available for customer data fetching (not currently used in UI dropdown)

---

## ❌ BROKEN WORKFLOWS (3/5)

### 3. Get Vendor Active Orders ❌
- **ID**: IX2FSNcvJdc5DeZn
- **Status**: Active but NOT Working
- **Expected URL**: `https://n8n.joinfleek.com/webhook/api/orders/vendor/:vendorHandle`
- **Test Result**: ❌ HTTP 404
- **Webhook ID**: af3dbabe-5d89-44a2-91e3-aaad3c474052

**Root Cause**:
- ⚠️ **BROKEN NODE CONNECTIONS**
- Webhook node connects to BOTH "Respond to Webhook" AND "BigQuery HTTP Request"
- No connection FROM "BigQuery HTTP Request" TO "Respond to Webhook"
- Result: BigQuery executes but response never reaches the webhook

**Correct Flow Should Be**:
```
Webhook → BigQuery HTTP Request → Respond to Webhook
```

**Current Broken Flow**:
```
Webhook → Respond to Webhook (returns empty immediately)
Webhook → BigQuery HTTP Request (executes but response discarded)
```

**SQL Query** (Correct but not connected properly):
```sql
SELECT vendor, order_id, fleek_id, order_number, latest_status,
       created_at as order_date, customer_email, customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = '{{ vendorHandle }}'
ORDER BY created_at DESC
LIMIT 500
```

**Fix Required**: Manual fix in n8n UI to reconnect nodes properly

---

### 4. Get Customer Active Orders ❌
- **ID**: iCk9icYwePHK7M9k
- **Status**: Active but NOT Working
- **Expected URL**: `https://n8n.joinfleek.com/webhook/api/orders/customer/:customerEmail`
- **Test Result**: ❌ HTTP 404
- **Issue**: Same as Workflow 3 - broken node connections or missing webhookId

**Fix Required**: Manual fix in n8n UI

---

### 5. Get Vendor GMV ❌
- **ID**: UJ0OrfKMsLYBvlSE
- **Status**: Active but NOT Working
- **Expected URL**: `https://n8n.joinfleek.com/webhook/api/vendors/:vendorHandle/gmv`
- **Test Result**: ❌ HTTP 404
- **Issue**: Webhook not registered or broken connections

**SQL Query** (Correct query for GMV calculation):
```sql
SELECT vendor as vendor_handle,
       SUM(pre_discounted_gmv) as total_gmv,
       COUNT(DISTINCT order_id) as total_orders,
       MIN(order_created_date) as first_order_date,
       MAX(order_created_date) as last_order_date
FROM `dogwood-baton-345622.fleek_raw.order_line_finance_details`
WHERE vendor = '{{ vendorHandle }}'
  AND ol_financial_status = 'Paid'
  AND order_created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
GROUP BY vendor
```

**Fix Required**: Manual fix in n8n UI

---

## 📊 Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Working | 2 | 40% |
| ❌ Broken | 3 | 60% |
| 🚫 Inactive | 1 | N/A |
| **Total Active** | **5** | **100%** |

---

## 🔧 Integration Status

### Portal Backend Integration

| Endpoint | Workflow | Status | Integrated |
|----------|----------|--------|------------|
| `/api/vendors` | Workflow 1 | ✅ Working | ✅ Yes |
| `/api/customers` | Workflow 2 | ✅ Working | ✅ Yes |
| `/api/orders/vendor/:handle` | Workflow 3 | ❌ Broken | ❌ No |
| `/api/orders/customer/:email` | Workflow 4 | ❌ Broken | ❌ No |
| `/api/vendors/:handle/gmv` | Workflow 5 | ❌ Broken | ❌ No |

### Frontend Integration

| Feature | Data Source | Status |
|---------|-------------|--------|
| Vendor Dropdown | Workflow 1 → `/api/vendors` | ✅ Working |
| Customer Field | Manual Input (Free Text) | ⚠️ Not using Workflow 2 |
| Vendor Orders | N/A | ❌ Workflow 3 broken |
| Customer Orders | N/A | ❌ Workflow 4 broken |
| Vendor GMV | N/A | ❌ Workflow 5 broken |

---

## 🎯 What's Actually Live in Production

### ✅ Currently Working Features:

1. **Vendor Dropdown in Ticket Creation**
   - Shows 1,588 vendors with pretty names
   - Example: "Creed Vintage" instead of "creed-vintage"
   - Real-time data from BigQuery via n8n
   - Searchable by both handle and name

2. **Customer API Endpoint**
   - Returns 5,000 customers
   - Available at `/api/customers`
   - Not currently used in UI (customer field is free text input)

### ❌ Not Working Yet:

1. **Vendor Order Lookup**
   - Cannot fetch orders by vendor handle
   - Workflow exists but connections broken
   - Needed for: Populating Fleek Order ID dropdown when vendor selected

2. **Customer Order Lookup**
   - Cannot fetch orders by customer email
   - Workflow exists but connections broken
   - Needed for: Showing customer order history

3. **Vendor GMV Analytics**
   - Cannot fetch vendor GMV metrics
   - Workflow exists but connections broken
   - Needed for: Vendor performance dashboards

---

## 🚨 Critical Issues

### Issue #1: Broken Node Connections (Workflow 3, 4, 5)

**Problem**:
- MCP tool updates broke the node connections
- Webhooks connect directly to "Respond" node, bypassing BigQuery
- Results in empty responses (HTTP 200 but no data) or 404 errors

**Why It Happened**:
- MCP tool cannot properly maintain complex node connections
- When updating node parameters, connections get rewired incorrectly

**Impact**:
- 60% of workflows non-functional
- Critical features blocked (order lookup, GMV analytics)

### Issue #2: webhookId Property Missing

**Problem**:
- n8n requires webhookId for webhook registration
- MCP tool updates sometimes remove this property
- Results in 404 errors when calling webhook URLs

**Solution**:
- Manual fix required in n8n UI
- Cannot be fixed via MCP tool

---

## 🛠️ How to Fix Broken Workflows

### Manual Fix Steps (Required for Workflows 3, 4, 5):

1. **Open n8n UI**: https://n8n.joinfleek.com

2. **For Each Broken Workflow**:

   a. Open the workflow in the editor

   b. Check the connections:
      - ✅ Correct: `Webhook → BigQuery → Respond`
      - ❌ Wrong: `Webhook → Respond` (missing BigQuery connection)

   c. Fix connections:
      - Delete the direct `Webhook → Respond` connection
      - Connect: `Webhook → BigQuery Node`
      - Connect: `BigQuery Node → Respond to Webhook`

   d. Verify webhookId exists in Webhook node properties

   e. Save and activate the workflow

   f. Test the webhook URL

3. **Test After Fix**:
   ```bash
   # Workflow 3
   curl https://n8n.joinfleek.com/webhook/api/orders/vendor/creed-vintage

   # Workflow 4
   curl https://n8n.joinfleek.com/webhook/api/orders/customer/test@example.com

   # Workflow 5
   curl https://n8n.joinfleek.com/webhook/api/vendors/creed-vintage/gmv
   ```

---

## 📈 Success Metrics

### What's Working:
- ✅ 1,588 vendors fetched in real-time
- ✅ 5,000 customers available
- ✅ Vendor names properly formatted (Title Case)
- ✅ Backend transformation working correctly
- ✅ Frontend dropdown populated
- ✅ No database dependencies
- ✅ Direct BigQuery integration

### What Needs Fixing:
- ❌ Order lookup by vendor (Workflow 3)
- ❌ Order lookup by customer (Workflow 4)
- ❌ GMV analytics (Workflow 5)
- ❌ Node connections in all broken workflows
- ❌ Webhook registration for Workflows 3, 4, 5

---

## 🎯 Recommended Next Steps

### Immediate Actions:

1. **Fix Workflows 3, 4, 5 Manually** (Priority: HIGH)
   - Open n8n UI
   - Fix node connections
   - Verify webhookId properties
   - Test webhook URLs

2. **Integrate Working Workflows** (Priority: MEDIUM)
   - Customer dropdown (optional - currently free text)
   - Order lookup when vendor selected (needs Workflow 3)
   - GMV display in vendor dashboard (needs Workflow 5)

3. **Document Correct Architecture** (Priority: LOW)
   - Create node connection diagrams
   - Document webhook URL patterns
   - Add testing checklist

### Long-term Improvements:

1. **Avoid MCP Tool for Complex Workflows**
   - Use n8n UI for workflows with multiple node connections
   - Use MCP only for simple parameter updates
   - Document which workflows should not be edited via MCP

2. **Add Monitoring**
   - Health check endpoints for all workflows
   - Automated testing of webhook URLs
   - Alerts when workflows fail

3. **Better Error Handling**
   - Add error nodes in workflows
   - Return proper error messages
   - Log failures to monitoring system

---

## 📝 Technical Notes

### Why Only 2 of 5 Workflows Work:

Workflows 1 and 2 work because they:
- Have simple linear connections (Webhook → BigQuery → Respond)
- Were manually created/fixed in n8n UI
- Have proper webhookId properties
- Don't use complex parameter passing

Workflows 3, 4, 5 are broken because:
- Were edited via MCP tool which broke connections
- Have complex parameter passing ($json.params.vendorHandle)
- Missing proper sequential connections
- Node connections point to wrong targets

### MCP Tool Limitations:

The MCP (Model Context Protocol) tool for n8n has these limitations:
- ❌ Cannot maintain complex multi-node connections
- ❌ Sometimes removes webhookId properties
- ❌ Cannot properly handle parameter references ($json.params.*)
- ❌ No validation of connection correctness
- ✅ Good for: Simple parameter updates in isolated nodes
- ❌ Bad for: Workflows with 3+ connected nodes

---

## ✅ Conclusion

**Current State**:
- 2 out of 5 workflows (40%) are functional and integrated
- Vendor and customer data successfully fetched from BigQuery
- Frontend dropdown working with pretty vendor names
- Backend API serving real-time data

**Blocking Issues**:
- 3 workflows need manual fixes in n8n UI
- Node connection architecture broken by MCP tool
- Cannot be fixed programmatically - requires UI access

**Impact**:
- Basic vendor selection: ✅ Working
- Order lookup features: ❌ Blocked
- GMV analytics: ❌ Blocked

**Required Action**:
- Manual fix in n8n UI (15-30 minutes)
- Then all 5 workflows will be functional

---

**Report Generated**: February 13, 2026
**Last Updated**: After testing all webhook endpoints
**Next Review**: After manual fixes are applied
