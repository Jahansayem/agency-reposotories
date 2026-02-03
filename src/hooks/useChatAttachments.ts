'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ChatAttachment } from '@/types/todo';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * useChatAttachments Hook
 * Sprint 3 Issue #25: Chat Image Attachments
 *
 * Handles uploading and managing chat message attachments.
 * Supports images with automatic thumbnail generation.
 *
 * Usage:
 * ```tsx
 * const { uploadAttachment, deleteAttachment, uploading, error } = useChatAttachments();
 * ```
 */

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Supported file types
export type FileType = 'image' | 'video' | 'audio' | 'document';

/**
 * Determine file type from MIME type
 */
function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * Validate file for upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // For now, only allow images
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Only images are supported.`,
    };
  }

  return { valid: true };
}

/**
 * Generate thumbnail for image
 * Returns data URL of thumbnail
 */
async function generateThumbnail(file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload data URL as blob to Supabase Storage
 */
async function uploadDataUrl(dataUrl: string, path: string): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      logger.error('Failed to upload thumbnail', error, { component: 'useChatAttachments', action: 'uploadDataUrl', path });
      return null;
    }

    return data.path;
  } catch (error) {
    logger.error('Failed to upload thumbnail', error as Error, { component: 'useChatAttachments', action: 'uploadDataUrl', path });
    return null;
  }
}

export function useChatAttachments() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload attachment and return attachment metadata
   */
  const uploadAttachment = useCallback(async (
    file: File,
    uploadedBy: string,
    messageId?: string
  ): Promise<ChatAttachment | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error!);
        return null;
      }

      // Generate unique ID
      const attachmentId = uuidv4();
      const fileExtension = file.name.split('.').pop();
      const storagePath = messageId
        ? `messages/${messageId}/${attachmentId}.${fileExtension}`
        : `temp/${attachmentId}.${fileExtension}`;

      setProgress(25);

      // Upload original file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error', uploadError, { component: 'useChatAttachments', action: 'uploadAttachment', fileName: file.name });
        setError('Failed to upload file');
        return null;
      }

      setProgress(50);

      // Generate and upload thumbnail for images
      let thumbnailPath: string | undefined;
      if (file.type.startsWith('image/')) {
        const thumbnailDataUrl = await generateThumbnail(file);
        if (thumbnailDataUrl) {
          const thumbPath = storagePath.replace(/\.[^.]+$/, '_thumb.jpg');
          const uploadedPath = await uploadDataUrl(thumbnailDataUrl, thumbPath);
          if (uploadedPath) {
            thumbnailPath = uploadedPath;
          }
        }
      }

      setProgress(100);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(storagePath);

      // Create attachment metadata
      const attachment: ChatAttachment = {
        id: attachmentId,
        file_name: file.name,
        file_type: getFileType(file.type),
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      };

      return attachment;
    } catch (err) {
      logger.error('Attachment upload error', err as Error, { component: 'useChatAttachments', action: 'uploadAttachment', fileName: file.name });
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Delete attachment from storage
   */
  const deleteAttachment = useCallback(async (storagePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('chat-attachments')
        .remove([storagePath]);

      if (error) {
        logger.error('Delete error', error, { component: 'useChatAttachments', action: 'deleteAttachment', storagePath });
        return false;
      }

      // Also try to delete thumbnail if it exists
      const thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.jpg');
      await supabase.storage
        .from('chat-attachments')
        .remove([thumbnailPath]);

      return true;
    } catch (err) {
      logger.error('Attachment delete error', err as Error, { component: 'useChatAttachments', action: 'deleteAttachment', storagePath });
      return false;
    }
  }, []);

  /**
   * Get public URL for attachment
   */
  const getAttachmentUrl = useCallback((storagePath: string): string => {
    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }, []);

  /**
   * Get thumbnail URL for attachment
   */
  const getThumbnailUrl = useCallback((thumbnailPath: string): string => {
    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(thumbnailPath);

    return data.publicUrl;
  }, []);

  return {
    /** Whether an upload is in progress */
    uploading,

    /** Upload progress (0-100) */
    progress,

    /** Error message if upload failed */
    error,

    /** Upload a file and return attachment metadata */
    uploadAttachment,

    /** Delete an attachment from storage */
    deleteAttachment,

    /** Get public URL for an attachment */
    getAttachmentUrl,

    /** Get thumbnail URL for an attachment */
    getThumbnailUrl,

    /** Clear error state */
    clearError: () => setError(null),
  };
}
