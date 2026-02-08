'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Clock, User, Check, AlertCircle } from 'lucide-react';
import { formatDistance, format } from 'date-fns';
import { useVersionHistory, type TodoVersion } from '@/hooks/useVersionHistory';
import type { User as UserType } from '@/types/todo';

/**
 * VersionHistoryModal Component
 * Sprint 3 Issue #41: Version History
 *
 * Displays version history timeline for a todo with restore functionality
 *
 * Usage:
 * ```tsx
 * <VersionHistoryModal
 *   todoId={todo.id}
 *   currentUser={currentUser}
 *   onClose={() => setShowHistory(false)}
 * />
 * ```
 */

interface VersionHistoryModalProps {
  todoId: string;
  currentUser: UserType;
  onClose: () => void;
}

export function VersionHistoryModal({
  todoId,
  currentUser,
  onClose,
}: VersionHistoryModalProps) {
  const { versions, loading, restoreVersion } = useVersionHistory(todoId);
  const [selectedVersion, setSelectedVersion] = useState<TodoVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async (version: TodoVersion) => {
    if (!confirm(`Restore to version ${version.version_number}? This will create a new version.`)) {
      return;
    }

    setRestoring(true);
    const success = await restoreVersion(version.id, currentUser.name);
    setRestoring(false);

    if (success) {
      alert('Version restored successfully!');
      setSelectedVersion(null);
    } else {
      alert('Failed to restore version. Please try again.');
    }
  };

  // Get change type color
  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'text-[var(--success)] bg-[var(--success)]/10';
      case 'restored':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30';
      default:
        return 'text-[var(--accent)] bg-[var(--accent)]/10';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--surface)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Version History
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                <AlertCircle className="w-12 h-12 mb-3" />
                <p>No version history available</p>
              </div>
            ) : (
              <div className="p-6">
                {/* Timeline */}
                <div className="space-y-4">
                  {versions.map((version, index) => {
                    const isLatest = index === 0;
                    const isSelected = selectedVersion?.id === version.id;

                    return (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                          relative pl-8 pb-8 border-l-2
                          ${isLatest
                            ? 'border-[var(--accent)]'
                            : 'border-[var(--border)]'
                          }
                          ${index === versions.length - 1 ? 'border-l-transparent pb-0' : ''}
                        `}
                      >
                        {/* Timeline dot */}
                        <div
                          className={`
                            absolute -left-2 top-0 w-4 h-4 rounded-full
                            ${isLatest
                              ? 'bg-[var(--accent)] ring-4 ring-[var(--accent)]/20'
                              : 'bg-[var(--border)]'
                            }
                          `}
                        />

                        {/* Version card */}
                        <div
                          className={`
                            ml-4 rounded-lg border-2 p-4 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                              : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                            }
                          `}
                          onClick={() => setSelectedVersion(isSelected ? null : version)}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-[var(--foreground)]">
                                  Version {version.version_number}
                                </span>
                                {isLatest && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                                    Current
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getChangeTypeColor(
                                    version.change_type
                                  )}`}
                                >
                                  {version.change_type}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{version.changed_by}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {formatDistance(new Date(version.changed_at), new Date(), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                              </div>

                              {version.change_summary && (
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                  {version.change_summary}
                                </p>
                              )}
                            </div>

                            {!isLatest && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(version);
                                }}
                                disabled={restoring}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Restore
                              </button>
                            )}
                          </div>

                          {/* Version details (expanded) */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-[var(--border)] pt-3 mt-3 space-y-2"
                              >
                                <div>
                                  <span className="text-xs font-medium text-[var(--text-muted)]">
                                    Title:
                                  </span>
                                  <p className="text-sm text-[var(--foreground)] mt-0.5">
                                    {version.text}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Status:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5 capitalize">
                                      {version.status}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Priority:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5 capitalize">
                                      {version.priority}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Assigned To:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5">
                                      {version.assigned_to || 'Unassigned'}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Due Date:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5">
                                      {version.due_date
                                        ? format(new Date(version.due_date), 'MMM d, yyyy')
                                        : 'No due date'}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Completed:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5 flex items-center gap-1">
                                      {version.completed ? (
                                        <>
                                          <Check className="w-4 h-4 text-[var(--success)]" />
                                          Yes
                                        </>
                                      ) : (
                                        'No'
                                      )}
                                    </p>
                                  </div>

                                  {version.recurrence && (
                                    <div>
                                      <span className="text-xs font-medium text-[var(--text-muted)]">
                                        Recurrence:
                                      </span>
                                      <p className="text-sm text-[var(--foreground)] mt-0.5 capitalize">
                                        {version.recurrence}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {version.notes && (
                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Notes:
                                    </span>
                                    <p className="text-sm text-[var(--foreground)] mt-0.5 whitespace-pre-wrap">
                                      {version.notes}
                                    </p>
                                  </div>
                                )}

                                {version.subtasks && version.subtasks.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Subtasks ({version.subtasks.length}):
                                    </span>
                                    <ul className="mt-1 space-y-1">
                                      {version.subtasks.map((subtask: any, i: number) => (
                                        <li
                                          key={i}
                                          className="text-sm text-[var(--foreground)] flex items-center gap-2"
                                        >
                                          <span
                                            className={
                                              subtask.completed
                                                ? 'line-through text-[var(--text-muted)]'
                                                : ''
                                            }
                                          >
                                            {subtask.text}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
