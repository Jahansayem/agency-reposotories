-- Migration: Push Notification Subscriptions
-- Sprint 3 Issue #36: Push Notifications
-- Date: 2026-02-01

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Push subscription details
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Platform info
  user_agent TEXT,
  platform TEXT, -- 'web', 'ios', 'android'

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one subscription per endpoint
  CONSTRAINT unique_endpoint UNIQUE (endpoint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- Allow service role to manage all subscriptions (for sending notifications)
CREATE POLICY "Service role can manage all push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON push_subscriptions TO postgres, anon, authenticated, service_role;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER push_subscription_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- Create notification_log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL, -- 'task_reminder', 'mention', 'task_assigned', 'daily_digest'
  title TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Related entities
  task_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Delivery status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'clicked', 'dismissed'
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Metadata
  data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_task_id ON notification_log(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_log
CREATE POLICY "Users can view their own notifications"
  ON notification_log
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Service role can manage all notifications"
  ON notification_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON notification_log TO postgres, anon, authenticated, service_role;

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push notification subscriptions for users';
COMMENT ON TABLE notification_log IS 'Logs all push notifications sent to users';
