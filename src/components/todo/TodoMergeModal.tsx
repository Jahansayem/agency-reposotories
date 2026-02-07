/**
 * TodoMergeModal - Modal for merging multiple tasks into one
 *
 * Extracted from TodoList.tsx to reduce component size.
 * Handles:
 * - Displaying tasks to merge
 * - Primary task selection
 * - Merge confirmation and execution
 */

'use client';

import { Todo } from '@/types/todo';
import { GitMerge, Check } from 'lucide-react';

interface TodoMergeModalProps {
  isOpen: boolean;
  mergeTargets: Todo[];
  selectedPrimaryId: string | null;
  isMerging: boolean;
  onClose: () => void;
  onSelectPrimary: (id: string) => void;
  onMerge: (primaryId: string) => void;
}

export function TodoMergeModal({
  isOpen,
  mergeTargets,
  selectedPrimaryId,
  isMerging,
  onClose,
  onSelectPrimary,
  onMerge,
}: TodoMergeModalProps) {
  if (!isOpen || mergeTargets.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Merge Tasks">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!isMerging) {
            onClose();
          }
        }}
      />
      <div className="relative w-full max-w-md rounded-[var(--radius-2xl)] shadow-2xl overflow-hidden bg-[var(--surface)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--brand-blue)]/15 flex items-center justify-center">
              <GitMerge className="w-4.5 h-4.5 text-[var(--brand-blue)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Merge {mergeTargets.length} Tasks</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Select the task to keep
              </p>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="px-4 py-3 max-h-72 overflow-y-auto">
          <div className="space-y-2">
            {mergeTargets.map((todo) => (
              <button
                key={todo.id}
                onClick={() => onSelectPrimary(todo.id)}
                className={`w-full text-left p-3 rounded-[var(--radius-xl)] border transition-all ${
                  selectedPrimaryId === todo.id
                    ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/10 ring-1 ring-[var(--brand-blue)]/30'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--border-hover)]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedPrimaryId === todo.id
                      ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]'
                      : 'border-[var(--border)]'}`}>
                    {selectedPrimaryId === todo.id && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--foreground)]">
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(todo.created_at).toLocaleDateString()}
                      </span>
                      {todo.attachments && todo.attachments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-badge bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {todo.attachments.length} file{todo.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {todo.subtasks && todo.subtasks.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-badge bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {todo.subtasks.length} subtask{todo.subtasks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mx-4 mb-3 p-3 rounded-[var(--radius-lg)] text-xs bg-[var(--surface-2)] text-[var(--text-muted)]">
          <p className="font-medium mb-1.5 text-[var(--text-light)]">When merged:</p>
          <div className="grid grid-cols-2 gap-1">
            <span>• Notes combined</span>
            <span>• Attachments kept</span>
            <span>• Subtasks merged</span>
            <span>• Highest priority</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2 border-[var(--border)] bg-[var(--surface)]">
          <button
            onClick={() => {
              if (!isMerging) {
                onClose();
              }
            }}
            disabled={isMerging}
            className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-lg)] transition-colors ${
              isMerging
                ? 'opacity-50 cursor-not-allowed'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedPrimaryId && !isMerging) {
                onMerge(selectedPrimaryId);
              }
            }}
            disabled={!selectedPrimaryId || isMerging}
            className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-lg)] transition-all flex items-center gap-2 ${
              selectedPrimaryId && !isMerging
                ? 'bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)]/90 shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-light)] cursor-not-allowed'}`}
          >
            {isMerging ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                Merge Tasks
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
