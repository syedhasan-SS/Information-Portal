# ✅ n8n Workflows - ACTIVATED & READY

## 🎯 Status: ALL WORKFLOWS ACTIVE

All 5 workflows have been activated and are ready to receive requests!

---

## 📡 Webhook URLs

**Your n8n Instance**: You need to get these URLs from your n8n dashboard

### How to Get Webhook URLs:

1. Login to your n8n instance
2. Open each workflow
3. Click on the "Webhook" node
4. Copy the **Production URL**

The URLs will be in this format:
```
https://your-n8n-instance.app.n8n.cloud/webhook/[path]
```

---

## 🔗 Workflow Details

### 1. Get All Vendor Handles
- **Workflow ID**: `yMw9sbPKicHQ26E1`
- **Webhook Path**: `/api/vendors/all`
- **Method**: GET
- **Status**: ✅ ACTIVE
- **Data Source**: `shopify.order_line` table
- **Returns**: Array of distinct vendor handles

**Expected URL**:
```
https://your-n8n.app.n8n.cloud/webhook/api/vendors/all
```

**Example Response**:
```json
[
  {"vendor_handle": "Vendor A"},
  {"vendor_handle": "Vendor B"},
  {"vendor_handle": "Vendor C"}
]
```

---

### 2. Get All Customer Handles
- **Workflow ID**: `CCsSUCyQI7cjzO3R`
- **Webhook Path**: `/api/customers/all`
- **Method**: GET
- **Status**: ✅ ACTIVE
- **Data Source**: `shopify.customer` table
- **Returns**: Array of customers with ID, email, and name

**Expected URL**:
```
https://your-n8n.app.n8n.cloud/webhook/api/customers/all
```

**Example Response**:
```json
[
  {
    "customer_id": 123,
    "email": "customer@example.com",
    "customer_name": "John Doe"
  }
]
```

---

### 3. Get Vendor Active Orders
- **Workflow ID**: `IX2FSNcvJdc5DeZn`
- **Webhook Path**: `/api/orders/vendor/:vendorHandle`
- **Method**: GET
- **Status**: ✅ ACTIVE
- **Data Source**: `shopify.order` + `shopify.order_line` tables
- **Parameters**: `:vendorHandle` (in URL path)
- **Returns**: Array of active orders for the vendor

**Expected URL**:
```
https://your-n8n.app.n8n.cloud/webhook/api/orders/vendor/VendorName
```

**Example Response**:
```json
[
  {
    "order_id": 456789,
    "order_number": "#1001",
    "financial_status": "paid",
    "fulfillment_status": "unfulfilled",
    "order_date": "2026-02-10T10:30:00Z",
    "order_amount": 150.50,
    "customer_email": "customer@example.com"
  }
]
```

---

### 4. Get Customer Active Orders
- **Workflow ID**: `iCk9icYwePHK7M9k`
- **Webhook Path**: `/api/orders/customer/:customerId`
- **Method**: GET
- **Status**: ✅ ACTIVE
- **Data Source**: `shopify.order` table
- **Parameters**: `:customerId` (customer email in URL path)
- **Returns**: Array of active orders for the customer

**Expected URL**:
```
https://your-n8n.app.n8n.cloud/webhook/api/orders/customer/customer@example.com
```

**Example Response**:
```json
[
  {
    "order_id": 456789,
    "order_number": "#1001",
    "financial_status": "paid",
    "fulfillment_status": "unfulfilled",
    "order_date": "2026-02-10T10:30:00Z",
    "order_amount": 150.50
  }
]
```

---

### 5. Get Vendor GMV
- **Workflow ID**: `UJ0OrfKMsLYBvlSE`
- **Webhook Path**: `/api/vendor/:vendorHandle/gmv`
- **Method**: GET
- **Status**: ✅ ACTIVE
- **Data Source**: `shopify.order` + `shopify.order_line` tables
- **Parameters**: `:vendorHandle` (in URL path)
- **Returns**: GMV metrics for the vendor

**Expected URL**:
```
https://your-n8n.app.n8n.cloud/webhook/api/vendor/VendorName/gmv
```

**Example Response**:
```json
[
  {
    "vendor_handle": "VendorName",
    "total_gmv": 125000.50,
    "total_orders": 450,
    "first_order_date": "2024-01-15T08:00:00Z",
    "last_order_date": "2026-02-10T14:30:00Z"
  }
]
```

---

## 📊 SQL Queries Used

