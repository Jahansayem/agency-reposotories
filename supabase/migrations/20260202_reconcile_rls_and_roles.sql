-- ============================================================================
-- Migration: Reconcile RLS Policies, Upgrade Role System, Expand Permissions,
--            Add Session Agency Context
-- Date: 2026-02-02
-- Description:
--   PART 1: Drop surviving v3 RLS policies on users, activity_log,
--           task_templates, device_tokens, goal_categories. Create new
--           agency-scoped replacement policies.
--   PART 2: Migrate roles from owner/admin/member to owner/manager/staff.
--           Update auth.is_admin() and public.is_agency_admin().
--   PART 3: Expand agency_members.permissions JSONB to 20 flags per role.
--   PART 4: Add current_agency_id to user_sessions and update
--           validate_session_token RPC.
--
-- References:
--   - docs/MULTI_TENANCY_EXECUTION_PLAN.md (Phases 1A-1D, findings H1-H5, M7-M8, L9)
--   - supabase/migrations/20260108_fix_all_security_warnings_v3.sql
--   - supabase/migrations/20260125_security_hardening.sql
--   - supabase/migrations/20260126_multi_tenancy.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: RLS RECONCILIATION
-- ============================================================================
--
-- The v3 policies on todos/messages/strategic_goals/goal_milestones were
-- ALREADY dropped by 20260125_security_hardening.sql (which replaced them
-- with *_policy variants) and then those were dropped by
-- 20260126_multi_tenancy.sql (which created *_agency variants).
--
-- What SURVIVES from v3 are policies on tables NOT touched by those later
-- migrations: users, activity_log, task_templates, device_tokens, goal_categories.
-- Additionally, 20260125 created users_update_policy and users_delete_policy.
--
-- We drop all of these and replace with agency-scoped policies.
-- ============================================================================

-- -------------------------------------------------------
-- 1.1: Drop surviving v3 policies on USERS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "rls_users_select" ON users;
DROP POLICY IF EXISTS "rls_users_insert" ON users;
-- These are from 20260125_security_hardening.sql:
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- -------------------------------------------------------
-- 1.2: Drop surviving v3 policies on ACTIVITY_LOG
-- -------------------------------------------------------
DROP POLICY IF EXISTS "rls_activity_select" ON activity_log;
DROP POLICY IF EXISTS "rls_activity_insert" ON activity_log;
DROP POLICY IF EXISTS "rls_activity_delete" ON activity_log;

-- -------------------------------------------------------
-- 1.3: Drop surviving v3 policies on TASK_TEMPLATES
-- -------------------------------------------------------
DROP POLICY IF EXISTS "rls_templates_select" ON task_templates;
DROP POLICY IF EXISTS "rls_templates_insert" ON task_templates;
DROP POLICY IF EXISTS "rls_templates_update" ON task_templates;
DROP POLICY IF EXISTS "rls_templates_delete" ON task_templates;

-- -------------------------------------------------------
-- 1.4: Drop surviving v3 policies on DEVICE_TOKENS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "rls_device_tokens_select" ON device_tokens;
DROP POLICY IF EXISTS "rls_device_tokens_insert" ON device_tokens;
DROP POLICY IF EXISTS "rls_device_tokens_delete" ON device_tokens;

-- -------------------------------------------------------
-- 1.5: Drop surviving v3 policies on GOAL_CATEGORIES
-- -------------------------------------------------------
DROP POLICY IF EXISTS "rls_goal_categories_select" ON goal_categories;
DROP POLICY IF EXISTS "rls_goal_categories_insert" ON goal_categories;
DROP POLICY IF EXISTS "rls_goal_categories_update" ON goal_categories;
DROP POLICY IF EXISTS "rls_goal_categories_delete" ON goal_categories;

-- -------------------------------------------------------
-- 1.6: Create agency-scoped policies for USERS (Finding H3)
--
-- SELECT: Users can see other users who share at least one agency.
--         Open access when no user context is set (login/registration).
-- INSERT: Open for registration.
-- UPDATE: Own row, or agency admin of a shared agency.
-- DELETE: Own row, or agency admin of a shared agency.
-- -------------------------------------------------------

CREATE POLICY "users_select_agency"
  ON users FOR SELECT
  USING (
    -- Allow when no user context set (login/registration flow)
    public.get_current_user_id() IS NULL
    OR
    -- Own row always visible
    id = public.get_current_user_id()
    OR
    -- Users sharing at least one agency
    id IN (
      SELECT am2.user_id
      FROM agency_members am1
      JOIN agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = public.get_current_user_id()
        AND am1.status = 'active'
        AND am2.status = 'active'
    )
  );

CREATE POLICY "users_insert_open"
  ON users FOR INSERT
  WITH CHECK (true);  -- Allow registration

