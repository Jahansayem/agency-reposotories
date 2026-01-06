'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  BarChart3,
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

// Harmonious team colors - all derived from the brand palette
const TEAM_COLORS = [
  { bg: 'bg-[#0033A0]', text: 'text-white' },           // Brand blue
  { bg: 'bg-[#1E3A5F]', text: 'text-white' },           // Navy
  { bg: 'bg-[#72B5E8]', text: 'text-[#0A1628]' },       // Sky blue
  { bg: 'bg-[#C9A227]', text: 'text-[#0A1628]' },       // Gold
  { bg: 'bg-[#4A6FA5]', text: 'text-white' },           // Muted blue
  { bg: 'bg-[#2D5F8A]', text: 'text-white' },           // Steel blue
];

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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0A1628]' : 'bg-slate-50'}`}>
      {/* Hero Header with refined gradient */}
      <div className="relative overflow-hidden">
        {/* Background - sophisticated layered gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #0033A0 50%, #1E3A5F 100%)',
          }}
        />

        {/* Subtle animated accent */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-20 -right-20 w-[600px] h-[600px]"
            style={{
              background: 'radial-gradient(circle, rgba(114, 181, 232, 0.15) 0%, transparent 70%)',
            }}
          />
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="absolute -bottom-32 -left-20 w-[500px] h-[500px]"
            style={{
              background: 'radial-gradient(circle, rgba(201, 162, 39, 0.1) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Greeting */}
            <motion.div variants={itemVariants} className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <greeting.Icon className="w-5 h-5 text-[#C9A227]" />
              </motion.div>
              <span className="text-[#C9A227] font-medium tracking-widest uppercase text-xs">{greeting.text}</span>
            </motion.div>

            {/* Name */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight"
            >
              {currentUser.name}
            </motion.h1>

            {/* Status message */}
            <motion.p variants={itemVariants} className="text-white/70 text-lg">
              {stats.active === 0
                ? "All caught up! No active tasks."
                : (
                  <>
                    You have <span className="font-semibold text-white">{stats.active}</span> active task{stats.active !== 1 ? 's' : ''}
                    {stats.overdue > 0 && (
                      <span className="text-[#F87171] font-medium"> including {stats.overdue} overdue</span>
                    )}
                  </>
                )}
            </motion.p>

            {/* Quick Stats Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mt-8">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm rounded-full px-5 py-2.5 border border-white/10"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Flame className="w-4 h-4 text-[#C9A227]" />
                </motion.div>
                <span className="text-white/90 text-sm font-medium">
                  {currentUser.streak_count || 0} day streak
                </span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm rounded-full px-5 py-2.5 border border-white/10"
              >
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="text-white/90 text-sm font-medium">
                  {stats.weeklyCompleted} completed this week
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 -mt-4 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Priority Action Cards - Refined color system */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Overdue Card - Coral red, not harsh */}
            <motion.button
              onClick={onFilterOverdue}
              disabled={stats.overdue === 0}
              onHoverStart={() => setHoveredCard('overdue')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.overdue > 0 ? { scale: 1.02, y: -4 } : {}}
              whileTap={stats.overdue > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.overdue > 0
                  ? 'bg-gradient-to-br from-[#EF4444] to-[#DC2626] shadow-lg shadow-red-500/20'
                  : darkMode
                    ? 'bg-[#1E293B] border border-[#334155]'
                    : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    stats.overdue > 0
                      ? 'bg-white/20'
                      : darkMode ? 'bg-red-500/10' : 'bg-red-50'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${stats.overdue > 0 ? 'text-white' : 'text-red-500'}`} />
                  </div>
                  <AnimatePresence>
                    {stats.overdue > 0 && hoveredCard === 'overdue' && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <ChevronRight className="w-5 h-5 text-white/80" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className={`text-4xl font-bold tracking-tight ${
                  stats.overdue > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {stats.overdue}
                </p>
                <p className={`text-sm font-medium mt-1 ${
                  stats.overdue > 0 ? 'text-white/80' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Overdue
                </p>
              </div>
            </motion.button>

            {/* Due Today Card - Warm amber when active, elegant when empty */}
            <motion.button
              onClick={onFilterDueToday}
              disabled={stats.dueToday === 0}
              onHoverStart={() => setHoveredCard('today')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.dueToday > 0 ? { scale: 1.02, y: -4 } : {}}
              whileTap={stats.dueToday > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.dueToday > 0
                  ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] shadow-lg shadow-amber-500/20'
                  : darkMode
                    ? 'bg-[#1E293B] border border-[#334155]'
                    : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    stats.dueToday > 0
                      ? 'bg-white/20'
                      : darkMode ? 'bg-amber-500/10' : 'bg-amber-50'
                  }`}>
                    <Calendar className={`w-5 h-5 ${stats.dueToday > 0 ? 'text-white' : 'text-amber-600'}`} />
                  </div>
                  <AnimatePresence>
                    {stats.dueToday > 0 && hoveredCard === 'today' && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <ChevronRight className="w-5 h-5 text-white/80" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className={`text-4xl font-bold tracking-tight ${
                  stats.dueToday > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {stats.dueToday}
                </p>
                <p className={`text-sm font-medium mt-1 ${
                  stats.dueToday > 0 ? 'text-white/80' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Due Today
                </p>
              </div>
            </motion.button>

            {/* My Tasks Card - Brand blue when active */}
            <motion.button
              onClick={onFilterMyTasks}
              disabled={stats.myTasks === 0}
              onHoverStart={() => setHoveredCard('mytasks')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.myTasks > 0 ? { scale: 1.02, y: -4 } : {}}
              whileTap={stats.myTasks > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.myTasks > 0
                  ? 'bg-gradient-to-br from-[#0033A0] to-[#0052CC] shadow-lg shadow-blue-600/20'
                  : darkMode
                    ? 'bg-[#1E293B] border border-[#334155]'
                    : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    stats.myTasks > 0
                      ? 'bg-white/20'
                      : darkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                  }`}>
                    <Target className={`w-5 h-5 ${stats.myTasks > 0 ? 'text-white' : 'text-[#0033A0]'}`} />
                  </div>
                  <AnimatePresence>
                    {stats.myTasks > 0 && hoveredCard === 'mytasks' && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <ChevronRight className="w-5 h-5 text-white/80" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className={`text-4xl font-bold tracking-tight ${
                  stats.myTasks > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {stats.myTasks}
                </p>
                <p className={`text-sm font-medium mt-1 ${
                  stats.myTasks > 0 ? 'text-white/80' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  My Tasks
                </p>
              </div>
            </motion.button>
          </motion.div>

          {/* Weekly Progress Chart - Clean and professional */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 mb-8 ${
              darkMode ? 'bg-[#1E293B] border border-[#334155]' : 'bg-white border border-slate-200'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-[#0033A0]/20' : 'bg-[#0033A0]/10'}`}>
                  <BarChart3 className="w-5 h-5 text-[#0033A0]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>This Week</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {stats.weeklyCompleted} tasks completed
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10"
              >
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                <span className="font-semibold text-[#10B981]">{stats.completionRate}%</span>
              </motion.div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-32">
              {stats.weekData.map((day, index) => {
                const height = stats.maxDaily > 0 ? (day.completed / stats.maxDaily) * 100 : 0;
                return (
                  <motion.div
                    key={day.dayName}
                    className="flex-1 flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    {/* Count label */}
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className={`text-xs font-semibold min-h-[16px] ${
                        day.isToday
                          ? darkMode ? 'text-[#72B5E8]' : 'text-[#0033A0]'
                          : day.completed > 0
                            ? (darkMode ? 'text-slate-300' : 'text-slate-600')
                            : 'text-transparent'
                      }`}
                    >
                      {day.completed > 0 ? day.completed : '0'}
                    </motion.span>

                    {/* Bar container */}
                    <div className="w-full flex-1 flex flex-col justify-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 8)}%` }}
                        transition={{
                          delay: 0.4 + index * 0.06,
                          duration: 0.6,
                          type: 'spring',
                          stiffness: 100,
                        }}
                        className={`w-full rounded-md ${
                          day.isToday
                            ? 'bg-[#0033A0]'
                            : day.completed > 0
                              ? darkMode ? 'bg-[#0033A0]/40' : 'bg-[#0033A0]/25'
                              : darkMode ? 'bg-slate-700' : 'bg-slate-100'
                        }`}
                      />
                    </div>

                    {/* Day label */}
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                      day.isToday
                        ? darkMode
                          ? 'bg-[#72B5E8]/20 text-[#72B5E8] font-semibold'
                          : 'bg-[#0033A0]/10 text-[#0033A0] font-semibold'
                        : darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {day.dayName}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Actions - Refined buttons */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <motion.button
              onClick={onAddTask}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="group relative flex items-center justify-center gap-3 p-5 rounded-2xl bg-[#0033A0] text-white font-semibold shadow-lg shadow-[#0033A0]/25 overflow-hidden transition-all hover:shadow-xl hover:shadow-[#0033A0]/30"
            >
              {/* Subtle shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <Plus className="w-5 h-5 relative" />
              <span className="relative">Add New Task</span>
            </motion.button>

            <motion.button
              onClick={onNavigateToTasks}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={`group flex items-center justify-center gap-3 p-5 rounded-2xl font-semibold transition-all border ${
                darkMode
                  ? 'bg-[#1E293B] border-[#334155] text-white hover:border-[#72B5E8]/50 hover:bg-[#1E293B]/80'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-[#0033A0]/30 hover:shadow-md'
              }`}
            >
              <ListTodo className="w-5 h-5" />
              <span>View All Tasks</span>
              <motion.div
                className="ml-1"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4 opacity-60" />
              </motion.div>
            </motion.button>
          </motion.div>

          {/* Team Activity - Harmonious colors */}
          <motion.div
            variants={itemVariants}
            className={`rounded-2xl p-6 ${
              darkMode ? 'bg-[#1E293B] border border-[#334155]' : 'bg-white border border-slate-200'
            } shadow-sm`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-[#72B5E8]/20' : 'bg-[#72B5E8]/10'}`}>
                <Users className="w-5 h-5 text-[#0033A0]" />
              </div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Team</h3>
            </div>

            <div className="flex flex-wrap gap-3">
              {users.map((user, index) => {
                const userTasks = todos.filter(t => t.assigned_to === user && !t.completed).length;
                const colorScheme = TEAM_COLORS[index % TEAM_COLORS.length];

                return (
                  <motion.div
                    key={user}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-default transition-colors ${
                      darkMode
                        ? 'bg-slate-800/50 hover:bg-slate-800'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center text-sm font-bold`}>
                      {user.charAt(0)}
                    </div>
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {user}
                    </span>
                    {userTasks > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          darkMode
                            ? 'bg-[#72B5E8]/20 text-[#72B5E8]'
                            : 'bg-[#0033A0]/10 text-[#0033A0]'
                        }`}
                      >
                        {userTasks}
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
