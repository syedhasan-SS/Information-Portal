# n8n BigQuery Integration Workflows

## 📋 Overview

This folder contains 5 n8n workflows that connect your Information Portal to BigQuery for dynamic data fetching.

**Created**: February 10, 2026
**Status**: ✅ Created in n8n (currently inactive)

---

## 🎯 Workflows Created

### 1. Get All Vendor Handles
- **File**: `1-get-all-vendor-handles.json`
- **Endpoint**: `GET /api/vendors/all`
- **Purpose**: Fetch all vendor handles for ticket form autocomplete

### 2. Get All Customer Handles  
- **File**: `2-get-all-customer-handles.json`
- **Endpoint**: `GET /api/customers/all`
- **Purpose**: Fetch all customers for ticket form autocomplete

### 3. Get Vendor Active Orders
- **File**: `3-get-vendor-active-orders.json`
- **Endpoint**: `GET /api/orders/vendor/:vendorHandle`
- **Purpose**: Load active orders when vendor selected

### 4. Get Customer Active Orders
- **File**: `4-get-customer-active-orders.json`
- **Endpoint**: `GET /api/orders/customer/:customerId`
- **Purpose**: Load active orders when customer selected

### 5. Get Vendor GMV
- **File**: `5-get-vendor-gmv.json`
- **Endpoint**: `GET /api/vendor/:vendorHandle/gmv`
- **Purpose**: Fetch correct GMV for vendor details page

---

## 🚀 Quick Setup

1. **Import to n8n**: Upload each JSON file via n8n UI
2. **Add BigQuery Credentials**: Configure Google BigQuery OAuth2
3. **Verify Table Names**: Check SQL queries match your BigQuery structure
4. **Activate Workflows**: Toggle "Active" in each workflow
5. **Copy Webhook URLs**: Get production URLs from webhook nodes
6. **Update Portal**: Add webhook URLs to environment variables

---

## ⚠️ IMPORTANT - Update SQL Queries

The workflows assume these BigQuery tables exist:
- `dogwood-baton-345622.zendesk_new.ticket`
- `dogwood-baton-345622.orders.active_orders`
- `dogwood-baton-345622.orders.all_orders`

**If your table names are different, edit the SQL in each BigQuery node.**

---

## 📞 Workflow IDs (Already Created in n8n)

- `yMw9sbPKicHQ26E1` - Get All Vendor Handles
- `CCsSUCyQI7cjzO3R` - Get All Customer Handles
- `IX2FSNcvJdc5DeZn` - Get Vendor Active Orders
- `iCk9icYwePHK7M9k` - Get Customer Active Orders
- `UJ0OrfKMsLYBvlSE` - Get Vendor GMV

---

**Full documentation**: See detailed README in this folder
