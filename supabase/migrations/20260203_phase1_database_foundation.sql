-- ============================================================================
-- Migration: Phase 1A-D - Database & Type Foundation for Multi-Tenancy
-- Date: 2026-02-03
-- Description:
--   Implements Phase 1 of the Multi-Tenancy Execution Plan:
--   - Task 1A: Reconcile conflicting RLS policies (drop v3 policies)
--   - Task 1B: Role system migration (admin→manager, member→staff)
--   - Task 1C: Permissions expansion (5→20 flags per role)
--   - Task 1D: Session context (add current_agency_id to sessions)
--
-- IMPORTANT: This migration is designed to be idempotent - safe to run multiple
-- times. All statements use DROP IF EXISTS / CREATE IF NOT EXISTS / DO blocks
-- with exception handling.
--
-- References:
--   - docs/MULTI_TENANCY_EXECUTION_PLAN.md (Phase 1A-D)
--   - 20260108_fix_all_security_warnings_v3.sql (creates v3 policies)
--   - 20260125_security_hardening.sql (drops some v3, creates *_policy)
--   - 20260126_multi_tenancy.sql (drops *_policy, creates *_agency)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TASK 1A: RECONCILE RLS POLICIES
-- ============================================================================
-- The v3 migration (20260108) created policies with `ELSE true` fallbacks that
-- override agency-scoped policies. PostgreSQL evaluates same-command policies
-- with OR logic, so v3's permissive fallbacks defeat agency isolation.
--
-- Which v3 policies still exist:
-- - 20260125_security_hardening.sql dropped v3 policies on todos, messages,
--   strategic_goals, goal_milestones and replaced with *_policy variants
-- - 20260126_multi_tenancy.sql dropped *_policy variants and created *_agency
-- - SURVIVING v3 policies: users, activity_log, task_templates, device_tokens,
--   goal_categories
--
-- We drop all surviving v3 policies and create agency-scoped replacements.
-- ============================================================================

RAISE NOTICE 'Task 1A: Dropping surviving v3 RLS policies...';

-- -------------------------------------------------------
-- 1A.1: Drop v3 policies on TODOS (if any survived)
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_todos_select ON todos;
DROP POLICY IF EXISTS rls_todos_insert ON todos;
DROP POLICY IF EXISTS rls_todos_update ON todos;
DROP POLICY IF EXISTS rls_todos_delete ON todos;

-- -------------------------------------------------------
-- 1A.2: Drop v3 policies on MESSAGES (if any survived)
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_messages_select ON messages;
DROP POLICY IF EXISTS rls_messages_insert ON messages;
DROP POLICY IF EXISTS rls_messages_update ON messages;
DROP POLICY IF EXISTS rls_messages_delete ON messages;

-- -------------------------------------------------------
-- 1A.3: Drop v3 policies on STRATEGIC_GOALS (if any survived)
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_goals_select ON strategic_goals;
DROP POLICY IF EXISTS rls_goals_insert ON strategic_goals;
DROP POLICY IF EXISTS rls_goals_update ON strategic_goals;
DROP POLICY IF EXISTS rls_goals_delete ON strategic_goals;

-- -------------------------------------------------------
-- 1A.4: Drop v3 policies on GOAL_MILESTONES (if any survived)
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_milestones_select ON goal_milestones;
DROP POLICY IF EXISTS rls_milestones_insert ON goal_milestones;
DROP POLICY IF EXISTS rls_milestones_update ON goal_milestones;
DROP POLICY IF EXISTS rls_milestones_delete ON goal_milestones;

-- -------------------------------------------------------
-- 1A.5: Drop v3 policies on USERS
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_users_select ON users;
DROP POLICY IF EXISTS rls_users_insert ON users;
-- Also drop policies from 20260125_security_hardening.sql
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

-- -------------------------------------------------------
-- 1A.6: Drop v3 policies on ACTIVITY_LOG
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_activity_select ON activity_log;
DROP POLICY IF EXISTS rls_activity_insert ON activity_log;
DROP POLICY IF EXISTS rls_activity_delete ON activity_log;

-- -------------------------------------------------------
-- 1A.7: Drop v3 policies on TASK_TEMPLATES
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_templates_select ON task_templates;
DROP POLICY IF EXISTS rls_templates_insert ON task_templates;
DROP POLICY IF EXISTS rls_templates_update ON task_templates;
DROP POLICY IF EXISTS rls_templates_delete ON task_templates;

-- -------------------------------------------------------
-- 1A.8: Drop v3 policies on DEVICE_TOKENS
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_device_tokens_select ON device_tokens;
DROP POLICY IF EXISTS rls_device_tokens_insert ON device_tokens;
DROP POLICY IF EXISTS rls_device_tokens_delete ON device_tokens;

