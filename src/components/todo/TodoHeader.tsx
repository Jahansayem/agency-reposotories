'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { LayoutList, LayoutGrid, Bell, Search, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthUser, ViewMode, ActivityLogEntry } from '@/types/todo';
import NotificationModal from '../NotificationModal';
import { UserMenu } from '../UserMenu';
import { useTodoStore } from '@/store/todoStore';
import { useAppShell } from '../layout/AppShell';
import { supabase } from '@/lib/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════
// SIMPLIFIED TODO HEADER - UX Improvement (Feb 2026)
// Layout:
// - Left side: View toggle (List/Board), Search field (expanded)
// - Right side: New Task (primary CTA), Notifications bell, User menu
//
// Removed clutter (moved to UserMenu or removed):
// - Theme toggle → UserMenu
// - Focus mode toggle → UserMenu
// - Filter toggle → Removed (duplicates TodoFiltersBar)
// - Reset button → Removed (duplicates TodoFiltersBar)
//
// Goal: Reduce from 11 actions to 5 actions for clearer hierarchy
// ═══════════════════════════════════════════════════════════════════════════

interface TodoHeaderProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onAddTask?: () => void;
  // Search integration
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Filter controls
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  onResetFilters: () => void;
}

// Local storage key for last seen notification
const LAST_SEEN_KEY = 'notificationLastSeenAt';

function TodoHeader({
  currentUser,
  onUserChange,
  viewMode,
  setViewMode,
  onAddTask,
  searchQuery,
  setSearchQuery,
  showAdvancedFilters,
  setShowAdvancedFilters,
  onResetFilters,
}: TodoHeaderProps) {
  const { focusMode } = useTodoStore((state) => state.ui);
  const { setActiveView } = useAppShell();

  // ── Debounced search input ────────────────────────────────────────────
  // Local state gives instant keystroke feedback.
  // The actual Zustand store update is debounced by 300 ms so filtering
  // doesn't run on every character typed.
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local input when the store query is cleared externally
  useEffect(() => {
    if (searchQuery === '' && localSearchInput !== '') {
      setLocalSearchInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, [setSearchQuery]);

  const handleSearchClear = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setLocalSearchInput('');
    setSearchQuery('');
  }, [setSearchQuery]);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // Notification state
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

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

  // Update unread count on mount
  useEffect(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Subscribe to real-time activity updates for badge count
  useEffect(() => {
    const channel = supabase
      .channel('notification-badge-header')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        (payload) => {
          const newActivity = payload.new as ActivityLogEntry;
          // Only increment if from another user and modal is closed
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
    // If there's a related todo, navigate to tasks and highlight it
    if (activity.todo_id) {
      setActiveView('tasks');
      // Small delay to ensure view switches, then scroll to task
      setTimeout(() => {
        const taskElement = document.getElementById(`todo-${activity.todo_id}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add animated highlight class
          taskElement.classList.add('notification-highlight');
          // Remove the class after animation completes
          setTimeout(() => {
            taskElement.classList.remove('notification-highlight');
          }, 3000);
        }
      }, 150);
    } else {
      // Otherwise go to full activity view
      setActiveView('activity');
    }
  }, [setActiveView]);

  // Mark notifications as read when modal closes
  const handleMarkAllRead = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        'bg-[var(--surface)] border-[var(--border)]'}`}
    >
      <div className="mx-auto px-4 max-w-7xl">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Left side: View toggle & Search (expanded) */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* View toggle - hidden in focus mode */}
            {!focusMode && (
              <div
                role="group"
                aria-label="View mode toggle"
                className={`flex backdrop-blur-sm rounded-[var(--radius-lg)] p-0.5 border flex-shrink-0 ${
                  'bg-[var(--surface-2)] border-[var(--border)]'}`}
              >
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 ${
                    viewMode === 'list'
                      ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
                  aria-pressed={viewMode === 'list'}
                  aria-label="Switch to list view"
                >
                  <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 ${
                    viewMode === 'kanban'
                      ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
                  aria-pressed={viewMode === 'kanban'}
                  aria-label="Switch to board view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Board</span>
                </button>
              </div>
            )}

            {/* Integrated Search Field - hidden in focus mode, expanded to use available space */}
            {/* Uses local state for instant keystroke feedback; store update is debounced */}
            {!focusMode && (
              <div className="relative flex items-center flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-light)] pointer-events-none" />
                <input
                  type="text"
                  value={localSearchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  data-testid="search-input"
                  className={`w-full h-10 pl-10 pr-9 text-sm rounded-lg border transition-colors ${
                    'bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'} focus:outline-none`}
                />
                {localSearchInput && (
                  <button
                    onClick={handleSearchClear}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right side: New Task (primary), Notifications, User Menu - hidden in focus mode */}
          {!focusMode && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* New Task Button - Primary CTA with 3-tier hierarchy */}
              {onAddTask && (
                <button
                  onClick={onAddTask}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                  aria-label="Create new task"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">New Task</span>
                </button>
              )}

              {/* Notification Bell - Secondary action */}
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
                  aria-label={`View notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={notificationModalOpen}
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  {unreadNotifications > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
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

              {/* User Menu - Replaces UserSwitcher, theme, and focus mode */}
              <UserMenu
                currentUser={currentUser}
                onUserChange={onUserChange}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(TodoHeader);
