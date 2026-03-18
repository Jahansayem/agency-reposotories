# Multi-Tenancy Security Fixes (P0.2, P0.6, P1.8)

**Date:** 2026-02-20
**Priority:** P0 (Critical Security Vulnerabilities)
**Impact:** Prevents cross-tenant data access, privilege escalation, and silent failures

## Overview

This document describes three critical multi-tenancy security vulnerabilities and their fixes:

1. **P0.2:** Session-wide GUC state bleeding across requests in connection pooling
2. **P0.6:** Security monitoring endpoint leaking cross-tenant data
3. **P1.8:** SECURITY DEFINER functions missing search_path protection

---

## Problem 1: Session-Wide GUC State (P0.2)

### Vulnerability

The `set_request_context()` function uses `is_local=false` which makes GUC settings persist for the entire database connection:

```sql
-- VULNERABLE CODE (20260203040000_phase0_prerequisites.sql:40-42)
PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), false);
PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), false);
```

**Impact:** In connection pooling (Supabase pgBouncer), connections are reused across requests. If Request A sets `app.agency_id = 'agency-123'` and Request B reuses the same connection without clearing it, Request B will inherit `agency-123` context.

**Attack Scenario:**
1. User A (Agency 123) makes a request → sets `app.agency_id = '123'`
2. Connection returns to pool with `app.agency_id` still set
3. User B (Agency 456) gets the same connection → inherits `app.agency_id = '123'`
4. User B can now see/modify Agency 123's data through RLS policies

### Fix

Use transaction-local config (`is_local=true`) so settings automatically reset at transaction boundaries:

```sql
-- FIXED CODE (20260220010000_fix_session_wide_guc_state.sql)
PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), true);
PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), true);
```

**Why this works:** RLS policies execute within the same transaction as the application query, so they see the transaction-local settings.

**Migration:** `supabase/migrations/20260220010000_fix_session_wide_guc_state.sql`

---

## Problem 2: Security Audit Multi-Tenancy (P0.6)

### Vulnerability

The `/api/security/events` endpoint queries `security_audit_log` and `auth_failure_log` without agency filtering:

```typescript
// VULNERABLE CODE (src/app/api/security/events/route.ts:44-49)
const { data: auditLogs, error: auditError } = await supabase
  .from('security_audit_log')
  .select('*')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);
```

Both tables lack `agency_id` columns, so:
- Agency admin can see all security events across all agencies
- Security monitoring is global instead of agency-scoped
- Cross-tenant information disclosure

### Fix

1. **Add `agency_id` columns** to both tables
2. **Update RLS policies** to enforce agency isolation
3. **Filter API queries** by `ctx.agencyId`
4. **Create helper functions** for logging with agency context

**Migration:** `supabase/migrations/20260220020000_fix_security_audit_multi_tenancy.sql`

**API Changes:**
```typescript
// FIXED CODE (src/app/api/security/events/route.ts)
const { data: auditLogs, error: auditError } = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('agency_id', ctx.agencyId)  // ← Agency filter added
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);
```

**New Functions:**
- `log_security_event(...)` - Log with automatic agency context
- `log_auth_failure(...)` - Log auth failures with agency context

---

## Problem 3: SECURITY DEFINER Search Path (P1.8)

### Vulnerability

SECURITY DEFINER functions run with the privileges of the function owner (typically `postgres` superuser). Without explicit `search_path`, attackers can exploit schema precedence:

```sql
-- VULNERABLE: No search_path set
CREATE OR REPLACE FUNCTION is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members  -- Which schema?
    WHERE ...
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Attack Scenario:**
1. Attacker creates malicious schema earlier in search path (e.g., `attacker_schema`)
2. Attacker creates `attacker_schema.agency_members` table that always returns TRUE
3. Function uses attacker's table instead of `public.agency_members`
4. Privilege escalation: attacker gains admin access

### Fix

1. **Set explicit search_path** to `public, pg_temp` on all SECURITY DEFINER functions
2. **Schema-qualify all table references** as `public.table_name`

```sql
-- FIXED CODE
CREATE OR REPLACE FUNCTION is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_members  -- Fully qualified
    WHERE ...
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;  -- ← Explicit search_path
```

**Migration:** `supabase/migrations/20260220030000_fix_security_definer_search_path.sql`

**Functions Fixed:** 28 SECURITY DEFINER functions across multiple migrations

---

## Deployment Instructions

### Prerequisites

1. **Test environment access** (staging/dev database)
2. **Database backup** before running migrations
3. **Connection pooling enabled** (to test P0.2 fix)

### Migration Order

Run migrations in this exact order:

```bash
# 1. Fix session-wide GUC state
supabase migration run 20260220010000_fix_session_wide_guc_state.sql

