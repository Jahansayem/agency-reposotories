-- Migration: Multi-Tenancy Support
-- Date: 2026-01-26
-- Description: Add support for multiple agencies with complete data isolation

-- ============================================
-- STEP 1: CREATE AGENCIES TABLE
-- Core tenant table for multi-tenancy
-- ============================================

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0033A0',
  secondary_color TEXT DEFAULT '#72B5E8',
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  max_users INTEGER DEFAULT 10,
  max_storage_mb INTEGER DEFAULT 1024,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for agencies
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON agencies(is_active);

-- Enable RLS on agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE agencies IS 'Multi-tenant agencies - each agency is a separate organization';
COMMENT ON COLUMN agencies.slug IS 'URL-friendly unique identifier for the agency';
COMMENT ON COLUMN agencies.subscription_tier IS 'starter (10 users), professional (50 users), enterprise (unlimited)';

-- ============================================
-- STEP 2: CREATE AGENCY_MEMBERS TABLE
-- User-to-agency relationships with roles
-- ============================================

CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  permissions JSONB DEFAULT '{
    "can_create_tasks": true,
    "can_delete_tasks": false,
    "can_view_strategic_goals": false,
    "can_invite_users": false,
    "can_manage_templates": false
  }'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  is_default_agency BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(agency_id, user_id)
);

-- Create indexes for agency_members
CREATE INDEX IF NOT EXISTS idx_agency_members_agency ON agency_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user ON agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_role ON agency_members(role);
CREATE INDEX IF NOT EXISTS idx_agency_members_status ON agency_members(status);

-- Enable RLS on agency_members
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE agency_members IS 'Junction table linking users to agencies with roles and permissions';
COMMENT ON COLUMN agency_members.role IS 'owner has full control, admin can manage users, member has limited access';
COMMENT ON COLUMN agency_members.is_default_agency IS 'The agency shown by default when user logs in';

-- ============================================
-- STEP 3: CREATE AGENCY_INVITATIONS TABLE
-- Pending invitations for new users
-- ============================================

CREATE TABLE IF NOT EXISTS agency_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for agency_invitations
CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency ON agency_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_email ON agency_invitations(email);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_token ON agency_invitations(token);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_expires ON agency_invitations(expires_at);

-- Enable RLS on agency_invitations
ALTER TABLE agency_invitations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE agency_invitations IS 'Pending invitations for users to join an agency';

-- ============================================
-- STEP 4: ADD EMAIL AND GLOBAL_ROLE TO USERS
-- Support for multi-agency users
-- ============================================

-- Add email column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Add global_role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role TEXT DEFAULT 'user';