-- -------------------------------------------------------
-- 1A.9: Drop v3 policies on GOAL_CATEGORIES
-- -------------------------------------------------------
DROP POLICY IF EXISTS rls_goal_categories_select ON goal_categories;
DROP POLICY IF EXISTS rls_goal_categories_insert ON goal_categories;
DROP POLICY IF EXISTS rls_goal_categories_update ON goal_categories;
DROP POLICY IF EXISTS rls_goal_categories_delete ON goal_categories;

RAISE NOTICE 'Task 1A: v3 policies dropped. Creating agency-scoped replacement policies...';

-- -------------------------------------------------------
-- 1A.10: Create agency-scoped policies for USERS
-- Users can see other users sharing at least one agency
-- -------------------------------------------------------

-- Drop if exists (idempotent)
DROP POLICY IF EXISTS users_select_agency ON users;
DROP POLICY IF EXISTS users_insert_open ON users;
DROP POLICY IF EXISTS users_update_agency ON users;
DROP POLICY IF EXISTS users_delete_agency ON users;

CREATE POLICY users_select_agency
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

CREATE POLICY users_insert_open
  ON users FOR INSERT
  WITH CHECK (true);  -- Allow registration

CREATE POLICY users_update_agency
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

CREATE POLICY users_delete_agency
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
-- 1A.11: Create agency-scoped policies for ACTIVITY_LOG
-- -------------------------------------------------------

DROP POLICY IF EXISTS activity_log_select_agency ON activity_log;
DROP POLICY IF EXISTS activity_log_insert_agency ON activity_log;
DROP POLICY IF EXISTS activity_log_delete_agency ON activity_log;

CREATE POLICY activity_log_select_agency
  ON activity_log FOR SELECT
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

CREATE POLICY activity_log_insert_agency
  ON activity_log FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

CREATE POLICY activity_log_delete_agency
  ON activity_log FOR DELETE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND public.is_agency_admin(agency_id)
    )
  );

-- -------------------------------------------------------
-- 1A.12: Create agency-scoped policies for TASK_TEMPLATES
-- -------------------------------------------------------

DROP POLICY IF EXISTS task_templates_select_agency ON task_templates;
DROP POLICY IF EXISTS task_templates_insert_agency ON task_templates;
DROP POLICY IF EXISTS task_templates_update_agency ON task_templates;
DROP POLICY IF EXISTS task_templates_delete_agency ON task_templates;

CREATE POLICY task_templates_select_agency
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

CREATE POLICY task_templates_insert_agency
  ON task_templates FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND created_by = public.get_current_user_name()
    )
  );

CREATE POLICY task_templates_update_agency
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

CREATE POLICY task_templates_delete_agency
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
-- 1A.13: Create agency-scoped policies for GOAL_CATEGORIES
-- -------------------------------------------------------

DROP POLICY IF EXISTS goal_categories_select_agency ON goal_categories;
DROP POLICY IF EXISTS goal_categories_insert_agency ON goal_categories;
DROP POLICY IF EXISTS goal_categories_update_agency ON goal_categories;
DROP POLICY IF EXISTS goal_categories_delete_agency ON goal_categories;

CREATE POLICY goal_categories_select_agency
  ON goal_categories FOR SELECT
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY goal_categories_insert_agency
  ON goal_categories FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY goal_categories_update_agency
  ON goal_categories FOR UPDATE
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

CREATE POLICY goal_categories_delete_agency
  ON goal_categories FOR DELETE
  USING (
    agency_id IS NULL
    OR public.is_agency_admin(agency_id)
  );

-- -------------------------------------------------------
-- 1A.14: Create agency-scoped policies for DEVICE_TOKENS
-- (user-scoped, not agency-scoped)
-- -------------------------------------------------------

DROP POLICY IF EXISTS device_tokens_select_own ON device_tokens;
DROP POLICY IF EXISTS device_tokens_insert_own ON device_tokens;
DROP POLICY IF EXISTS device_tokens_delete_own ON device_tokens;

CREATE POLICY device_tokens_select_own
  ON device_tokens FOR SELECT
  USING (user_id = public.get_current_user_id());

CREATE POLICY device_tokens_insert_own
  ON device_tokens FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY device_tokens_delete_own
  ON device_tokens FOR DELETE
  USING (user_id = public.get_current_user_id());

RAISE NOTICE 'Task 1A: Agency-scoped policies created.';

-- ============================================================================
-- TASK 1B: ROLE SYSTEM MIGRATION
-- ============================================================================
-- Migrate existing roles from old names to new names:
--   - admin → manager
--   - member → staff
--   - owner → owner (unchanged)
-- ============================================================================

