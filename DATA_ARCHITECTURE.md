# 🏗️ Data Architecture - Fleek Information Portal

## 📊 BigQuery Tables Overview

Your platform uses three main tables in BigQuery, each serving a specific purpose:

---

## 1️⃣ `fleek_hub.order_line_details`

**Purpose**: Order and customer information

**Use Cases**:
- ✅ Listing all vendors
- ✅ Listing all customers
- ✅ Getting vendor orders
- ✅ Getting customer orders
- ✅ Order status tracking
- ✅ Customer relationship data

**Key Columns**:
- `vendor` - Vendor handle/name
- `customer_id` - Customer ID
- `customer_email` - Customer email
- `customer_name` - Customer name
- `order_id` - Order ID
- `order_number` - Order number
- `fleek_id` - Internal Fleek ID
- `ol_financial_status` - Financial status ("Paid", "Not Paid", etc.)
- `latest_status` - Current order status
- `created_at` - Order creation timestamp

**Current Usage**:
- ✅ n8n Workflow 1: Get All Vendor Handles
- ✅ n8n Workflow 2: Get All Customer Handles
- ✅ n8n Workflow 3: Get Vendor Active Orders
- ✅ n8n Workflow 4: Get Customer Active Orders

---

## 2️⃣ `fleek_raw.order_line_finance_details`

**Purpose**: Financial and GMV calculations

**Use Cases**:
- ✅ GMV (Gross Merchandise Value) calculations
- ✅ Revenue reporting
- ✅ Vendor payout calculations
- ✅ Financial analytics
- ✅ Refund tracking
- ✅ Transaction fee analysis

**Key Columns**:
- `vendor` - Vendor handle
- `order_line_id` - Order line ID
- `order_number` - Order number
- `order_id` - Order ID
- `order_created_date` - Order creation timestamp
- `ol_financial_status` - Financial status ("Paid", "Not Paid", etc.)
- `pre_discounted_gmv` - **GMV before discounts** ⭐ Use this for GMV!
- `gmv_post_all_discounts` - GMV after discounts (often NULL)
- `vbp_gbp` - Vendor base price in GBP
- `after_sale_vendor_base_price` - Price after sales
- `original_vendor_base_price` - Original vendor price
- `vendor_discount_code` - Vendor discount codes applied
- `vendor_discount_percentage` - Discount percentage
- `offer_code` - Offer/promo codes
- `offer_amount` - Offer amount
- `offer_discount` - Offer discount amount
- `flk_order_discount_on_orderline` - Fleek order discounts
- `flk_discount_on_shipping` - Shipping discounts
- `estimated_shipping` - Estimated shipping cost
- `actual_shipping_with_surcharge` - Actual shipping charged
- `transaction_fee_gbp` - Transaction fees
- `shopify_refund_gbp` - Refund amounts
- `supplier_impact_refund` - Supplier refund impact
- `fleek_impact_refund` - Fleek refund impact
- `refund_reasons` - Refund reason text
- `refund_date` - Refund date
- `payout_date` - Payout date
- `amound_paid` - Amount paid to vendor [sic - typo in schema]
- `ar_orderline` - Accounts receivable
- `shopify_ff_status` - Fulfillment status
- `shopify_ff_time` - Fulfillment timestamp

**Current Usage**:
- ✅ n8n Workflow 5: Get Vendor GMV (**FIXED** to use this table!)

---

## 3️⃣ `fleek_hub.vendor_details`

**Purpose**: Vendor profile and business information

**Use Cases**:
- ✅ Vendor profiles
- ✅ Vendor contact information
- ✅ Business details
- ✅ Vendor onboarding status
- ✅ Vendor categorization

**Actual Columns** (11,950 vendors in table):
- `vendor_handle` - Vendor unique identifier/slug
- `vendor_email` - Contact email
- `vendor_phone` - Contact phone number
- `vendor_origin` - Origin code (e.g., "AU" for Australia)
- `vendor_sign_up` - Vendor registration datetime
- `Vendor_Country` - Vendor country/region (e.g., "Rest of the world")
- `kam` - Key Account Manager (if assigned)
- `zone` - Geographic zone assignment
- `vendor_persona` - Vendor type/persona (e.g., "ROW" = Rest of World)
- `first_upload_date` - First product upload timestamp
- `last_upload_date` - Most recent product upload timestamp

**Current Usage**:
- 🔄 To be integrated: Vendor profile pages
- 🔄 To be integrated: Vendor search/filtering
- 🔄 To be integrated: Vendor verification status

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BigQuery                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  fleek_hub.order_line_details                       │  │
│  │  • Orders                                            │  │
│  │  • Customers                                         │  │
│  │  • Order status                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  fleek_raw.order_line_finance_details               │  │
│  │  • GMV calculations                                  │  │
│  │  • Financial metrics                                 │  │
│  │  • Refunds & payouts                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  fleek_hub.vendor_details                           │  │
│  │  • Vendor profiles                                   │  │
│  │  • Business info                                     │  │
│  │  • Contact details                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │        n8n Workflows           │
         │  (5 webhook endpoints)         │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │    Information Portal          │
         │  (Vercel + PostgreSQL)         │
         └────────────────────────────────┘
