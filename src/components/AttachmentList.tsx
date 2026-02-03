'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import {
  FileText, Image, Music, Video, Archive, File,
  Download, Trash2, Loader2, ExternalLink, Eye
} from 'lucide-react';
import { Attachment, AttachmentCategory } from '@/types/todo';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';

interface AttachmentListProps {
  attachments: Attachment[];
  todoId: string;
  onRemove: (attachmentId: string) => void;
  canRemove: boolean;
}

const categoryIcons: Record<AttachmentCategory, React.ElementType> = {
  document: FileText,
  image: Image,
  audio: Music,
  video: Video,
  archive: Archive,
  other: FileText, // Default to document icon for unknown types
};

const categoryColors: Record<AttachmentCategory, string> = {
  document: 'text-blue-500 bg-blue-500/10',
  image: 'text-green-500 bg-green-500/10',
  audio: 'text-[var(--accent)] bg-[var(--accent)]/10',
  video: 'text-pink-500 bg-pink-500/10',
  archive: 'text-amber-500 bg-amber-500/10',
  other: 'text-gray-500 bg-gray-500/10', // Default color for unknown types
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface AttachmentItemProps {
  attachment: Attachment;
  todoId: string;
  onRemove: (attachmentId: string) => void;
  canRemove: boolean;
}

function AttachmentItem({ attachment, todoId, onRemove, canRemove }: AttachmentItemProps) {
  const [downloading, setDownloading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const category = attachment.file_type as AttachmentCategory;
  const Icon = categoryIcons[category] || File;
  const colorClass = categoryColors[category] || 'text-gray-500 bg-gray-500/10';

  // Load thumbnail for image attachments (Issue #26)
  const isImage = category === 'image';
  if (isImage && !thumbnailUrl && !previewUrl) {
    fetchWithCsrf(`/api/attachments?path=${encodeURIComponent(attachment.storage_path)}`)
      .then(async (response) => {
        const result = await response.json();
        if (result.success && result.url) {
          setThumbnailUrl(result.url);
        }
      })
      .catch((error) => {
        logger.error('Thumbnail load failed', error, { component: 'AttachmentList' });
      });
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetchWithCsrf(`/api/attachments?path=${encodeURIComponent(attachment.storage_path)}`);
      const result = await response.json();

      if (result.success && result.url) {
        // Open in new tab or trigger download
        const link = document.createElement('a');
        link.href = result.url;
        link.download = attachment.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      logger.error('Download failed', error, { component: 'AttachmentList' });
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (previewUrl) {
      setShowPreview(true);
      return;
    }

    try {
      const response = await fetchWithCsrf(`/api/attachments?path=${encodeURIComponent(attachment.storage_path)}`);
      const result = await response.json();

      if (result.success && result.url) {
        setPreviewUrl(result.url);
        setShowPreview(true);
      }
    } catch (error) {
      logger.error('Preview failed', error, { component: 'AttachmentList' });
    }
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      const response = await fetchWithCsrf(
        `/api/attachments?todoId=${todoId}&attachmentId=${attachment.id}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (result.success) {
        onRemove(attachment.id);
      }
    } catch (error) {
      logger.error('Remove failed', error, { component: 'AttachmentList' });
    } finally {
      setRemoving(false);
    }
  };

  const canPreview = category === 'image' || attachment.mime_type === 'application/pdf';

  return (
    <>
      {/* Issue #26: Show inline thumbnail for images */}
      {isImage && thumbnailUrl ? (
        <div className="group relative rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
          {/* Image thumbnail - Issue #30: Optimized with Next.js Image */}
          <button
            onClick={handlePreview}
            className="w-full aspect-video bg-[var(--surface-2)] overflow-hidden cursor-pointer relative"
            aria-label={`Preview ${attachment.file_name}`}
          >
            <NextImage
              src={thumbnailUrl}
              alt={attachment.file_name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              quality={80}
            />
          </button>

          {/* File info overlay */}
          <div className="p-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-xs text-white font-medium truncate" title={attachment.file_name}>
              {attachment.file_name}
            </p>
            <p className="text-xs text-white/80">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>

          {/* Action buttons - top right corner */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-1.5 rounded-[var(--radius-md)] bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50 backdrop-blur-sm"
              title="Download"
              aria-label="Download attachment"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>
            {canRemove && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="p-1.5 rounded-[var(--radius-md)] bg-black/50 text-white hover:bg-red-600 transition-colors disabled:opacity-50 backdrop-blur-sm"
                title="Remove"
                aria-label="Remove attachment"
              >
                {removing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Non-image attachments or loading - show list view */
        <div className="group flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
          {/* Icon */}
          <div className={`p-2 rounded-[var(--radius-md)] ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate" title={attachment.file_name}>
              {attachment.file_name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatFileSize(attachment.file_size)} • {formatDate(attachment.uploaded_at)} • by {attachment.uploaded_by}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
            {canPreview && (
              <button
                onClick={handlePreview}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                title="Preview"
                aria-label="Preview attachment"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50"
              title="Download"
              aria-label="Download attachment"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
            {canRemove && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors disabled:opacity-50"
                title="Remove"
                aria-label="Remove attachment"
              >
                {removing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full rounded-[var(--radius-xl)] overflow-hidden bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{attachment.file_name}</p>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-60px)] overflow-auto">
              {category === 'image' ? (
                // Using native img for blob URLs - Next.js Image doesn't support blob:// protocol
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={attachment.file_name}
                  className="w-full h-auto"
                />
              ) : attachment.mime_type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[80vh]"
                  title={attachment.file_name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AttachmentList({ attachments, todoId, onRemove, canRemove }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Issue #26: Check if we have any image attachments for grid layout
  const hasImages = attachments.some((att) => att.file_type === 'image');

  return (
    <div className={hasImages ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          todoId={todoId}
          onRemove={onRemove}
          canRemove={canRemove}
        />
      ))}
    </div>
  );
}
