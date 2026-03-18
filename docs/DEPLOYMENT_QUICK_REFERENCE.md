# Security Fixes Deployment Quick Reference

**⚠️ CRITICAL: Read this before deploying to production**

---

## Pre-Flight Checklist

```bash
# 1. Backup database
pg_dump -h <host> -U postgres -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify staging tests passed
npm run test
npm run test:e2e

# 3. Check migration files exist
ls -l supabase/migrations/20260220*.sql
# Should show:
# 20260220010000_fix_session_wide_guc_state.sql
# 20260220020000_fix_security_audit_multi_tenancy.sql
# 20260220030000_fix_security_definer_search_path.sql
```

---

## Deployment Commands

### Step 1: Run Migrations (5-10 min)

```bash
# Connect to database
psql <connection-string>

# Run migrations IN ORDER
\i supabase/migrations/20260220010000_fix_session_wide_guc_state.sql
# Expect: ✅ Session-wide GUC state fix verified successfully

\i supabase/migrations/20260220020000_fix_security_audit_multi_tenancy.sql
# Expect: ✅ Security audit multi-tenancy fix verified successfully
# Expect: ⚠️ WARNING: Existing audit logs have NULL agency_id (NORMAL)

\i supabase/migrations/20260220030000_fix_security_definer_search_path.sql
# Expect: ✅ All X SECURITY DEFINER functions have search_path protection
# Expect: ✅ SECURITY DEFINER search_path migration complete
```

### Step 2: Verify Migrations

```sql
-- Check columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'security_audit_log' AND column_name = 'agency_id';
-- Expect: 1 row

SELECT column_name FROM information_schema.columns
WHERE table_name = 'auth_failure_log' AND column_name = 'agency_id';
-- Expect: 1 row

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('security_audit_log', 'auth_failure_log')
  AND policyname LIKE '%agency_admin%';
-- Expect: 2 rows

-- Check SECURITY DEFINER functions have search_path
SELECT count(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname IN ('public', 'auth')
  AND p.proname NOT LIKE 'pg_%'
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
  ));
-- Expect: 0 (all functions have search_path)
```

### Step 3: Deploy API Changes

```bash
# Deploy updated code
git pull origin main
npm run build
vercel --prod  # or your deployment command
```

---

## Post-Deployment Verification (15 min)

### Test 1: Context Isolation

```typescript
// Run in browser console or API client
// User from Agency A
const responseA = await fetch('/api/todos', {
  headers: { 'x-agency-id': 'agency-a-id', 'Authorization': '...' }
});
console.log(await responseA.json());  // Should only see Agency A tasks

// User from Agency B (different session/connection)
const responseB = await fetch('/api/todos', {
  headers: { 'x-agency-id': 'agency-b-id', 'Authorization': '...' }
});
console.log(await responseB.json());  // Should only see Agency B tasks
```

### Test 2: Security Events API

```typescript
// Agency A admin
const events = await fetch('/api/security/events?hours=24', {
  headers: { 'x-agency-id': 'agency-a-id', 'Authorization': '...' }
});
const data = await events.json();
console.log(data.data.recentAuditLogs);
// Should only contain Agency A events (check agency_id field)
```

### Test 3: Database Queries

```sql
-- No cross-agency access in recent logs
SELECT user_id, COUNT(DISTINCT agency_id) as agency_count
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(DISTINCT agency_id) > 1;
-- Expect: 0 rows

-- New audit logs have agency_id populated
SELECT COUNT(*) FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND agency_id IS NOT NULL;
-- Expect: > 0 (if any activity in last 5 min)
```

---

## Monitoring Commands (24-48 hours)

```bash
# API error rate
tail -f /var/log/app.log | grep "security/events"
# Watch for 500 errors (should be 0)

# Database performance
SELECT schemaname, tablename, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_security_audit%' OR indexrelname LIKE 'idx_auth_failure%'
ORDER BY idx_scan DESC;
# Verify indexes being used

# Connection pool stats (if using pgBouncer)
SHOW POOLS;
# Watch for connection churn or exhaustion
```

