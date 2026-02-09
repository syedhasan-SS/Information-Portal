# 🗺️ Attendance Module - Navigation Guide

## 📍 Entry Points

### From Dashboard
```
Dashboard → Click "Attendance" in Nav Bar → Attendance Reports Page
```

### From Anywhere
```
Any Page → Navigation Bar → "Attendance" Button → Attendance Reports Page
```

---

## 📊 Page Structure & Navigation

### 1️⃣ **Attendance Reports** (Main Hub)
**URL**: `/attendance`

**What You See:**
```
┌─────────────────────────────────────────────────────────┐
│  [Back to Dashboard]        Attendance Reports          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quick Action Cards (4 large buttons):                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐│
│  │ CHECK IN    │ │  MY         │ │  TEAM       │ │LEAVE││
│  │   /OUT      │ │ REPORTS     │ │  STATUS     │ │REQ  ││
│  │  (Blue)     │ │ (Current)   │ │ (Managers)  │ │     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────┘│
│                                                          │
│  Analytics Cards (Managers Only):                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │Total │ │ Late │ │Miss  │ │ Avg  │                  │
│  │Sess  │ │Login │ │Logout│ │Hours │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘                  │
│                                                          │
│  Filters:                                                │
│  [User Dropdown] [Start Date] [End Date] [Status]       │
│  [Export CSV Button]                                     │
│                                                          │
│  Attendance History Table:                              │
│  User | Department | Login | Logout | Duration | Status│
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                          │
│  By-User Analytics Table (Managers Only)                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Navigation Options:**
- **Blue "Check In/Out" card** → Goes to Check-In Page
- **"My Reports" card** → Stays on current page (Reports)
- **"Team Status" card** (Managers only) → Goes to Team Status Page
- **"Leave Requests" card** → Goes to Leave Management Page
- **Back button** → Returns to Dashboard

---

### 2️⃣ **Check-In / Check-Out Page**
**URL**: `/attendance/checkin`

**What You See:**
```
┌─────────────────────────────────────────────────────────┐
│  [Back] Attendance [Reports]                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Greeting Card (Gradient Blue to Purple):               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Good Morning, John Doe                      12:45│  │
│  │  Manager                            February 8, 2026│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Status Card:                                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ● You're Checked In                             │  │
│  │                                                   │  │
│  │           08:45:23                                │  │
│  │     (Live Timer Running)                          │  │
│  │                                                   │  │
│  │  Started at 09:00 AM                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Map Card (Location Visualization):                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │          📍 Your Current Location                 │  │
│  │                                                   │  │
│  │       Lat: 37.7749, Long: -122.4194              │  │
│  │       Accuracy: ±10m                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Action Buttons:                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         [START BREAK]  (White Button)            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         [CHECK OUT]  (Red Button, Large)         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Info Card:                                              │
│  ℹ️ Location Tracking                                   │
│  Your location is captured at check-in and check-out    │
│                                                          │
│  Quick Actions (2 Buttons):                             │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │  📅 MY      │  │  ⏱️ TEAM    │                      │
│  │  REPORTS    │  │  STATUS     │                      │
│  └─────────────┘  └─────────────┘                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**States:**

**Not Checked In:**
- Shows: Gray status card "Not Checked In"
- Shows: Large blue "CHECK IN" button
- Hides: Break button, Check Out button

**Checked In:**
- Shows: Green status card with live timer
- Shows: White "START BREAK" button
- Shows: Red "CHECK OUT" button
- Timer updates every second

**On Break:**
- Shows: Amber break status card with duration
- Shows: "END BREAK" button
- Check Out button is disabled (must end break first)

**Navigation Options:**
- **Back button** (top left) → Returns to Dashboard
- **Reports button** (top right) → Goes to Reports Page
- **"My Reports" card** (bottom) → Goes to Reports Page
- **"Team Status" card** (bottom) → Goes to Team Status Page

---

### 3️⃣ **Team Attendance (Real-Time Status)**
**URL**: `/attendance/team`

