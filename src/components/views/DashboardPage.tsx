'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  Flame,
  Award,
  Brain,
  Users,
  UserCheck,
  BarChart3,
  AlertOctagon,
  Send,
  Wand2,
  Zap,
  GitBranch,
  CalendarDays,
  ListTodo,
} from 'lucide-react';
import AnimatedProgressRing from '@/components/dashboard/AnimatedProgressRing';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import DailyDigestPanel from '@/components/dashboard/DailyDigestPanel';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import DoerDashboard from '@/components/dashboard/DoerDashboard';
import { Todo, AuthUser, ActivityLogEntry, User, QuickFilter } from '@/types/todo';
import {
  generateDashboardAIData,
  getScoreBreakdown,
  NeglectedTask,
  InsightIconName,
} from '@/lib/aiDashboardInsights';
import ScoreBreakdownTooltip from '@/components/dashboard/ScoreBreakdownTooltip';
import {
  generateManagerDashboardData,
} from '@/lib/managerDashboardInsights';
import {
  analyzeTaskForDecomposition,
  generateBottleneckResolutions,
} from '@/lib/orchestratorIntegration';

interface DashboardPageProps {
  currentUser: AuthUser;
  todos: Todo[];
  activityLog?: ActivityLogEntry[];
  users?: string[];
  allUsers?: User[];
  onNavigateToTasks?: (filter?: QuickFilter) => void;
  onAddTask?: () => void;
  onTaskClick?: (taskId: string) => void;
  onFilterOverdue?: () => void;
  onFilterDueToday?: () => void;
  onFilterByCategory?: (category: string) => void;
  onFilterByUser?: (userName: string) => void;
  onRefreshTodos?: () => void;
  onOpenChat?: () => void;
  /** Use new role-based dashboards instead of legacy dashboard */
  useNewDashboards?: boolean;
}

/** Map insight types/titles to a click action */
function getInsightAction(
  insight: { title: string; type: string },
  handlers: {
    onFilterOverdue?: () => void;
    onFilterDueToday?: () => void;
    onNavigateToTasks?: () => void;
  },
): (() => void) | undefined {
  const title = insight.title.toLowerCase();
  if (title.includes('overdue')) return handlers.onFilterOverdue;
  if (title.includes('due today')) return handlers.onFilterDueToday;
  if (title.includes('due soon')) return handlers.onNavigateToTasks;
  return handlers.onNavigateToTasks;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  completed: number;
  isToday: boolean;
}

interface UpcomingTask {
  id: string;
  text: string;
  due_date: string;
  priority: string;
}

