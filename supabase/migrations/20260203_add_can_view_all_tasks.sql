-- ============================================================================
-- Migration: Add can_view_all_tasks Permission
-- Date: 2026-02-03
-- Description:
--   Fixes missing permission flag in agency_members.permissions JSONB.
--   The 20260202_reconcile_rls_and_roles.sql migration wrote 20 flags but
--   the TypeScript AgencyPermissions interface defines 21 flags.
--   This migration adds the missing `can_view_all_tasks` permission.
--
--   Permission values by role (from src/types/agency.ts DEFAULT_PERMISSIONS):
--   - owner:   can_view_all_tasks = true
--   - manager: can_view_all_tasks = true
--   - staff:   can_view_all_tasks = false
--
-- References:
--   - src/types/agency.ts (AgencyPermissions interface, DEFAULT_PERMISSIONS)
--   - supabase/migrations/20260202_reconcile_rls_and_roles.sql (Part 3)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add can_view_all_tasks permission to existing agency_members
-- ============================================================================

-- -------------------------------------------------------
-- Owner and Manager roles: can_view_all_tasks = true
-- -------------------------------------------------------
UPDATE agency_members
SET permissions = permissions || '{"can_view_all_tasks": true}'::jsonb
WHERE role IN ('owner', 'manager')
  AND (permissions ->> 'can_view_all_tasks') IS NULL;

-- -------------------------------------------------------
-- Staff role: can_view_all_tasks = false
-- -------------------------------------------------------
UPDATE agency_members
SET permissions = permissions || '{"can_view_all_tasks": false}'::jsonb
WHERE role = 'staff'
  AND (permissions ->> 'can_view_all_tasks') IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Comment documenting the fix
COMMENT ON TABLE agency_members IS 'Agency membership with 21-flag permissions JSONB (fixed: added can_view_all_tasks)';

COMMIT;