CREATE POLICY "users_update_agency"
  ON users FOR UPDATE
  USING (
    -- Own row
    id = public.get_current_user_id()
    OR
    -- Agency admin of a shared agency
    EXISTS (
      SELECT 1
      FROM agency_members am_self
      JOIN agency_members am_target ON am_self.agency_id = am_target.agency_id
      WHERE am_self.user_id = public.get_current_user_id()
        AND am_self.role IN ('owner', 'manager')
        AND am_self.status = 'active'
        AND am_target.user_id = users.id
        AND am_target.status = 'active'
    )
  );

CREATE POLICY "users_delete_agency"
  ON users FOR DELETE
  USING (
    -- Own row
    id = public.get_current_user_id()
    OR
    -- Agency admin of a shared agency
    EXISTS (
      SELECT 1
      FROM agency_members am_self
      JOIN agency_members am_target ON am_self.agency_id = am_target.agency_id
      WHERE am_self.user_id = public.get_current_user_id()
        AND am_self.role IN ('owner', 'manager')
        AND am_self.status = 'active'
        AND am_target.user_id = users.id
        AND am_target.status = 'active'
    )
  );

-- -------------------------------------------------------
-- 1.7: Create agency-scoped policies for ACTIVITY_LOG (Finding H2)
--
-- Modeled on todos_select_agency from 20260126_multi_tenancy.sql.
-- -------------------------------------------------------

CREATE POLICY "activity_log_select_agency"
  ON activity_log FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

CREATE POLICY "activity_log_insert_agency"
  ON activity_log FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

CREATE POLICY "activity_log_delete_agency"
  ON activity_log FOR DELETE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND public.is_agency_admin(agency_id)
    )
  );

-- -------------------------------------------------------
-- 1.8: Create agency-scoped policies for TASK_TEMPLATES (Finding H2)
--
-- SELECT includes is_shared fallback for templates visible within agency.
-- -------------------------------------------------------

CREATE POLICY "task_templates_select_agency"
  ON task_templates FOR SELECT
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND (
        is_shared = true
        OR created_by = public.get_current_user_name()
        OR public.is_agency_admin(agency_id)
      )
    )
  );

CREATE POLICY "task_templates_insert_agency"
  ON task_templates FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND created_by = public.get_current_user_name()
    )
  );

CREATE POLICY "task_templates_update_agency"
  ON task_templates FOR UPDATE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND (
        created_by = public.get_current_user_name()
        OR public.is_agency_admin(agency_id)
      )
    )
  );

CREATE POLICY "task_templates_delete_agency"
  ON task_templates FOR DELETE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND (
        created_by = public.get_current_user_name()
        OR public.is_agency_admin(agency_id)
      )
    )
  );

-- -------------------------------------------------------
-- 1.9: Create agency-scoped policies for GOAL_CATEGORIES (Finding H2)
-- -------------------------------------------------------

CREATE POLICY "goal_categories_select_agency"
  ON goal_categories FOR SELECT
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY "goal_categories_insert_agency"
  ON goal_categories FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY "goal_categories_update_agency"
  ON goal_categories FOR UPDATE
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY "goal_categories_delete_agency"
  ON goal_categories FOR DELETE
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

-- -------------------------------------------------------
-- 1.10: Create agency-scoped policies for DEVICE_TOKENS
--
-- Device tokens are user-scoped (not agency-scoped).
-- -------------------------------------------------------

CREATE POLICY "device_tokens_select_own"
  ON device_tokens FOR SELECT
  USING (user_id = public.get_current_user_id());

CREATE POLICY "device_tokens_insert_own"
  ON device_tokens FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "device_tokens_delete_own"
  ON device_tokens FOR DELETE
  USING (user_id = public.get_current_user_id());

-- -------------------------------------------------------
-- 1.11: Covering indexes for RLS query performance (Finding M8)
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_agency_members_user_status
  ON agency_members(user_id, status) INCLUDE (agency_id);

CREATE INDEX IF NOT EXISTS idx_todos_agency_created
  ON todos(agency_id, created_by);

CREATE INDEX IF NOT EXISTS idx_todos_agency_status
  ON todos(agency_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_agency_created
  ON messages(agency_id, created_at DESC);


-- ============================================================================
-- PART 2: ROLE MIGRATION
-- ============================================================================
--
-- Migrate: admin -> manager, member -> staff
-- Keep: owner (unchanged)
-- ============================================================================

-- -------------------------------------------------------
-- 2.1: Widen constraints temporarily to allow both old and new values
-- -------------------------------------------------------

ALTER TABLE agency_members DROP CONSTRAINT IF EXISTS agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT IF EXISTS agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'staff'));

-- -------------------------------------------------------
-- 2.2: Migrate data
-- -------------------------------------------------------

UPDATE agency_members SET role = 'manager' WHERE role = 'admin';
UPDATE agency_members SET role = 'staff'   WHERE role = 'member';
UPDATE agency_invitations SET role = 'manager' WHERE role = 'admin';
UPDATE agency_invitations SET role = 'staff'   WHERE role = 'member';
UPDATE users SET role = 'manager' WHERE role = 'admin';
UPDATE users SET role = 'staff'   WHERE role = 'member';

-- -------------------------------------------------------
-- 2.3: Tighten constraints to new values only
-- -------------------------------------------------------

ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('manager', 'staff'));

