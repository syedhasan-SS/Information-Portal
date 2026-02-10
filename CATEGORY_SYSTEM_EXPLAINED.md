# Category System - Complete Explanation

## 🎯 Summary of the Problem

**Issue**: Routing Rules page was showing incorrect/missing categories

**Root Cause**: The routing config page was calling a **non-existent API endpoint** (`/api/category-hierarchy`)

**Fix**: Changed to call the correct endpoint (`/api/categories/for-ticket-creation`)

---

## 📊 Where Categories Are Stored

### Database Table: `categoryHierarchy`

Categories are stored in the **`categoryHierarchy`** table in your PostgreSQL database (via Drizzle ORM).

**Schema** (from `shared/schema.ts`):
```typescript
export const categoryHierarchy = pgTable("categoryHierarchy", {
  id: text("id").primaryKey(),           // UUID
  name: text("name").notNull(),          // Category name
  level: integer("level").notNull(),     // 1, 2, 3, or 4
  parentId: text("parentId"),            // Parent category ID
  isActive: boolean("isActive").default(true),
  deletedAt: timestamp("deletedAt"),
  // Additional metadata fields...
});
```

### Category Levels

1. **Level 1 (L1)**: Department Type (e.g., "Seller Support", "Customer Support")
2. **Level 2 (L2)**: Main Category (e.g., "Account Management", "Order Issues")
3. **Level 3 (L3)**: Sub-category (e.g., "Login Issues", "Payment Problems")
4. **Level 4 (L4)**: Specific Issue (optional, most detailed level)

**Example Hierarchy**:
```
Seller Support (L1)
  └─ Account Management (L2)
      └─ Login Issues (L3)
          └─ Password Reset (L4)
```

---

## 🔗 How Categories Are Accessed

### 1. **Ticket Manager** (Admin Interface)

**Page**: `/ticket-manager`

**Data Source**: Direct database queries to `categoryHierarchy` table

**Storage Methods** (in `server/storage.ts`):
```typescript
// Get all categories
getCategoryHierarchy()

// Get categories by level
getCategoryHierarchyByLevel(level: 1 | 2 | 3)

// Get children of a category
getCategoryHierarchyChildren(parentId: string | null)

// Get specific category
getCategoryHierarchyById(id: string)
```

**API Endpoints** (in `server/routes.ts`):
- `GET /api/config/categories` - Get all categories
- `GET /api/config/categories/level/:level` - Get by level
- `GET /api/config/categories/parent/:parentId` - Get children
- `GET /api/config/categories/:id` - Get specific category

---

### 2. **Ticket Creation Form**

**Pages**:
- `/create-ticket`
- Any page with ticket creation

**Data Source**: Flattened category paths from `categoryHierarchy`

**Storage Method**:
```typescript
getCategoriesForTicketCreation({
  departmentType?: string,
  issueType?: string
})
```

This method:
1. Queries L3 and L4 categories from `categoryHierarchy`
2. Builds complete paths (L1 > L2 > L3 > L4)
3. Filters by `departmentType` and `issueType` if provided
4. Returns flat list with full path strings

**API Endpoint**:
- `GET /api/categories/for-ticket-creation?departmentType=X&issueType=Y`

**Response Format**:
```json
[
  {
    "id": "uuid-123",
    "issueType": "Complaint",
    "l1": "Seller Support",
    "l2": "Account Management",
    "l3": "Login Issues",
    "l4": "Password Reset",
    "path": "Seller Support > Account Management > Login Issues > Password Reset",
    "issuePriorityPoints": 3
  }
]
```

---

### 3. **Routing Rules Configuration** ⚠️ **THIS WAS BROKEN**

**Page**: `/routing-config`

**What Was Wrong**:
```typescript
// ❌ WRONG - This endpoint doesn't exist!
fetch("/api/category-hierarchy")
```

**What's Correct Now**:
```typescript
// ✅ CORRECT - Use ticket creation endpoint
fetch("/api/categories/for-ticket-creation")
```

**Why This Endpoint?**
- Returns flattened category paths (easy to display in dropdown)
- Includes full hierarchy (L1 > L2 > L3 > L4)
- Filters out deleted/inactive categories
- Same format as ticket creation (consistent UX)

---

## 🔄 Category Data Flow

### From BigQuery → Portal

**Sync Script**: `server/bigquery-category-sync.ts`

1. **Source**: `zendesk_new.ticket` custom fields in BigQuery
2. **Extracts**: `custom_department_type`, `custom_category_l2`, `custom_category_l3`, `custom_category_l4`
3. **Builds**: Hierarchical structure
4. **Inserts/Updates**: `categoryHierarchy` table