---

## Rollback (Emergency Only)

**⚠️ Only use if production is broken. Rollback re-introduces vulnerabilities.**

```bash
# 1. Revert API deployment
git revert <commit-hash>
vercel --prod

# 2. Revert migrations (reverse order)
psql <connection-string>
```

```sql
-- Rollback migration 3
DROP FUNCTION IF EXISTS public.set_request_context(UUID, TEXT, UUID);
-- Re-create old version from 20260203040000_phase0_prerequisites.sql

-- Rollback migration 2
ALTER TABLE security_audit_log DROP COLUMN IF EXISTS agency_id;
ALTER TABLE auth_failure_log DROP COLUMN IF EXISTS agency_id;
ALTER TABLE auth_failure_log DROP COLUMN IF EXISTS attempted_user;

DROP FUNCTION IF EXISTS log_security_event(TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS log_auth_failure(TEXT, TEXT, INET, TEXT, TEXT, JSONB);

DROP POLICY IF EXISTS security_audit_select_agency_admin ON security_audit_log;
DROP POLICY IF EXISTS auth_failure_select_agency_admin ON auth_failure_log;

-- Re-create old policies
CREATE POLICY "security_audit_select_admin" ON security_audit_log FOR SELECT USING (auth.is_admin());
CREATE POLICY "auth_failure_select_admin" ON auth_failure_log FOR SELECT USING (auth.is_admin());

-- Rollback migration 1 (already reverted by re-creating old function above)
```

```bash
# 3. Verify rollback
psql <connection-string> -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'security_audit_log' AND column_name = 'agency_id';"
# Expect: 0 rows (column removed)

# 4. Notify team
# Post to incident channel: "Security fixes rolled back due to [reason]. Vulnerabilities are ACTIVE."
```

---

## Expected Behavior Changes

### Normal (Not Bugs)

- Agency admins see fewer security events (only their agency) ✅
- Old audit logs show `agency_id: null` in API responses ✅
- Some SECURITY DEFINER function signatures unchanged (search_path is internal) ✅

### Potential Issues (Investigate)

- API returns 403 for `/api/security/events` → Check auth token validity
- API returns 500 for `/api/security/events` → Check database connection
- Queries slow (> 100ms) → Check index usage with EXPLAIN ANALYZE
- Cross-agency data visible → **CRITICAL** - Rollback immediately

---

## Performance Benchmarks

Expected before/after metrics:

| Metric | Before | After | Acceptable Range |
|--------|--------|-------|------------------|
| `/api/security/events` response time | 10-20ms | 15-25ms | < 50ms |
| Context set overhead | 0ms | 0.1ms | < 1ms |
| Index scan ratio | 95% | 98% | > 90% |
| Memory usage | 100MB | 105MB | < 120MB |

---

## Emergency Contacts

- **On-Call:** [Your on-call rotation]
- **Database:** [DBA contact]
- **Security:** [Security team]
- **Escalation:** [Manager/Lead]

---

## Quick Decisions

**Scenario: API errors spike after deployment**
→ Check error logs → If 500s, consider rollback → If 403s, wait 15min for token refresh

**Scenario: Database slow queries**
→ Run EXPLAIN ANALYZE → Check index usage → REINDEX if needed → Rollback if degraded

**Scenario: Cross-agency data visible**
→ **ROLLBACK IMMEDIATELY** → Notify security team → Investigate root cause

**Scenario: Old audit logs not visible**
→ Expected if RLS strict → Add NULL check to RLS policy if needed

---

## Success Criteria

Deployment is successful when:

- [x] All three migrations run without errors
- [x] Verification queries return expected results
- [x] Test suite passes (unit + E2E)
- [x] API returns agency-scoped events only
- [x] No cross-agency data access detected (monitoring query returns 0)
- [x] Performance within acceptable range
- [x] No 500 errors in logs
- [x] Team notified of completion

---

**Last Updated:** 2026-02-20
**Version:** 1.0
**Status:** Ready for Production
