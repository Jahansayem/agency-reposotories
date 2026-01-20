'use client';

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Target,
  Brain,
  Clock,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react';
import { Todo, AuthUser, ActivityLogEntry } from '@/types/todo';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppShell } from '../layout';
import {
  generateDashboardAIData,
  NeglectedTask,
} from '@/lib/aiDashboardInsights';

interface DoerDashboardProps {
  currentUser: AuthUser;
  todos: Todo[];
  activityLog?: ActivityLogEntry[];
  onNavigateToTasks?: () => void;
  onFilterOverdue?: () => void;
  onFilterDueToday?: () => void;
}

export default function DoerDashboard({
  currentUser,
  todos,
  activityLog = [],
  onNavigateToTasks,
  onFilterOverdue,
  onFilterDueToday,
}: DoerDashboardProps) {
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  const { setActiveView } = useAppShell();

  // Filter to only MY tasks
  const myTodos = useMemo(() => {
    return todos.filter(t =>
      t.assigned_to === currentUser.name ||
      (!t.assigned_to && t.created_by === currentUser.name)
    );
  }, [todos, currentUser.name]);

  // Generate AI insights for MY tasks only
  const aiData = useMemo(() => {
    return generateDashboardAIData(myTodos, activityLog, currentUser.name);
  }, [myTodos, activityLog, currentUser.name]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeTodos = myTodos.filter(t => !t.completed);
    const completedTodos = myTodos.filter(t => t.completed);

    const overdue = activeTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(23, 59, 59, 999);
      return dueDate < today;
    });

    const dueToday = activeTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate <= todayEnd;
    });

    const highPriority = activeTodos.filter(t =>
      t.priority === 'urgent' || t.priority === 'high'
    );

    // Next 7 days (excluding today)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcoming = activeTodos
      .filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate > todayEnd && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());

    // Weekly completion data
    const currentDay = today.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    let weeklyCompleted = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      weeklyCompleted += completedTodos.filter(t => {
        if (!t.completed) return false;
        if (!t.updated_at && !t.created_at) return false;
        const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
        return updatedAt >= date && updatedAt <= dateEnd;
      }).length;
    }

    const weeklyTotal = Math.max(weeklyCompleted + activeTodos.length, 1);
    const weeklyRatio = Math.round((weeklyCompleted / weeklyTotal) * 100);

    return {
      totalActive: activeTodos.length,
      totalCompleted: completedTodos.length,
      overdue: overdue.length,
      overdueList: overdue,
      dueToday: dueToday.length,
      dueTodayTasks: dueToday,
      highPriority: highPriority.length,
      highPriorityTasks: highPriority,
      upcoming: upcoming.length,
      upcomingTasks: upcoming,
      weeklyCompleted,
      weeklyTotal,
      weeklyRatio,
    };
  }, [myTodos]);

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleNavigateToTasks = useCallback(() => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      setActiveView('tasks');
    }
  }, [onNavigateToTasks, setActiveView]);

  const handleFilterOverdue = useCallback(() => {
    if (onFilterOverdue) {
      onFilterOverdue();
    } else {
      setActiveView('tasks');
    }
  }, [onFilterOverdue, setActiveView]);

  const handleFilterDueToday = useCallback(() => {
    if (onFilterDueToday) {
      onFilterDueToday();
    } else {
      setActiveView('tasks');
    }
  }, [onFilterDueToday, setActiveView]);

  const getUrgencyBadge = (urgency: NeglectedTask['urgencyLevel']) => {
    switch (urgency) {
      case 'critical': return { bg: 'bg-red-500', text: 'text-white', label: 'CRITICAL' };
      case 'warning': return { bg: 'bg-amber-500', text: 'text-white', label: 'STALLED' };
      case 'notice': return { bg: 'bg-blue-500', text: 'text-white', label: 'NEEDS ATTENTION' };
    }
  };

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-5 ${
      darkMode
        ? 'bg-[var(--surface)] border border-white/10'
        : 'bg-white border border-[var(--border)] shadow-sm'
    } ${className}`}>
      {children}
    </div>
  );

  const SectionTitle = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${darkMode ? 'text-[var(--accent)]' : 'text-[#0033A0]'}`} />
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${
        darkMode ? 'text-white/70' : 'text-slate-600'
      }`}>
        {title}
      </h2>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Critical Alerts - Overdue tasks get top billing */}
      {stats.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={handleFilterOverdue}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors group ${
              darkMode
                ? 'bg-red-500/15 hover:bg-red-500/20 border border-red-500/30'
                : 'bg-red-50 hover:bg-red-100 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {stats.overdue} task{stats.overdue > 1 ? 's' : ''} overdue
              </p>
              <p className={`text-sm ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                Click to view and resolve
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - Today's Focus */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <SectionTitle icon={Target} title="Your Day" />

            {/* AI Focus Suggestion */}
            {aiData.todaysFocus && (
              <div className={`flex items-start gap-3 p-3 rounded-xl mb-4 ${
                darkMode ? 'bg-[#0033A0]/20 border border-[#0033A0]/30' : 'bg-blue-50 border border-blue-200'
              }`}>
                <Brain className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'}`} />
                <p className={`text-sm ${darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'}`}>
                  {aiData.todaysFocus}
                </p>
              </div>
            )}

            {/* Due Today */}
            {stats.dueToday > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                    Due Today
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {stats.dueToday}
                  </span>
                </div>
                {stats.dueTodayTasks.slice(0, 5).map((task) => (
                  <button
                    key={task.id}
                    onClick={handleNavigateToTasks}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      'bg-[#0033A0]'
                    }`} />
                    <span className={`flex-1 text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {task.text}
                    </span>
                    {task.priority === 'urgent' && (
                      <Zap className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {stats.dueToday > 5 && (
                  <button
                    onClick={handleFilterDueToday}
                    className={`w-full text-center py-2 text-xs font-medium ${
                      darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'
                    } hover:underline`}
                  >
                    +{stats.dueToday - 5} more due today
                  </button>
                )}
              </div>
            ) : (
              <div className={`flex items-center gap-3 py-4 px-4 rounded-xl ${
                darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  No tasks due today - you're ahead of schedule!
                </span>
              </div>
            )}

            {/* Upcoming Tasks */}
            {stats.upcoming > 0 && (
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-white/50' : 'text-slate-400'}`}>
                    Coming Up
                  </span>
                  <Calendar className={`w-4 h-4 ${darkMode ? 'text-white/30' : 'text-slate-300'}`} />
                </div>
                <div className="space-y-1">
                  {stats.upcomingTasks.slice(0, 4).map((task) => (
                    <button
                      key={task.id}
                      onClick={handleNavigateToTasks}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === 'urgent' ? 'bg-red-500' :
                        task.priority === 'high' ? 'bg-orange-500' :
                        'bg-slate-300 dark:bg-slate-600'
                      }`} />
                      <span className={`flex-1 text-sm truncate ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                        {task.text}
                      </span>
                      <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                        {task.due_date && formatDueDate(task.due_date)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Stalled/Neglected Tasks */}
          {aiData.neglectedTasks.length > 0 && (
            <Card>
              <SectionTitle icon={Clock} title="Needs Your Attention" />
              <div className="space-y-2">
                {aiData.neglectedTasks.slice(0, 4).map((item) => {
                  const badge = getUrgencyBadge(item.urgencyLevel);
                  return (
                    <div
                      key={item.todo.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                      } transition-colors cursor-pointer`}
                      onClick={handleNavigateToTasks}
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {item.daysSinceActivity}d
                      </span>
                      <span className={`flex-1 truncate text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.todo.text}
                      </span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-white/30' : 'text-slate-300'}`} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Progress & Stats */}
        <div className="space-y-6">
          {/* Weekly Progress */}
          <Card>
            <SectionTitle icon={TrendingUp} title="Your Progress" />
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {stats.weeklyCompleted}
                </div>
                <p className={`text-sm ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>
                  completed this week
                </p>
              </div>

              <div className={`h-3 rounded-full ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.weeklyRatio, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                />
              </div>

              <p className={`text-xs text-center ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                {stats.weeklyRatio}% of weekly workload done
              </p>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {stats.totalActive}
                </p>
                <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>Active Tasks</p>
              </div>
              <div className={`text-center p-3 rounded-xl ${
                stats.highPriority > 0
                  ? darkMode ? 'bg-orange-500/10' : 'bg-orange-50'
                  : darkMode ? 'bg-white/5' : 'bg-slate-50'
              }`}>
                <p className={`text-2xl font-bold ${stats.highPriority > 0 ? 'text-orange-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {stats.highPriority}
                </p>
                <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>High Priority</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
