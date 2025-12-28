-- Add attachments column to todos table
-- Stores attachment metadata as JSONB array

ALTER TABLE todos ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Update activity_log check constraint to include attachment actions
-- First drop the existing constraint
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;

-- Add new constraint with attachment actions
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check CHECK (action IN (
  'task_created',
  'task_updated',
  'task_deleted',
  'task_completed',
  'task_reopened',
  'status_changed',
  'priority_changed',
  'assigned_to_changed',
  'due_date_changed',
  'subtask_added',
  'subtask_completed',
  'subtask_deleted',
  'notes_updated',
  'template_created',
  'template_used',
  'attachment_added',
  'attachment_removed'
));

-- Create index for faster attachment queries
CREATE INDEX IF NOT EXISTS idx_todos_attachments ON todos USING GIN (attachments);