-- -------------------------------------------------------
-- 2.4: Update users.role constraint (Finding L9)
--
-- The constraint may have an auto-generated name since it was created inline
-- via ALTER TABLE ADD COLUMN ... CHECK (...) in 20260114. We query
-- pg_constraint to find the actual name and drop it dynamically.
-- -------------------------------------------------------

DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Find the CHECK constraint on users.role (not global_role)
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
  WHERE c.conrelid = 'users'::regclass
    AND c.contype = 'c'
    AND a.attname = 'role'
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));

-- -------------------------------------------------------
-- 2.5: Update auth.is_admin() to check ('owner', 'manager') (Finding M7)
--
-- This function is defined in 20260114_security_improvements.sql and is
-- used by hardening-era RLS policies on security_audit_log, auth_failure_log.
-- After role migration, 'admin' no longer exists; managers need these privileges.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('owner', 'manager') FROM users WHERE id = auth.user_id()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -------------------------------------------------------
-- 2.6: Update public.is_agency_admin() to check ('owner', 'manager')
--
-- This function currently checks ('owner', 'admin') from 20260126.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND role IN ('owner', 'manager')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- PART 3: PERMISSIONS EXPANSION
-- ============================================================================
--
-- Write all 20 permission flags to every existing agency_members row,
-- per the permission matrix from the execution plan.
-- ============================================================================

-- -------------------------------------------------------
-- 3.1: Owner permissions (all true)
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_any_task": true,
  "can_delete_tasks": true,
  "can_assign_tasks": true,
  "can_reorder_tasks": true,
  "can_view_strategic_goals": true,
  "can_manage_strategic_goals": true,
  "can_invite_users": true,
  "can_remove_users": true,
  "can_change_roles": true,
  "can_manage_templates": true,
  "can_use_ai_features": true,
  "can_pin_messages": true,
  "can_delete_any_message": true,
  "can_view_activity_feed": true,
  "can_view_dashboard": true,
  "can_view_archive": true,
  "can_manage_agency_settings": true,
  "can_view_security_events": true,
  "can_manage_billing": true
}'::jsonb
WHERE role = 'owner';

-- -------------------------------------------------------
-- 3.2: Manager permissions
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_any_task": true,
  "can_delete_tasks": true,
  "can_assign_tasks": true,
  "can_reorder_tasks": true,
  "can_view_strategic_goals": true,
  "can_manage_strategic_goals": false,
  "can_invite_users": true,
  "can_remove_users": true,
  "can_change_roles": false,
  "can_manage_templates": true,
  "can_use_ai_features": true,
  "can_pin_messages": true,
  "can_delete_any_message": true,
  "can_view_activity_feed": true,
  "can_view_dashboard": true,
  "can_view_archive": true,
  "can_manage_agency_settings": false,
  "can_view_security_events": true,
  "can_manage_billing": false
}'::jsonb
WHERE role = 'manager';

-- -------------------------------------------------------
-- 3.3: Staff permissions
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_any_task": false,
  "can_delete_tasks": false,
  "can_assign_tasks": false,
  "can_reorder_tasks": false,
  "can_view_strategic_goals": false,
  "can_manage_strategic_goals": false,
  "can_invite_users": false,
  "can_remove_users": false,
  "can_change_roles": false,
  "can_manage_templates": false,
  "can_use_ai_features": true,
  "can_pin_messages": false,
  "can_delete_any_message": false,
  "can_view_activity_feed": true,
  "can_view_dashboard": true,
  "can_view_archive": false,
  "can_manage_agency_settings": false,
  "can_view_security_events": false,
  "can_manage_billing": false
}'::jsonb
WHERE role = 'staff';


-- ============================================================================
-- PART 4: SESSION AGENCY CONTEXT
-- ============================================================================

-- -------------------------------------------------------
-- 4.1: Add current_agency_id to user_sessions
-- -------------------------------------------------------

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS current_agency_id UUID REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_sessions_agency
  ON user_sessions(current_agency_id);

-- -------------------------------------------------------
-- 4.2: Update validate_session_token RPC to return current_agency_id (Finding H5)
--
-- The original function (from 20260114) returns user_id, user_name, user_role, valid.
-- We add current_agency_id to the return columns.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_session_token(p_token_hash TEXT)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  valid BOOLEAN,
  current_agency_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    u.name,
    u.role,
    (s.is_valid AND s.expires_at > NOW()) as valid,
    s.current_agency_id
  FROM user_sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_session_token(TEXT) IS 'Validates a session token and returns user info including current agency context';

-- Re-grant permissions (CREATE OR REPLACE resets grants)
GRANT EXECUTE ON FUNCTION validate_session_token(TEXT) TO authenticated, anon;


-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION auth.is_admin() IS 'Check if current user is owner or manager (updated from owner/admin)';
COMMENT ON FUNCTION public.is_agency_admin(UUID) IS 'Check if current user is owner or manager of specified agency (updated from owner/admin)';

COMMIT;
