# Multi-Agency Manual Verification Checklist

**Status:** Pre-Launch Testing | **Created:** 2026-02-03 | **Last Updated:** 2026-02-03  
**Purpose:** Comprehensive step-by-step manual testing guide for multi-agency system launch  
**Target Audience:** QA Team, Testers, Product Owners  
**Estimated Time:** 2-3 hours (full suite) | 30 minutes (critical path only)

---

## Table of Contents

1. [Pre-Test Setup](#pre-test-setup)
2. [1. Authentication & Session Management](#1-authentication--session-management)
3. [2. Agency Isolation](#2-agency-isolation)
4. [3. Role-Based Access Control](#3-role-based-access-control)
5. [4. Staff Data Scoping](#4-staff-data-scoping)
6. [5. Agency Invitation Flow](#5-agency-invitation-flow)
7. [6. Real-Time Sync Across Agencies](#6-real-time-sync-across-agencies)
8. [7. Error Handling & Edge Cases](#7-error-handling--edge-cases)
9. [8. Performance & Stability](#8-performance--stability)
10. [Test Result Summary](#test-result-summary)

---

## Pre-Test Setup

### Environment Preparation

**Step 1: Start Development Server**
```bash
cd /Users/adrianstier/shared-todo-list
npm run dev
```

**Expected Output:**
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Step 2: Prepare Test Data**

Verify the following test agencies and users exist in Supabase:

| Agency | Owner | Manager | Staff 1 | Staff 2 |
|--------|-------|---------|---------|---------|
| Bealer Agency | Derrick | Sefra | Marcus | (empty) |
| Test Agency | (create new) | (optional) | (optional) | (optional) |

**Step 3: Prepare Multiple Browsers/Tabs**

Open 3 windows/tabs for multi-client testing:
- Tab A: Main user account (Derrick)
- Tab B: Secondary user account (Sefra)
- Tab C: Monitor for real-time sync verification

**Step 4: Clear Browser State**
- Clear localStorage and cookies
- Clear application cache
- Open DevTools Console to monitor for errors

**Step 5: Verify Database Connectivity**

In Supabase Dashboard:
```sql
SELECT COUNT(*) FROM agencies;
SELECT COUNT(*) FROM agency_members;
SELECT COUNT(*) FROM users;
```

Expected: 
- Agencies: ≥2 (at least Bealer Agency)
- Agency Members: ≥3 (Derrick as owner, Sefra, Marcus)
- Users: ≥3 (Derrick, Sefra, Marcus)

---

## 1. Authentication & Session Management

### 1.1: Login with PIN - Owner Role

**Precondition:** Browser is on http://localhost:3000, localStorage is empty

**Test Steps:**

1. You see the login screen with "Select a user to continue"
2. Click on "Derrick" user card
3. User card becomes highlighted (darker background)
4. A PIN input field appears at the bottom
5. Enter PIN: `8008` (Derrick's test PIN)
6. Click "Login" button
7. Wait for navigation to complete (2-3 seconds)

**Expected Results:**
- ✓ Login button shows loading indicator briefly
- ✓ Page redirects to `/` (main app)
- ✓ App shell loads with sidebar visible
- ✓ "Bealer Agency" appears in agency switcher (top-left)
- ✓ User avatar shows "D" with Derrick's color
- ✓ No console errors in DevTools
- ✓ Session stored in localStorage with key `todoSession`

**Verify Session Storage:**
```javascript
// In DevTools Console:
JSON.parse(localStorage.getItem('todoSession'))
// Should output: { userId: "...", userName: "Derrick", loginAt: "2026-02-03T..." }
```

**If Test Fails:**
- [ ] Check PIN hash is correct (verify in database: `SELECT pin_hash FROM users WHERE name = 'Derrick'`)
- [ ] Check browser console for auth errors
- [ ] Verify Supabase connection works
- [ ] Check session timeout (should not expire within 8 hours)

---

### 1.2: Login with PIN - Manager Role

**Precondition:** Logged out, on login screen

**Test Steps:**

1. Click on "Sefra" user card
2. Enter PIN: `1234` (Sefra's test PIN)
3. Click "Login" button
4. Wait for page load

**Expected Results:**
- ✓ Successfully logged in as Sefra
- ✓ User avatar shows "S" with Sefra's color
- ✓ Agency switcher shows "Bealer Agency"
- ✓ No console errors

**Session Verification:**
```javascript
JSON.parse(localStorage.getItem('todoSession')).userName === "Sefra"
// Should return: true
```

**If Test Fails:**
- [ ] Verify Sefra's PIN is correct in database
- [ ] Check Sefra has agency membership in `agency_members` table

---

### 1.3: Session Persistence on Page Refresh

**Precondition:** Logged in as Derrick

**Test Steps:**

1. Note the current user shown in header (Derrick)
2. Press `Ctrl+R` (or `Cmd+R` on Mac) to refresh page
3. Wait for page to fully reload (3-5 seconds)

**Expected Results:**
- ✓ Page reloads and user remains logged in
- ✓ No redirect to login screen
- ✓ Same agency context is restored
- ✓ Same tasks/data are loaded
- ✓ No "Unauthorized" errors in console

**If Test Fails:**
- [ ] Check session expiry time (8 hours)
- [ ] Verify localStorage is persisted correctly
- [ ] Check for CORS errors in DevTools Network tab
- [ ] Verify session validator API works: `curl http://localhost:3000/api/health`

---

### 1.4: Session Timeout & Logout

**Precondition:** Logged in as Derrick

**Test Steps:**

1. Click on user avatar in top-right corner
2. Click "Logout" from dropdown menu
3. Wait for redirect to complete

**Expected Results:**
- ✓ Redirected to login screen
- ✓ User selection shows available users
- ✓ localStorage key `todoSession` is removed
- ✓ No sensitive data left in localStorage

**Verify Logout:**
```javascript
// In DevTools Console:
localStorage.getItem('todoSession') === null
// Should return: true
```

**If Test Fails:**
- [ ] Check logout endpoint is called (DevTools Network tab)
- [ ] Verify session is cleared in all tabs
- [ ] Check for lingering cached data

---

### 1.5: Invalid PIN Shows Error

**Precondition:** On login screen, not logged in

**Test Steps:**

1. Click on "Derrick" user card
2. Enter PIN: `0000` (incorrect PIN)
3. Click "Login" button
4. Wait for response (1-2 seconds)

**Expected Results:**
- ✓ Login button shows error state (red background or X icon)
- ✓ Error message appears: "Invalid PIN" or similar
- ✓ User remains on login screen
- ✓ Session is NOT created in localStorage
- ✓ No redirect occurs

**If Test Fails:**
- [ ] Check PIN validation on server
- [ ] Verify error message is user-friendly
- [ ] Check for console errors during validation

---

### 1.6: Cross-Tab Session Invalidation

**Precondition:** Logged in as Derrick in Tab A, logged in as Sefra in Tab B

**Test Steps:**

1. In Tab A (Derrick): Click logout
2. Switch to Tab B (Sefra): Wait 2 seconds
3. Perform action in Tab B (e.g., click on a task)
4. Observe error handling

**Expected Results:**
- ✓ Tab A immediately logs out after logout click
- ✓ Tab B continues to work normally
- ✓ Each tab maintains independent session
- ✓ No cross-tab session conflicts

**If Test Fails:**
- [ ] Verify session storage is tab-independent
- [ ] Check for shared state issues between tabs

---

## 2. Agency Isolation

### 2.1: User Only Sees Their Agencies in Switcher

**Precondition:** Logged in as Derrick

**Test Steps:**

1. Locate agency switcher in top-left (shows "Bealer Agency")
2. Click on agency switcher dropdown/button
3. Observe list of agencies

**Expected Results:**
- ✓ Dropdown shows only agencies Derrick belongs to
- ✓ "Bealer Agency" is in the list (owner)
- ✓ If additional agencies exist for Derrick, they appear
- ✓ Other users' private agencies do NOT appear
- ✓ Crown icon appears next to agencies where Derrick is owner

**Check Permission Levels:**
```sql
-- In Supabase SQL Editor:
SELECT a.name, am.role 
FROM agencies a 
JOIN agency_members am ON a.id = am.agency_id 
JOIN users u ON am.user_id = u.id 
WHERE u.name = 'Derrick';
```

Expected: Derrick should have `owner` role for Bealer Agency

**If Test Fails:**
- [ ] Verify Derrick's agency memberships in database
- [ ] Check AgencyContext is populated correctly
- [ ] Inspect Redux/Zustand state in DevTools

---

### 2.2: Agency Switcher Changes Context

**Precondition:** Logged in as user with 2+ agencies, in Tab A

**Test Steps:**

1. Verify current agency is "Agency A" in switcher
2. Click switcher dropdown
3. Click on "Agency B" (if it exists, or create test data)
4. Wait for context switch (1-2 seconds)
5. Check data updates

**Expected Results:**
- ✓ Agency switcher now shows "Agency B"
- ✓ Task list refreshes and shows Agency B's tasks
- ✓ Messages/chat reloads with Agency B's conversations
- ✓ Activity log filters to Agency B only
- ✓ Selected agency persists on page refresh

**Check Context in Console:**
```javascript
// Simulated check - look at AgencyContext/Redux/Zustand state
// Should show currentAgencyId matching selected agency
```

**If Test Fails:**
- [ ] Verify agency context is updated in state management
- [ ] Check real-time subscriptions switch to new agency
- [ ] Verify API calls include correct agency_id filter

---

### 2.3: Tasks Are Agency-Scoped

**Precondition:** Logged in as Derrick, in Bealer Agency with 10+ tasks

**Test Steps:**

1. In Tab A: Note the number of tasks visible (e.g., 15 tasks)
2. Create a new task: "Test Task - Agency Isolation"
3. Verify new task appears in list
4. Create a new test agency (or use separate test agency with no tasks)
5. Switch to the new agency
6. Verify the previously created test task does NOT appear
7. Switch back to Bealer Agency
8. Verify the test task reappears

**Expected Results:**
- ✓ Task appears only in the agency where it was created
- ✓ No tasks leak between agencies
- ✓ Task counts are correct for each agency
- ✓ Switching agencies filters data correctly

**Database Verification:**
```sql
-- Check task agency_id is set correctly:
SELECT id, text, agency_id FROM todos WHERE text LIKE 'Test Task%';
```

Expected: All test tasks should have correct agency_id

**If Test Fails:**
- [ ] Verify todos table has agency_id column
- [ ] Check API is filtering by agency_id in WHERE clause
- [ ] Verify RLS policies are not blocking queries
- [ ] Check real-time subscriptions filter by agency

---

### 2.4: Chat Messages Are Agency-Scoped

**Precondition:** Logged in as Derrick and Sefra in separate tabs, both in Bealer Agency

**Test Steps:**

1. Tab A (Derrick): Open Chat panel
2. Tab B (Sefra): Open Chat panel  
3. Tab A: Send message "Test message from Derrick"
4. Tab B: Verify message appears
5. Switch Tab B to a different agency (if available)
6. Tab B: Verify the message from Derrick is NO LONGER visible
7. Switch Tab B back to Bealer Agency
8. Tab B: Verify message reappears

**Expected Results:**
- ✓ Messages appear in real-time within same agency
- ✓ Messages do NOT appear in other agencies
- ✓ Message filtering works correctly on agency switch
- ✓ No chat history leaks between agencies

**If Test Fails:**
- [ ] Check messages table has agency_id column
- [ ] Verify real-time subscription filters by agency_id
- [ ] Check chat API filters messages by agency

---

### 2.5: Activity Logs Are Agency-Scoped

**Precondition:** Logged in as Derrick with 5+ actions in Bealer Agency

**Test Steps:**

1. Open Activity Feed
2. Note the activity entries visible (should be Bealer Agency activities)
3. Create a task: "Activity Test Task"
4. Note new activity entry appears
5. Switch to a different agency (if available)
6. Verify the "Activity Test Task" entry does NOT appear in Activity Feed
7. Switch back to Bealer Agency
8. Verify the activity entry reappears

**Expected Results:**
- ✓ Activity log shows only current agency's activities
- ✓ Activities don't appear across agencies
- ✓ Switching agencies updates activity filter
- ✓ All action types are scoped (create, update, delete, complete, etc.)

**If Test Fails:**
- [ ] Check activity_log table has agency_id column
- [ ] Verify API filters activity by agency_id
- [ ] Check real-time subscriptions are agency-scoped

---

## 3. Role-Based Access Control

### 3.1: Owner Can Access Strategic Goals

**Precondition:** Logged in as Derrick (owner), in Bealer Agency

**Test Steps:**

1. Locate sidebar navigation menu
2. Look for "Strategic Goals" or "Goals" menu item
3. Click on it
4. Wait for page to load

**Expected Results:**
- ✓ Strategic Goals page loads successfully
- ✓ Goal list displays with current goals
- ✓ "Create Goal" button is visible
- ✓ Goal editing/deletion controls are visible
- ✓ No "Access Denied" or permission error messages

**Check Permission in Code:**
```javascript
// In DevTools Console, check if permission is granted:
// This depends on your state management (Redux/Zustand/Context)
// Should show: { can_view_strategic_goals: true, can_manage_strategic_goals: true }
```

**If Test Fails:**
- [ ] Verify Derrick has `owner` role
- [ ] Check DEFAULT_PERMISSIONS for owner role includes strategic_goals permissions
- [ ] Verify permission hook/context is working
- [ ] Check navigation component is gating Strategic Goals properly

---

### 3.2: Manager CANNOT Access Strategic Goals

**Precondition:** Logged in as Sefra (manager), in Bealer Agency

**Test Steps:**

1. Locate sidebar navigation menu
2. Verify "Strategic Goals" menu item is NOT visible (hidden or grayed out)
3. Try to access Strategic Goals directly: `http://localhost:3000/goals` (if this URL exists)
4. Observe result

**Expected Results:**
- ✓ "Strategic Goals" menu item is hidden from navigation
- ✓ Direct URL access shows access denied page or redirects
- ✓ No Strategic Goals data is displayed
- ✓ Error message shows: "You don't have permission to access this page" or similar

**Permission Check:**
```sql
-- In Supabase SQL Editor:
SELECT permissions FROM agency_members 
WHERE user_id = (SELECT id FROM users WHERE name = 'Sefra')
AND agency_id = (SELECT id FROM agencies WHERE name = 'Bealer Agency');
```

Expected: `can_view_strategic_goals: false, can_manage_strategic_goals: false`

**If Test Fails:**
- [ ] Verify Sefra's role is `manager`
- [ ] Check DEFAULT_PERMISSIONS for manager role
- [ ] Verify permission gate component blocks access
- [ ] Check navigation doesn't show forbidden menu items

---

### 3.3: Staff CANNOT Access Strategic Goals

**Precondition:** Logged in as Marcus (staff), in Bealer Agency

**Test Steps:**

1. Note down available menu items in sidebar
2. Verify "Strategic Goals" is NOT in the menu
3. Attempt direct URL access: `http://localhost:3000/goals`
4. Observe result

**Expected Results:**
- ✓ Menu item is hidden
- ✓ Direct access is blocked (redirect or 403)
- ✓ No Strategic Goals interface is shown
- ✓ Clear permission denied message

**If Test Fails:**
- [ ] Verify Marcus has `staff` role
- [ ] Check staff permissions exclude strategic_goals
- [ ] Verify PermissionGate component is implemented

---

### 3.4: Owner Can Manage Agency Members

**Precondition:** Logged in as Derrick (owner)

**Test Steps:**

1. Locate "Team" or "Members" or "Agency Settings" in sidebar/menu
2. Click on agency management section
3. Look for member list and controls
4. Verify you can see:
   - [ ] List of current members with their roles
   - [ ] "Invite" or "Add Member" button
   - [ ] Edit/remove controls for each member

**Expected Results:**
- ✓ Member management page loads
- ✓ All team members are visible with roles
- ✓ Invite button is available and clickable
- ✓ Edit/delete controls are available for each member
- ✓ Owner can change members' roles (owner → manager → staff)
- ✓ No permission errors

**If Test Fails:**
- [ ] Check `can_invite_users` and `can_change_roles` permissions for owner
- [ ] Verify member management UI is gated by permissions
- [ ] Check API requires proper authorization

---

### 3.5: Manager Can Invite Staff (NOT Managers)

**Precondition:** Logged in as Sefra (manager)

**Test Steps:**

1. Navigate to member management section
2. Click "Invite" or "Add Member" button
3. Verify role selector appears
4. Check available role options:
   - [ ] "Staff" is available
   - [ ] "Manager" is NOT available or is disabled
   - [ ] "Owner" is NOT available or is disabled
5. Select "Staff" role
6. Enter email: `test-staff@example.com`
7. Click "Send Invitation"
8. Wait for success message

**Expected Results:**
- ✓ Invitation is created successfully
- ✓ Only "Staff" role is selectable
- ✓ Manager and Owner roles are unavailable
- ✓ Invitation email/link is generated
- ✓ Confirmation message appears

**Database Check:**
```sql
-- Verify invitation was created with staff role:
SELECT email, role FROM agency_invitations 
WHERE email = 'test-staff@example.com' 
ORDER BY created_at DESC LIMIT 1;
```

Expected: `role = 'staff'`

**If Test Fails:**
- [ ] Verify Sefra has `can_invite_users` permission
- [ ] Check API validates role constraints
- [ ] Verify UI disables unavailable roles

---

### 3.6: Staff Cannot Access Member Management

**Precondition:** Logged in as Marcus (staff)

**Test Steps:**

1. Look for "Team" or "Members" menu item in sidebar
2. Verify it's NOT visible or is disabled
3. Try direct URL: `http://localhost:3000/team` or `/members`
4. Observe result

**Expected Results:**
- ✓ Menu item is hidden
- ✓ Direct access shows 403 or redirects to home
- ✓ Error message: "You don't have permission"
- ✓ No member list or controls are visible

**If Test Fails:**
- [ ] Verify Marcus has `can_invite_users: false` in permissions
- [ ] Check navigation gates this menu item
- [ ] Verify API returns 403 for staff users

---

## 4. Staff Data Scoping

### 4.1: Staff Sees Only Assigned/Created Tasks

**Precondition:** Logged in as Marcus (staff) in Bealer Agency

**Test Steps:**

1. Open task list
2. Note tasks visible (should only be tasks created by or assigned to Marcus)
3. Example: If there are 20 total tasks in agency, but only 3 assigned to Marcus, you should see only 3 (or more if Marcus created others)
4. In separate tab/browser, log in as Derrick and verify Derrick sees all 20 tasks
5. Switch back to Marcus view, verify list hasn't changed

**Expected Results:**
- ✓ Marcus sees fewer tasks than Derrick
- ✓ Only tasks with `assigned_to = 'Marcus'` or `created_by = 'Marcus'` are visible
- ✓ Tasks created by or assigned to others are hidden
- ✓ No indication of hidden tasks (clean UI)

**Database Verification:**
```sql
-- Check task visibility:
SELECT COUNT(*) as total_tasks FROM todos 
WHERE agency_id = (SELECT id FROM agencies WHERE name = 'Bealer Agency');

SELECT COUNT(*) as marcus_tasks FROM todos 
WHERE agency_id = (SELECT id FROM agencies WHERE name = 'Bealer Agency')
AND (created_by = 'Marcus' OR assigned_to = 'Marcus');
```

Expected: `marcus_tasks < total_tasks`

**If Test Fails:**
- [ ] Check API is filtering tasks with `created_by = user OR assigned_to = user`
- [ ] Verify real-time subscriptions only show scoped tasks
- [ ] Check task counts in UI are correct

---

### 4.2: Staff Cannot Edit Others' Tasks

**Precondition:** Logged in as Marcus (staff), viewing a task created by Derrick

**Test Steps:**

1. Find a task created by/assigned to Derrick: e.g., "Call John about renewal"
2. Click on the task to open detail modal
3. Look for edit button or inline editing capability
4. Verify one of:
   - [ ] Edit button is disabled (grayed out)
   - [ ] Edit button is hidden
   - [ ] Clicking edit shows "Permission Denied" error
5. If possible, try to edit the task name directly
6. Attempt to change priority, due date, or other fields

**Expected Results:**
- ✓ Edit controls are disabled or hidden
- ✓ Cannot modify task fields
- ✓ Permission error if attempting to save changes
- ✓ Task data is read-only from Marcus's perspective

**API Check (DevTools Network):**
- Attempt PATCH request to `/api/todos/[id]` as Marcus
- Expected: 403 Forbidden or 401 Unauthorized

**If Test Fails:**
- [ ] Check `can_edit_any_task` permission is false for staff
- [ ] Verify API validates ownership before allowing edit
- [ ] Check frontend disables edit UI for non-owners

---

### 4.3: Staff Cannot Delete Others' Tasks

**Precondition:** Logged in as Marcus (staff), viewing a task created by Derrick

**Test Steps:**

1. Open a task created by Derrick (not created by Marcus)
2. Look for delete/trash button
3. Verify one of:
   - [ ] Delete button is hidden
   - [ ] Delete button is disabled (grayed out)
   - [ ] Delete button shows tooltip: "You don't have permission"
4. If delete button exists, click it
5. Observe if deletion is prevented

**Expected Results:**
- ✓ Delete controls are unavailable
- ✓ Cannot delete task
- ✓ Permission denied if attempting deletion
- ✓ Task remains unchanged

**If Test Fails:**
- [ ] Check `can_delete_tasks` permission defaults to false for staff
- [ ] Verify API checks ownership/permissions before deletion
- [ ] Check UI properly gates delete button

---

### 4.4: Manager/Owner See All Tasks

**Precondition:** Logged in as Derrick (owner) in same agency as Marcus

**Test Steps:**

1. Open task list as Derrick
2. Note total task count visible
3. Switch to Marcus tab (staff user)
4. Note task count visible to Marcus (should be much less)
5. Switch back to Derrick
6. Verify Derrick's count is larger

**Expected Results:**
- ✓ Derrick sees all agency tasks (20/20 if 20 total)
- ✓ Marcus sees subset (maybe 3/20)
- ✓ Owner view is unrestricted
- ✓ Staff view is restricted to own tasks

**Example:**
```
Derrick (owner): 20 tasks visible
Marcus (staff):  3 tasks visible (2 assigned, 1 created)
Sefra (manager): 20 tasks visible
```

**If Test Fails:**
- [ ] Verify owner role has `can_view_all_tasks: true`
- [ ] Check manager role has appropriate permissions
- [ ] Verify staff role is properly restricted

---

## 5. Agency Invitation Flow

### 5.1: Create Invitation as Owner

**Precondition:** Logged in as Derrick (owner), in member management section

**Test Steps:**

1. Click "Invite Team Member" or "Add Member" button
2. Fill in form:
   - Email: `newuser@example.com`
   - Role: "Staff" (or select from available roles)
3. Optional: Add message/notes
4. Click "Send Invitation" button
5. Wait for confirmation (2-3 seconds)

**Expected Results:**
- ✓ Success message appears: "Invitation sent to newuser@example.com"
- ✓ New invitation appears in pending list
- ✓ Invitation token is generated in database
- ✓ No errors in console

**Database Verification:**
```sql
-- Check invitation was created:
SELECT id, email, role, token, expires_at 
FROM agency_invitations 
WHERE email = 'newuser@example.com' 
ORDER BY created_at DESC LIMIT 1;
```

Expected fields:
- `email`: newuser@example.com
- `role`: staff
- `token`: 40+ character random string
- `expires_at`: 7 days from now

**If Test Fails:**
- [ ] Check permission allows `can_invite_users`
- [ ] Verify invitation creation API is accessible
- [ ] Check token generation works
- [ ] Verify no duplicate invitations

---

### 5.2: Accept Invitation - New User

**Precondition:** Valid invitation token created for `newuser@example.com`

**Test Steps:**

1. Navigate to: `http://localhost:3000/join/[INVITATION_TOKEN]`
   - Replace [INVITATION_TOKEN] with the token from Step 5.1
2. Wait for page to load
3. Verify invitation details are displayed:
   - [ ] Agency name: "Bealer Agency"
   - [ ] Role: "Staff"
   - [ ] Invited by: "Derrick"
4. If you're not logged in, log in as existing user or create account
5. Click "Accept Invitation" button
6. Wait for completion

**Expected Results:**
- ✓ Invitation details display correctly
- ✓ User is added to agency_members table
- ✓ Membership is marked as "active"
- ✓ Redirect to main app after acceptance
- ✓ User now sees the agency in switcher
- ✓ User can access agency tasks/chat
- ✓ Invitation record is marked as `accepted_at` in database

**Database Verification:**
```sql
-- Check membership was created:
SELECT u.name, am.role, am.status 
FROM agency_members am
JOIN users u ON am.user_id = u.id
WHERE u.email = 'newuser@example.com'
AND am.agency_id = (SELECT id FROM agencies WHERE name = 'Bealer Agency');
```

Expected:
- `role`: staff
- `status`: active

**If Test Fails:**
- [ ] Verify invitation token is valid (not expired)
- [ ] Check join page accepts invitation
- [ ] Verify user is added to agency_members table
- [ ] Check redirect after acceptance works

---

### 5.3: Accept Invitation - Existing User

**Precondition:** Valid invitation for existing user (e.g., invite Marcus to a second agency)

**Test Steps:**

1. Create invitation for: `marcus@example.com`
2. In separate tab, log in as Marcus
3. Send invitation link to Marcus or navigate to: `http://localhost:3000/join/[TOKEN]`
4. Marcus sees invitation page
5. Click "Accept Invitation"
6. Wait for completion

**Expected Results:**
- ✓ Existing user is added to new agency
- ✓ New agency appears in switcher for Marcus
- ✓ Can switch to new agency and see its data
- ✓ Previous agency membership is unchanged
- ✓ Both agencies are now available to Marcus

**Verification:**
```sql
-- Check Marcus now has two agency memberships:
SELECT a.name, am.role 
FROM agency_members am
JOIN agencies a ON am.agency_id = a.id
JOIN users u ON am.user_id = u.id
WHERE u.name = 'Marcus'
ORDER BY a.name;
```

Expected: Two rows (Bealer Agency, new agency)

**If Test Fails:**
- [ ] Verify existing user path in join flow
- [ ] Check user context switches correctly
- [ ] Verify both agencies appear in switcher

---

### 5.4: Invitation Link Expires After 7 Days

**Precondition:** Invitation created in database, manually set `expires_at` to past date

**Test Steps:**

1. In Supabase SQL Editor, create expired invitation:
```sql
INSERT INTO agency_invitations (agency_id, email, role, token, expires_at, invited_by)
VALUES (
  (SELECT id FROM agencies WHERE name = 'Bealer Agency'),
  'expired@example.com',
  'staff',
  'expired-token-12345',
  NOW() - INTERVAL '1 day',  -- Expired 1 day ago
  (SELECT id FROM users WHERE name = 'Derrick')
);
```

2. Navigate to: `http://localhost:3000/join/expired-token-12345`
3. Wait for page to load

**Expected Results:**
- ✓ Error message appears: "Invitation has expired"
- ✓ No acceptance option is available
- [ ] Cannot accept expired invitation
- ✓ Suggestion to request new invitation

**If Test Fails:**
- [ ] Check invitation validation checks expiry
- [ ] Verify error message is clear
- [ ] Implement re-request functionality if missing

---

### 5.5: Invalid Invitation Token Shows Error

**Precondition:** Not logged in or logged in as any user

**Test Steps:**

1. Navigate to: `http://localhost:3000/join/invalid-token-xyz`
2. Wait for response

**Expected Results:**
- ✓ Error page appears: "Invitation not found" or "Invalid link"
- ✓ No sensitive data is exposed
- ✓ Option to return to app
- ✓ No security errors in console

**If Test Fails:**
- [ ] Verify token validation returns 404
- [ ] Check error page is user-friendly
- [ ] Ensure no SQL injection or security issues

---

## 6. Real-Time Sync Across Agencies

### 6.1: New Task Appears on All Clients - Same Agency

**Precondition:** Derrick and Sefra both logged in, both in Bealer Agency, in separate tabs

**Test Steps:**

1. Tab A (Derrick): Task list visible, count = N tasks
2. Tab B (Sefra): Task list visible, count = N tasks (same view)
3. Tab A: Click "Add Task", enter "Real-Time Sync Test"
4. Tab A: Submit (click Add button)
5. Tab A: Wait for confirmation (1-2 seconds)
6. Tab B: Observe WITHOUT manually refreshing

**Expected Results:**
- ✓ Tab A: Task immediately appears in list
- ✓ Tab A: Success notification shows
- ✓ Tab B: New task appears automatically within 2 seconds
- ✓ Tab B: No manual refresh needed
- ✓ Both tabs show identical task list
- ✓ No console errors in either tab

**Network Check (DevTools):**
- WebSocket connection should be active
- Supabase real-time channel should receive broadcast

**If Test Fails:**
- [ ] Check Supabase real-time is enabled
- [ ] Verify WebSocket connection in DevTools Network tab
- [ ] Check subscription is active on both clients
- [ ] Verify event handler processes todos updates

---

### 6.2: Task Completion Syncs in Real-Time

**Precondition:** Same setup as 6.1, task "Real-Time Sync Test" visible in both tabs

**Test Steps:**

1. Tab A (Derrick): Click on "Real-Time Sync Test" task to open
2. Tab A: Click checkbox to mark task as complete
3. Tab A: Wait for save (1-2 seconds)
4. Tab B (Sefra): Without manual action, observe task status
5. Tab B: Task should show as completed

**Expected Results:**
- ✓ Tab A: Task marked as done immediately
- ✓ Tab A: Visual indicator shows completed state (strikethrough, checkmark)
- ✓ Tab B: Task status updates automatically
- ✓ Tab B: Shows completed state without refresh
- ✓ Both tabs sync within 2 seconds
- ✓ Activity log updated in both tabs

**If Test Fails:**
- [ ] Check update mutation is sent
- [ ] Verify real-time event is broadcast
- [ ] Check subscription updates component state
- [ ] Verify activity log is created

---

### 6.3: Chat Messages Sync in Real-Time - Same Agency

**Precondition:** Derrick and Sefra in Chat panel, both in Bealer Agency

**Test Steps:**

1. Tab A (Derrick): Chat panel open, visible message list
2. Tab B (Sefra): Chat panel open, same task/conversation
3. Tab A: Type message "Testing real-time chat"
4. Tab A: Press Enter or click Send
5. Tab A: Wait 1 second
6. Tab B: Observe WITHOUT refreshing

**Expected Results:**
- ✓ Tab A: Message appears in list immediately
- ✓ Tab A: "Sent" indicator or timestamp shows
- ✓ Tab B: Message appears within 1-2 seconds
- ✓ Tab B: Shows message from Derrick with correct timestamp
- ✓ Tab B: No manual refresh needed
- ✓ No console errors

**If Test Fails:**
- [ ] Check message subscription is active
- [ ] Verify WebSocket is connected
- [ ] Check event handler in ChatMessageList
- [ ] Verify message format matches expectations

---

### 6.4: Messages DON'T Sync Across Different Agencies

**Precondition:** Derrick in Agency A, Sefra in Agency B, both in Chat

**Test Steps:**

1. Tab A (Derrick in Agency A): Chat panel open
2. Tab B (Sefra in Agency B): Chat panel open
3. Tab B: First switch agencies to Agency B (if Sefra has access)
4. Tab A: Send message "Cross-Agency Test"
5. Tab B: Wait 3 seconds and observe

**Expected Results:**
- ✓ Tab A: Message appears in Agency A chat
- ✓ Tab B: Message does NOT appear in Agency B chat
- ✓ No error messages
- ✓ Clean separation of messages

**If Test Fails:**
- [ ] Check subscription includes agency_id filter
- [ ] Verify database messages have agency_id
- [ ] Check RLS policies prevent cross-agency access

---

### 6.5: Real-Time Connection Status Indicator

**Precondition:** App loaded, logged in, in main view

**Test Steps:**

1. Observe connection indicator (usually in header or status bar)
2. Should show "Connected" or green status
3. Simulate network disconnect (DevTools → Network → Offline)
4. Wait 2 seconds, observe indicator
5. Should show "Reconnecting" or red status
6. Go back online (DevTools → Network → No throttling)
7. Wait 2 seconds, observe status

**Expected Results:**
- ✓ Online status shows "Connected" with green indicator
- ✓ Offline status shows "Offline" or "Reconnecting"
- ✓ Reconnection works after network restored
- ✓ Status indicator updates within 2 seconds
- ✓ Operations queue when offline, sync when back online

**If Test Fails:**
- [ ] Check connection status monitoring is implemented
- [ ] Verify indicator updates on connection changes
- [ ] Check offline queue works

---

## 7. Error Handling & Edge Cases

### 7.1: Cross-Agency Access Returns 403

**Precondition:** Logged in as Marcus (staff), in Bealer Agency

**Test Steps:**

1. Note down the ID of a task from a different agency (if available in database)
   - If no other agency exists, use Bealer Agency task ID
2. In DevTools Console, manually attempt API call:

```javascript
// Try to fetch a task from different agency (if possible to construct ID)
const otherId = 'some-task-id-from-other-agency';
fetch(`/api/todos?id=${otherId}`, {
  headers: { 'X-Agency-Id': 'different-agency-id' }
}).then(r => r.json()).then(console.log);
```

**Expected Results:**
- ✓ API returns 403 Forbidden
- ✓ Response includes error message
- ✓ No task data is leaked
- ✓ No console errors

**Alternative Test:**
- Try to modify a task from different agency via DevTools

```javascript
fetch(`/api/todos`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'task-from-other-agency', text: 'Hacked' })
}).then(r => r.json()).then(console.log);
```

Expected: 403 Forbidden or 401 Unauthorized

**If Test Fails:**
- [ ] Check API validates agency membership
- [ ] Verify 403 is returned for unauthorized access
- [ ] Ensure no data leakage

---

### 7.2: Invalid Session Returns 401

**Precondition:** Logged out or session expired

**Test Steps:**

1. Clear localStorage: `localStorage.clear()`
2. Try to access API: 
   ```javascript
   fetch('/api/todos').then(r => r.json()).then(console.log);
   ```
3. Observe response

**Expected Results:**
- ✓ API returns 401 Unauthorized
- ✓ Error message: "Unauthorized" or "Session expired"
- ✓ Frontend redirects to login if action is attempted
- ✓ No sensitive data in error

**If Test Fails:**
- [ ] Check session validation in API
- [ ] Verify 401 response format

---

### 7.3: API Error Shows User-Friendly Message

**Precondition:** Attempt an operation that fails (e.g., create task with empty name)

**Test Steps:**

1. Open Add Task modal
2. Leave task name empty
3. Try to submit
4. Observe error display

**Expected Results:**
- ✓ Error message is shown to user
- ✓ Message is clear and actionable (e.g., "Task name is required")
- ✓ Not a raw error code or stack trace
- ✓ Form remains open for correction
- ✓ No console errors about unhandled exceptions

**If Test Fails:**
- [ ] Implement proper error handling
- [ ] Add validation messages
- [ ] Check error display component

---

### 7.4: Rapid Task Creation - No Duplicates

**Precondition:** Logged in, Add Task modal open

**Test Steps:**

1. Enter task name: "Rapid Test"
2. Click "Add" button
3. Immediately click "Add" again (before first completes)
4. Wait for both operations to complete
5. Check task list

**Expected Results:**
- ✓ Only ONE task is created (no duplicates)
- ✓ Both button clicks result in one task (debounced)
- ✓ No duplicate detection errors
- ✓ Appropriate feedback is given

**If Test Fails:**
- [ ] Implement debouncing on submit button
- [ ] Add duplicate prevention

---

### 7.5: Network Timeout Handling

**Precondition:** Connected to app

**Test Steps:**

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to create a task
4. Wait 10 seconds
5. Restore network connection

**Expected Results:**
- ✓ Timeout error appears after 10-15 seconds (not immediately)
- ✓ Error message is helpful: "Network timeout, please try again"
- ✓ User can retry operation
- ✓ UI doesn't freeze or crash

**If Test Fails:**
- [ ] Implement proper timeout handling
- [ ] Set appropriate timeout values
- [ ] Show retry button/action

---

## 8. Performance & Stability

### 8.1: Page Load Time - Acceptable Performance

**Precondition:** Fresh page load, not cached

**Test Steps:**

1. Open DevTools → Lighthouse
2. Perform Lighthouse audit
3. Or manually measure:
   - Clear cache
   - Load http://localhost:3000
   - Open DevTools → Performance
   - Check First Contentful Paint (FCP) and Largest Contentful Paint (LCP)

**Expected Results:**
- ✓ Page loads in < 3 seconds (LCP)
- ✓ First paint in < 1 second (FCP)
- ✓ All content visible in < 4 seconds
- ✓ Lighthouse Performance score > 60

**If Test Fails:**
- [ ] Check bundle size
- [ ] Look for performance bottlenecks in DevTools Performance tab
- [ ] Check network waterfall chart

---

### 8.2: Real-Time Event Processing - Sub-Second Latency

**Precondition:** Logged in with 2 tabs open

**Test Steps:**

1. Tab A: Take note of exact time
2. Tab A: Create a task
3. Tab B: Measure time until task appears
4. Expected: < 2 seconds

**Expected Results:**
- ✓ Real-time events processed in < 2 seconds
- ✓ No lag or delay in UI updates
- ✓ Multiple simultaneous events don't cause backlog

**If Test Fails:**
- [ ] Check WebSocket connection quality
- [ ] Look for event processing bottlenecks
- [ ] Check database query performance

---

### 8.3: No Memory Leaks - Extended Session

**Precondition:** DevTools open, Performance/Memory tabs visible

**Test Steps:**

1. Open app and let it run for 5 minutes
2. Open DevTools → Memory tab
3. Take heap snapshot (baseline)
4. Perform 20 user actions:
   - Create 5 tasks
   - Complete 5 tasks
   - Switch agencies 5 times
   - Open/close modals 5 times
5. Wait 2 minutes
6. Take another heap snapshot
7. Compare snapshots

**Expected Results:**
- ✓ Heap size remains relatively stable
- ✓ No linear growth in memory over time
- ✓ Garbage collection cleans up old objects
- ✓ No detached DOM nodes accumulating

**If Test Fails:**
- [ ] Look for subscription cleanup issues
- [ ] Check event listener cleanup in useEffect
- [ ] Verify no circular references in state

---

### 8.4: No Console Errors - Clean Console

**Precondition:** App running, DevTools Console visible

**Test Steps:**

1. Clear console messages
2. Perform 10 normal user operations:
   - Login
   - View tasks
   - Create task
   - Complete task
   - Open chat
   - Send message
   - Switch agencies
   - View activity
   - Logout
3. Check console

**Expected Results:**
- ✓ No error messages (red)
- ✓ No unhandled promise rejections
- ✓ No React/Next.js warnings
- ✓ Only info/log messages (gray/white)

**If Test Fails:**
- [ ] Fix console errors one by one
- [ ] Add proper error boundaries
- [ ] Handle rejected promises

---

### 8.5: Concurrent Operations Don't Cause Conflicts

**Precondition:** Logged in as Derrick

**Test Steps:**

1. Tab A: Start creating a task
2. Tab B: Simultaneously create a different task
3. Tab C: Update an existing task
4. Wait for all operations to complete

**Expected Results:**
- ✓ All 3 operations succeed
- ✓ No conflicts or errors
- ✓ Data integrity maintained
- ✓ Both tabs show updated data
- ✓ All tasks appear in correct state

**If Test Fails:**
- [ ] Check for race conditions
- [ ] Verify optimistic update rollback works
- [ ] Check server-side conflict detection

---

## Test Result Summary

### Test Execution Tracking

Use this table to track test results:

| Test ID | Test Name | Status | Notes | Duration |
|---------|-----------|--------|-------|----------|
| 1.1 | Login as Owner | ☐ Pass ☐ Fail | | |
| 1.2 | Login as Manager | ☐ Pass ☐ Fail | | |
| 1.3 | Session Persistence | ☐ Pass ☐ Fail | | |
| 1.4 | Logout | ☐ Pass ☐ Fail | | |
| 1.5 | Invalid PIN Error | ☐ Pass ☐ Fail | | |
| 1.6 | Cross-Tab Sessions | ☐ Pass ☐ Fail | | |
| 2.1 | Agency Switcher | ☐ Pass ☐ Fail | | |
| 2.2 | Agency Context Switch | ☐ Pass ☐ Fail | | |
| 2.3 | Tasks Agency-Scoped | ☐ Pass ☐ Fail | | |
| 2.4 | Chat Messages Agency-Scoped | ☐ Pass ☐ Fail | | |
| 2.5 | Activity Logs Agency-Scoped | ☐ Pass ☐ Fail | | |
| 3.1 | Owner Access Goals | ☐ Pass ☐ Fail | | |
| 3.2 | Manager Cannot Access Goals | ☐ Pass ☐ Fail | | |
| 3.3 | Staff Cannot Access Goals | ☐ Pass ☐ Fail | | |
| 3.4 | Owner Manage Members | ☐ Pass ☐ Fail | | |
| 3.5 | Manager Invite Staff | ☐ Pass ☐ Fail | | |
| 3.6 | Staff No Member Access | ☐ Pass ☐ Fail | | |
| 4.1 | Staff Task Scoping | ☐ Pass ☐ Fail | | |
| 4.2 | Staff Cannot Edit Others | ☐ Pass ☐ Fail | | |
| 4.3 | Staff Cannot Delete Others | ☐ Pass ☐ Fail | | |
| 4.4 | Manager/Owner See All | ☐ Pass ☐ Fail | | |
| 5.1 | Create Invitation | ☐ Pass ☐ Fail | | |
| 5.2 | Accept Invitation - New User | ☐ Pass ☐ Fail | | |
| 5.3 | Accept Invitation - Existing | ☐ Pass ☐ Fail | | |
| 5.4 | Invitation Expires | ☐ Pass ☐ Fail | | |
| 5.5 | Invalid Token Error | ☐ Pass ☐ Fail | | |
| 6.1 | Real-Time Task Creation | ☐ Pass ☐ Fail | | |
| 6.2 | Real-Time Task Update | ☐ Pass ☐ Fail | | |
| 6.3 | Real-Time Chat Sync | ☐ Pass ☐ Fail | | |
| 6.4 | Messages Don't Leak Agencies | ☐ Pass ☐ Fail | | |
| 6.5 | Connection Indicator | ☐ Pass ☐ Fail | | |
| 7.1 | Cross-Agency 403 | ☐ Pass ☐ Fail | | |
| 7.2 | Invalid Session 401 | ☐ Pass ☐ Fail | | |
| 7.3 | User-Friendly Errors | ☐ Pass ☐ Fail | | |
| 7.4 | No Duplicate Creation | ☐ Pass ☐ Fail | | |
| 7.5 | Network Timeout | ☐ Pass ☐ Fail | | |
| 8.1 | Page Load Performance | ☐ Pass ☐ Fail | | |
| 8.2 | Real-Time Latency | ☐ Pass ☐ Fail | | |
| 8.3 | Memory Leaks | ☐ Pass ☐ Fail | | |
| 8.4 | Console Errors | ☐ Pass ☐ Fail | | |
| 8.5 | Concurrent Operations | ☐ Pass ☐ Fail | | |

### Overall Results

**Total Tests:** 45  
**Passed:** ___ / 45  
**Failed:** ___ / 45  
**Skipped:** ___ / 45

**Pass Rate:** ___%

**Critical Failures (Must Pass):**
- [ ] 1.1 - Login works
- [ ] 1.4 - Logout works
- [ ] 2.3 - Task isolation
- [ ] 2.4 - Message isolation
- [ ] 3.1 - Permission enforcement (Owner)
- [ ] 3.2 - Permission enforcement (Manager)
- [ ] 7.1 - Cross-agency security
- [ ] 7.2 - Session security

### Test Environment Details

- **Date Tested:** _______________
- **Tester Name:** _______________
- **Browser(s):** _______________
- **OS:** _______________
- **Environment:** Development / Staging / Production
- **Test Duration:** _____ hours
- **Notes/Issues:** _______________

---

## Appendix: Useful Debug Commands

### Check Agency Memberships
```sql
SELECT 
  u.name as user_name,
  a.name as agency_name,
  am.role,
  am.status
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
ORDER BY u.name, a.name;
```

### Check Permissions for a User
```sql
SELECT 
  u.name,
  a.name,
  am.role,
  am.permissions
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.name = 'Derrick';
```

### View All Invitations
```sql
SELECT 
  ai.email,
  a.name,
  ai.role,
  ai.expires_at,
  ai.accepted_at,
  CASE WHEN ai.accepted_at IS NOT NULL THEN 'Accepted' 
       WHEN ai.expires_at < NOW() THEN 'Expired'
       ELSE 'Pending' END as status
FROM agency_invitations ai
JOIN agencies a ON ai.agency_id = a.id
ORDER BY ai.created_at DESC;
```

### List All Tasks in Agency
```sql
SELECT 
  text,
  created_by,
  assigned_to,
  completed,
  created_at
FROM todos
WHERE agency_id = (SELECT id FROM agencies WHERE name = 'Bealer Agency')
ORDER BY created_at DESC;
```

### Check Session Validation
```javascript
// In DevTools Console:
fetch('/api/health').then(r => r.json()).then(console.log);
```

### Monitor Real-Time Events
```javascript
// Add to component to log real-time events:
useEffect(() => {
  const channel = supabase.channel('test-logging')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
      console.log('🔔 Real-time event:', payload.eventType, payload.new || payload.old);
    })
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, []);
```

---

**Last Updated:** 2026-02-03  
**Document Version:** 1.0  
**For Questions:** Contact QA Lead or Product Owner
