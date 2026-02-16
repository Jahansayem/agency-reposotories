'use client';

import { useRef, useEffect, useCallback } from 'react';
import { X, MoreHorizontal, Check, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TodoPriority } from '@/types/todo';
import { PRIORITY_CONFIG } from '@/types/todo';

interface TaskDetailHeaderProps {
  title: string;
  priority: TodoPriority;
  completed: boolean;
  editingTitle: boolean;
  onTitleChange: (text: string) => void;
  onSaveTitle: () => void;
  onStartEditTitle: () => void;
  onCancelEditTitle: (originalTitle: string) => void;
  onClose: () => void;
  onOverflowClick: () => void;
  todoText: string;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function TaskDetailHeader({
  title,
  priority,
  completed,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onStartEditTitle,
  onCancelEditTitle,
  onClose,
  onOverflowClick,
  todoText,
  canEdit = true,
}: TaskDetailHeaderProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTitle && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editingTitle]);

  const handleChange = useCallback((value: string) => {
    onTitleChange(value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [onTitleChange, textareaRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveTitle();
    } else if (e.key === 'Escape') {
      onCancelEditTitle(todoText);
    }
  }, [onSaveTitle, todoText, onCancelEditTitle]);

  const priorityColor = PRIORITY_CONFIG[priority].color;

  return (
    <div className="flex-shrink-0 relative">
      {/* Priority color bar — thick enough to be intentional */}
      <div
        className="h-2 w-full rounded-t-2xl"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Header content */}
      <div className="px-5 pt-4 pb-3">
        {/* Top row: action buttons */}
        <div className="flex items-center justify-between mb-3">
          {/* Priority pill */}
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{
              backgroundColor: priorityColor + '18',
              color: priorityColor,
            }}
            role="status"
            aria-label={`Task priority: ${PRIORITY_CONFIG[priority].label}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: priorityColor }}
              aria-hidden="true"
            />
            {PRIORITY_CONFIG[priority].label}
          </motion.span>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onOverflowClick}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
              aria-label="More options"
              aria-haspopup="menu"
              type="button"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
              aria-label="Close task details dialog"
              type="button"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Title */}
        {editingTitle ? (
          <div className="space-y-2.5">
            <textarea
              ref={textareaRef}
              value={title}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none rounded-lg border-2 px-3 py-2.5 text-lg font-semibold leading-snug bg-[var(--surface)] text-[var(--foreground)] border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] placeholder:text-[var(--text-muted)]"
              rows={1}
              aria-label="Edit task title"
              aria-describedby="title-edit-hint"
              placeholder="Task title..."
            />
            <span id="title-edit-hint" className="sr-only">
              Press Enter to save, Escape to cancel
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onSaveTitle}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                aria-label="Save task title"
                type="button"
              >
                <Check size={14} aria-hidden="true" />
                Save
              </button>
              <button
                onClick={() => onCancelEditTitle(todoText)}
                className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                aria-label="Cancel editing task title"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : canEdit ? (
          <motion.button
            onClick={onStartEditTitle}
            className="w-full text-left group rounded-lg -mx-2 px-2 py-1 hover:bg-[var(--surface-2)] transition-colors duration-150 flex items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label={`Edit task title: ${title}`}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="flex-1 min-w-0">
              <h2
                className={`text-lg font-semibold leading-snug text-[var(--foreground)] transition-opacity ${
                  completed ? 'line-through opacity-50' : ''
                }`}
              >
                {title}
              </h2>
              <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 block" aria-hidden="true">
                Click to edit
              </span>
            </div>
            {/* Edit icon - visible on mobile, appears on hover on desktop */}
            <Edit2
              size={16}
              className="text-[var(--text-muted)] opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
              aria-hidden="true"
            />
          </motion.button>
        ) : (
          <motion.div
            className="w-full text-left rounded-lg -mx-2 px-2 py-1"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <h2
              className={`text-lg font-semibold leading-snug text-[var(--foreground)] transition-opacity ${
                completed ? 'line-through opacity-50' : ''
              }`}
            >
              {title}
            </h2>
          </motion.div>
        )}
      </div>
    </div>
  );
}
