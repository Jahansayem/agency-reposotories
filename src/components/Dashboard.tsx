'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  Flame,
  Target,
  Users,
  ListTodo,
  Zap,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
} from 'lucide-react';
import { Todo, AuthUser } from '@/types/todo';

interface DashboardProps {
  todos: Todo[];
  currentUser: AuthUser;
  users: string[];
  onNavigateToTasks: () => void;
  onAddTask: () => void;
  onFilterOverdue: () => void;
  onFilterDueToday: () => void;
  onFilterMyTasks: () => void;
  darkMode?: boolean;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  completed: number;
  isToday: boolean;
}

export default function Dashboard({
  todos,
  currentUser,
  users,
  onNavigateToTasks,
  onAddTask,
  onFilterOverdue,
  onFilterDueToday,
  onFilterMyTasks,
  darkMode = false,
}: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    const myTasks = activeTodos.filter(t => t.assigned_to === currentUser.name);

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

    const urgent = activeTodos.filter(t => t.priority === 'urgent' || t.priority === 'high');

    // Weekly completion data
    const weekData: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const completed = completedTodos.filter(t => {
        const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
        return updatedAt >= date && updatedAt <= dateEnd;
      }).length;

      weekData.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        completed,
        isToday: i === 0,
      });
    }

    const weeklyCompleted = weekData.reduce((sum, d) => sum + d.completed, 0);
    const maxDaily = Math.max(...weekData.map(d => d.completed), 1);

    return {
      total: todos.length,
      active: activeTodos.length,
      completed: completedTodos.length,
      myTasks: myTasks.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      urgent: urgent.length,
      weekData,
      weeklyCompleted,
      maxDaily,
      completionRate: todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0,
    };
  }, [todos, currentUser.name]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
    if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
    return { text: 'Good evening', Icon: Moon };
  };

  const greeting = getGreeting();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0A1628]' : 'bg-[var(--background)]'}`}>
      {/* Hero Header */}
      <div className={`relative overflow-hidden ${darkMode ? 'bg-[var(--gradient-hero)]' : 'bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-blue)] to-[var(--brand-sky)]'}`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--brand-sky)]/20 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Greeting */}
            <div className="flex items-center gap-3 mb-2">
              <greeting.Icon className="w-6 h-6 text-[var(--brand-sky)]" />
              <span className="text-[var(--brand-sky)] font-medium">{greeting.text}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {currentUser.name}
            </h1>

            <p className="text-white/70 text-lg">
              {stats.active === 0
                ? "All caught up! No active tasks."
                : `You have ${stats.active} active task${stats.active !== 1 ? 's' : ''}`}
              {stats.overdue > 0 && (
                <span className="text-red-300"> including {stats.overdue} overdue</span>
              )}
            </p>

            {/* Quick Stats Row */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-white text-sm font-medium">
                  {currentUser.streak_count || 0} day streak
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm font-medium">
                  {stats.weeklyCompleted} completed this week
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 -mt-6 relative z-10">
        {/* Action Cards - Priority Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          {/* Overdue Card */}
          <button
            onClick={onFilterOverdue}
            disabled={stats.overdue === 0}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
              stats.overdue > 0
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02]'
                : darkMode
                  ? 'bg-[var(--surface)] border border-[var(--border)]'
                  : 'bg-white border border-[var(--border)]'
            }`}
          >
            <div className={`flex items-center justify-between mb-3 ${stats.overdue > 0 ? 'text-white' : 'text-[var(--text-muted)]'}`}>
              <AlertTriangle className="w-5 h-5" />
              {stats.overdue > 0 && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={`text-3xl font-bold ${stats.overdue > 0 ? 'text-white' : 'text-[var(--foreground)]'}`}>
              {stats.overdue}
            </p>
            <p className={`text-sm font-medium ${stats.overdue > 0 ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
              Overdue
            </p>
          </button>

          {/* Due Today Card */}
          <button
            onClick={onFilterDueToday}
            disabled={stats.dueToday === 0}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
              stats.dueToday > 0
                ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02]'
                : darkMode
                  ? 'bg-[var(--surface)] border border-[var(--border)]'
                  : 'bg-white border border-[var(--border)]'
            }`}
          >
            <div className={`flex items-center justify-between mb-3 ${stats.dueToday > 0 ? 'text-white' : 'text-[var(--text-muted)]'}`}>
              <Calendar className="w-5 h-5" />
              {stats.dueToday > 0 && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={`text-3xl font-bold ${stats.dueToday > 0 ? 'text-white' : 'text-[var(--foreground)]'}`}>
              {stats.dueToday}
            </p>
            <p className={`text-sm font-medium ${stats.dueToday > 0 ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
              Due Today
            </p>
          </button>

          {/* My Tasks Card */}
          <button
            onClick={onFilterMyTasks}
            disabled={stats.myTasks === 0}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
              stats.myTasks > 0
                ? 'bg-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/90 shadow-lg shadow-[var(--brand-blue)]/20 hover:shadow-[var(--brand-blue)]/30 hover:scale-[1.02]'
                : darkMode
                  ? 'bg-[var(--surface)] border border-[var(--border)]'
                  : 'bg-white border border-[var(--border)]'
            }`}
          >
            <div className={`flex items-center justify-between mb-3 ${stats.myTasks > 0 ? 'text-white' : 'text-[var(--text-muted)]'}`}>
              <Target className="w-5 h-5" />
              {stats.myTasks > 0 && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={`text-3xl font-bold ${stats.myTasks > 0 ? 'text-white' : 'text-[var(--foreground)]'}`}>
              {stats.myTasks}
            </p>
            <p className={`text-sm font-medium ${stats.myTasks > 0 ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
              My Tasks
            </p>
          </button>
        </motion.div>

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-5 mb-6 ${darkMode ? 'bg-[var(--surface)]' : 'bg-white'} border border-[var(--border)] shadow-sm`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">This Week</h3>
              <p className="text-sm text-[var(--text-muted)]">{stats.weeklyCompleted} tasks completed</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-[var(--success)]" />
              <span className="font-medium text-[var(--success)]">{stats.completionRate}%</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-24">
            {stats.weekData.map((day, index) => {
              const height = stats.maxDaily > 0 ? (day.completed / stats.maxDaily) * 100 : 0;
              return (
                <div key={day.dayName} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 8)}%` }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.4 }}
                    className={`w-full rounded-t-md ${
                      day.isToday
                        ? 'bg-[var(--brand-blue)]'
                        : day.completed > 0
                          ? 'bg-[var(--brand-blue)]/40'
                          : darkMode ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface-2)]'
                    }`}
                  />
                  <span className={`text-xs font-medium ${day.isToday ? 'text-[var(--brand-blue)]' : 'text-[var(--text-muted)]'}`}>
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <button
            onClick={onAddTask}
            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-sky)] text-white font-semibold shadow-lg shadow-[var(--brand-blue)]/20 hover:shadow-[var(--brand-blue)]/30 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-5 h-5" />
            Add New Task
          </button>

          <button
            onClick={onNavigateToTasks}
            className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-semibold transition-all hover:scale-[1.02] ${
              darkMode
                ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                : 'bg-white border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            View All Tasks
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Team Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-2xl p-5 ${darkMode ? 'bg-[var(--surface)]' : 'bg-white'} border border-[var(--border)] shadow-sm`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[var(--text-muted)]" />
            <h3 className="font-semibold text-[var(--foreground)]">Team</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {users.map((user, index) => {
              const userTasks = todos.filter(t => t.assigned_to === user && !t.completed).length;
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
              const color = colors[index % colors.length];

              return (
                <div
                  key={user}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full ${darkMode ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface-2)]'}`}
                >
                  <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold`}>
                    {user.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">{user}</span>
                  {userTasks > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                      {userTasks}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
