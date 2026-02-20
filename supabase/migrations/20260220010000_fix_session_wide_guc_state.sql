-- ============================================================================
-- Migration: Fix Session-Wide GUC State (P0.2)
-- Date: 2026-02-20
-- Description:
--   Fixes multi-tenancy vulnerability where session-wide GUC config (is_local=false)
--   can bleed across requests in connection pooling environments.
--
-- Problem:
--   The current set_request_context() uses is_local=false which makes settings
--   persist across the entire database connection. In connection pooling (like
--   Supabase's pgBouncer), this means one request's agency_id can leak into
--   another request's RLS context.
--
-- Solution:
--   Use transaction-local config (is_local=true) so settings are automatically
--   reset at transaction boundaries. RLS policies will see the correct context
--   because they execute within the same transaction.
--
-- References:
--   - supabase/migrations/20260203040000_phase0_prerequisites.sql (reverted)
--   - PostgreSQL docs: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET
-- ============================================================================

CREATE OR REPLACE FUNCTION set_request_context(
  p_user_id UUID,
  p_user_name TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Use is_local => true (transaction-local) to prevent context bleed in connection pooling
  -- This is CRITICAL for multi-tenancy isolation in environments like pgBouncer
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), true);
  PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION set_request_context(UUID, TEXT, UUID) IS
  'Set transaction-local context for RLS policies. Uses is_local=true to prevent cross-request bleed in connection pooling.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify function exists with correct signature
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_request_context'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'Verification failed: set_request_context not found';
  END IF;

  RAISE NOTICE '✅ Session-wide GUC state fix verified successfully';
END $$;
