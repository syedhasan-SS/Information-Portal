# 🚀 Quick Start UAT - Information Portal

## Import to Google Sheets (30 seconds)

1. **Open Google Sheets**: https://sheets.google.com
2. **Create new spreadsheet**: "Info Portal UAT"
3. **File → Import → Upload**
4. **Select file**: `UAT-Priority1-Import.csv`
5. **Import → Replace spreadsheet**
6. **Done!** ✅

## Your Test File
📄 **UAT-Priority1-Import.csv** (45 critical tests)

## Quick Test Run (30-45 min)

### Test Accounts Needed
Create these test users first:

| Role | Email | Department |
|------|-------|------------|
| Owner | owner@test.com | Any |
| Admin | admin@test.com | Any |
| SS Agent | ss-agent@test.com | Seller Support |
| Tech Agent | tech-agent@test.com | Tech |
| Head | head@test.com | Finance |
| Manager | manager@test.com | Operations |

### Testing Order (Priority)
1. ✅ **Login Tests** (5 min) - Test IDs: P1-AUTH-001 to 005
2. ✅ **Owner Tests** (10 min) - Test IDs: P1-OWN-001 to 012
3. ✅ **Admin Restrictions** (10 min) - Test IDs: P1-ADM-001 to 009
4. ✅ **Seller Support Agent** (10 min) - Test IDs: P1-SS-001 to 007
5. ✅ **Other Agents** (5 min) - Test IDs: P1-AGT-001 to 005

### Mark Status
Replace "NOT TESTED" with:
- **PASS** ✅
- **FAIL** ❌
- **BLOCKED** ⏸️

## Critical Checks

### Must Work ✅
- [ ] Owner can delete tickets/users/roles
- [ ] Admin CANNOT delete users/roles/vendors
- [ ] Seller Support Agent CAN create tickets
- [ ] Tech/Finance/Ops Agents CANNOT create tickets
- [ ] Each role sees only their scope (dept/team/assigned)

### Red Flags 🚨
- Admin can delete anything → CRITICAL BUG
- Agent can see all departments → SECURITY ISSUE
- Cross-department ticket visibility → ACCESS CONTROL BROKEN

---

**Time estimate**: 30-45 minutes for Priority 1 tests
**Start now**: Import CSV and begin testing! 🎯
