# Security Fixes SQL Diff Summary

This document shows the key SQL changes for the three critical multi-tenancy security fixes.

---

## Fix 1: Session-Wide GUC State (P0.2)

**File:** `supabase/migrations/20260220010000_fix_session_wide_guc_state.sql`

### Before (VULNERABLE)
```sql
-- Migration: 20260203040000_phase0_prerequisites.sql:31-43
CREATE OR REPLACE FUNCTION set_request_context(
  p_user_id UUID,
  p_user_name TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- ❌ VULNERABLE: Session-wide settings persist across requests in connection pooling
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), false);
  PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), false);
END;
$$ LANGUAGE plpgsql;
```

### After (FIXED)
```sql
-- Migration: 20260220010000_fix_session_wide_guc_state.sql
CREATE OR REPLACE FUNCTION set_request_context(
  p_user_id UUID,
  p_user_name TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- ✅ FIXED: Transaction-local settings auto-reset at transaction boundaries
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), true);
  PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;  -- ✅ Also added search_path protection
```

**Key Changes:**
- `is_local => false` → `is_local => true` (3 places)
- Added `SECURITY DEFINER` declaration
- Added `SET search_path = public, pg_temp`

---

## Fix 2: Security Audit Multi-Tenancy (P0.6)

**Files:**
- `supabase/migrations/20260220020000_fix_security_audit_multi_tenancy.sql`
- `src/app/api/security/events/route.ts`

### Database Changes

#### security_audit_log Table

**Before:**
```sql
-- Migration: 20260125_security_hardening.sql:143-155
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  user_id UUID,
  user_name TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  -- ❌ MISSING: agency_id column
);
```

**After:**
```sql
ALTER TABLE security_audit_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_security_audit_agency_created
  ON security_audit_log(agency_id, created_at DESC)
  WHERE agency_id IS NOT NULL;
```

#### auth_failure_log Table

**Before:**
```sql
-- Migration: 20260125_security_hardening.sql:342-351
CREATE TABLE IF NOT EXISTS auth_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_name TEXT,  -- ⚠️ Ambiguous name
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  -- ❌ MISSING: agency_id column
);
```

**After:**
```sql
ALTER TABLE auth_failure_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

ALTER TABLE auth_failure_log
  ADD COLUMN IF NOT EXISTS attempted_user TEXT;  -- ✅ More descriptive

CREATE INDEX IF NOT EXISTS idx_auth_failure_agency_created
  ON auth_failure_log(agency_id, created_at DESC)
  WHERE agency_id IS NOT NULL;
```

#### RLS Policies

**Before:**
```sql
-- Allows ANY admin to see ALL events across ALL agencies
CREATE POLICY "security_audit_select_admin"
  ON security_audit_log FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "auth_failure_select_admin"
  ON auth_failure_log FOR SELECT
  USING (auth.is_admin());
```

**After:**
```sql
-- ✅ Restricts to agency admins seeing only their agency's events
CREATE POLICY "security_audit_select_agency_admin"
  ON security_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_members am
      WHERE am.agency_id = security_audit_log.agency_id
        AND am.user_id = public.get_current_user_id()
        AND am.role IN ('owner', 'manager')
        AND am.status = 'active'
    )
  );

CREATE POLICY "auth_failure_select_agency_admin"
  ON auth_failure_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_members am
      WHERE am.agency_id = auth_failure_log.agency_id
        AND am.user_id = public.get_current_user_id()
        AND am.role IN ('owner', 'manager')
        AND am.status = 'active'
    )
  );
```

### API Changes

**Before (VULNERABLE):**
```typescript
// src/app/api/security/events/route.ts:44-64
const { data: auditLogs, error: auditError } = await supabase
  .from('security_audit_log')
  .select('*')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);
// ❌ No agency filter - returns ALL events

const { data: authFailures, error: authError } = await supabase
  .from('auth_failure_log')
  .select('*')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);
// ❌ No agency filter - returns ALL failures
```

**After (FIXED):**
```typescript
const { data: auditLogs, error: auditError } = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('agency_id', ctx.agencyId)  // ✅ Agency filter
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);

const { data: authFailures, error: authError } = await supabase
  .from('auth_failure_log')
  .select('*')
  .eq('agency_id', ctx.agencyId)  // ✅ Agency filter
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);
```

### New Helper Functions

```sql
-- ✅ NEW: Log security events with automatic agency context
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
  v_agency_id UUID;
BEGIN
  -- Automatically capture current context
  v_user_id := public.get_current_user_id();
  v_user_name := public.get_current_user_name();
  v_agency_id := public.current_agency_id();

  INSERT INTO security_audit_log (
    event_type, table_name, record_id,
    user_id, user_name, agency_id,
    old_data, new_data,
    ip_address, user_agent
  ) VALUES (
    p_event_type, p_table_name, p_record_id,
    v_user_id, v_user_name, v_agency_id,
    p_old_data, p_new_data,
    p_ip_address, p_user_agent
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

---

## Fix 3: SECURITY DEFINER Search Path (P1.8)

**File:** `supabase/migrations/20260220030000_fix_security_definer_search_path.sql`

### Example Function Fixes

#### is_agency_admin()

**Before:**
```sql
-- Migration: 20260126_multi_tenancy.sql
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM agency_members am  -- ❌ Unqualified table name
    WHERE am.agency_id = p_agency_id
      AND am.user_id = public.get_current_user_id()
      AND am.role IN ('owner', 'manager')
      AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
