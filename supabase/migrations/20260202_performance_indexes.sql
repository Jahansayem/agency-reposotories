-- Migration: Performance Indexes for Multi-Tenancy RLS Queries
-- Date: 2026-02-02
-- Description: Add covering and composite indexes to support efficient
--   RLS policy evaluation and common agency-scoped query patterns.
--   Addresses finding M8 from the agent review.

-- Covering index for user_agency_ids() — called per-row in RLS
CREATE INDEX IF NOT EXISTS idx_agency_members_user_status
  ON agency_members(user_id, status) INCLUDE (agency_id);

-- Composite indexes for common agency-scoped queries on todos
CREATE INDEX IF NOT EXISTS idx_todos_agency_created
  ON todos(agency_id, created_by);

CREATE INDEX IF NOT EXISTS idx_todos_agency_assigned
  ON todos(agency_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_todos_agency_status
  ON todos(agency_id, status);

-- Composite indexes for agency-scoped message and activity queries
CREATE INDEX IF NOT EXISTS idx_messages_agency_created_at
  ON messages(agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_agency_created_at
  ON activity_log(agency_id, created_at DESC);