```

---

## 📋 n8n Workflow Mapping

| Workflow | BigQuery Table | Purpose | Status |
|----------|---------------|---------|--------|
| 1. Get All Vendor Handles | `order_line_details` | List vendors | ✅ Correct |
| 2. Get All Customer Handles | `order_line_details` | List customers | ✅ Correct |
| 3. Get Vendor Active Orders | `order_line_details` | Vendor orders | ⚠️ Case fix needed |
| 4. Get Customer Active Orders | `order_line_details` | Customer orders | ⚠️ Case fix needed |
| 5. Get Vendor GMV | `order_line_finance_details` | GMV calculation | ✅ **FIXED!** |

---

## 🎯 Best Practices

### When to Use Each Table:

#### Use `fleek_hub.order_line_details` for:
- 👥 Customer lists and profiles
- 🏪 Vendor lists
- 📦 Order status and tracking
- 🔍 Order search and filtering
- 📧 Customer communication (emails, names)
- 🎫 Ticket context (linking orders to support tickets)

#### Use `fleek_raw.order_line_finance_details` for:
- 💰 GMV calculations and reporting
- 📊 Financial dashboards
- 💳 Payout calculations
- 📈 Revenue analytics
- 🔄 Refund tracking and analysis
- 💵 Transaction fee calculations
- 📉 Discount impact analysis

#### Use `fleek_hub.vendor_details` for:
- 🏢 Vendor profile pages
- 📞 Vendor contact information
- ✅ Vendor verification status
- 🔐 Vendor access control
- 📝 Business information displays
- 🎯 Vendor categorization and search

---

## 🔗 Joining Tables

### Common Joins:

#### Orders + Finance:
```sql
SELECT
  o.order_id,
  o.vendor,
  o.customer_email,
  o.ol_financial_status,
  f.pre_discounted_gmv,
  f.transaction_fee_gbp
FROM `fleek_hub.order_line_details` o
JOIN `fleek_raw.order_line_finance_details` f
  ON o.order_id = f.order_id
WHERE o.vendor = 'vendor-name'
```

#### Vendor + Orders + Finance:
```sql
SELECT
  v.vendor_handle,
  v.vendor_name,
  v.vendor_email,
  COUNT(DISTINCT o.order_id) as total_orders,
  SUM(f.pre_discounted_gmv) as total_gmv
FROM `fleek_hub.vendor_details` v
LEFT JOIN `fleek_hub.order_line_details` o
  ON v.vendor_handle = o.vendor
LEFT JOIN `fleek_raw.order_line_finance_details` f
  ON o.order_id = f.order_id
WHERE f.ol_financial_status = 'Paid'
GROUP BY v.vendor_handle, v.vendor_name, v.vendor_email
```

---

## 🚨 Important Notes

### Financial Status Case Sensitivity:
Both `order_line_details` and `order_line_finance_details` use **capitalized** status values:
- ✅ `"Paid"` (capital P)
- ✅ `"Not Paid"` (capital N, P)
- ✅ `"Pending"` (capital P)
- ✅ `"Authorized"` (capital A)
- ✅ `"Partially Paid"` (capital P, P)
- ✅ `"Fully Refunded"` (capital F, R)
- ✅ `"Partially Refunded"` (capital P, R)

❌ **Never use lowercase**: `'paid'`, `'pending'`, etc. will return 0 results!

### GMV Calculation:
Always use `pre_discounted_gmv` from `order_line_finance_details`:
- ✅ `pre_discounted_gmv` - Has actual values
- ❌ `gmv_post_all_discounts` - Often NULL
- ❌ Don't use GMV from `order_line_details` - NULL values

### Vendor Identifier:
- In `order_line_details`: Column is `vendor`
- In `order_line_finance_details`: Column is `vendor`
- In `vendor_details`: Column is likely `vendor_handle`

---

## 📊 Sample Queries

### Get Vendor GMV (Correct):
```sql
SELECT
  vendor,
  SUM(pre_discounted_gmv) as total_gmv,
  COUNT(DISTINCT order_id) as total_orders,
  MIN(order_created_date) as first_order,
  MAX(order_created_date) as last_order
FROM `dogwood-baton-345622.fleek_raw.order_line_finance_details`
WHERE vendor = 'creed-vintage'
  AND ol_financial_status = 'Paid'
GROUP BY vendor
```

### Get Vendor Orders (Correct):
```sql
SELECT
  order_id,
  fleek_id,
  order_number,
  ol_financial_status,
  latest_status,
  created_at,
  customer_email,
  customer_name
FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = 'creed-vintage'
  AND ol_financial_status IN ('Paid', 'Pending', 'Authorized', 'Partially Paid')
ORDER BY created_at DESC
LIMIT 100
```

---

## 🔄 Next Steps

### Immediate:
1. ✅ Update n8n Workflow 5 to use `order_line_finance_details` - **DONE**
2. ⚠️ Fix case sensitivity in workflows 3 & 4 - **Pending manual fix**
3. 🔄 Query `vendor_details` schema to understand available columns
4. 🔄 Create n8n workflow for vendor details (if needed)

### Integration:
1. Add vendor details page using `vendor_details` table
2. Combine order + finance data for comprehensive reporting
3. Add financial metrics to vendor dashboard
4. Create vendor performance analytics

---

**Created**: February 11, 2026
**Status**: Architecture documented
**Tables Confirmed**: 3 main tables identified
**Next**: Verify `vendor_details` schema and integrate into portal