-- ❌ MISSING: SET search_path
```

**After:**
```sql
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.agency_members am  -- ✅ Schema-qualified
    WHERE am.agency_id = p_agency_id
      AND am.user_id = public.get_current_user_id()
      AND am.role IN ('owner', 'manager')
      AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;  -- ✅ Explicit search_path
```

#### accept_agency_invitation()

**Before:**
```sql
CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  SELECT * INTO v_invitation
  FROM agency_invitations  -- ❌ Unqualified
  WHERE token = p_token AND expires_at > NOW();

  INSERT INTO agency_members (...)  -- ❌ Unqualified
  VALUES (...);

  UPDATE agency_invitations SET ...  -- ❌ Unqualified
  WHERE id = v_invitation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ❌ MISSING: SET search_path
```

**After:**
```sql
CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  SELECT * INTO v_invitation
  FROM public.agency_invitations  -- ✅ Qualified
  WHERE token = p_token AND expires_at > NOW();

  INSERT INTO public.agency_members (...)  -- ✅ Qualified
  VALUES (...);

  UPDATE public.agency_invitations SET ...  -- ✅ Qualified
  WHERE id = v_invitation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;  -- ✅ Explicit search_path
```

#### validate_session_token()

**Before:**
```sql
CREATE OR REPLACE FUNCTION validate_session_token(p_token TEXT)
RETURNS TABLE(...) AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM sessions s  -- ❌ Unqualified
  WHERE s.token = p_token;

  SELECT * INTO v_user
  FROM users u  -- ❌ Unqualified
  WHERE u.id = v_session.user_id;

  SELECT am.agency_id, am.role INTO v_membership
  FROM agency_members am  -- ❌ Unqualified
  WHERE am.user_id = v_user.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ❌ MISSING: SET search_path
```

**After:**
```sql
CREATE OR REPLACE FUNCTION validate_session_token(p_token TEXT)
RETURNS TABLE(...) AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM public.sessions s  -- ✅ Qualified
  WHERE s.token = p_token;

  SELECT * INTO v_user
  FROM public.users u  -- ✅ Qualified
  WHERE u.id = v_session.user_id;

  SELECT am.agency_id, am.role INTO v_membership
  FROM public.agency_members am  -- ✅ Qualified
  WHERE am.user_id = v_user.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;  -- ✅ Explicit search_path
```

### Complete List of Functions Fixed

All 28 SECURITY DEFINER functions updated:

**Multi-tenancy (20260126_multi_tenancy.sql):**
- `user_agency_ids(UUID)`
- `is_agency_owner(UUID)`
- `is_agency_admin(UUID)`
- `get_user_agency_role(UUID)`
- `current_agency_id()`
- `accept_agency_invitation(TEXT, UUID)`
- `create_agency_with_owner(TEXT, TEXT, UUID)`

**Auth/Security (20260114_security_improvements.sql):**
- `auth.user_id()`
- `auth.is_admin()`
- `public.get_user_id()`
- `public.get_user_name()`
- `public.is_admin()`
- `public.rls_enabled()`
- `log_auth_event(TEXT, UUID, TEXT, BOOLEAN)`
- `check_rate_limit(UUID, TEXT, INTEGER, INTEGER)`
- `record_rate_limit_hit(UUID, TEXT)`
- `cleanup_old_sessions()`

**Session Management (20260125_security_hardening.sql):**
- `log_session_validation(TEXT, UUID, BOOLEAN, TEXT)`
- `cleanup_expired_sessions()`

**Role System (20260203050000_phase1_database_foundation.sql):**
- `public.is_admin()` (overload)
- `public.has_permission(TEXT)`
- `validate_session_token(TEXT)`

**Messages (20260120_mark_message_read.sql):**
- `mark_message_as_read(UUID, UUID)`

**Context (20260220010000_fix_session_wide_guc_state.sql):**
- `set_request_context(UUID, TEXT, UUID)`

**Audit Logging (20260220020000_fix_security_audit_multi_tenancy.sql):**
- `log_security_event(TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT)`
- `log_auth_failure(TEXT, TEXT, INET, TEXT, TEXT, JSONB)`

---

## Summary of Changes

| Fix | Files Changed | SQL Lines Changed | Breaking Changes |
|-----|---------------|-------------------|------------------|
| P0.2 (GUC State) | 1 migration | ~60 | No |
| P0.6 (Audit Multi-tenancy) | 1 migration + 1 API | ~200 | Yes (API behavior) |
| P1.8 (Search Path) | 1 migration | ~500 | No (backward compatible) |
| **Total** | **3 migrations + 1 API** | **~760** | **Minor** |

### Impact Summary

- **3 new migration files** created
- **1 API endpoint** modified
- **28 SECURITY DEFINER functions** hardened
- **2 database tables** altered (agency_id added)
- **4 new RLS policies** created
- **2 new helper functions** for logging
- **2 new indexes** for agency-scoped queries

All changes are backward compatible except for the API endpoint filtering (which is the desired security fix).
