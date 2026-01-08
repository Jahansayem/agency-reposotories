'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Plus,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Clock,
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

interface UpcomingTask {
  id: string;
  text: string;
  due_date: string;
  priority: string;
}

export default function Dashboard({
  todos,
  currentUser,
  onNavigateToTasks,
  onAddTask,
  onFilterOverdue,
  onFilterDueToday,
  darkMode = false,
}: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    // Get first upcoming task for "Next Up" display
    const nextTask: UpcomingTask | null = upcoming.length > 0
      ? {
          id: upcoming[0].id,
          text: upcoming[0].text,
          due_date: upcoming[0].due_date!,
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

    let totalCreatedThisWeek = 0;

    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const completed = completedTodos.filter(t => {
        if (!t.completed) return false;
        const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
        return updatedAt >= date && updatedAt <= dateEnd;
      }).length;

      // Count tasks created this week (for context)
      const createdThisDay = todos.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= date && createdAt <= dateEnd;
      }).length;
      totalCreatedThisWeek += createdThisDay;

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

    // Weekly ratio: completed vs total tasks touched this week
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
      hasActionableWork: overdue.length > 0 || dueToday.length > 0 || nextTask !== null,
    };
  }, [todos]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
    if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
    return { text: 'Good evening', Icon: Moon };
  };

  const greeting = getGreeting();

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0A1628]' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: darkMode
              ? 'linear-gradient(135deg, #0A1628 0%, #0033A0 50%, #1E3A5F 100%)'
              : 'linear-gradient(135deg, #0033A0 0%, #0047CC 50%, #1E3A5F 100%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          {/* Greeting row */}
          <div className="flex items-center gap-2 mb-1">
            <greeting.Icon className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm font-medium">{greeting.text}</span>
          </div>

          {/* Name */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            {currentUser.name}
          </h1>

          {/* Single contextual stat */}
          <p className="text-white/70 text-sm">
            {stats.weeklyCompleted} completed this week
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-6 space-y-5">
        {/* Overdue Alert - Primary CTA when there are overdue tasks */}
        {stats.overdue > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onFilterOverdue}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-[#0033A0] text-white hover:bg-[#002580] transition-colors group shadow-lg shadow-[#0033A0]/20"
          >
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1 text-left">
              <span className="font-semibold">{stats.overdue} overdue task{stats.overdue !== 1 ? 's' : ''}</span>
              <span className="text-white/70 text-sm ml-2">need attention</span>
            </div>
            <span className="text-sm font-medium group-hover:underline flex items-center gap-1">
              View overdue <ArrowRight className="w-4 h-4" />
            </span>
          </motion.button>
        )}

        {/* Today's Tasks */}
        <div className={`rounded-2xl p-5 ${
          darkMode
            ? 'bg-[#1E293B] border border-[#334155]'
            : 'bg-white border border-slate-200'
        }`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    darkMode
                      ? 'hover:bg-slate-700/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' :
                    'bg-[#0033A0]'
                  }`} />
                  <span className={`flex-1 text-sm font-medium truncate ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {task.text}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
              {stats.dueToday > 3 && (
                <button
                  onClick={onFilterDueToday}
                  className={`w-full text-center py-2 text-sm font-medium ${
                    darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'
                  } hover:underline`}
                >
                  +{stats.dueToday - 3} more due today
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                No tasks due today
              </span>
            </div>
          )}
        </div>

        {/* Next Up - only show if there's something coming */}
        {stats.nextTask && (
          <div className={`rounded-2xl p-5 ${
            darkMode
              ? 'bg-[#1E293B] border border-[#334155]'
              : 'bg-white border border-slate-200'
          }`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Next Up
            </h3>

            <button
              onClick={onNavigateToTasks}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                darkMode
                  ? 'hover:bg-slate-700/50'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-2 h-2 mt-2 rounded-full ${
                stats.nextTask.priority === 'urgent' ? 'bg-red-500' :
                stats.nextTask.priority === 'high' ? 'bg-orange-500' :
                'bg-[#0033A0]'
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
              <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
            </button>
          </div>
        )}

        {/* Weekly Progress */}
        <div className={`rounded-2xl p-5 ${
          darkMode
            ? 'bg-[#1E293B] border border-[#334155]'
            : 'bg-white border border-slate-200'
        }`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Weekly Progress
              </h3>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {stats.weeklyCompleted} of {stats.weeklyTotal} tasks completed ({stats.weeklyRatio}%)
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className={`h-2 rounded-full mb-5 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.weeklyRatio}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`h-full rounded-full ${
                stats.weeklyRatio >= 50 ? 'bg-[#10B981]' :
                stats.weeklyRatio >= 25 ? 'bg-[#F59E0B]' :
                'bg-[#0033A0]'
              }`}
            />
          </div>

          {/* Daily breakdown */}
          <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Tasks completed each day
          </p>

          <div className="flex items-end justify-between gap-3 h-20">
            {stats.weekData.map((day, index) => {
              const height = stats.maxDaily > 0 ? (day.completed / stats.maxDaily) * 100 : 0;
              return (
                <motion.div
                  key={day.dayName}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className={`text-xs font-semibold ${
                    day.completed > 0
                      ? darkMode ? 'text-white' : 'text-slate-700'
                      : darkMode ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    {day.completed}
                  </span>

                  <div className="w-full flex-1 flex flex-col justify-end min-h-[20px]">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 8)}%` }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.4 }}
                      className={`w-full rounded-sm ${
                        day.isToday
                          ? 'bg-[#0033A0]'
                          : day.completed > 0
                            ? darkMode ? 'bg-[#0033A0]/40' : 'bg-[#0033A0]/20'
                            : darkMode ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                    />
                  </div>

                  <span className={`text-xs ${
                    day.isToday
                      ? 'text-[#0033A0] font-semibold'
                      : darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {day.dayName}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons - Priority based on context */}
        <div className="grid grid-cols-2 gap-4">
          {stats.overdue > 0 ? (
            <>
              {/* When overdue exists, View All is secondary */}
              <motion.button
                onClick={onNavigateToTasks}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-semibold transition-colors ${
                  darkMode
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>View All Tasks</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={onAddTask}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-semibold transition-colors ${
                  darkMode
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Add Task</span>
              </motion.button>
            </>
          ) : (
            <>
              {/* No overdue - Add Task can be more prominent */}
              <motion.button
                onClick={onAddTask}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[#0033A0] text-white font-semibold shadow-lg shadow-[#0033A0]/20 hover:bg-[#0028A0] transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Task</span>
              </motion.button>

              <motion.button
                onClick={onNavigateToTasks}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-semibold transition-colors ${
                  darkMode
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>View All Tasks</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
