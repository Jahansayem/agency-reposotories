'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  AlertTriangle,
  CalendarDays,
  Users,
  Target,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { useEscapeKey, useFocusTrap } from '@/hooks';
import type { AuthUser } from '@/types/todo';

// Types based on the API response
interface DailyDigestTask {
  id: string;
  text: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  status: string;
  subtasks_count: number;
  subtasks_completed: number;
}

interface DailyDigestData {
  greeting: string;
  overdueTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  todaysTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  teamActivity: {
    summary: string;
    highlights: string[];
  };
  focusSuggestion: string;
  generatedAt: string;
}

interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onNavigateToTask?: (taskId: string) => void;
  onFilterOverdue?: () => void;
  onFilterDueToday?: () => void;
}

// Priority color mapping
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-[var(--brand-blue)]';
    case 'low':
      return 'bg-slate-400';
    default:
      return 'bg-[var(--brand-blue)]';
  }
};

// Skeleton loading component - extracted outside to prevent recreation on each render
const SkeletonSection = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={`skeleton-line-${i}`}
        className="h-4 bg-[var(--surface-3)] rounded animate-pulse"
        style={{ width: `${85 - i * 15}%` }}
      />
    ))}
  </div>
);

// Format relative due date
const formatDueDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
};

export default function DailyDigestModal({
  isOpen,
  onClose,
  currentUser,
  onNavigateToTask,
  onFilterOverdue,
  onFilterDueToday,
}: DailyDigestModalProps) {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Escape key to close modal
  useEscapeKey(onClose, { enabled: isOpen });

  // Focus trap for accessibility (WCAG 2.1 AA)
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    onEscape: onClose,
    enabled: isOpen,
    autoFocus: true,
  });

  // Helper to get CSRF token from cookie
  const getCsrfToken = useCallback((): string | null => {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : null;
  }, []);

  // Fetch daily digest
  const fetchDigest = useCallback(async () => {
    if (!currentUser?.name) return;

    setLoading(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/ai/daily-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Name': currentUser.name,
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({
          userName: currentUser.name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch daily digest');
      }

      setDigest(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      console.error('Error fetching daily digest:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.name, getCsrfToken]);

  // Fetch digest when modal opens
  useEffect(() => {
    if (isOpen && !digest && !loading) {
      fetchDigest();
    }
  }, [isOpen, digest, loading, fetchDigest]);

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    if (onNavigateToTask) {
      onClose();
      onNavigateToTask(taskId);
    }
  };

  // Handle section navigation
  const handleOverdueClick = () => {
    if (onFilterOverdue) {
      onClose();
      onFilterOverdue();
    }
  };

  const handleTodayClick = () => {
    if (onFilterDueToday) {
      onClose();
      onFilterDueToday();
    }
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-digest-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-[var(--surface)] border border-[var(--border-subtle)]"
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-blue) 0%, #1E3A5F 50%, #0A1628 100%)',
                }}
              />

              <div className="relative px-5 py-6">
                {/* Close button */}
                <button
                  onClick={onClose}
                  aria-label="Close daily digest"
                  className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A227]/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <h2 id="daily-digest-title" className="text-xl font-bold text-white">
                      Daily Digest
                    </h2>
                    <p className="text-white/60 text-sm">AI-powered briefing</p>
                  </div>
                </div>

                {/* Greeting */}
                {loading ? (
                  <div className="h-6 w-48 bg-white/10 rounded animate-pulse mt-3" />
                ) : digest ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white/90 text-sm mt-3"
                  >
                    {digest.greeting}
                  </motion.p>
                ) : null}
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-5 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Error state */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">Unable to load digest</p>
                    <p className="text-xs text-red-500/90 mt-1">{error}</p>
                    <button
                      onClick={fetchDigest}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try again
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Loading state */}
              {loading && !error && (
                <div className="space-y-6">
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-[var(--surface-3)] rounded animate-pulse" />
                      <div className="h-4 w-24 bg-[var(--surface-3)] rounded animate-pulse" />
                    </div>
                    <SkeletonSection lines={2} />
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-[var(--surface-3)] rounded animate-pulse" />
                      <div className="h-4 w-24 bg-[var(--surface-3)] rounded animate-pulse" />
                    </div>
                    <SkeletonSection lines={3} />
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-[var(--surface-3)] rounded animate-pulse" />
                      <div className="h-4 w-24 bg-[var(--surface-3)] rounded animate-pulse" />
                    </div>
                    <SkeletonSection lines={2} />
                  </div>
                </div>
              )}

              {/* Digest content */}
              {digest && !loading && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-5"
                >
                  {/* Overdue Tasks Section */}
                  {digest.overdueTasks.count > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-xl p-4 bg-red-500/10 border border-red-500/30"
                    >
                      <button
                        onClick={handleOverdueClick}
                        aria-label={`View all ${digest.overdueTasks.count} overdue tasks`}
                        className="w-full flex items-center justify-between mb-3 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />
                          <h3 className="text-sm font-semibold text-red-400">
                            Overdue Tasks ({digest.overdueTasks.count})
                          </h3>
                        </div>
                        <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                      </button>
                      <p className="text-sm text-red-300/80 mb-3">{digest.overdueTasks.summary}</p>
                      <div className="space-y-2">
                        {digest.overdueTasks.tasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => handleTaskClick(task.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                            <span className="flex-1 text-sm text-red-200 truncate">{task.text}</span>
                            {task.due_date && (
                              <span className="text-xs text-red-400/70 flex-shrink-0">
                                {formatDueDate(task.due_date)}
                              </span>
                            )}
                          </button>
                        ))}
                        {digest.overdueTasks.count > 3 && (
                          <button
                            onClick={handleOverdueClick}
                            className="w-full text-center py-2 text-xs text-red-400 hover:text-red-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            +{digest.overdueTasks.count - 3} more overdue
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Today's Tasks Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"
                  >
                    <button
                      onClick={handleTodayClick}
                      aria-label={`View all ${digest.todaysTasks.count} tasks due today`}
                      className="w-full flex items-center justify-between mb-3 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[var(--brand-blue)]" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                          Today&apos;s Tasks ({digest.todaysTasks.count})
                        </h3>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </button>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{digest.todaysTasks.summary}</p>
                    {digest.todaysTasks.count > 0 ? (
                      <div className="space-y-2">
                        {digest.todaysTasks.tasks.slice(0, 4).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => handleTaskClick(task.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-3)] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                            <span className="flex-1 text-sm text-[var(--foreground)] truncate">{task.text}</span>
                            {task.subtasks_count > 0 && (
                              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                                {task.subtasks_completed}/{task.subtasks_count}
                              </span>
                            )}
                          </button>
                        ))}
                        {digest.todaysTasks.count > 4 && (
                          <button
                            onClick={handleTodayClick}
                            className="w-full text-center py-2 text-xs text-[var(--accent)] hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            +{digest.todaysTasks.count - 4} more today
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                        <span className="text-sm text-[var(--text-secondary)]">No tasks due today</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Team Activity Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-[#C9A227]" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">Team Activity</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{digest.teamActivity.summary}</p>
                    {digest.teamActivity.highlights.length > 0 && (
                      <ul className="space-y-2" aria-label="Team activity highlights">
                        {digest.teamActivity.highlights.map((highlight, index) => (
                          <li
                            key={`highlight-${index}-${highlight.substring(0, 20)}`}
                            className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                          >
                            <span className="text-[#C9A227] mt-0.5" aria-hidden="true">-</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>

                  {/* Focus Suggestion Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl p-4 bg-gradient-to-br from-[var(--brand-blue)]/10 to-[#C9A227]/10 border border-[var(--brand-blue)]/30"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-[var(--brand-blue)]" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">Today&apos;s Focus</h3>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[var(--foreground)]">{digest.focusSuggestion}</p>
                    </div>
                  </motion.div>

                  {/* Generated timestamp */}
                  <p className="text-xs text-[var(--text-muted)] text-center pt-2">
                    Generated at{' '}
                    {new Date(digest.generatedAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    <button
                      onClick={fetchDigest}
                      className="ml-2 text-[var(--accent)] hover:underline inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer with action button */}
            <div className="px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-2)]">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-[var(--brand-blue)] text-white font-semibold hover:bg-[var(--brand-blue)]/90 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]"
              >
                <Clock className="w-4 h-4" />
                Let&apos;s Get Started
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
