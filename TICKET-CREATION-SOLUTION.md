# 🎫 Ticket Creation Solution - Complete Guide

## ✅ Problem Solved

**Issue:** Unable to create tickets due to missing vendor handle database structure.

**Solution:** Complete vendor management system with BigQuery integration.

---

## 🗄️ Database Structure

### Vendors Table
Your portal now has a comprehensive vendors table with:

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `id` | UUID | Unique identifier | Auto-generated |
| `handle` | Text | Vendor handle (unique) | BigQuery |
| `name` | Text | Vendor/supplier name | BigQuery |
| `email` | Text | Contact email | BigQuery |
| `phone` | Text | Contact phone | BigQuery |
| `gmvTier` | Enum | GMV tier (S/M/L/XL/Platinum/Gold/Silver/Bronze) | BigQuery |
| `gmv90Day` | Integer | 90-day GMV value | BigQuery |
| `kam` | Text | Key Account Manager | BigQuery |
| `zone` | Text | Geographic zone | BigQuery |
| `region` | Text | Region | BigQuery |
| `country` | Text | Country | BigQuery |
| **`geo`** | Text | **Geographic location** | **BigQuery (NEW)** |
| `persona` | Text | Vendor persona/type | BigQuery |
| `createdAt` | Timestamp | Record creation time | Auto |
| `updatedAt` | Timestamp | Last update time | Auto |

---

## 🎯 How Ticket Creation Works

### 1. **Agent Opens Ticket Form**
- Clicks "Create Ticket" button
- Form opens with all fields

### 2. **Select Vendor Handle**
**Two ways to select:**

#### Option A: Search & Select from Dropdown
```
Agent types: "fleek"
↓
Dropdown shows:
• vendor_fleek_moda - Fleek Moda
• vendor_fleek_pro - Fleek Pro
• vendor_fleek_shop - Fleek Shop
↓
Agent clicks to select
```

#### Option B: Type Manually
```
Agent types: vendor_fleek_moda
↓
System validates vendor exists
```

### 3. **Auto-Load Fleek Order IDs**
```
Vendor selected: vendor_fleek_moda
↓
Portal calls: GET /api/bigquery/vendor/vendor_fleek_moda/order-ids
↓
BigQuery returns: [FLK-001, FLK-002, FLK-003, ...]
↓
Dropdown populates with order IDs
```

### 4. **Select Order IDs**
**Multi-select with search:**
```
Agent searches: "FLK-001"
↓
Finds order in list
↓
Clicks to select (can select multiple)
↓
Selected orders shown as badges
```

**Or type manually:**
```
Agent types: FLK-999
↓
Clicks "Add manually"
↓
Order added even if not in BigQuery
```

### 5. **Fill Other Details**
- Department
- Issue Type
- Category
- Subject
- Description

### 6. **Submit Ticket**
```
Agent clicks "Create Ticket"
↓
System validates:
✓ Vendor handle exists
✓ All required fields filled
↓
Priority calculated based on:
• Vendor GMV tier
• Existing open tickets
• Issue type priority
↓
Ticket created with:
• Auto-generated ticket number
• Priority score & badge (P0/P1/P2/P3)
• SLA targets
• Linked Fleek orders
```

---

## 🔄 Vendor Data Flow

### From BigQuery to Portal

```
BigQuery Table: aurora_postgres_public.vendors
├── Fields: handle, name, email, phone, gmv_tier, gmv_90_day
├── Fields: kam, zone, region, country, geo, persona
↓
Sync Methods:
├── 1. Manual Import
│   └── npm run import:vendors
├── 2. API Trigger
│   └── POST /api/automation/bigquery/sync-vendors
└── 3. n8n Scheduled
    └── Every 6 hours (if configured)
↓
Portal Database: vendors table
↓
Available in:
├── Ticket creation dropdown
├── Vendor profile pages
├── Analytics & reports
└── Order ID lookup
```

---

## 🚀 Current Capabilities

### ✅ What Works NOW

1. **Vendor Selection**
   - Searchable dropdown with vendor handle + name
   - Manual typing allowed
   - Real-time filtering

2. **Order ID Integration**
   - Auto-fetch from BigQuery when vendor selected
   - Multi-select with badges
   - Manual entry for orders not in BigQuery
   - Search/filter order IDs

3. **Smart Validation**
   - Required field checking
   - Vendor handle validation
   - Order ID format verification

4. **Priority Calculation**
   - Based on vendor GMV tier
   - Existing ticket count
   - Issue type importance
   - Auto-assigned P0/P1/P2/P3

5. **Data Sync**
   - BigQuery → Portal automatic sync
   - Vendor data always up-to-date
   - Order IDs fetched on-demand

---

## 📝 How to Use (Agent Perspective)

### Creating a Ticket - Step by Step

1. **Click "Create Ticket"** button on dashboard/my-tickets page

2. **Select or Type Vendor Handle**
   - Click the "Select or type vendor handle..." field
   - Type to search (e.g., "fleek")
   - Click vendor from dropdown OR type handle directly
   - Hit enter or click away

3. **Wait for Order IDs to Load** (automatic)
   - System fetches orders from BigQuery
   - Dropdown populates in 1-2 seconds

4. **Select Fleek Order IDs** (if applicable)
   - Click "Select or type order IDs..." field
   - Search for specific order
   - Click to select (can select multiple)
   - OR type manually and click "Add custom order ID"

5. **Fill in Details**
   - Department: Select from dropdown
   - Issue Type: Complaint/Request/Information
   - Category: Auto-filtered based on department + issue type
   - Subject: Brief description
   - Description: Full details

