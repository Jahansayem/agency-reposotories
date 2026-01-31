# Task Recovery Guide

**Date:** 2026-01-31
**Issue:** Tasks appear to be missing from the app
**Analysis:** ✅ **Good News - No data loss detected!**

---

## 🎯 Quick Summary

**The tasks are NOT deleted** - they're still in the database! Here's what we found:

| Metric | Value | Status |
|--------|-------|--------|
| **Total tasks in database** | 102 | ✅ Present |
| **Tasks deleted since yesterday 5pm** | 0 | ✅ None |
| **Tasks created since yesterday 5pm** | 5 | ✅ Active |
| **Completed tasks** | 101 | ℹ️ May be hidden |
| **Incomplete tasks** | 1 | ⬜ Visible |

**Root Cause:** Tasks are likely **hidden by a filter** (completed tasks filter, date filter, or view settings).

---

## 🔍 Recovery Options (In Order of Ease)

### Option 1: Check UI Filters (Fastest - 30 seconds) ✅

The tasks are probably just filtered out in the UI.

**Steps:**
1. Open the app at `http://localhost:3000`
2. Check these filter settings:
   - **Show Completed toggle** - Make sure it's ON
   - **Date filter** - Make sure "All time" is selected
   - **View mode** - Try switching between List/Kanban views
   - **Search/filter bar** - Clear any search terms
   - **Archive view** - Check if tasks were archived

**Expected Result:** Tasks should reappear when filters are cleared.

---

### Option 2: Check Browser localStorage (1 minute)

If the app was showing tasks yesterday, your browser might have cached data.

**Steps:**
1. Open the app
2. Press `F12` to open DevTools
3. Go to **Application** tab → **Local Storage** → `http://localhost:3000`
4. Look for keys like:
   - `todoSession` - Your login session
   - Any keys containing "task" or "todo"

5. **Check for cached task data:**
```javascript
// Paste this in the Console tab:
console.log(localStorage.getItem('todoSession'));
// Look for any task-related data
```

---

### Option 3: Query Database Directly (2 minutes) ✅ **RECOMMENDED**

Since tasks are in the database, we can view them directly.

**View All Tasks (Including Completed):**

