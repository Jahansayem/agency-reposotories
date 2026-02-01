/**
 * Quick Seed Script: Bealer Agency Setup
 *
 * Run this in Supabase SQL Editor to bootstrap the multi-agency system.
 * Creates Bealer Agency and assigns all existing users.
 *
 * Usage:
 * 1. Go to Supabase Dashboard → SQL Editor
 * 2. Copy/paste this entire script
 * 3. Click "Run"
 */

-- Create Bealer Agency
INSERT INTO agencies (name, slug, is_active, primary_color)
VALUES ('Bealer Agency', 'bealer-agency', true, '#0033A0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color;

-- Assign all users to Bealer Agency
WITH bealer AS (
  SELECT id FROM agencies WHERE slug = 'bealer-agency'
)
INSERT INTO agency_members (user_id, agency_id, role, status, permissions, is_default_agency)
SELECT
  u.id,
  b.id,
  COALESCE(u.role, 'member')::agency_role,
  'active',
  CASE
    WHEN u.role = 'owner' THEN '{"can_manage_members": true, "can_manage_settings": true, "can_create_tasks": true, "can_edit_all_tasks": true, "can_delete_all_tasks": true, "can_view_analytics": true, "can_manage_templates": true, "can_manage_categories": true}'::jsonb
    WHEN u.role = 'admin' THEN '{"can_manage_members": true, "can_manage_settings": false, "can_create_tasks": true, "can_edit_all_tasks": true, "can_delete_all_tasks": false, "can_view_analytics": true, "can_manage_templates": true, "can_manage_categories": false}'::jsonb
    ELSE '{"can_manage_members": false, "can_manage_settings": false, "can_create_tasks": true, "can_edit_all_tasks": false, "can_delete_all_tasks": false, "can_view_analytics": false, "can_manage_templates": false, "can_manage_categories": false}'::jsonb
  END,
  true
FROM users u
CROSS JOIN bealer b
ON CONFLICT (user_id, agency_id) DO NOTHING;

-- Migrate existing todos
WITH bealer AS (SELECT id FROM agencies WHERE slug = 'bealer-agency')
UPDATE todos SET agency_id = (SELECT id FROM bealer) WHERE agency_id IS NULL;

-- Migrate existing messages
WITH bealer AS (SELECT id FROM agencies WHERE slug = 'bealer-agency')
UPDATE messages SET agency_id = (SELECT id FROM bealer) WHERE agency_id IS NULL;

-- Migrate existing activity_log
WITH bealer AS (SELECT id FROM agencies WHERE slug = 'bealer-agency')
UPDATE activity_log SET agency_id = (SELECT id FROM bealer) WHERE agency_id IS NULL;

-- Migrate existing task_templates
WITH bealer AS (SELECT id FROM agencies WHERE slug = 'bealer-agency')
UPDATE task_templates SET agency_id = (SELECT id FROM bealer) WHERE agency_id IS NULL;

-- Migrate existing strategic_goals
WITH bealer AS (SELECT id FROM agencies WHERE slug = 'bealer-agency')
UPDATE strategic_goals SET agency_id = (SELECT id FROM bealer) WHERE agency_id IS NULL;

-- Verify results
SELECT
  'Agency Created' as status,
  name,
  slug,
  (SELECT COUNT(*) FROM agency_members WHERE agency_id = agencies.id) as members
FROM agencies WHERE slug = 'bealer-agency';