6. **Submit**
   - All required fields turn green when valid
   - Click "Create Ticket"
   - Success! Ticket number generated

---

## 🔧 Admin/Setup Tasks

### One-Time Setup

1. **Ensure BigQuery Credentials Are Configured**
   ```bash
   # Check if configured
   curl http://localhost:5000/api/bigquery/test

   # If not, run:
   ./setup-bigquery.sh
   ```

2. **Import Vendors from BigQuery**
   ```bash
   # Method 1: Manual import
   npm run import:vendors

   # Method 2: API call
   curl -X POST http://localhost:5000/api/automation/bigquery/sync-vendors
   ```

3. **Verify Vendors Loaded**
   ```bash
   # Check vendors in portal
   curl http://localhost:5000/api/vendors
   ```

### Ongoing Maintenance

#### Option 1: Manual Sync (When Needed)
```bash
npm run import:vendors
```

#### Option 2: Scheduled n8n (Automated)
```
Import workflow: n8n-workflows/1-scheduled-vendor-sync.json
Runs: Every 6 hours
Updates: Vendors + metrics automatically
```

---

## 🧪 Testing

### Test Vendor Selection
1. Open portal → My Tickets → Create Ticket
2. Click vendor field
3. Type "vendor" or "fleek"
4. Verify dropdown shows vendors
5. Select one
6. Verify order IDs load

### Test Order ID Fetching
1. Select a vendor (e.g., vendor_fleek_moda)
2. Wait 1-2 seconds
3. Click Fleek Order IDs field
4. Verify orders appear in dropdown
5. Select multiple orders
6. Verify they appear as badges

### Test Manual Entry
1. In vendor field, type: "test-vendor-123"
2. In order field, type: "MANUAL-ORDER-001"
3. Click "Add custom order ID"
4. Fill other fields
5. Submit
6. Verify ticket created

---

## 🐛 Troubleshooting

### "No vendors in dropdown"
```bash
# Check if vendors exist
curl http://localhost:5000/api/vendors

# If empty, import:
npm run import:vendors
```

### "Order IDs not loading"
```bash
# Test BigQuery connection
curl http://localhost:5000/api/bigquery/test

# Test order fetch manually
curl http://localhost:5000/api/bigquery/vendor/VENDOR_HANDLE/order-ids
```

### "Vendor handle not found" error
```bash
# 1. Check vendor exists in database
curl http://localhost:5000/api/vendors | grep "handle-you-typed"

# 2. If not found, sync vendors
curl -X POST http://localhost:5000/api/automation/bigquery/sync-vendors
```

### "Submit button disabled"
- Check all required fields (marked with red *)
- Vendor handle must be selected/typed
- Department, Issue Type, Category must be selected
- Subject and Description must be filled

---

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vendors` | GET | List all vendors |
| `/api/vendors/:id` | GET | Get vendor details |
| `/api/bigquery/vendor/:handle/order-ids` | GET | Fetch order IDs for vendor |
| `/api/automation/bigquery/sync-vendors` | POST | Sync vendors from BigQuery |
| `/api/tickets` | POST | Create new ticket |

---

## 🎯 Next Steps (Your Plan)

### Phase 1: ✅ DONE
- [x] Add vendor database with handle, country, geo
- [x] Integrate with BigQuery
- [x] Enable vendor selection in ticket form
- [x] Auto-fetch Fleek Order IDs

### Phase 2: Coming Next (Based on your needs)
- [ ] Add more vendor fields (you mentioned more tables)
- [ ] Enhanced vendor profile pages
- [ ] Vendor performance analytics
- [ ] Custom fields per vendor type
- [ ] Vendor-specific SLA rules

---

## 💡 Key Features

### Smart Dropdown Behavior
- **Search as you type** - Filters in real-time
- **Shows handle + name** - Easy identification
- **Manual entry allowed** - Flexibility for special cases

### Order ID Integration
- **Auto-fetch from BigQuery** - No manual lookup
- **Multi-select** - Handle multiple orders per ticket
- **Manual entry** - Handle edge cases
- **Search within orders** - Find specific orders quickly

### Priority Intelligence
- **Vendor-aware** - Higher priority for bigger vendors (XL/Platinum)
- **History-aware** - Escalates if vendor has many open tickets
- **Issue-aware** - Complaints > Requests > Information

---

## 📦 What's Included

### Database
✅ Vendors table with geo field
✅ Ticket-to-vendor relationship
✅ Order IDs as array field

### Backend
✅ BigQuery integration
✅ Vendor sync automation
✅ Order ID fetching API
✅ n8n webhook triggers

### Frontend
✅ Searchable vendor dropdown
✅ Auto-loading order IDs
✅ Multi-select order picker
✅ Manual entry fallbacks

### Documentation
✅ This guide
✅ AUTOMATION-SETUP.md
✅ QUICK-START-GUIDE.md

---

## 🎊 You're All Set!

Your portal can now:
1. ✅ Create tickets with vendor handles
2. ✅ Auto-fetch Fleek order IDs from BigQuery
3. ✅ Track vendor country & geo information
4. ✅ Calculate smart priorities
5. ✅ Sync vendor data automatically

**Test it out:**
1. Go to My Tickets
2. Click "Create Ticket"
3. Select a vendor
4. Watch order IDs load
5. Create your first ticket!

---

**Questions? Issues?**
Check the troubleshooting section above or review the API endpoints to debug. 🚀
