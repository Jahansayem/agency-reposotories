'use client';

import { useState, useCallback, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Calendar,
  MessageCircle,
  Flame,
  Inbox,
  LayoutDashboard,
  BarChart2,
  Users,
  Target,
  Archive,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthUser } from '@/types/todo';
import { usePermission } from '@/hooks/usePermission';
import { useTodoStore } from '@/store/todoStore';
import NavigationSidebar from './NavigationSidebar';
import CommandPalette from './CommandPalette';
import EnhancedBottomNav from './EnhancedBottomNav';
import FloatingChatButton from '../FloatingChatButton';
import { AppBarProvider } from './AppBarContext';
import UnifiedAppBar from './UnifiedAppBar';
import { AgentPanel, AgentToggleButton } from '@/components/agent';
import { useAgent } from '@/hooks/useAgent';

// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL - CORE LAYOUT ARCHITECTURE
// A sophisticated three-column layout with persistent navigation and panels
// Designed for the Wavezly insurance task management workflow
// ═══════════════════════════════════════════════════════════════════════════

export type ActiveView =
  | 'tasks'
  | 'calendar'
  | 'dashboard'
  | 'activity'
  | 'chat'
  | 'goals'
  | 'archive'
  | 'ai_inbox'
  | 'analytics'
  | 'opportunities'
  | 'customers'
  | 'settings';

export type RightPanelContent =
  | { type: 'chat' }
  | { type: 'task-detail'; taskId: string }
  | { type: 'activity' }
  | null;

interface AppShellContextType {
  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Right panel
  rightPanel: RightPanelContent;
  openRightPanel: (content: RightPanelContent) => void;
  closeRightPanel: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Mobile sheet
  mobileSheetOpen: boolean;
  mobileSheetContent: 'menu' | 'filters' | 'chat' | null;
  openMobileSheet: (content: 'menu' | 'filters' | 'chat') => void;
  closeMobileSheet: () => void;

  // New task trigger
  triggerNewTask: () => void;
  onNewTaskTrigger: (callback: () => void) => void;

  // Modal state (Weekly Progress, Keyboard Shortcuts)
  showWeeklyChart: boolean;
  openWeeklyChart: () => void;
  closeWeeklyChart: () => void;
  showShortcuts: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;

  // User info
  currentUser: AuthUser | null;
}

const AppShellContext = createContext<AppShellContextType | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return context;
}

interface AppShellProps {
  children: ReactNode;
  currentUser: AuthUser;
  rightPanelContent?: ReactNode;
  onUserChange?: (user: AuthUser | null) => void;
}

