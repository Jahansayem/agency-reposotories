-- ============================================
-- Add User to Agency (Supabase SQL Editor)
-- ============================================
-- Instructions:
-- 1. Edit the values in the WITH clause below
-- 2. Copy everything and paste into Supabase SQL Editor
-- 3. Click Run

-- 🔧 CONFIGURE THESE VALUES:
WITH config AS (
  SELECT
    'Sefra' AS user_name,           -- ← Change this to the user's name
    'bealer-agency' AS agency_slug,  -- ← Change this to the agency slug
    'member' AS user_role,           -- ← Can be: 'owner', 'admin', or 'member'
    false AS is_default              -- ← Set to true if this should be default agency
)
-- ============================================
-- The rest of the script runs automatically
-- ============================================

-- Step 1: Show available options
SELECT 'Available Agencies:' AS step, name, slug FROM agencies WHERE is_active = true
UNION ALL
SELECT 'Available Users:' AS step, name, '' FROM users
ORDER BY step, name;

-- Step 2: Add user to agency
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
  c.user_role::agency_role,
  'active',
  CASE c.user_role
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
  c.is_default
FROM config c
CROSS JOIN users u
CROSS JOIN agencies a
WHERE u.name = c.user_name
  AND a.slug = c.agency_slug
ON CONFLICT (user_id, agency_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = 'active',
  is_default_agency = EXCLUDED.is_default_agency;

-- Step 3: Show the result
SELECT
  'Result:' AS step,
  u.name AS user_name,
  a.name AS agency_name,
  a.slug AS agency_slug,
  am.role,
  am.status,
  am.is_default_agency AS is_default,
  am.created_at
FROM config c
JOIN users u ON u.name = c.user_name
JOIN agencies a ON a.slug = c.agency_slug
JOIN agency_members am ON am.user_id = u.id AND am.agency_id = a.id;
