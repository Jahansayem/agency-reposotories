-- ============================================
-- Enhanced Contact Outcomes Migration
-- ============================================
-- Purpose: Update contact_history table to support 8 detailed contact outcomes
-- optimized for model training feedback loop
--
-- New Outcomes (replacing previous 8):
-- 1. contacted_interested - Customer expressed interest
-- 2. contacted_not_interested - Customer not interested at this time
-- 3. contacted_callback_scheduled - Callback scheduled
-- 4. contacted_wrong_timing - Bad timing (busy, just renewed elsewhere)
-- 5. left_voicemail - Did not reach, left voicemail
-- 6. no_answer - Did not reach, no voicemail left
-- 7. invalid_contact - Contact info incorrect
-- 8. declined_permanently - Customer declined, do not contact
--
-- Author: Claude Code
-- Date: 2026-02-05
-- ============================================

-- Step 1: Drop the existing CHECK constraint
-- Note: PostgreSQL doesn't support ALTER CHECK, so we drop and recreate
ALTER TABLE contact_history
DROP CONSTRAINT IF EXISTS contact_history_contact_outcome_check;

-- Step 2: Add the new CHECK constraint with enhanced outcomes
ALTER TABLE contact_history
ADD CONSTRAINT contact_history_contact_outcome_check
CHECK (contact_outcome IN (
  'contacted_interested',
  'contacted_not_interested',
  'contacted_callback_scheduled',
  'contacted_wrong_timing',
  'left_voicemail',
  'no_answer',
  'invalid_contact',
  'declined_permanently'
));

-- Step 3: Migrate existing data to new outcome values
-- Map old outcomes to new outcomes for any existing records
UPDATE contact_history
SET contact_outcome = CASE contact_outcome
  -- Direct mappings
  WHEN 'connected' THEN 'contacted_interested'
  WHEN 'voicemail' THEN 'left_voicemail'
  WHEN 'no_answer' THEN 'no_answer'
  WHEN 'wrong_number' THEN 'invalid_contact'
  WHEN 'callback_scheduled' THEN 'contacted_callback_scheduled'
  WHEN 'sold' THEN 'contacted_interested'
  WHEN 'not_interested' THEN 'contacted_not_interested'
  WHEN 'follow_up_needed' THEN 'contacted_wrong_timing'
  -- Keep any already-migrated values
  ELSE contact_outcome
END
WHERE contact_outcome NOT IN (
  'contacted_interested',
  'contacted_not_interested',
  'contacted_callback_scheduled',
  'contacted_wrong_timing',
  'left_voicemail',
  'no_answer',
  'invalid_contact',
  'declined_permanently'
);

-- Step 4: Update the cross_sell_opportunities table contact_outcome column
-- This column stores a simpler status derived from contact attempts
-- First, check if the column has a constraint and drop it if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'cross_sell_opportunities_contact_outcome_check'
  ) THEN
    ALTER TABLE cross_sell_opportunities
    DROP CONSTRAINT cross_sell_opportunities_contact_outcome_check;
  END IF;
END $$;

-- Add updated constraint for cross_sell_opportunities
-- This is the simplified status field (not the detailed tracking)
ALTER TABLE cross_sell_opportunities
ADD CONSTRAINT cross_sell_opportunities_contact_outcome_check
CHECK (contact_outcome IS NULL OR contact_outcome IN (
  'quoted',      -- Customer showed interest, quote provided
  'sold',        -- Sale completed
  'declined',    -- Customer declined
  'callback',    -- Follow-up scheduled
  'no_answer'    -- Not yet reached
));

-- Step 5: Add comments for documentation
COMMENT ON CONSTRAINT contact_history_contact_outcome_check ON contact_history IS
'Enhanced contact outcomes for model training:
- contacted_interested: Customer expressed interest
- contacted_not_interested: Not interested at this time
- contacted_callback_scheduled: Callback scheduled
- contacted_wrong_timing: Bad timing (busy, recently renewed, etc.)
- left_voicemail: Left voicemail message
- no_answer: No answer, no voicemail
- invalid_contact: Wrong number/bounced email
- declined_permanently: Do not contact again';

-- Step 6: Create an index for analytics queries on contact outcomes
CREATE INDEX IF NOT EXISTS idx_contact_history_outcome
ON contact_history(contact_outcome);

-- Step 7: Create a view for model training data export
-- This view provides the data needed for training the cross-sell propensity model
CREATE OR REPLACE VIEW contact_outcome_training_data AS
SELECT
  ch.id AS contact_id,
  ch.opportunity_id,
  ch.contact_method,
  ch.contact_outcome,
  ch.contacted_at,
  -- Customer features
  cso.customer_name,
  cso.current_premium,
  cso.tenure_years,
  cso.policy_count,
  cso.priority_score,
  cso.priority_tier,
  cso.segment_type,
  cso.days_until_renewal,
  cso.expected_conversion_pct,
  -- Outcome features for model training
  CASE
    WHEN ch.contact_outcome IN ('contacted_interested', 'contacted_callback_scheduled') THEN 1
    ELSE 0
  END AS positive_outcome,
  CASE
    WHEN ch.contact_outcome LIKE 'contacted_%' THEN 1
    ELSE 0
  END AS customer_reached,
  -- Interest signal (-1 to 1)
  CASE ch.contact_outcome
    WHEN 'contacted_interested' THEN 1.0
    WHEN 'contacted_callback_scheduled' THEN 0.7
    WHEN 'contacted_wrong_timing' THEN 0.0
    WHEN 'contacted_not_interested' THEN -0.5
    WHEN 'declined_permanently' THEN -1.0
    ELSE 0.0
  END AS interest_signal
FROM contact_history ch
JOIN cross_sell_opportunities cso ON ch.opportunity_id = cso.id;

COMMENT ON VIEW contact_outcome_training_data IS
'View for exporting contact outcome data for model training.
Includes customer features and computed signals for ML pipeline.';

-- Grant access to the view
GRANT SELECT ON contact_outcome_training_data TO authenticated;
GRANT SELECT ON contact_outcome_training_data TO service_role;
