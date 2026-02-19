'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Bell, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AuthUser, ActivityLogEntry } from '@/types/todo';
import { useAppBar } from './AppBarContext';
import { useAppShell } from './AppShell';
import { UserMenu } from '@/components/UserMenu';
import NotificationModal from '@/components/NotificationModal';
import { EAgentExportPanel } from '@/components/eAgent/EAgentExportPanel';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import { zClass } from '@/lib/z-index';
import { useEAgentQueueStore, selectPendingCount } from '@/store/eAgentQueueStore';

interface UnifiedAppBarProps {
  currentUser: AuthUser;
  onUserChange?: (user: AuthUser | null) => void;
}

const LAST_SEEN_KEY = 'notificationLastSeenAt';

export default function UnifiedAppBar({
  currentUser,
  onUserChange,
}: UnifiedAppBarProps) {
  const { content } = useAppBar();
  const { triggerNewTask, setActiveView } = useAppShell();
  const { focusMode } = useTodoStore((state) => state.ui);
  const prefersReducedMotion = useReducedMotion();

  // Notification state
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // eAgent queue state
  const [eAgentPanelOpen, setEAgentPanelOpen] = useState(false);
  const eAgentPendingCount = useEAgentQueueStore(selectPendingCount);

  // Calculate unread notifications count
  const updateUnreadCount = useCallback(() => {
    if (typeof window === 'undefined') return;

    const lastSeenStr = localStorage.getItem(LAST_SEEN_KEY);
    const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0);

    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('activity_log')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastSeen.toISOString())
          .neq('user_name', currentUser.name);

        if (!error && count !== null) {
          setUnreadNotifications(count);
        }
      } catch {
        // Silently fail - not critical
      }
    };

    fetchCount();
  }, [currentUser.name]);

  // Update count on mount
  useEffect(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Subscribe to real-time activity updates for badge count
  useEffect(() => {
    const channel = supabase
      .channel('notification-badge-appbar')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        (payload) => {
          const newActivity = payload.new as ActivityLogEntry;
          if (newActivity.user_name !== currentUser.name && !notificationModalOpen) {
            setUnreadNotifications(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.name, notificationModalOpen]);

  // Handle notification click - navigate to task or activity view
  const handleNotificationClick = useCallback((activity: ActivityLogEntry) => {
    if (activity.todo_id) {
      setActiveView('tasks');
      setTimeout(() => {
        const taskElement = document.getElementById(`todo-${activity.todo_id}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskElement.classList.add('notification-highlight');
          setTimeout(() => {
            taskElement.classList.remove('notification-highlight');
          }, 3000);
        }
      }, 150);
    } else {
      setActiveView('activity');
    }
  }, [setActiveView]);

  const handleMarkAllRead = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const handleNewTask = () => {
    setActiveView('tasks');
    triggerNewTask();
  };

  // Hide in focus mode
  if (focusMode) {
    return null;
  }

  return (
    <>
      <header className={`h-16 border-b bg-[var(--surface)] border-[var(--border)] flex-shrink-0 ${zClass.sticky}`}>
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Center: View-specific content from context */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            {content}
          </div>

          {/* Right: Fixed global actions */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* New Task button */}
            <button
              onClick={handleNewTask}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="Create new task"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Task</span>
            </button>

            {/* eAgent queue badge */}
            <button
              onClick={() => setEAgentPanelOpen(!eAgentPanelOpen)}
              className={`
                relative p-2.5 rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2
                ${eAgentPanelOpen
                  ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
              `}
              aria-label={`Log to eAgent${eAgentPendingCount > 0 ? ` (${eAgentPendingCount} pending)` : ''}`}
              aria-haspopup="dialog"
              aria-expanded={eAgentPanelOpen}
            >
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
              {eAgentPendingCount > 0 && (
                <motion.span
                  initial={prefersReducedMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-badge bg-[var(--accent)] text-white"
                  aria-label={`${eAgentPendingCount} tasks to log`}
                >
                  {eAgentPendingCount > 99 ? '99+' : eAgentPendingCount}
                </motion.span>
              )}
            </button>

            {/* Notifications bell */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setNotificationModalOpen(!notificationModalOpen)}
                className={`
                  relative p-2.5 rounded-lg transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2
                  ${notificationModalOpen
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                `}
                aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
                aria-haspopup="dialog"
                aria-expanded={notificationModalOpen}
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                <span role="status" aria-live="polite" className="sr-only">
                  {unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : ''}
                </span>
                {unreadNotifications > 0 && (
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-badge bg-[var(--danger)] text-white"
                    aria-label={`${unreadNotifications} unread notifications`}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </motion.span>
                )}
              </button>

              {/* Notification Modal */}
              <NotificationModal
                currentUserName={currentUser.name}
                isOpen={notificationModalOpen}
                onClose={() => setNotificationModalOpen(false)}
                onActivityClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
                anchorRef={notificationButtonRef}
                onViewAllActivity={() => setActiveView('activity')}
              />
            </div>

            {/* User menu */}
            {onUserChange && (
              <UserMenu currentUser={currentUser} onUserChange={onUserChange} />
            )}
          </div>
        </div>
      </header>

      {/* eAgent Export Panel */}
      <EAgentExportPanel
        isOpen={eAgentPanelOpen}
        onClose={() => setEAgentPanelOpen(false)}
      />
    </>
  );
}
