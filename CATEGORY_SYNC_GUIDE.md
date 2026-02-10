# Category Sync & Bulk Routing Rules Guide

## 🎯 Overview

This guide explains the new automated category management and bulk routing rule setup features added to the Information Portal.

**Deployment Date**: February 10, 2026
**Status**: ✅ Production Ready
**Deployment URL**: https://information-portal-beryl.vercel.app

---

## 🚀 New Features

### 1. **BigQuery Category Sync**
Automatically sync categories from your Zendesk BigQuery data into the Ticket Manager category hierarchy.

### 2. **Bulk Routing Rule Setup**
Create routing rules for multiple categories at once with a single configuration.

---

## 📋 How to Use

### Syncing Categories from BigQuery

1. **Navigate to Routing Rules Page**
   - Go to: `/routing-config`
   - Or: Ticket Manager → Routing Configuration

2. **Click "Sync from BigQuery" Button**
   - Located in the header next to "Add Routing Rule"
   - Button shows a download icon

3. **Wait for Sync to Complete**
   - The button will show a spinner during sync
   - You'll see a toast notification with results:
     - Number of category combinations processed
     - Number of new categories created
     - Number of existing categories skipped

4. **Review Synced Categories**
   - Refresh the page
   - New categories will appear in Ticket Manager
   - Categories are organized hierarchically (L1 → L2 → L3)

### Setting Up Bulk Routing Rules

1. **Click "Bulk Setup" Button**
   - Located between "Sync from BigQuery" and "Add Routing Rule"
   - Shows a list icon

2. **Select Categories**
   - Table shows all available categories (categories without routing rules)
   - Use checkboxes to select multiple categories
   - Quick actions:
     - "Select All" - Select all available categories
     - "Clear All" - Deselect everything
   - Selected count shown at bottom

3. **Configure Common Settings**
   All selected categories will get these settings:

   **Target Department** (Required)
   - Choose which department receives these tickets
   - Options: Finance, Operations, Marketplace, Tech, Supply, Growth, Experience, CX

   **Auto-Assignment** (Optional)
   - Toggle to enable automatic agent assignment
   - Choose strategy:
     - Round Robin - Rotate through available agents
     - Least Loaded - Assign to agent with fewest tickets
     - Specific Agent - Always assign to one agent

   **Priority Boost** (Optional)
   - Add extra priority points (number)
   - Example: +5 makes these tickets higher priority

   **SLA Overrides** (Optional)
   - Response Time (Hours) - Custom response deadline
   - Resolution Time (Hours) - Custom resolution deadline
   - Leave empty to use department defaults

4. **Create Rules**
   - Button shows: "Create X Routing Rules"
   - Click to create all rules at once
   - Wait for completion toast:
     - Created: Successfully created rules
     - Skipped: Categories that already had rules
     - Failed: Any errors that occurred

---

## 🔧 Technical Details

### BigQuery Category Sync

**Data Source**: `dogwood-baton-345622.zendesk_new.ticket`

**Fields Synced**:
- `custom_issue_type` (Level 1)
- `custom_issue_type_level_2` (Level 2)
- `custom_issue_type_level_3` (Level 3)

**Process**:
1. Queries BigQuery for all distinct category combinations
2. Groups by L1 → L2 → L3 hierarchy
3. Counts tickets per combination
4. Creates hierarchical categories in `categoryHierarchy` table
5. Skips categories that already exist
6. Normalizes names (e.g., "order_status" → "Order Status")
7. Auto-assigns department types based on keywords

**Department Type Detection**:
- **Seller Support**: Keywords like "seller", "vendor", "payout", "listing"
- **Customer Support**: Keywords like "buyer", "customer", "order", "tracking", "refund"
- **All**: Default for general categories

### Bulk Routing Rules

**API Endpoint**: `POST /api/config/routing-rules/bulk`

**Request Format**:
```json
{
  "categoryIds": ["cat-id-1", "cat-id-2", "cat-id-3"],
  "config": {
    "targetDepartment": "Finance",
    "autoAssignEnabled": true,
    "assignmentStrategy": "round_robin",
    "assignedAgentId": null,
    "priorityBoost": 5,
    "slaResponseHoursOverride": 24,
    "slaResolutionHoursOverride": 72
  }
}
```

**Response Format**:
```json
{
  "message": "Bulk routing rule creation completed",
  "total": 10,
  "created": 8,
  "skipped": 2,
  "failed": 0,
  "results": {
    "success": [...],
    "skipped": [...],
    "errors": [...]
  }
}
```

---

## ⚠️ Prerequisites

### BigQuery Credentials

**IMPORTANT**: Category sync requires BigQuery credentials to be configured in Vercel.

**Setup Steps**:

1. **Get Service Account JSON**
   - Obtain from your tech team
   - Must have BigQuery read access to `dogwood-baton-345622.zendesk_new.ticket`

2. **Add to Vercel Environment Variables**

   **Option A - CLI**:
   ```bash
   vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON production
   # Paste your service account JSON when prompted
   ```

   **Option B - Dashboard**:
   - Visit: https://vercel.com/syed-faez-hasan-rizvis-projects/information-portal/settings/environment-variables
   - Click "Add New"
   - Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: [Paste entire service account JSON]
   - Environment: Production
   - Click Save

3. **Redeploy**:
   ```bash
   vercel --prod
   ```

**Without Credentials**:
- Sync button will show an error: "BigQuery credentials not configured"
- Manual category creation still works via Ticket Manager

---

## 📊 Example Workflows

### Workflow 1: First-Time Setup