**Run Manually**:
```bash
npx tsx server/bigquery-category-sync.ts
```

---

### Within Portal

```
┌─────────────────────────────────────────────────────────┐
│                  categoryHierarchy Table                │
│              (PostgreSQL via Drizzle ORM)               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Ticket       │  │ Routing      │  │ Ticket       │
│ Manager      │  │ Rules        │  │ Creation     │
│              │  │              │  │              │
│ /admin/      │  │ /routing-    │  │ /create-     │
│ ticket-      │  │ config       │  │ ticket       │
│ manager      │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
API: /api/config/    API: /api/      API: /api/
     categories          categories/      categories/
                         for-ticket-      for-ticket-
                         creation         creation
```

---

## ✅ The Fix Applied

### Before (Broken)
```typescript
// routing-config.tsx
const { data: categories } = useQuery<Category[]>({
  queryKey: ["categories"],
  queryFn: async () => {
    const res = await fetch("/api/category-hierarchy"); // ❌ 404 Not Found
    return res.json();
  },
});
```

### After (Fixed)
```typescript
// routing-config.tsx
const { data: categories } = useQuery<Category[]>({
  queryKey: ["categories"],
  queryFn: async () => {
    const res = await fetch("/api/categories/for-ticket-creation"); // ✅ Works!
    return res.json();
  },
});
```

---

## 📋 Available API Endpoints for Categories

### For Ticket Creation & Routing Rules
```
GET /api/categories/for-ticket-creation
  - Returns: Flat list with full paths
  - Optional params: ?departmentType=X&issueType=Y
  - Used by: Ticket creation form, Routing rules
```

### For Category Management (Admin)
```
GET /api/config/categories
  - Returns: All categories (hierarchical)
  - Used by: Ticket Manager

GET /api/config/categories/level/:level
  - Returns: Categories at specific level (1, 2, or 3)
  - Used by: Level-specific views

GET /api/config/categories/parent/:parentId
  - Returns: Child categories of a parent
  - Used by: Cascading dropdowns

GET /api/config/categories/:id
  - Returns: Single category details
  - Used by: Category detail view
```

### For Legacy Support
```
GET /api/categories
  - Returns: Old categories table
  - Status: Deprecated, kept for backward compatibility
```

---

## 🎯 Best Practices

### When to Use Each Endpoint

1. **Building Dropdowns/Selectors**:
   - Use: `/api/categories/for-ticket-creation`
   - Why: Flat structure, full paths, easy to display

2. **Managing Category Hierarchy**:
   - Use: `/api/config/categories` (all) or `/api/config/categories/level/:level` (specific level)
   - Why: Full hierarchical structure, edit capabilities

3. **Getting Category Details**:
   - Use: `/api/config/categories/:id`
   - Why: Complete category information including metadata

---

## 🔍 Debugging Categories

### Check What's in the Database
```bash
# Connect to database and run:
SELECT level, name, parent_id, is_active
FROM "categoryHierarchy"
WHERE deleted_at IS NULL
ORDER BY level, name;
```

### Test API Endpoints
```bash
# Get all categories for ticket creation
curl "http://localhost:5000/api/categories/for-ticket-creation"

# Get all category hierarchy
curl "http://localhost:5000/api/config/categories"

# Get only L1 categories
curl "http://localhost:5000/api/config/categories/level/1"
```

### Common Issues

**Issue**: Routing rules show no categories
- **Check**: API endpoint is `/api/categories/for-ticket-creation` (not `/api/category-hierarchy`)
- **Verify**: Categories exist in database with `is_active = true`

**Issue**: Categories are outdated
- **Solution**: Run BigQuery sync script
  ```bash
  npx tsx server/bigquery-category-sync.ts
  ```

**Issue**: Missing department types
- **Check**: L1 categories exist with correct department types
- **Verify**: `departmentType` field is populated

---

## 📝 Summary

### Categories Are Stored In:
✅ **`categoryHierarchy`** PostgreSQL table

### Categories Are Accessed Via:
- **Ticket Creation**: `/api/categories/for-ticket-creation` (flat paths)
- **Routing Rules**: `/api/categories/for-ticket-creation` (flat paths) ← **FIXED**
- **Ticket Manager**: `/api/config/categories` (hierarchical)

### The Bug Was:
❌ Routing config called non-existent `/api/category-hierarchy` endpoint

### The Fix:
✅ Changed to call `/api/categories/for-ticket-creation` endpoint

---

**Fixed**: February 10, 2026
**Impact**: Routing rules now show correct categories from Ticket Manager
**Testing**: Verify routing config page loads categories successfully
