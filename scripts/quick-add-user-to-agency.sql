-- ============================================
-- Quick Add User to Agency (psql command-line ONLY)
-- ============================================
-- ⚠️  This script uses psql variables and will NOT work in Supabase SQL Editor
-- ⚠️  For Supabase SQL Editor, use: add-user-to-agency-supabase.sql
--
-- Usage with psql:
--   psql $DATABASE_URL -f scripts/quick-add-user-to-agency.sql
--
-- Just replace the user name and agency slug below and run!

-- 🔧 CONFIGURE THESE VALUES:
\set user_name 'Sefra'                    -- ← Change this to the user's name
\set agency_slug 'bealer-agency'          -- ← Change this to the agency slug
\set user_role 'member'                   -- ← Can be: 'owner', 'admin', or 'member'
\set is_default false                     -- ← Set to true if this should be default agency

-- First, verify the agency and user exist:
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE slug = :'agency_slug') THEN
    RAISE EXCEPTION 'Agency with slug "%" does not exist. Run this first to see available agencies: SELECT name, slug FROM agencies;', :'agency_slug';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE name = :'user_name') THEN
    RAISE EXCEPTION 'User "%" does not exist. Run this first to see available users: SELECT name FROM users;', :'user_name';
  END IF;
END $;

-- Add user to agency with appropriate permissions
INSERT INTO agency_members (
  user_id,
  agency_id,
  role,
  status,
  permissions,
  is_default_agency
)
SELECT
  u.id,
  a.id,
  :'user_role'::text::agency_role,
  'active',
  CASE :'user_role'::text
    WHEN 'owner' THEN '{
      "can_create_tasks": true,
      "can_delete_tasks": true,
      "can_view_strategic_goals": true,
      "can_invite_users": true,
      "can_manage_templates": true
    }'::jsonb
    WHEN 'admin' THEN '{
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
  END,
  :'is_default'::boolean
FROM users u
CROSS JOIN agencies a
WHERE u.name = :'user_name'
  AND a.slug = :'agency_slug'
ON CONFLICT (user_id, agency_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status,
  is_default_agency = EXCLUDED.is_default_agency;

-- Show the result
SELECT
  u.name as user_name,
  a.name as agency_name,
  a.slug as agency_slug,
  am.role,
  am.is_default_agency,
  am.created_at
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.name = :'user_name'
  AND a.slug = :'agency_slug';
