'use client';

import { useState } from 'react';
import { Paperclip, Plus, Music } from 'lucide-react';
import { Attachment, MAX_ATTACHMENTS_PER_TODO } from '@/types/todo';
import AttachmentList from '../AttachmentList';
import AttachmentUpload from '../AttachmentUpload';

// ============================================
// Attachment Panel Props
// ============================================

interface AttachmentPanelProps {
  attachments: Attachment[];
  todoId: string;
  currentUserName: string;
  expanded?: boolean;
  canEdit?: boolean;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
}

// ============================================
// Collapsed Attachment Display
// ============================================

interface CollapsedAttachmentDisplayProps {
  attachments: Attachment[];
  todoId: string;
  onRemove?: (attachmentId: string) => void;
  canRemove?: boolean;
}

export function CollapsedAttachmentDisplay({
  attachments,
  todoId,
  onRemove,
  canRemove = false,
}: CollapsedAttachmentDisplayProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" />
        <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
        <span className="text-xs text-[var(--accent-gold)]/70">({attachments.length})</span>
      </div>
      <AttachmentList
        attachments={attachments}
        todoId={todoId}
        onRemove={onRemove ?? (() => {})}
        canRemove={canRemove}
      />
    </div>
  );
}

// ============================================
// Attachment Panel Component
// ============================================

export function AttachmentPanel({
  attachments,
  todoId,
  currentUserName,
  expanded = false,
  canEdit = true,
  onUpdateAttachments,
}: AttachmentPanelProps) {
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

  const handleRemoveAttachment = (attachmentId: string) => {
    if (onUpdateAttachments) {
      // skipDbUpdate=true because the DELETE API already updated the database
      const updated = attachments.filter(a => a.id !== attachmentId);
      onUpdateAttachments(todoId, updated, true);
    }
  };

  const handleUploadComplete = (newAttachment: Attachment) => {
    if (onUpdateAttachments) {
      // skipDbUpdate=true because the API already saved to database
      const updatedAttachments = [...attachments, newAttachment];
      onUpdateAttachments(todoId, updatedAttachments, true);
    }
  };

  // Non-expanded mode - just show attachments if they exist
  if (!expanded) {
    if (attachments.length === 0) return null;
    
    const hasAudio = attachments.some(a => a.file_type === 'audio');
    
    return (
      <CollapsedAttachmentDisplay
        attachments={attachments}
        todoId={todoId}
        onRemove={handleRemoveAttachment}
        canRemove={canEdit && !!onUpdateAttachments}
      />
    );
  }

  // Expanded mode - full attachment management
  if (!onUpdateAttachments) return null;

  return (
    <>
      <div className="mb-4 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
            {attachments.length > 0 && (
              <span className="text-xs text-[var(--accent-gold)]/70">
                ({attachments.length}/{MAX_ATTACHMENTS_PER_TODO})
              </span>
            )}
          </div>
          {attachments.length < MAX_ATTACHMENTS_PER_TODO && (
            <button
              onClick={() => setShowAttachmentUpload(true)}
              className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {/* Attachment list or drop zone */}
        {attachments.length > 0 ? (
          <AttachmentList
            attachments={attachments}
            todoId={todoId}
            onRemove={handleRemoveAttachment}
            canRemove={true}
          />
        ) : (
          <button
            onClick={() => setShowAttachmentUpload(true)}
            className="w-full p-4 border-2 border-dashed border-[var(--accent-gold)]/30 rounded-[var(--radius-md)] text-center hover:border-[var(--accent-gold)]/50 hover:bg-[var(--accent-gold)]/5 transition-colors cursor-pointer"
          >
            <Paperclip className="w-5 h-5 text-[var(--accent-gold)]/50 mx-auto mb-1" />
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
          currentAttachmentCount={attachments.length}
          maxAttachments={MAX_ATTACHMENTS_PER_TODO}
        />
      )}
    </>
  );
}

export default AttachmentPanel;