export default function AppShell({
  children,
  currentUser,
  rightPanelContent,
  onUserChange
}: AppShellProps) {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  // Get users from store for FloatingChatButton
  const users = useTodoStore((state) => state.usersWithColors);

  // Agent panel state and hook
  const { usage: agentUsage } = useAgent();
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);

  // Navigation state
  const [activeView, setActiveView] = useState<ActiveView>('tasks');

  // Sidebar state - collapsed by default on tablet, expanded on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Right panel state
  const [rightPanel, setRightPanel] = useState<RightPanelContent>(null);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Mobile sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetContent, setMobileSheetContent] = useState<'menu' | 'filters' | 'chat' | null>(null);

  // New task trigger callback - allows child components to register handlers
  const [newTaskCallback, setNewTaskCallback] = useState<(() => void) | null>(null);

  // Modal state for Weekly Progress and Shortcuts
  const [showWeeklyChart, setShowWeeklyChart] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Timer refs for cleanup on unmount
  const newTaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskLinkScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskLinkHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (newTaskTimerRef.current) clearTimeout(newTaskTimerRef.current);
      if (taskLinkScrollTimerRef.current) clearTimeout(taskLinkScrollTimerRef.current);
      if (taskLinkHighlightTimerRef.current) clearTimeout(taskLinkHighlightTimerRef.current);
    };
  }, []);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Command palette: Cmd/Ctrl + K (allow even in inputs — standard pattern)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // Toggle sidebar: Cmd/Ctrl + B — skip when in inputs (conflicts with bold)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        if (!isInInput) {
          e.preventDefault();
          setSidebarCollapsed(prev => !prev);
        }
        return;
      }

      // Keyboard shortcuts modal: ? key
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!isInInput) {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
        return;
      }

      // Close panels on Escape
      if (e.key === 'Escape') {
        // Always allow closing modals/overlays
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        // Don't close the task detail panel if user is editing inside it
        if (isInInput) return;
        if (rightPanel) {
          setRightPanel(null);
          return;
        }
        if (mobileSheetOpen) {
          setMobileSheetOpen(false);
          setMobileSheetContent(null);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, rightPanel, mobileSheetOpen, showShortcuts]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const openRightPanel = useCallback((content: RightPanelContent) => {
    setRightPanel(content);
  }, []);

  const closeRightPanel = useCallback(() => {
    setRightPanel(null);
  }, []);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const openMobileSheet = useCallback((content: 'menu' | 'filters' | 'chat') => {
    setMobileSheetContent(content);
    setMobileSheetOpen(true);
  }, []);

  const closeMobileSheet = useCallback(() => {
    setMobileSheetOpen(false);
    setMobileSheetContent(null);
  }, []);

  // New task trigger - calls registered callback and switches to tasks view
  const triggerNewTask = useCallback(() => {
    setActiveView('tasks');
    // Small delay to ensure view is switched before triggering callback
    if (newTaskTimerRef.current) clearTimeout(newTaskTimerRef.current);
    newTaskTimerRef.current = setTimeout(() => {
      if (newTaskCallback) {
        newTaskCallback();
      }
    }, 50);
  }, [newTaskCallback]);

  // Handle task link click from chat - navigate to task and highlight it
  const handleTaskLinkClick = useCallback((taskId: string) => {
    // Navigate to tasks view
    setActiveView('tasks');
    // Small delay to ensure view switches, then scroll to task
    if (taskLinkScrollTimerRef.current) clearTimeout(taskLinkScrollTimerRef.current);
    if (taskLinkHighlightTimerRef.current) clearTimeout(taskLinkHighlightTimerRef.current);
    taskLinkScrollTimerRef.current = setTimeout(() => {
      const taskElement = document.getElementById(`todo-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add animated highlight class
        taskElement.classList.add('notification-highlight');
        // Remove the class after animation completes
        taskLinkHighlightTimerRef.current = setTimeout(() => {
          taskElement.classList.remove('notification-highlight');
        }, 3000);
      }
    }, 150);
  }, []);

  // Allow child components to register their new task handler
  const onNewTaskTrigger = useCallback((callback: () => void) => {
    setNewTaskCallback(() => callback);
  }, []);

  // Weekly chart modal controls
  const openWeeklyChart = useCallback(() => setShowWeeklyChart(true), []);
  const closeWeeklyChart = useCallback(() => setShowWeeklyChart(false), []);

  // Shortcuts modal controls
  const openShortcuts = useCallback(() => setShowShortcuts(true), []);
  const closeShortcuts = useCallback(() => setShowShortcuts(false), []);

  const contextValue: AppShellContextType = {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    rightPanel,
    openRightPanel,
    closeRightPanel,
    commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    mobileSheetOpen,
    mobileSheetContent,
    openMobileSheet,
    closeMobileSheet,
    triggerNewTask,
    onNewTaskTrigger,
    showWeeklyChart,
    openWeeklyChart,
    closeWeeklyChart,
    showShortcuts,
    openShortcuts,
    closeShortcuts,
    currentUser,
  };

  return (
    <AppBarProvider>
    <AppShellContext.Provider value={contextValue}>
      <div
        className={`
          min-h-screen min-h-[100dvh] flex flex-col
          transition-colors duration-200
          ${'bg-[var(--background)]'}
        `}
      >
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>

        {/* ═══ UNIFIED APP BAR ═══ */}
        <UnifiedAppBar
          currentUser={currentUser}
          onUserChange={onUserChange}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* ═══ LEFT SIDEBAR ═══ */}
          <NavigationSidebar
            currentUser={currentUser}
            onShowWeeklyChart={openWeeklyChart}
            onShowShortcuts={openShortcuts}
          />

          {/* ═══ MAIN CONTENT AREA ═══ */}
          <main
            id="main-content"
            className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-out"
          >
            {/* Main content with proper overflow handling */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>

          {/* ═══ RIGHT PANEL (Desktop) ═══ */}
          {/* Panel is visible on xl+ screens, with responsive width */}
          <AnimatePresence mode="wait">
            {rightPanel && rightPanelContent && (
              <motion.aside
                initial={prefersReducedMotion ? false : { width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={`
                  hidden lg:flex flex-col overflow-hidden
                  border-l flex-shrink-0
                  lg:w-[340px] xl:w-[380px] 2xl:w-[420px]
                  ${'bg-[var(--surface)] border-[var(--border)]'}
                `}
              >
                {rightPanelContent}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ MOBILE BOTTOM NAVIGATION ═══ */}
        <EnhancedBottomNav />

        {/* ═══ FLOATING CHAT BUTTON ═══ */}
        <FloatingChatButton
          currentUser={currentUser}
          users={users}
          onTaskLinkClick={handleTaskLinkClick}
        />

        {/* ═══ AI AGENT TOGGLE BUTTON ═══ */}
        <AgentToggleButton
          onClick={() => setIsAgentPanelOpen(true)}
          usage={agentUsage}
        />

        {/* ═══ AI AGENT PANEL ═══ */}
        <AgentPanel
          isOpen={isAgentPanelOpen}
          onClose={() => setIsAgentPanelOpen(false)}
          onMinimize={() => setIsAgentPanelOpen(false)}
        />

        {/* ═══ COMMAND PALETTE ═══ */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={closeCommandPalette}
          currentUser={currentUser}
        />

        {/* ═══ MOBILE SHEET OVERLAY ═══ */}
        <AnimatePresence>
          {mobileSheetOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMobileSheet}
                className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm lg:hidden"
              />

              {/* Sheet */}
              <motion.div
                initial={prefersReducedMotion ? false : { y: '100%' }}
                animate={{ y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
                className={`
                  fixed inset-x-0 bottom-0 z-[400] lg:hidden
                  max-h-[85vh] rounded-t-3xl overflow-hidden
                  ${'bg-[var(--surface)]'}
                `}
              >
                {/* Drag handle */}
                <div className="flex justify-center py-3">
                  <div
                    className={`
                      w-10 h-1 rounded-full
                      ${'bg-[var(--border)]'}
                    `}
                  />
                </div>

                {/* Sheet content would be rendered here based on mobileSheetContent */}
                <div className="px-4 pb-safe overflow-auto max-h-[calc(85vh-44px)]">
                  {mobileSheetContent === 'menu' && (
                    <MobileMenuContent onClose={closeMobileSheet} />
                  )}
                  {mobileSheetContent === 'filters' && (
                    <MobileFiltersContent onClose={closeMobileSheet} />
                  )}
                  {mobileSheetContent === 'chat' && (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                      Chat panel content
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShellContext.Provider>
    </AppBarProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE SHEET CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MobileMenuContent({ onClose }: { onClose: () => void }) {
  const { setActiveView, activeView } = useAppShell();
  const canViewStrategicGoals = usePermission('can_view_strategic_goals');
  const canViewArchive = usePermission('can_view_archive');

  const primaryItems: { id: ActiveView; label: string; icon: typeof CheckSquare }[] = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
    { id: 'opportunities', label: 'Opportunities', icon: Flame },
    { id: 'ai_inbox', label: 'AI Inbox', icon: Inbox },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const secondaryItems: { id: ActiveView; label: string; icon: typeof CheckSquare; show: boolean }[] = [
    { id: 'customers', label: 'Customers', icon: Users, show: true },
    { id: 'goals', label: 'Strategic Goals', icon: Target, show: canViewStrategicGoals },
    { id: 'archive', label: 'Archive', icon: Archive, show: canViewArchive },
  ];

  const handleItemClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    onClose();
  };

  return (
    <div className="space-y-1 pb-4">
      <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
        Navigation
      </h2>
      {primaryItems.map(item => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] text-left
              transition-colors
              ${isActive
                ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold'
                : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
            `}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}

      {secondaryItems.some(i => i.show) && (
        <>
          <div className="border-t my-3 border-[var(--border)]" />
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-light)]">
            More
          </p>
          {secondaryItems.filter(i => i.show).map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] text-left
                  transition-colors
                  ${isActive
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'}
                `}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

function MobileFiltersContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        Filters
      </h2>
      <p className="text-sm text-[var(--text-muted)]">
        Filter controls will be rendered here
      </p>
    </div>
  );
}
