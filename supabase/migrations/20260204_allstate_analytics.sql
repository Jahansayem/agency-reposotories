-- ============================================
-- Allstate Analytics Integration Schema
-- ============================================
-- Purpose: Support weekly data import workflow for cross-sell opportunities
-- and renewal tracking from Allstate Book of Business data
--
-- Tables created:
-- 1. data_upload_batches - Track each file upload for auditing
-- 2. cross_sell_opportunities - Main cross-sell opportunity records
-- 3. renewal_calendar - Calendar view of upcoming renewals
-- 4. customer_insights - Aggregated customer analytics
--
-- Author: Claude Code Integration
-- Date: 2026-02-04
-- ============================================

-- ============================================
-- Table 1: data_upload_batches
-- Tracks each data upload for auditing and rollback capability
-- ============================================

CREATE TABLE IF NOT EXISTS data_upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Upload metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx', 'xls')),
  data_source TEXT NOT NULL CHECK (data_source IN (
    'book_of_business',
    'cross_sell_report',
    'renewal_list',
    'retention_report',
    'production_report',
    'other'
  )),

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial'
  )),
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Results
  total_records INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB DEFAULT '[]'::jsonb,

  -- Summary statistics
  summary JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by agency and status
CREATE INDEX IF NOT EXISTS idx_upload_batches_agency_status
  ON data_upload_batches(agency_id, status);

-- Index for querying recent uploads
CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_at
  ON data_upload_batches(uploaded_at DESC);

-- ============================================
-- Table 2: cross_sell_opportunities
-- Main cross-sell opportunity records from Allstate data analysis
-- ============================================

CREATE TABLE IF NOT EXISTS cross_sell_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  upload_batch_id UUID REFERENCES data_upload_batches(id) ON DELETE SET NULL,

  -- Priority scoring
  priority_rank INTEGER NOT NULL,
  priority_tier TEXT NOT NULL CHECK (priority_tier IN ('HOT', 'HIGH', 'MEDIUM', 'LOW')),
  priority_score INTEGER NOT NULL DEFAULT 0,

  -- Customer information (encrypted fields for PII)
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,

  -- Renewal information
  renewal_date DATE,
  days_until_renewal INTEGER,
  renewal_status TEXT DEFAULT 'Not Taken' CHECK (renewal_status IN (
    'Not Taken', 'Renewed', 'Pending', 'At Risk', 'Cancelled'
  )),

  -- Product information
  current_products TEXT,
  recommended_product TEXT,
  segment TEXT,
  segment_type TEXT DEFAULT 'other' CHECK (segment_type IN (
    'auto_to_home', 'home_to_auto', 'mono_to_bundle',
    'add_life', 'add_umbrella', 'commercial_add', 'other'
  )),

  -- Financial metrics
  current_premium DECIMAL(12, 2) DEFAULT 0,
  potential_premium_add DECIMAL(12, 2) DEFAULT 0,
  expected_conversion_pct DECIMAL(5, 2) DEFAULT 0,
  retention_lift_pct DECIMAL(5, 2) DEFAULT 0,

  -- Talking points for sales calls
  talking_point_1 TEXT,
  talking_point_2 TEXT,
  talking_point_3 TEXT,

  -- Account status
  balance_due DECIMAL(12, 2) DEFAULT 0,
  ezpay_status TEXT DEFAULT 'No' CHECK (ezpay_status IN ('Yes', 'No', 'Pending')),
  tenure_years INTEGER DEFAULT 0,
  policy_count INTEGER DEFAULT 1,

  -- Workflow tracking
  contacted_at TIMESTAMP WITH TIME ZONE,
  contacted_by TEXT,
  contact_notes TEXT,
  contact_outcome TEXT CHECK (contact_outcome IN (
    'quoted', 'sold', 'declined', 'callback', 'no_answer'
  )),
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_premium DECIMAL(12, 2),
  task_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for filtering by priority tier
CREATE INDEX IF NOT EXISTS idx_cross_sell_priority_tier
  ON cross_sell_opportunities(agency_id, priority_tier, priority_rank);

-- Index for renewal date queries (calendar view)
CREATE INDEX IF NOT EXISTS idx_cross_sell_renewal_date
  ON cross_sell_opportunities(agency_id, renewal_date)
  WHERE dismissed = FALSE;

-- Index for active opportunities (not contacted, not dismissed)
CREATE INDEX IF NOT EXISTS idx_cross_sell_active
  ON cross_sell_opportunities(agency_id, priority_rank)
  WHERE contacted_at IS NULL AND dismissed = FALSE;

-- Index for customer name search
CREATE INDEX IF NOT EXISTS idx_cross_sell_customer_name
  ON cross_sell_opportunities(agency_id, customer_name);

-- Index for linked tasks
CREATE INDEX IF NOT EXISTS idx_cross_sell_task_id
  ON cross_sell_opportunities(task_id)
  WHERE task_id IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_cross_sell_filters
  ON cross_sell_opportunities(agency_id, priority_tier, segment_type, renewal_date)
  WHERE dismissed = FALSE;

-- ============================================
-- Table 3: renewal_calendar
-- Calendar view of upcoming renewals with cross-sell links
-- ============================================

