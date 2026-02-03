-- Migration: Add version history table for todos
-- Sprint 3 Issue #41: Version History
-- Date: 2026-02-01

-- Create todo_versions table
CREATE TABLE IF NOT EXISTS todo_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot of todo at this version
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assigned_to TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,
  recurrence TEXT,

  -- Change metadata
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'restored'
  change_summary TEXT, -- Human-readable description

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique version numbers per todo
  UNIQUE(todo_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todo_versions_todo_id ON todo_versions(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_versions_changed_at ON todo_versions(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_todo_versions_version_number ON todo_versions(todo_id, version_number DESC);

-- Enable RLS
ALTER TABLE todo_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on todo_versions"
  ON todo_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE todo_versions;

-- Grant permissions
GRANT ALL ON todo_versions TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create function to auto-create version on todo update
CREATE OR REPLACE FUNCTION create_todo_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM todo_versions
  WHERE todo_id = NEW.id;

  -- Create version snapshot
  INSERT INTO todo_versions (
    todo_id,
    version_number,
    text,
    completed,
    status,
    priority,
    assigned_to,
    due_date,
    notes,
    subtasks,
    recurrence,
    changed_by,
    changed_at,
    change_type,
    change_summary
  ) VALUES (
    NEW.id,
    next_version,
    NEW.text,
    NEW.completed,
    NEW.status,
    NEW.priority,
    NEW.assigned_to,
    NEW.due_date,
    NEW.notes,
    NEW.subtasks,
    NEW.recurrence,
    NEW.updated_by,
    NEW.updated_at,
    'updated',
    format('Updated by %s', NEW.updated_by)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create versions on update
CREATE TRIGGER todo_version_trigger
  AFTER UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION create_todo_version();