export default function DashboardPage({
  currentUser,
  todos,
  activityLog = [],
  users = [],
  allUsers,
  onNavigateToTasks,
  onAddTask,
  onTaskClick,
  onFilterOverdue,
  onFilterDueToday,
  onFilterByCategory,
  onFilterByUser,
  onRefreshTodos,
  onOpenChat,
  useNewDashboards = true, // Default to new dashboards
}: DashboardPageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'team'>('overview');
  const darkMode = true; // Always dark mode in this app's context

  // Check if user has team members (is a manager/owner)
  const hasTeam = users.length > 1;

  // Determine if user is owner/manager based on role
  const isOwnerOrManager = currentUser.role === 'owner' || currentUser.role === 'manager';

  // Legacy dashboard below (kept for backwards compatibility)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate AI insights
  const aiData = useMemo(() => {
    return generateDashboardAIData(todos, activityLog, currentUser.name);
  }, [todos, activityLog, currentUser.name]);

  // Get score breakdown for tooltip
  const scoreBreakdown = useMemo(() => {
    return getScoreBreakdown(todos, activityLog, currentUser.name);
  }, [todos, activityLog, currentUser.name]);

  // Generate manager/team insights (only if user has team members)
  const managerData = useMemo(() => {
    if (!hasTeam) return null;
    return generateManagerDashboardData(todos, currentUser.name, users);
  }, [todos, currentUser.name, users, hasTeam]);

  // Generate orchestrator suggestions for bottleneck resolution
  const orchestratorSuggestions = useMemo(() => {
    if (!hasTeam || !managerData) return [];
    return generateBottleneckResolutions(managerData.bottlenecks, todos);
  }, [hasTeam, managerData, todos]);

  // Analyze complex pending tasks for potential decomposition
  const complexTaskAnalysis = useMemo(() => {
    if (!hasTeam) return [];
    const activeTodos = todos.filter(t => !t.completed);
    const complexTasks = activeTodos
      .filter(t => t.priority === 'urgent' || t.priority === 'high' || t.text.length > 50)
      .slice(0, 3);
    return complexTasks.map(task => ({
      task,
      analysis: analyzeTaskForDecomposition(task.text, task.notes),
    }));
  }, [hasTeam, todos]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

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

    const nextTask: UpcomingTask | null = upcoming.length > 0 && upcoming[0].due_date
      ? {
          id: upcoming[0].id,
          text: upcoming[0].text,
          due_date: upcoming[0].due_date,
          priority: upcoming[0].priority || 'medium',
        }
      : null;

    // Weekly completion data
    const weekData: WeekDay[] = [];
    const currentDay = today.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const completed = completedTodos.filter(t => {
        if (!t.completed) return false;
        if (!t.updated_at && !t.created_at) return false;
        const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
        return updatedAt >= date && updatedAt <= dateEnd;
      }).length;

      weekData.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        completed,
        isToday: date.toDateString() === today.toDateString(),
      });
    }

    const weeklyCompleted = weekData.reduce((sum, d) => sum + d.completed, 0);
    const maxDaily = Math.max(...weekData.map(d => d.completed), 1);
    const weeklyTotal = Math.max(weeklyCompleted + activeTodos.length, 1);
    const weeklyRatio = Math.round((weeklyCompleted / weeklyTotal) * 100);

    return {
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueTodayTasks: dueToday,
      nextTask,
      weekData,
      weeklyCompleted,
      weeklyTotal,
      weeklyRatio,
      maxDaily,
    };
  }, [todos]);

  // PERFORMANCE FIX: Memoize greeting to avoid recalculating on every render
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
    if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
    return { text: 'Good evening', Icon: Moon };
  }, [currentTime]);

  // PERFORMANCE FIX: Memoize formatDueDate to avoid recreating function on every render
  const formatDueDate = useMemo(() => (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  // PERFORMANCE FIX: Use static map for icon lookups instead of recreating function
  const insightIconMap: Record<InsightIconName, typeof Clock> = useMemo(() => ({
    'clock': Clock,
    'calendar': CalendarDays,
    'trophy': Award,
    'star': Sparkles,
    'trending-up': TrendingUp,
    'activity': BarChart3,
    'check-circle': CheckCircle2,
    'sunrise': Sunrise,
    'sun': Sun,
    'moon': Moon,
    'calendar-days': CalendarDays,
    'lightbulb': Lightbulb,
    'bar-chart': BarChart3,
    'sparkles': Sparkles,
    'target': Target,
    'zap': Zap,
  }), []);

  const getInsightIconComponent = useMemo(() => (iconName: InsightIconName) => {
    return insightIconMap[iconName] || Brain;
  }, [insightIconMap]);

  // PERFORMANCE FIX: Use static urgency mappings instead of recreating functions
  const urgencyColors: Record<NeglectedTask['urgencyLevel'], string> = useMemo(() => ({
    critical: 'text-red-500',
    warning: 'text-amber-500',
    notice: 'text-blue-400',
  }), []);

  const urgencyBgs: Record<NeglectedTask['urgencyLevel'], string> = useMemo(() => ({
    critical: darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
    warning: darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200',
    notice: darkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200',
  }), [darkMode]);

  const getUrgencyColor = useMemo(() => (urgency: NeglectedTask['urgencyLevel']) => urgencyColors[urgency], [urgencyColors]);
  const getUrgencyBg = useMemo(() => (urgency: NeglectedTask['urgencyLevel']) => urgencyBgs[urgency], [urgencyBgs]);

  // Use new role-based dashboards
  if (useNewDashboards) {
    if (isOwnerOrManager && hasTeam) {
      return (
        <ManagerDashboard
          currentUser={currentUser}
          todos={todos}
          activityLog={activityLog}
          users={users}
          allUsers={allUsers}
          onNavigateToTasks={onNavigateToTasks}
          onTaskClick={onTaskClick}
          onFilterOverdue={onFilterOverdue}
          onFilterDueToday={onFilterDueToday}
          onFilterByCategory={onFilterByCategory}
          onFilterByUser={onFilterByUser}
          onRefreshTodos={onRefreshTodos}
        />
      );
    }

    return (
      <DoerDashboard
        currentUser={currentUser}
        todos={todos}
        activityLog={activityLog}
        onNavigateToTasks={onNavigateToTasks}
        onTaskClick={onTaskClick}
        onFilterOverdue={onFilterOverdue}
        onFilterDueToday={onFilterDueToday}
      />
    );
  }

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, var(--background) 0%, var(--brand-blue) 50%, #1E3A5F 100%)',
          }}
        />

        <div className="relative px-6 py-8 sm:py-10 max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            {/* Left: Greeting + Name + Summary */}
            <div className="flex-1 min-w-0">
              {/* Greeting */}
              <div className="flex items-center gap-2 mb-1">
                <greeting.Icon className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">{greeting.text}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                {currentUser.name}
              </h1>

              {/* Streak Badge or Weekly Summary */}
              {aiData.streakMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-amber-300 text-sm font-medium"
                >
                  <Flame className="w-4 h-4" />
                  {aiData.streakMessage}
                </motion.div>
              ) : (
                <p className="text-white/70 text-sm">
                  {stats.weeklyCompleted} completed this week
                </p>
              )}

              {/* Quick stat badges */}
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                  {todos.filter(t => !t.completed).length} active
                </span>
                {stats.overdue > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 backdrop-blur-sm">
                    {stats.overdue} overdue
                  </span>
                )}
                {stats.dueToday > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 backdrop-blur-sm">
                    {stats.dueToday} due today
                  </span>
                )}
              </div>
            </div>

            {/* Right: Productivity Score with Tooltip */}
            <div className="flex flex-col items-center flex-shrink-0 ml-4">
              <AnimatedProgressRing
                progress={aiData.productivityScore}
                size={72}
                strokeWidth={6}
                gradientId="headerProgressGradient"
                tooltip={<ScoreBreakdownTooltip breakdown={scoreBreakdown} />}
              >
                <div className="flex flex-col items-center">
                  <span className={`text-xl font-bold ${
                    aiData.productivityScore >= 70
                      ? 'text-emerald-400'
                      : aiData.productivityScore >= 40
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}>
                    {aiData.productivityScore}
                  </span>
                </div>
              </AnimatedProgressRing>
              <span className="text-white/40 text-badge mt-1 flex items-center gap-1">
                Score
                <span className="text-white/30 text-badge">ⓘ</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={`flex gap-2 px-6 py-3 border-b max-w-5xl mx-auto ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`
            flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'overview'
              ? 'bg-[var(--brand-blue)] text-white'
              : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }
          `}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`
            flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'insights'
              ? 'bg-[var(--brand-blue)] text-white'
              : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }
          `}
        >
          <Sparkles className="w-4 h-4" />
          AI
          {(aiData.neglectedTasks.length > 0 || aiData.insights.length > 0) && (
            <span className={`
              w-2 h-2 rounded-full
              ${activeTab === 'insights' ? 'bg-white' : 'bg-[var(--brand-blue)]'}
            `} />
          )}
        </button>
        {hasTeam && (
          <button
            onClick={() => setActiveTab('team')}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'team'
                ? 'bg-[var(--brand-blue)] text-white'
                : darkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }
            `}
          >
            <Users className="w-4 h-4" />
            Team
            {managerData && managerData.bottlenecks.length > 0 && (
              <span className={`
                w-2 h-2 rounded-full
                ${activeTab === 'team' ? 'bg-white' : 'bg-amber-500'}
              `} />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`px-6 py-5 max-w-5xl mx-auto space-y-4 ${darkMode ? 'bg-[var(--background)]' : 'bg-slate-50'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Daily Digest Panel */}
              <DailyDigestPanel
                currentUser={currentUser}
                onFilterOverdue={onFilterOverdue}
                onFilterDueToday={onFilterDueToday}
                defaultExpanded={false}
                className="mb-2"
              />

              {/* Quick Actions */}
              <QuickActions
                onAddTask={onAddTask ? () => onAddTask() : undefined}
                onFilterOverdue={onFilterOverdue}
                onOpenChat={onOpenChat ? () => onOpenChat() : undefined}
                overdueCount={stats.overdue}
              />

              {/* Today's Focus (AI Suggested) */}
              {aiData.todaysFocus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                    darkMode
                      ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30'
                      : 'bg-[var(--accent)]/5 border border-[var(--accent)]/20'
                  }`}
                >
                  <Target className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                  <p className={`text-sm font-medium ${darkMode ? 'text-[#72B5E8]' : 'text-[var(--accent)]'}`}>
                    {aiData.todaysFocus}
                  </p>
                </motion.div>
              )}

              {/* Overdue Alert */}
              {stats.overdue > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onFilterOverdue}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${
                    darkMode
                      ? 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25'
                      : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                  <div className="flex-1 text-left">
                    <span className="font-semibold">{stats.overdue} overdue</span>
                    <span className={`text-sm ml-2 ${darkMode ? 'text-red-400/70' : 'text-red-600/70'}`}>
                      across team
                    </span>
                  </div>
                  <ArrowRight className={`w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`} />
                </motion.button>
              )}

              {/* Today + This Week — side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Left column: Today + Next Up */}
              <div className="space-y-4">
              {/* Today's Tasks */}
              <div className={`rounded-xl p-4 ${
                darkMode
                  ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                  : 'bg-white border border-slate-200'
              }`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Today
                </h3>

                {stats.dueToday > 0 ? (
                  <div className="space-y-2">
                    {stats.dueTodayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={onFilterDueToday}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          darkMode
                            ? 'hover:bg-slate-700/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          'bg-[var(--brand-blue)]'
                        }`} />
                        <span className={`flex-1 text-sm font-medium truncate ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {task.text}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>
                    ))}
                    {stats.dueToday > 3 && (
                      <button
                        onClick={onFilterDueToday}
                        className={`w-full text-center py-2 text-sm font-medium ${
                          darkMode ? 'text-[var(--accent-sky)]' : 'text-[var(--brand-blue)]'
                        } hover:underline`}
                      >
                        +{stats.dueToday - 3} more
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      No tasks due today
                    </span>
                  </div>
                )}
              </div>

              {/* Next Up */}
              {stats.nextTask && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Next Up
                  </h3>

                  <button
                    onClick={() => onNavigateToTasks?.()}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      darkMode
                        ? 'hover:bg-slate-700/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      stats.nextTask.priority === 'urgent' ? 'bg-red-500' :
                      stats.nextTask.priority === 'high' ? 'bg-orange-500' :
                      'bg-[var(--brand-blue)]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {stats.nextTask.text}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDueDate(stats.nextTask.due_date)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  </button>
                </div>
              )}
              </div>{/* End left column */}

              {/* Right column: Weekly Progress */}
              <div className={`rounded-xl p-4 ${
                darkMode
                  ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                  : 'bg-white border border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    This Week
                  </h3>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {stats.weeklyCompleted}/{stats.weeklyTotal} ({stats.weeklyRatio}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.weeklyRatio}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      stats.weeklyRatio >= 50 ? 'bg-[var(--success)]' :
                      stats.weeklyRatio >= 25 ? 'bg-[var(--warning)]' :
                      'bg-[var(--brand-blue)]'
                    }`}
                  />
                </div>

                {/* Daily bar chart */}
                <div className="flex items-end justify-between gap-2 mt-4 h-16">
                  {stats.weekData.map((day, index) => {
                    const height = stats.maxDaily > 0 ? (day.completed / stats.maxDaily) * 100 : 0;
                    return (
                      <div
                        key={day.dayName}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        {day.completed > 0 && (
                          <span className={`text-badge font-medium ${
                            day.isToday ? 'text-[var(--brand-blue)]' : darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {day.completed}
                          </span>
                        )}
                        <div className="w-full flex-1 flex flex-col justify-end min-h-[8px]">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: day.completed > 0 ? `${Math.max(height, 20)}%` : '4px' }}
                            transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                            className={`w-full rounded-sm ${
                              day.isToday
                                ? 'bg-[var(--brand-blue)]'
                                : day.completed > 0
                                  ? darkMode ? 'bg-[var(--brand-blue)]/50' : 'bg-[var(--brand-blue)]/30'
                                  : darkMode ? 'bg-slate-700' : 'bg-slate-100'
                            }`}
                          />
                        </div>
                        <span className={`text-badge ${
                          day.isToday
                            ? 'text-[var(--brand-blue)] font-semibold'
                            : darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {day.dayName.charAt(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              </div>{/* End 2-col grid */}

              {/* Upcoming Deadlines (next 7 days) */}
              {(() => {
                const activeTodos = todos.filter(t => !t.completed);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const upcoming = activeTodos
                  .filter(t => {
                    if (!t.due_date) return false;
                    const d = new Date(t.due_date);
                    return d > today && d <= nextWeek;
                  })
                  .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
                  .slice(0, 3);

                if (upcoming.length === 0) return null;

                return (
                  <div className={`rounded-xl p-4 ${
                    darkMode
                      ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                      : 'bg-white border border-slate-200'
                  }`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Upcoming Deadlines
                    </h3>
                    <div className="space-y-2">
                      {upcoming.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick?.(task.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            'bg-[var(--brand-blue)]'
                          }`} />
                          <span className={`flex-1 text-sm font-medium truncate ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {task.text}
                          </span>
                          <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDueDate(task.due_date!)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : activeTab === 'insights' ? (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Neglected Tasks Section */}
              {aiData.neglectedTasks.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Needs Attention
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {aiData.neglectedTasks.slice(0, 3).map((item) => (
                      <div
                        key={item.todo.id}
                        className={`p-3 rounded-lg border ${getUrgencyBg(item.urgencyLevel)}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${getUrgencyColor(item.urgencyLevel)}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {item.todo.text}
                            </p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.daysSinceActivity} days without activity
                            </p>
                            <p className={`text-xs mt-2 italic ${
                              darkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              <Brain className="w-3 h-3 inline mr-1" />
                              {item.aiSuggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {aiData.neglectedTasks.length > 3 && (
                    <button
                      onClick={() => onNavigateToTasks?.()}
                      className={`w-full text-center py-2 mt-3 text-sm font-medium ${
                        darkMode ? 'text-[var(--accent-sky)]' : 'text-[var(--brand-blue)]'
                      } hover:underline`}
                    >
                      View all {aiData.neglectedTasks.length} neglected tasks
                    </button>
                  )}
                </div>
              )}

              {/* AI Insights */}
              {aiData.insights.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      AI Insights
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {aiData.insights.map((insight, index) => {
                      const IconComponent = getInsightIconComponent(insight.icon);
                      const action = getInsightAction(insight, { onFilterOverdue, onFilterDueToday, onNavigateToTasks });
                      return (
                        <motion.button
                          key={index}
                          onClick={action}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors group ${
                            darkMode ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            insight.priority === 'high'
                              ? darkMode ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-500'
                              : insight.priority === 'medium'
                                ? darkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                                : darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-500'
                          }`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {insight.title}
                            </p>
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {insight.message}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${
                            darkMode ? 'text-slate-400' : 'text-slate-400'
                          }`} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Priority + Suggested Focus */}

              {/* Task Priority Breakdown */}
              {(() => {
                const activeTodos = todos.filter(t => !t.completed);
                const urgent = activeTodos.filter(t => t.priority === 'urgent').length;
                const high = activeTodos.filter(t => t.priority === 'high').length;
                const medium = activeTodos.filter(t => t.priority === 'medium').length;
                const low = activeTodos.filter(t => t.priority === 'low').length;
                const total = activeTodos.length || 1;

                if (activeTodos.length === 0) return null;

                return (
                  <div className={`rounded-xl p-4 ${
                    darkMode
                      ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                      : 'bg-white border border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-[var(--brand-blue)]" />
                      <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Priority Breakdown
                      </h3>
                      <span className={`text-xs ml-auto ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {activeTodos.length} active
                      </span>
                    </div>
                    {/* Stacked bar */}
                    <div className="h-3 rounded-full overflow-hidden flex bg-slate-700/30">
                      {urgent > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(urgent / total) * 100}%` }} />}
                      {high > 0 && <div className="bg-orange-500 transition-all" style={{ width: `${(high / total) * 100}%` }} />}
                      {medium > 0 && <div className="bg-[var(--brand-blue)] transition-all" style={{ width: `${(medium / total) * 100}%` }} />}
                      {low > 0 && <div className="bg-slate-500 transition-all" style={{ width: `${(low / total) * 100}%` }} />}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                      {urgent > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Urgent ({urgent})</span>
                        </div>
                      )}
                      {high > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>High ({high})</span>
                        </div>
                      )}
                      {medium > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-blue)]" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Medium ({medium})</span>
                        </div>
                      )}
                      {low > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Low ({low})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* End Priority Breakdown */}

              {/* Empty state for insights */}
              {aiData.neglectedTasks.length === 0 && aiData.insights.length === 0 && (
                <div className="text-center py-10">
                  <motion.div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      darkMode
                        ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/30'
                        : 'bg-gradient-to-br from-emerald-100 to-green-50 border border-emerald-200'
                    }`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Award className={`w-8 h-8 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  </motion.div>
                  <p className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    All caught up!
                  </p>
                  <p className={`text-sm mt-2 max-w-[200px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    No special insights right now. Keep up the excellent work!
                  </p>
                </div>
              )}

              {/* Contextual Productivity Tip */}
              {(() => {
                const activeTodos = todos.filter(t => !t.completed);
                const overdue = activeTodos.filter(t => {
                  if (!t.due_date) return false;
                  const d = new Date(t.due_date);
                  d.setHours(23, 59, 59, 999);
                  return d < new Date(new Date().setHours(0, 0, 0, 0));
                });
                const highPri = activeTodos.filter(t => t.priority === 'urgent' || t.priority === 'high');

                let tip: string;
                if (overdue.length > 5) {
                  tip = `You have ${overdue.length} overdue tasks. Consider triaging them — resolve quick wins first, then reschedule or delegate the rest.`;
                } else if (overdue.length > 0) {
                  tip = `${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} overdue. Addressing these first will reduce cognitive load and free up focus for new work.`;
                } else if (highPri.length > 5) {
                  tip = `${highPri.length} high-priority tasks active. Consider if some can be reprioritized — too many urgent items dilutes focus.`;
                } else if (activeTodos.length === 0) {
                  tip = 'All clear — no active tasks. Good time to review strategic goals or plan ahead for the week.';
                } else if (aiData.productivityScore >= 80) {
                  tip = `Productivity score of ${aiData.productivityScore} — strong performance. Maintain momentum by tackling the next high-priority item.`;
                } else if (aiData.productivityScore < 40) {
                  tip = 'Productivity score is below average. Try the two-minute rule: if a task takes less than two minutes, do it now.';
                } else {
                  tip = `${activeTodos.length} active tasks in your queue. Focus on completing one at a time rather than multitasking for better throughput.`;
                }

                return (
                  <div className={`rounded-xl p-4 ${
                    darkMode
                      ? 'bg-gradient-to-br from-[#0033A0]/15 to-[#0047CC]/15 border border-[var(--accent)]/20'
                      : 'bg-gradient-to-br from-[var(--accent)]/5 to-[#0047CC]/5 border border-[var(--accent)]/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
                      <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                        darkMode ? 'text-[#72B5E8]' : 'text-[var(--accent)]'
                      }`}>
                        Productivity Tip
                      </h3>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {tip}
                    </p>
                  </div>
                );
              })()}
            </motion.div>
          ) : activeTab === 'team' && managerData ? (
            <motion.div
              key="team"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Team Overview Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Active Tasks"
                  value={managerData.teamOverview.totalActive}
                  icon={ListTodo}
                  variant="info"
                  delay={0}
                />
                <StatCard
                  label="Overdue"
                  value={managerData.teamOverview.totalOverdue}
                  icon={AlertTriangle}
                  variant={managerData.teamOverview.totalOverdue > 0 ? 'danger' : 'success'}
                  delay={0.1}
                />
                <StatCard
                  label="This Week"
                  value={managerData.teamOverview.weeklyTeamCompleted}
                  icon={CalendarDays}
                  variant="default"
                  delay={0.2}
                />
                <StatCard
                  label="Completion"
                  value={managerData.teamOverview.teamCompletionRate}
                  icon={TrendingUp}
                  variant="success"
                  suffix="%"
                  delay={0.3}
                />
              </div>

              {/* Team Highlights */}
              {(managerData.teamOverview.topPerformer || managerData.teamOverview.needsAttention) && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <div className="space-y-2">
                    {managerData.teamOverview.topPerformer && (
                      <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <Award className="w-4 h-4" />
                        <span><strong>{managerData.teamOverview.topPerformer}</strong> — top performer this week</span>
                      </div>
                    )}
                    {managerData.teamOverview.needsAttention && (
                      <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        <AlertCircle className="w-4 h-4" />
                        <span><strong>{managerData.teamOverview.needsAttention}</strong> may need support</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Team Member Workload */}
              <div className={`rounded-xl p-4 ${
                darkMode
                  ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                  : 'bg-white border border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[var(--brand-blue)]" />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Team Workload
                  </h3>
                </div>

                <div className="space-y-3">
                  {managerData.memberStats.slice(0, 5).map((member) => (
                    <div key={member.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {member.name}
                          </span>
                          {member.workloadLevel === 'overloaded' && (
                            <span className="px-1.5 py-0.5 text-badge font-semibold rounded bg-red-500/20 text-red-500">
                              OVERLOADED
                            </span>
                          )}
                          {member.workloadLevel === 'heavy' && (
                            <span className="px-1.5 py-0.5 text-badge font-semibold rounded bg-amber-500/20 text-amber-500">
                              HEAVY
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {member.activeTasks} active
                          {member.overdueTasks > 0 && (
                            <span className="text-red-500 ml-1">({member.overdueTasks} overdue)</span>
                          )}
                        </span>
                      </div>
                      {/* Workload bar */}
                      <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            member.workloadLevel === 'overloaded' ? 'bg-red-500' :
                            member.workloadLevel === 'heavy' ? 'bg-amber-500' :
                            member.workloadLevel === 'normal' ? 'bg-[var(--brand-blue)]' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(member.activeTasks / 15 * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottlenecks & Alerts */}
              {managerData.bottlenecks.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertOctagon className="w-4 h-4 text-amber-500" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Needs Attention
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {managerData.bottlenecks.slice(0, 3).map((bottleneck, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          bottleneck.severity === 'critical'
                            ? darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                            : bottleneck.severity === 'warning'
                              ? darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                              : darkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {bottleneck.title}
                        </p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {bottleneck.description}
                        </p>
                        <p className={`text-xs mt-2 italic ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          <Lightbulb className="w-3 h-3 inline mr-1" />
                          {bottleneck.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delegation Stats */}
              {managerData.delegationStats.totalDelegated > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#0033A0]/15 to-[#0047CC]/15 border border-[var(--accent)]/20'
                    : 'bg-gradient-to-br from-[var(--accent)]/5 to-[#0047CC]/5 border border-[var(--accent)]/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-[#72B5E8]' : 'text-[var(--accent)]'
                    }`}>
                      Your Delegations
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {managerData.delegationStats.pendingDelegated}
                      </span>
                      <span className={`ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>pending</span>
                    </div>
                    <div>
                      <span className={`font-bold text-emerald-500`}>
                        {managerData.delegationStats.completedDelegated}
                      </span>
                      <span className={`ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>completed</span>
                    </div>
                    {managerData.delegationStats.overdueDelegated > 0 && (
                      <div>
                        <span className="font-bold text-red-500">
                          {managerData.delegationStats.overdueDelegated}
                        </span>
                        <span className={`ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>overdue</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Team Completions */}
              {managerData.recentTeamCompletions.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-[var(--surface-2)] border border-[var(--border)]'
                    : 'bg-white border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Recent Wins
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {managerData.recentTeamCompletions.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 text-sm ${
                          darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="truncate flex-1">{task.text}</span>
                        <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {task.assigned_to}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI-Powered Task Decomposition Suggestions */}
              {complexTaskAnalysis.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#0033A0]/15 to-[#0047CC]/15 border border-[var(--accent)]/20'
                    : 'bg-gradient-to-br from-[var(--accent)]/5 to-[#0047CC]/5 border border-[var(--accent)]/20'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-[#72B5E8]' : 'text-[var(--accent)]'
                    }`}>
                      AI Task Decomposition
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {complexTaskAnalysis.slice(0, 2).map(({ task, analysis }) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg ${darkMode ? 'bg-black/20' : 'bg-white/60'}`}
                      >
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 text-badge font-semibold rounded ${
                            analysis.estimatedComplexity === 'high'
                              ? 'bg-red-500/20 text-red-500'
                              : analysis.estimatedComplexity === 'medium'
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-emerald-500/20 text-emerald-500'
                          }`}>
                            {analysis.estimatedComplexity.toUpperCase()} COMPLEXITY
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            → {analysis.suggestedSubtasks.length} subtasks
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {analysis.suggestedSubtasks.slice(0, 4).map((subtask, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-badge ${
                                darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <GitBranch className="w-3 h-3" />
                              {subtask.agentType.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className={`text-xs mt-3 ${darkMode ? 'text-[#72B5E8]' : 'text-[var(--accent)]'}`}>
                    <Zap className="w-3 h-3 inline mr-1" />
                    Complex tasks can be broken down using AI agents
                  </p>
                </div>
              )}

              {/* AI-Powered Bottleneck Resolution */}
              {orchestratorSuggestions.length > 0 && (
                <div className={`rounded-xl p-4 ${
                  darkMode
                    ? 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20'
                    : 'bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-cyan-500" />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                      darkMode ? 'text-cyan-300' : 'text-cyan-600'
                    }`}>
                      AI Resolution Suggestions
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {orchestratorSuggestions.slice(0, 2).map((suggestion, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${darkMode ? 'bg-black/20' : 'bg-white/60'}`}
                      >
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {suggestion.suggestedAction}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-badge ${
                            darkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            <Brain className="w-3 h-3" />
                            {suggestion.agentRecommendation.replace('_', ' ')} can help
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for team tab */}
              {managerData.memberStats.length === 0 && (
                <div className="text-center py-10">
                  <motion.div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      darkMode
                        ? 'bg-gradient-to-br from-[#0033A0]/20 to-[#0047CC]/10 border border-blue-500/30'
                        : 'bg-gradient-to-br from-[#0033A0]/10 to-[#0047CC]/5 border border-blue-200'
                    }`}
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Users className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  </motion.div>
                  <p className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    No team data yet
                  </p>
                  <p className={`text-sm mt-2 max-w-[220px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Assign tasks to team members to see their productivity stats here
                  </p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
