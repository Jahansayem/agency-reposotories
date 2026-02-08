-- Phase 2: Database Schema Hardening
-- Migration: Add NOT NULL constraints, CHECK constraints, and composite indexes
-- Date: 2026-02-06
-- Purpose: Improve data integrity and query performance

-- ==================================================
-- STEP 1: NOT NULL Constraints
-- ==================================================

-- Ensure agency_id is never NULL for multi-tenant data isolation
-- CRITICAL: Run this AFTER verifying all existing rows have agency_id set

-- todos table
ALTER TABLE todos
  ALTER COLUMN agency_id SET NOT NULL;

-- messages table
ALTER TABLE messages
  ALTER COLUMN agency_id SET NOT NULL;

-- activity_log table
ALTER TABLE activity_log
  ALTER COLUMN agency_id SET NOT NULL;

-- task_templates table
ALTER TABLE task_templates
  ALTER COLUMN agency_id SET NOT NULL;

-- cross_sell_opportunities table
ALTER TABLE cross_sell_opportunities
  ALTER COLUMN agency_id SET NOT NULL;

-- customer_insights table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_insights') THEN
    ALTER TABLE customer_insights ALTER COLUMN agency_id SET NOT NULL;
  END IF;
END $$;

-- ==================================================
-- STEP 2: CHECK Constraints
-- ==================================================

-- Priority score validation for cross_sell_opportunities
ALTER TABLE cross_sell_opportunities
  ADD CONSTRAINT chk_priority_score
  CHECK (priority_score >= 0 AND priority_score <= 150);

-- Retry count validation for task_reminders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_reminders') THEN
    ALTER TABLE task_reminders
      ADD CONSTRAINT chk_retry_count
      CHECK (retry_count >= 0 AND retry_count < 10);
  END IF;
END $$;

-- Priority validation for todos
ALTER TABLE todos
  ADD CONSTRAINT chk_priority
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Status validation for todos
ALTER TABLE todos
  ADD CONSTRAINT chk_status
  CHECK (status IN ('todo', 'in_progress', 'done'));

-- Role validation for users
ALTER TABLE users
  ADD CONSTRAINT chk_role
  CHECK (role IN ('owner', 'manager', 'staff') OR role IS NULL);

-- ==================================================
-- STEP 3: Composite Indexes for Performance
-- ==================================================

-- Critical index for RLS queries: todos filtered by agency + creator + assignee
CREATE INDEX IF NOT EXISTS idx_todos_agency_created_assigned
  ON todos(agency_id, created_by, assigned_to)
  WHERE completed = false;

-- Index for message queries: agency + recipient + created_at (DESC for pagination)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created_at
  ON messages(agency_id, recipient, created_at DESC)
  WHERE recipient IS NOT NULL;

-- Index for team chat queries: agency + null recipient
CREATE INDEX IF NOT EXISTS idx_messages_team_chat
  ON messages(agency_id, created_at DESC)
  WHERE recipient IS NULL;

-- Index for activity log queries: agency + user + created_at
CREATE INDEX IF NOT EXISTS idx_activity_log_agency_user
  ON activity_log(agency_id, user_name, created_at DESC);

-- Index for todos due date queries (for reminders)
CREATE INDEX IF NOT EXISTS idx_todos_due_date
  ON todos(due_date)
  WHERE due_date IS NOT NULL AND completed = false;

-- Index for todos with waiting status (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'waiting_for'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_todos_waiting
      ON todos(agency_id, waiting_for, waiting_expected_date)
      WHERE waiting_for IS NOT NULL;
  END IF;
END $$;

-- Index for customer opportunities by tier
CREATE INDEX IF NOT EXISTS idx_opportunities_tier_score
  ON cross_sell_opportunities(agency_id, priority_tier, priority_score DESC)
  WHERE dismissed = false;

-- Index for customer lookup by name (case-insensitive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_insights') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_name_gin
      ON customer_insights USING gin(to_tsvector('english', customer_name))
      WHERE agency_id IS NOT NULL;
  END IF;
END $$;

-- Index for agency members lookup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agency_members') THEN
    CREATE INDEX IF NOT EXISTS idx_agency_members_user_status
      ON agency_members(user_id, status)
      WHERE status = 'active';
  END IF;
END $$;

-- ==================================================
-- STEP 4: Performance Statistics Update
-- ==================================================

-- Analyze tables to update query planner statistics
ANALYZE todos;
ANALYZE messages;
ANALYZE activity_log;
ANALYZE cross_sell_opportunities;

-- Analyze optional tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_insights') THEN
    EXECUTE 'ANALYZE customer_insights';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agency_members') THEN
    EXECUTE 'ANALYZE agency_members';
  END IF;
END $$;

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Verify NOT NULL constraints
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check todos
  SELECT COUNT(*) INTO null_count FROM todos WHERE agency_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % todos with NULL agency_id - migration blocked', null_count;
  END IF;

  -- Check messages
  SELECT COUNT(*) INTO null_count FROM messages WHERE agency_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % messages with NULL agency_id - migration blocked', null_count;
  END IF;

  RAISE NOTICE 'NOT NULL constraint verification passed';
END $$;

-- List all new indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND tablename IN ('todos', 'messages', 'activity_log', 'cross_sell_opportunities', 'customer_insights', 'agency_members')
ORDER BY tablename, indexname;

-- Show table sizes after migration
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('todos', 'messages', 'activity_log')
ORDER BY size_bytes DESC;
