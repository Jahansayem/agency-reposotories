-- ============================================================================
-- Migration: Fix Agency Scoping for Multi-Tenancy
-- Date: 2026-02-03
-- Description:
--   1. Add agency_id to tables missing it (goal_milestones, task_reminders,
--      todo_versions, daily_digests) with backfill from parent records
--   2. Replace permissive "Allow all" RLS policies with agency-scoped policies
--   3. Fix push_subscriptions and notification_log RLS to use PIN auth
--   4. Fix accept_agency_invitation to handle token vs token_hash mismatch
--   5. Add performance indexes for new agency_id columns
--
-- References:
--   - docs/MULTI_TENANCY_EXECUTION_PLAN.md
--   - supabase/migrations/20260126_multi_tenancy.sql
--   - supabase/migrations/20260202_reconcile_rls_and_roles.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD AGENCY_ID TO MISSING TABLES
-- ============================================================================

-- -------------------------------------------------------
-- 1.1: Add agency_id to goal_milestones
-- -------------------------------------------------------

ALTER TABLE goal_milestones
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Backfill from parent strategic_goals
UPDATE goal_milestones gm
SET agency_id = sg.agency_id
FROM strategic_goals sg
WHERE gm.goal_id = sg.id
  AND gm.agency_id IS NULL
  AND sg.agency_id IS NOT NULL;

-- Index for agency_id lookups
CREATE INDEX IF NOT EXISTS idx_goal_milestones_agency
  ON goal_milestones(agency_id);

-- -------------------------------------------------------
-- 1.2: Add agency_id to task_reminders
-- -------------------------------------------------------

ALTER TABLE task_reminders
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Backfill from parent todos
UPDATE task_reminders tr
SET agency_id = t.agency_id
FROM todos t
WHERE tr.todo_id = t.id
  AND tr.agency_id IS NULL
  AND t.agency_id IS NOT NULL;

-- Index for agency_id lookups
CREATE INDEX IF NOT EXISTS idx_task_reminders_agency
  ON task_reminders(agency_id);

-- -------------------------------------------------------
-- 1.3: Add agency_id to todo_versions
-- -------------------------------------------------------

ALTER TABLE todo_versions
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Backfill from parent todos
UPDATE todo_versions tv
SET agency_id = t.agency_id
FROM todos t
WHERE tv.todo_id = t.id
  AND tv.agency_id IS NULL
  AND t.agency_id IS NOT NULL;

-- Index for agency_id lookups
CREATE INDEX IF NOT EXISTS idx_todo_versions_agency
  ON todo_versions(agency_id);

-- -------------------------------------------------------
-- 1.4: Add agency_id to daily_digests
-- -------------------------------------------------------

ALTER TABLE daily_digests
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Backfill from user's default agency
UPDATE daily_digests dd
SET agency_id = am.agency_id
FROM agency_members am
WHERE dd.user_id = am.user_id
  AND am.is_default_agency = true
  AND dd.agency_id IS NULL
  AND am.agency_id IS NOT NULL;

-- Fallback: If no default agency, use any agency the user belongs to
UPDATE daily_digests dd
SET agency_id = (
  SELECT am.agency_id
  FROM agency_members am
  WHERE am.user_id = dd.user_id
    AND am.status = 'active'
  LIMIT 1
)
WHERE dd.agency_id IS NULL;

-- Index for agency_id lookups
CREATE INDEX IF NOT EXISTS idx_daily_digests_agency
  ON daily_digests(agency_id);


-- ============================================================================
-- PART 2: FIX PERMISSIVE RLS POLICIES
-- ============================================================================

-- -------------------------------------------------------
-- 2.1: Replace todo_versions "Allow all" policy
-- -------------------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on todo_versions" ON todo_versions;

-- SELECT: User can view versions of todos in their agencies
CREATE POLICY "todo_versions_select_agency"
  ON todo_versions FOR SELECT
  USING (
    agency_id IS NULL  -- Legacy data fallback
    OR agency_id IN (SELECT public.user_agency_ids())
  );

