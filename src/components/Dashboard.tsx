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
  Sparkles,
} from 'lucide-react';
import { Todo, AuthUser } from '@/types/todo';

// Animated grid background component
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dashboard-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(114, 181, 232, 0.08)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="grid-mask">
            <rect width="100%" height="100%" fill="url(#grid-fade)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#dashboard-grid)"
          mask="url(#grid-mask)"
        />
      </svg>
      {/* Animated pulse lines */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#72B5E8]/30 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#C9A227]/20 to-transparent"
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: 2 }}
      />
    </div>
  );
}

// Floating geometric shapes
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large subtle circle */}
      <motion.div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(114, 181, 232, 0.3) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Gold accent orb */}
      <motion.div
        className="absolute bottom-10 left-10 w-40 h-40 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(201, 162, 39, 0.4) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          y: [0, -20, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Floating diamond */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-4 h-4 rotate-45 bg-[#72B5E8]/10 rounded-sm"
        animate={{
          y: [0, -15, 0],
          rotate: [45, 90, 45],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Small dots */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#72B5E8]/20"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 20}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
}

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

    // Weekly completion data (Mon-Fri of current week)
    const weekData: WeekDay[] = [];

    // Find Monday of current week
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    // Generate Mon-Fri of current week
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
    <div className={`min-h-screen relative ${darkMode ? 'bg-[#0A1628]' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50'}`}>
      {/* Global animated grid background */}
      <AnimatedGrid />
      <FloatingShapes />

      {/* Hero Header with refined gradient */}
      <div className="relative overflow-hidden">
        {/* Background - sophisticated layered gradient with depth */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #0033A0 40%, #1E3A5F 70%, #0A1628 100%)',
          }}
        />

        {/* Enhanced animated accents with more depth */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary glow */}
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-20 -right-20 w-[600px] h-[600px]"
            style={{
              background: 'radial-gradient(circle, rgba(114, 181, 232, 0.2) 0%, transparent 60%)',
            }}
          />
          {/* Secondary sky blue glow */}
          <motion.div
            animate={{
              opacity: [0.15, 0.3, 0.15],
              x: [0, 20, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/4 right-1/3 w-[400px] h-[400px]"
            style={{
              background: 'radial-gradient(circle, rgba(114, 181, 232, 0.15) 0%, transparent 70%)',
            }}
          />
          {/* Gold accent */}
          <motion.div
            animate={{
              opacity: [0.1, 0.25, 0.1],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="absolute -bottom-32 -left-20 w-[500px] h-[500px]"
            style={{
              background: 'radial-gradient(circle, rgba(201, 162, 39, 0.15) 0%, transparent 60%)',
            }}
          />
          {/* Animated line accent */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(114, 181, 232, 0.3) 50%, transparent 100%)',
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
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
            {/* Greeting badge */}
            <motion.div variants={itemVariants} className="flex items-center gap-3 mb-4">
              <motion.div
                className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <greeting.Icon className="w-4 h-4 text-[#C9A227]" />
                </motion.div>
                <span className="text-[#C9A227] font-semibold tracking-wide uppercase text-xs">{greeting.text}</span>
              </motion.div>
            </motion.div>

            {/* Name with enhanced styling */}
            <motion.div variants={itemVariants} className="relative inline-block mb-3">
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight"
                style={{ textShadow: '0 4px 30px rgba(0, 51, 160, 0.3)' }}
              >
                {currentUser.name}
              </motion.h1>
              {/* Sparkle decoration */}
              <motion.div
                className="absolute -top-2 -right-6"
                animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-5 h-5 text-[#C9A227]/60" />
              </motion.div>
            </motion.div>

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
          {/* Priority Action Cards - Enhanced with glassmorphism */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Overdue Card */}
            <motion.button
              onClick={onFilterOverdue}
              disabled={stats.overdue === 0}
              onHoverStart={() => setHoveredCard('overdue')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.overdue > 0 ? { scale: 1.03, y: -6 } : { scale: 1.01 }}
              whileTap={stats.overdue > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.overdue > 0
                  ? 'bg-gradient-to-br from-[#EF4444] via-[#DC2626] to-[#B91C1C] shadow-xl shadow-red-500/30'
                  : darkMode
                    ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50 hover:border-red-500/30'
                    : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm hover:shadow-md hover:border-red-200'
              }`}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                animate={hoveredCard === 'overdue' ? { translateX: '200%' } : {}}
                transition={{ duration: 0.6 }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    className={`p-3 rounded-xl ${
                      stats.overdue > 0
                        ? 'bg-white/20 backdrop-blur-sm'
                        : darkMode ? 'bg-red-500/10' : 'bg-red-50'
                    }`}
                    animate={stats.overdue > 0 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className={`w-5 h-5 ${stats.overdue > 0 ? 'text-white' : 'text-red-500'}`} />
                  </motion.div>
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
                <motion.p
                  className={`text-4xl font-bold tracking-tight ${
                    stats.overdue > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-800'
                  }`}
                  initial={{ scale: 1 }}
                  animate={stats.overdue > 0 ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {stats.overdue}
                </motion.p>
                <p className={`text-sm font-medium mt-1.5 ${
                  stats.overdue > 0 ? 'text-white/90' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Overdue
                </p>
              </div>
            </motion.button>

            {/* Due Today Card */}
            <motion.button
              onClick={onFilterDueToday}
              disabled={stats.dueToday === 0}
              onHoverStart={() => setHoveredCard('today')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.dueToday > 0 ? { scale: 1.03, y: -6 } : { scale: 1.01 }}
              whileTap={stats.dueToday > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.dueToday > 0
                  ? 'bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] shadow-xl shadow-amber-500/30'
                  : darkMode
                    ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50 hover:border-amber-500/30'
                    : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm hover:shadow-md hover:border-amber-200'
              }`}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                animate={hoveredCard === 'today' ? { translateX: '200%' } : {}}
                transition={{ duration: 0.6 }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${
                    stats.dueToday > 0
                      ? 'bg-white/20 backdrop-blur-sm'
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
                <p className={`text-sm font-medium mt-1.5 ${
                  stats.dueToday > 0 ? 'text-white/90' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Due Today
                </p>
              </div>
            </motion.button>

            {/* My Tasks Card */}
            <motion.button
              onClick={onFilterMyTasks}
              disabled={stats.myTasks === 0}
              onHoverStart={() => setHoveredCard('mytasks')}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={stats.myTasks > 0 ? { scale: 1.03, y: -6 } : { scale: 1.01 }}
              whileTap={stats.myTasks > 0 ? { scale: 0.98 } : {}}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                stats.myTasks > 0
                  ? 'bg-gradient-to-br from-[#0033A0] via-[#0047CC] to-[#1E3A5F] shadow-xl shadow-blue-600/30'
                  : darkMode
                    ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50 hover:border-blue-500/30'
                    : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm hover:shadow-md hover:border-blue-200'
              }`}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                animate={hoveredCard === 'mytasks' ? { translateX: '200%' } : {}}
                transition={{ duration: 0.6 }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${
                    stats.myTasks > 0
                      ? 'bg-white/20 backdrop-blur-sm'
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
                <p className={`text-sm font-medium mt-1.5 ${
                  stats.myTasks > 0 ? 'text-white/90' : darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  My Tasks
                </p>
              </div>
            </motion.button>
          </motion.div>

          {/* Weekly Progress Chart - Enhanced with glassmorphism */}
          <motion.div
            variants={itemVariants}
            className={`relative overflow-hidden rounded-2xl p-6 mb-8 ${
              darkMode
                ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50'
                : 'bg-white/80 backdrop-blur-xl border border-slate-200/50'
            } shadow-sm`}
          >
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#72B5E8]/10 to-transparent rounded-bl-full" />

            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  className={`p-3 rounded-xl ${darkMode ? 'bg-[#0033A0]/20' : 'bg-gradient-to-br from-[#0033A0]/10 to-[#72B5E8]/10'}`}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <BarChart3 className="w-5 h-5 text-[#0033A0]" />
                </motion.div>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>This Week</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="font-semibold text-[#0033A0]">{stats.weeklyCompleted}</span> tasks completed
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 border border-[#10B981]/20"
              >
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                </motion.div>
                <span className="font-bold text-[#10B981]">{stats.completionRate}%</span>
              </motion.div>
            </div>

            {/* Enhanced Bar Chart */}
            <div className="flex items-end justify-between gap-3 sm:gap-4 h-36">
              {stats.weekData.map((day, index) => {
                const height = stats.maxDaily > 0 ? (day.completed / stats.maxDaily) * 100 : 0;
                return (
                  <motion.div
                    key={day.dayName}
                    className="flex-1 flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                  >
                    {/* Count label with animation */}
                    <motion.span
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.08 }}
                      className={`text-sm font-bold min-h-[20px] ${
                        day.isToday
                          ? 'text-[#0033A0]'
                          : day.completed > 0
                            ? (darkMode ? 'text-slate-300' : 'text-slate-700')
                            : darkMode ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {day.completed}
                    </motion.span>

                    {/* Bar container with glow effect */}
                    <div className="w-full flex-1 flex flex-col justify-end relative">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 6)}%` }}
                        transition={{
                          delay: 0.4 + index * 0.08,
                          duration: 0.8,
                          type: 'spring',
                          stiffness: 80,
                        }}
                        className={`w-full rounded-lg relative overflow-hidden ${
                          day.isToday
                            ? 'bg-gradient-to-t from-[#0033A0] to-[#0047CC] shadow-lg shadow-[#0033A0]/30'
                            : day.completed > 0
                              ? darkMode
                                ? 'bg-gradient-to-t from-[#0033A0]/50 to-[#72B5E8]/30'
                                : 'bg-gradient-to-t from-[#0033A0]/30 to-[#72B5E8]/20'
                              : darkMode ? 'bg-slate-700/50' : 'bg-slate-100'
                        }`}
                      >
                        {/* Shimmer effect on today's bar */}
                        {day.isToday && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent"
                            animate={{ y: ['100%', '-100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </motion.div>
                    </div>

                    {/* Day label */}
                    <motion.span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        day.isToday
                          ? 'bg-[#0033A0] text-white shadow-md shadow-[#0033A0]/20'
                          : darkMode
                            ? 'text-slate-400 hover:text-slate-300'
                            : 'text-slate-500 hover:text-slate-700'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {day.dayName}
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Actions - Enhanced buttons with premium feel */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <motion.button
              onClick={onAddTask}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#0033A0] via-[#0047CC] to-[#0033A0] text-white font-semibold shadow-xl shadow-[#0033A0]/30 overflow-hidden transition-all"
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#0047CC] via-[#72B5E8]/30 to-[#0047CC]"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ opacity: 0.3 }}
              />
              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
              <motion.div
                animate={{ rotate: [0, 90, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Plus className="w-5 h-5 relative" />
              </motion.div>
              <span className="relative font-bold">Add New Task</span>
            </motion.button>

            <motion.button
              onClick={onNavigateToTasks}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex items-center justify-center gap-3 p-5 rounded-2xl font-semibold transition-all overflow-hidden ${
                darkMode
                  ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50 text-white hover:border-[#72B5E8]/50'
                  : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 text-slate-800 hover:border-[#0033A0]/30 hover:shadow-lg'
              }`}
            >
              {/* Subtle gradient on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                darkMode
                  ? 'bg-gradient-to-r from-[#72B5E8]/5 to-transparent'
                  : 'bg-gradient-to-r from-[#0033A0]/5 to-transparent'
              }`} />
              <ListTodo className="w-5 h-5 relative" />
              <span className="relative font-bold">View All Tasks</span>
              <motion.div
                className="ml-1 relative"
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </motion.div>

          {/* Team Activity - Enhanced with glassmorphism */}
          <motion.div
            variants={itemVariants}
            className={`relative overflow-hidden rounded-2xl p-6 ${
              darkMode
                ? 'bg-[#1E293B]/80 backdrop-blur-xl border border-[#334155]/50'
                : 'bg-white/80 backdrop-blur-xl border border-slate-200/50'
            } shadow-sm`}
          >
            {/* Decorative accent */}
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#C9A227]/10 to-transparent rounded-tr-full" />

            <div className="relative flex items-center gap-3 mb-5">
              <motion.div
                className={`p-3 rounded-xl ${darkMode ? 'bg-[#72B5E8]/20' : 'bg-gradient-to-br from-[#72B5E8]/15 to-[#0033A0]/10'}`}
                whileHover={{ scale: 1.05, rotate: -5 }}
              >
                <Users className="w-5 h-5 text-[#0033A0]" />
              </motion.div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Team</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {users.length} members
              </span>
            </div>

            <div className="relative flex flex-wrap gap-3">
              {users.map((user, index) => {
                const userTasks = todos.filter(t => t.assigned_to === user && !t.completed).length;
                const colorScheme = TEAM_COLORS[index % TEAM_COLORS.length];
                const isCurrentUser = user === currentUser.name;

                return (
                  <motion.div
                    key={user}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.08, type: 'spring' }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-default transition-all ${
                      isCurrentUser
                        ? darkMode
                          ? 'bg-[#0033A0]/20 border border-[#0033A0]/30'
                          : 'bg-[#0033A0]/5 border border-[#0033A0]/20 shadow-sm'
                        : darkMode
                          ? 'bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700'
                          : 'bg-slate-50/80 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    {/* User avatar with gradient border */}
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-xl ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center text-sm font-bold shadow-md`}>
                        {user.charAt(0)}
                      </div>
                      {isCurrentUser && (
                        <motion.div
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#10B981] rounded-full border-2 border-white"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {user}
                        {isCurrentUser && <span className="text-xs font-normal text-slate-400 ml-1">(you)</span>}
                      </span>
                      {userTasks > 0 && (
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {userTasks} active task{userTasks !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {userTasks > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          darkMode
                            ? 'bg-[#72B5E8]/20 text-[#72B5E8]'
                            : 'bg-[#0033A0]/10 text-[#0033A0]'
                        }`}
                      >
                        {userTasks}
                      </motion.div>
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