### Workflow 1 - Vendors
```sql
SELECT DISTINCT vendor as vendor_handle 
FROM `dogwood-baton-345622.shopify.order_line` 
WHERE vendor IS NOT NULL 
ORDER BY vendor ASC
```

### Workflow 2 - Customers
```sql
SELECT DISTINCT 
  c.id as customer_id, 
  c.email, 
  CONCAT(c.first_name, ' ', c.last_name) as customer_name 
FROM `dogwood-baton-345622.shopify.customer` c 
WHERE c.email IS NOT NULL 
  AND c._fivetran_deleted = FALSE 
ORDER BY c.email ASC 
LIMIT 5000
```

### Workflow 3 - Vendor Orders
```sql
SELECT 
  o.id as order_id, 
  o.name as order_number, 
  o.financial_status, 
  o.fulfillment_status, 
  o.created_at as order_date, 
  o.total_price as order_amount, 
  o.email as customer_email 
FROM `dogwood-baton-345622.shopify.order` o 
JOIN `dogwood-baton-345622.shopify.order_line` ol ON o.id = ol.order_id 
WHERE ol.vendor = '{{ $json.query.vendorHandle }}' 
  AND o.financial_status IN ('pending', 'authorized', 'partially_paid', 'paid') 
  AND o._fivetran_deleted = FALSE 
GROUP BY o.id, o.name, o.financial_status, o.fulfillment_status, o.created_at, o.total_price, o.email 
ORDER BY o.created_at DESC 
LIMIT 100
```

### Workflow 4 - Customer Orders
```sql
SELECT 
  o.id as order_id, 
  o.name as order_number, 
  o.financial_status, 
  o.fulfillment_status, 
  o.created_at as order_date, 
  o.total_price as order_amount 
FROM `dogwood-baton-345622.shopify.order` o 
WHERE o.email = '{{ $json.query.customerId }}' 
  AND o.financial_status IN ('pending', 'authorized', 'partially_paid', 'paid') 
  AND o._fivetran_deleted = FALSE 
ORDER BY o.created_at DESC 
LIMIT 100
```

### Workflow 5 - Vendor GMV
```sql
SELECT 
  ol.vendor as vendor_handle, 
  SUM(o.total_price) as total_gmv, 
  COUNT(DISTINCT o.id) as total_orders, 
  MIN(o.created_at) as first_order_date, 
  MAX(o.created_at) as last_order_date 
FROM `dogwood-baton-345622.shopify.order` o 
JOIN `dogwood-baton-345622.shopify.order_line` ol ON o.id = ol.order_id 
WHERE ol.vendor = '{{ $json.query.vendorHandle }}' 
  AND o.financial_status = 'paid' 
  AND o._fivetran_deleted = FALSE 
GROUP BY ol.vendor
```

---

## 🧪 Testing

Once you have the webhook URLs, test them with:

```bash
# Test vendors
curl https://your-n8n.app.n8n.cloud/webhook/api/vendors/all

# Test customers
curl https://your-n8n.app.n8n.cloud/webhook/api/customers/all

# Test vendor orders (replace VENDOR_NAME)
curl https://your-n8n.app.n8n.cloud/webhook/api/orders/vendor/VENDOR_NAME

# Test customer orders (replace EMAIL)
curl https://your-n8n.app.n8n.cloud/webhook/api/orders/customer/customer@example.com

# Test vendor GMV (replace VENDOR_NAME)
curl https://your-n8n.app.n8n.cloud/webhook/api/vendor/VENDOR_NAME/gmv
```

---

## 📝 Next Steps

1. **Get Webhook URLs** from n8n dashboard
2. **Test each endpoint** with curl or Postman
3. **Add URLs to portal** environment variables:
   ```bash
   N8N_VENDORS_ENDPOINT=https://your-n8n.../webhook/api/vendors/all
   N8N_CUSTOMERS_ENDPOINT=https://your-n8n.../webhook/api/customers/all
   N8N_VENDOR_ORDERS_ENDPOINT=https://your-n8n.../webhook/api/orders/vendor
   N8N_CUSTOMER_ORDERS_ENDPOINT=https://your-n8n.../webhook/api/orders/customer
   N8N_VENDOR_GMV_ENDPOINT=https://your-n8n.../webhook/api/vendor
   ```
4. **Integrate into portal** ticket form and vendor details page

---

**Status**: ✅ ALL WORKFLOWS ACTIVE AND READY
**Date**: February 10, 2026
**Created By**: Claude Sonnet 4.5