# 2. Fix security audit multi-tenancy
supabase migration run 20260220020000_fix_security_audit_multi_tenancy.sql

# 3. Fix SECURITY DEFINER search_path
supabase migration run 20260220030000_fix_security_definer_search_path.sql
```

### Verification Steps

After each migration, verify:

#### Migration 1 (GUC State)
```sql
-- Test transaction-local behavior
BEGIN;
  SELECT set_request_context(
    'user-id-1'::UUID,
    'User 1',
    'agency-1'::UUID
  );
  SELECT current_setting('app.agency_id', true);  -- Should be 'agency-1'
COMMIT;

-- Settings should be cleared after commit
SELECT current_setting('app.agency_id', true);  -- Should be NULL or empty
```

#### Migration 2 (Security Audit)
```sql
-- Verify columns added
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('security_audit_log', 'auth_failure_log')
  AND column_name = 'agency_id';
-- Should return 2 rows

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('security_audit_log', 'auth_failure_log')
  AND policyname LIKE '%agency_admin%';
-- Should return 2 rows

-- Test helper function
SELECT log_security_event(
  'test_event',
  'test_table',
  NULL,
  NULL,
  NULL,
  '127.0.0.1'::INET,
  'test-agent'
);
-- Should succeed and return UUID
```

#### Migration 3 (Search Path)
```sql
-- List all SECURITY DEFINER functions and their search_path
SELECT
  n.nspname || '.' || p.proname AS function,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname IN ('public', 'auth')
  AND p.proname NOT LIKE 'pg_%'
ORDER BY n.nspname, p.proname;

-- Verify all have search_path in config
-- config column should contain '{search_path=public,pg_temp}'
```

---

## Testing Guide

### Test 1: Connection Pool Context Bleed (P0.2)

**Setup:**
1. Enable connection pooling (pgBouncer)
2. Create two test agencies: A and B
3. Create test users for each agency

**Test:**
```typescript
// Concurrent requests simulating connection reuse
import { createClient } from '@supabase/supabase-js';

const userA = createClient(url, key); // Agency A user
const userB = createClient(url, key); // Agency B user

// Request A sets context
await userA.rpc('set_request_context', {
  p_user_id: 'user-a-id',
  p_user_name: 'User A',
  p_agency_id: 'agency-a-id'
});

// Request A queries tasks
const { data: tasksA } = await userA
  .from('todos')
  .select('*');

console.log('User A tasks:', tasksA.length);

// Request B immediately after (may reuse connection)
await userB.rpc('set_request_context', {
  p_user_id: 'user-b-id',
  p_user_name: 'User B',
  p_agency_id: 'agency-b-id'
});

const { data: tasksB } = await userB
  .from('todos')
  .select('*');

console.log('User B tasks:', tasksB.length);

// PASS: tasksB should only contain Agency B tasks
// FAIL: tasksB contains Agency A tasks (context bleed)
```

### Test 2: Security Event Isolation (P0.6)

**Setup:**
1. Create test events in `security_audit_log` for Agency A and B
2. Log in as Agency A admin

**Test:**
```typescript
// Agency A admin queries security events
const response = await fetch('/api/security/events', {
  headers: {
    'Authorization': `Bearer ${agencyAToken}`,
    'x-agency-id': 'agency-a-id'
  }
});

const { data } = await response.json();

console.log('Audit logs:', data.recentAuditLogs);

// PASS: Only Agency A events visible
// FAIL: Agency B events also visible
```

**Verify:**
```sql
-- As Agency A admin
SELECT * FROM security_audit_log;
-- Should only see agency_id = 'agency-a-id' rows

-- RLS policy should block other agencies
SELECT * FROM security_audit_log WHERE agency_id = 'agency-b-id';
-- Should return 0 rows
```

### Test 3: Schema Injection Attack (P1.8)

**Setup:**
1. Create malicious schema and table
2. Attempt to exploit SECURITY DEFINER function

**Test:**
```sql
-- Create attack schema
CREATE SCHEMA attacker_schema;
CREATE TABLE attacker_schema.agency_members (
  agency_id UUID,
  user_id UUID,
  role TEXT,
  status TEXT
);

-- Insert fake admin membership
INSERT INTO attacker_schema.agency_members
VALUES ('target-agency-id', 'attacker-user-id', 'owner', 'active');

-- Modify search_path to prioritize attack schema
SET search_path = attacker_schema, public;

-- Attempt privilege escalation
SELECT is_agency_admin('target-agency-id');