-- INSERT: User can create versions for todos in their agencies
CREATE POLICY "todo_versions_insert_agency"
  ON todo_versions FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

-- UPDATE: User can update versions they created (or admin)
CREATE POLICY "todo_versions_update_agency"
  ON todo_versions FOR UPDATE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND (
        changed_by = public.get_current_user_name()
        OR public.is_agency_admin(agency_id)
      )
    )
  );

-- DELETE: Only agency admins can delete version history
CREATE POLICY "todo_versions_delete_agency"
  ON todo_versions FOR DELETE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND public.is_agency_admin(agency_id)
    )
  );

-- -------------------------------------------------------
-- 2.2: Replace task_reminders "Allow all" policy
-- -------------------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on task_reminders" ON task_reminders;

-- SELECT: User can view reminders for todos in their agencies
CREATE POLICY "task_reminders_select_agency"
  ON task_reminders FOR SELECT
  USING (
    agency_id IS NULL  -- Legacy data fallback
    OR agency_id IN (SELECT public.user_agency_ids())
  );

-- INSERT: User can create reminders for todos in their agencies
CREATE POLICY "task_reminders_insert_agency"
  ON task_reminders FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND created_by = public.get_current_user_name()
    )
  );

-- UPDATE: User can update their own reminders or those they're assigned to
CREATE POLICY "task_reminders_update_agency"
  ON task_reminders FOR UPDATE
  USING (
    agency_id IS NULL
    OR (
      agency_id IN (SELECT public.user_agency_ids())
      AND (
        created_by = public.get_current_user_name()
        OR user_id = public.get_current_user_id()
        OR public.is_agency_admin(agency_id)
      )
    )
  );

-- DELETE: User can delete their own reminders or admins can delete any
CREATE POLICY "task_reminders_delete_agency"
  ON task_reminders FOR DELETE
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
-- 2.3: Replace daily_digests permissive policies with agency-scoped
-- -------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own digests" ON daily_digests;
DROP POLICY IF EXISTS "Allow digest creation" ON daily_digests;
DROP POLICY IF EXISTS "Allow digest updates" ON daily_digests;

-- SELECT: User can view their own digests within their agencies
CREATE POLICY "daily_digests_select_agency"
  ON daily_digests FOR SELECT
  USING (
    user_id = public.get_current_user_id()
    AND (
      agency_id IS NULL  -- Legacy data fallback
      OR agency_id IN (SELECT public.user_agency_ids())
    )
  );

-- INSERT: System can create digests for users (allow with agency check)
CREATE POLICY "daily_digests_insert_agency"
  ON daily_digests FOR INSERT
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.user_agency_ids())
  );

-- UPDATE: User can update their own digests (mark as read)
CREATE POLICY "daily_digests_update_agency"
  ON daily_digests FOR UPDATE
  USING (
    user_id = public.get_current_user_id()
    AND (
      agency_id IS NULL
      OR agency_id IN (SELECT public.user_agency_ids())
    )
  )
  WITH CHECK (
    user_id = public.get_current_user_id()
    AND (
      agency_id IS NULL
      OR agency_id IN (SELECT public.user_agency_ids())
    )
  );

-- DELETE: Only user can delete their own digests
CREATE POLICY "daily_digests_delete_agency"
  ON daily_digests FOR DELETE
  USING (
    user_id = public.get_current_user_id()
    AND (
      agency_id IS NULL
      OR agency_id IN (SELECT public.user_agency_ids())
    )
  );


-- ============================================================================
-- PART 3: FIX PUSH_SUBSCRIPTIONS RLS (auth.uid() -> PIN auth)
-- ============================================================================

-- Drop existing policies that use auth.uid()
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON push_subscriptions;

-- SELECT: User can view their own subscriptions
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (
    user_id = public.get_current_user_id()
  );

-- INSERT: User can create their own subscriptions
CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (
    user_id = public.get_current_user_id()
  );

-- UPDATE: User can update their own subscriptions
CREATE POLICY "push_subscriptions_update_own"
  ON push_subscriptions FOR UPDATE
  USING (
    user_id = public.get_current_user_id()
  )
  WITH CHECK (
    user_id = public.get_current_user_id()
  );

