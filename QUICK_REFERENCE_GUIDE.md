# 🚀 Quick Reference Guide - Information Portal

## 📊 BigQuery Tables (Use This!)

### For Orders & Customers → `fleek_hub.order_line_details`
```sql
-- Get vendor orders
SELECT * FROM `dogwood-baton-345622.fleek_hub.order_line_details`
WHERE vendor = 'vendor-name' AND ol_financial_status = 'Paid'
```

### For GMV & Finance → `fleek_raw.order_line_finance_details`
```sql
-- Get vendor GMV
SELECT SUM(pre_discounted_gmv) as total_gmv
FROM `dogwood-baton-345622.fleek_raw.order_line_finance_details`
WHERE vendor = 'vendor-name' AND ol_financial_status = 'Paid'
```

### For Vendor Info → `fleek_hub.vendor_details`
```sql
-- Get vendor details
SELECT * FROM `dogwood-baton-345622.fleek_hub.vendor_details`
WHERE vendor_handle = 'vendor-name'
```

---

## 🔗 n8n Webhook URLs

```bash
# 1. Get all vendors
https://n8n.joinfleek.com/webhook/api/vendors/all

# 2. Get all customers
https://n8n.joinfleek.com/webhook/api/customers/all

# 3. Get vendor orders (replace :vendorHandle with actual vendor)
https://n8n.joinfleek.com/webhook/f1b5e55c-a749-48bb-82e7-b9f34fac1eef/api/orders/vendor/creed-vintage

# 4. Get customer orders (replace :customerId with email)
https://n8n.joinfleek.com/webhook/b2f9a1a8-6b91-41b2-827f-d748a03313a0/api/orders/customer/email@example.com

# 5. Get vendor GMV (replace :vendorHandle with actual vendor)
https://n8n.joinfleek.com/webhook/f404cc2c-e155-4a30-b531-72e32b99abc0/api/vendor/creed-vintage/gmv
```

---

## ⚠️ IMPORTANT: Case Sensitivity!

Financial status values are **Title Case**:
- ✅ Use: `'Paid'`, `'Pending'`, `'Authorized'`, `'Partially Paid'`
- ❌ NOT: `'paid'`, `'pending'`, `'authorized'`, `'partially_paid'`

---

## 🛠️ Manual Fix Needed (Workflows 3 & 4)

In n8n UI, change this:
```sql
WHERE ... AND ol_financial_status IN ('pending', 'authorized', 'partially_paid', 'paid')
```

To this:
```sql
WHERE ... AND ol_financial_status IN ('Pending', 'Authorized', 'Partially Paid', 'Paid')
```

---

## ✅ What Works Now

| Endpoint | Status | Test Vendor |
|----------|--------|-------------|
| Vendors | ✅ | - |
| Customers | ✅ | - |
| Vendor Orders | ⚠️ | Case fix needed |
| Customer Orders | ⚠️ | Case fix needed |
| Vendor GMV | ✅ | creed-vintage |

---

## 🧪 Test Commands

```bash
# Test GMV (should work now!)
curl "https://n8n.joinfleek.com/webhook/f404cc2c-e155-4a30-b531-72e32b99abc0/api/vendor/creed-vintage/gmv"

# Expected: ~£2M GMV, 6127 orders

# Test vendors list
curl "https://n8n.joinfleek.com/webhook/api/vendors/all" | head -c 500
```

---

## 📝 Key Files

- `SESSION_SUMMARY_FEB11.md` - Complete session summary
- `N8N_GMV_FIX_COMPLETE.md` - GMV fix details
- `DATA_ARCHITECTURE.md` - Table schemas & usage
- `QUICK_REFERENCE_GUIDE.md` - This file!

---

## 🎯 Next Steps

1. **Test** GMV endpoint with creed-vintage
2. **Fix** case sensitivity in n8n UI (workflows 3 & 4)
3. **Integrate** webhooks into portal
4. **Deploy** to production

---

**Last Updated**: February 11, 2026
**Status**: GMV workflow fixed, testing pending
