'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { shouldShowDailyDashboard, markDailyDashboardShown } from '@/lib/dashboardUtils';
import { ChatPanelSkeleton, AIInboxSkeleton, WeeklyProgressChartSkeleton, DashboardModalSkeleton } from './LoadingSkeletons';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthUser, QuickFilter, Todo } from '@/types/todo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { AppShell, useAppShell, type ActiveView } from './layout';
import { useTodoStore } from '@/store/todoStore';
import { useTodoData } from '@/hooks';
import { usePermission } from '@/hooks/usePermission';
import { ErrorBoundary } from './ErrorBoundary';
import { useAgency } from '@/contexts/AgencyContext';
import NotificationPermissionBanner from './NotificationPermissionBanner';
import SyncStatusIndicator from './SyncStatusIndicator';
import SkipLink from './SkipLink';
import { OnboardingModal } from './AIOnboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AIPreferencesModal } from './AIPreferences';

// Lazy load TodoList - large component with subtasks, kanban, etc.
const TodoList = dynamic(() => import('./TodoList'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>,
});

// Lazy load ChatView for the dedicated messages view
const ChatView = dynamic(() => import('./views/ChatView'), {
  ssr: false,
  loading: () => <ChatPanelSkeleton />,
});

// Lazy load AIInbox for the AI-derived items review
const AIInbox = dynamic(() => import('./views/AIInbox'), {
  ssr: false,
  loading: () => <AIInboxSkeleton />,
});

// Lazy load DashboardPage for the full dashboard view
const DashboardPage = dynamic(() => import('./views/DashboardPage'), {
  ssr: false,
  loading: () => <DashboardModalSkeleton />,
});

// Lazy load AnalyticsPage for the book of business analytics view
const AnalyticsPage = dynamic(() => import('./views/AnalyticsPage'), {
  ssr: false,
  loading: () => <DashboardModalSkeleton />,
});

// Lazy load CalendarView for the standalone calendar page
const CalendarView = dynamic(() => import('./calendar/CalendarView'), {
  ssr: false,
  loading: () => <DashboardModalSkeleton />,
});

// Lazy load CustomerLookupView for the customer book of business browser
const CustomerLookupView = dynamic(() => import('./views/CustomerLookupView'), {
  ssr: false,
  loading: () => <DashboardModalSkeleton />,
});

// Lazy load WeeklyProgressChart modal (accessible from any view via sidebar)
const WeeklyProgressChart = dynamic(() => import('./WeeklyProgressChart'), {
  ssr: false,
  loading: () => <WeeklyProgressChartSkeleton />,
});

// Lazy load KeyboardShortcutsModal (accessible from any view via sidebar)
const KeyboardShortcutsModal = dynamic(() => import('./KeyboardShortcutsModal'), {
  ssr: false,
  loading: () => null,
});

// Lazy load ArchiveView for the archive browser
const ArchiveView = dynamic(() => import('./ArchiveView'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>,
});

// Lazy load AddTaskModal for calendar click-to-create
const AddTaskModal = dynamic(() => import('./AddTaskModal'), {
  ssr: false,
  loading: () => null,
});

interface MainAppProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
}

/**
 * MainAppContent - Inner component that uses AppShell context
 */
