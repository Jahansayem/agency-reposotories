/**
 * AttachmentSection Component
 *
 * Extracted from TodoItem.tsx (Phase 3 Refactoring)
 * Handles file attachments display, upload, and removal.
 * Includes:
 * - Attachment list with preview
 * - Upload button/drop zone
 * - File count and limit display
 *
 * Reduces TodoItem.tsx complexity by ~120 lines.
 */

'use client';

import { useState } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import type { Attachment } from '@/types/todo';
import AttachmentList from '../AttachmentList';
import AttachmentUpload from '../AttachmentUpload';

const MAX_ATTACHMENTS_PER_TODO = 10; // Import from types if available

interface AttachmentSectionProps {
  todoId: string;
  attachments: Attachment[] | undefined;
  currentUserName: string;
  onUpdateAttachments: (todoId: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  expanded?: boolean;
  className?: string;
}

export function AttachmentSection({
  todoId,
  attachments,
  currentUserName,
  onUpdateAttachments,
  expanded = false,
  className = '',
}: AttachmentSectionProps) {
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

  const attachmentArray = Array.isArray(attachments) ? attachments : [];
  const attachmentCount = attachmentArray.length;
  const canAddMore = attachmentCount < MAX_ATTACHMENTS_PER_TODO;

  /**
   * Handle attachment removal
   */
  const handleRemove = (attachmentId: string) => {
    const updated = attachmentArray.filter(a => a.id !== attachmentId);
    // skipDbUpdate=true because the DELETE API already updated the database
    onUpdateAttachments(todoId, updated, true);
  };

  /**
   * Handle successful upload
   */
  const handleUploadComplete = (newAttachment: Attachment) => {
    const updated = [...attachmentArray, newAttachment];
    onUpdateAttachments(todoId, updated, true);
    setShowAttachmentUpload(false);
  };

  // Collapsed view (non-expanded)
  if (!expanded && attachmentCount > 0) {
    return (
      <div className={`mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
          <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
          <span className="text-xs text-[var(--accent-gold)]/70">({attachmentCount})</span>
        </div>
        <AttachmentList
          attachments={attachmentArray}
          todoId={todoId}
          onRemove={handleRemove}
          canRemove={false} // Read-only in collapsed view
        />
      </div>
    );
  }

  // Expanded view (full editor)
  if (!expanded) {
    return null; // Don't show empty section in collapsed view
  }

  return (
    <>
      <div className={`mb-4 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
            {attachmentCount > 0 && (
              <span className="text-xs text-[var(--accent-gold)]/70">
                ({attachmentCount}/{MAX_ATTACHMENTS_PER_TODO})
              </span>
            )}
          </div>
          {canAddMore && (
            <button
              onClick={() => setShowAttachmentUpload(true)}
              className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add
            </button>
          )}
        </div>

        {/* Attachment list or drop zone */}
        {attachmentCount > 0 ? (
          <AttachmentList
            attachments={attachmentArray}
            todoId={todoId}
            onRemove={handleRemove}
            canRemove={true}
          />
        ) : (
          <button
            onClick={() => setShowAttachmentUpload(true)}
            className="w-full p-4 border-2 border-dashed border-[var(--accent-gold)]/30 rounded-[var(--radius-md)] text-center hover:border-[var(--accent-gold)]/50 hover:bg-[var(--accent-gold)]/5 transition-colors cursor-pointer"
          >
            <Paperclip className="w-5 h-5 text-[var(--accent-gold)]/50 mx-auto mb-1" aria-hidden="true" />
            <p className="text-xs text-[var(--accent-gold)]/70">
              Drop files here or click to browse
            </p>
          </button>
        )}
      </div>

      {/* Attachment Upload Modal */}
      {showAttachmentUpload && (
        <AttachmentUpload
          todoId={todoId}
          userName={currentUserName}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowAttachmentUpload(false)}
          currentAttachmentCount={attachmentCount}
          maxAttachments={MAX_ATTACHMENTS_PER_TODO}
        />
      )}
    </>
  );
}
