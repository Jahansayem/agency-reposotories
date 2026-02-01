-- Migration: Add read receipts table
-- Sprint 3 Issue #39: Read Receipts
-- Date: 2026-02-01

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique user per message
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON message_read_receipts(read_at DESC);

-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - same as other tables)
CREATE POLICY "Allow all operations on message_read_receipts"
  ON message_read_receipts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;

-- Grant permissions
GRANT ALL ON message_read_receipts TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
