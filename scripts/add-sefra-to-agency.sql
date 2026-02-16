-- ============================================
-- Add Sefra to Wavezly
-- ============================================
-- Simple script to add Sefra as a member of Wavezly
-- Just copy and paste into Supabase SQL Editor and run!

-- First, show what agencies exist (to verify the slug)
SELECT
  'Available Agencies:' as info,
  id,
  name,
  slug
FROM agencies
WHERE is_active = true;

-- Add Sefra to Wavezly
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
  'member',
  'active',
  '{
    "can_create_tasks": true,
    "can_delete_tasks": false,
    "can_view_strategic_goals": false,
    "can_invite_users": false,
    "can_manage_templates": false
  }'::jsonb,
  false
FROM users u
CROSS JOIN agencies a
WHERE u.name = 'Sefra'
  AND a.slug = 'wavezly'
ON CONFLICT (user_id, agency_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = 'active';

-- Verify Sefra was added successfully
SELECT
  'Result:' as info,
  u.name as user_name,
  a.name as agency_name,
  a.slug as agency_slug,
  am.role,
  am.status,
  am.is_default_agency
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.name = 'Sefra'
  AND a.slug = 'wavezly';