-- Add check constraint separately (avoid error if exists)
DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_global_role_check CHECK (global_role IN ('user', 'super_admin'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add comments
COMMENT ON COLUMN users.email IS 'Optional email for invitations and notifications';
COMMENT ON COLUMN users.global_role IS 'super_admin can manage all agencies';

-- ============================================
-- STEP 5: ADD AGENCY_ID TO EXISTING TABLES
-- Add agency scope to all data tables
-- ============================================

-- Add agency_id to todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE todos ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_todos_agency ON todos(agency_id);
  END IF;
END $$;

-- Add agency_id to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_messages_agency ON messages(agency_id);
  END IF;
END $$;

-- Add agency_id to activity_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_log' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE activity_log ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_agency ON activity_log(agency_id);
  END IF;
END $$;

-- Add agency_id to task_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_task_templates_agency ON task_templates(agency_id);
  END IF;
END $$;

-- Add agency_id to strategic_goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_strategic_goals_agency ON strategic_goals(agency_id);
  END IF;
END $$;

-- Add agency_id to goal_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goal_categories' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE goal_categories ADD COLUMN agency_id UUID REFERENCES agencies(id);
    CREATE INDEX IF NOT EXISTS idx_goal_categories_agency ON goal_categories(agency_id);
  END IF;
END $$;

-- ============================================
-- STEP 6: CREATE AGENCY CONTEXT FUNCTIONS
-- Helper functions for RLS policies
-- ============================================

-- Custom function to get user_id from session context (PIN-based auth)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Custom function to get user_name from session context
CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_name', true), '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set session context (called from application)
CREATE OR REPLACE FUNCTION set_request_context(
  p_user_id UUID,
  p_user_name TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.user_name', COALESCE(p_user_name, ''), false);
  IF p_agency_id IS NOT NULL THEN
    PERFORM set_config('app.agency_id', p_agency_id::text, false);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_current_user_id() IS 'Get user_id from session context (set by application)';
COMMENT ON FUNCTION public.get_current_user_name() IS 'Get user_name from session context (set by application)';
COMMENT ON FUNCTION set_request_context(UUID, TEXT, UUID) IS 'Set session context for RLS policies';

-- Function to get current agency from session context
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.agency_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is member of agency
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is agency owner
CREATE OR REPLACE FUNCTION public.is_agency_owner(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND role = 'owner'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is agency admin (owner or admin)
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = public.get_current_user_id()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's role in an agency
CREATE OR REPLACE FUNCTION public.agency_role(p_agency_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM agency_members
  WHERE agency_id = p_agency_id
    AND user_id = public.get_current_user_id()
    AND status = 'active';
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all agencies user belongs to
CREATE OR REPLACE FUNCTION public.user_agency_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT agency_id FROM agency_members
  WHERE user_id = public.get_current_user_id()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.current_agency_id() IS 'Get agency_id from session context (set by app)';
COMMENT ON FUNCTION public.is_agency_member(UUID) IS 'Check if current user is active member of specified agency';
COMMENT ON FUNCTION public.is_agency_owner(UUID) IS 'Check if current user is owner of specified agency';
COMMENT ON FUNCTION public.is_agency_admin(UUID) IS 'Check if current user is owner or admin of specified agency';

-- ============================================
-- STEP 7: CREATE AGENCY RLS POLICIES
-- Multi-tenant data isolation
-- ============================================

-- Agencies: Members can see their agencies
CREATE POLICY "agencies_select_member"
  ON agencies FOR SELECT
  USING (
    id IN (SELECT public.user_agency_ids()) OR
    (SELECT global_role FROM users WHERE id = public.get_current_user_id()) = 'super_admin'
  );

CREATE POLICY "agencies_insert_authenticated"
  ON agencies FOR INSERT
  WITH CHECK (true);  -- Anyone can create an agency (they become owner)

CREATE POLICY "agencies_update_owner"
  ON agencies FOR UPDATE
  USING (public.is_agency_owner(id));

CREATE POLICY "agencies_delete_owner"
  ON agencies FOR DELETE
  USING (public.is_agency_owner(id));

-- Agency Members: Can see members of agencies they belong to
CREATE POLICY "agency_members_select"
  ON agency_members FOR SELECT
  USING (agency_id IN (SELECT public.user_agency_ids()));

CREATE POLICY "agency_members_insert_admin"
  ON agency_members FOR INSERT
  WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "agency_members_update_admin"
  ON agency_members FOR UPDATE
  USING (public.is_agency_admin(agency_id));

CREATE POLICY "agency_members_delete_admin"
  ON agency_members FOR DELETE
  USING (public.is_agency_admin(agency_id));

-- Agency Invitations: Admins can manage invitations
CREATE POLICY "agency_invitations_select_admin"
  ON agency_invitations FOR SELECT
  USING (public.is_agency_admin(agency_id));

CREATE POLICY "agency_invitations_insert_admin"
  ON agency_invitations FOR INSERT
  WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "agency_invitations_delete_admin"
  ON agency_invitations FOR DELETE
  USING (public.is_agency_admin(agency_id));

-- ============================================
-- STEP 8: UPDATE EXISTING TABLE RLS POLICIES
-- Add agency scope to existing policies
-- ============================================

-- Drop old policies first
DROP POLICY IF EXISTS "todos_select_policy" ON todos;
DROP POLICY IF EXISTS "todos_insert_policy" ON todos;
DROP POLICY IF EXISTS "todos_update_policy" ON todos;
DROP POLICY IF EXISTS "todos_delete_policy" ON todos;

-- Todos: Agency-scoped access
CREATE POLICY "todos_select_agency"
  ON todos FOR SELECT
  USING (
    -- Legacy: No agency_id means old data (Bealer Agency)
    agency_id IS NULL OR
    -- New: Check agency membership
    (agency_id IN (SELECT public.user_agency_ids()) AND (
      assigned_to = public.get_current_user_name() OR
      created_by = public.get_current_user_name() OR
      public.is_agency_admin(agency_id)
    ))
  );

CREATE POLICY "todos_insert_agency"
  ON todos FOR INSERT
  WITH CHECK (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND
     created_by = public.get_current_user_name())
  );

CREATE POLICY "todos_update_agency"
  ON todos FOR UPDATE
  USING (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND (
      assigned_to = public.get_current_user_name() OR
      created_by = public.get_current_user_name() OR
      public.is_agency_admin(agency_id)
    ))
  );

CREATE POLICY "todos_delete_agency"
  ON todos FOR DELETE
  USING (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND (
      created_by = public.get_current_user_name() OR
      public.is_agency_admin(agency_id)
    ))
  );

-- Drop old message policies
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- Messages: Agency-scoped access
CREATE POLICY "messages_select_agency"
  ON messages FOR SELECT
  USING (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND (
      recipient IS NULL OR
      recipient = public.get_current_user_name() OR
      created_by = public.get_current_user_name()
    ))
  );

CREATE POLICY "messages_insert_agency"
  ON messages FOR INSERT
  WITH CHECK (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND
     created_by = public.get_current_user_name())
  );

