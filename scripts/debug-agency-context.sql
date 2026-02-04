-- Debug: Check if Derrick has agency memberships

-- 1. Find Derrick's user record
SELECT 'Derrick User Record:' as debug_step;
SELECT id, name, role FROM users WHERE name = 'Derrick';

-- 2. Check agency_members for Derrick
SELECT 'Derrick Agency Memberships:' as debug_step;
SELECT
  am.user_id,
  am.agency_id,
  am.role,
  am.status,
  a.name as agency_name,
  a.slug as agency_slug
FROM agency_members am
LEFT JOIN agencies a ON am.agency_id = a.id
WHERE am.user_id = (SELECT id FROM users WHERE name = 'Derrick');

-- 3. Check all agencies
SELECT 'All Agencies:' as debug_step;
SELECT id, name, slug, is_active FROM agencies;

-- 4. Check all agency_members
SELECT 'All Agency Members:' as debug_step;
SELECT
  am.user_id,
  u.name as user_name,
  am.agency_id,
  a.name as agency_name,
  am.role,
  am.status
FROM agency_members am
LEFT JOIN users u ON am.user_id = u.id
LEFT JOIN agencies a ON am.agency_id = a.id;
