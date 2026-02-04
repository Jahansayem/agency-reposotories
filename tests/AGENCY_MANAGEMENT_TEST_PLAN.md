# Agency Management - Comprehensive Test Plan

**Date**: 2026-02-01
**Features**: Agency Creation, Member Management, Multi-Agency Switching
**Estimated Time**: 30-45 minutes

---

## Prerequisites

- [ ] Dev server running: `npm run dev`
- [ ] Database seeded with Bealer Agency (see QUICK_START_MULTI_AGENCY.md)
- [ ] At least 2 users exist: Derrick (owner) and Sefra
- [ ] `NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true` in `.env.local`

---

## Test Suite 1: Agency Creation (Owner Only)

### Test 1.1: Access Control - Owner Can Create Agencies
**Login**: Derrick (PIN: 8008)

**Steps**:
1. Click AgencySwitcher button (top-left sidebar)
2. Verify dropdown opens
3. **Check**: "Create New Agency" button visible at bottom
4. Click "Create New Agency"
5. **Check**: Modal opens with form

**Expected Result**: ✅ Owner can access agency creation modal

**Actual Result**: _______________

---

### Test 1.2: Create Agency - Valid Input
**Login**: Derrick

**Steps**:
1. Open "Create New Agency" modal
2. Enter Agency Name: "Test Insurance Agency"
3. **Check**: Slug auto-generates to `test-insurance-agency`
4. Select primary color: Gold (#C9A227)
5. **Check**: Preview shows "T" icon in gold with agency name
6. Click "Create Agency"
7. Wait for success

**Expected Result**:
- ✅ Modal closes automatically
- ✅ New agency appears in AgencySwitcher dropdown
- ✅ Agency shows with "Owner (Default)" or "Owner" badge

**Actual Result**: _______________

---

### Test 1.3: Create Agency - Custom Slug
**Login**: Derrick

**Steps**:
1. Open "Create New Agency" modal
2. Enter Agency Name: "Downtown Branch"
3. Manually change slug to: `downtown-location`
4. Click "Create Agency"

**Expected Result**: ✅ Agency created with custom slug

**Actual Result**: _______________

---

### Test 1.4: Create Agency - Duplicate Slug
**Login**: Derrick

**Steps**:
1. Open "Create New Agency" modal
2. Enter Agency Name: "Bealer Agency" (already exists)
3. Slug will be: `bealer-agency`
4. Click "Create Agency"

**Expected Result**:
- ❌ Error message: "An agency with this name already exists"
- ✅ Modal stays open
- ✅ User can fix the name

**Actual Result**: _______________

---

### Test 1.5: Create Agency - Validation Errors
**Login**: Derrick

**Test Empty Name**:
1. Open modal
2. Leave Agency Name blank
3. Click "Create Agency"
4. **Check**: Error: "Agency name is required"

**Test Short Name**:
1. Enter name: "AB"
2. **Check**: Error: "Agency name must be at least 3 characters"

**Test Invalid Slug**:
1. Enter name: "Test Agency"
2. Manually change slug to: "test agency!" (spaces/special chars)
3. **Check**: Error: "Slug can only contain lowercase letters, numbers, and hyphens"

**Expected Result**: ✅ All validation errors show correctly

**Actual Result**: _______________

---

### Test 1.6: Access Control - Member Cannot Create Agencies
**Login**: Sefra (or any non-owner user)

**Steps**:
1. Click AgencySwitcher button
2. Look at dropdown

**Expected Result**:
- ✅ Dropdown shows agencies Sefra is a member of
- ❌ NO "Create New Agency" button (member cannot create)

**Actual Result**: _______________

---

## Test Suite 2: Member Management (Owner/Admin Only)

### Test 2.1: Access Control - Owner Can Manage Members
**Login**: Derrick

**Steps**:
1. Click AgencySwitcher
2. **Check**: "Manage Members" button visible (purple, with Users icon)
3. Click "Manage Members"
4. **Check**: Modal opens showing member list

**Expected Result**: ✅ Owner can access member management

**Actual Result**: _______________

---

### Test 2.2: View Current Members
**Login**: Derrick

**Steps**:
1. Open "Manage Members" modal
2. Review member list

**Expected Result**:
- ✅ Shows all members with:
  - Avatar (colored circle with initial)
  - Name
  - Role badge (Owner/Admin/Member with icon)
  - Join date
- ✅ Current user marked with "(You)"
- ✅ Members sorted by join date or role

**Actual Result**:
- Number of members shown: ___
- Roles displayed: _______________

---

### Test 2.3: Add Member - Valid User
**Login**: Derrick

**Steps**:
1. Open "Manage Members" modal
2. Click "Add Team Member" button
3. Enter username: "Sefra" (if not already a member)
4. Select role: "Member"
5. Click "Add Member"
6. Wait for success

**Expected Result**:
- ✅ Success message: "Sefra added to agency as member"
- ✅ Sefra appears in member list immediately
- ✅ Shows "Member" badge
- ✅ Add form closes automatically

**Actual Result**: _______________

---

### Test 2.4: Add Member - Duplicate Detection
**Login**: Derrick

**Steps**:
1. Try to add the same user again (e.g., Sefra)
2. Enter username: "Sefra"
3. Click "Add Member"

**Expected Result**:
- ❌ Error: "Sefra is already a member of this agency"
- ✅ Member not duplicated

**Actual Result**: _______________

---

### Test 2.5: Add Member - User Not Found
**Login**: Derrick

**Steps**:
1. Click "Add Team Member"
2. Enter username: "NonExistentUser123"
3. Click "Add Member"

**Expected Result**:
- ❌ Error: "User 'NonExistentUser123' not found"

**Actual Result**: _______________

---

### Test 2.6: Add Member - Different Roles
**Login**: Derrick

**Test Admin Role**:
1. Add a new user as "Admin"
2. **Check**: Can select Admin role
3. **Check**: User added with Admin badge

**Test Owner Role**:
1. Try to add user as "Owner"
2. **Check**: Owner option should be available (if current user is owner)
3. Add user as Owner
4. **Check**: User gets Owner badge with crown icon

**Expected Result**: ✅ All roles can be assigned correctly

**Actual Result**: _______________

---

### Test 2.7: Remove Member - Success
**Login**: Derrick

**Steps**:
1. Open "Manage Members" modal
2. Find a member (not yourself, not an owner)
3. Click the trash icon next to their name
4. **Check**: Confirmation dialog appears
5. Click "OK" to confirm
6. Wait for success

**Expected Result**:
- ✅ Success message: "[Name] removed from agency"
- ✅ Member disappears from list immediately
- ✅ Total member count decreases

**Actual Result**: _______________

---

### Test 2.8: Remove Member - Cannot Remove Self
**Login**: Derrick

**Steps**:
1. Try to find trash icon next to your own name (Derrick)

**Expected Result**:
- ❌ NO trash icon next to your own name
- ✅ Prevents accidental self-removal/lockout

**Actual Result**: _______________

---

### Test 2.9: Remove Member - Owner Protection
**Login**: Create an admin user, then login as that admin

**Steps**:
1. As admin, open "Manage Members"
2. Try to remove Derrick (owner)
3. **Check**: Should not be able to remove owner

**Expected Result**:
- Either no trash icon for owners
- Or error: "Only owners can remove other owners"

**Actual Result**: _______________

---

### Test 2.10: Access Control - Member Cannot Manage
**Login**: Sefra (member role)

**Steps**:
1. Click AgencySwitcher
2. Look for "Manage Members" button

**Expected Result**:
- ❌ NO "Manage Members" button visible
- ✅ Only owners/admins can manage members

**Actual Result**: _______________

---

### Test 2.11: Access Control - Admin Can Manage
**Setup**: First add a user as Admin (via Derrick's account)

**Login**: As the admin user

**Steps**:
1. Click AgencySwitcher
2. **Check**: "Manage Members" button IS visible
3. Click "Manage Members"
4. Try adding a member
5. Try removing a non-owner member

**Expected Result**: ✅ Admins can add/remove members (except owners)

**Actual Result**: _______________

---

## Test Suite 3: Agency Switching & Data Isolation

### Test 3.1: Switch Between Agencies
**Login**: Derrick

**Setup**: Ensure you're a member of at least 2 agencies

**Steps**:
1. Note current agency name in AgencySwitcher
2. Create a task: "Task in [Agency A]"
3. Click AgencySwitcher
4. Select different agency (Agency B)
5. **Check**: Page refreshes/updates
6. **Check**: AgencySwitcher now shows Agency B name
7. Look at task list

**Expected Result**:
- ✅ AgencySwitcher updates to show new agency
- ✅ Task created in Agency A does NOT appear
- ✅ Only Agency B tasks shown
- ✅ Data isolation working

**Actual Result**: _______________

---

### Test 3.2: Tasks Stay in Correct Agency
**Login**: Derrick

**Steps**:
1. Switch to "Bealer Agency"
2. Create task: "Bealer Agency Task"
3. Switch to "Test Insurance Agency"
4. Create task: "Test Agency Task"
5. Switch back to "Bealer Agency"

**Expected Result**:
- ✅ Only "Bealer Agency Task" visible
- ✅ "Test Agency Task" hidden
- ✅ Switch back to Test Agency shows opposite

**Actual Result**: _______________

---

### Test 3.3: Real-Time Sync Across Agencies
**Setup**: Open 2 browser tabs, login as different users in same agency

**Tab 1**: Derrick in Bealer Agency
**Tab 2**: Sefra in Bealer Agency

**Steps**:
1. In Tab 1 (Derrick), create a task
2. Watch Tab 2 (Sefra)

**Expected Result**:
- ✅ Task appears in Tab 2 immediately (real-time sync)
- ✅ Both users see same tasks

**Now Test Cross-Agency**:
1. In Tab 1, switch Derrick to "Test Insurance Agency"
2. Create a task
3. Check Tab 2 (Sefra still in Bealer Agency)

**Expected Result**:
- ❌ Task does NOT appear in Tab 2
- ✅ Agency isolation prevents cross-agency sync

**Actual Result**: _______________

---

## Test Suite 4: UI/UX Quality

### Test 4.1: Loading States
**Steps**:
1. Open "Create New Agency" modal
2. Fill form and submit
3. **Check**: Button shows "Creating..." with spinner
4. **Check**: Button is disabled during creation
5. Wait for completion

**Expected Result**:
- ✅ Loading indicator shows
- ✅ Prevents double-submit

**Actual Result**: _______________

---

### Test 4.2: Error Recovery
**Steps**:
1. Open "Manage Members"
2. Try to add invalid user
3. See error message
4. Fix the username
5. Try again

**Expected Result**:
- ✅ Error message appears
- ✅ Form stays open for correction
- ✅ Can retry without reopening modal

**Actual Result**: _______________

---

### Test 4.3: Modal Interactions
**Test Click Outside to Close**:
1. Open any modal
2. Click on backdrop (dark area outside modal)
3. **Check**: Modal closes

**Test Escape Key**:
1. Open any modal
2. Press Escape key
3. **Check**: Modal closes

**Test During Submit**:
1. Open modal, start submitting
2. Try to close during submission
3. **Check**: Cannot close while submitting (disabled)

**Expected Result**: ✅ All modal interactions work correctly

**Actual Result**: _______________

---

### Test 4.4: Responsive Design (Mobile)
**Steps**:
1. Open Chrome DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Select iPhone 13 Pro
4. Test all agency features:
   - AgencySwitcher dropdown
   - Create Agency modal
   - Manage Members modal
5. Check scrolling, button sizes, readability

**Expected Result**:
- ✅ All elements visible and usable
- ✅ Text readable
- ✅ Buttons easy to tap (min 44x44px)
- ✅ Modals fit screen with scroll

**Actual Result**: _______________

---

### Test 4.5: Dark Mode
**Steps**:
1. Click theme toggle (sun/moon icon in sidebar)
2. Test all agency UIs in dark mode:
   - AgencySwitcher dropdown
   - Create Agency modal
   - Manage Members modal
3. Check contrast, readability

**Expected Result**:
- ✅ All text readable in dark mode
- ✅ Colors have sufficient contrast
- ✅ No white boxes or jarring transitions

**Actual Result**: _______________

---

## Test Suite 5: Edge Cases & Error Handling

### Test 5.1: Network Error Simulation
**Steps** (requires browser DevTools):
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to create an agency
4. Wait 10 seconds

**Expected Result**:
- ❌ Error message: "Network error. Please try again."
- ✅ User can retry when online

**Actual Result**: _______________

---

### Test 5.2: Special Characters in Names
**Steps**:
1. Create agency with name: "Smith & Associates"
2. **Check**: Slug becomes `smith-associates`
3. Create agency: "Über Insurance"
4. **Check**: Handles unicode characters

**Expected Result**: ✅ Special characters handled gracefully

**Actual Result**: _______________

---

### Test 5.3: Very Long Names
**Steps**:
1. Enter agency name: "This is a very long agency name that exceeds the normal length that most users would typically enter when creating a new agency in the system"
2. Try to submit

**Expected Result**:
- ❌ Error if > 100 characters
- ✅ Validation prevents overly long names

**Actual Result**: _______________

---

### Test 5.4: SQL Injection Prevention
**Steps**:
1. Try to add member with username: `'; DROP TABLE users; --`
2. Try to create agency with name: `<script>alert('xss')</script>`

**Expected Result**:
- ✅ No errors or weird behavior
- ✅ Treated as regular text
- ✅ SQL injection prevented
- ✅ XSS prevented

**Actual Result**: _______________

---

## Test Suite 6: Database Verification

### Test 6.1: Verify Agency Creation in Database
**After creating an agency via UI**:

Run in Supabase SQL Editor:
```sql
SELECT id, name, slug, primary_color, is_active, created_at
FROM agencies
WHERE slug = 'test-insurance-agency';
```

**Expected Result**:
- ✅ Agency exists with correct name, slug, color
- ✅ `is_active = true`
- ✅ `created_at` is recent

**Actual Result**: _______________

---

### Test 6.2: Verify Owner Assignment
**After creating agency**:

```sql
SELECT
  u.name as user_name,
  am.role,
  am.status,
  am.permissions
FROM agency_members am
JOIN users u ON am.user_id = u.id
WHERE am.agency_id = (SELECT id FROM agencies WHERE slug = 'test-insurance-agency');
```

**Expected Result**:
- ✅ Derrick listed as `role = 'owner'`
- ✅ `status = 'active'`
- ✅ Permissions include all capabilities

**Actual Result**: _______________

---

### Test 6.3: Verify Member Addition
**After adding Sefra via UI**:

```sql
SELECT
  u.name,
  am.role,
  am.permissions,
  am.created_at
FROM agency_members am
JOIN users u ON am.user_id = u.id
WHERE am.agency_id = (SELECT id FROM agencies WHERE slug = 'bealer-agency')
  AND u.name = 'Sefra';
```

**Expected Result**:
- ✅ Sefra exists with `role = 'member'`
- ✅ Permissions match member defaults
- ✅ Recent `created_at`

**Actual Result**: _______________

---

### Test 6.4: Verify Activity Logging
**After performing actions**:

```sql
SELECT
  action,
  user_name,
  details,
  created_at
FROM activity_log
WHERE action IN ('agency_created', 'member_added', 'member_removed')
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result**:
- ✅ `agency_created` logged when agency created
- ✅ `member_added` logged when member added
- ✅ `member_removed` logged when member removed
- ✅ `details` contains agency_id, user names, etc.

**Actual Result**: _______________

---

## Summary

### Pass/Fail Count

| Test Suite | Tests Passed | Tests Failed | Pass Rate |
|------------|--------------|--------------|-----------|
| 1. Agency Creation | __ / 6 | __ | __% |
| 2. Member Management | __ / 11 | __ | __% |
| 3. Agency Switching | __ / 3 | __ | __% |
| 4. UI/UX Quality | __ / 5 | __ | __% |
| 5. Edge Cases | __ / 4 | __ | __% |
| 6. Database Verification | __ / 4 | __ | __% |
| **TOTAL** | **__ / 33** | **__** | **__%** |

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Non-Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Sign-Off

**Tested By**: _______________
**Date**: _______________
**Environment**: Development / Staging / Production
**Overall Result**: PASS / FAIL / NEEDS WORK

**Ready for Production**: YES / NO

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________