CREATE POLICY "messages_update_agency"
  ON messages FOR UPDATE
  USING (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND
     created_by = public.get_current_user_name())
  );

CREATE POLICY "messages_delete_agency"
  ON messages FOR DELETE
  USING (
    agency_id IS NULL OR
    (agency_id IN (SELECT public.user_agency_ids()) AND (
      created_by = public.get_current_user_name() OR
      public.is_agency_admin(agency_id)
    ))
  );

-- Drop old goals policies
DROP POLICY IF EXISTS "goals_select_policy" ON strategic_goals;
DROP POLICY IF EXISTS "goals_insert_policy" ON strategic_goals;
DROP POLICY IF EXISTS "goals_update_policy" ON strategic_goals;
DROP POLICY IF EXISTS "goals_delete_policy" ON strategic_goals;

-- Strategic Goals: Agency owner/admin only
CREATE POLICY "goals_select_agency"
  ON strategic_goals FOR SELECT
  USING (
    agency_id IS NULL OR
    public.is_agency_admin(agency_id)
  );

CREATE POLICY "goals_insert_agency"
  ON strategic_goals FOR INSERT
  WITH CHECK (
    agency_id IS NULL OR
    public.is_agency_admin(agency_id)
  );

CREATE POLICY "goals_update_agency"
  ON strategic_goals FOR UPDATE
  USING (
    agency_id IS NULL OR
    public.is_agency_admin(agency_id)
  );

CREATE POLICY "goals_delete_agency"
  ON strategic_goals FOR DELETE
  USING (
    agency_id IS NULL OR
    public.is_agency_admin(agency_id)
  );

-- Drop old milestone policies
DROP POLICY IF EXISTS "milestones_select_policy" ON goal_milestones;
DROP POLICY IF EXISTS "milestones_insert_policy" ON goal_milestones;
DROP POLICY IF EXISTS "milestones_update_policy" ON goal_milestones;
DROP POLICY IF EXISTS "milestones_delete_policy" ON goal_milestones;

-- Goal Milestones: Follow parent goal permissions
CREATE POLICY "milestones_select_agency"
  ON goal_milestones FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM strategic_goals
      WHERE agency_id IS NULL OR public.is_agency_admin(agency_id)
    )
  );

CREATE POLICY "milestones_insert_agency"
  ON goal_milestones FOR INSERT
  WITH CHECK (
    goal_id IN (
      SELECT id FROM strategic_goals
      WHERE agency_id IS NULL OR public.is_agency_admin(agency_id)
    )
  );

CREATE POLICY "milestones_update_agency"
  ON goal_milestones FOR UPDATE
  USING (
    goal_id IN (
      SELECT id FROM strategic_goals
      WHERE agency_id IS NULL OR public.is_agency_admin(agency_id)
    )
  );

CREATE POLICY "milestones_delete_agency"
  ON goal_milestones FOR DELETE
  USING (
    goal_id IN (
      SELECT id FROM strategic_goals
      WHERE agency_id IS NULL OR public.is_agency_admin(agency_id)
    )
  );

-- ============================================
-- STEP 9: ADD TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agencies
DROP TRIGGER IF EXISTS agencies_updated_at ON agencies;
CREATE TRIGGER agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for agency_members
DROP TRIGGER IF EXISTS agency_members_updated_at ON agency_members;
CREATE TRIGGER agency_members_updated_at
  BEFORE UPDATE ON agency_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 10: ADD AUDIT TRIGGERS TO NEW TABLES
-- Only if audit_trigger_func exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_func') THEN
    DROP TRIGGER IF EXISTS audit_agencies_trigger ON agencies;
    CREATE TRIGGER audit_agencies_trigger
      AFTER INSERT OR UPDATE OR DELETE ON agencies
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

    DROP TRIGGER IF EXISTS audit_agency_members_trigger ON agency_members;
    CREATE TRIGGER audit_agency_members_trigger
      AFTER INSERT OR UPDATE OR DELETE ON agency_members
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

    DROP TRIGGER IF EXISTS audit_agency_invitations_trigger ON agency_invitations;
    CREATE TRIGGER audit_agency_invitations_trigger
      AFTER INSERT OR UPDATE OR DELETE ON agency_invitations
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
  END IF;
