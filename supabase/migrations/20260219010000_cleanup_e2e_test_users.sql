-- Clean up fake users created by E2E test runs
--
-- These users were created by Playwright tests that registered new accounts
-- instead of using the seeded Derrick test user. The patterns match:
--   T{timestamp}_{random}  — from uniqueUserName() in new-features/subtasks/content-import specs
--   E2E Test {timestamp}   — from cross-sell-opportunity-integration spec
--   User{timestamp}        — from summary-generator spec
--   TestUser{timestamp}    — from task-completion-summary spec
--   Test User              — default name from registerAndLogin helpers
--
-- Safe guards:
--   - Only deletes users matching specific test naming patterns
--   - Preserves all real users (Adrian, Derrick, etc.)
--   - Cascade deletes related data (todos, messages, activity) via FK constraints
--   - Does NOT touch any rows that don't match the patterns

-- First delete todos owned by test users (soft-delete won't help here since
-- these are orphan test data). The todos table may not have FK cascade to users.
DELETE FROM todos
WHERE created_by IN (
  SELECT name FROM users
  WHERE name ~ '^T\d+_'           -- T1708123456_abc123
     OR name ~ '^E2E Test \d+'    -- E2E Test 1708123456
     OR name ~ '^User\d+'         -- User1708123456
     OR name ~ '^TestUser\d+'     -- TestUser1708123456
     OR name = 'Test User'        -- default registerAndLogin name
);

-- Delete activity logs for test users
DELETE FROM activity_log
WHERE user_name IN (
  SELECT name FROM users
  WHERE name ~ '^T\d+_'
     OR name ~ '^E2E Test \d+'
     OR name ~ '^User\d+'
     OR name ~ '^TestUser\d+'
     OR name = 'Test User'
);

-- Delete messages by test users
DELETE FROM messages
WHERE user_name IN (
  SELECT name FROM users
  WHERE name ~ '^T\d+_'
     OR name ~ '^E2E Test \d+'
     OR name ~ '^User\d+'
     OR name ~ '^TestUser\d+'
     OR name = 'Test User'
);

-- Delete agency memberships for test users
DELETE FROM agency_members
WHERE user_id IN (
  SELECT id FROM users
  WHERE name ~ '^T\d+_'
     OR name ~ '^E2E Test \d+'
     OR name ~ '^User\d+'
     OR name ~ '^TestUser\d+'
     OR name = 'Test User'
);

-- Delete sessions for test users
DELETE FROM sessions
WHERE user_id IN (
  SELECT id FROM users
  WHERE name ~ '^T\d+_'
     OR name ~ '^E2E Test \d+'
     OR name ~ '^User\d+'
     OR name ~ '^TestUser\d+'
     OR name = 'Test User'
);

-- Finally delete the test users themselves
DELETE FROM users
WHERE name ~ '^T\d+_'
   OR name ~ '^E2E Test \d+'
   OR name ~ '^User\d+'
   OR name ~ '^TestUser\d+'
   OR name = 'Test User';
