# 🔧 n8n Workflows 3 & 4 - Order Fetching Fix

**Date**: February 13, 2026
**Status**: Fixed Connections, Webhook Registration Issue Remains

---

## 🎯 Objective

Fix workflows 3 and 4 to correctly fetch orders for specific vendors and customers based on their handles/emails.

---

## ✅ What Was Fixed

### Workflow 3: Get Vendor Active Orders

**Before**:
```
Webhook ──┬──> BigQuery HTTP Request
          └──> Respond to Webhook (WRONG!)
```

**Problem**: Webhook connected to BOTH BigQuery and Respond simultaneously, causing response to be sent before BigQuery executes.

**After**:
```
Webhook ──> BigQuery HTTP Request ──> Respond to Webhook ✅
```

**Fix Applied**:
- Removed direct connection from Webhook to Respond
- Added correct connection from BigQuery to Respond
- Sequential flow now works correctly

---

## ⚠️ Remaining Issue: Webhook Not Registering

### Current Problem

Both workflows 3 and 4 are **active** but their webhooks are **not registered** in n8n:

```bash
curl https://n8n.joinfleek.com/webhook/api/orders/vendor/creed-vintage
# Error: "The requested webhook \"GET api/orders/vendor/creed-vintage\" is not registered."

curl https://n8n.joinfleek.com/webhook/api/orders/customer/test@example.com
# Error: "The requested webhook \"GET api/orders/customer/test@example.com\" is not registered."
```

### Root Cause

The webhook nodes are using path parameters (`:vendorHandle`, `:customerId`) but n8n may not be properly registering these dynamic routes.

### Working Workflows for Comparison

**Workflow 1** (working): `api/vendors/all` (static path, no parameters)
**Workflow 2** (working): `api/customers/all` (static path, no parameters)
**Workflow 3** (NOT working): `api/orders/vendor/:vendorHandle` (dynamic parameter)
**Workflow 4** (NOT working): `api/orders/customer/:customerId` (dynamic parameter)

---

## 🔍 Workflow Details

### Workflow 3: Get Vendor Active Orders
- **ID**: IX2FSNcvJdc5DeZn
- **Path**: `api/orders/vendor/:vendorHandle`
- **Method**: GET
- **Status**: Active
- **Connections**: ✅ Fixed (sequential flow)
- **Webhook**: ❌ Not registering

**SQL Query**:
```sql
SELECT vendor, order_id, fleek_id, order_number, latest_status,
       created_at as order_date, customer_email, customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = '<vendorHandle>'
ORDER BY created_at DESC
LIMIT 500
```

**Expected Usage**:
```bash
GET https://n8n.joinfleek.com/webhook/api/orders/vendor/creed-vintage
```

**Expected Response**:
```json
[
  {
    "f": [
      {"v": "creed-vintage"},
      {"v": "12345"},
      {"v": "FLEEK-123"},
      {"v": "ORD-456"},
      {"v": "delivered"},
      {"v": "2026-02-10T10:30:00Z"},
      {"v": "customer@example.com"},
      {"v": "John Doe"}
    ]
  },
  ...
]
```

---

### Workflow 4: Get Customer Active Orders
- **ID**: iCk9icYwePHK7M9k
- **Path**: `api/orders/customer/:customerId`
- **Method**: GET
- **Status**: Active
- **Connections**: ✅ Correct (already had sequential flow)
- **Webhook**: ❌ Not registering

**SQL Query**:
```sql
SELECT customer_email, order_id, fleek_id, order_number, latest_status,
       created_at as order_date, vendor
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE customer_email = '<customerId>'
ORDER BY created_at DESC
LIMIT 500
```

**Expected Usage**:
```bash
GET https://n8n.joinfleek.com/webhook/api/orders/customer/john@example.com
```

**Expected Response**:
```json
[
  {
    "f": [
      {"v": "john@example.com"},
      {"v": "12345"},
      {"v": "FLEEK-123"},
      {"v": "ORD-456"},
      {"v": "shipped"},
      {"v": "2026-02-12T14:20:00Z"},
      {"v": "creed-vintage"}
    ]
  },
  ...
]
```

---

## 🛠️ Manual Fix Required in n8n UI

Since the MCP tool cannot fix the webhook registration issue, **manual intervention in the n8n UI is required**:

### Steps to Fix Workflow 3 (Vendor Orders)

1. **Open n8n UI**: https://n8n.joinfleek.com
2. **Navigate to**: Workflow "3. Get Vendor Active Orders"
3. **Click** on the "Webhook" node
4. **Verify Settings**:
   - Path: `api/orders/vendor/:vendorHandle`
   - HTTP Method: `GET`
   - Response Mode: `Response Node` (not "Immediately")
5. **Save** the node
6. **Deactivate** the workflow (toggle in top-right)
7. **Activate** the workflow again
8. **Test**:
   ```bash
   curl https://n8n.joinfleek.com/webhook/api/orders/vendor/creed-vintage
   ```

### Steps to Fix Workflow 4 (Customer Orders)

1. **Open n8n UI**: https://n8n.joinfleek.com
2. **Navigate to**: Workflow "4. Get Customer Active Orders"
3. **Click** on the "Webhook - Get Customer Orders" node
4. **Verify Settings**:
   - Path: `api/orders/customer/:customerId`
   - HTTP Method: `GET`
   - Response Mode: `Response Node`
5. **Save** the node
6. **Deactivate** the workflow
7. **Activate** the workflow again
8. **Test**:
   ```bash
   curl "https://n8n.joinfleek.com/webhook/api/orders/customer/test@example.com"
   ```

