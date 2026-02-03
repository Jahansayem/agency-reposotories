'use client';

import { useState } from 'react';
import { ListTree, Check, Trash2, Plus, Mail, Pencil } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subtask } from '@/types/todo';

interface SubtasksSectionProps {
  subtasks: Subtask[];
  completedCount: number;
  progress: number;
  newSubtaskText: string;
  onNewSubtaskTextChange: (text: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateSubtaskText: (id: string, text: string) => void;
  onImportSubtasks: () => void;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function SubtasksSection({
  subtasks,
  completedCount,
  progress,
  newSubtaskText,
  onNewSubtaskTextChange,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskText,
  onImportSubtasks,
  canEdit = true,
}: SubtasksSectionProps) {
  const [isOpen, setIsOpen] = useState(subtasks.length > 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEditing = (subtask: Subtask) => {
    setEditingId(subtask.id);
    setEditText(subtask.text);
  };

  const commitEdit = (id: string) => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== subtasks.find((s) => s.id === id)?.text) {
      onUpdateSubtaskText(id, trimmed);
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddSubtask();
    }
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
          <ListTree className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-semibold">
            Subtasks ({completedCount}/{subtasks.length})
          </span>
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={onImportSubtasks}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[var(--radius-md)] transition-colors text-[var(--accent)] bg-[var(--accent-light)] hover:brightness-95"
          >
            <Mail className="w-3 h-3" />
            Import
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
            <div className="pt-1 pb-2 space-y-2">
              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[3px] rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-label text-[var(--text-muted)] tabular-nums">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}

              {/* Subtask list */}
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {subtasks.map((subtask) => (
                    <motion.li
                      key={subtask.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 group py-2 px-2 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={subtask.completed}
                        onClick={() => canEdit && onToggleSubtask(subtask.id)}
                        disabled={!canEdit}
                        className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-[5px] border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          !canEdit
                            ? 'opacity-60 cursor-not-allowed border-[var(--border)] ' + (subtask.completed ? 'bg-[var(--accent)] text-white' : 'bg-transparent text-transparent')
                            : subtask.completed
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                              : 'border-[var(--border)] bg-transparent text-transparent hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {subtask.completed && <Check className="w-3 h-3" />}
                      </button>

                      {/* Text / Inline edit */}
                      {editingId === subtask.id ? (
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => commitEdit(subtask.id)}
                          onKeyDown={(e) => handleEditKeyDown(e, subtask.id)}
                          autoFocus
                          className="flex-1 text-sm px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                      ) : (
                        <span
                          className={`flex-1 text-sm ${canEdit ? 'cursor-pointer' : ''} ${
                            subtask.completed
                              ? 'text-[var(--text-muted)] line-through opacity-60'
                              : 'text-[var(--foreground)]'
                          }`}
                          onClick={() => canEdit && startEditing(subtask)}
                        >
                          {subtask.text}
                        </span>
                      )}

                      {/* Action buttons - always visible on mobile, hover on desktop */}
                      {editingId !== subtask.id && canEdit && (
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEditing(subtask)}
                            className="p-1 rounded-[var(--radius-sm)] transition-colors text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]"
                            aria-label={`Edit subtask: ${subtask.text}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSubtask(subtask.id)}
                            className="p-1 rounded-[var(--radius-sm)] transition-colors text-[var(--danger)] hover:bg-[var(--danger-light)]"
                            aria-label={`Delete subtask: ${subtask.text}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {/* Add subtask input - only show if canEdit */}
              {canEdit && (
                <div className="flex items-center gap-2 pt-1">
                  <Plus
                    className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => onNewSubtaskTextChange(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Add a subtask (press Enter)..."
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-transparent text-[var(--foreground)] outline-none transition-colors hover:border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
