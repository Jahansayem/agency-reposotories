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
          className="flex items-center gap-2 py-2 text-left"
          style={{ color: 'var(--foreground)' }}
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
          )}
          <ListTree className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold">
            Subtasks ({completedCount}/{subtasks.length})
          </span>
        </button>

        <button
          type="button"
          onClick={onImportSubtasks}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors"
          style={{
            color: 'var(--accent)',
            background: 'var(--accent-light)',
          }}
        >
          <Mail className="w-3 h-3" />
          Import
        </button>
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
            <div className="pt-1 pb-2 space-y-2">
              {/* Progress bar */}
              <div
                className="w-full h-[2px] rounded-full"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>

              {/* Subtask list */}
              <ul className="space-y-1">
                {subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2 group py-1 px-1 rounded-md"
                    style={{ background: 'transparent' }}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={subtask.completed}
                      onClick={() => onToggleSubtask(subtask.id)}
                      className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors"
                      style={{
                        borderColor: subtask.completed
                          ? 'var(--accent)'
                          : 'var(--border)',
                        background: subtask.completed
                          ? 'var(--accent)'
                          : 'transparent',
                        color: subtask.completed ? '#fff' : 'transparent',
                      }}
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
                        className="flex-1 text-sm px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--accent)',
                          color: 'var(--foreground)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm cursor-pointer"
                        onClick={() => startEditing(subtask)}
                        style={{
                          color: subtask.completed
                            ? 'var(--text-light)'
                            : 'var(--foreground)',
                          textDecoration: subtask.completed
                            ? 'line-through'
                            : 'none',
                        }}
                      >
                        {subtask.text}
                      </span>
                    )}

                    {/* Action buttons */}
                    {editingId !== subtask.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEditing(subtask)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          aria-label={`Edit subtask: ${subtask.text}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSubtask(subtask.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--danger)' }}
                          aria-label={`Delete subtask: ${subtask.text}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add subtask input */}
              <div className="flex items-center gap-2 pt-1">
                <Plus
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--text-light)' }}
                />
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => onNewSubtaskTextChange(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Add a subtask (press Enter)..."
                  className="flex-1 text-sm px-2 py-1.5 rounded-md"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
