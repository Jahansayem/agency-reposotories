'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  X,
  Activity,
  Clock,
  User,
  CheckCircle2,
  Circle,
  ArrowRight,
  Flag,
  Calendar,
  StickyNote,
  ListTodo,
  Trash2,
  RefreshCw,
  Paperclip,
  GitMerge,
  BellRing,
  Settings,
  ChevronRight,
  ExternalLink,
  Building,
  UserPlus,
  UserMinus,
  Shield,
} from 'lucide-react';
import { ActivityLogEntry, ActivityAction, PRIORITY_CONFIG } from '@/types/todo';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';
import { useTheme } from '@/contexts/ThemeContext';

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION MODAL - Facebook-style notification dropdown
// Shows recent activity with clickable items to navigate to related tasks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Humanize status strings for display
 * Converts internal values like 'in_progress' to 'In Progress'
 */
function humanizeStatus(status: string | undefined): string {
  if (!status) return '';
  const statusMap: Record<string, string> = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'done': 'Done',
    'not_started': 'Not Started',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Humanize priority strings for display
 */
function humanizePriority(priority: string | undefined): string {
  if (!priority) return '';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

interface NotificationModalProps {
  currentUserName: string;
  isOpen: boolean;
  onClose: () => void;
  onActivityClick?: (activity: ActivityLogEntry) => void;
  onMarkAllRead?: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
  onViewAllActivity?: () => void;
}

/**
 * Action configuration using semantic color tokens from design system.
 * Colors use CSS variables for consistent light/dark mode support.
 * @see src/lib/design-tokens.ts for ACTION_COLORS definitions
 */
const ACTION_CONFIG: Record<ActivityAction, { icon: React.ElementType; label: string; color: string; verb: string }> = {
  task_created: { icon: Circle, label: 'created task', color: 'var(--success-vivid)', verb: 'created' },
  task_updated: { icon: RefreshCw, label: 'updated task', color: 'var(--accent-vivid)', verb: 'updated' },
  task_deleted: { icon: Trash2, label: 'deleted task', color: 'var(--danger)', verb: 'deleted' },
  task_completed: { icon: CheckCircle2, label: 'completed task', color: 'var(--success-vivid)', verb: 'completed' },
  task_reopened: { icon: Circle, label: 'reopened task', color: 'var(--warning)', verb: 'reopened' },
  status_changed: { icon: ArrowRight, label: 'changed status', color: 'var(--state-info)', verb: 'moved' },
  priority_changed: { icon: Flag, label: 'changed priority', color: 'var(--warning)', verb: 'reprioritized' },
  assigned_to_changed: { icon: User, label: 'reassigned task', color: 'var(--accent-vivid)', verb: 'assigned' },
  due_date_changed: { icon: Calendar, label: 'updated due date', color: 'var(--accent-vivid)', verb: 'rescheduled' },
  subtask_added: { icon: ListTodo, label: 'added subtask', color: 'var(--success-vivid)', verb: 'added subtask to' },
  subtask_completed: { icon: CheckCircle2, label: 'completed subtask', color: 'var(--success-vivid)', verb: 'completed subtask in' },
  subtask_deleted: { icon: Trash2, label: 'removed subtask', color: 'var(--danger)', verb: 'removed subtask from' },
  notes_updated: { icon: StickyNote, label: 'updated notes', color: 'var(--state-info)', verb: 'noted on' },
  template_created: { icon: Activity, label: 'created template', color: 'var(--success-vivid)', verb: 'created template' },
  template_used: { icon: Activity, label: 'used template', color: 'var(--accent-vivid)', verb: 'used template on' },
  attachment_added: { icon: Paperclip, label: 'added attachment', color: 'var(--success-vivid)', verb: 'attached to' },
  attachment_removed: { icon: Paperclip, label: 'removed attachment', color: 'var(--danger)', verb: 'removed attachment from' },
  tasks_merged: { icon: GitMerge, label: 'merged tasks', color: 'var(--accent)', verb: 'merged' },
  reminder_added: { icon: Bell, label: 'added reminder', color: 'var(--state-info)', verb: 'set reminder for' },
  reminder_removed: { icon: BellOff, label: 'removed reminder', color: 'var(--danger)', verb: 'removed reminder from' },
  reminder_sent: { icon: BellRing, label: 'sent reminder', color: 'var(--success-vivid)', verb: 'reminder sent for' },
  marked_waiting: { icon: Clock, label: 'marked waiting', color: 'var(--state-info)', verb: 'waiting for response on' },
  customer_responded: { icon: CheckCircle2, label: 'customer responded', color: 'var(--success-vivid)', verb: 'got response on' },
  follow_up_overdue: { icon: Bell, label: 'follow-up overdue', color: 'var(--danger)', verb: 'needs follow-up on' },
  task_reordered: { icon: RefreshCw, label: 'reordered task', color: 'var(--accent-vivid)', verb: 'reordered' },
  agency_created: { icon: Building, label: 'created agency', color: 'var(--success-vivid)', verb: 'created' },
  member_added: { icon: UserPlus, label: 'added member', color: 'var(--success-vivid)', verb: 'added' },
  member_removed: { icon: UserMinus, label: 'removed member', color: 'var(--danger)', verb: 'removed' },
  member_role_changed: { icon: Shield, label: 'changed member role', color: 'var(--warning)', verb: 'changed role for' },
  member_permissions_changed: { icon: Settings, label: 'updated permissions', color: 'var(--state-info)', verb: 'updated permissions for' },
  member_role_and_permissions_changed: { icon: Shield, label: 'updated role and permissions', color: 'var(--warning)', verb: 'updated' },
  customer_import: { icon: User, label: 'imported customers', color: 'var(--success-vivid)', verb: 'imported' },
};

// Local storage key for last seen notification
const LAST_SEEN_KEY = 'notificationLastSeenAt';

export default function NotificationModal({
  currentUserName,
  isOpen,
  onClose,
  onActivityClick,
  onMarkAllRead,
  anchorRef,
  onViewAllActivity,
}: NotificationModalProps) {
  const { theme } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  // Load last seen timestamp
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_SEEN_KEY);
      if (stored) {
        setLastSeenAt(stored);
      }
    }
  }, []);

  // Fetch recent activities when modal opens
  const fetchActivities = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/activity?userName=${encodeURIComponent(currentUserName)}&limit=30&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      logger.error('Failed to fetch notifications', err, { component: 'NotificationModal' });
      setError('Unable to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, currentUserName]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Mark all as read when modal transitions from open to closed
  useEffect(() => {
    if (wasOpenRef.current && !isOpen && activities.length > 0) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeenAt(now);
      onMarkAllRead?.();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, activities.length, onMarkAllRead]);

  // Subscribe to real-time updates with debounce to prevent overlapping channels
  useEffect(() => {
    if (!isOpen) {
      // Clean up channel when modal closes
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Prevent creating duplicate channel if one already exists
    if (channelRef.current) {
      return;
    }

    // Small debounce to prevent rapid open/close creating multiple channels
    const debounceTimer = setTimeout(() => {
      // Double-check modal is still open and no channel exists
      if (!isOpen || channelRef.current) return;

      const channel = supabase
        .channel(`notification-modal-${currentUserName}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
          },
          (payload) => {
            const newActivity = payload.new as ActivityLogEntry;
            setActivities((prev) => [newActivity, ...prev].slice(0, 30));
          }
        )
        .subscribe();

      channelRef.current = channel;
    }, 100);

    return () => {
      clearTimeout(debounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isOpen, currentUserName]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Check if activity is unread (happened after last seen)
  const isUnread = useCallback(
    (activity: ActivityLogEntry) => {
      if (!lastSeenAt) return true;
      return new Date(activity.created_at) > new Date(lastSeenAt);
    },
    [lastSeenAt]
  );

  // Count unread
  const unreadCount = useMemo(() => {
    return activities.filter(isUnread).length;
  }, [activities, isUnread]);

  // Handle activity click
  const handleActivityClick = (activity: ActivityLogEntry) => {
    onActivityClick?.(activity);
    onClose();
  };

  // Handle mark all as read button click
  const handleMarkAllReadClick = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, now);
    setLastSeenAt(now);
    onMarkAllRead?.();
  }, [onMarkAllRead]);

  // Calculate position based on anchor element
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const modalWidth = 380;
      const modalHeight = 520;
      const padding = 16;

      // Position below the bell button
      let top = rect.bottom + 8;
      let left = rect.left;

      // Ensure modal doesn't go off-screen to the right
      if (left + modalWidth > window.innerWidth - padding) {
        left = window.innerWidth - modalWidth - padding;
      }

      // Ensure modal doesn't go off-screen to the left
      if (left < padding) {
        left = padding;
      }

      // Ensure modal doesn't go off-screen at the bottom
      if (top + modalHeight > window.innerHeight - padding) {
        // Position above the button instead
        top = rect.top - modalHeight - 8;
        if (top < padding) {
          top = padding;
        }
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, anchorRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
          }}
          className={`
            z-[100] w-[380px] max-h-[520px] rounded-[var(--radius-xl)] overflow-hidden
            shadow-2xl border
            ${'bg-[var(--surface)] border-[var(--border)]'}
          `}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-4 py-3 border-b
            ${'border-[var(--border)]'}
          `}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[var(--accent)]" />
              <h2 className={`font-semibold ${'text-[var(--foreground)]'}`}>
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllReadClick}
                  className={`
                    px-2.5 py-1.5 rounded-[var(--radius-lg)] text-xs font-medium transition-colors
                    ${'text-[var(--accent)] hover:bg-[var(--accent-light)]'}
                  `}
                  aria-label="Mark all notifications as read"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={onClose}
                className={`
                  p-1.5 rounded-[var(--radius-lg)] transition-colors
                  ${'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                `}
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[420px]">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto border-[var(--accent)]" />
                <p className="mt-3 text-sm text-[var(--text-muted)]">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-50 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={fetchActivities}
                  className={`
                    mt-3 px-4 py-2 text-sm rounded-[var(--radius-lg)] transition-colors
                    ${'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)]'}
                  `}
                >
                  Try Again
                </button>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-10 text-center">
                <motion.div
                  className={`w-16 h-16 mx-auto mb-4 rounded-[var(--radius-2xl)] flex items-center justify-center ${
                    'bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200'}`}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <BellRing className={`w-8 h-8 ${'text-slate-400'}`} />
                </motion.div>
                <p className={`font-semibold text-base ${'text-slate-700'}`}>
                  No notifications yet
                </p>
                <p className={`text-sm mt-2 max-w-[200px] mx-auto ${'text-slate-500'}`}>
                  When there is activity on your tasks, you will be notified here
                </p>
              </div>
            ) : (
              <div>
                {activities.map((activity) => (
                  <NotificationItem
                    key={activity.id}
                    activity={activity}
                    isUnread={isUnread(activity)}
                    onClick={() => handleActivityClick(activity)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {activities.length > 0 && (
            <div className={`
              px-4 py-3 border-t text-center
              ${'border-[var(--border)]'}
            `}>
              <button
                onClick={() => {
                  onClose();
                  // Navigate to full activity view
                  onViewAllActivity?.();
                }}
                className={`
                  text-sm font-medium transition-colors
                  ${'text-[var(--accent)] hover:underline'}
                `}
              >
                View all activity
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION ITEM - Individual notification row
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationItemProps {
  activity: ActivityLogEntry;
  isUnread: boolean;
  onClick: () => void;
}

function NotificationItem({ activity, isUnread, onClick }: NotificationItemProps) {
  const config = ACTION_CONFIG[activity.action];
  const Icon = config.icon;
  const details = activity.details as Record<string, string | number | undefined>;

  // Build a more readable notification message
  const getMessage = () => {
    const userName = activity.user_name;
    const taskText = activity.todo_text ? `"${truncateText(activity.todo_text, 40)}"` : '';

    switch (activity.action) {
      case 'task_completed':
        return <><strong>{userName}</strong> completed {taskText}</>;
      case 'task_created':
        return <><strong>{userName}</strong> created {taskText}</>;
      case 'assigned_to_changed':
        return (
          <>
            <strong>{userName}</strong> assigned {taskText} to{' '}
            <strong>{details.to || 'someone'}</strong>
          </>
        );
      case 'status_changed':
        return (
          <>
            <strong>{userName}</strong> moved {taskText} to{' '}
            <span style={{ color: config.color }}>{humanizeStatus(details.to as string)}</span>
          </>
        );
      case 'priority_changed':
        return (
          <>
            <strong>{userName}</strong> changed priority of {taskText} to{' '}
            <span style={{ color: PRIORITY_CONFIG[details.to as keyof typeof PRIORITY_CONFIG]?.color }}>
              {humanizePriority(details.to as string)}
            </span>
          </>
        );
      case 'subtask_completed':
        return (
          <>
            <strong>{userName}</strong> completed subtask in {taskText}
          </>
        );
      default:
        return <><strong>{userName}</strong> {config.label} {taskText}</>;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        ${isUnread
          ? 'bg-[var(--accent-light)]/50 hover:bg-[var(--accent-light)]': 'hover:bg-[var(--surface-2)]'}
      `}
    >
      {/* Icon with colored background */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${'text-[var(--foreground)]'}`}>
          {getMessage()}
        </p>

        <div className={`flex items-center gap-2 mt-1 text-xs ${'text-[var(--text-muted)]'}`}>
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </div>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0 mt-2" />
      )}

      {/* Chevron for clickable hint */}
      <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-2 ${'text-[var(--text-light)]'}`} />
    </button>
  );
}

// Helper to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION BELL BUTTON - Use this in the navigation
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isActive: boolean;
}

export function NotificationBell({ unreadCount, onClick, isActive }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-[var(--radius-xl)] transition-colors
        ${isActive
          ? 'bg-[var(--accent-light)] text-[var(--accent)]': 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
      `}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />

      {/* Badge */}
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-badge bg-[var(--danger)] text-white"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
}
