'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MoreVertical, Edit3, Check } from 'lucide-react';
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
  todoText: string; // original text for cancel
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
}: TaskDetailHeaderProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localTitle, setLocalTitle] = useState(title);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (editingTitle && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTitle]);

  const handleLocalChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveTitle();
    } else if (e.key === 'Escape') {
      setLocalTitle(todoText);
      onCancelEditTitle(todoText);
    }
  };

  const priorityColor = PRIORITY_CONFIG[priority].color;

  return (
    <div className="flex-shrink-0">
      {/* Priority color bar */}
      <div
        className="h-1 w-full rounded-t-lg"
        style={{ backgroundColor: priorityColor }}
        aria-label={`Priority: ${PRIORITY_CONFIG[priority].label}`}
      />

      {/* Header content */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        {/* Title area */}
        <div className="flex-1 min-w-0 flex items-start gap-2">
          {editingTitle ? (
            <div className="flex-1 flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={localTitle}
                onChange={(e) => handleLocalChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full resize-none rounded-md border px-3 py-2 text-base font-semibold leading-snug bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                rows={2}
                aria-label="Edit task title"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveTitle}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-[var(--brand-blue)] text-white hover:opacity-90 transition-opacity"
                  aria-label="Save title"
                >
                  <Check size={14} />
                  Save
                </button>
                <button
                  onClick={() => {
                    setLocalTitle(todoText);
                    onCancelEditTitle(todoText);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-colors"
                  aria-label="Cancel editing title"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onStartEditTitle}
              className="flex-1 flex items-start gap-2 text-left group min-w-0"
              aria-label="Click to edit task title"
            >
              <Edit3
                size={16}
                className="mt-1 flex-shrink-0 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <h2
                className={`text-base font-semibold leading-snug text-[var(--foreground)] ${
                  completed ? 'line-through opacity-60' : ''
                }`}
              >
                {title}
              </h2>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onOverflowClick}
            className="flex items-center justify-center rounded-md text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Close task detail"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
