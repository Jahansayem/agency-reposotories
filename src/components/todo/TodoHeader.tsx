'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { LayoutList, LayoutGrid, Bell, Search, X, Filter, RotateCcw, Plus, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthUser, ViewMode, ActivityLogEntry } from '@/types/todo';
import UserSwitcher from '../UserSwitcher';
import FocusModeToggle from '../FocusModeToggle';
import NotificationModal from '../NotificationModal';
import { useTodoStore } from '@/store/todoStore';
import { useAppShell } from '../layout/AppShell';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED TODO HEADER - Single header row with integrated search
// Layout:
// - Left side: View toggle (List/Board), Search field, Focus mode toggle
// - Right side: Filter toggle, Reset, Notifications bell, User switcher
//
// NOTE: Weekly Progress and Keyboard Shortcuts are now in NavigationSidebar
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
  const { theme, toggleTheme } = useTheme();

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
      <div className="mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left side: View toggle, Search & Focus mode toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            {/* View toggle - hidden in focus mode */}
            {!focusMode && (
              <div
                className={`flex backdrop-blur-sm rounded-[var(--radius-lg)] p-0.5 border flex-shrink-0 ${
                  'bg-[var(--surface-2)] border-[var(--border)]'}`}
              >
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 ${
                    viewMode === 'kanban'
                      ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
                  aria-pressed={viewMode === 'kanban'}
                  aria-label="Board view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </button>
              </div>
            )}

            {/* Integrated Search Field - hidden in focus mode */}
            {/* Uses local state for instant keystroke feedback; store update is debounced */}
            {!focusMode && (
              <div className="relative flex items-center flex-1 max-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-light)] pointer-events-none" />
                <input
                  type="text"
                  value={localSearchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-[var(--radius-md)] border transition-colors ${
                    'bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:border-[var(--accent)]/50'} focus:outline-none`}
                />
                {localSearchInput && (
                  <button
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Focus Mode Toggle - always visible */}
            <FocusModeToggle />
          </div>

          {/* Right side: Notifications, User switcher & Menu - hidden in focus mode */}
          {!focusMode && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {onAddTask && (
                <button
                  onClick={onAddTask}
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] text-xs sm:text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 active:scale-[0.98] transition-all shadow-sm"
                  aria-label="Add a new task"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Task</span>
                </button>
              )}

              {/* Notification Bell - Top right like Facebook/LinkedIn */}
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  onClick={() => setNotificationModalOpen(!notificationModalOpen)}
                  className={`
                    relative p-1.5 sm:p-2 rounded-[var(--radius-lg)] transition-colors
                    ${notificationModalOpen
                      ? 'bg-[var(--accent-light)] text-[var(--accent)]': 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                  `}
                  aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadNotifications > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center px-1 rounded-full text-[9px] font-bold bg-[var(--danger)] text-white"
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

              {/* Filter Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`
                  p-1.5 sm:p-2 rounded-[var(--radius-lg)] transition-colors
                  ${showAdvancedFilters
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]': 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                `}
                aria-label={showAdvancedFilters ? 'Hide filters' : 'Show filters'}
                aria-pressed={showAdvancedFilters}
                title="Toggle Filters"
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Reset Filters */}
              <button
                onClick={onResetFilters}
                className={`
                  p-1.5 sm:p-2 rounded-[var(--radius-lg)] transition-colors
                  ${'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                `}
                aria-label="Reset all filters"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`
                  p-1.5 sm:p-2 rounded-[var(--radius-lg)] transition-colors
                  text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                `}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <UserSwitcher currentUser={currentUser} onUserChange={onUserChange} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(TodoHeader);