**What You See:**
```
┌─────────────────────────────────────────────────────────┐
│  [Back]  Team Attendance  [Live]                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Summary Cards:                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │Total │ │Logged│ │  On  │ │Logged│                  │
│  │Team  │ │  In  │ │Break │ │ Out  │                  │
│  │  15  │ │  12  │ │  2   │ │  1   │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘                  │
│                                                          │
│  Team Members (Updates every 5 seconds):                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 John Doe                      [✓ Active]    │    │
│  │    john@company.com                             │    │
│  │    [CX] [Agent]                                │    │
│  │                          Login: 09:00 AM       │    │
│  │                          Duration: 8h 45m      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 Jane Smith                    [☕ On Break] │    │
│  │    jane@company.com                             │    │
│  │    [Sales] [Manager]                           │    │
│  │                          Login: 08:30 AM       │    │
│  │                          Duration: 9h 15m      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 👤 Bob Wilson                    [✗ Logged Out]│    │
│  │    bob@company.com                              │    │
│  │    [Tech] [Lead]                               │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ...and more team members...                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Access Control:**
- **Agents**: Access denied (shows error message)
- **Managers**: See department team only
- **Admins**: See entire organization

**Visual Indicators:**
- **Green ring** around avatar = Logged in
- **Gray ring** around avatar = Logged out
- **Green badge** = Active
- **Amber badge** = On Break
- **Gray badge** = Logged Out
- **"Live" badge** in header (pulse animation)
- **Auto-refresh**: Every 5 seconds

**Navigation Options:**
- **Back button** → Returns to Reports Page

---

### 4️⃣ **Leave Management**
**URL**: `/leave-management`

**What You See:**
```
┌─────────────────────────────────────────────────────────┐
│  [Back]  Leave Management  [+ New Request]              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Summary Cards:                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │Total │ │Approv│ │Pendin│ │Reject│                  │
│  │Req   │ │ -ed  │ │  -g  │ │ -ed  │                  │
│  │  8   │ │  5   │ │  2   │ │  1   │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘                  │
│                                                          │
│  Leave Requests Table:                                  │
│  Employee│Start│End│Days│Type│Reason│Status│Actions    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  John    │2/10 │2/12│ 3  │Sick│...   │[✓ Approved]│   │
│  Jane    │2/15 │2/20│ 6  │Annu│...   │[⏱ Pending] │▶▶│
│  Bob     │2/8  │2/9 │ 2  │Pers│...   │[✗ Rejected]│   │
│                                                          │
│  For Managers - Actions Column:                         │
│  [Approve] [Reject] buttons for pending requests        │
│                                                          │
└─────────────────────────────────────────────────────────┘

When clicking "+ New Request", dialog opens:
┌─────────────────────────────────────┐
│  Submit Leave Request               │
├─────────────────────────────────────┤
│                                      │
│  Start Date: [2026-02-10]           │
│  End Date:   [2026-02-12]           │
│                                      │
│  Leave Type: [Sick Leave ▼]         │
│                                      │
│  Reason:                             │
│  ┌───────────────────────────────┐  │
│  │ Flu symptoms, doctor advised │  │
│  │ rest for 3 days               │  │
│  └───────────────────────────────┘  │
│                                      │
│  Total days: 3                      │
│                                      │
│  [Cancel] [Submit Request]          │
│                                      │
└─────────────────────────────────────┘
```

**Features:**
- Automatic days calculation
- Leave type dropdown (Sick, Annual, Personal, Emergency)
- Required reason text area
- Status badges (color-coded)
- Manager approval buttons
- Empty state with instructions

**Access Levels:**
- **All Users**: Can submit and view own leave requests
- **Managers**: Can approve/reject team requests

**Navigation Options:**
- **Back button** → Returns to Reports Page
- **New Request button** → Opens leave form dialog

---

## 🗺️ Complete Navigation Map

```
┌──────────────┐
│  DASHBOARD   │
└──────┬───────┘
       │
       │ Click "Attendance" in Nav
       ▼
