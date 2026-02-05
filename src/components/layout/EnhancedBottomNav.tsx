'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  List,
} from 'lucide-react';
import { useAppShell, ActiveView } from './AppShell';
import { DURATION, EASE } from '@/lib/animations';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED BOTTOM NAVIGATION
// A modern, iOS-style bottom navigation with contextual actions
// Features:
// - Primary navigation tabs
// - Floating action button for quick task creation
// - Gesture-friendly touch targets (48px minimum)
// - Safe area handling for notched devices
// - Badge notifications
// ═══════════════════════════════════════════════════════════════════════════

interface NavTab {
  id: ActiveView | 'add';
  label: string;
  icon: typeof CheckSquare;
  badge?: number;
  badgeColor?: string;
}

export default function EnhancedBottomNav() {
  const {
    activeView,
    setActiveView,
    openMobileSheet,
    currentUser,
    triggerNewTask,
  } = useAppShell();

  // Stats for badges (these would come from props or context in real implementation)
  const [stats, setStats] = useState({
    unreadMessages: 0,
    overdueTasks: 0,
    dueTodayTasks: 0,
  });

  const tabs: NavTab[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'add',
      label: 'Add',
      icon: Plus,
    },
    {
      id: 'chat',
      label: 'Messages',
      icon: MessageCircle,
      badge: stats.unreadMessages,
    },
    {
      id: 'activity',
      label: 'More',
      icon: Menu,
    },
  ];

  const handleTabPress = useCallback((tabId: ActiveView | 'add') => {
    if (tabId === 'add') {
      triggerNewTask();
    } else if (tabId === 'activity') {
      // Open more menu sheet
      openMobileSheet('menu');
    } else {
      setActiveView(tabId);
    }
  }, [triggerNewTask, openMobileSheet, setActiveView]);

  // View transition animation variants
  const tabButtonVariants = {
    idle: { scale: 1 },
    pressed: { scale: 0.95 },
    active: { scale: 1.05 },
  };

  const iconVariants = {
    idle: { y: 0 },
    active: { y: -2 },
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe bg-[var(--surface)] backdrop-blur-xl border-t border-[var(--border)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id !== 'add' && activeView === tab.id;
          const isAddButton = tab.id === 'add';
          const isMoreButton = tab.id === 'activity';

          // Floating add button in center
          if (isAddButton) {
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabPress(tab.id)}
                className="relative -mt-6 w-14 h-14 rounded-[var(--radius-2xl)] flex items-center justify-center bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-light)] text-white shadow-lg shadow-[var(--brand-blue)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                aria-label="Create new task"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: DURATION.fast, ease: EASE.default }}
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />

                {/* Subtle glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-[var(--radius-2xl)] bg-white/20"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: DURATION.fast }}
                />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[64px] min-h-[48px] h-16 px-3
                touch-manipulation
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset rounded-[var(--radius-lg)]
                ${isActive
                  ? ''
                  : 'opacity-60'
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              variants={tabButtonVariants}
              initial="idle"
              animate={isActive ? 'active' : 'idle'}
              whileTap="pressed"
              transition={{ duration: DURATION.fast, ease: EASE.default }}
            >
              {/* Active indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-1 w-8 h-1 rounded-full bg-[var(--accent)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon with badge */}
              <motion.div
                className="relative"
                variants={iconVariants}
                animate={isActive ? 'active' : 'idle'}
                transition={{ duration: DURATION.fast }}
              >
                <Icon
                  className={`
                    w-6 h-6 transition-colors duration-200
                    ${isActive
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-muted)]'}
                  `}
                  aria-hidden="true"
                />

                {/* Badge */}
                <AnimatePresence>
                  {tab.badge && tab.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-badge bg-[var(--danger)] text-white"
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Label */}
              <motion.span
                className={`
                  text-xs mt-1 transition-colors duration-200
                  ${isActive
                    ? 'text-[var(--accent)] font-medium'
                    : 'text-[var(--text-muted)]'}
                `}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK FILTER PILLS
// A secondary navigation row for rapid task filtering
// ═══════════════════════════════════════════════════════════════════════════

interface QuickFilterPillsProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  stats: {
    all: number;
    dueToday: number;
    overdue: number;
    completed: number;
  };
}

export function QuickFilterPills({
  currentFilter,
  onFilterChange,
  stats,
}: QuickFilterPillsProps) {
  const filters = [
    { id: 'all', label: 'All', count: stats.all, icon: List },
    { id: 'due_today', label: 'Today', count: stats.dueToday, icon: Calendar, color: 'var(--warning)' },
    { id: 'overdue', label: 'Overdue', count: stats.overdue, icon: AlertTriangle, color: 'var(--danger)' },
    { id: 'done', label: 'Done', count: stats.completed, icon: CheckCircle, color: 'var(--success)' },
  ];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto px-4 py-2 -mx-4 scrollbar-hide"
      role="tablist"
      aria-label="Task filter options"
    >
      {filters.map(filter => {
        const isActive = currentFilter === filter.id;
        const Icon = filter.icon;
        const hasItems = filter.count > 0;

        // Hide overdue if no items
        if (filter.id === 'overdue' && !hasItems) return null;

        return (
          <motion.button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            role="tab"
            aria-selected={isActive}
            aria-label={`${filter.label} tasks: ${filter.count}`}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-sm font-medium whitespace-nowrap
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
              ${isActive
                ? `bg-[var(--accent-light)] text-[var(--accent)]`
                : `bg-[var(--surface-2)] text-[var(--text-muted)]`
              }
            `}
            style={isActive && filter.color ? { color: filter.color } : undefined}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={isActive ? { scale: 1.02 } : { scale: 1 }}
            transition={{ duration: DURATION.fast, ease: EASE.default }}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{filter.label}</span>
            <AnimatePresence mode="wait">
              {filter.count > 0 && (
                <motion.span
                  key={filter.count}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`
                    min-w-[20px] h-5 flex items-center justify-center
                    px-1.5 rounded-full text-xs
                    ${isActive
                      ? 'bg-[var(--accent)]/15': 'bg-[var(--surface-3)]'}
                  `}
                  style={isActive && filter.color ? {
                    backgroundColor: `${filter.color}26`,
                  } : undefined}
                >
                  {filter.count > 99 ? '99+' : filter.count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