1. Go to [Supabase Dashboard](https://bzjssogezdnybbenqygq.supabase.co)
2. Login → **Table Editor** → `todos` table
3. Click **Filters** → Remove any filters
4. You should see all 102 tasks

**Or use SQL Editor:**
```sql
-- View all tasks created before yesterday 5pm
SELECT
  text,
  completed,
  created_at,
  created_by,
  assigned_to,
  priority,
  status
FROM todos
WHERE created_at <= '2026-01-31T01:00:00.000Z'
ORDER BY created_at DESC;
```

**Export tasks to CSV:**
1. Run the query above
2. Click **Download CSV**
3. Open in Excel to review

---

### Option 4: Check Activity Log (2 minutes)

The activity log shows all task operations.

**SQL Query:**
```sql
-- Check recent activity
SELECT
  action,
  todo_text,
  user_name,
  created_at,
  details
FROM activity_log
WHERE created_at >= '2026-01-30T00:00:00.000Z'
ORDER BY created_at DESC
LIMIT 100;
```

**What to look for:**
- `task_deleted` actions (we found 0 - good!)
- `task_updated` actions
- `task_completed` actions (might explain why tasks are "hidden")

---

### Option 5: Point-in-Time Recovery (Last Resort - 30 minutes)

**⚠️ WARNING:** This restores the ENTIRE database to yesterday 5pm. Only use if absolutely necessary.

**Prerequisites:**
- Supabase Pro plan (Free tier doesn't have point-in-time recovery)
- Database backups enabled

**Steps:**
1. Go to [Supabase Dashboard](https://bzjssogezdnybbenqygq.supabase.co)
2. **Database** → **Backups**
3. Select backup from yesterday at 5:00 PM
4. Click **Restore**
5. **WARNING:** This will overwrite all data since 5pm yesterday

**Before restoring:**
- Export current database state (backup)
- Notify all users (Derrick, Sefra)
- Document what you're restoring

---

## 🛠️ Debugging Steps

### Step 1: Verify Tasks Exist

Run this script:
```bash
npx tsx scripts/recover-tasks.ts
```

**Expected output:**
```
✅ Found 102 tasks in database
✅ 0 deleted since yesterday 5pm
✅ All tasks accounted for
```

### Step 2: Check UI State

Open browser console and run:
```javascript
// Check current filter state
const filterState = {
  showCompleted: /* check the toggle */,
  viewMode: /* list or kanban */,
  searchTerm: /* any search */
};
console.log('Current filters:', filterState);
```

### Step 3: Force Refresh

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then re-login and check if tasks appear.

---

## 📊 Database Analysis Results

### Current State
```
Total tasks: 102
Completed: 101
Incomplete: 1
```

### Tasks Created Before Yesterday 5pm
We found **50+ tasks** that existed at yesterday 5pm, including:

**Recent Tasks:**
1. "Call Susan Perry to explain billing changes email" (Completed)
2. "Provide umbrella insurance policy premium quote for renewal consideration" (Completed)
3. "Call Kay Via back regarding payment method issue VM 3:47pm 01/27/26" (Completed)
...and 47 more

**Only 1 Incomplete Task:**
- "Run quote for Robert Owens" (Created 1/26/2026, Created by Sefra)

**Analysis:** It looks like almost all tasks are marked as **completed**, which is why they might not be visible if there's a "hide completed tasks" filter active.

---

## 🎯 Most Likely Solution

Based on the data, here's what probably happened:

1. **101 out of 102 tasks are completed**
2. **UI filter is hiding completed tasks** (default behavior)
3. **Users only see 1 incomplete task** ("Run quote for Robert Owens")

**Quick Fix:**
1. Open the app
2. Find the **"Show Completed Tasks"** toggle
3. Turn it **ON**
4. All 102 tasks should appear

---

## 📝 Manual Recovery (If Needed)

If tasks are truly missing from the UI but present in the database:

### Create SQL Export

```sql
-- Export all tasks to recreate manually
SELECT
  text as "Task Description",
  priority as "Priority",
  assigned_to as "Assigned To",
  created_by as "Created By",
  to_char(created_at, 'YYYY-MM-DD HH24:MI') as "Created",
  to_char(due_date, 'YYYY-MM-DD') as "Due Date",
  notes as "Notes",
  completed as "Status"
FROM todos
WHERE created_at <= '2026-01-31T01:00:00.000Z'
ORDER BY created_at DESC;
```

**Save as CSV** and import back into the app if needed.

---

## 🔐 Supabase Dashboard Access

**URL:** https://bzjssogezdnybbenqygq.supabase.co
**Database:** `bzjssogezdnybbenqygq`

**Quick Links:**
- [Table Editor](https://supabase.com/dashboard/project/bzjssogezdnybbenqygq/editor)
- [SQL Editor](https://supabase.com/dashboard/project/bzjssogezdnybbenqygq/sql)
- [Backups](https://supabase.com/dashboard/project/bzjssogezdnybbenqygq/database/backups)

---

## ✅ Verification Checklist

After recovery, verify:

- [ ] All expected tasks are visible in the app
- [ ] Task details are correct (text, priority, assigned user)
- [ ] Completed/incomplete status is accurate
- [ ] Activity log shows recovery actions
- [ ] Real-time sync is working
- [ ] No duplicate tasks created

---

## 📞 Next Steps

1. **Try Option 1 first** (Check UI filters) - Takes 30 seconds
2. **If that doesn't work**, try Option 3 (Query database directly)
3. **Document which tasks are missing** - Get specific task names from Derrick/Sefra
4. **Check activity log** to see when they disappeared
5. **Contact me if none of these work** - We can investigate further

---

## 🐛 If This Is a Bug

If tasks are truly missing despite being in the database, this could be a UI rendering bug:

**Possible causes:**
- React state not syncing with database
- Real-time subscription not firing
- Filter state corrupted in localStorage
- Hydration mismatch (WebKit-related)

**Debug steps:**
1. Check browser console for errors
2. Verify real-time subscription is connected
3. Test in different browser (Chrome vs Safari)
4. Clear browser cache and cookies

---

## 📚 Related Documentation

- [CLAUDE.md](CLAUDE.md#database-schema-deep-dive) - Database schema
- [WEBKIT_ORCHESTRATION_REPORT.md](WEBKIT_ORCHESTRATION_REPORT.md) - Recent browser fixes
- [Supabase Real-Time Docs](https://supabase.com/docs/guides/realtime)

---

## 🎉 Summary

**Good news:** Your tasks are **NOT deleted**! They're all in the database (102 tasks total).

**Most likely cause:** UI filter hiding completed tasks (101 out of 102 are completed).

**Fastest fix:** Turn on "Show Completed Tasks" toggle in the app.

**Need help?** Contact Derrick or Sefra to confirm which specific tasks are "missing" so we can pinpoint the exact issue.

---

**Last Updated:** 2026-01-31
**Status:** Active
**Confidence:** 95% - Tasks are in database, likely UI filter issue