---

## 🔄 Alternative Solution: Use Query Parameters Instead

If path parameters continue to have issues, consider changing to query parameters:

### Option A: Query Parameters

**Change webhook paths**:
- Workflow 3: `api/orders/vendor` with query `?vendorHandle=creed-vintage`
- Workflow 4: `api/orders/customer` with query `?customerEmail=test@example.com`

**Update SQL queries** to use:
- Workflow 3: `WHERE vendor = '{{ $json.query.vendorHandle }}'`
- Workflow 4: `WHERE customer_email = '{{ $json.query.customerEmail }}'`

**Backend API changes**:
```typescript
// Change from:
app.get("/api/orders/vendor/:vendorHandle", ...)

// To:
app.get("/api/orders/vendor", async (req, res) => {
  const { vendorHandle } = req.query;
  const response = await fetch(`https://n8n.joinfleek.com/webhook/api/orders/vendor?vendorHandle=${vendorHandle}`);
  ...
});
```

---

## 📝 Backend Integration (Already Implemented)

The backend API endpoints have been added to `/server/routes.ts`:

### Vendor Orders Endpoint
```typescript
app.get("/api/orders/vendor/:vendorHandle", async (req, res) => {
  try {
    const { vendorHandle } = req.params;
    const response = await fetch(`https://n8n.joinfleek.com/webhook/api/orders/vendor/${vendorHandle}`);
    const n8nData = await response.json();

    const orders = n8nData
      .map((row: any) => ({
        vendor: row.f[0].v,
        orderId: row.f[1].v,
        fleekId: row.f[2].v,
        orderNumber: row.f[3].v,
        latestStatus: row.f[4].v,
        orderDate: row.f[5].v,
        customerEmail: row.f[6].v,
        customerName: row.f[7].v,
      }))
      .filter((o: any) => o.orderId);

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### Customer Orders Endpoint
```typescript
app.get("/api/orders/customer/:customerEmail", async (req, res) => {
  try {
    const { customerEmail } = req.params;
    const response = await fetch(`https://n8n.joinfleek.com/webhook/api/orders/customer/${customerEmail}`);
    const n8nData = await response.json();

    const orders = n8nData
      .map((row: any) => ({
        customerEmail: row.f[0].v,
        orderId: row.f[1].v,
        fleekId: row.f[2].v,
        orderNumber: row.f[3].v,
        latestStatus: row.f[4].v,
        orderDate: row.f[5].v,
        vendor: row.f[6].v,
      }))
      .filter((o: any) => o.orderId);

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Location**: Lines 254-323 in `/server/routes.ts`

---

## 🧪 Testing After Fix

### Test Vendor Orders

```bash
# Test n8n workflow directly
curl "https://n8n.joinfleek.com/webhook/api/orders/vendor/creed-vintage"

# Test via backend API (when workflow is working)
curl "http://localhost:5001/api/orders/vendor/creed-vintage"
```

**Expected Result**:
- Should return array of orders for "creed-vintage"
- Each order should have: vendor, orderId, fleekId, orderNumber, latestStatus, orderDate, customerEmail, customerName

### Test Customer Orders

```bash
# Test n8n workflow directly
curl "https://n8n.joinfleek.com/webhook/api/orders/customer/test@example.com"

# Test via backend API (when workflow is working)
curl "http://localhost:5001/api/orders/customer/test@example.com"
```

**Expected Result**:
- Should return array of orders for customer email
- Each order should have: customerEmail, orderId, fleekId, orderNumber, latestStatus, orderDate, vendor

---

## 📊 Current Workflow Status

| Workflow | Status | Connections | Webhook | Action Required |
|----------|--------|-------------|---------|-----------------|
| **1. Get All Vendor Handles** | ✅ Working | ✅ Correct | ✅ Registered | None |
| **2. Get All Customer Handles** | ✅ Working | ✅ Correct | ✅ Registered | None |
| **3. Get Vendor Active Orders** | ⚠️ Partial | ✅ Fixed | ❌ Not Registered | Manual n8n UI fix |
| **4. Get Customer Active Orders** | ⚠️ Partial | ✅ Correct | ❌ Not Registered | Manual n8n UI fix |
| **5. Get Vendor GMV** | ❌ Broken | ❌ Broken | ❌ Not Registered | Full rebuild |

---

## 🎯 Next Steps

1. **Immediate** (Manual):
   - Open n8n UI
   - Fix webhook registration for workflows 3 & 4 as described above
   - Test webhook URLs directly

2. **After Webhooks Work**:
   - Test backend API endpoints
   - Integrate into ticket creation form
   - Populate "Fleek Order ID" dropdown when vendor is selected

3. **Long-term**:
   - Consider query parameter approach if path parameters continue to have issues
   - Add error handling for invalid vendor handles / customer emails
   - Add caching for frequently requested orders

---

## 💡 Key Learnings

1. **Connection Order Matters**: Webhook must connect to BigQuery FIRST, then BigQuery to Respond (not parallel connections)

2. **Path Parameters May Not Register**: Dynamic path parameters like `:vendorHandle` may have registration issues in n8n webhooks

3. **MCP Tool Limitations**: Cannot fix webhook registration issues programmatically - requires manual n8n UI intervention

4. **Static Paths Work Better**: Workflows 1 & 2 use static paths (`/all`) and work perfectly

---

**Created**: February 13, 2026
**Status**: Connections Fixed, Webhook Registration Pending Manual Fix
**Priority**: HIGH - Required for ticket creation order selection