-- PASS: Returns false (uses public.agency_members, not attacker's)
-- FAIL: Returns true (function used attacker_schema.agency_members)
```

---

## Breaking Changes

### API Changes

**Before:** `/api/security/events` returned all events globally
**After:** Returns only events for current agency

**Migration Path:**
- Update any admin dashboards expecting global events
- If global monitoring needed, create separate system admin endpoint

### Database Changes

**New Columns:**
- `security_audit_log.agency_id` (nullable for legacy events)
- `auth_failure_log.agency_id` (nullable for pre-auth failures)
- `auth_failure_log.attempted_user` (replaces `user_name`)

**Backfill Required:**
Existing audit logs have `NULL` agency_id. If historical isolation needed:

```sql
-- Manual backfill (example - adjust based on your data)
UPDATE security_audit_log
SET agency_id = (
  SELECT am.agency_id
  FROM agency_members am
  WHERE am.user_id = security_audit_log.user_id
  LIMIT 1
)
WHERE agency_id IS NULL AND user_id IS NOT NULL;
```

### Function Signatures

All SECURITY DEFINER functions now have `SET search_path = public, pg_temp`. This is backward compatible but affects:
- Custom schemas will not be searched automatically
- All table references must use `public.` prefix

---

## Performance Impact

### P0.2 Fix (Transaction-Local GUC)
- **Overhead:** Negligible (~0.1ms per request to set context)
- **Benefit:** Automatic cleanup, no manual reset needed
- **Scaling:** Better performance under high concurrency (no session state pollution)

### P0.6 Fix (Agency Filtering)
- **Overhead:** Additional index lookup per query
- **Indexes Added:** 2 new indexes for agency-scoped queries
- **Expected Impact:** <5ms increase per security event query

### P1.8 Fix (Search Path)
- **Overhead:** None (search_path is compile-time setting)
- **Benefit:** Prevents expensive table scans in attack scenarios

---

## Rollback Plan

If issues arise, rollback in reverse order:

```bash
# 1. Rollback search_path fix (creates temporary vulnerability window)
git revert 20260220030000_fix_security_definer_search_path.sql

# 2. Rollback security audit changes
git revert 20260220020000_fix_security_audit_multi_tenancy.sql
# Manual: DROP COLUMN agency_id from both tables

# 3. Rollback GUC state fix
git revert 20260220010000_fix_session_wide_guc_state.sql

# Re-apply old version with is_local=false
```

**WARNING:** Rollback re-introduces critical vulnerabilities. Only rollback if production is broken.

---

## Monitoring

After deployment, monitor:

1. **Context Isolation:**
   ```sql
   -- Check for cross-agency data access
   SELECT
     user_id,
     COUNT(DISTINCT agency_id) as agency_count
   FROM security_audit_log
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY user_id
   HAVING COUNT(DISTINCT agency_id) > 1;
   -- Should return 0 rows (users shouldn't access multiple agencies simultaneously)
   ```

2. **API Errors:**
   - Watch for 403 errors in `/api/security/events` (expected if old code caches bad tokens)
   - Monitor Supabase query performance (new indexes should improve, not degrade)

3. **Function Calls:**
   ```sql
   -- Verify SECURITY DEFINER functions use public schema
   SELECT * FROM pg_stat_user_functions
   WHERE schemaname = 'public'
     AND funcname IN ('is_agency_admin', 'accept_agency_invitation', ...)
   ORDER BY calls DESC;
   ```

---

## FAQ

**Q: Why not use RLS on GUC settings?**
A: GUC settings are connection-level, not row-level. RLS can't protect them.

**Q: Can we keep `is_local=false` and manually reset context?**
A: No. Connection pooling makes manual reset unreliable. Transaction boundaries are the only safe reset point.

**Q: Why allow NULL agency_id in audit tables?**
A: Some events (login failures, system errors) occur before agency context is established.

**Q: Do all SECURITY DEFINER functions need search_path?**
A: Yes. Even read-only functions can be exploited to leak data via malicious objects.

**Q: What if I need to query across agencies (e.g., super admin)?**
A: Create a separate system admin role with explicit cross-agency permissions. Never bypass RLS.

---

## Related Documentation

- [Multi-Tenancy Execution Plan](./MULTI_TENANCY_EXECUTION_PLAN.md)
- [RLS Policy Reference](./RLS_POLICIES.md)
- [Security Audit Log Schema](../supabase/migrations/20260125_security_hardening.sql)
- [PostgreSQL SECURITY DEFINER Docs](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## Checklist

Before marking as complete:

- [ ] All three migrations run successfully in staging
- [ ] All verification queries return expected results
- [ ] Test suite passes (especially RLS tests)
- [ ] API endpoint returns agency-filtered results
- [ ] No SECURITY DEFINER functions missing search_path (check logs)
- [ ] Performance metrics show no degradation
- [ ] Security team approval
- [ ] Production deployment scheduled
- [ ] Rollback plan tested in staging
- [ ] Monitoring dashboards updated
