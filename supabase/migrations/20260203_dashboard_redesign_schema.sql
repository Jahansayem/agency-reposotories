-- Migration: Dashboard Redesign Schema
-- Date: 2026-02-03
-- Description: Add insurance-specific fields to todos and create agency_metrics table
--              for the manager dashboard redesign with premium tracking and metrics

-- ============================================
-- STEP 1: ADD INSURANCE-SPECIFIC COLUMNS TO TODOS
-- These columns enable categorization, premium tracking,
-- and renewal status for insurance agency workflows
-- ============================================

-- Add category column (insurance task categories)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS category TEXT;

-- Add category check constraint (idempotent)
DO $$ BEGIN
    ALTER TABLE todos ADD CONSTRAINT chk_todos_category
      CHECK (category IS NULL OR category IN (
        'quote',
        'renewal',
        'claim',
        'service',
        'follow-up',
        'prospecting',
        'other'
      ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add premium_amount column for tracking policy premiums
ALTER TABLE todos ADD COLUMN IF NOT EXISTS premium_amount DECIMAL(10,2);

-- Add customer_name column for easy reference
ALTER TABLE todos ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add policy_type column
ALTER TABLE todos ADD COLUMN IF NOT EXISTS policy_type TEXT;

-- Add policy_type check constraint (idempotent)
DO $$ BEGIN
    ALTER TABLE todos ADD CONSTRAINT chk_todos_policy_type
      CHECK (policy_type IS NULL OR policy_type IN (
        'auto',
        'home',
        'life',
        'commercial',
        'bundle'
      ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add renewal_status column for tracking renewal pipeline
ALTER TABLE todos ADD COLUMN IF NOT EXISTS renewal_status TEXT;

-- Add renewal_status check constraint (idempotent)
DO $$ BEGIN
    ALTER TABLE todos ADD CONSTRAINT chk_todos_renewal_status
      CHECK (renewal_status IS NULL OR renewal_status IN (
        'pending',
        'contacted',
        'confirmed',
        'at-risk'
      ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN todos.category IS 'Insurance task category: quote, renewal, claim, service, follow-up, prospecting, other';
COMMENT ON COLUMN todos.premium_amount IS 'Associated policy premium amount in dollars';
COMMENT ON COLUMN todos.customer_name IS 'Customer name associated with this task';
COMMENT ON COLUMN todos.policy_type IS 'Policy type: auto, home, life, commercial, bundle';
COMMENT ON COLUMN todos.renewal_status IS 'Renewal pipeline status: pending, contacted, confirmed, at-risk';

-- ============================================
-- STEP 2: CREATE INDEXES FOR NEW TODO COLUMNS
-- Improve query performance for dashboard aggregations
-- ============================================

CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_policy_type ON todos(policy_type) WHERE policy_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_renewal_status ON todos(renewal_status) WHERE renewal_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_customer_name ON todos(customer_name) WHERE customer_name IS NOT NULL;

-- Composite index for dashboard queries (category + agency for filtering)
CREATE INDEX IF NOT EXISTS idx_todos_category_agency ON todos(agency_id, category) WHERE category IS NOT NULL;

-- Composite index for renewal tracking
CREATE INDEX IF NOT EXISTS idx_todos_renewal_agency ON todos(agency_id, renewal_status) WHERE renewal_status IS NOT NULL;

-- ============================================
-- STEP 3: CREATE AGENCY_METRICS TABLE
-- Monthly metrics tracking for agency performance dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS agency_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: '2026-02'

  -- Retention metrics
  retention_rate DECIMAL(5,2), -- Percentage: 0.00 to 100.00

  -- Premium metrics
  premium_goal DECIMAL(12,2),
  premium_actual DECIMAL(12,2) DEFAULT 0,

  -- Policy count metrics
  policies_goal INTEGER,
  policies_actual INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one record per agency per month
  UNIQUE(agency_id, month)
);

-- Add constraint for month format (YYYY-MM)
DO $$ BEGIN
    ALTER TABLE agency_metrics ADD CONSTRAINT chk_agency_metrics_month_format
      CHECK (month ~ '^\d{4}-\d{2}$');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add constraint for retention rate range
DO $$ BEGIN
    ALTER TABLE agency_metrics ADD CONSTRAINT chk_agency_metrics_retention_rate
      CHECK (retention_rate IS NULL OR (retention_rate >= 0 AND retention_rate <= 100));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add comments for documentation
COMMENT ON TABLE agency_metrics IS 'Monthly performance metrics for agency dashboards';
COMMENT ON COLUMN agency_metrics.month IS 'Month in YYYY-MM format (e.g., 2026-02)';
COMMENT ON COLUMN agency_metrics.retention_rate IS 'Customer retention rate percentage (0-100)';
COMMENT ON COLUMN agency_metrics.premium_goal IS 'Monthly premium goal in dollars';
COMMENT ON COLUMN agency_metrics.premium_actual IS 'Actual premium achieved in dollars';
COMMENT ON COLUMN agency_metrics.policies_goal IS 'Monthly new policies goal';
COMMENT ON COLUMN agency_metrics.policies_actual IS 'Actual new policies written';

-- ============================================
-- STEP 4: CREATE INDEXES FOR AGENCY_METRICS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agency_metrics_agency ON agency_metrics(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_metrics_month ON agency_metrics(month);
CREATE INDEX IF NOT EXISTS idx_agency_metrics_agency_month ON agency_metrics(agency_id, month);

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agency_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "agency_metrics_select_member" ON agency_metrics;
DROP POLICY IF EXISTS "agency_metrics_insert_admin" ON agency_metrics;
DROP POLICY IF EXISTS "agency_metrics_update_admin" ON agency_metrics;
DROP POLICY IF EXISTS "agency_metrics_delete_admin" ON agency_metrics;

-- Permissive policy for agency_metrics (follows app-level access control pattern)
-- Members can view their agency's metrics
CREATE POLICY "agency_metrics_select_member"
  ON agency_metrics FOR SELECT
  USING (
    agency_id IN (SELECT public.user_agency_ids())
  );

-- Admins can insert metrics
CREATE POLICY "agency_metrics_insert_admin"
  ON agency_metrics FOR INSERT
  WITH CHECK (
    public.is_agency_admin(agency_id)
  );

-- Admins can update metrics
CREATE POLICY "agency_metrics_update_admin"
  ON agency_metrics FOR UPDATE
  USING (
    public.is_agency_admin(agency_id)
  );

-- Admins can delete metrics
CREATE POLICY "agency_metrics_delete_admin"
  ON agency_metrics FOR DELETE
  USING (
    public.is_agency_admin(agency_id)
  );

-- ============================================
-- STEP 6: ADD TRIGGER FOR UPDATED_AT
-- ============================================

-- Trigger for agency_metrics updated_at
DROP TRIGGER IF EXISTS agency_metrics_updated_at ON agency_metrics;
CREATE TRIGGER agency_metrics_updated_at
  BEFORE UPDATE ON agency_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: ADD TO REALTIME PUBLICATION
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agency_metrics;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- STEP 8: ADD AUDIT TRIGGER (if audit function exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_func') THEN
    DROP TRIGGER IF EXISTS audit_agency_metrics_trigger ON agency_metrics;
    CREATE TRIGGER audit_agency_metrics_trigger
      AFTER INSERT OR UPDATE OR DELETE ON agency_metrics
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
  END IF;
END $$;

-- ============================================
-- DONE
-- ============================================