END $$;

-- ============================================
-- STEP 11: ENABLE REAL-TIME FOR NEW TABLES
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agencies;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agency_members;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- STEP 12: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to create an agency with the creator as owner
CREATE OR REPLACE FUNCTION create_agency_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Create the agency
  INSERT INTO agencies (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_agency_id;

  -- Add creator as owner
  INSERT INTO agency_members (agency_id, user_id, role, is_default_agency, permissions)
  VALUES (
    v_agency_id,
    p_user_id,
    'owner',
    true,
    '{
      "can_create_tasks": true,
      "can_delete_tasks": true,
      "can_view_strategic_goals": true,
      "can_invite_users": true,
      "can_manage_templates": true
    }'::jsonb
  );

  RETURN v_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_agency_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(agency_id UUID, role TEXT) AS $$
DECLARE
  v_invitation RECORD;
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

  -- Create membership
  INSERT INTO agency_members (agency_id, user_id, role, status)
  VALUES (v_invitation.agency_id, p_user_id, v_invitation.role, 'active')
  ON CONFLICT (agency_id, user_id) DO UPDATE
  SET status = 'active', role = v_invitation.role;

  -- Mark invitation as accepted
  UPDATE agency_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Return result
  RETURN QUERY SELECT v_invitation.agency_id, v_invitation.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_agency_with_owner(TEXT, TEXT, UUID) IS 'Create agency and add creator as owner';
COMMENT ON FUNCTION accept_agency_invitation(TEXT, UUID) IS 'Accept invitation and create membership';

-- ============================================
-- STEP 13: CREATE BEALER AGENCY MIGRATION
-- Backfill existing data to Bealer Agency
-- Run this AFTER initial deployment
-- ============================================

-- This creates the Bealer Agency and migrates existing data
-- Should be run separately after verifying schema changes work
CREATE OR REPLACE FUNCTION migrate_to_bealer_agency()
RETURNS void AS $$
DECLARE
  v_bealer_agency_id UUID;
  v_derrick_user_id UUID;
BEGIN
  -- Check if already migrated
  SELECT id INTO v_bealer_agency_id FROM agencies WHERE slug = 'bealer-agency';
  IF FOUND THEN
    RAISE NOTICE 'Bealer Agency already exists, skipping migration';
    RETURN;
  END IF;

  -- Create Bealer Agency
  INSERT INTO agencies (name, slug, primary_color, secondary_color, subscription_tier, max_users, max_storage_mb)
  VALUES ('Bealer Agency', 'bealer-agency', '#0033A0', '#72B5E8', 'professional', 50, 5120)
  RETURNING id INTO v_bealer_agency_id;

  RAISE NOTICE 'Created Bealer Agency with ID: %', v_bealer_agency_id;

  -- Get Derrick's user ID
  SELECT id INTO v_derrick_user_id FROM users WHERE name = 'Derrick';

  -- Create agency memberships for all existing users
  INSERT INTO agency_members (agency_id, user_id, role, status, is_default_agency, permissions)
  SELECT
    v_bealer_agency_id,
    u.id,
    CASE WHEN u.name = 'Derrick' THEN 'owner' ELSE 'member' END,
    'active',
    true,
    CASE
      WHEN u.name = 'Derrick' THEN '{
        "can_create_tasks": true,
        "can_delete_tasks": true,
        "can_view_strategic_goals": true,
        "can_invite_users": true,
        "can_manage_templates": true
      }'::jsonb
      ELSE '{
        "can_create_tasks": true,
        "can_delete_tasks": false,
        "can_view_strategic_goals": false,
        "can_invite_users": false,
        "can_manage_templates": false
      }'::jsonb
    END
  FROM users u
  ON CONFLICT (agency_id, user_id) DO NOTHING;

  RAISE NOTICE 'Created agency memberships for existing users';

  -- Backfill agency_id on all existing data
  UPDATE todos SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;
  UPDATE messages SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;
  UPDATE activity_log SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;
  UPDATE task_templates SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;
  UPDATE strategic_goals SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;
  UPDATE goal_categories SET agency_id = v_bealer_agency_id WHERE agency_id IS NULL;

  RAISE NOTICE 'Backfilled agency_id on all existing data';

  RAISE NOTICE 'Migration complete!';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_to_bealer_agency() IS 'One-time migration to create Bealer Agency and assign existing data';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE agencies IS 'Multi-tenant agencies for supporting multiple Allstate agencies';
COMMENT ON TABLE agency_members IS 'User-to-agency relationships with roles and permissions';
COMMENT ON TABLE agency_invitations IS 'Pending invitations for users to join agencies';