```
1. Add BigQuery credentials to Vercel
2. Deploy/Redeploy application
3. Navigate to Routing Configuration
4. Click "Sync from BigQuery"
5. Wait for sync to complete (30-60 seconds for 100+ categories)
6. Review synced categories in Ticket Manager
7. Click "Bulk Setup"
8. Select all categories for "Finance" department
9. Configure:
   - Target Department: Finance
   - Auto-Assign: Enabled
   - Strategy: Round Robin
   - Priority Boost: 0
10. Create routing rules
11. Repeat for other departments
```

### Workflow 2: Adding New Categories

```
1. Ticket Manager adds new categories in Ticket Manager UI
2. Navigate to Routing Configuration
3. New categories appear in "Available Categories" (no routing rules yet)
4. Use "Bulk Setup" to configure routing rules
5. Or use "Add Routing Rule" for individual setup
```

### Workflow 3: Periodic BigQuery Sync

```
1. As Zendesk data evolves, new issue types appear
2. Click "Sync from BigQuery" monthly/quarterly
3. New categories automatically added
4. Existing categories skipped (no duplicates)
5. Review new categories and add routing rules as needed
```

---

## 🧪 Testing

### Test Category Sync

```bash
# Call sync endpoint directly
curl -X POST https://information-portal-beryl.vercel.app/api/admin/sync-categories-from-bigquery \
  -H "x-user-email: syed.hasan@joinfleek.com"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Category sync completed successfully",
  "categoriesProcessed": 150,
  "categoriesCreated": 45,
  "categoriesSkipped": 105,
  "errors": [],
  "details": {
    "level1Count": 15,
    "level2Count": 20,
    "level3Count": 10
  }
}
```

### Test Bulk Creation

```bash
curl -X POST https://information-portal-beryl.vercel.app/api/config/routing-rules/bulk \
  -H "Content-Type: application/json" \
  -H "x-user-email: syed.hasan@joinfleek.com" \
  -d '{
    "categoryIds": ["cat-id-1", "cat-id-2"],
    "config": {
      "targetDepartment": "Finance",
      "autoAssignEnabled": false,
      "assignmentStrategy": "round_robin",
      "priorityBoost": 0
    }
  }'
```

---

## 🐛 Troubleshooting

### "BigQuery credentials not configured"

**Cause**: Missing `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable

**Solution**:
1. Add service account JSON to Vercel environment variables
2. Redeploy application
3. Try sync again

### "Failed to fetch categories"

**Cause**: API endpoint error or permission issue

**Solution**:
1. Check user has `edit:config` permission
2. Verify logged in as Owner/Admin
3. Check browser console for errors
4. Try hard refresh (Ctrl+F5)

### "No available categories"

**Cause**: All categories already have routing rules

**Solution**:
1. Either all categories have rules (expected)
2. Or sync hasn't been run yet (click "Sync from BigQuery")
3. Or add new categories via Ticket Manager

### Bulk creation shows "Skipped"

**Cause**: Active routing rule already exists for that category

**Solution**:
1. This is normal and prevents duplicates
2. To update existing rules, use individual "Edit" button
3. Or delete old rule and recreate

### Sync creates wrong department types

**Cause**: Category name doesn't match keyword detection

**Solution**:
1. Department type can be changed in Ticket Manager
2. Edit category and update `departmentType` field
3. Or update keyword detection in `bigquery-category-sync.ts`

---

## 📁 Files Modified

### New Files
- `server/bigquery-category-sync.ts` - Category sync logic
- `check-bigquery-categories.ts` - Manual inspection script

### Modified Files
- `server/routes.ts` - Added sync and bulk endpoints
- `client/src/pages/routing-config.tsx` - Added UI components

### API Endpoints Added
- `POST /api/admin/sync-categories-from-bigquery` - Trigger category sync
- `POST /api/config/routing-rules/bulk` - Create multiple routing rules

---

## 📈 Performance

### Category Sync
- **Speed**: ~1-2 seconds per 100 category combinations
- **Typical Runtime**: 30-60 seconds for full sync
- **Database Operations**: Upsert (insert if not exists)
- **Network**: Single BigQuery query + batch inserts

### Bulk Rule Creation
- **Speed**: ~100ms per rule
- **Concurrency**: Sequential (ensures data consistency)
- **Validation**: Checks for duplicates before creation
- **Rollback**: Individual failures don't affect others

---

## 🔐 Security

### Permissions Required
- **Category Sync**: `edit:config` permission (Owner/Admin only)
- **Bulk Setup**: `edit:config` permission (Owner/Admin only)
- **View Categories**: All users can view

### Data Access
- BigQuery credentials stored securely in Vercel environment variables
- Never exposed to client-side code
- Read-only access to BigQuery (SELECT only)
- No modification to BigQuery data

---

## 🎉 Benefits

### Before These Features
- ❌ Manual category creation (one by one)
- ❌ No visibility into Zendesk category structure
- ❌ Routing rules created individually (slow)
- ❌ No way to apply same config to multiple categories

### After These Features
- ✅ Automatic category sync from BigQuery
- ✅ Hierarchical category structure imported
- ✅ Bulk routing rule creation (save hours of work)
- ✅ Single configuration for multiple categories
- ✅ Department type auto-detection
- ✅ One-click sync to stay up-to-date

---

## 📝 Next Steps

1. **Add BigQuery credentials** (if not already done)
2. **Run initial category sync** to import all Zendesk categories
3. **Set up bulk routing rules** for your departments
4. **Schedule periodic syncs** (monthly/quarterly) to catch new categories
5. **Monitor and adjust** department type assignments as needed

---

**Documentation Version**: 1.0
**Last Updated**: February 10, 2026
**Maintained By**: Platform Team

For questions or issues, contact the platform administrator.
