-- Migration: PIN Reset Tokens
-- Date: 2026-02-06
-- Description: Add table for secure PIN reset token storage

-- ============================================
-- CREATE PIN_RESET_TOKENS TABLE
-- Stores hashed reset tokens with expiration
-- ============================================

CREATE TABLE IF NOT EXISTS pin_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_hash ON pin_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_user ON pin_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_expires ON pin_reset_tokens(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE pin_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, as this is accessed via API)
CREATE POLICY "Allow all operations on pin_reset_tokens" ON pin_reset_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE pin_reset_tokens IS 'Secure storage for PIN reset tokens with expiration';
COMMENT ON COLUMN pin_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (not stored in plaintext)';
COMMENT ON COLUMN pin_reset_tokens.expires_at IS 'Token expiration timestamp (typically 1 hour from creation)';
COMMENT ON COLUMN pin_reset_tokens.used_at IS 'When the token was used (NULL if unused)';

-- ============================================
-- CLEANUP FUNCTION
-- Automatically delete expired tokens (cleanup)
-- ============================================

-- Function to delete expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM pin_reset_tokens
  WHERE expires_at < NOW()
    AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_reset_tokens IS 'Deletes expired, unused reset tokens (run periodically)';

-- Note: To run cleanup automatically, set up a cron job or scheduled function
-- Example: SELECT cron.schedule('cleanup-reset-tokens', '0 * * * *', 'SELECT cleanup_expired_reset_tokens()');
