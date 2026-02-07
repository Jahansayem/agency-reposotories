/**
 * SubtaskSection Component
 *
 * Extracted from TodoItem.tsx (Phase 3 Refactoring)
 * Handles subtask display, editing, and management.
 * Includes:
 * - Progress bar
 * - Subtask list with inline editing
 * - Add subtask input
 * - Content importer for email/document parsing
 *
 * Reduces TodoItem.tsx complexity by ~150 lines.
 */

'use client';

import { useState } from 'react';
import { ListTree, Mail } from 'lucide-react';
import type { Subtask } from '@/types/todo';
import { v4 as uuidv4 } from 'uuid';
import { SubtaskItem } from './SubtaskList';
import ContentToSubtasksImporter from '../ContentToSubtasksImporter';

interface SubtaskSectionProps {
  todoId: string;
  subtasks: Subtask[];
  onUpdateSubtasks: (todoId: string, subtasks: Subtask[]) => void;
  expanded?: boolean;
  className?: string;
}

export function SubtaskSection({
  todoId,
  subtasks,
  onUpdateSubtasks,
  expanded = false,
  className = '',
}: SubtaskSectionProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showContentImporter, setShowContentImporter] = useState(false);

  // Calculate progress
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0
    ? Math.round((completedSubtasks / subtasks.length) * 100)
    : 0;

  /**
   * Toggle subtask completion
   */
  const toggleSubtask = (subtaskId: string) => {
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdateSubtasks(todoId, updated);
  };

  /**
   * Delete subtask
   */
  const deleteSubtask = (subtaskId: string) => {
    const updated = subtasks.filter(s => s.id !== subtaskId);
    onUpdateSubtasks(todoId, updated);
  };

  /**
   * Update subtask text
   */
  const updateSubtaskText = (subtaskId: string, text: string) => {
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, text } : s
    );
    onUpdateSubtasks(todoId, updated);
  };

  /**
   * Add new subtask manually
   */
  const addManualSubtask = () => {
    if (!newSubtaskText.trim()) return;

    const newSubtask: Subtask = {
      id: uuidv4(),
      text: newSubtaskText.trim(),
      completed: false,
      priority: 'medium',
    };

    onUpdateSubtasks(todoId, [...subtasks, newSubtask]);
    setNewSubtaskText('');
  };

  /**
   * Add subtasks from content importer (AI parsing)
   */
  const handleImportSubtasks = (importedSubtasks: Subtask[]) => {
    onUpdateSubtasks(todoId, [...subtasks, ...importedSubtasks]);
    setShowContentImporter(false);
  };

  // Collapsed view (non-expanded)
  if (!expanded && subtasks.length > 0) {
    return (
      <div className={`mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10 ${className}`}>
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
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={toggleSubtask}
              onDelete={deleteSubtask}
              onUpdate={updateSubtaskText}
            />
          ))}
        </div>
      </div>
    );
  }

  // Expanded view (full editor)
  return (
    <>
      <div className={`mb-4 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTree className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent)]">Subtasks</span>
            {subtasks.length > 0 && (
              <span className="text-xs text-[var(--accent)]/70">
                ({completedSubtasks}/{subtasks.length})
              </span>
            )}
          </div>
          <button
            onClick={() => setShowContentImporter(true)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-gold-light)] hover:bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            Import
          </button>
        </div>

        {/* Progress bar */}
        {subtasks.length > 0 && (
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
        {subtasks.length > 0 && (
          <div className="space-y-2 mb-3">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={toggleSubtask}
                onDelete={deleteSubtask}
                onUpdate={updateSubtaskText}
              />
            ))}
          </div>
        )}

        {/* Add subtask input - Enter to add, no separate button */}
        <input
          type="text"
          value={newSubtaskText}
          onChange={(e) => setNewSubtaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newSubtaskText.trim()) {
              addManualSubtask();
            }
          }}
          placeholder="Add a subtask (press Enter)..."
          className="input-refined w-full text-sm px-3 py-2 text-[var(--foreground)]"
        />
      </div>

      {/* Content Importer Modal */}
      {showContentImporter && (
        <ContentToSubtasksImporter
          onAddSubtasks={handleImportSubtasks}
          onClose={() => setShowContentImporter(false)}
          parentTaskText=""
        />
      )}
    </>
  );
}
