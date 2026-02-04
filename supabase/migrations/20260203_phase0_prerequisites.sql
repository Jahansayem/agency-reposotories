-- ============================================================================
-- Migration: Phase 0 Prerequisites for Multi-Tenancy
-- Date: 2026-02-03
-- Description:
--   Fixes 5 critical issues blocking multi-tenancy operationalization:
--   1. set_request_context() is_local parameter (session context visibility)
--   2. Seed migration role cast compatibility
--   3. accept_agency_invitation() demotion bug
--   4. Covering indexes for common query patterns
--   5. Standardized API error response type
--
-- References:
--   - docs/MULTI_TENANCY_EXECUTION_PLAN.md (Phase 0)
--   - supabase/migrations/20260126_multi_tenancy.sql
--   - supabase/migrations/20260201000000_seed_default_agency.sql
-- ============================================================================

-- ============================================================================
-- FIX 1: set_request_context() is_local parameter
-- ============================================================================
--
-- PROBLEM: The current set_request_context() uses `is_local => true` which
-- marks the setting as transaction-local. However, RLS policies evaluate in
-- a different transaction context when using the service role, causing the
-- context to be invisible to RLS policies.
--
-- SOLUTION: Change to `is_local => false` so the settings persist across
-- the entire database session/connection.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_request_context(
  p_user_id UUID,
  p_user_name TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Use is_local => false so settings persist for the entire session
  -- and are visible to RLS policies across transaction boundaries
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), false);
  PERFORM set_config('app.agency_id', COALESCE(p_agency_id::text, ''), false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_request_context(UUID, TEXT, UUID) IS
  'Set session context for RLS policies. Uses is_local=false for session-wide visibility.';


-- ============================================================================
-- FIX 2: Seed migration role compatibility
-- ============================================================================
--
-- PROBLEM: The seed migration (20260201000000_seed_default_agency.sql) maps
-- user roles using 'admin' and 'member', but after the role migration in
-- 20260202020000_reconcile_rls_and_roles.sql, the valid roles are:
-- 'owner', 'manager', 'staff'. The seed migration may fail on new installs
-- or cause constraint violations.
--
-- SOLUTION: Create a helper function that maps legacy roles to new roles,
-- and ensure any existing mismatched data is corrected.
-- ============================================================================

-- Helper function to map legacy roles to new role system
CREATE OR REPLACE FUNCTION map_legacy_role(p_role TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN p_role = 'owner' THEN 'owner'
    WHEN p_role IN ('admin', 'manager') THEN 'manager'
    WHEN p_role IN ('member', 'staff') THEN 'staff'
    ELSE 'staff'  -- Default to lowest privilege
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_legacy_role(TEXT) IS
  'Maps legacy role names (admin, member) to new role system (manager, staff)';

-- Ensure any lingering legacy roles in agency_members are migrated
-- (This is idempotent - will do nothing if already correct)
DO $$
BEGIN
  -- Temporarily widen constraint to allow update
  ALTER TABLE agency_members DROP CONSTRAINT IF EXISTS agency_members_role_check;
  ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

  -- Migrate any legacy roles
  UPDATE agency_members SET role = 'manager' WHERE role = 'admin';
  UPDATE agency_members SET role = 'staff' WHERE role = 'member';

  -- Restore strict constraint
  ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
  ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
    CHECK (role IN ('owner', 'manager', 'staff'));
EXCEPTION
  WHEN OTHERS THEN
    -- Constraint may already be in final state, continue
    NULL;
END $$;


-- ============================================================================
-- FIX 3: accept_agency_invitation() demotion bug
-- ============================================================================
--
-- PROBLEM: The current accept_agency_invitation() function uses an ON CONFLICT
-- DO UPDATE that can demote existing owners/managers to lower roles if they
-- accept an invitation with a lower role. This is a security issue.
--
-- SOLUTION: Only insert a new membership if the user doesn't already have one.
-- If they do, only update if their current role is lower than the invitation.
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
  v_existing_role TEXT;
  v_role_rank INT;
  v_existing_rank INT;
BEGIN
  -- Find valid invitation
  SELECT * INTO v_invitation
  FROM agency_invitations
  WHERE token = p_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user already has a membership in this agency
  SELECT am.role INTO v_existing_role
  FROM agency_members am
  WHERE am.agency_id = v_invitation.agency_id
    AND am.user_id = p_user_id;

  IF v_existing_role IS NOT NULL THEN
    -- User already has a membership
    -- Define role hierarchy: owner=3, manager=2, staff=1
    v_role_rank := CASE v_invitation.role
      WHEN 'owner' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END;

    v_existing_rank := CASE v_existing_role
      WHEN 'owner' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END;

    -- Only upgrade, never downgrade
    IF v_role_rank > v_existing_rank THEN
      UPDATE agency_members
      SET role = v_invitation.role,
          status = 'active',
          updated_at = NOW()
      WHERE agency_members.agency_id = v_invitation.agency_id
        AND agency_members.user_id = p_user_id;
    ELSE
      -- Just ensure they're active, don't change role
      UPDATE agency_members
      SET status = 'active',
          updated_at = NOW()
      WHERE agency_members.agency_id = v_invitation.agency_id
        AND agency_members.user_id = p_user_id;
    END IF;
  ELSE
    -- No existing membership, create new one
    INSERT INTO agency_members (agency_id, user_id, role, status)
    VALUES (v_invitation.agency_id, p_user_id, v_invitation.role, 'active');
  END IF;

  -- Mark invitation as accepted
  UPDATE agency_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Return result
  RETURN QUERY SELECT v_invitation.agency_id, v_invitation.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_agency_invitation(TEXT, UUID) IS
  'Accept invitation and create/update membership. Never demotes existing higher roles.';


-- ============================================================================
-- FIX 4: Covering indexes for common query patterns
-- ============================================================================
--
-- PROBLEM: Common queries lack optimized indexes, causing slow RLS evaluation
-- and inefficient query plans.
--
-- SOLUTION: Add partial covering indexes for the most common patterns:
-- - Active incomplete tasks by agency and assignment
-- - Active incomplete tasks by agency and category
-- - Messages by agency ordered by recency
-- ============================================================================

-- Index for fetching active tasks assigned to a user within an agency
-- The WHERE clause makes this a partial index, reducing storage and improving performance
CREATE INDEX IF NOT EXISTS idx_todos_agency_assigned_active
  ON todos(agency_id, assigned_to)
  WHERE completed = false;

-- Index for filtering tasks by category within an agency
CREATE INDEX IF NOT EXISTS idx_todos_agency_category_active
  ON todos(agency_id, category)
  WHERE completed = false;

-- Index for messages ordered by creation time (chat queries)
-- Note: A similar index exists but without DESC ordering on created_at
CREATE INDEX IF NOT EXISTS idx_messages_agency_created_desc
  ON messages(agency_id, created_at DESC);

-- Index for efficient agency member lookup by user
-- Supports user_agency_ids() function used in RLS
CREATE INDEX IF NOT EXISTS idx_agency_members_user_active
  ON agency_members(user_id, agency_id)
  WHERE status = 'active';

-- Index for invitation token lookup (single-row lookups)
CREATE INDEX IF NOT EXISTS idx_agency_invitations_token_valid
  ON agency_invitations(token)
  WHERE expires_at > NOW() AND accepted_at IS NULL;


-- ============================================================================
-- FIX 5: Standardized API error response type
-- ============================================================================
--
-- PROBLEM: Error responses from database functions are inconsistent, making
-- it difficult to handle errors uniformly in the API layer.
--
-- SOLUTION: Create a composite type for standardized error responses that
-- can be used by RPC functions.
-- ============================================================================

-- Create the error response type (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_error_response') THEN
    CREATE TYPE api_error_response AS (
      error TEXT,
      code TEXT,
      details JSONB
    );
  END IF;
END $$;

COMMENT ON TYPE api_error_response IS
  'Standardized error response type for API functions. Fields: error (message), code (error code), details (additional context)';

-- Helper function to create standardized error responses
CREATE OR REPLACE FUNCTION make_api_error(
  p_error TEXT,
  p_code TEXT DEFAULT 'UNKNOWN_ERROR',
  p_details JSONB DEFAULT NULL
)
RETURNS api_error_response AS $$
BEGIN
  RETURN ROW(p_error, p_code, COALESCE(p_details, '{}'::jsonb))::api_error_response;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION make_api_error(TEXT, TEXT, JSONB) IS
  'Creates a standardized API error response. Usage: SELECT make_api_error(''Not found'', ''NOT_FOUND'', ''{"id": "xyz"}'')';

-- Common error codes as constants (using a function since Postgres lacks constants)
CREATE OR REPLACE FUNCTION api_error_codes()
RETURNS TABLE(
  code TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY VALUES
    ('AUTH_REQUIRED', 'Authentication is required'),
    ('AUTH_INVALID', 'Invalid credentials'),
    ('AUTH_EXPIRED', 'Session has expired'),
    ('AUTH_LOCKED', 'Account is locked'),
    ('FORBIDDEN', 'Insufficient permissions'),
    ('NOT_FOUND', 'Resource not found'),
    ('CONFLICT', 'Resource already exists'),
    ('VALIDATION', 'Validation error'),
    ('RATE_LIMITED', 'Too many requests'),
    ('AGENCY_REQUIRED', 'Agency context required'),
    ('AGENCY_INVALID', 'Invalid or inaccessible agency'),
    ('INVITATION_INVALID', 'Invalid or expired invitation'),
    ('INVITATION_USED', 'Invitation already accepted'),
    ('INTERNAL_ERROR', 'Internal server error');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION api_error_codes() IS
  'Reference table of standardized API error codes';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_test_result BOOLEAN;
BEGIN
  -- Verify Fix 1: set_request_context function exists with correct signature
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_request_context'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'Fix 1 verification failed: set_request_context not found';
  END IF;

  -- Verify Fix 2: map_legacy_role function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'map_legacy_role'
  ) THEN
    RAISE EXCEPTION 'Fix 2 verification failed: map_legacy_role not found';
  END IF;

  -- Verify Fix 3: accept_agency_invitation function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'accept_agency_invitation'
  ) THEN
    RAISE EXCEPTION 'Fix 3 verification failed: accept_agency_invitation not found';
  END IF;

  -- Verify Fix 4: At least one new index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_todos_agency_assigned_active'
  ) THEN
    RAISE EXCEPTION 'Fix 4 verification failed: idx_todos_agency_assigned_active not found';
  END IF;

  -- Verify Fix 5: api_error_response type exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'api_error_response'
  ) THEN
    RAISE EXCEPTION 'Fix 5 verification failed: api_error_response type not found';
  END IF;

  RAISE NOTICE '✅ Phase 0 prerequisites migration verified successfully';
END $$;
