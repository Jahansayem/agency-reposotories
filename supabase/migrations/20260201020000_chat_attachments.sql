-- Migration: Add attachments support to chat messages
-- Sprint 3 Issue #25: Chat Image Attachments
-- Date: 2026-02-01

-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for attachment queries
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);

-- Add comment explaining structure
COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{ id, file_name, file_type, file_size, mime_type, storage_path, thumbnail_path, uploaded_by, uploaded_at }]';

-- Create storage bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760, -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage bucket
CREATE POLICY "Allow authenticated users to upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Allow all users to view chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Allow users to delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner = auth.uid()
);

-- Grant permissions
GRANT ALL ON messages TO postgres, anon, authenticated, service_role;
