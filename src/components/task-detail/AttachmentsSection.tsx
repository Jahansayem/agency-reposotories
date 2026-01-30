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
}

export default function AttachmentsSection({
  attachments,
  todoId,
  currentUserName,
  maxAttachments,
  onUpdateAttachments,
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
          className="flex items-center gap-2 py-2 text-left"
          style={{ color: 'var(--foreground)' }}
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
          )}
          <Paperclip
            className="w-4 h-4"
            style={{ color: 'var(--accent-gold)' }}
          />
          <span className="text-sm font-semibold">
            Attachments ({attachments.length}/{maxAttachments})
          </span>
        </button>

        {attachments.length < maxAttachments && (
          <button
            type="button"
            onClick={() => {
              if (!isOpen) setIsOpen(true);
              setShowUpload(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors"
            style={{
              color: 'var(--accent-gold)',
              background: 'var(--accent-gold-light)',
            }}
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
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-1 pb-2">
              {attachments.length > 0 ? (
                <AttachmentList
                  attachments={attachments}
                  todoId={todoId}
                  onRemove={handleRemoveAttachment}
                  canRemove={true}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: '2px dashed var(--border)',
                    color: 'var(--text-light)',
                    background: 'var(--surface)',
                  }}
                >
                  <Paperclip className="w-6 h-6" />
                  <span className="text-sm">
                    Drop files here or click to browse
                  </span>
                </button>
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
