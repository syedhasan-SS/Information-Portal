# 🎯 Information Portal - Complete Guide

> **Welcome to the Fleek Information Portal!** This comprehensive guide covers everything you need to know about using and managing the portal.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Authentication & Users](#authentication--users)
- [Ticket Management](#ticket-management)
- [Categories & Configuration](#categories--configuration)
- [Routing & Auto-Assignment](#routing--auto-assignment)
- [Notifications](#notifications)
- [Vendor Management](#vendor-management)
- [Analytics & Reports](#analytics--reports)
- [Admin Tools](#admin-tools)

---

# 🚀 Getting Started

## What is the Information Portal?

The Information Portal is Fleek's internal ticketing system designed to:
- ✅ Coordinate team communication
- ✅ Track and resolve issues efficiently
- ✅ Avoid escalations on WhatsApp, Slack, and email
- ✅ Provide centralized ticket management
- ✅ Enable data-driven decision making

---

# 🔐 Authentication & Users

## Logging In

### How to Access the Portal

1. Navigate to the portal URL
2. Enter your **Fleek email address**
3. Click "Login"
4. You'll be redirected to the dashboard

> 💡 **Note**: No password required - authentication is email-based

---

## User Roles & Permissions

### Role Hierarchy (Highest to Lowest)

| Role | Access Level | Key Permissions |
|------|-------------|-----------------|
| 👑 **Owner** | Full System Access | Everything |
| 🔑 **Admin** | Administrative | Most permissions, system config |
| 📊 **Head** | Department Head | All department tickets, config |
| 👔 **Manager** | Team Management | Create/edit tickets, team view |
| 🎖️ **Lead** | Team Lead | Create/edit tickets |
| 👤 **Associate** | Standard User | Create/edit tickets |
| 🎧 **Agent** | Basic Access | View/update assigned tickets |

---

### What Each Role Can Do

<details>
<summary><strong>👑 Owner</strong></summary>

**Full Access To:**
- All tickets across departments
- User management (create, edit, delete)
- System configuration
- Routing rules
- Analytics and reports
- Admin tools

</details>

<details>
<summary><strong>🔑 Admin</strong></summary>

**Access To:**
- All tickets
- User management
- System configuration
- Routing rules
- Analytics
- Most admin functions

</details>

<details>
<summary><strong>📊 Head</strong></summary>

**Access To:**
- All department tickets
- Create/edit tickets
- View team performance
- Edit configuration
- Department analytics

</details>

<details>
<summary><strong>👔 Manager / 🎖️ Lead / 👤 Associate</strong></summary>

**Access To:**
- Create tickets
- Edit tickets
- View assigned tickets
- Comment on tickets
- Basic analytics

</details>

<details>
<summary><strong>🎧 Agent</strong></summary>

**Access To:**
- View assigned tickets
- Update ticket status
- Add comments
- Basic ticket actions

</details>

---

## Managing Users

### Creating a New User

**Location**: `/users` → Click "➕ Add User"

**Required Information**:
1. **Name**: Full name
2. **Email**: Fleek email address (must be unique)
3. **Role**: Select from dropdown
4. **Department**: User's department
5. **Sub-Department**: Optional
6. **Status**: Active or Inactive

**Optional**:
- Profile picture
- Custom permissions

> 💡 **Tip**: Start with the lowest required role and increase permissions as needed

---

### Editing Users

1. Go to **Users** page
2. Find the user (use search if needed)
3. Click **✏️ Edit** button
4. Update any fields
5. Click **Save**

**What You Can Change**:
- Name, email, role
- Department assignment
- Active/inactive status
- Custom permissions
- Profile picture

---

### Deactivating Users

> ⚠️ **Important**: Deactivating is preferred over deleting

**How to Deactivate**:
1. Edit the user
2. Toggle **Status** to "Inactive"
3. Save

**What Happens**:
- ✅ User data is preserved
- ✅ Can be reactivated later
- ✅ Stops receiving notifications
- ❌ Cannot log in

---

# 🎫 Ticket Management

## Understanding Tickets

### Ticket Types

| Type | When to Use | Example |
|------|-------------|---------|
| 🏪 **Seller Support** | Issues related to vendors | Payment disputes, account issues |
| 👥 **Customer Support** | Issues related to customers | Order problems, refunds |

---

## Ticket Lifecycle

### Ticket Statuses

```
🆕 New → 🔓 Open → ⏸️ Pending → ✅ Solved → 🔒 Closed
```

| Status | Description | Who Can Set |
|--------|-------------|-------------|
| 🆕 **New** | Just created, not assigned | System (on creation) |
| 🔓 **Open** | Being actively worked on | Assignee, Managers |
| ⏸️ **Pending** | Waiting for external input | Assignee, Managers |
| ✅ **Solved** | Issue resolved | Assignee, Managers |
| 🔒 **Closed** | Archived, no longer active | System, Managers |

---

### Valid Status Transitions

✅ **Allowed Transitions**:
- New → Open, Closed
- Open → Pending, Solved, Closed
- Pending → Open, Solved, Closed
- Solved → Closed, Open (reopen)
- Closed → Open (reopen only)

❌ **Not Allowed**:
- Closed → Pending
- New → Solved
- Pending → New

> 💡 **System Protection**: Invalid transitions are blocked automatically

---

## Creating a Ticket

### Step-by-Step Guide

**Location**: `/my-tickets` → **Create Ticket** tab

#### 1️⃣ Choose Ticket Type

**Seller Support:**
- Select when issue involves a vendor
- Requires vendor selection
- Ticket number starts with **SS**

**Customer Support:**
- Select for customer-related issues
- Requires customer name
- Ticket number starts with **CS**

---

#### 2️⃣ Fill Basic Information

| Field | Required | Description |
|-------|----------|-------------|
| **Vendor/Customer** | ✅ Yes | Searchable dropdown |
| **Issue Type** | ✅ Yes | Complaint, Request, or Information |
| **Category** | ✅ Yes | Hierarchical selection (L1 → L2 → L3 → L4) |
| **Subject** | ✅ Yes | Brief title (one line) |
| **Description** | ✅ Yes | Detailed explanation |
| **Fleek Order IDs** | ❌ Optional | Comma-separated (e.g., 12345, 67890) |

---

#### 3️⃣ Select Category

Categories are hierarchical:

```
📁 L1: Department (Finance, Operations, etc.)
  └─ 📁 L2: Sub Department
      └─ 📁 L3: Category
          └─ 📁 L4: Sub-Category (optional)
```

**Example Category Path**:
```
Complaint → Finance → Payment → Payment Not Processed
```

> 💡 **Tip**: Categories are filtered by Issue Type automatically

---

#### 4️⃣ Priority Calculation (Automatic)

Your ticket's priority is calculated automatically:

| Factor | Points | Description |
|--------|--------|-------------|
| **Vendor Volume** | +20 | Vendor has 5+ open tickets |
| **GMV Tier** | 0-30 | L (0), M (10), S (20), XS (30) |
| **Issue Priority** | Varies | From category configuration |

**Priority Tiers**:
- 🔴 **Critical (P0)**: 70+ points
- 🟠 **High (P1)**: 50-69 points
- 🟡 **Medium (P2)**: 30-49 points
- 🟢 **Low (P3)**: <30 points

---

#### 5️⃣ Auto-Routing (If Configured)

After creation, your ticket may be:
- ✅ **Routed** to the correct department automatically
- ✅ **Assigned** to an agent (based on routing rules)
- ✅ **Prioritized** with additional points
- ✅ **SLA applied** with target times

---

#### 6️⃣ Ticket Number Generated

**Format**:
- **SS00001**, **SS00002**, ... (Seller Support)
- **CS00001**, **CS00002**, ... (Customer Support)

Sequential numbers ensure easy tracking and reference.

---

## Viewing Your Tickets

### My Tickets Page

**Location**: `/my-tickets`

#### Three Main Sections:

**1️⃣ Tickets I Created**

View all tickets you created with sub-tabs:
- **All**: Every ticket you created
- **New**: Not yet assigned
- **Open**: Being worked on
- **Assigned**: Has an assignee
- **Solved**: Resolved tickets

---

**2️⃣ Assigned to Me**

Tickets where **you** are the assignee:
- Only shows actionable tickets
- Excludes solved/closed
- Your current workload

---

**3️⃣ Solved Tickets**

All tickets that are:
- ✅ Marked as Solved
- 📌 You created OR were assigned to
- 📦 Archived separately from active work

---

## Editing Tickets

### What You Can Edit

**Location**: Click any ticket → Ticket Detail page

#### Editable Fields:

| Field | How to Edit | Notes |
|-------|-------------|-------|
| **Category** | Dropdown | Triggers routing rules |
| **Priority** | Dropdown | Critical, High, Medium, Low |
| **Department** | Dropdown | 8 departments available |
| **Issue Type** | Dropdown | Complaint, Request, Information |
| **Status** | Dropdown | Must follow valid transitions |
| **Assignee** | Dropdown | Active team members |
| **Tags** | Add/Remove | Click X to remove, type to add |

---

### How to Save Changes

**Pending Changes Pattern**:

1. Make your changes (fields turn yellow)
2. Click **💾 Save Changes** button (appears when changes exist)
3. Review confirmation dialog
4. Click **Confirm**
5. ✅ All changes applied at once

> 💡 **Smart Feature**: Changes aren't applied until you confirm, so you can review first

---

## Working with Comments

### Adding Comments

1. Go to ticket detail page
2. Scroll to **Comments** section
3. Type your comment in the text box
4. Click **💬 Send**

**Comment Features**:
- ✅ Timestamps on all comments
- ✅ Author name displayed
- ✅ Mention support (@username)
- ✅ Internal or Zendesk visibility

---

### Mentioning Users

**How to Mention**:
- Type `@` followed by email or name
- Example: `@john.doe@fleek.com` or `@john`

**What Happens**:
- 🔔 Mentioned user receives notification
- 📧 Email notification sent (if enabled)
- 🔗 Direct link to ticket in notification

---

### Comment Visibility

| Visibility | Who Can See |
|------------|-------------|
| **Internal** | Only Fleek team members |
| **Zendesk** | Customers can see (if integrated) |

> ⚠️ **Be Careful**: Choose visibility based on comment sensitivity

---

## Fleek Order Integration

### Viewing Order Details

**When a ticket has Order IDs**:

1. Order data automatically fetched from BigQuery
2. Displayed in expandable cards
3. Click to expand and see:
   - 📦 Order ID and date
   - 💰 Amount and currency
   - 👤 Customer name
   - 🏪 Vendor handle
   - 📊 Order status

**Example**:
```
Ticket has Order IDs: 12345, 67890

💳 Order #12345
   Date: Jan 15, 2024
   Amount: $150.00 USD
   Customer: John Doe
   Status: Completed
```

---

# ⚙️ Categories & Configuration

## Ticket Manager

**Location**: `/ticket-config`

**Purpose**: Configure how tickets are categorized and processed

---

## Understanding Category Hierarchy

### Four Levels of Categories

```
L1 (Department)
  ├─ L2 (Sub Department)
  │   ├─ L3 (Category)
  │   │   └─ L4 (Sub-Category) [Optional]
```

**Real Example**:
```
📁 Finance (L1)
  └─ 💰 Payment (L2)
      └─ ❌ Payment Issues (L3)
          └─ ⏱️ Payment Delayed (L4)
```

---

## Creating Categories

### Using the Category Wizard

**Location**: Ticket Manager → **➕ Add Category**

#### Step 1: Issue Type
- **Complaint**: Problem or issue
- **Request**: Need help with something
- **Information**: Just need information

#### Step 2: L1 - Department
- Finance, Operations, Marketplace, Tech, etc.
- Select the main department

#### Step 3: L2 - Sub Department
- More specific department area
- Example: Under Operations → Fulfillment

#### Step 4: L3 & L4 - Category Details
- **L3**: Specific category (required)
- **L4**: Sub-category (optional)
- Add description
- Configure SLA times

---

## Category Configuration

### SLA Settings

**SLA = Service Level Agreement** (Response & Resolution Targets)

| Setting | Description | Example |
|---------|-------------|---------|
| **Response Time** | Hours to first response | 4 hours |
| **Resolution Time** | Hours to solve ticket | 24 hours |
| **Business Hours** | Use working hours only | 9 AM - 5 PM |

**Example SLA**:
```
Critical Issue:
  Response: 1 hour
  Resolution: 4 hours

Low Priority:
  Response: 8 hours
  Resolution: 72 hours
```

---

## Filtering Categories

### Available Filters

**Location**: Ticket Manager → Filter bar

| Filter | Options | Use When |
|--------|---------|----------|
| **Search** | Free text | Finding specific category |
| **Request Type** | All, Complaint, Request, Information | Filter by type |
| **Status** | All, Active, Inactive | Show enabled/disabled |
| **SLA** | All, With Response, Resolution Only | By SLA config |
| **Dept** | Dropdown of L1 values | By department |

**Example Query**:
```
Search: "payment"
Request Type: Complaint
Status: Active
Dept: Finance

→ Shows all active payment complaints in Finance
```

---

## Bulk Operations

### Managing Multiple Categories

**How to Use**:

1. ✅ Check boxes next to categories
2. **Actions appear** at top
3. Choose action:
   - ✅ **Activate Selected**
   - ⏸️ **Deactivate Selected**
   - 🗑️ **Delete Selected**

> ⚠️ **Warning**: Deactivated categories won't show in ticket creation dropdown

---

## CSV Import/Export

### Download Template

**Location**: Actions → **📥 Download Template**

**What You Get**:
- CSV file with correct headers
- Example rows
- Format guide

---

### Export Categories

**Location**: Actions → **📤 Export CSV**

**What's Exported**:
- All **currently filtered** categories
- Issue Type, L1, L2, L3, L4
- Description, Active status
- SLA settings

**Use Cases**:
- Backup configuration
- Share with team
- Edit in spreadsheet
- Import to another system

---

### Upload Categories

**Location**: Actions → **📤 Upload CSV**

**Process**:
1. Prepare CSV file (use template)
2. Click Upload CSV
3. Select file
4. Review preview
5. Confirm import

**What Happens**:
- ✅ New categories created
- ✅ Existing categories updated
- ✅ Validation errors shown
- ❌ Invalid rows skipped

---

## Tags System

### What Are Tags?

**Tags** = Labels you can add to tickets for:
- 🔍 Better searching
- 📊 Reporting and analytics
- 🎨 Visual organization
- 🔄 Automated workflows

---

### Creating Tags

**Location**: Ticket Manager → **Tags** tab

**Tag Configuration**:
- **Name**: Tag display name
- **Color**: Visual identifier (hex code)
- **Department**: Seller Support, Customer Support, or All
- **Auto-Apply**: Automatically add to tickets
- **Active Status**: Enable/disable

**Example Tags**:
```
🔴 Urgent           (Red, All Departments)
💰 Payment Issue    (Green, Finance)
📦 Shipping Delay   (Blue, Operations)
⭐ VIP Customer     (Gold, Customer Support)
```

---

### Using Tags on Tickets

**Adding Tags**:
1. Go to ticket detail
2. Find **Tags** field
3. Type tag name
4. Press Enter
5. ✅ Tag added

**Removing Tags**:
- Click **X** button on tag

---

## Custom Fields

### What Are Custom Fields?

**Custom Fields** = Additional form fields specific to your department

**Available Types**:
- 📝 Text (single line)
- 🔢 Number
- 📅 Date
- 📋 Dropdown (select one)
- ☑️ Multi-select (select multiple)
- ✅ Checkbox (yes/no)
- 📄 Textarea (multiple lines)

---

### Creating Custom Fields

**Location**: Ticket Manager → **Custom Fields** tab

**Configuration**:
1. **Field Name**: Internal identifier
2. **Label**: What users see
3. **Type**: Choose from list
4. **Required**: Make it mandatory
5. **Help Text**: Instructions for users
6. **Options**: For dropdowns (comma-separated)
7. **Department**: Which ticket type
8. **Display Order**: Position in form

**Example Custom Field**:
```
Field Name: shipping_carrier
Label: Shipping Carrier
Type: Select
Options: UPS, FedEx, DHL, USPS
Required: Yes
Department: Operations
Help Text: Select the carrier used for shipment
```

---

# 🔄 Routing & Auto-Assignment

## What is Routing?

**Routing** = Automatically sending tickets to the right department and agent

**Benefits**:
- ⚡ Faster response times
- 🎯 Correct team handles ticket
- ⚖️ Balanced workload
- 🤖 Reduced manual work

---

## Routing Rules

**Location**: Actions → **Routing Rules** (or `/routing-config`)

---

### Creating a Routing Rule

#### Step 1: Select Category

Choose which category triggers this rule:
```
Example: Complaint → Finance → Payment → Payment Not Processed
```

---

#### Step 2: Target Department

Where should tickets be routed?

**Options**:
- Finance
- Operations
- Marketplace
- Tech
- Supply
- Growth
- Experience
- CX

---

#### Step 3: Auto-Assignment (Optional)

**Enable**: Toggle "Auto-Assign"

**Choose Strategy**:

**1️⃣ Round-Robin**
```
Rotates through agents in order:
  Ticket 1 → Agent A
  Ticket 2 → Agent B
  Ticket 3 → Agent C
  Ticket 4 → Agent A
  ...
```
- ✅ Fair distribution
- ✅ Predictable
- ✅ Good for equal skill levels

---

**2️⃣ Least-Loaded**
```
Assigns to agent with fewest open tickets:
  Agent A: 3 tickets
  Agent B: 1 ticket ← Assigned
  Agent C: 5 tickets
```
- ✅ Balances workload dynamically
- ✅ Handles absences well
- ✅ Prevents overload

---

**3️⃣ Specific Agent**
```
Always assigns to the same agent:
  All payment tickets → Sarah (Payment Specialist)
```
- ✅ Subject matter expert
- ✅ Consistent handling
- ❌ Can create bottleneck

---

#### Step 4: Priority Boost (Optional)

**Add points** to priority score:
```
Category default: 30 points (Medium)
Priority boost: +20 points
Final score: 50 points (High)
```

**Use When**:
- Category is always urgent
- Needs faster SLA
- High impact issues

---

#### Step 5: SLA Override (Optional)

**Override default SLA times**:

```
Default SLA:
  Response: 8 hours
  Resolution: 48 hours

Override to:
  Response: 2 hours
  Resolution: 12 hours
```

**Use When**:
- Category needs faster response
- Critical business process
- VIP customers

---

### Managing Routing Rules

**View Rules**:
- See all configured rules
- Filter by department
- Check active/inactive status

**Edit Rules**:
1. Click **✏️ Edit** on rule
2. Modify settings
3. Save changes

**Deactivate Rules**:
- Toggle **Active** switch off
- Rule stops applying
- Can be reactivated later

**Delete Rules**:
- Click **🗑️ Delete**
- Confirm deletion
- Existing tickets unaffected

---

### When Routing Happens

**1️⃣ Ticket Creation**:
```
User creates ticket
  ↓
System checks category
  ↓
Finds matching routing rule
  ↓
Applies department + assignment
  ↓
Ticket ready!
```

**2️⃣ Category Change**:
```
Agent changes ticket category
  ↓
System checks new category
  ↓
Finds routing rule
  ↓
Re-routes to new department
  ↓
(Note: Doesn't re-assign agent)
```

---

## Routing Best Practices

### ✅ Do's

- ✅ Create rules for common categories
- ✅ Use least-loaded for equal-skilled teams
- ✅ Use specific agent for specialists
- ✅ Test rules before activating
- ✅ Review and adjust based on metrics

### ❌ Don'ts

- ❌ Create too many rules (keep it simple)
- ❌ Override SLA too aggressively
- ❌ Assign to inactive users
- ❌ Create conflicting rules
- ❌ Forget to deactivate old rules

---

# 🔔 Notifications

## Understanding Notifications

**Notifications** = Real-time alerts when something happens with tickets

**Where You See Them**:
- 🔴 Badge on bell icon (header)
- 📄 Notifications page (`/notifications`)
- 📧 Email (if configured)

---

## Notification Types

### 1️⃣ Ticket Created

**When**: New ticket created in your department

**You Get Notified If**:
- ✅ You're in the ticket's department
- ✅ You're active
- ❌ You're NOT the creator

**Example**:
```
🆕 New Ticket Created
A new High priority ticket has been created:
Payment not processed for Order #12345

Ticket: SS00123
```

---

### 2️⃣ Ticket Assigned

**When**: Ticket assigned to you

**You Get Notified If**:
- ✅ You're the assignee
- ✅ You're active

**Example**:
```
✋ Ticket Assigned to You
You have been assigned ticket:
Refund request for cancelled order

Ticket: CS00456
Assigned by: John Manager
```

---

### 3️⃣ Ticket Solved

**When**: Ticket marked as Solved

**You Get Notified If**:
- ✅ You created the ticket OR
- ✅ You're assigned to the ticket
- ❌ You're NOT the solver

**Example**:
```
✅ Ticket Solved
Your ticket has been solved:
Payment issue with vendor account

Ticket: SS00789
Solved by: Sarah Agent
```

---

### 4️⃣ Comment Added

**When**: Someone comments on a ticket

**You Get Notified If**:
- ✅ You created the ticket OR
- ✅ You're assigned to the ticket
- ❌ You're NOT the commenter

**Example**:
```
💬 New Comment on Ticket
John Doe commented on ticket:
Unable to process refund

Ticket: CS00321
```

---

### 5️⃣ Mention in Comment

**When**: Someone mentions you in a comment

**How to Mention**:
- Type `@john.doe@fleek.com` or `@john`

**You Get Notified If**:
- ✅ You're mentioned
- ✅ You're active
- ❌ You're NOT the commenter

**Example**:
```
@️⃣ You Were Mentioned
Sarah Agent mentioned you in ticket:
Need approval for bulk refund

Ticket: SS00555
```

---

## Managing Notifications

### Viewing Notifications

**Location**: Click 🔔 bell icon (header) or go to `/notifications`

**What You See**:
- All notifications (newest first)
- **Bold** = Unread
- Gray = Read
- Relative time ("2 hours ago")

---

### Marking as Read

**Single Notification**:
- Click on the notification
- Automatically marked as read
- Takes you to the ticket

**All Notifications**:
- Click "Mark All as Read" button
- Clears unread count

---

### Notification Settings

> 🚧 **Coming Soon**: Email notifications, push notifications, notification preferences

---

# 🏪 Vendor Management

## Vendors Page

**Location**: `/vendors`

**Purpose**: Manage vendor information and track vendor-related tickets

---

## Viewing Vendors

**Vendor List Shows**:
- Vendor handle (unique ID)
- Vendor name
- GMV tier (L, M, S, XS)
- Open tickets count
- Total tickets count
- Average resolution time
- Last ticket date

**Sorting**:
- Click column headers to sort
- Default: Alphabetical by name

**Searching**:
- Type in search box
- Searches handle and name

---

## Vendor Profile

**Location**: Click any vendor → Vendor profile page

**Information Displayed**:

**1️⃣ Vendor Details**
- Name and handle
- Contact email
- Contact phone
- GMV tier badge

**2️⃣ Ticket Statistics**
- Open tickets count
- Total tickets (all-time)
- Average resolution time
- Last ticket date

**3️⃣ Recent Tickets**
- List of recent tickets
- Status and priority
- Quick links to tickets

**4️⃣ Performance Metrics**
- Resolution time trend
- Ticket volume over time
- SLA compliance rate

---

## Creating Tickets for Vendors

**From Vendor Profile**:
1. Click **➕ Create Ticket** button
2. Form pre-filled with vendor
3. Complete other fields
4. Submit

**Benefits**:
- Vendor already selected
- Faster ticket creation
- Context preserved

---

## BigQuery Sync

### What Gets Synced?

**Vendor Data**:
- Handle and name
- Contact information
- GMV tier
- Business metrics

**Ticket Metrics**:
- Open tickets count
- Total tickets
- Average resolution time
- Last ticket date

---

### Manual Sync

**Location**: Vendors page → **🔄 Sync from BigQuery** button

**Process**:
```
1. Click Sync button
2. System queries BigQuery
3. Updates existing vendors
4. Creates new vendors
5. Shows sync summary
```

**When to Use**:
- New vendors added in BigQuery
- Data looks outdated
- After bulk vendor changes

---

### Automated Sync

**How It Works**:
- Runs on schedule (configurable)
- Background process
- No user action needed
- Keeps data fresh

**Schedule Options**:
- Hourly
- Daily
- Weekly

> 💡 **Recommended**: Daily sync during off-peak hours

---

# 📊 Analytics & Reports

## Dashboard

**Location**: `/dashboard`

**Purpose**: Real-time overview of ticket performance

---

## Dashboard Widgets

### 1️⃣ Ticket Statistics

**Four Key Metrics**:

```
┌────────────────┐ ┌────────────────┐
│ Total Tickets  │ │ Open Tickets   │
│     1,234      │ │      156       │
└────────────────┘ └────────────────┘

┌────────────────┐ ┌────────────────┐
│Pending Tickets │ │ Solved Today   │
│      42        │ │       28       │
└────────────────┘ └────────────────┘
```

---

### 2️⃣ Status Distribution

**Pie Chart** showing:
- 🆕 New tickets
- 🔓 Open tickets
- ⏸️ Pending tickets
- ✅ Solved tickets
- 🔒 Closed tickets

**Percentages** calculated in real-time

---

### 3️⃣ Priority Distribution

**Bar Chart** showing:
- 🔴 Critical (P0)
- 🟠 High (P1)
- 🟡 Medium (P2)
- 🟢 Low (P3)

**Helps Identify**:
- Current workload severity
- Priority trends
- Urgent issues

---

### 4️⃣ Department Workload

**Table View**:

| Department | Open | Pending | Solved | Total |
|------------|------|---------|--------|-------|
| Finance | 23 | 5 | 45 | 73 |
| Operations | 18 | 8 | 32 | 58 |
| Tech | 12 | 3 | 28 | 43 |

**Use For**:
- Identifying bottlenecks
- Resource allocation
- Team performance

---

### 5️⃣ Recent Tickets

**List of 10 Most Recent**:
- Ticket number
- Subject
- Status badge
- Priority badge
- Quick link to ticket

**Auto-Refreshes**: Every 30 seconds

---

### 6️⃣ SLA Compliance

**Three Categories**:
- ✅ **On Track**: Meeting SLA targets
- ⚠️ **At Risk**: Approaching deadline
- ❌ **Breached**: Missed SLA target

**Percentage Compliance**:
```
SLA Compliance: 87.5%
  On Track: 140 tickets
  At Risk: 20 tickets
  Breached: 15 tickets
```

---

### 7️⃣ Agent Performance

**Leaderboard**:
- Top agents by tickets solved
- Average resolution time
- Current workload

**Use For**:
- Recognizing top performers
- Identifying training needs
- Load balancing

---

## Analytics Page

**Location**: `/analytics`

**Purpose**: Detailed reports and trend analysis

---

### Available Reports

**1️⃣ Ticket Trends**
- Volume over time
- Status changes
- Priority distribution
- Department comparison

**2️⃣ Category Analysis**
- Most common categories
- Resolution time by category
- SLA compliance by category

**3️⃣ Vendor Performance**
- Tickets per vendor
- Resolution time
- Repeat issues

**4️⃣ Agent Reports**
- Individual performance
- Team comparisons
- Workload distribution

**5️⃣ SLA Reports**
- Compliance rates
- Breach analysis
- Response time trends

---

### Exporting Reports

**Formats Available**:
- 📊 CSV (spreadsheet)
- 📄 PDF (document)
- 📈 Excel (with charts)

**How to Export**:
1. Configure report filters
2. Click **Export** button
3. Choose format
4. Download file

---

# 🛠️ Admin Tools

## Admin Tools Page

**Location**: Actions → **Admin Tools** (or `/admin-tools`)

**Access**: Owner, Admin, Head, Manager only

**Purpose**: System maintenance and utilities

---

## Ticket Number Migration

### What It Does

**Converts old ticket numbers**:
```
Old Format: ESC-MLB1MFAG, ESC-MLB1BS5F
New Format: SS00001, CS00002
```

---

### When to Use

**Use Migration If**:
- ✅ Old tickets with ESC- prefix exist
- ✅ Ticket numbering was just updated
- ✅ After importing legacy tickets

**Safe to Run**:
- ✅ Multiple times (idempotent)
- ✅ During business hours
- ✅ No downtime required

---

### Running Migration

**Step-by-Step**:

1. Go to **Admin Tools**
2. Find **Ticket Number Migration** card
3. Read the description
4. Click **🔄 Run Ticket Number Migration**
5. Wait for completion (2-10 seconds)
6. Review results

---

### Migration Results

**What You'll See**:

```
✅ Ticket numbers migrated successfully

Total migrated: 2
Seller Support tickets: 2
Customer Support tickets: 0

Migrations:
  ESC-MLB1MFAG → SS00001
  ESC-MLB1BS5F → SS00002
```

**If No Tickets to Migrate**:
```
✅ All tickets are already using the new format.
No migration needed.
```

---

### How It Works Behind the Scenes

```
1. Find all tickets with ESC- prefix
2. Sort by creation date (oldest first)
3. Separate by type:
   - Has vendor → Seller Support
   - No vendor → Customer Support
4. Get current highest numbers (SS, CS)
5. Assign new sequential numbers
6. Update database
7. Return summary
```

---

## System Information

**Displays**:
- Your name and email
- Your role
- Your department
- System permissions

**Use For**:
- Confirming access level
- Troubleshooting permissions
- Verifying account details

---

# 📚 Tips & Best Practices

## General Tips

### ✅ Do's

1. **Use descriptive subject lines**
   - Good: "Payment delay for Order #12345"
   - Bad: "Issue"

2. **Add detailed descriptions**
   - Include steps to reproduce
   - Add relevant order IDs
   - Mention urgency if needed

3. **Select correct category**
   - Helps with routing
   - Improves analytics
   - Faster resolution

4. **Keep tickets updated**
   - Add comments with progress
   - Update status as you work
   - Close when fully resolved

5. **Use mentions wisely**
   - Tag specific people when needed
   - Don't over-mention
   - Be respectful

---

### ❌ Don'ts

1. **Don't create duplicate tickets**
   - Search first
   - Update existing if found

2. **Don't leave tickets in limbo**
   - Update status regularly
   - Close resolved tickets
   - Reopen if issue returns

3. **Don't skip required fields**
   - All required info helps
   - Speeds up resolution
   - Improves data quality

4. **Don't abuse priority**
   - System calculates it
   - Trust the algorithm
   - Escalate only if truly urgent

---

## Keyboard Shortcuts

> 🚧 **Coming Soon**: Keyboard shortcuts for faster navigation

---

## Mobile Access

**Current Status**:
- ✅ Responsive design
- ✅ Works on mobile browsers
- ⏳ Native app coming soon

**Best Experience**:
- Use Chrome or Safari
- Landscape mode for forms
- Portrait for reading

---

# 🆘 Troubleshooting

## Common Issues

### Can't Log In

**Problem**: Email not recognized

**Solutions**:
1. Check email spelling
2. Verify you have an account (ask admin)
3. Ensure account is active
4. Try different browser
5. Clear cache and cookies

---

### Can't See a Ticket

**Problem**: Ticket doesn't appear in list

**Check**:
- ✅ Are you using correct filters?
- ✅ Is the ticket assigned to you?
- ✅ Do you have permission to view?
- ✅ Is ticket status excluded from view?

**Try**:
- Clear all filters
- Check "All Tickets" section
- Search by ticket number

---

### Category Not Showing

**Problem**: Expected category missing in dropdown

**Reasons**:
- ❌ Category is inactive
- ❌ Category doesn't match Issue Type
- ❌ Department filter excluding it

**Solution**:
- Verify category is active (Ticket Manager)
- Check Issue Type matches
- Review category configuration

---

### Routing Not Working

**Problem**: Tickets not auto-routing

**Check**:
1. Does routing rule exist for category?
2. Is routing rule active?
3. Is target department correct?
4. Are agents available in department?

**Debug**:
- Go to Routing Config
- Find category rule
- Verify all settings
- Test with new ticket

---

### Not Receiving Notifications

**Problem**: Missing notification alerts

**Check**:
- ✅ Is your account active?
- ✅ Are you part of the ticket?
- ✅ Did YOU perform the action?
- ✅ Check notification page directly

**Note**: You don't get notifications for your own actions

---

## Getting Help

### Internal Support

**Contact**:
- Slack: #information-portal
- Email: portal-support@fleek.com
- Admin users: [Owner/Admin names]

**Before Contacting**:
- Note ticket number
- Screenshot the issue
- Describe what you tried
- Mention your role/department

---

### Feature Requests

**How to Request**:
1. Check if feature exists (read this guide)
2. Ask in Slack first
3. Submit formal request to admin
4. Provide use case and priority

**What to Include**:
- Clear description
- Why it's needed
- Who would benefit
- Example scenario

---

# 🎓 Training Resources

## New User Onboarding

**Recommended Path**:

**Week 1**: Basics
- ✅ Read "Getting Started"
- ✅ Read "Ticket Management"
- ✅ Create your first ticket
- ✅ Practice commenting

**Week 2**: Advanced
- ✅ Learn about categories
- ✅ Understand routing
- ✅ Explore notifications
- ✅ Review analytics

**Week 3**: Mastery
- ✅ Create custom fields (if Manager+)
- ✅ Set up routing rules (if Manager+)
- ✅ Generate reports
- ✅ Train team members

---

## Video Tutorials

> 🚧 **Coming Soon**: Video walkthroughs for common tasks

---

## Changelog

**Latest Updates**:

**v1.0 (Feb 2026)**:
- ✅ Initial release
- ✅ Ticket management system
- ✅ Category hierarchy
- ✅ Routing rules
- ✅ Auto-assignment
- ✅ Notifications
- ✅ Vendor management
- ✅ Analytics dashboard
- ✅ Admin tools

---

# 📞 Contact & Support

## Support Channels

**For Issues**:
- 🔧 Slack: #information-portal-support
- 📧 Email: portal-support@fleek.com
- 📱 On-call: [Emergency contact]

**For Training**:
- 📚 This guide
- 🎥 Video tutorials (coming soon)
- 👥 Team leads

**For Feature Requests**:
- 💡 Slack: #information-portal-ideas
- 📝 Form: [Feature request form]

---

## Admin Contacts

**System Administrators**:
- [Admin Name 1] - admin1@fleek.com
- [Admin Name 2] - admin2@fleek.com

**Department Heads**:
- Finance: [Name]
- Operations: [Name]
- Tech: [Name]
- [Other departments...]

---

# 🎉 Conclusion

## You're Ready!

You now have all the knowledge to:
- ✅ Create and manage tickets
- ✅ Configure categories and routing
- ✅ Use notifications effectively
- ✅ Generate reports and analytics
- ✅ Administer the system
- ✅ Help your team members

---

## Key Takeaways

1. **Tickets are the core** - Everything revolves around tickets
2. **Categories matter** - Proper categorization enables automation
3. **Routing saves time** - Auto-routing reduces manual work
4. **Notifications keep you informed** - Stay on top of your work
5. **Analytics drive improvement** - Use data to optimize

---

## Keep Learning

**This guide is living documentation**:
- Updated regularly
- New features added
- Best practices refined
- Your feedback incorporated

**Contribute**:
- Share tips and tricks
- Report unclear sections
- Suggest improvements
- Help others learn

---

## Final Note

> 💙 **Thank you for using the Information Portal!**
>
> This system was built to help Fleek teams coordinate better, resolve issues faster, and avoid escalation chaos. Your success is our success!
>
> If you have questions, ideas, or just want to say hi - reach out anytime!

---

**Document Version**: 1.0 (Notion Format)
**Last Updated**: February 7, 2026
**Maintained By**: Fleek Portal Team
