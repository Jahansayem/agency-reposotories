'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';
import { getMonth, getYear, startOfMonth } from 'date-fns';
import { Todo, User } from '@/types/todo';

interface TeamProductionPanelProps {
  todos: Todo[];
  users: User[];
  onUserClick: (userName: string) => void;
}

interface UserStats {
  userName: string;
  userColor: string;
  policiesWritten: number;
  premiumWritten: number;
  tasksCompleted: number;
}

export default function TeamProductionPanel({
  todos,
  users,
  onUserClick,
}: TeamProductionPanelProps) {
  // Calculate per-user stats for the current month
  const userStats = useMemo(() => {
    const now = new Date();
    const currentMonth = getMonth(now);
    const currentYear = getYear(now);
    const monthStart = startOfMonth(now);

    // Get all completed tasks this month
    const completedThisMonth = todos.filter((t) => {
      if (!t.completed) return false;

      // Check if task was updated (completed) this month
      // We use updated_at as that's when completion status changes
      const completedDate = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
      return (
        getMonth(completedDate) === currentMonth &&
        getYear(completedDate) === currentYear
      );
    });

    // Calculate stats per user
    const statsMap = new Map<string, UserStats>();

    // Initialize stats for all users
    users.forEach((user) => {
      statsMap.set(user.name, {
        userName: user.name,
        userColor: user.color || '#0033A0',
        policiesWritten: 0,
        premiumWritten: 0,
        tasksCompleted: 0,
      });
    });

    // Calculate stats from completed tasks
    completedThisMonth.forEach((todo) => {
      const assignedTo = todo.assigned_to;
      if (!assignedTo) return;

      const userStat = statsMap.get(assignedTo);
      if (!userStat) {
        // User not in users list, create entry
        statsMap.set(assignedTo, {
          userName: assignedTo,
          userColor: '#6b7280', // Gray for unknown users
          policiesWritten: 0,
          premiumWritten: 0,
          tasksCompleted: 0,
        });
      }

      const stat = statsMap.get(assignedTo)!;
      stat.tasksCompleted += 1;

      // Check if this is a completed quote (policy written)
      if (todo.category === 'quote') {
        stat.policiesWritten += 1;
        stat.premiumWritten += todo.premium_amount || 0;
      }
    });

    // Convert to array and sort by premium amount (highest first)
    const statsArray = Array.from(statsMap.values());
    statsArray.sort((a, b) => {
      // Primary sort: premium written (descending)
      if (b.premiumWritten !== a.premiumWritten) {
        return b.premiumWritten - a.premiumWritten;
      }
      // Secondary sort: policies written (descending)
      if (b.policiesWritten !== a.policiesWritten) {
        return b.policiesWritten - a.policiesWritten;
      }
      // Tertiary sort: tasks completed (descending)
      return b.tasksCompleted - a.tasksCompleted;
    });

    return statsArray;
  }, [todos, users]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    if (value === 0) {
      return '$0';
    }
    return `$${value.toLocaleString()}`;
  };

  // Get user initial for avatar
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-[var(--surface)] rounded-xl p-6 shadow-sm border border-[var(--border)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-[#0033A0]/10 dark:bg-[#72B5E8]/20">
          <Users className="w-5 h-5 text-[#0033A0] dark:text-[#72B5E8]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Team Production
        </h3>
      </div>

      {/* Team Member List */}
      <div className="space-y-1 mb-4">
        {userStats.length === 0 ? (
          <div className="text-center py-6 text-[var(--text-muted)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          userStats.map((stat, index) => (
            <motion.button
              key={stat.userName}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              onClick={() => onUserClick(stat.userName)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left group"
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                style={{ backgroundColor: stat.userColor }}
              >
                {getInitial(stat.userName)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--foreground)] truncate">
                  {stat.userName}
                </div>
              </div>

              {/* Policies */}
              <div className="w-20 flex-shrink-0 text-right">
                <span className="text-sm text-[var(--text-muted)]">
                  {stat.policiesWritten}{' '}
                  <span className="hidden sm:inline">
                    {stat.policiesWritten === 1 ? 'policy' : 'policies'}
                  </span>
                  <span className="inline sm:hidden">pol</span>
                </span>
              </div>

              {/* Premium */}
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-sm font-semibold text-[#0033A0] dark:text-[#72B5E8]">
                  {formatCurrency(stat.premiumWritten)}
                </span>
              </div>

              {/* Tasks */}
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-sm text-[var(--text-muted)]">
                  {stat.tasksCompleted}{' '}
                  <span className="hidden sm:inline">
                    {stat.tasksCompleted === 1 ? 'task' : 'tasks'}
                  </span>
                </span>
              </div>

              {/* Hover indicator */}
              <ChevronRight className="w-4 h-4 text-[var(--text-light)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </motion.button>
          ))
        )}
      </div>

      {/* View Full Team Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onUserClick('')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0033A0] hover:bg-[#002580] dark:bg-[#72B5E8] dark:hover:bg-[#5DA3D6] text-white font-medium transition-colors"
      >
        View Full Team
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
