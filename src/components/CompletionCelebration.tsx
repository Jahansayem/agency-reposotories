'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Flame, ChevronRight, Copy } from 'lucide-react';
import { CelebrationData, CelebrationIntensity, PRIORITY_CONFIG } from '@/types/todo';
import { getStreakBadge, getDismissButtonText } from '@/lib/taskSuggestions';
import { Celebration } from './Celebration';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

interface CompletionCelebrationProps {
  celebrationData: CelebrationData;
  onDismiss: () => void;
  onNextTaskClick: (taskId: string) => void;
  onShowSummary: () => void;
}

export function CompletionCelebration({
  celebrationData,
  onDismiss,
  onNextTaskClick,
  onShowSummary,
}: CompletionCelebrationProps) {
  const { completedTask, nextTasks, streakCount, encouragementMessage } = celebrationData;
  const [showConfetti, setShowConfetti] = useState(true);

  const streakBadge = getStreakBadge(streakCount);
  const dismissText = getDismissButtonText(nextTasks.length);

  // Auto-dismiss confetti animation after a bit (modal stays open until user acts)
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getIntensity = (): CelebrationIntensity => {
    if (completedTask.priority === 'urgent' || streakCount >= 5) return 'high';
    if (completedTask.priority === 'high' || streakCount >= 3) return 'medium';
    return 'light';
  };

  const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'Overdue';
    if (isToday(date)) return 'Due today';
    if (isTomorrow(date)) return 'Due tomorrow';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        {/* Confetti Effect */}
        {showConfetti && <Celebration trigger={true} intensity={getIntensity()} />}

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-[var(--surface)] rounded-[var(--radius-2xl)] shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with checkmark */}
          <div className="relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--success)]/20 to-[var(--success)]/10" />

            <div className="relative px-6 py-8 text-center">
              {/* Checkmark animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)]/10 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <CheckCircle className="w-10 h-10 text-[var(--success)]" />
                </motion.div>
              </motion.div>

              {/* Encouragement message */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-semibold text-[var(--foreground)] mb-2"
              >
                {encouragementMessage}
              </motion.h2>

              {/* Completed task text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[var(--text-muted)] line-through text-base"
              >
                {completedTask.text}
              </motion.p>

              {/* Streak badge */}
              {streakBadge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[var(--warning)]/10 rounded-full"
                >
                  <Flame className="w-4 h-4 text-[var(--warning)]" />
                  <span className="text-sm font-medium text-[var(--warning)]">
                    {streakBadge}
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Next tasks section */}
          {nextTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="px-6 pb-4"
            >
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                Up next for you:
              </h3>
              <div className="space-y-2">
                {nextTasks.slice(0, 3).map((task, index) => (
                  <motion.button
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    onClick={() => onNextTaskClick(task.id)}
                    className="w-full flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-[var(--radius-xl)] hover:bg-[var(--surface-3)] transition-colors text-left group"
                  >
                    {/* Priority indicator */}
                    <div
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {task.text}
                      </p>
                      {task.due_date && (
                        <p className={`text-xs ${
                          isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                            ? 'text-[var(--danger)]'
                            : 'text-[var(--text-muted)]'
                        }`}>
                          {formatDueDate(task.due_date)}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--foreground)] transition-colors flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="px-6 py-4 border-t border-[var(--border)] flex gap-3"
          >
            <button
              onClick={onShowSummary}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface-2)] rounded-[var(--radius-xl)] hover:bg-[var(--surface-3)] transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy to eAgent
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[var(--accent)] rounded-[var(--radius-xl)] hover:bg-[var(--accent)]/90 transition-colors"
            >
              {dismissText}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}