┌─────────────────────────────────────┐
│  ATTENDANCE REPORTS (Main Hub)      │
│  ───────────────────────────────────│
│                                      │
│  Quick Actions:                      │
│  ┌─────────┬────────────┬─────────┐│
│  │CHECK IN │ MY REPORTS │  TEAM   ││
│  │  /OUT   │ (Current)  │ STATUS  ││
│  └────┬────┴────────────┴────┬────┘│
│       │                       │     │
│       │  ┌──────────────┐     │     │
│       │  │LEAVE REQUESTS│     │     │
│       │  └──────┬───────┘     │     │
└───────┼─────────┼─────────────┼─────┘
        │         │             │
        ▼         ▼             ▼
┌──────────┐ ┌────────┐ ┌──────────────┐
│ CHECK-IN │ │ LEAVE  │ │ TEAM STATUS  │
│   PAGE   │ │  MGMT  │ │     PAGE     │
└──────────┘ └────────┘ └──────────────┘
     │           │              │
     │           │              │
     └───────────┴──────────────┘
                 │
            Back buttons
                 │
                 ▼
     ┌───────────────────────┐
     │  ATTENDANCE REPORTS   │
     │     or DASHBOARD      │
     └───────────────────────┘
```

---

## 🎯 Quick Access Paths

### For Daily Check-In/Out:
```
Dashboard → Attendance → Check In/Out Card → Check In Page
(3 clicks)

Or bookmark: /attendance/checkin
(Direct access)
```

### For Viewing Reports:
```
Dashboard → Attendance → You're already there!
(2 clicks)
```

### For Team Monitoring (Managers):
```
Dashboard → Attendance → Team Status Card → Team Status Page
(3 clicks)

Or bookmark: /attendance/team
(Direct access)
```

### For Leave Requests:
```
Dashboard → Attendance → Leave Requests Card → Leave Management
(3 clicks)

Or bookmark: /leave-management
(Direct access)
```

---

## 📱 Page URLs Reference

| Page | URL | Access |
|------|-----|--------|
| **Check-In/Out** | `/attendance/checkin` | All users |
| **Reports** | `/attendance` | All users |
| **Team Status** | `/attendance/team` | Manager+ only |
| **Leave Management** | `/leave-management` | All users |

---

## 🎨 Visual Hierarchy

### Button Importance (by size):
1. **h-24 (Largest)**: Quick action navigation cards
2. **h-16 (Large)**: Primary actions (Check In, Check Out)
3. **h-14 (Medium)**: Secondary actions (Start Break)
4. **Default**: Standard buttons (Cancel, Back, etc.)

### Color Coding:
- **Blue (bg-blue-600)**: Primary actions (Check In, navigation)
- **Red (variant="destructive")**: Critical actions (Check Out)
- **Green badges**: Active/Approved status
- **Amber badges**: On Break/Pending status
- **Gray badges**: Logged Out/Inactive status

---

## ✅ Navigation Tips

1. **Attendance is the hub**: Always returns to Reports page when using Back button
2. **Quick actions at top**: Large cards for fast navigation on Reports page
3. **Breadcrumb pattern**: Back buttons consistently return to previous page
4. **Direct URLs**: Can bookmark specific pages for faster access
5. **Role-based**: Menu items hide automatically if user lacks permission
6. **Real-time**: Team status auto-refreshes, no manual reload needed

---

## 🎯 User Workflows

### Daily Attendance Flow:
```
1. Navigate to Check-In page
2. Click Check In (morning)
3. Work...
4. Click Start Break (optional)
5. Click End Break (optional)
6. Click Check Out (evening)
✅ Done!
```

### Manager Monitoring Flow:
```
1. Navigate to Team Status page
2. View real-time status (auto-refreshes)
3. No action needed - just monitoring
✅ Done!
```

### Leave Request Flow:
```
1. Navigate to Leave Management
2. Click "+ New Request"
3. Fill form
4. Submit
5. Wait for manager approval
✅ Done!
```

### Manager Approval Flow:
```
1. Navigate to Leave Management
2. See pending requests in table
3. Click Approve or Reject
4. Employee gets notified
✅ Done!
```

---

This navigation structure ensures:
- ✅ Clear entry points
- ✅ Consistent navigation patterns
- ✅ Minimal clicks to reach any feature
- ✅ Visual hierarchy for importance
- ✅ Role-based access control
- ✅ Professional user experience