-- DELETE: User can delete their own subscriptions
CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (
    user_id = public.get_current_user_id()
  );


-- ============================================================================
-- PART 4: FIX NOTIFICATION_LOG RLS (auth.uid() -> PIN auth)
-- ============================================================================

-- Drop existing policies that use auth.uid()
DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_log;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notification_log;

-- SELECT: User can view their own notification log
CREATE POLICY "notification_log_select_own"
  ON notification_log FOR SELECT
  USING (
    user_id = public.get_current_user_id()
  );

-- INSERT: System/service can create notification logs
-- Note: In PIN auth, we allow inserts if user_id matches or no context set (service)
CREATE POLICY "notification_log_insert_any"
  ON notification_log FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NULL  -- Service context (no user set)
    OR user_id = public.get_current_user_id()
  );

-- UPDATE: User can update their own notifications (mark as clicked/dismissed)
CREATE POLICY "notification_log_update_own"
  ON notification_log FOR UPDATE
  USING (
    user_id = public.get_current_user_id()
  )
  WITH CHECK (
    user_id = public.get_current_user_id()
  );

-- DELETE: Only admins or the user themselves
CREATE POLICY "notification_log_delete_own"
  ON notification_log FOR DELETE
  USING (
    user_id = public.get_current_user_id()
  );


-- ============================================================================
-- PART 5: FIX INVITATION TOKEN/HASH MISMATCH
-- ============================================================================

-- The current accept_agency_invitation RPC looks for plaintext `token`
-- but some code paths may store `token_hash`. We need to support both.

-- First, add token_hash column if it doesn't exist
ALTER TABLE agency_invitations
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Create index for token_hash lookups
CREATE INDEX IF NOT EXISTS idx_agency_invitations_token_hash
  ON agency_invitations(token_hash);

-- Update the accept_agency_invitation function to check both token and token_hash
CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
  v_token_hash TEXT;
BEGIN
  -- Compute hash of provided token for comparison
  v_token_hash := encode(sha256(p_token::bytea), 'hex');

  -- Find valid invitation by plaintext token OR hashed token
  SELECT * INTO v_invitation
  FROM agency_invitations ai
  WHERE (
    ai.token = p_token
    OR ai.token_hash = v_token_hash
    OR ai.token = v_token_hash  -- Handle case where token column stores hash
  )
    AND ai.expires_at > NOW()
    AND ai.accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Create membership (do not demote existing owners/managers)
  INSERT INTO agency_members (agency_id, user_id, role, status)
  VALUES (v_invitation.agency_id, p_user_id, v_invitation.role, 'active')
  ON CONFLICT (agency_id, user_id) DO UPDATE
  SET status = 'active',
      role = CASE
        WHEN agency_members.role IN ('owner', 'manager') THEN agency_members.role
        ELSE v_invitation.role
      END,
      updated_at = NOW()
  WHERE agency_members.status != 'active'
    OR agency_members.role NOT IN ('owner', 'manager');

  -- Mark invitation as accepted
  UPDATE agency_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Return result
  RETURN QUERY SELECT v_invitation.agency_id, v_invitation.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_agency_invitation(TEXT, UUID) IS 'Accept invitation by token (plaintext or hash) and create membership';


-- ============================================================================
-- PART 6: UPDATE VERSION HISTORY TRIGGER TO SET AGENCY_ID
-- ============================================================================

