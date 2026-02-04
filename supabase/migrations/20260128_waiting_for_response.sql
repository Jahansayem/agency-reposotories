-- Migration: Add waiting for customer response tracking
-- This allows users to mark tasks as waiting for customer response
-- and get notified when follow-up is needed

-- Add waiting columns to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS waiting_for_response BOOLEAN DEFAULT FALSE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMP WITH TIME ZONE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS waiting_contact_type TEXT; -- 'call' | 'email' | 'other'
ALTER TABLE todos ADD COLUMN IF NOT EXISTS follow_up_after_hours INTEGER DEFAULT 48;

-- Create index for efficient filtering of waiting tasks
CREATE INDEX IF NOT EXISTS idx_todos_waiting ON todos (waiting_for_response) WHERE waiting_for_response = TRUE;

-- Create index for finding tasks that need follow-up
CREATE INDEX IF NOT EXISTS idx_todos_waiting_since ON todos (waiting_since) WHERE waiting_for_response = TRUE;

-- Add constraint for contact type (idempotent)
DO $$ BEGIN
    ALTER TABLE todos ADD CONSTRAINT chk_waiting_contact_type
      CHECK (waiting_contact_type IS NULL OR waiting_contact_type IN ('call', 'email', 'other'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new activity actions
-- Note: activity_log.action is TEXT, so no schema change needed
-- New actions: 'marked_waiting', 'customer_responded', 'follow_up_overdue'

COMMENT ON COLUMN todos.waiting_for_response IS 'Whether the task is waiting for customer response';
COMMENT ON COLUMN todos.waiting_since IS 'When the task was marked as waiting';
COMMENT ON COLUMN todos.waiting_contact_type IS 'Type of contact made: call, email, or other';
COMMENT ON COLUMN todos.follow_up_after_hours IS 'Hours to wait before flagging for follow-up (default 48)';
