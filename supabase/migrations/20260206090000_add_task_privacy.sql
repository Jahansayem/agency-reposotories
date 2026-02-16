-- Add task privacy flag (public/private)
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_todos_is_private ON todos(is_private);

COMMENT ON COLUMN todos.is_private IS 'If true, task is only visible to creator and assignee. Default false (public).';

UPDATE todos
SET is_private = FALSE
WHERE is_private IS NULL;
