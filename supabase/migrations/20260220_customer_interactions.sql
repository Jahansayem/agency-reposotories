-- ============================================
-- Customer Interactions Tracking
-- ============================================
-- Purpose: Event-based audit log for all customer touchpoints
-- Author: Claude Code
-- Date: 2026-02-19
-- ============================================

-- ============================================
-- 1. Create customer_interactions table
-- ============================================

CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_insights(id) ON DELETE CASCADE,

  -- Interaction type
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'task_completed',
    'subtask_completed',
    'contact_attempt',
    'task_created',
    'note_added'
  )),

  -- References to related records
  task_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  subtask_id UUID,

  -- Interaction details
  summary TEXT NOT NULL,
  details JSONB,

  -- Who and when
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', summary || ' ' || COALESCE(details::text, ''))
  ) STORED
);

-- ============================================
-- 2. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer
  ON customer_interactions(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_agency
  ON customer_interactions(agency_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_type
  ON customer_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_search
  ON customer_interactions USING GIN(search_vector);

-- ============================================
-- 3. RLS Policies
-- ============================================

ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Agency isolation for customer interactions"
    ON customer_interactions
    FOR ALL
    USING (
      agency_id IN (
        SELECT agency_id
        FROM agency_members
        WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 4. Real-time subscriptions
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE customer_interactions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 5. Comments
-- ============================================

COMMENT ON TABLE customer_interactions IS 'Event-based audit log for all customer interactions';
COMMENT ON COLUMN customer_interactions.interaction_type IS 'Type of interaction: task_completed, subtask_completed, contact_attempt, task_created, note_added';
COMMENT ON COLUMN customer_interactions.summary IS 'Human-readable summary of the interaction';
COMMENT ON COLUMN customer_interactions.details IS 'Flexible JSONB metadata specific to interaction type';

-- ============================================
-- 6. Add completed_at to todos table
-- ============================================

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN todos.completed_at IS 'Timestamp when task was marked completed (auto-set by trigger)';

-- ============================================
-- 7. Backfill completed_at for existing completed tasks
-- ============================================
-- Disable version trigger to avoid NOT NULL constraint on changed_by

ALTER TABLE todos DISABLE TRIGGER todo_version_trigger;

UPDATE todos
SET completed_at = updated_at
WHERE completed = true
  AND completed_at IS NULL;

ALTER TABLE todos ENABLE TRIGGER todo_version_trigger;

-- ============================================
-- 8. Trigger: Log task completion
-- ============================================
-- Note: todos.created_by and todos.updated_by are TEXT (user names),
-- so we look up the user UUID for customer_interactions.created_by.
-- Subtasks live in subtasks_v2 table, not in todos, so this trigger
-- only fires for top-level tasks (always 'task_completed').

CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only log when task transitions to completed
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Set completed_at timestamp
    NEW.completed_at := NOW();

    -- Log interaction if task is linked to customer
    IF NEW.customer_id IS NOT NULL THEN
      BEGIN
        -- Look up user UUID from name
        IF NEW.updated_by IS NOT NULL THEN
          SELECT id INTO v_user_id FROM users WHERE name = NEW.updated_by LIMIT 1;
        END IF;

        INSERT INTO customer_interactions (
          agency_id,
          customer_id,
          interaction_type,
          task_id,
          summary,
          details,
          created_by,
          created_at
        ) VALUES (
          NEW.agency_id,
          NEW.customer_id,
          'task_completed',
          NEW.id,
          'Completed: ' || NEW.text,
          jsonb_build_object(
            'priority', NEW.priority,
            'due_date', NEW.due_date,
            'assigned_to', NEW.assigned_to
          ),
          v_user_id,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't block task completion
        RAISE WARNING 'Failed to log interaction for task %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_task_completion ON todos;
CREATE TRIGGER trigger_log_task_completion
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_task_completion();

COMMENT ON FUNCTION log_task_completion IS 'Automatically logs customer interaction when task is completed';

-- ============================================
-- 9. Extend contact_history for general customer contacts
-- ============================================

ALTER TABLE contact_history
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer_insights(id) ON DELETE SET NULL;

-- Make opportunity_id optional (was NOT NULL before)
ALTER TABLE contact_history
  ALTER COLUMN opportunity_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_history_customer
  ON contact_history(customer_id);

COMMENT ON COLUMN contact_history.customer_id IS 'Direct link to customer (optional, can also link via opportunity)';

-- ============================================
-- 10. Trigger: Log contact attempts
-- ============================================

CREATE OR REPLACE FUNCTION log_contact_interaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get customer_id and agency_id
  IF NEW.opportunity_id IS NOT NULL THEN
    -- Link via opportunity
    SELECT o.agency_id, ci.id INTO v_agency_id, v_customer_id
    FROM cross_sell_opportunities o
    JOIN customer_insights ci ON ci.customer_name = o.customer_name
    WHERE o.id = NEW.opportunity_id;
  ELSIF NEW.customer_id IS NOT NULL THEN
    -- Direct customer link
    SELECT agency_id INTO v_agency_id
    FROM customer_insights
    WHERE id = NEW.customer_id;
    v_customer_id := NEW.customer_id;
  END IF;

  -- Log interaction if we found customer
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO customer_interactions (
      agency_id,
      customer_id,
      interaction_type,
      summary,
      details,
      created_by,
      created_at
    ) VALUES (
      v_agency_id,
      v_customer_id,
      'contact_attempt',
      format('Contact via %s: %s', NEW.contact_method, NEW.contact_outcome),
      jsonb_build_object(
        'method', NEW.contact_method,
        'outcome', NEW.contact_outcome,
        'notes', NEW.notes,
        'next_action', NEW.next_action
      ),
      NEW.user_id,
      NEW.contacted_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_contact_interaction ON contact_history;
CREATE TRIGGER trigger_log_contact_interaction
  AFTER INSERT ON contact_history
  FOR EACH ROW
  EXECUTE FUNCTION log_contact_interaction();

COMMENT ON FUNCTION log_contact_interaction IS 'Automatically logs customer interaction when contact is made';
