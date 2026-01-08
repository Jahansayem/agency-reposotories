-- Migration: Implement Row-Level Security (RLS) Policies
-- Date: 2026-01-08
-- Description: Add proper RLS policies with feature flag support for gradual rollout

-- Create helper functions for RLS
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.user_id', true), ''),
    NULL
  )::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_name()
RETURNS TEXT AS $$
  SELECT name FROM users WHERE id = auth.user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.rls_enabled()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('app.enable_rls', true)::boolean,
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations" ON todos;
DROP POLICY IF EXISTS "Allow all operations" ON messages;
DROP POLICY IF EXISTS "Allow all operations" ON activity_log;
DROP POLICY IF EXISTS "Allow all operations" ON strategic_goals;
DROP POLICY IF EXISTS "Allow all operations" ON goal_milestones;

-- ============================================
-- TODOS TABLE POLICIES
-- ============================================

-- SELECT: Users can view assigned or created todos, or if admin
CREATE POLICY "rls_todos_select"
  ON todos FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        assigned_to = auth.user_name() OR
        created_by = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true -- Old behavior when RLS is disabled
    END
  );

-- INSERT: Users can create todos
CREATE POLICY "rls_todos_insert"
  ON todos FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN created_by = auth.user_name()
      ELSE true
    END
  );

-- UPDATE: Users can update their own todos or if admin
CREATE POLICY "rls_todos_update"
  ON todos FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        assigned_to = auth.user_name() OR
        created_by = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true
    END
  )
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN (
        assigned_to = auth.user_name() OR
        created_by = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

-- DELETE: Only creator or admin can delete
CREATE POLICY "rls_todos_delete"
  ON todos FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        created_by = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

-- SELECT: Users can see messages in their conversations
CREATE POLICY "rls_messages_select"
  ON messages FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        recipient IS NULL OR -- Team chat
        recipient = auth.user_name() OR -- DM to me
        created_by = auth.user_name() -- My messages
      )
      ELSE true
    END
  );

-- INSERT: Users can create messages
CREATE POLICY "rls_messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN created_by = auth.user_name()
      ELSE true
    END
  );

-- UPDATE: Users can edit their own messages
CREATE POLICY "rls_messages_update"
  ON messages FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN created_by = auth.user_name()
      ELSE true
    END
  );

-- DELETE: Users can delete their own messages or admin can delete any
CREATE POLICY "rls_messages_delete"
  ON messages FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN (
        created_by = auth.user_name() OR
        auth.is_admin()
      )
      ELSE true
    END
  );

-- ============================================
-- ACTIVITY LOG POLICIES
-- ============================================

-- SELECT: Everyone can read activity log
CREATE POLICY "rls_activity_select"
  ON activity_log FOR SELECT
  USING (true); -- Activity log is public within the team

-- INSERT: Anyone can log activity
CREATE POLICY "rls_activity_insert"
  ON activity_log FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE on activity log (append-only)

-- ============================================
-- STRATEGIC GOALS POLICIES (Admin Only)
-- ============================================

-- SELECT: Only admin can view strategic goals
CREATE POLICY "rls_goals_select"
  ON strategic_goals FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- INSERT: Only admin can create goals
CREATE POLICY "rls_goals_insert"
  ON strategic_goals FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- UPDATE: Only admin can update goals
CREATE POLICY "rls_goals_update"
  ON strategic_goals FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- DELETE: Only admin can delete goals
CREATE POLICY "rls_goals_delete"
  ON strategic_goals FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- ============================================
-- GOAL MILESTONES POLICIES
-- ============================================

CREATE POLICY "rls_milestones_select"
  ON goal_milestones FOR SELECT
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

CREATE POLICY "rls_milestones_insert"
  ON goal_milestones FOR INSERT
  WITH CHECK (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

CREATE POLICY "rls_milestones_update"
  ON goal_milestones FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

CREATE POLICY "rls_milestones_delete"
  ON goal_milestones FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- SELECT: Everyone can see user list (needed for assignments)
CREATE POLICY "rls_users_select"
  ON users FOR SELECT
  USING (true);

-- INSERT: Allow user creation (for registration)
CREATE POLICY "rls_users_insert"
  ON users FOR INSERT
  WITH CHECK (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "rls_users_update"
  ON users FOR UPDATE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN id = auth.user_id()
      ELSE true
    END
  );

-- DELETE: Only admin can delete users
CREATE POLICY "rls_users_delete"
  ON users FOR DELETE
  USING (
    CASE
      WHEN auth.rls_enabled() THEN auth.is_admin()
      ELSE true
    END
  );

-- Add comments
COMMENT ON FUNCTION auth.user_id() IS 'Get current authenticated user ID from app context';
COMMENT ON FUNCTION auth.user_name() IS 'Get current authenticated user name';
COMMENT ON FUNCTION auth.is_admin() IS 'Check if current user is admin';
COMMENT ON FUNCTION auth.rls_enabled() IS 'Check if RLS is enabled via feature flag';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.user_name() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.rls_enabled() TO authenticated, anon;
