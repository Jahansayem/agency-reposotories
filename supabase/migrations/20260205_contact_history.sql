-- ============================================
-- Contact History Tracking Schema
-- ============================================
-- Purpose: Track detailed contact history for cross-sell opportunities
-- This enables agents to log each contact attempt with outcomes and follow-up actions
--
-- Author: Claude Code Integration
-- Date: 2026-02-05
-- ============================================

-- ============================================
-- Table: contact_history
-- Tracks individual contact attempts for cross-sell opportunities
-- ============================================

CREATE TABLE IF NOT EXISTS contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES cross_sell_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact details
  contact_method TEXT NOT NULL CHECK (contact_method IN (
    'phone', 'email', 'in_person', 'mail'
  )),
  contact_outcome TEXT NOT NULL CHECK (contact_outcome IN (
    'connected', 'voicemail', 'no_answer', 'wrong_number',
    'callback_scheduled', 'sold', 'not_interested', 'follow_up_needed'
  )),

  -- Notes and follow-up
  notes TEXT,
  next_action TEXT,
  next_action_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Index for querying contact history by opportunity
CREATE INDEX IF NOT EXISTS idx_contact_history_opportunity_id
  ON contact_history(opportunity_id);

-- Index for querying contact history by user
CREATE INDEX IF NOT EXISTS idx_contact_history_user_id
  ON contact_history(user_id);

-- Index for querying by contact date (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_contact_history_contacted_at
  ON contact_history(contacted_at DESC);

-- Composite index for common query pattern: opportunity + date
CREATE INDEX IF NOT EXISTS idx_contact_history_opp_date
  ON contact_history(opportunity_id, contacted_at DESC);

-- Index for finding pending follow-ups
CREATE INDEX IF NOT EXISTS idx_contact_history_next_action
  ON contact_history(next_action_date)
  WHERE next_action_date IS NOT NULL;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (authorization handled at application level)
-- Following the same pattern as other tables in this codebase
CREATE POLICY "Allow all operations on contact history" ON contact_history
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Enable Real-Time Subscriptions
-- ============================================

-- Add table to real-time publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE contact_history;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE contact_history IS 'Tracks individual contact attempts for cross-sell opportunities';
COMMENT ON COLUMN contact_history.opportunity_id IS 'References the cross-sell opportunity being contacted';
COMMENT ON COLUMN contact_history.user_id IS 'The agent who made the contact attempt';
COMMENT ON COLUMN contact_history.contact_method IS 'How the contact was made: phone, email, in_person, mail';
COMMENT ON COLUMN contact_history.contact_outcome IS 'Result of the contact attempt';
COMMENT ON COLUMN contact_history.notes IS 'Free-form notes about the contact';
COMMENT ON COLUMN contact_history.next_action IS 'Description of required follow-up action';
COMMENT ON COLUMN contact_history.next_action_date IS 'When the follow-up action should be taken';
COMMENT ON COLUMN contact_history.contacted_at IS 'When the contact was made';
