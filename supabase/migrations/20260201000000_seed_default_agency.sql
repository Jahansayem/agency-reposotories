/**
 * Migration: Seed Default Agency (Wavezly)
 *
 * Creates the default "Wavezly" and assigns all existing users as members.
 * This is a one-time migration to bootstrap the multi-agency system.
 *
 * Date: 2026-02-01
 * Status: Part of multi-agency implementation completion
 */

-- ============================================
-- 1. Create Default Agency
-- ============================================

-- Insert Wavezly (if not exists)
INSERT INTO agencies (
  id,
  name,
  slug,
  is_active,
  primary_color,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'Wavezly',
  'wavezly',
  true,
  '#0033A0', -- Allstate brand blue
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Get the agency ID for later use
DO $$
DECLARE
  bealer_agency_id UUID;
  user_record RECORD;
BEGIN
  -- Get Wavezly ID
  SELECT id INTO bealer_agency_id
  FROM agencies
  WHERE slug = 'wavezly';

  -- If agency doesn't exist, raise error
  IF bealer_agency_id IS NULL THEN
    RAISE EXCEPTION 'Wavezly not found - migration failed';
  END IF;

  -- Assign all existing users to Wavezly
  FOR user_record IN SELECT id, name, role FROM users LOOP
    -- Insert membership (skip if already exists)
    INSERT INTO agency_members (
      user_id,
      agency_id,
      role,
      status,
      permissions,
      is_default_agency,
      joined_at
    )
    VALUES (
      user_record.id,
      bealer_agency_id,
      -- Map user.role to agency role:
      -- 'owner' (Derrick) -> 'owner'
      -- 'admin' -> 'admin'
      -- 'member' or NULL -> 'member'
      CASE
        WHEN user_record.role = 'owner' THEN 'owner'
        WHEN user_record.role = 'admin' THEN 'admin'
        ELSE 'member'
      END,
      'active',
      -- Set permissions based on role
      CASE
        WHEN user_record.role = 'owner' THEN jsonb_build_object(
          'can_manage_members', true,
          'can_manage_settings', true,
          'can_create_tasks', true,
          'can_edit_all_tasks', true,
          'can_delete_all_tasks', true,
          'can_view_analytics', true,
          'can_manage_templates', true,
          'can_manage_categories', true
        )
        WHEN user_record.role = 'admin' THEN jsonb_build_object(
          'can_manage_members', true,
          'can_manage_settings', false,
          'can_create_tasks', true,
          'can_edit_all_tasks', true,
          'can_delete_all_tasks', false,
          'can_view_analytics', true,
          'can_manage_templates', true,
          'can_manage_categories', false
        )
        ELSE jsonb_build_object(
          'can_manage_members', false,
          'can_manage_settings', false,
          'can_create_tasks', true,
          'can_edit_all_tasks', false,
          'can_delete_all_tasks', false,
          'can_view_analytics', false,
          'can_manage_templates', false,
          'can_manage_categories', false
        )
      END,
      true, -- Set as default agency
      NOW()
    )
    ON CONFLICT (user_id, agency_id) DO NOTHING;

    RAISE NOTICE 'Assigned user % (%) to Wavezly', user_record.name, user_record.role;
  END LOOP;

  RAISE NOTICE 'Successfully seeded Wavezly with % members', (SELECT COUNT(*) FROM users);
END $$;

-- ============================================
-- 2. Migrate Existing Data to Agency Scope
-- ============================================

-- Add agency_id to existing todos (if NULL)
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';

  UPDATE todos
  SET agency_id = bealer_agency_id
  WHERE agency_id IS NULL;

  RAISE NOTICE 'Migrated % todos to Wavezly', (SELECT COUNT(*) FROM todos WHERE agency_id = bealer_agency_id);
END $$;

-- Add agency_id to existing messages (if NULL)
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';

  UPDATE messages
  SET agency_id = bealer_agency_id
  WHERE agency_id IS NULL;

  RAISE NOTICE 'Migrated % messages to Wavezly', (SELECT COUNT(*) FROM messages WHERE agency_id = bealer_agency_id);
END $$;

-- Add agency_id to existing activity_log (if NULL)
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';

  UPDATE activity_log
  SET agency_id = bealer_agency_id
  WHERE agency_id IS NULL;

  RAISE NOTICE 'Migrated % activity log entries to Wavezly', (SELECT COUNT(*) FROM activity_log WHERE agency_id = bealer_agency_id);
END $$;

-- Add agency_id to existing task_templates (if NULL)
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';

  UPDATE task_templates
  SET agency_id = bealer_agency_id
  WHERE agency_id IS NULL;

  RAISE NOTICE 'Migrated % task templates to Wavezly', (SELECT COUNT(*) FROM task_templates WHERE agency_id = bealer_agency_id);
END $$;

-- Add agency_id to existing strategic_goals (if NULL)
DO $$
DECLARE
  bealer_agency_id UUID;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';

  UPDATE strategic_goals
  SET agency_id = bealer_agency_id
  WHERE agency_id IS NULL;

  RAISE NOTICE 'Migrated % strategic goals to Wavezly', (SELECT COUNT(*) FROM strategic_goals WHERE agency_id = bealer_agency_id);
END $$;

-- ============================================
-- 3. Verification
-- ============================================

-- Show final state
DO $$
DECLARE
  bealer_agency_id UUID;
  member_count INT;
  todo_count INT;
  message_count INT;
BEGIN
  SELECT id INTO bealer_agency_id FROM agencies WHERE slug = 'wavezly';
  SELECT COUNT(*) INTO member_count FROM agency_members WHERE agency_id = bealer_agency_id;
  SELECT COUNT(*) INTO todo_count FROM todos WHERE agency_id = bealer_agency_id;
  SELECT COUNT(*) INTO message_count FROM messages WHERE agency_id = bealer_agency_id;

  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE '   Agency: Wavezly (%))', bealer_agency_id;
  RAISE NOTICE '   Members: %', member_count;
  RAISE NOTICE '   Todos: %', todo_count;
  RAISE NOTICE '   Messages: %', message_count;
END $$;