RAISE NOTICE 'Task 1B: Migrating role system (admin→manager, member→staff)...';

-- -------------------------------------------------------
-- 1B.1: Widen constraints temporarily to allow both old and new values
-- -------------------------------------------------------

ALTER TABLE agency_members DROP CONSTRAINT IF EXISTS agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT IF EXISTS agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'staff'));

-- -------------------------------------------------------
-- 1B.2: Migrate existing roles
-- -------------------------------------------------------

UPDATE agency_members SET role = 'manager' WHERE role = 'admin';
UPDATE agency_members SET role = 'staff' WHERE role = 'member';
UPDATE agency_invitations SET role = 'manager' WHERE role = 'admin';
UPDATE agency_invitations SET role = 'staff' WHERE role = 'member';

-- Also migrate users.role if it exists and has old values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE users SET role = 'manager' WHERE role = 'admin';
    UPDATE users SET role = 'staff' WHERE role = 'member';
  END IF;
END $$;

-- -------------------------------------------------------
-- 1B.3: Tighten constraints to final values only
-- -------------------------------------------------------

ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE agency_invitations DROP CONSTRAINT agency_invitations_role_check;
ALTER TABLE agency_invitations ADD CONSTRAINT agency_invitations_role_check
  CHECK (role IN ('manager', 'staff'));

-- -------------------------------------------------------
-- 1B.4: Update users.role constraint if it exists
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
EXCEPTION WHEN OTHERS THEN
  -- Constraint may not exist, continue
  NULL;
END $$;

-- Add new constraint (only if users.role column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('owner', 'manager', 'staff'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, continue
  NULL;
END $$;

-- -------------------------------------------------------
-- 1B.5: Update auth.is_admin() function
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION auth.is_admin(user_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members am
    JOIN users u ON u.id = am.user_id
    WHERE u.name = user_name
    AND am.role IN ('owner', 'manager')
    AND am.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update public.is_admin() if it exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('owner', 'manager') FROM users WHERE id = public.get_current_user_id()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -------------------------------------------------------
-- 1B.6: Update public.is_agency_admin() to check new role values
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

RAISE NOTICE 'Task 1B: Role system migration complete.';

-- ============================================================================
-- TASK 1C: PERMISSIONS EXPANSION
-- ============================================================================
-- Expand agency_members.permissions JSONB from 5 to 20 fields.
-- The permissions column is already JSONB, so we just need to update
-- existing rows with the full permission set based on their role.
-- ============================================================================

RAISE NOTICE 'Task 1C: Expanding permissions JSONB to 20 flags...';

-- -------------------------------------------------------
-- 1C.1: Owner permissions (all true)
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_own_tasks": true,
  "can_edit_all_tasks": true,
  "can_delete_own_tasks": true,
  "can_delete_all_tasks": true,
  "can_assign_tasks": true,
  "can_view_all_tasks": true,
  "can_reorder_tasks": true,
  "can_view_team_tasks": true,
  "can_view_team_stats": true,
  "can_manage_team": true,
  "can_use_chat": true,
  "can_delete_own_messages": true,
  "can_delete_all_messages": true,
  "can_pin_messages": true,
  "can_view_strategic_goals": true,
  "can_edit_strategic_goals": true,
  "can_view_archive": true,
  "can_use_ai_features": true,
  "can_manage_templates": true,
  "can_view_activity_log": true
}'::jsonb
WHERE role = 'owner';

-- -------------------------------------------------------
-- 1C.2: Manager permissions
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_own_tasks": true,
  "can_edit_all_tasks": true,
  "can_delete_own_tasks": true,
  "can_delete_all_tasks": true,
  "can_assign_tasks": true,
  "can_view_all_tasks": true,
  "can_reorder_tasks": true,
  "can_view_team_tasks": true,
  "can_view_team_stats": true,
  "can_manage_team": true,
  "can_use_chat": true,
  "can_delete_own_messages": true,
  "can_delete_all_messages": true,
  "can_pin_messages": true,
  "can_view_strategic_goals": true,
  "can_edit_strategic_goals": false,
  "can_view_archive": true,
  "can_use_ai_features": true,
  "can_manage_templates": true,
  "can_view_activity_log": true
}'::jsonb
WHERE role = 'manager';

-- -------------------------------------------------------
-- 1C.3: Staff permissions
-- -------------------------------------------------------

UPDATE agency_members
SET permissions = '{
  "can_create_tasks": true,
  "can_edit_own_tasks": true,
  "can_edit_all_tasks": false,
  "can_delete_own_tasks": true,
  "can_delete_all_tasks": false,
  "can_assign_tasks": false,
  "can_view_all_tasks": false,
  "can_reorder_tasks": false,
  "can_view_team_tasks": false,
  "can_view_team_stats": false,
  "can_manage_team": false,
  "can_use_chat": true,
  "can_delete_own_messages": true,
  "can_delete_all_messages": false,
  "can_pin_messages": false,
  "can_view_strategic_goals": false,
  "can_edit_strategic_goals": false,
  "can_view_archive": false,
  "can_use_ai_features": true,
  "can_manage_templates": false,
  "can_view_activity_log": true
}'::jsonb
WHERE role = 'staff';

