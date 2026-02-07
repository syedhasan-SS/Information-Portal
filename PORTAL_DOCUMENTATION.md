# Information Portal - Comprehensive Function Overview

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Ticket Management System](#ticket-management-system)
3. [Category & Configuration System](#category--configuration-system)
4. [Routing & Auto-Assignment](#routing--auto-assignment)
5. [Notification System](#notification-system)
6. [Vendor Management](#vendor-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Admin Tools](#admin-tools)
9. [BigQuery Integration](#bigquery-integration)

---

## Authentication & User Management

### Login System
**Location**: `/` (Login Page)

**How It Works**:
1. User enters email on login page
2. System looks up user by email in database (case-insensitive)
3. If user exists and is active:
   - User data stored in localStorage
   - `x-user-email` header set for all API requests
   - Redirected to dashboard
4. If user doesn't exist or is inactive:
   - Error message displayed
   - Login denied

**Key Features**:
- Email-based authentication (no password required in current setup)
- Role-based access control (Owner, Admin, Head, Manager, Lead, Associate, Agent)
- Multi-role support (users can have multiple roles)
- Custom permissions per user
- Active/Inactive user status

### User Roles & Permissions

**Role Hierarchy** (highest to lowest):
1. **Owner** - Full system access, all permissions
2. **Admin** - Administrative access, most permissions
3. **Head** - Department head, view all department tickets, edit config
4. **Manager** - Team management, create/edit tickets
5. **Lead** - Lead agents, create/edit tickets
6. **Associate** - Create/edit tickets
7. **Agent** - Basic ticket access

**Permission System**:
- Each role has default permissions (defined in `use-auth.tsx`)
- Custom permissions can override defaults
- Permissions checked on both frontend and backend
- Protected routes require specific permissions

**Permission Examples**:
- `view:dashboard` - Access dashboard
- `view:tickets` - View tickets
- `create:tickets` - Create new tickets
- `edit:tickets` - Modify tickets
- `view:all_tickets` - See all tickets (not just assigned/created)
- `view:config` - Access configuration pages
- `edit:config` - Modify system configuration

### User Management Page
**Location**: `/users`

**Functions**:
1. **View Users**
   - List all users with details (name, email, role, department)
   - Filter by active/inactive status
   - Search by name or email

2. **Create User**
   - Form with fields: name, email, role, department, sub-department
   - Option to set custom permissions
   - Profile picture upload
   - Set active status

3. **Edit User**
   - Update any user field
   - Change roles
   - Modify permissions
   - Activate/deactivate users

4. **Delete User**
   - Soft delete (sets isActive to false)
   - User data retained in database
   - Can be reactivated later

---

## Ticket Management System

### Ticket Lifecycle

**Ticket States**:
1. **New** - Just created, not assigned
2. **Open** - Assigned and being worked on
3. **Pending** - Waiting for external input
4. **Solved** - Issue resolved
5. **Closed** - Ticket archived

**Valid State Transitions**:
- New → Open, Closed
- Open → Pending, Solved, Closed
- Pending → Open, Solved, Closed
- Solved → Closed, Open (reopen)
- Closed → Open (reopen only)

**Status Validation**:
- Enforced at API level in PATCH `/api/tickets/:id`
- Invalid transitions return 400 error
- Clear error messages with allowed next states

### Creating a Ticket
**Location**: `/my-tickets` (Create Ticket tab)

**How It Works**:
1. **Ticket Type Selection**:
   - Seller Support (requires vendor selection)
   - Customer Support (requires customer name)

2. **Form Fields**:
   - **Vendor/Customer**: Searchable dropdown
   - **Issue Type**: Complaint, Request, or Information
   - **Category**: Hierarchical dropdown (L1 > L2 > L3 > L4)
   - **Subject**: Ticket title
   - **Description**: Detailed explanation
   - **Fleek Order IDs**: Comma-separated order IDs

3. **Priority Calculation** (Automatic):
   - Base score starts at 0
   - **Vendor Ticket Volume**: +20 points if vendor has 5+ open tickets
   - **Vendor GMV Tier**: L (0), M (10), S (20), XS (30 points)
   - **Issue Priority**: Based on category configuration
   - **Total Score** determines tier:
     - Critical (P0): 70+ points
     - High (P1): 50-69 points
     - Medium (P2): 30-49 points
     - Low (P3): <30 points

4. **Ticket Number Generation** (Server-side):
   - **SS#####** for Seller Support (has vendor)
   - **CS#####** for Customer Support (no vendor)
   - Sequential numbering per prefix
   - Example: SS00001, SS00002, CS00001, CS00002

5. **Routing Rules Applied** (if configured):
   - Ticket auto-routed to target department
   - Auto-assignment if enabled (round-robin, least-loaded, or specific agent)
   - Priority boost applied
   - SLA override if configured

6. **Notifications Sent**:
   - All active team members in target department notified
   - Creator excluded from notifications
   - Notification includes ticket number, priority, subject

### Viewing Tickets

**My Tickets Page** (`/my-tickets`):
Three main sections with sub-tabs:

1. **Tickets I Created**
   - All: All your created tickets
   - New: Tickets not yet assigned
   - Open: Tickets being worked on
   - Assigned: Tickets assigned to someone
   - Solved: Resolved tickets

2. **Assigned to Me**
   - Tickets where you are the assignee
   - Excludes solved/closed tickets
   - Shows only actionable items

3. **Solved Tickets**
   - All tickets you created or were assigned that are now solved
   - Separate from active workload

**All Tickets Page** (`/tickets`):
- View all tickets across the system (requires `view:all_tickets` permission)
- Advanced filtering options
- Bulk operations

**Department Tickets Page** (`/department-tickets`):
- View all tickets in your department (requires `view:department_tickets`)
- Team-wide visibility
- Department-level metrics

### Ticket Detail Page
**Location**: `/tickets/:id`

**Functions**:

1. **View Ticket Information**:
   - Ticket number, status, priority
   - Subject and description
   - Category hierarchy
   - Creator and assignee
   - Created/updated timestamps
   - Tags
   - Department and owner team
   - SLA targets (response and resolution)

2. **Edit Ticket Fields** (if you have permission):
   - **Category**: Dropdown with all categories
     - Triggers routing rules on change
   - **Priority**: Critical, High, Medium, Low
   - **Department**: Dropdown with all 8 departments
   - **Issue Type**: Complaint, Request, Information
   - **Tags**: Add/remove tags with X button
   - **Status**: Follows valid state transitions
   - **Assignee**: Assign to team members

3. **Pending Changes Pattern**:
   - Changes stored in state until "Save Changes" clicked
   - Confirmation dialog before applying
   - All changes sent in single PATCH request
   - Optimistic UI updates

4. **Comments System**:
   - Add comments to ticket
   - View comment history with timestamps
   - Comments show author name
   - Mentions support: @username or @email
   - Visibility options: Internal or Zendesk

5. **Fleek Order Integration**:
   - If ticket has Fleek Order IDs
   - Fetches order data from BigQuery
   - Displays order details in expandable cards:
     - Order ID, date, status
     - Amount and currency
     - Customer name
     - Vendor handle

6. **Notifications Triggered**:
   - **Field Change**: Depends on field (status, assignee)
   - **Comment Added**: Creator and assignee notified (except commenter)
   - **Ticket Solved**: Creator and assignee notified (except solver)
   - **Mentions**: Users mentioned in comments notified

---

## Category & Configuration System

### Ticket Manager
**Location**: `/ticket-config`

**Purpose**: Configure ticket categories, SLA, tags, and custom fields

### Categories Section

**Category Hierarchy**:
- **L1**: Department (Finance, Operations, Marketplace, etc.)
- **L2**: Sub Department
- **L3**: Category
- **L4**: Sub-Category (optional)

**How Categories Work**:

1. **Category Creation**:
   - Wizard-based interface (4 steps)
   - Step 1: Issue Type (Complaint/Request/Information)
   - Step 2: L1 Department selection
   - Step 3: L2 Sub Department
   - Step 4: L3 Category and optional L4

2. **Category Configuration**:
   - **Issue Type**: Links category to request type
   - **Department Type**: Seller Support, Customer Support, or All
   - **Description**: Category explanation
   - **Active Status**: Enable/disable category
   - **SLA Settings**:
     - Response Time (hours): Time to first response
     - Resolution Time (hours): Time to solve ticket
     - Business Hours: Whether to use business hours (not implemented yet)

3. **Category Filtering**:
   - **Search**: Search across all text fields (L1, L2, L3, L4, description)
   - **Request Type Filter**: All, Complaint, Request, Information
   - **Status Filter**: All, Active, Inactive
   - **SLA Filter**: All, With Response SLA, Resolution Only
   - **Dept Level Filter**: Dropdown with all unique L1 values

4. **Bulk Operations**:
   - Select multiple categories with checkboxes
   - Activate Selected
   - Deactivate Selected
   - Delete Selected

5. **CSV Import/Export**:
   - **Download Template**: Get CSV template with headers
   - **Export CSV**: Export current filtered categories
   - **Upload CSV**: Bulk import categories from CSV file

### Snapshots System

**Purpose**: Preserve configuration at ticket creation time

**How It Works**:
When a ticket is created, the system captures:

1. **Category Snapshot**:
   - L1, L2, L3, L4 values
   - Full category path
   - Issue type
   - Issue priority points

2. **SLA Snapshot**:
   - Configuration ID
   - Response time hours
   - Resolution time hours
   - Use business hours flag
   - Calculated target timestamps

3. **Priority Snapshot**:
   - Priority score
   - Priority tier (Critical/High/Medium/Low)
   - Priority badge (P0/P1/P2/P3)
   - Breakdown of score calculation

4. **Tags Snapshot**:
   - Tag IDs and names
   - Tag colors
   - Applied timestamp

**Why Snapshots?**:
- Configuration changes don't affect old tickets
- Historical accuracy maintained
- Audit trail for each ticket
- SLA targets remain consistent

### Tags System

**How Tags Work**:

1. **Tag Configuration**:
   - Name: Tag display name
   - Color: Visual identifier (hex color)
   - Department Type: Seller Support, Customer Support, or All
   - Active status

2. **Tag Application**:
   - Manually add tags when creating ticket
   - Auto-applied tags (if configured)
   - Tags editable on ticket detail page

3. **Tag Filtering**:
   - Filter tags by active/inactive
   - Filter by auto-applied status
   - Filter by department type

### Custom Fields

**Purpose**: Extend ticket form with custom fields per department

**Field Types**:
- Text
- Number
- Date
- Select (dropdown)
- Multi-select
- Checkbox
- Textarea

**Configuration**:
- Field name and label
- Field type
- Required flag
- Help text
- Options (for select fields)
- Display order
- Department type (Seller Support, Customer Support, All)

---

## Routing & Auto-Assignment

### Routing Rules System
**Location**: `/routing-config`

**Purpose**: Automatically route tickets to departments and assign to agents based on category

### How Routing Works

**1. Rule Configuration**:
Each routing rule configures:
- **Category**: Which category triggers this rule
- **Target Department**: Where to route the ticket
- **Auto-Assignment**: Whether to auto-assign to an agent
- **Assignment Strategy**: How to choose the agent
  - Round-robin
  - Least-loaded
  - Specific agent
- **Priority Boost**: Add points to priority score
- **SLA Override**: Override response/resolution hours

**2. Routing Trigger Points**:

**A. Ticket Creation** (`POST /api/tickets`):
- Check if category has active routing rule
- Apply target department
- Apply priority boost
- Apply SLA override
- If auto-assignment enabled, assign agent

**B. Category Change** (`PATCH /api/tickets/:id`):
- When ticket category is updated
- Check new category for routing rules
- Re-route to new department if rule exists
- Keep existing assignee (don't re-assign)

**3. Assignment Strategies**:

**Round-Robin**:
```
1. Get all active agents in target department
2. Use routing rule's roundRobinCounter
3. Select agent at index: counter % agentCount
4. Increment counter for next assignment
5. Assign ticket to selected agent
6. Set status to "Open"
```

**Least-Loaded**:
```
1. Get all active agents in target department
2. Count open tickets for each agent (New, Open, Pending status)
3. Sort agents by ticket count (ascending)
4. Select agent with fewest tickets
5. Assign ticket to selected agent
6. Set status to "Open"
```

**Specific Agent**:
```
1. Check if configured agent exists and is active
2. Assign ticket to that specific agent
3. Set status to "Open"
```

**4. Routing Rules Management**:

**Create Rule**:
- Select category from dropdown
- Choose target department
- Enable/disable auto-assignment
- Select assignment strategy
- Configure priority boost (optional)
- Configure SLA overrides (optional)
- Only one active rule per category allowed

**Edit Rule**:
- Update any configuration
- When activating, checks for conflicting rules
- Returns error if another active rule exists for same category

**Delete Rule**:
- Remove routing rule
- Doesn't affect existing tickets

**5. Permissions**:
- Requires `edit:config` permission
- Only Owner, Admin, Head, Manager can manage rules
- Enforced on all endpoints (POST, PUT, DELETE)

---

## Notification System

### Notification Types

1. **case_created** - New ticket created
2. **ticket_assigned** - Ticket assigned to you
3. **ticket_solved** - Ticket marked as solved
4. **comment_added** - New comment on your ticket
5. **comment_mention** - You were mentioned in a comment

### How Notifications Work

### 1. Ticket Created (`notifyTicketCreated`)

**Triggered**: When new ticket is created

**Who Gets Notified**:
- All active users in the ticket's owner team/department
- Excludes the ticket creator

**Process**:
```
1. Fetch all users in target department (optimized query)
2. Filter to active users only
3. Exclude creator
4. Create notification for each user
5. Notifications sent in parallel (Promise.all)
```

**Notification Content**:
- Title: "New Ticket Created"
- Message: "A new [Priority] priority ticket has been created: [Subject]"
- Metadata: Ticket number, vendor handle, priority

### 2. Ticket Assigned (`notifyTicketAssigned`)

**Triggered**: When ticket is assigned to someone

**Who Gets Notified**:
- Only the assignee

**Process**:
```
1. Check if assignee is active
2. Create notification
3. Include who assigned it (actor)
```

**Notification Content**:
- Title: "Ticket Assigned to You"
- Message: "You have been assigned ticket: [Subject]"
- Metadata: Ticket number, priority, assigned by

### 3. Ticket Solved (`notifyTicketSolved`)

**Triggered**: When ticket status changes to "Solved"

**Who Gets Notified**:
- Ticket creator (if not the solver)
- Ticket assignee (if different from creator and not the solver)

**Deduplication**:
- Uses Set to prevent duplicates if creator == assignee
- Only notified once even if they're both

**Process**:
```
1. Add creator to notification set (if not solver)
2. Add assignee to notification set (if not solver or creator)
3. For each user in set:
   - Check if active
   - Create notification
   - Customize message based on role (creator vs assignee)
```

**Notification Content**:
- Title: "Ticket Solved" or "Assigned Ticket Solved"
- Message: Varies based on recipient
- Metadata: Ticket number, vendor handle, solved by

### 4. Comment Added (`notifyCommentAdded`)

**Triggered**: When comment is added to ticket

**Who Gets Notified**:
- Ticket creator (if not the commenter)
- Ticket assignee (if not the commenter and not the creator)

**Deduplication**:
- Uses Set to prevent duplicate notifications

**Process**:
```
1. Check creator: if active and not commenter, add to set
2. Check assignee: if active and not commenter, add to set
3. Create notifications for all in set
```

**Notification Content**:
- Title: "New Comment on Ticket"
- Message: "[Name] commented on ticket: [Subject]"
- Metadata: Ticket number, vendor handle, comment author

### 5. Mentions (`notifyMentions`)

**Triggered**: When user is mentioned in comment

**Mention Format**:
- `@email@example.com` - Mention by email
- `@username` - Mention by name

**How Mentions Work**:
```
1. Extract mentions from comment using regex:
   /@([\w.+-]+@[\w.-]+\.\w+|[\w.+-]+)/g

2. Clean each mention (remove @)

3. For each mention:
   - Search all users
   - Find EXACT match on email or name (case-insensitive)
   - User must be active
   - Exclude commenter

4. Deduplicate mentioned users (Set)

5. Create notification for each unique user
```

**Notification Content**:
- Title: "You Were Mentioned"
- Message: "[Name] mentioned you in ticket: [Subject]"
- Metadata: Ticket number, vendor handle, mentioned by

### Notification Security

**Authentication**:
- `getCurrentUser()` uses `x-user-email` header
- No longer accepts client-provided user IDs
- Prevents user impersonation

**Actor Filtering**:
- Notifications never sent to the person who performed the action
- Prevents self-notifications
- Checked for all notification types

**Inactive User Filtering**:
- All notification functions check `user.isActive`
- Inactive users excluded from notifications
- Prevents notifications to deactivated accounts

### Viewing Notifications

**Notifications Page** (`/notifications`):

**Features**:
- List all notifications with newest first
- Unread count badge in header
- Mark as read by clicking
- Mark all as read button
- Click notification to go to ticket
- Shows relative timestamps ("2 hours ago")
- Real-time updates via React Query

**Notification Display**:
- Icon based on type
- Bold if unread
- Relative timestamp
- Quick link to ticket

---

## Vendor Management

### Vendors Page
**Location**: `/vendors`

**Purpose**: Manage vendor information and sync from BigQuery

### How Vendors Work

**1. Vendor Data Structure**:
```
- Handle: Unique vendor identifier
- Name: Vendor display name
- Email: Contact email
- Phone: Contact phone
- GMV Tier: L, M, S, XS (affects priority)
- Open Tickets Count: Current open tickets
- Total Tickets Count: All-time tickets
- Average Resolution Time: Performance metric
- Last Ticket Date: Most recent ticket
- Created/Updated timestamps
```

**2. BigQuery Sync**:

**Manual Sync**:
- Click "Sync from BigQuery" button
- Fetches vendor data from BigQuery table
- Updates existing vendors, creates new ones
- Shows sync progress and results

**Automated Sync**:
- Configurable schedule (hourly, daily, weekly)
- Runs in background
- Updates vendor metrics automatically
- Can be enabled/disabled

**3. Vendor Metrics Calculation**:

**Open Tickets Count**:
- Counts tickets with status: New, Open, Pending
- Where vendorHandle matches vendor

**Total Tickets Count**:
- All tickets for this vendor
- All statuses included

**Average Resolution Time**:
- Calculate time between created and solved
- Average across all solved tickets
- In hours

**Last Ticket Date**:
- Most recent ticket creation date for vendor

**4. Vendor Profile Page**:
**Location**: `/vendors/:handle`

**Shows**:
- Vendor details
- GMV tier badge
- Ticket statistics
- Recent tickets list
- Performance metrics
- Contact information

**Actions**:
- Create new ticket for vendor
- View all vendor tickets
- Edit vendor information

---

## Analytics & Reporting

### Dashboard
**Location**: `/dashboard`

**Purpose**: Real-time overview of ticket metrics and performance

### Dashboard Widgets

**1. Ticket Statistics Cards**:
- **Total Tickets**: All tickets in system
- **Open Tickets**: Tickets in Open status
- **Pending Tickets**: Tickets waiting for input
- **Solved Today**: Tickets solved in last 24 hours

**2. Ticket Status Distribution**:
- Pie chart showing tickets by status
- Colors: New, Open, Pending, Solved, Closed
- Percentages calculated in real-time

**3. Priority Distribution**:
- Bar chart showing tickets by priority
- Critical (P0), High (P1), Medium (P2), Low (P3)
- Color-coded for quick identification

**4. Department Workload**:
- Table showing tickets per department
- Open, Pending, Solved columns
- Total tickets per department
- Helps identify bottlenecks

**5. Recent Tickets**:
- List of 10 most recent tickets
- Shows ticket number, subject, status, priority
- Quick links to ticket details
- Real-time updates

**6. SLA Compliance**:
- Percentage of tickets meeting SLA
- Breakdown by on-track, at-risk, breached
- Visual indicators (green, yellow, red)

**7. Agent Performance**:
- Top agents by tickets solved
- Average resolution time per agent
- Current workload per agent

### Analytics Page
**Location**: `/analytics`

**Purpose**: Detailed reports and trends

**Features**:
- Custom date range selection
- Exportable reports (CSV, PDF)
- Trend graphs over time
- Department comparisons
- Category analysis
- Vendor performance reports

---

## Admin Tools

### Admin Tools Page
**Location**: `/admin-tools`

**Access**: Owner, Admin, Head, Manager only (requires `edit:config` permission)

### Ticket Number Migration Tool

**Purpose**: Migrate old ESC-XXXXXXX format tickets to new SS##### / CS##### format

**How It Works**:

1. **Click "Run Ticket Number Migration" button**

2. **Backend Process**:
```javascript
// Find all tickets with ESC- prefix
const oldTickets = tickets.filter(t => t.ticketNumber.startsWith("ESC-"));

// Sort by creation date (preserve order)
oldTickets.sort((a, b) => a.createdAt - b.createdAt);

// Separate by type
const sellerSupport = oldTickets.filter(t => t.vendorHandle);
const customerSupport = oldTickets.filter(t => !t.vendorHandle);

// Get current highest numbers
let ssCounter = maxSSNumber || 0;
let csCounter = maxCSNumber || 0;

// Migrate Seller Support tickets
for (const ticket of sellerSupport) {
  ssCounter++;
  const newNumber = `SS${String(ssCounter).padStart(5, '0')}`;
  await updateTicket(ticket.id, { ticketNumber: newNumber });
}

// Migrate Customer Support tickets
for (const ticket of customerSupport) {
  csCounter++;
  const newNumber = `CS${String(csCounter).padStart(5, '0')}`;
  await updateTicket(ticket.id, { ticketNumber: newNumber });
}
```

3. **Results Displayed**:
- Total tickets migrated
- Seller Support count
- Customer Support count
- Full list of old → new mappings

4. **Safety**:
- Idempotent (safe to run multiple times)
- Only affects ESC- tickets
- Preserves all other ticket data
- Transaction-safe updates

### System Information Panel

Shows current user details:
- Name and email
- Role
- Department
- Permission level

---

## BigQuery Integration

### Purpose
Fetch order and vendor data from BigQuery for enhanced ticket context

### How It Works

**1. Configuration**:
```
Environment Variables:
- BIGQUERY_PROJECT_ID: GCP project ID
- BIGQUERY_DATASET: Dataset name
- BIGQUERY_ORDERS_TABLE: Orders table name
- BIGQUERY_VENDORS_TABLE: Vendors table name
- GOOGLE_APPLICATION_CREDENTIALS: Service account key path
```

**2. Order Lookup**:

**Endpoint**: `GET /api/bigquery/orders/:orderIds`

**Process**:
```
1. Receive comma-separated order IDs
2. Query BigQuery:
   SELECT *
   FROM `project.dataset.orders`
   WHERE orderId IN (order1, order2, order3)

3. Return order details:
   - Order ID, date, status
   - Amount, currency
   - Customer name
   - Vendor handle
```

**Usage**:
- Ticket detail page shows order cards
- Expandable sections for each order
- Fetched on-demand when ticket has fleekOrderIds

**3. Vendor Sync**:

**Manual Sync**: `POST /api/bigquery/sync-vendors`

**Automated Sync**: Scheduled background job

**Process**:
```
1. Query BigQuery for all vendors
2. For each vendor:
   - Check if exists in database
   - If exists: Update vendor data
   - If new: Create vendor record
3. Update metrics:
   - Open tickets count
   - Total tickets count
   - Average resolution time
   - Last ticket date
4. Return sync summary
```

**4. Vendor Metrics Sync**:

**Endpoint**: `POST /api/bigquery/sync-vendor-metrics`

**Process**:
```
1. Get all vendors from database
2. For each vendor:
   - Count open tickets
   - Count total tickets
   - Calculate average resolution time
   - Find last ticket date
   - Update vendor record
3. Return updated count
```

**5. Error Handling**:
- Connection failures logged
- Timeouts handled gracefully
- Fallback to manual sync
- User-friendly error messages

---

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack React Query** for data fetching
- **Shadcn UI** components
- **Tailwind CSS** for styling
- **Vite** for build tooling

### Backend Stack
- **Express.js** server
- **PostgreSQL** database (Neon)
- **Drizzle ORM** for database access
- **Node.js** runtime
- **BigQuery** for data warehouse integration

### Database Schema

**Key Tables**:
- `users` - User accounts and permissions
- `tickets` - Ticket records with snapshots
- `comments` - Ticket comments
- `notifications` - User notifications
- `vendors` - Vendor information
- `categories` - Category hierarchy
- `category_routing_rules` - Routing configuration
- `tags` - Ticket tags
- `ticket_field_configurations` - Custom fields

### API Architecture

**Authentication**:
- `x-user-email` header for user identification
- Email looked up in database
- Session stored in localStorage

**Authorization**:
- Permission checks on protected endpoints
- `checkPermission()` helper function
- Role-based access control

**Data Flow**:
```
Frontend → API Request → Permission Check → Database Query → Response
                ↓
         Notification Trigger
                ↓
         Background Processing
```

### State Management

**React Query**:
- Query caching
- Automatic refetching
- Optimistic updates
- Invalidation strategies

**Local State**:
- Component-level state with useState
- Form state management
- Pending changes pattern

---

## Key Features Summary

✅ **Email-based authentication with role hierarchy**
✅ **Comprehensive ticket lifecycle management**
✅ **Hierarchical category system with snapshots**
✅ **Intelligent auto-routing and assignment**
✅ **Real-time notifications with mention support**
✅ **BigQuery integration for order data**
✅ **Vendor management with metrics**
✅ **Analytics dashboard with reports**
✅ **Advanced filtering and search**
✅ **Bulk operations support**
✅ **CSV import/export**
✅ **SLA tracking and compliance**
✅ **Custom fields per department**
✅ **Tag system for categorization**
✅ **Audit trail with snapshots**
✅ **Permission-based access control**
✅ **Responsive design for mobile**
✅ **Admin tools for maintenance**

---

## Performance Optimizations

1. **Database Queries**:
   - Indexed columns for fast lookups
   - Department-filtered user queries
   - Cached category hierarchies

2. **Frontend**:
   - React Query caching
   - Lazy loading of components
   - Debounced search inputs
   - Optimistic UI updates

3. **Notifications**:
   - Parallel notification creation (Promise.all)
   - Inactive user filtering at query level
   - Batched database operations

4. **BigQuery**:
   - On-demand order fetching
   - Cached vendor data
   - Scheduled background sync

---

## Security Features

🔒 **Authentication Security**:
- Server-side user lookup
- No client-side userId spoofing
- Active status checking

🔒 **Authorization**:
- Permission checks on all sensitive endpoints
- Role-based access control
- Custom permission overrides

🔒 **Data Validation**:
- Zod schemas for input validation
- Status transition validation
- Required field enforcement

🔒 **Notification Security**:
- Actor filtering (no self-notifications)
- Exact mention matching (no false positives)
- Inactive user exclusion

🔒 **Routing Security**:
- Unique active rule constraint
- Permission-protected endpoints
- Validation before database updates

---

## Future Enhancements (Not Yet Implemented)

- ⏳ Business hours SLA calculation
- ⏳ Attachment support for tickets
- ⏳ Email integration for ticket creation
- ⏳ SMS notifications
- ⏳ Mobile app
- ⏳ Advanced reporting with charts
- ⏳ Ticket templates
- ⏳ Canned responses
- ⏳ Knowledge base integration
- ⏳ Multi-language support

---

**Documentation Version**: 1.0
**Last Updated**: February 7, 2026
**Portal Version**: Production
