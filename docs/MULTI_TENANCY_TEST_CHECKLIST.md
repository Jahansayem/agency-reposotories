# Multi-Tenancy Testing Checklist

## Quick Verification (Automated Tests Passed)

All 28 automated database tests passed:

- [x] agencies table exists
- [x] agency_members table exists
- [x] agency_invitations table exists
- [x] users table has email column
- [x] todos/messages have agency_id column
- [x] Bealer Agency created with professional tier
- [x] Derrick is owner with full permissions
- [x] All users are agency members
- [x] All 91 todos assigned to Bealer Agency
- [x] Permissions correctly set (owner vs member)
- [x] Data isolation works (agency-scoped queries)
- [x] Invitation flow works

---

## Manual Testing Checklist

### 1. Login & Agency Context

Start the dev server:
```bash
npm run dev
```

Open http://localhost:3000 (or the port shown)

- [ ] Login as Derrick (PIN: 8008)
- [ ] **Verify**: Agency switcher appears in sidebar header
- [ ] **Verify**: Shows "Bealer Agency" as current agency
- [ ] **Verify**: Crown icon shows owner role

### 2. Agency Switcher (Multi-Agency Users)

Currently all users are in one agency. To test switching:

1. Create a test agency via the database or signup flow
2. Add Derrick to the test agency
3. Test switching between agencies

- [ ] Dropdown shows all agencies user belongs to
- [ ] Can switch agencies
- [ ] Data refreshes after switch
- [ ] Selection persists on page reload

### 3. Signup Flow (New Agency Creation)

Navigate to http://localhost:3000/signup

- [ ] Step 1: Account creation form works
- [ ] Step 2: Agency details form works
- [ ] Step 3: Team invitation form works
- [ ] Agency is created in database
- [ ] Creator becomes owner
- [ ] Can login to new agency

### 4. Invitation Flow

1. Create an invitation via database:
```sql
INSERT INTO agency_invitations (agency_id, email, role, token, invited_by)
VALUES (
  (SELECT id FROM agencies WHERE slug = 'bealer-agency'),
  'test@example.com',
  'member',
  'test-invite-token-123',
  (SELECT id FROM users WHERE name = 'Derrick')
);
```

2. Navigate to http://localhost:3000/join/test-invite-token-123

- [ ] Invitation details shown
- [ ] Can accept invitation
- [ ] Membership created
- [ ] Can access agency after joining

### 5. Data Isolation

With two agencies:

- [ ] Tasks from Agency A not visible in Agency B
- [ ] Messages from Agency A not visible in Agency B
- [ ] Templates scoped to correct agency
- [ ] Activity logs scoped to correct agency

### 6. Permission Enforcement

As owner (Derrick):
- [ ] Can access Strategic Goals
- [ ] Can delete tasks
- [ ] Can invite users (if UI exists)

As member (Sefra):
- [ ] Cannot access Strategic Goals
- [ ] Cannot delete tasks
- [ ] Cannot invite users

### 7. Real-Time Updates

Open two browser windows logged into same agency:

- [ ] Create task in window 1 → appears in window 2
- [ ] Complete task in window 1 → updates in window 2
- [ ] Send chat message → appears in other window

---

## Feature Flag Test

To disable multi-tenancy:

1. Edit `.env.local`:
```
NEXT_PUBLIC_ENABLE_MULTI_TENANCY=false
```

2. Restart dev server

- [ ] AgencySwitcher does not appear
- [ ] App works in single-tenant mode
- [ ] All data still accessible

---

## Troubleshooting

### AgencySwitcher not showing
1. Check `NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true` in `.env.local`
2. Restart dev server after changing env
3. Clear browser cache/localStorage

### User not seeing agency
1. Check `agency_members` table for user's membership
2. Verify `status = 'active'`
3. Check browser console for errors

### Todos not scoped correctly
1. Verify `agency_id` is set on todos
2. Run verification script:
```bash
node scripts/verify-migration.mjs
```

---

## Scripts

```bash
# Run automated database tests
node scripts/test-multi-tenancy.mjs

# Verify migration status
node scripts/verify-migration.mjs

# Test API endpoints
node scripts/test-api.mjs
```
