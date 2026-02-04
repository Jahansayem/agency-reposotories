'use client';

import { useState, useCallback, memo } from 'react';
import { Check, Trash2, Pencil, Plus, Mail } from 'lucide-react';
import { Subtask } from '@/types/todo';

// ============================================
// Subtask Item Component
// ============================================

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}

export const SubtaskItem = memo(function SubtaskItem({
  subtask,
  onToggle,
  onDelete,
  onUpdate,
}: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(subtask.text);

  const handleSave = useCallback(() => {
    if (editText.trim() && editText.trim() !== subtask.text) {
      onUpdate(subtask.id, editText.trim());
    } else {
      setEditText(subtask.text);
    }
    setIsEditing(false);
  }, [editText, subtask.id, subtask.text, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(subtask.text);
      setIsEditing(false);
    }
  }, [handleSave, subtask.text]);

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-2.5 rounded-[var(--radius-md)] transition-colors ${
        subtask.completed ? 'bg-[var(--surface-2)] opacity-75' : 'bg-[var(--surface)]'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(subtask.id)}
        role="checkbox"
        aria-checked={subtask.completed}
        aria-label={`${subtask.completed ? 'Completed' : 'Incomplete'}: ${subtask.text}`}
        className={`w-6 h-6 sm:w-5 sm:h-5 rounded-[var(--radius-sm)] border-2 flex items-center justify-center flex-shrink-0 transition-all touch-manipulation ${
          subtask.completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)] active:border-[var(--accent)]'
        }`}
      >
        {subtask.completed && <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} aria-hidden="true" />}
      </button>

      {/* Text or edit input */}
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 text-sm px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)] bg-[var(--surface)] text-[var(--foreground)]"
        />
      ) : (
        <span
          onClick={() => !subtask.completed && setIsEditing(true)}
          className={`flex-1 text-sm leading-snug cursor-pointer ${
            subtask.completed ? 'text-[var(--text-light)] line-through' : 'text-[var(--foreground)] hover:text-[var(--accent)]'
          }`}
          title={subtask.completed ? undefined : 'Click to edit'}
        >
          {subtask.text}
        </span>
      )}

      {/* Estimated time */}
      {subtask.estimatedMinutes && !isEditing && (
        <span className="text-xs text-[var(--text-light)] whitespace-nowrap">{subtask.estimatedMinutes}m</span>
      )}

      {/* Edit button */}
      {!isEditing && !subtask.completed && (
        <button
          onClick={() => setIsEditing(true)}
          aria-label={`Edit subtask: ${subtask.text}`}
          className="p-1.5 -m-1 text-[var(--text-light)] hover:text-[var(--accent)] active:text-[var(--accent-hover)] rounded transition-colors touch-manipulation opacity-0 group-hover:opacity-100 sm:opacity-100"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(subtask.id)}
        aria-label={`Delete subtask: ${subtask.text}`}
        className="p-1.5 -m-1 text-[var(--text-light)] hover:text-[var(--danger)] active:text-[var(--danger)] rounded transition-colors touch-manipulation"
      >
        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
});

// ============================================
// Subtask List Component
// ============================================

interface SubtaskListProps {
  subtasks: Subtask[];
  todoId: string;
  expanded?: boolean;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onUpdateSubtaskText: (subtaskId: string, text: string) => void;
  onAddSubtask: (text: string) => void;
  onShowContentImporter: () => void;
}

export function SubtaskList({
  subtasks,
  todoId,
  expanded = false,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskText,
  onAddSubtask,
  onShowContentImporter,
}: SubtaskListProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Ensure subtasks is always an array
  const safeSubtasks = Array.isArray(subtasks) ? subtasks : [];
  const completedSubtasks = safeSubtasks.filter(s => s.completed).length;
  const subtaskProgress = safeSubtasks.length > 0 ? Math.round((completedSubtasks / safeSubtasks.length) * 100) : 0;

  const handleAddManualSubtask = useCallback(() => {
    if (newSubtaskText.trim()) {
      onAddSubtask(newSubtaskText.trim());
      setNewSubtaskText('');
    }
  }, [newSubtaskText, onAddSubtask]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSubtaskText.trim()) {
      handleAddManualSubtask();
    }
  }, [newSubtaskText, handleAddManualSubtask]);

  if (!expanded) {
    // Collapsed view - just show progress
    return (
      <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[var(--accent)] mb-1">
            <span>Progress</span>
            <span>{subtaskProgress}%</span>
          </div>
          <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
        </div>

        {/* Subtask list */}
        <div className="space-y-2">
          {safeSubtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
              onUpdate={onUpdateSubtaskText}
            />
          ))}
        </div>
      </div>
    );
  }

  // Expanded view - full subtask management
  return (
    <div className="mb-4 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--accent)]">Subtasks</span>
          {safeSubtasks.length > 0 && (
            <span className="text-xs text-[var(--accent)]/70">({completedSubtasks}/{safeSubtasks.length})</span>
          )}
        </div>
        <button
          onClick={onShowContentImporter}
          className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-gold-light)] hover:bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-medium flex items-center gap-1.5 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Import
        </button>
      </div>

      {/* Progress bar */}
      {safeSubtasks.length > 0 && (
        <div className="mb-3">
          <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask list */}
      {safeSubtasks.length > 0 && (
        <div className="space-y-2 mb-3">
          {safeSubtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
              onUpdate={onUpdateSubtaskText}
            />
          ))}
        </div>
      )}

      {/* Add subtask input - Enter to add, no separate button */}
      <input
        type="text"
        value={newSubtaskText}
        onChange={(e) => setNewSubtaskText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a subtask (press Enter)..."
        className="input-refined w-full text-sm px-3 py-2 text-[var(--foreground)]"
      />
    </div>
  );
}

export default SubtaskList;
