# ✅ n8n Workflows - FINAL & ACTIVE

## 🎯 All Workflows Updated & Active

**Data Source**: `fleek_hub.order_line_details` ✅  
**Status**: All 5 workflows ACTIVE and ready!

---

## 📊 Updated SQL Queries

### 1. Get All Vendor Handles
```sql
SELECT DISTINCT vendor as vendor_handle 
FROM `dogwood-baton-345622.fleek_hub.order_line_details` 
WHERE vendor IS NOT NULL 
ORDER BY vendor ASC
```

### 2. Get All Customer Handles
```sql
SELECT DISTINCT 
  customer_id, 
  customer_email, 
  customer_name 
FROM `dogwood-baton-345622.fleek_hub.order_line_details` 
WHERE customer_email IS NOT NULL 
ORDER BY customer_email ASC 
LIMIT 5000
```

### 3. Get Vendor Active Orders
```sql
SELECT 
  order_id, 
  fleek_id, 
  order_number, 
  ol_financial_status, 
  latest_status, 
  created_at as order_date, 
  gmv_post_all_discounts as order_amount, 
  customer_email, 
  customer_name 
FROM `dogwood-baton-345622.fleek_hub.order_line_details` 
WHERE vendor = '{{ $json.query.vendorHandle }}' 
  AND ol_financial_status IN ('pending', 'authorized', 'partially_paid', 'paid') 
ORDER BY created_at DESC 
LIMIT 100
```

### 4. Get Customer Active Orders
```sql
SELECT 
  order_id, 
  fleek_id, 
  order_number, 
  ol_financial_status, 
  latest_status, 
  created_at as order_date, 
  gmv_post_all_discounts as order_amount, 
  vendor 
FROM `dogwood-baton-345622.fleek_hub.order_line_details` 
WHERE customer_email = '{{ $json.query.customerId }}' 
  AND ol_financial_status IN ('pending', 'authorized', 'partially_paid', 'paid') 
ORDER BY created_at DESC 
LIMIT 100
```

### 5. Get Vendor GMV
```sql
SELECT 
  vendor as vendor_handle, 
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

## 🔗 Webhook URLs (Get from n8n)

1. Login to your n8n instance
2. Open each workflow
3. Click "Webhook" node
4. Copy "Production URL"

**Format**: `https://your-n8n.app.n8n.cloud/webhook/[path]`

---

## 📡 Endpoints

| Workflow | Path | Method | Use Case |
|----------|------|--------|----------|
| 1. Vendor Handles | `/api/vendors/all` | GET | Ticket form vendor dropdown |
| 2. Customer Handles | `/api/customers/all` | GET | Ticket form customer dropdown |
| 3. Vendor Orders | `/api/orders/vendor/:vendorHandle` | GET | Dynamic order loading (seller support) |
| 4. Customer Orders | `/api/orders/customer/:customerId` | GET | Dynamic order loading (customer support) |
| 5. Vendor GMV | `/api/vendor/:vendorHandle/gmv` | GET | Vendor details page GMV |

---

## ✅ Changes Made

**Previous Data Source** (Removed):
- ❌ `shopify.order`
- ❌ `shopify.order_line`
- ❌ `shopify.customer`

**New Data Source** (Active):
- ✅ `fleek_hub.order_line_details`

**Reason**: Shopify tables have restrictions; fleek_hub.order_line_details is the single source of truth.

---

## 📝 Next Steps

1. **Get webhook URLs** from n8n dashboard
2. **Test endpoints**:
   ```bash
   curl https://your-n8n.../webhook/api/vendors/all
   curl https://your-n8n.../webhook/api/customers/all
   ```
3. **Add to portal** environment variables
4. **Integrate** into ticket form and vendor details page

---

**Last Updated**: February 10, 2026  
**Data Source**: `fleek_hub.order_line_details`  
**Status**: ✅ ALL WORKFLOWS ACTIVE