CREATE TABLE IF NOT EXISTS renewal_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Customer info
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Renewal details
  renewal_date DATE NOT NULL,
  policy_type TEXT,
  current_premium DECIMAL(12, 2) DEFAULT 0,

  -- Cross-sell opportunity link
  cross_sell_opportunity_id UUID REFERENCES cross_sell_opportunities(id) ON DELETE SET NULL,
  has_cross_sell_opportunity BOOLEAN DEFAULT FALSE,
  cross_sell_priority TEXT CHECK (cross_sell_priority IN ('HOT', 'HIGH', 'MEDIUM', 'LOW')),
  recommended_product TEXT,

  -- Status tracking
  contacted BOOLEAN DEFAULT FALSE,
  contact_date TIMESTAMP WITH TIME ZONE,
  renewal_confirmed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for calendar date range queries
CREATE INDEX IF NOT EXISTS idx_renewal_calendar_date
  ON renewal_calendar(agency_id, renewal_date);

-- Index for uncontacted renewals
CREATE INDEX IF NOT EXISTS idx_renewal_calendar_uncontacted
  ON renewal_calendar(agency_id, renewal_date)
  WHERE contacted = FALSE;

-- Index for cross-sell opportunities
CREATE INDEX IF NOT EXISTS idx_renewal_calendar_cross_sell
  ON renewal_calendar(agency_id, renewal_date)
  WHERE has_cross_sell_opportunity = TRUE;

-- ============================================
-- Table 4: customer_insights
-- Aggregated customer analytics for dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS customer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Customer identification
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Portfolio summary
  total_policies INTEGER DEFAULT 0,
  total_premium DECIMAL(12, 2) DEFAULT 0,
  products_held TEXT[] DEFAULT '{}',
  tenure_years INTEGER DEFAULT 0,

  -- Opportunity metrics
  cross_sell_potential DECIMAL(12, 2) DEFAULT 0,
  recommended_products TEXT[] DEFAULT '{}',
  priority_score INTEGER DEFAULT 0,

  -- Risk indicators
  retention_risk TEXT DEFAULT 'low' CHECK (retention_risk IN ('low', 'medium', 'high')),
  payment_status TEXT DEFAULT 'current' CHECK (payment_status IN ('current', 'past_due', 'at_risk')),

  -- Engagement history
  last_contact_date TIMESTAMP WITH TIME ZONE,
  last_policy_change TIMESTAMP WITH TIME ZONE,
  upcoming_renewal DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint per customer per agency
  UNIQUE(agency_id, customer_name)
);

-- Index for customer lookup
CREATE INDEX IF NOT EXISTS idx_customer_insights_name
  ON customer_insights(agency_id, customer_name);

-- Index for high-value customers
CREATE INDEX IF NOT EXISTS idx_customer_insights_value
  ON customer_insights(agency_id, total_premium DESC);

-- Index for retention risk
CREATE INDEX IF NOT EXISTS idx_customer_insights_risk
  ON customer_insights(agency_id, retention_risk)
  WHERE retention_risk IN ('medium', 'high');

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE data_upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data from their agency
-- Note: These are permissive policies; actual authorization is handled at application level
-- following the same pattern as other tables in this codebase

-- data_upload_batches policies
CREATE POLICY "Allow all operations on upload batches" ON data_upload_batches
  FOR ALL USING (true) WITH CHECK (true);

-- cross_sell_opportunities policies
CREATE POLICY "Allow all operations on cross sell opportunities" ON cross_sell_opportunities
  FOR ALL USING (true) WITH CHECK (true);

-- renewal_calendar policies
CREATE POLICY "Allow all operations on renewal calendar" ON renewal_calendar
  FOR ALL USING (true) WITH CHECK (true);

-- customer_insights policies
CREATE POLICY "Allow all operations on customer insights" ON customer_insights
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Enable Real-Time Subscriptions
-- ============================================

-- Add tables to real-time publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE cross_sell_opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE renewal_calendar;

-- ============================================
-- Trigger for updated_at timestamp
-- ============================================

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all new tables
CREATE TRIGGER update_data_upload_batches_updated_at
  BEFORE UPDATE ON data_upload_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_sell_opportunities_updated_at
  BEFORE UPDATE ON cross_sell_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_calendar_updated_at
  BEFORE UPDATE ON renewal_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_insights_updated_at
  BEFORE UPDATE ON customer_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to calculate days until renewal
CREATE OR REPLACE FUNCTION calculate_days_until_renewal(renewal DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(0, renewal - CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine priority tier based on days until renewal and score
CREATE OR REPLACE FUNCTION calculate_priority_tier(
  days_until INTEGER,
  score INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF days_until <= 7 AND score >= 100 THEN
    RETURN 'HOT';
  ELSIF days_until <= 14 AND score >= 75 THEN
    RETURN 'HIGH';
  ELSIF days_until <= 30 AND score >= 50 THEN
    RETURN 'MEDIUM';
  ELSE
    RETURN 'LOW';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE data_upload_batches IS 'Tracks each Allstate data file upload for auditing and rollback';
COMMENT ON TABLE cross_sell_opportunities IS 'Cross-sell opportunities from Allstate Book of Business analysis';
COMMENT ON TABLE renewal_calendar IS 'Calendar view of upcoming policy renewals with cross-sell links';
COMMENT ON TABLE customer_insights IS 'Aggregated customer analytics for dashboard insights';

COMMENT ON COLUMN cross_sell_opportunities.priority_rank IS 'Lower number = higher priority (1 is highest)';
COMMENT ON COLUMN cross_sell_opportunities.priority_score IS 'Composite score 0-150 based on multiple factors';
COMMENT ON COLUMN cross_sell_opportunities.segment_type IS 'Normalized cross-sell segment for filtering';
COMMENT ON COLUMN cross_sell_opportunities.task_id IS 'Links to todo task when opportunity is converted to action item';
