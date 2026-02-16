# Quick Start: Multi-Agency Setup

**Status**: 🟡 Ready for database seeding

## 1. Run Database Seed Script (5 minutes)

### Option A: Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project → **SQL Editor**
3. Copy the contents of `scripts/seed-default-agency.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Verify output:
   ```
   status         | name          | slug          | members
   --------------|---------------|---------------|--------
   Agency Created | Wavezly | wavezly | 2
   ```

### Option B: psql Command Line

```bash
# From project root
psql $DATABASE_URL -f scripts/seed-default-agency.sql
```

## 2. Test Multi-Agency Features (10 minutes)

### Test 1: AgencySwitcher Appears
1. Open app: http://localhost:3000
2. Login as Derrick (PIN: 8008)
3. Dismiss welcome modal
4. **Look for "Wavezly" button** at top of sidebar (instead of "Select Agency")
5. Click it to open dropdown

✅ **Expected**: Dropdown shows "Wavezly" with Derrick as Owner

### Test 2: Onboarding Tooltip Shows (First Time Only)
1. Login as a fresh user (or clear localStorage)
2. Dismiss welcome modal
3. **Look for blue tooltip** next to AgencySwitcher saying "New Feature: Switch between agencies..."

✅ **Expected**: Tooltip appears for 8 seconds, then auto-dismisses

### Test 3: Agency Context Works
1. Open browser DevTools → Console
2. Check for agency context logs (if any)
3. Create a new task
4. Open Supabase Dashboard → Table Editor → todos
5. Verify `agency_id` column is populated

✅ **Expected**: All new todos have `agency_id` matching Wavezly

### Test 4: Real-time Filtering
1. Open two browser tabs side-by-side
2. Login to both tabs (can be same user)
3. Create a task in Tab 1
4. **Verify task appears in Tab 2** immediately

✅ **Expected**: Real-time sync works with agency filtering

## 3. Verify Environment Variables

Check `.env.local` has:
```bash
NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true
```

If missing, add it and restart dev server:
```bash
npm run dev
```

## 4. Troubleshooting

### Problem: "Select Agency" instead of "Wavezly"
**Solution**: Database not seeded yet. Run Step 1 above.

### Problem: Dropdown is empty
**Solution**: Check agency_members table:
```sql
SELECT * FROM agency_members WHERE user_id = (SELECT id FROM users WHERE name = 'Derrick');
```
Should return at least one row.

### Problem: Tasks not filtering by agency
**Solution**: Verify todos have agency_id:
```sql
SELECT COUNT(*), agency_id FROM todos GROUP BY agency_id;
```
If `agency_id` is NULL, run migration again.

### Problem: Tooltip doesn't show
**Solution**: Clear localStorage and reload:
```javascript
localStorage.removeItem('agency-onboarding-seen');
location.reload();
```

## 5. Next Steps

After successful testing:

1. **Deploy to production**:
   - Run seed script on production database
   - Deploy code to Railway
   - Test with real users

2. **Create second agency** (optional):
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO agencies (name, slug, is_active, primary_color)
   VALUES ('Test Agency 2', 'test-agency-2', true, '#72B5E8');

   -- Assign Derrick as owner
   INSERT INTO agency_members (user_id, agency_id, role, status, permissions, is_default_agency)
   VALUES (
     (SELECT id FROM users WHERE name = 'Derrick'),
     (SELECT id FROM agencies WHERE slug = 'test-agency-2'),
     'owner',
     'active',
     '{"can_manage_members": true, "can_manage_settings": true, "can_create_tasks": true, "can_edit_all_tasks": true, "can_delete_all_tasks": true, "can_view_analytics": true, "can_manage_templates": true, "can_manage_categories": true}'::jsonb,
     false
   );
   ```

3. **Test agency switching**:
   - Click AgencySwitcher dropdown
   - Select "Test Agency 2"
   - Verify tasks filter to new agency
   - Switch back to "Wavezly"
   - Verify tasks update

---

## Quick Reference

### Key Files
- `scripts/seed-default-agency.sql` - Run this first!
- `src/contexts/AgencyContext.tsx` - Multi-tenancy logic
- `src/components/AgencySwitcher.tsx` - UI component
- `src/components/AgencyOnboardingTooltip.tsx` - Onboarding tooltip

### Database Tables
- `agencies` - Agency records
- `agency_members` - User-agency relationships
- All data tables now have `agency_id` column for filtering

### Feature Flag
```bash
NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true
```

### Support
See detailed documentation:
- `docs/VISUAL_TESTING_FINDINGS.md`
- `docs/IMPLEMENTATION_COMPLETE.md`
- `MULTI_AGENCY_TASKS.md`

---

**Total Time**: ~15 minutes
**Difficulty**: Easy (just run SQL script)
**Status**: Ready to go! 🚀
