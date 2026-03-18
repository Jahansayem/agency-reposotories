-- ============================================================================
-- Migration: Fix Security Audit Multi-Tenancy (P0.6)
-- Date: 2026-02-20
-- Description:
--   Adds agency_id columns to security_audit_log and auth_failure_log tables
--   to prevent cross-tenant data leakage in security monitoring endpoint.
--
-- Problem:
--   The /api/security/events endpoint queries security_audit_log and
--   auth_failure_log without agency filtering. These tables lack agency_id
--   columns, causing cross-tenant data exposure.
--
-- Solution:
--   1. Add agency_id column to both tables
--   2. Update RLS policies to enforce agency isolation
--   3. Create indexes for efficient agency-scoped queries
--   4. Backfill existing records with NULL (will need manual cleanup)
--
-- References:
--   - src/app/api/security/events/route.ts
--   - supabase/migrations/20260125_security_hardening.sql
-- ============================================================================

-- ============================================================================
-- Add agency_id to security_audit_log
-- ============================================================================

ALTER TABLE security_audit_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Index for agency-scoped queries
CREATE INDEX IF NOT EXISTS idx_security_audit_agency_created
  ON security_audit_log(agency_id, created_at DESC)
  WHERE agency_id IS NOT NULL;

-- Update RLS policies for multi-tenancy
DROP POLICY IF EXISTS "security_audit_select_admin" ON security_audit_log;

CREATE POLICY "security_audit_select_agency_admin"
  ON security_audit_log FOR SELECT
  USING (
    -- Allow if user is admin of the agency
    EXISTS (
      SELECT 1 FROM agency_members am
      WHERE am.agency_id = security_audit_log.agency_id
        AND am.user_id = public.get_current_user_id()
        AND am.role IN ('owner', 'manager')
        AND am.status = 'active'
    )
  );

COMMENT ON COLUMN security_audit_log.agency_id IS
  'Agency context for multi-tenancy isolation. NULL for legacy/system events.';

-- ============================================================================
-- Add agency_id to auth_failure_log
-- ============================================================================

ALTER TABLE auth_failure_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Add attempted_user column (renamed from user_name for clarity)
ALTER TABLE auth_failure_log
  ADD COLUMN IF NOT EXISTS attempted_user TEXT;

-- Migrate existing user_name to attempted_user
UPDATE auth_failure_log
  SET attempted_user = user_name
  WHERE attempted_user IS NULL AND user_name IS NOT NULL;

-- Index for agency-scoped queries
CREATE INDEX IF NOT EXISTS idx_auth_failure_agency_created
  ON auth_failure_log(agency_id, created_at DESC)
  WHERE agency_id IS NOT NULL;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_auth_failure_attempted_user
  ON auth_failure_log(attempted_user)
  WHERE attempted_user IS NOT NULL;

-- Update RLS policies for multi-tenancy
DROP POLICY IF EXISTS "auth_failure_select_admin" ON auth_failure_log;

CREATE POLICY "auth_failure_select_agency_admin"
  ON auth_failure_log FOR SELECT
  USING (
    -- Allow if user is admin of the agency
    EXISTS (
      SELECT 1 FROM agency_members am
      WHERE am.agency_id = auth_failure_log.agency_id
        AND am.user_id = public.get_current_user_id()
        AND am.role IN ('owner', 'manager')
        AND am.status = 'active'
    )
  );

COMMENT ON COLUMN auth_failure_log.agency_id IS
  'Agency context for multi-tenancy isolation. NULL for global auth failures (no agency context).';

COMMENT ON COLUMN auth_failure_log.attempted_user IS
  'Username or identifier attempted during failed auth. May be NULL for anonymous attempts.';

-- ============================================================================
-- Helper function to log security events with agency context
-- ============================================================================

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
  -- Get current context
  v_user_id := public.get_current_user_id();
  v_user_name := public.get_current_user_name();
  v_agency_id := public.current_agency_id();

  INSERT INTO security_audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    user_name,
    agency_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    p_table_name,
    p_record_id,
    v_user_id,
    v_user_name,
    v_agency_id,
    p_old_data,
    p_new_data,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION log_security_event(TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT) IS
  'Log security event with automatic agency context. Returns audit log ID.';

GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT) TO authenticated;

-- ============================================================================
-- Helper function to log auth failures with agency context
-- ============================================================================

CREATE OR REPLACE FUNCTION log_auth_failure(
  p_event_type TEXT,
  p_attempted_user TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get current agency context (may be NULL for pre-auth failures)
  v_agency_id := public.current_agency_id();

  INSERT INTO auth_failure_log (
    event_type,
    attempted_user,
    agency_id,
    ip_address,
    user_agent,
    endpoint,
    details
  ) VALUES (
    p_event_type,
    p_attempted_user,
    v_agency_id,
    p_ip_address,
    p_user_agent,
    p_endpoint,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION log_auth_failure(TEXT, TEXT, INET, TEXT, TEXT, JSONB) IS
  'Log authentication failure with agency context. Returns log ID.';

GRANT EXECUTE ON FUNCTION log_auth_failure(TEXT, TEXT, INET, TEXT, TEXT, JSONB) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify security_audit_log has agency_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'security_audit_log' AND column_name = 'agency_id'
  ) THEN
    RAISE EXCEPTION 'Verification failed: security_audit_log.agency_id not found';
  END IF;

  -- Verify auth_failure_log has agency_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auth_failure_log' AND column_name = 'agency_id'
  ) THEN
    RAISE EXCEPTION 'Verification failed: auth_failure_log.agency_id not found';
  END IF;

  -- Verify RLS policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_audit_log' AND policyname = 'security_audit_select_agency_admin'
  ) THEN
    RAISE EXCEPTION 'Verification failed: security_audit_select_agency_admin policy not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'auth_failure_log' AND policyname = 'auth_failure_select_agency_admin'
  ) THEN
    RAISE EXCEPTION 'Verification failed: auth_failure_select_agency_admin policy not found';
  END IF;

  RAISE NOTICE '✅ Security audit multi-tenancy fix verified successfully';
  RAISE NOTICE '⚠️  WARNING: Existing audit logs have NULL agency_id - manual backfill may be needed';
END $$;
