'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, GitMerge, X, Calendar, Flag, Paperclip, ListChecks } from 'lucide-react';
import { TodoPriority, Subtask, PRIORITY_CONFIG } from '@/types/todo';
import { DuplicateMatch } from '@/lib/duplicateDetection';
import { useEscapeKey, useFocusTrap } from '@/hooks';
import {
  backdropVariants,
  modalVariants,
  modalTransition,
  prefersReducedMotion,
  DURATION,
} from '@/lib/animations';

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  newTaskText: string;
  newTaskPriority: TodoPriority;
  newTaskDueDate?: string;
  newTaskAssignedTo?: string;
  newTaskSubtasks?: Subtask[];
  newTaskTranscription?: string;
  duplicates: DuplicateMatch[];

  onCreateAnyway: () => void;
  onAddToExisting: (todoId: string) => void;
  onCancel: () => void;
}

export default function DuplicateDetectionModal({
  isOpen,
  newTaskText,
  newTaskPriority,
  newTaskDueDate,
  newTaskAssignedTo,
  newTaskSubtasks,
  newTaskTranscription,
  duplicates,
  onCreateAnyway,
  onAddToExisting,
  onCancel,
}: DuplicateDetectionModalProps) {
  // Handle Escape key to close modal
  useEscapeKey(onCancel, { enabled: isOpen });

  // Focus trap for accessibility (WCAG 2.1 AA)
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    onEscape: onCancel,
    enabled: isOpen,
    autoFocus: true,
  });

  const priorityConfig = PRIORITY_CONFIG[newTaskPriority];
  const reducedMotion = prefersReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={reducedMotion ? undefined : backdropVariants}
          initial={reducedMotion ? { opacity: 1 } : 'hidden'}
          animate={reducedMotion ? { opacity: 1 } : 'visible'}
          exit={reducedMotion ? { opacity: 0 } : 'exit'}
          transition={{ duration: reducedMotion ? 0 : DURATION.fast }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Duplicate Detection"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : DURATION.fast }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            ref={containerRef}
            variants={reducedMotion ? undefined : modalVariants}
            initial={reducedMotion ? { opacity: 1 } : 'hidden'}
            animate={reducedMotion ? { opacity: 1 } : 'visible'}
            exit={reducedMotion ? { opacity: 0 } : 'exit'}
            transition={reducedMotion ? { duration: 0 } : modalTransition}
            className={`relative w-full max-w-xl rounded-[var(--radius-xl)] shadow-xl overflow-hidden ${'bg-[var(--surface)]'}`}
          >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${'border-[var(--border)]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--warning-light)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${'text-[var(--foreground)]'}`}>
                Similar Tasks Found
              </h2>
              <p className={`text-sm ${'text-[var(--text-muted)]'}`}>
                We found {duplicates.length} existing task{duplicates.length !== 1 ? 's' : ''} that might be related
              </p>
            </div>
            <button
              onClick={onCancel}
              aria-label="Close duplicate detection"
              className={`ml-auto p-2 rounded-lg transition-colors ${
                'hover:bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New task preview */}
        <div className={`px-6 py-4 border-b ${'border-[var(--border)] bg-[var(--surface-2)]/50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${'text-[var(--text-light)]'}`}>
            New Task
          </p>
          <div className={`p-3 rounded-lg ${'bg-[var(--surface)]'}`}>
            <p className={`font-medium ${'text-[var(--foreground)]'}`}>
              {newTaskText}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
              >
                <Flag className="w-3 h-3 inline mr-1" />
                {priorityConfig.label}
              </span>
              {newTaskDueDate && (
                <span className={'text-[var(--text-muted)]'}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(newTaskDueDate).toLocaleDateString()}
                </span>
              )}
              {newTaskAssignedTo && (
                <span className={'text-[var(--text-muted)]'}>
                  Assigned to {newTaskAssignedTo}
                </span>
              )}
              {newTaskSubtasks && newTaskSubtasks.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-[var(--brand-sky)]/20 text-[var(--brand-blue)]">
                  <ListChecks className="w-3 h-3 inline mr-1" />
                  {newTaskSubtasks.length} subtask{newTaskSubtasks.length !== 1 ? 's' : ''}
                </span>
              )}
              {newTaskTranscription && (
                <span className="px-2 py-0.5 rounded bg-[var(--accent-light)] text-[var(--accent)]">
                  Has transcription
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Existing tasks */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${'text-[var(--text-light)]'}`}>
            Existing Similar Tasks
          </p>
          <div className="space-y-3">
            {duplicates.map(({ todo, matchReasons }) => {
              const todoPriorityConfig = PRIORITY_CONFIG[todo.priority || 'medium'];
              return (
                <button
                  key={todo.id}
                  onClick={() => onAddToExisting(todo.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--brand-blue)]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium line-clamp-2 ${'text-[var(--foreground)]'}`}>
                        {todo.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: todoPriorityConfig.bgColor, color: todoPriorityConfig.color }}
                        >
                          {todoPriorityConfig.label}
                        </span>
                        <span className={'text-[var(--text-muted)]'}>
                          {new Date(todo.created_at).toLocaleDateString()}
                        </span>
                        {todo.attachments && todo.attachments.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--accent-light)] text-[var(--accent)]">
                            <Paperclip className="w-3 h-3 inline mr-0.5" />
                            {todo.attachments.length}
                          </span>
                        )}
                        {todo.subtasks && todo.subtasks.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--brand-sky)]/20 text-[var(--brand-blue)]">
                            <ListChecks className="w-3 h-3 inline mr-0.5" />
                            {todo.subtasks.length}
                          </span>
                        )}
                      </div>
                      {/* Match reasons */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {matchReasons.map((reason, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              'bg-[var(--warning-light)] text-[var(--warning)]'}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        'bg-[var(--brand-blue)]/10'}`}>
                        <GitMerge className="w-4 h-4 text-[var(--brand-blue)]" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${'border-[var(--border)] bg-[var(--surface-2)]/50'}`}>
          <p className={`text-xs ${'text-[var(--text-muted)]'}`}>
            Click a task above to add your content to it, or create a new task
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
            >
              Cancel
            </button>
            <motion.button
              onClick={onCreateAnyway}
              whileHover={prefersReducedMotion() ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion() ? undefined : { scale: 0.98 }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-blue)] text-white hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create New Task
            </motion.button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
