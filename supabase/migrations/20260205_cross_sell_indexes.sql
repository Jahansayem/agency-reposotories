-- ============================================
-- Cross-sell Performance Indexes
-- ============================================
-- Purpose: Add missing indexes for frequently queried columns
-- to improve query performance (3-5x improvement expected)
--
-- Problem: Missing indexes on columns filtered/grouped constantly:
-- - priority_tier: filtered in dashboard views
-- - segment (segment_type): grouped by in analytics
-- - status fields: filtered for active/completed
-- - agency_id: multi-tenant filtering
--
-- Author: Claude Code Integration
-- Date: 2026-02-05
-- ============================================

-- ============================================
-- Indexes on cross_sell_opportunities
-- ============================================

-- Index on priority_tier alone (for simple filtering)
-- Note: idx_cross_sell_priority_tier already exists with (agency_id, priority_tier, priority_rank)
-- This adds a simpler single-column index for priority-only queries
CREATE INDEX IF NOT EXISTS idx_cross_sell_priority_tier_only
  ON cross_sell_opportunities(priority_tier);

-- Index on segment_type for analytics grouping
CREATE INDEX IF NOT EXISTS idx_cross_sell_segment
  ON cross_sell_opportunities(segment_type);

-- Index on segment text column (the actual segment description)
CREATE INDEX IF NOT EXISTS idx_cross_sell_segment_text
  ON cross_sell_opportunities(segment);

-- Index on renewal_status for status filtering
CREATE INDEX IF NOT EXISTS idx_cross_sell_status
  ON cross_sell_opportunities(renewal_status);

-- Index on contact_outcome for workflow status
CREATE INDEX IF NOT EXISTS idx_cross_sell_contact_outcome
  ON cross_sell_opportunities(contact_outcome);

-- Index on agency_id alone (for simple tenant filtering)
CREATE INDEX IF NOT EXISTS idx_cross_sell_agency_id
  ON cross_sell_opportunities(agency_id);

-- Composite index for common query pattern: agency + status + tier
CREATE INDEX IF NOT EXISTS idx_cross_sell_agency_status_tier
  ON cross_sell_opportunities(agency_id, renewal_status, priority_tier);

-- Composite index for dismissed filtering with agency
CREATE INDEX IF NOT EXISTS idx_cross_sell_agency_dismissed
  ON cross_sell_opportunities(agency_id, dismissed);

-- ============================================
-- Indexes on customer_insights (no "customers" table exists)
-- ============================================

-- Index on agency_id for multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_customer_insights_agency_id
  ON customer_insights(agency_id);

-- Index on total_policies for cross-sell joins and filtering
CREATE INDEX IF NOT EXISTS idx_customer_insights_policy_count
  ON customer_insights(total_policies);

-- Composite index for agency + policy count queries
CREATE INDEX IF NOT EXISTS idx_customer_insights_agency_policies
  ON customer_insights(agency_id, total_policies);

-- Index on priority_score for cross-sell prioritization
CREATE INDEX IF NOT EXISTS idx_customer_insights_priority_score
  ON customer_insights(priority_score DESC);

-- ============================================
-- Indexes on renewal_calendar
-- ============================================

-- Index on agency_id alone
CREATE INDEX IF NOT EXISTS idx_renewal_calendar_agency_id
  ON renewal_calendar(agency_id);

-- Index on has_cross_sell_opportunity for filtering
CREATE INDEX IF NOT EXISTS idx_renewal_calendar_has_opportunity
  ON renewal_calendar(has_cross_sell_opportunity);

-- ============================================
-- Indexes on data_upload_batches
-- ============================================

-- Index on status alone for quick status filtering
CREATE INDEX IF NOT EXISTS idx_upload_batches_status
  ON data_upload_batches(status);

-- ============================================
-- Analyze tables to update statistics
-- ============================================
-- This helps the query planner make better decisions
-- with the new indexes

ANALYZE cross_sell_opportunities;
ANALYZE customer_insights;
ANALYZE renewal_calendar;
ANALYZE data_upload_batches;

-- ============================================
-- Comments
-- ============================================

COMMENT ON INDEX idx_cross_sell_priority_tier_only IS 'Single-column index for priority tier filtering without agency constraint';
COMMENT ON INDEX idx_cross_sell_segment IS 'Index for analytics grouping by segment_type';
COMMENT ON INDEX idx_cross_sell_agency_status_tier IS 'Composite index for common dashboard query pattern';
COMMENT ON INDEX idx_customer_insights_agency_id IS 'Multi-tenant filtering on customer insights';
