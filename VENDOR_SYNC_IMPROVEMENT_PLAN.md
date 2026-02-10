# Vendor Synchronization Improvement Plan

## Current Issues Identified

1. **Incomplete Vendor Data**: Some vendor names are missing
2. **Synchronization Reliability**: Vendors are not syncing consistently
3. **Data Accuracy**: System is not completely robust for team usage

## BigQuery Data Sources Available

### Primary Tables:
1. **`fleek_vendor_app.sign_up`** (10,710 rows)
   - Contains: handle, email, phone_number, name (first_name + last_name), origin, timestamp
   - Primary source for vendor registration data

2. **`aurora_postgres_public.vendors`** (11,948 rows)
   - Contains: handle, email, phone, shop_name, zone, profile_image, description, status
   - Most complete vendor metadata

3. **`fleek_hub.order_line_details`**
   - Contains: vendor, order statistics, GMV data, geo flags (is_zone_vendor)
   - Source for order metrics and activity

4. **`fleek_customer_app.product_detail_page_viewed`**
   - Contains: vendor, rating
   - Source for vendor ratings

## Root Cause Analysis

### Problem 1: Missing Vendor Names
- **Cause**: The current sync prioritizes `sign_up` table which only has `handle`, `email`, and `phone_number`
- **Solution**: Prioritize `aurora_postgres_public.vendors.shop_name` as the primary name source

### Problem 2: Inconsistent Synchronization
- **Cause**: Complex query with multiple LEFT JOINs can fail silently if any subquery has issues
- **Solution**: Break down into smaller, more reliable queries with error handling

### Problem 3: Location Errors
- **Cause**: BigQuery tables are in `us-west1` but code tries multiple locations including `US`
- **Solution**: Use correct location (`us-west1`) consistently

## Improved Architecture

### Phase 1: Comprehensive Data Collection
```
1. Fetch ALL vendors from aurora_postgres_public.vendors (most complete)
2. Enrich with sign_up data (email, phone if missing)
3. Add order metrics from fleek_hub.order_line_details
4. Add ratings from fleek_customer_app.product_detail_page_viewed
```

### Phase 2: Smart Upsert Logic
```
- Match vendors by handle (primary key)
- Update existing vendors (preserve local changes)
- Insert new vendors
- Track sync timestamps
- Log all changes for audit
```

### Phase 3: Validation & Error Handling
```
- Validate required fields (handle, name/shop_name)
- Skip invalid records but log them
- Return detailed sync report
- Alert on failures
```

## Data Mapping Strategy

| Local DB Field | BigQuery Source (Priority Order) |
|---|---|
| `handle` | vendors.handle OR sign_up.handle |
| `name` | vendors.shop_name OR sign_up.name OR (first_name + last_name) |
| `email` | vendors.email OR sign_up.email |
| `phone` | vendors.phone OR sign_up.phone_number |
| `zone` | vendors.zone OR derived from order_line_details.is_zone_vendor |
| `gmv90Day` | SUM(order_line_details.gmv) last 90 days |
| `gmvTier` | Calculated based on gmv90Day |
| `origin` | sign_up.origin |
| `profilePicture` | vendors.profile_image |
| `description` | vendors.description |
| `averageRating` | AVG(product_detail_page_viewed.rating) |

## Implementation Steps

### Step 1: Create Optimized Query ✅
- Use `aurora_postgres_public.vendors` as base table (most complete)
- LEFT JOIN enrichment data
- Handle NULL values gracefully
- Use correct location (`us-west1`)

### Step 2: Improve Error Handling ✅
- Try-catch for each data source
- Continue on partial failures
- Detailed error logging
- Return success/failure counts

### Step 3: Add Validation ✅
- Require handle + name
- Validate email format
- Validate phone format
- Skip duplicates intelligently

### Step 4: Create Sync API Endpoint ✅
- Manual sync trigger
- Scheduled sync (daily)
- Progress tracking
- Detailed reporting

### Step 5: Add Monitoring ✅
- Track sync success rate
- Alert on repeated failures
- Log sync duration
- Count new vs updated vendors

## Success Metrics

1. **Completeness**: 100% of active vendors have names
2. **Accuracy**: Vendor data matches BigQuery sources
3. **Reliability**: Sync succeeds >99% of the time
4. **Performance**: Sync completes in <2 minutes
5. **Freshness**: Data updated daily automatically

## Next Steps

1. ✅ Review and approve this plan
2. ⏳ Implement improved sync function
3. ⏳ Test with production data
4. ⏳ Deploy and monitor
5. ⏳ Schedule automatic daily syncs