function MainAppContent({ currentUser, onUserChange }: MainAppProps) {
  const {
    activeView,
    setActiveView,
    onNewTaskTrigger,
    showWeeklyChart,
    closeWeeklyChart,
    showShortcuts,
    closeShortcuts,
  } = useAppShell();
  const { theme } = useTheme();
  const { currentAgencyId, isSwitchingAgency, currentAgency, agencies } = useAgency();

  // Permission checks for restricted views
  const canViewStrategicGoals = usePermission('can_view_strategic_goals');
  const canViewArchive = usePermission('can_view_archive');

  // Redirect to tasks view if user navigates to a restricted view without permission
  useEffect(() => {
    if (activeView === 'goals' && !canViewStrategicGoals) {
      setActiveView('tasks');
    }
    if (activeView === 'archive' && !canViewArchive) {
      setActiveView('tasks');
    }
  }, [activeView, canViewStrategicGoals, canViewArchive, setActiveView]);

  // Agency key forces full remount of view components on agency switch (H7 fix)
  const agencyKey = currentAgencyId || 'default';

  // Kick off data fetching & real-time subscriptions so the Zustand store
  // gets populated. This must run here (not only in TodoList) because
  // MainApp reads `loading` from the store to decide whether to show
  // the spinner — if useTodoData never runs, loading stays true forever.
  useTodoData(currentUser);

  const todos = useTodoStore((state) => state.todos);
  const loading = useTodoStore((state) => state.loading);
  const usersWithColors = useTodoStore((state) => state.usersWithColors);
  const users = useTodoStore((state) => state.users);

  const [initialFilter, setInitialFilter] = useState<QuickFilter | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [hasCheckedDailyDashboard, setHasCheckedDailyDashboard] = useState(false);
  // Track which task to auto-expand when navigating from dashboard/notifications
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Track initial sort option when navigating to customer lookup
  const [customerInitialSort, setCustomerInitialSort] = useState<'priority' | 'renewal_date'>('priority');
  // Track previous view for back-navigation (e.g., customers → analytics)
  const previousViewRef = useRef<ActiveView | null>(null);

  // AI Onboarding state
  const {
    shouldShowOnboarding,
    startOnboarding,
    dismissOnboarding,
    skipOnboarding,
  } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // AI Preferences state
  const [showAIPreferences, setShowAIPreferences] = useState(false);

  // Calendar click-to-create state
  const [calendarAddTaskDate, setCalendarAddTaskDate] = useState<string | null>(null);
  const updateTodoInStore = useTodoStore((state) => state.updateTodo);

  // Navigate to dashboard on first login of the day
  // Only check ONCE after initial data load - prevents flash on hard refresh
  useEffect(() => {
    if (!loading && !hasCheckedDailyDashboard) {
      setHasCheckedDailyDashboard(true);
      if (shouldShowDailyDashboard()) {
        markDailyDashboardShown();
        setActiveView('dashboard');
      }
    }
  }, [loading, hasCheckedDailyDashboard, setActiveView]);

  // Show AI onboarding on first visit
  useEffect(() => {
    if (!loading && shouldShowOnboarding()) {
      // Delay showing onboarding slightly to let the app load
      const timer = setTimeout(() => {
        startOnboarding();
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, shouldShowOnboarding, startOnboarding]);

  const handleNavigateToTasks = useCallback((filter?: QuickFilter) => {
    if (filter) {
      setInitialFilter(filter);
    }
    setActiveView('tasks');
  }, [setActiveView]);

  const handleAddTask = useCallback(() => {
    setShowAddTask(true);
    setActiveView('tasks');
  }, [setActiveView]);

  // Reset the add task trigger after modal opens
  const handleAddTaskModalOpened = useCallback(() => {
    setShowAddTask(false);
  }, []);

  // Reset the initial filter after it's applied
  const handleInitialFilterApplied = useCallback(() => {
    setInitialFilter(null);
  }, []);

  // Timer refs for cleanup on unmount
  const taskLinkScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskLinkHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (taskLinkScrollTimerRef.current) clearTimeout(taskLinkScrollTimerRef.current);
      if (taskLinkHighlightTimerRef.current) clearTimeout(taskLinkHighlightTimerRef.current);
    };
  }, []);

  // Handle task link click from chat/dashboard/notifications (navigate to tasks view and open task)
  const handleTaskLinkClick = useCallback((taskId: string) => {
    setActiveView('tasks');
    // Set the selected task ID to trigger auto-expand in TodoItem
    setSelectedTaskId(taskId);
    // Small delay to allow view switch, then scroll to task
    if (taskLinkScrollTimerRef.current) clearTimeout(taskLinkScrollTimerRef.current);
    if (taskLinkHighlightTimerRef.current) clearTimeout(taskLinkHighlightTimerRef.current);
    taskLinkScrollTimerRef.current = setTimeout(() => {
      const taskElement = document.getElementById(`todo-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add animated highlight class
        taskElement.classList.add('notification-highlight');
        // BUGFIX REACT-001: Clear any existing highlight timer before creating new one
        // This prevents orphaned timers if the callback runs during rapid clicks
        if (taskLinkHighlightTimerRef.current) {
          clearTimeout(taskLinkHighlightTimerRef.current);
        }
        // Remove the class after animation completes
        taskLinkHighlightTimerRef.current = setTimeout(() => {
          taskElement.classList.remove('notification-highlight');
        }, 3000);
      }
    }, 150);
  }, [setActiveView]);

  // Clear selected task after it has been expanded
  const handleSelectedTaskHandled = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  // Navigate with back-tracking (remembers where user came from)
  const navigateWithHistory = useCallback((target: ActiveView) => {
    previousViewRef.current = activeView;
    setActiveView(target);
  }, [activeView, setActiveView]);

  // Handle back-navigation (e.g., customers → analytics)
  const handleNavigateBack = useCallback(() => {
    const prev = previousViewRef.current;
    previousViewRef.current = null;
    setActiveView(prev || 'tasks');
  }, [setActiveView]);

  // Handle navigation from CustomerSegmentationDashboard to CustomerLookupView
  const handleNavigateToCustomerSegment = useCallback(() => {
    setCustomerInitialSort('priority');
    navigateWithHistory('customers');
  }, [navigateWithHistory]);

  // Handle navigation from TodayOpportunitiesPanel to CustomerLookupView with renewal date sort
  const handleNavigateToAllOpportunities = useCallback(() => {
    setCustomerInitialSort('renewal_date');
    navigateWithHistory('customers');
  }, [navigateWithHistory]);

  // Handle navigation from Dashboard to Analytics
  const handleNavigateToAnalytics = useCallback(() => {
    navigateWithHistory('analytics');
  }, [navigateWithHistory]);

  // Handle navigation from Dashboard to Customers
  const handleNavigateToCustomers = useCallback(() => {
    setCustomerInitialSort('priority');
    navigateWithHistory('customers');
  }, [navigateWithHistory]);

  // Handle restoring an archived task
  const handleRestoreTask = useCallback(async (taskId: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      // Restore task by marking it as not completed and resetting status
      const { error } = await supabase
        .from('todos')
        .update({
          completed: false,
          status: 'todo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) {
        logger.error('Failed to restore task', error, { component: 'MainApp', taskId });
        throw error;
      }

      // Log the restore action
      await supabase.from('activity_log').insert({
        action: 'restore',
        entity_type: 'todo',
        entity_id: taskId,
        user_name: currentUser.name,
        details: { restored_from: 'archive' },
      });

      logger.info('Task restored from archive', { component: 'MainApp', taskId });
    } catch (error) {
      logger.error('Failed to restore task', error, { component: 'MainApp', taskId });
      throw error;
    }
  }, [currentUser.name]);

  // Handle permanently deleting an archived task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      // Get task info for logging before deletion
      const { data: taskData } = await supabase
        .from('todos')
        .select('text')
        .eq('id', taskId)
        .single();

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', taskId);

      if (error) {
        logger.error('Failed to delete task', error, { component: 'MainApp', taskId });
        throw error;
      }

      // Log the deletion
      await supabase.from('activity_log').insert({
        action: 'permanent_delete',
        entity_type: 'todo',
        entity_id: taskId,
        user_name: currentUser.name,
        details: { task_text: taskData?.text, deleted_from: 'archive' },
      });

      logger.info('Task permanently deleted from archive', { component: 'MainApp', taskId });
    } catch (error) {
      logger.error('Failed to delete task', error, { component: 'MainApp', taskId });
      throw error;
    }
  }, [currentUser.name]);

  // Register the new task trigger callback with AppShell
  useEffect(() => {
    onNewTaskTrigger(() => {
      setShowAddTask(true);
    });
  }, [onNewTaskTrigger]);

  // AI Inbox handlers - extracted to useCallback for memoization
  // NOTE: These must be defined BEFORE any conditional returns to follow Rules of Hooks
  const handleAIAccept = useCallback(async (item: unknown, editedTask: unknown) => {
    // TODO: Implement accept logic - create task from AI suggestion
    logger.debug('Accept AI item', { component: 'MainApp', action: 'handleAIAccept', metadata: { item, editedTask } });
  }, []);

  const handleAIDismiss = useCallback(async (itemId: string) => {
    // TODO: Implement dismiss logic
    logger.debug('Dismiss AI item', { component: 'MainApp', action: 'handleAIDismiss', metadata: { itemId } });
  }, []);

  const handleAIRefresh = useCallback(async () => {
    // TODO: Implement refresh logic - fetch new AI items
    logger.debug('Refresh AI inbox', { component: 'MainApp', action: 'handleAIRefresh' });
  }, []);

  // Calendar: click-to-create opens AddTaskModal with date pre-filled
  const handleCalendarDateClick = useCallback((date: Date) => {
    // Format as YYYY-MM-DD for the date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCalendarAddTaskDate(`${year}-${month}-${day}`);
  }, []);

  // Calendar: drag-and-drop reschedule updates due_date
  const handleCalendarReschedule = useCallback(async (todoId: string, newDate: string) => {
    // Read from store directly to avoid stale closure on rapid successive drags
    const oldTodo = useTodoStore.getState().todos.find((t) => t.id === todoId);
    if (!oldTodo) return;

    // Skip if dropping on the same date
    const oldDateKey = oldTodo.due_date?.split('T')[0];
    if (oldDateKey === newDate) return;

    const updated_at = new Date().toISOString();
    // Optimistic update
    updateTodoInStore(todoId, { due_date: newDate, updated_at });

    const { error } = await supabase
      .from('todos')
      .update({ due_date: newDate, updated_at })
      .eq('id', todoId);

    if (error) {
      logger.error('Calendar reschedule failed', error, { component: 'MainApp' });
      // Revert on error
      updateTodoInStore(todoId, { due_date: oldTodo.due_date, updated_at: oldTodo.updated_at });
    }
  }, [updateTodoInStore]);

  // Calendar: add task from calendar modal
  const handleCalendarAddTask = useCallback(async (
    text: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    dueDate?: string,
    assignedTo?: string,
  ) => {
    if (!text.trim()) return;
    const { v4: uuidv4 } = await import('uuid');
    const newTodo: Todo = {
      id: uuidv4(),
      text: text.trim(),
      completed: false,
      status: 'todo',
      priority,
      created_at: new Date().toISOString(),
      created_by: currentUser.name,
      due_date: dueDate || undefined,
      assigned_to: assignedTo || undefined,
      subtasks: [],
      agency_id: currentAgencyId || undefined,
    };

    useTodoStore.getState().addTodo(newTodo);

    const insertData: Record<string, unknown> = {
      id: newTodo.id,
      text: newTodo.text,
      completed: false,
      status: 'todo',
      priority: newTodo.priority,
      created_at: newTodo.created_at,
      created_by: newTodo.created_by,
    };
    if (newTodo.due_date) insertData.due_date = newTodo.due_date;
    if (newTodo.assigned_to) insertData.assigned_to = newTodo.assigned_to;
    if (currentAgencyId) insertData.agency_id = currentAgencyId;

    const { error } = await supabase.from('todos').insert([insertData]);
    if (error) {
      logger.error('Calendar add task failed', error, { component: 'MainApp' });
      useTodoStore.getState().deleteTodo(newTodo.id);
    }
  }, [currentUser.name, currentAgencyId]);

  const handleArchiveClose = useCallback(() => setActiveView('tasks'), [setActiveView]);
  const handleChatBack = useCallback(() => setActiveView('tasks'), [setActiveView]);

  // Get the agency name being switched to
  // NOTE: Must be defined BEFORE any conditional returns to follow Rules of Hooks
  const switchingToAgencyName = useMemo(() => {
    if (!isSwitchingAgency || !currentAgency) return '';
    return currentAgency.name;
  }, [isSwitchingAgency, currentAgency]);

  // Memoized view rendering to prevent unnecessary re-renders
  // NOTE: Must be defined BEFORE any conditional returns to follow Rules of Hooks
  const activeViewContent = useMemo(() => {
    switch (activeView) {
      case 'dashboard':
        return (
          <ErrorBoundary>
            <DashboardPage
              key={agencyKey}
              currentUser={currentUser}
              todos={todos}
              users={users}
              onNavigateToTasks={handleNavigateToTasks}
              onAddTask={handleAddTask}
              onTaskClick={handleTaskLinkClick}
              onFilterOverdue={() => handleNavigateToTasks('overdue')}
              onFilterDueToday={() => handleNavigateToTasks('due_today')}
              onNavigateToAnalytics={handleNavigateToAnalytics}
              onNavigateToCustomers={handleNavigateToCustomers}
            />
          </ErrorBoundary>
        );

      case 'chat':
        return (
          <ErrorBoundary>
            <ChatView
              key={agencyKey}
              currentUser={currentUser}
              users={usersWithColors}
              onBack={handleChatBack}
              onTaskLinkClick={handleTaskLinkClick}
            />
          </ErrorBoundary>
        );

      case 'activity':
        // Activity feed is handled by TodoList internally
        // Just switch to tasks view for now
        return (
          <ErrorBoundary>
            <TodoList
              key={agencyKey}
              currentUser={currentUser}
              onUserChange={onUserChange}
              initialFilter={initialFilter}
              autoFocusAddTask={showAddTask}
              onAddTaskModalOpened={handleAddTaskModalOpened}
              onInitialFilterApplied={handleInitialFilterApplied}

              selectedTaskId={selectedTaskId}
              onSelectedTaskHandled={handleSelectedTaskHandled}
            />
          </ErrorBoundary>
        );

      case 'goals':
        // Strategic goals requires permission - redirect handled by useEffect
        // This guard prevents any flash of content while redirecting
        if (!canViewStrategicGoals) {
          return null;
        }
        // Strategic goals is handled by TodoList internally
        return (
          <ErrorBoundary>
            <TodoList
              key={agencyKey}
              currentUser={currentUser}
              onUserChange={onUserChange}
              initialFilter={initialFilter}
              autoFocusAddTask={showAddTask}
              onAddTaskModalOpened={handleAddTaskModalOpened}
              onInitialFilterApplied={handleInitialFilterApplied}

              selectedTaskId={selectedTaskId}
              onSelectedTaskHandled={handleSelectedTaskHandled}
            />
          </ErrorBoundary>
        );

      case 'archive':
        // Archive requires permission - redirect handled by useEffect
        // This guard prevents any flash of content while redirecting
        if (!canViewArchive) {
          return null;
        }
        // Full-featured archive browser
        return (
          <ErrorBoundary>
            <ArchiveView
              key={agencyKey}
              currentUser={currentUser}
              users={users}
              onRestore={handleRestoreTask}
              onDelete={handleDeleteTask}
              onClose={handleArchiveClose}
            />
          </ErrorBoundary>
        );

      case 'ai_inbox':
        // AI Inbox view for reviewing AI-derived tasks
        return (
          <ErrorBoundary>
            <AIInbox
              key={agencyKey}
              items={[]} // TODO: Connect to actual AI inbox state from store
              users={usersWithColors.map(u => u.name)}
              onAccept={handleAIAccept}
              onDismiss={handleAIDismiss}
              onRefresh={handleAIRefresh}
            />
          </ErrorBoundary>
        );

      case 'calendar':
        // Standalone calendar view for task scheduling
        return (
          <ErrorBoundary>
            <div className="flex flex-col h-full bg-[var(--background)]">
              <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
                <h1 className="text-xl font-semibold text-[var(--foreground)]">Calendar</h1>
                <p className="text-sm text-[var(--text-muted)]">View tasks by due date</p>
              </div>
              <div className="flex-1 min-h-0">
                <CalendarView
                  key={agencyKey}
                  todos={todos}
                  onTaskClick={(todo) => handleTaskLinkClick(todo.id)}
                  onDateClick={handleCalendarDateClick}
                  onReschedule={handleCalendarReschedule}
                />
              </div>
            </div>
          </ErrorBoundary>
        );

      case 'analytics':
        // Analytics dashboard with book of business insights
        return (
          <ErrorBoundary>
            <AnalyticsPage
              key={agencyKey}
              onNavigateToSegment={handleNavigateToCustomerSegment}
              onNavigateToAllOpportunities={handleNavigateToAllOpportunities}
              onTaskClick={handleTaskLinkClick}
            />
          </ErrorBoundary>
        );

      case 'customers':
        // Customer lookup from book of business
        return (
          <ErrorBoundary>
            <CustomerLookupView
              key={agencyKey}
              agencyId={currentAgencyId || undefined}
              currentUser={currentUser.name}
              onClose={() => setActiveView('tasks')}
              onNavigateBack={handleNavigateBack}
              onTaskClick={handleTaskLinkClick}
              initialSort={customerInitialSort}
            />
          </ErrorBoundary>
        );

      case 'tasks':
      default:
        return (
          <ErrorBoundary>
            <TodoList
              key={agencyKey}
              currentUser={currentUser}
              onUserChange={onUserChange}
              initialFilter={initialFilter}
              autoFocusAddTask={showAddTask}
              onAddTaskModalOpened={handleAddTaskModalOpened}
              onInitialFilterApplied={handleInitialFilterApplied}

              selectedTaskId={selectedTaskId}
              onSelectedTaskHandled={handleSelectedTaskHandled}
            />
          </ErrorBoundary>
        );
    }
  }, [
    activeView,
    agencyKey,
    currentUser,
    todos,
    users,
    usersWithColors,
    initialFilter,
    showAddTask,
    selectedTaskId,
    canViewStrategicGoals,
    canViewArchive,
    customerInitialSort,
    handleNavigateToTasks,
    handleTaskLinkClick,
    handleSelectedTaskHandled,
    handleRestoreTask,
    handleDeleteTask,
    handleAddTaskModalOpened,
    handleInitialFilterApplied,
    handleChatBack,
    handleArchiveClose,
    handleAIAccept,
    handleAIDismiss,
    handleAIRefresh,
    handleNavigateToCustomerSegment,
    handleNavigateToAllOpportunities,
    handleNavigateToAnalytics,
    handleNavigateToCustomers,
    handleNavigateBack,
    handleCalendarDateClick,
    handleCalendarReschedule,
    onUserChange,
    currentAgencyId,
  ]);

  // Loading state - rendered conditionally in JSX to avoid early return before hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <SkipLink />

      <main id="main-content" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-full"
          >
            {activeViewContent}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Agency Switching Overlay */}
      <AnimatePresence>
        {isSwitchingAgency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            role="alert"
            aria-live="polite"
            aria-label="Switching agency"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4"
            >
              {/* Spinner */}
              <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />

              {/* Text */}
              <div className="text-center">
                <p className="text-lg font-semibold text-[var(--foreground)] mb-1">
                  Switching Agency
                </p>
                {switchingToAgencyName && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Loading {switchingToAgencyName}...
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Push notification permission banner */}
      <NotificationPermissionBanner currentUser={currentUser} />

      {/* Weekly Progress Chart Modal - accessible from any view via sidebar */}
      {showWeeklyChart && (
        <WeeklyProgressChart
          todos={todos}
          show={showWeeklyChart}
          onClose={closeWeeklyChart}
        />
      )}

      {/* Keyboard Shortcuts Modal - accessible from any view via sidebar */}
      <KeyboardShortcutsModal
        show={showShortcuts}
        onClose={closeShortcuts}
      />

      {/* Sync status indicator - shows real-time connection state */}
      <div className="fixed bottom-4 right-4 z-40">
        <SyncStatusIndicator showLabel />
      </div>

      {/* AI Onboarding Tutorial */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* AI Preferences Settings */}
      <AIPreferencesModal
        isOpen={showAIPreferences}
        onClose={() => setShowAIPreferences(false)}
      />

      {/* Calendar Add Task Modal */}
      <AddTaskModal
        isOpen={calendarAddTaskDate !== null}
        onClose={() => setCalendarAddTaskDate(null)}
        onAdd={handleCalendarAddTask}
        users={users}
        currentUserId={currentUser.id}
        agencyId={currentAgencyId || undefined}
        defaultDueDate={calendarAddTaskDate || undefined}
      />
    </>
  );
}

/**
 * MainApp - Wraps the app content in AppShell context provider with Error Boundary
 */
export default function MainApp({ currentUser, onUserChange }: MainAppProps) {
  return (
    <AppShell currentUser={currentUser} onUserChange={onUserChange}>
      <ErrorBoundary>
        <MainAppContent currentUser={currentUser} onUserChange={onUserChange} />
      </ErrorBoundary>
    </AppShell>
  );
}
