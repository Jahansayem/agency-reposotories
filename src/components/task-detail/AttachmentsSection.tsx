'use client';

import { useState } from 'react';
import { Paperclip, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Attachment } from '@/types/todo';
import { MAX_ATTACHMENTS_PER_TODO } from '@/types/todo';
import AttachmentList from '../AttachmentList';
import AttachmentUpload from '../AttachmentUpload';

interface AttachmentsSectionProps {
  attachments: Attachment[];
  todoId: string;
  currentUserName: string;
  maxAttachments: number;
  onUpdateAttachments?: (
    id: string,
    attachments: Attachment[],
    skipDbUpdate?: boolean,
  ) => void;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function AttachmentsSection({
  attachments,
  todoId,
  currentUserName,
  maxAttachments,
  onUpdateAttachments,
  canEdit = true,
}: AttachmentsSectionProps) {
  const [isOpen, setIsOpen] = useState(attachments.length > 0);
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = (newAttachment: Attachment) => {
    const updated = [...attachments, newAttachment];
    onUpdateAttachments?.(todoId, updated, true);
    setShowUpload(false);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const updated = attachments.filter((a) => a.id !== attachmentId);
    onUpdateAttachments?.(todoId, updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-2 py-2 text-left text-[var(--foreground)]"
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
          <Paperclip className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-metadata font-semibold">
            Attachments
          </span>
          {attachments.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-label rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
              {attachments.length}
            </span>
          )}
        </button>

        {canEdit && attachments.length > 0 && attachments.length < maxAttachments && (
          <button
            type="button"
            onClick={() => {
              if (!isOpen) setIsOpen(true);
              setShowUpload(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[var(--radius-md)] transition-colors text-[var(--accent)] bg-[var(--accent-light)] hover:brightness-95"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2">
              {attachments.length > 0 ? (
                <AttachmentList
                  attachments={attachments}
                  todoId={todoId}
                  onRemove={handleRemoveAttachment}
                  canRemove={canEdit}
                />
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-colors border-2 border-dashed border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
                >
                  <Paperclip className="w-6 h-6" />
                  <span className="text-metadata">
                    Drop files here or click to browse
                  </span>
                  <span className="text-label text-[var(--text-muted)]">
                    {maxAttachments - attachments.length} of {maxAttachments} slots available
                  </span>
                </button>
              ) : (
                <div className="text-center py-6 text-[var(--text-muted)] text-sm">
                  No attachments
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload modal */}
      {showUpload && (
        <AttachmentUpload
          todoId={todoId}
          userName={currentUserName}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
          currentAttachmentCount={attachments.length}
          maxAttachments={maxAttachments}
        />
      )}
    </div>
  );
}