-- Update the create_todo_version trigger function to copy agency_id from todo
CREATE OR REPLACE FUNCTION create_todo_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM todo_versions
  WHERE todo_id = NEW.id;

  -- Create version snapshot (including agency_id)
  INSERT INTO todo_versions (
    todo_id,
    agency_id,  -- NEW: Include agency_id
    version_number,
    text,
    completed,
    status,
    priority,
    assigned_to,
    due_date,
    notes,
    subtasks,
    recurrence,
    changed_by,
    changed_at,
    change_type,
    change_summary
  ) VALUES (
    NEW.id,
    NEW.agency_id,  -- NEW: Copy from todo
    next_version,
    NEW.text,
    NEW.completed,
    NEW.status,
    NEW.priority,
    NEW.assigned_to,
    NEW.due_date,
    NEW.notes,
    NEW.subtasks,
    NEW.recurrence,
    COALESCE(NEW.updated_by, public.get_current_user_name()),
    COALESCE(NEW.updated_at, NOW()),
    'updated',
    format('Updated by %s', COALESCE(NEW.updated_by, public.get_current_user_name()))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PART 7: ADD TRIGGER TO PROPAGATE AGENCY_ID TO CHILD RECORDS
-- ============================================================================

-- Function to propagate agency_id when creating task_reminders
CREATE OR REPLACE FUNCTION set_reminder_agency_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If agency_id not set, get it from the parent todo
  IF NEW.agency_id IS NULL THEN
    SELECT agency_id INTO NEW.agency_id
    FROM todos
    WHERE id = NEW.todo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task_reminders
DROP TRIGGER IF EXISTS set_reminder_agency_id_trigger ON task_reminders;
CREATE TRIGGER set_reminder_agency_id_trigger
  BEFORE INSERT ON task_reminders
  FOR EACH ROW
  EXECUTE FUNCTION set_reminder_agency_id();

-- Function to propagate agency_id when creating goal_milestones
CREATE OR REPLACE FUNCTION set_milestone_agency_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If agency_id not set, get it from the parent strategic_goal
  IF NEW.agency_id IS NULL THEN
    SELECT agency_id INTO NEW.agency_id
    FROM strategic_goals
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goal_milestones
DROP TRIGGER IF EXISTS set_milestone_agency_id_trigger ON goal_milestones;
CREATE TRIGGER set_milestone_agency_id_trigger
  BEFORE INSERT ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION set_milestone_agency_id();


-- ============================================================================
-- PART 8: ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns

-- todo_versions: frequently queried by todo_id + agency_id
CREATE INDEX IF NOT EXISTS idx_todo_versions_todo_agency
  ON todo_versions(todo_id, agency_id);

-- task_reminders: frequently queried by status + agency
CREATE INDEX IF NOT EXISTS idx_task_reminders_pending_agency
  ON task_reminders(agency_id, status, reminder_time)
  WHERE status = 'pending';

-- daily_digests: frequently queried by user + agency + date
CREATE INDEX IF NOT EXISTS idx_daily_digests_user_agency_date
  ON daily_digests(user_id, agency_id, digest_date DESC);

-- goal_milestones: frequently queried by goal + agency
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_agency
  ON goal_milestones(goal_id, agency_id);

-- push_subscriptions: Add user_id index if not exists
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON push_subscriptions(user_id, is_active)
  WHERE is_active = TRUE;

-- notification_log: Add composite index for user + type + date
CREATE INDEX IF NOT EXISTS idx_notification_log_user_type_date
  ON notification_log(user_id, notification_type, created_at DESC);


-- ============================================================================
-- PART 9: GRANT PERMISSIONS
-- ============================================================================

-- Ensure all roles have proper access to updated functions
GRANT EXECUTE ON FUNCTION accept_agency_invitation(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_todo_version() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_reminder_agency_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_milestone_agency_id() TO authenticated, anon;


-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON COLUMN goal_milestones.agency_id IS 'Agency scope - backfilled from parent strategic_goal';
COMMENT ON COLUMN task_reminders.agency_id IS 'Agency scope - backfilled from parent todo';
COMMENT ON COLUMN todo_versions.agency_id IS 'Agency scope - backfilled from parent todo';
COMMENT ON COLUMN daily_digests.agency_id IS 'Agency scope - backfilled from user default agency';

COMMENT ON FUNCTION set_reminder_agency_id() IS 'Auto-sets agency_id from parent todo on INSERT';
COMMENT ON FUNCTION set_milestone_agency_id() IS 'Auto-sets agency_id from parent strategic_goal on INSERT';

COMMIT;
