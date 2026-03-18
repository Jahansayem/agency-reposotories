-- ============================================
-- AI Conversational Agent Tables
-- ============================================
-- Purpose: Schema for AI agent conversations, messages, and usage tracking
-- Author: Claude Code (Agent 3 - Database Engineer)
-- Date: 2026-02-19
-- ============================================

-- ============================================
-- 1. Create agent_conversations table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- 2. Create agent_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. Create agent_usage table (token tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_cost DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. Indexes for agent_conversations
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agency
  ON agent_conversations(agency_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user
  ON agent_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_updated
  ON agent_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_active
  ON agent_conversations(agency_id, user_id, is_deleted, updated_at DESC);

-- ============================================
-- 5. Indexes for agent_messages
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation
  ON agent_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_messages_role
  ON agent_messages(role);

-- ============================================
-- 6. Indexes for agent_usage
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_usage_agency
  ON agent_usage(agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_user
  ON agent_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_conversation
  ON agent_usage(conversation_id);

-- ============================================
-- 7. RLS Policies for agent_conversations
-- ============================================

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations in their agencies
CREATE POLICY "Users can view own conversations"
  ON agent_conversations FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
    AND is_deleted = false
  );

-- Users can create conversations in their agencies
CREATE POLICY "Users can create own conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON agent_conversations FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- ============================================
-- 8. RLS Policies for agent_messages
-- ============================================

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
  ON agent_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id
      FROM agent_conversations
      WHERE user_id = auth.uid()
      AND is_deleted = false
    )
  );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create messages in own conversations"
  ON agent_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id
      FROM agent_conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 9. RLS Policies for agent_usage
-- ============================================

ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage records
CREATE POLICY "Users can view own usage"
  ON agent_usage FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can create their own usage records
CREATE POLICY "Users can create own usage records"
  ON agent_usage FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Managers and owners can view agency-wide usage
CREATE POLICY "Managers can view agency usage"
  ON agent_usage FOR SELECT
  USING (
    agency_id IN (
      SELECT am.agency_id
      FROM agency_members am
      WHERE am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 10. Real-time subscriptions
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 11. Comments for documentation
-- ============================================

COMMENT ON TABLE agent_conversations IS 'AI agent conversation sessions per user and agency';
COMMENT ON COLUMN agent_conversations.title IS 'Optional user-provided or auto-generated conversation title';
COMMENT ON COLUMN agent_conversations.is_deleted IS 'Soft delete flag for conversation history';

COMMENT ON TABLE agent_messages IS 'Individual messages within agent conversations';
COMMENT ON COLUMN agent_messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN agent_messages.tool_calls IS 'JSONB array of tool execution details (id, name, status, input, result, error)';

COMMENT ON TABLE agent_usage IS 'Token usage and cost tracking for AI agent interactions';
COMMENT ON COLUMN agent_usage.model IS 'AI model used (e.g., claude-3-5-sonnet-20241022)';
COMMENT ON COLUMN agent_usage.total_cost IS 'Total cost in USD for this API call';