-- -------------------------------------------------------
-- 1C.4: Add comment documenting all permission flags
-- -------------------------------------------------------

COMMENT ON COLUMN agency_members.permissions IS
'JSONB containing 21 permission flags. See src/types/agency.ts for AgencyPermissions interface.
Keys: can_create_tasks, can_edit_own_tasks, can_edit_all_tasks, can_delete_own_tasks,
can_delete_all_tasks, can_assign_tasks, can_view_all_tasks, can_reorder_tasks,
can_view_team_tasks, can_view_team_stats, can_manage_team, can_use_chat,
can_delete_own_messages, can_delete_all_messages, can_pin_messages,
can_view_strategic_goals, can_edit_strategic_goals, can_view_archive,
can_use_ai_features, can_manage_templates, can_view_activity_log';

RAISE NOTICE 'Task 1C: Permissions expansion complete.';

-- ============================================================================
-- TASK 1D: SESSION CONTEXT
-- ============================================================================
-- Add current_agency_id to user_sessions so the session validator can
-- return the user's active agency context.
-- ============================================================================

RAISE NOTICE 'Task 1D: Adding session agency context...';

-- -------------------------------------------------------
-- 1D.1: Add current_agency_id column to user_sessions
-- -------------------------------------------------------

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS current_agency_id UUID REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_sessions_agency
  ON user_sessions(current_agency_id);

-- -------------------------------------------------------
-- 1D.2: Create helper function to get agency from session context
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION get_session_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_agency_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_session_agency_id() IS 'Returns the current agency ID from session context';

-- -------------------------------------------------------
-- 1D.3: Update validate_session_token RPC to return agency info
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

COMMENT ON FUNCTION validate_session_token(TEXT) IS
'Validates a session token and returns user info including current agency context';

-- Re-grant permissions (CREATE OR REPLACE resets grants)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION validate_session_token(TEXT) TO authenticated, anon;
EXCEPTION WHEN OTHERS THEN
  -- Roles may not exist in all environments
  NULL;
END $$;

RAISE NOTICE 'Task 1D: Session agency context complete.';

-- ============================================================================
-- ADDITIONAL INDEXES FOR RLS PERFORMANCE
-- ============================================================================

RAISE NOTICE 'Creating additional indexes for RLS performance...';

CREATE INDEX IF NOT EXISTS idx_agency_members_user_status
  ON agency_members(user_id, status) INCLUDE (agency_id);

CREATE INDEX IF NOT EXISTS idx_todos_agency_created
  ON todos(agency_id, created_by);

CREATE INDEX IF NOT EXISTS idx_todos_agency_status
  ON todos(agency_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_agency_created
  ON messages(agency_id, created_at DESC);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

RAISE NOTICE '============================================================';
RAISE NOTICE 'Phase 1A-D Database Foundation Migration Complete';
RAISE NOTICE '============================================================';
RAISE NOTICE '';
RAISE NOTICE 'Task 1A: RLS Reconciliation';
RAISE NOTICE '  - Dropped v3 policies with ELSE true fallbacks';
RAISE NOTICE '  - Created agency-scoped policies for users, activity_log,';
RAISE NOTICE '    task_templates, goal_categories, device_tokens';
RAISE NOTICE '';
RAISE NOTICE 'Task 1B: Role Migration';
RAISE NOTICE '  - Migrated admin → manager, member → staff';
RAISE NOTICE '  - Updated is_admin() and is_agency_admin() functions';
RAISE NOTICE '';
RAISE NOTICE 'Task 1C: Permissions Expansion';
RAISE NOTICE '  - Expanded permissions JSONB to 21 flags';
RAISE NOTICE '  - Set role-appropriate defaults for owner/manager/staff';
RAISE NOTICE '';
RAISE NOTICE 'Task 1D: Session Context';
RAISE NOTICE '  - Added current_agency_id to user_sessions';
RAISE NOTICE '  - Updated validate_session_token RPC';
RAISE NOTICE '============================================================';

COMMIT;
