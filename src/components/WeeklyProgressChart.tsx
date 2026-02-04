'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, X, Target, Sparkles, AlertCircle } from 'lucide-react';
import { Todo } from '@/types/todo';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import CountUp from '@/components/ui/CountUp';

interface WeeklyProgressChartProps {
  todos: Todo[];
  show: boolean;
  onClose: () => void;
  dailyGoal?: number;
}

interface DayData {
  day: string;
  shortDay: string;
  date: Date;
  completed: number;
  created: number;
}

export default function WeeklyProgressChart({
  todos,
  show,
  onClose,
  dailyGoal = 5,
}: WeeklyProgressChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close on Escape key press
  useEscapeKey(onClose, { enabled: show });

  // Touch handler for mobile (Issue #22: Touch Event Handlers for Charts)
  // Uses useCallback and ref-based timeout tracking to prevent setState after unmount
  const handleBarTouch = useCallback((index: number) => {
    setActiveTooltip(index);
    setHoveredDay(index);

    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Auto-hide tooltip after 2 seconds
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
      setHoveredDay(null);
      tooltipTimeoutRef.current = null;
    }, 2000);
  }, []);

  // Cleanup timeout on unmount to prevent setState after unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const weekData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayData[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get last 5 weekdays (Mon-Fri)
    const cursor = new Date(today);
    while (days.length < 5) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        const date = new Date(cursor);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Count tasks completed on this day (based on updated_at if completed)
        const completed = todos.filter(t => {
          if (!t.completed) return false;
          const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
          return updatedAt >= dayStart && updatedAt <= dayEnd;
        }).length;

        // Count tasks created on this day
        const created = todos.filter(t => {
          const createdAt = new Date(t.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;

        days.push({
          day: dayNames[date.getDay()],
          shortDay: dayNames[date.getDay()],
          date,
          completed,
          created,
        });
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    return days.reverse();
  }, [todos]);

  const stats = useMemo(() => {
    const totalCompleted = weekData.reduce((sum, d) => sum + d.completed, 0);
    const totalCreated = weekData.reduce((sum, d) => sum + d.created, 0);
    const maxCompleted = Math.max(...weekData.map(d => d.completed), dailyGoal);

    // Calculate trend (compare last 3 days to first 2 days of the 5-day week)
    const recentCompleted = weekData.slice(-3).reduce((sum, d) => sum + d.completed, 0);
    const earlierCompleted = weekData.slice(0, 2).reduce((sum, d) => sum + d.completed, 0);
    const avgRecent = recentCompleted / 3;  // Last 3 days average
    const avgEarlier = earlierCompleted / 2; // First 2 days average

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (avgRecent > avgEarlier * 1.2) trend = 'up';
    else if (avgRecent < avgEarlier * 0.8) trend = 'down';

    const daysMetGoal = weekData.filter(d => d.completed >= dailyGoal).length;

    // Goal achievement rate: percentage of days where daily goal was met
    const goalRate = Math.round((daysMetGoal / 5) * 100);

    return {
      totalCompleted,
      totalCreated,
      maxCompleted,
      trend,
      goalRate,
      avgPerDay: (totalCompleted / 5).toFixed(1),
      daysMetGoal,
    };
  }, [weekData, dailyGoal]);

  if (!show) return null;

  const goalLinePosition = stats.maxCompleted > 0
    ? ((dailyGoal / stats.maxCompleted) * 96)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-progress-title"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-[var(--radius-2xl)] shadow-2xl overflow-hidden ${
          'bg-[var(--surface)]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[var(--radius-lg)] bg-[var(--brand-blue)]/10">
              <TrendingUp className="w-4 h-4 text-[var(--brand-blue)]" />
            </div>
            <h3 id="weekly-progress-title" className="text-lg font-semibold text-[var(--foreground)]">
              Weekly Progress • {weekData[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–{weekData[weekData.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close weekly progress chart"
            className="p-2 rounded-[var(--radius-lg)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b border-[var(--border-subtle)]">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-2xl font-bold text-[var(--brand-blue)]">
              <CountUp end={stats.totalCompleted} duration={800} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">Completed</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {stats.avgPerDay}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Avg/Day</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-1">
              <p className={`text-2xl font-bold ${
                stats.goalRate >= 80 ? 'text-[var(--success)]' :
                stats.goalRate >= 60 ? 'text-[var(--brand-blue)]' :
                'text-[var(--danger)]'}`}>
                <CountUp end={stats.goalRate} duration={800} suffix="%" />
              </p>
              {stats.goalRate >= 80 && <Target className="w-4 h-4 text-[var(--success)]" />}
              {stats.goalRate < 60 && <AlertCircle className="w-4 h-4 text-[var(--danger)]" />}
            </div>
            <p className={`text-xs ${
              stats.goalRate >= 80 ? 'text-[var(--success)]' :
              stats.goalRate >= 60 ? 'text-[var(--text-muted)]' :
              'text-[var(--danger)]'}`}>
              Goal Rate {stats.goalRate >= 80 ? '• On track' : stats.goalRate >= 60 ? '• Fair' : '• Below target'}
            </p>
          </motion.div>
        </div>

        {/* Legend - WCAG 1.4.1: Use of Color (colorblind accessible) */}
        <div className="px-4 mb-2">
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded bg-[var(--success)]"
                style={{
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 0 1px var(--success-light)',
                }}
                aria-hidden="true"
              />
              <span className="text-[var(--text-muted)] font-medium">Goal Met</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm bg-[var(--brand-blue)]"
                style={{ boxShadow: '0 0 0 1px var(--border)' }}
                aria-hidden="true"
              />
              <span className="text-[var(--text-muted)] font-medium">Below Goal</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-4 relative">
          {/* Goal line */}
          {dailyGoal > 0 && stats.maxCompleted >= dailyGoal && (
            <div
              className="absolute left-4 right-4 flex items-center z-10 pointer-events-none"
              style={{ bottom: `${goalLinePosition + 56}px` }}
            >
              <div className="flex-1 border-t-2 border-dashed border-[var(--success)]/30" />
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--success-light)] text-[var(--success)]">
                <Target className="w-3 h-3 inline mr-1" />
                Goal: {dailyGoal}
              </span>
            </div>
          )}

          <div className="flex items-end justify-between gap-3 h-32 mb-2">
            {weekData.map((day, index) => {
              // Calculate height in pixels (max container height is 128px / 8rem)
              const maxBarHeight = 96; // Leave room for label
              const barHeight = stats.maxCompleted > 0
                ? Math.max((day.completed / stats.maxCompleted) * maxBarHeight, day.completed > 0 ? 8 : 4)
                : 4;
              const isToday = index === weekData.length - 1;
              const isHovered = hoveredDay === index;
              const metGoal = day.completed >= dailyGoal;

              return (
                <div
                  key={day.day}
                  className="flex-1 flex flex-col items-center justify-end gap-1 h-full relative"
                  onMouseEnter={() => setHoveredDay(index)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Tooltip - shows on hover OR touch (Issue #22) */}
                  <AnimatePresence>
                    {(isHovered || activeTooltip === index) && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute bottom-full mb-2 px-3 py-2 rounded-[var(--radius-lg)] text-xs whitespace-nowrap z-20 bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] shadow-lg"
                        role="tooltip"
                      >
                        <p className="font-semibold">{day.day}</p>
                        <p className="text-[var(--text-muted)]">
                          {day.completed} completed
                        </p>
                        <p className="text-[var(--text-light)]">
                          {day.created} created
                        </p>
                        {metGoal && (
                          <p className="text-[var(--success)] mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Goal met! (≥{dailyGoal})
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Count label - Always visible for accessibility */}
                  <motion.span
                    className={`text-xs font-bold transition-colors ${
                      isHovered
                        ? metGoal
                          ? 'text-[var(--success)]'
                          : 'text-[var(--brand-blue)]'
                        : day.completed > 0
                          ? metGoal
                            ? 'text-[var(--success)]'
                            : 'text-[var(--foreground)]'
                          : 'text-[var(--text-light)]'}`}
                    animate={{ scale: isHovered ? 1.15 : 1 }}
                    aria-label={`${day.completed} tasks completed on ${day.day}${metGoal ? ' (goal met)' : ''}`}
                  >
                    {day.completed}
                  </motion.span>

                  {/* Bar with pattern for colorblind accessibility + touch support (Issue #22) */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: barHeight,
                      scale: (isHovered || activeTooltip === index) ? 1.05 : 1,
                    }}
                    transition={{
                      height: { delay: index * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
                      scale: { duration: 0.15 }
                    }}
                    onClick={() => handleBarTouch(index)}
                    className={`w-full rounded-t-lg cursor-pointer transition-all relative ${
                      isToday
                        ? metGoal
                          ? 'bg-[var(--success)]'
                          : 'bg-[var(--brand-blue)]'
                        : day.completed > 0
                          ? metGoal
                            ? 'bg-[var(--success)]/30'
                            : 'bg-[var(--brand-blue)]/40'
                          : 'bg-[var(--surface-3)]'}`}
                    style={{
                      border: metGoal ? '2px solid rgba(255, 255, 255, 0.8)' : 'none',
                      boxShadow: metGoal
                        ? '0 0 0 1px var(--success-light), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                        : '0 0 0 1px var(--border)',
                      touchAction: 'manipulation', // Optimize for touch (Issue #22)
                    }}
                    aria-label={`${day.day}: ${day.completed} completed${metGoal ? ' (goal met)' : ''}`}
                    role="img"
                  />
                </div>
              );
            })}
          </div>

          {/* Day labels */}
          <div className="flex justify-between">
            {weekData.map((day, index) => {
              const isToday = index === weekData.length - 1;
              const isHovered = hoveredDay === index;
              return (
                <div key={day.day} className="flex-1 text-center">
                  <span className={`text-xs font-medium transition-colors ${
                    isHovered
                      ? 'text-[var(--brand-blue)]'
                      : isToday
                        ? 'text-[var(--brand-blue)]'
                        : 'text-[var(--text-muted)]'}`}>
                    {day.shortDay}
                  </span>
                  {isToday && (
                    <div className="flex justify-center mt-1">
                      <div className="w-1 h-1 rounded-full bg-[var(--brand-blue)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Goal progress */}
        <div className="mx-4 mb-2 p-3 rounded-[var(--radius-xl)] bg-[var(--surface-2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Days goal met
            </span>
            <span className={`text-xs font-semibold ${
              stats.daysMetGoal >= 4 ? 'text-[var(--success)]' :
              stats.daysMetGoal >= 2 ? 'text-[var(--warning)]' :
              'text-[var(--text-light)]'}`}>
              {stats.daysMetGoal}/5
            </span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < stats.daysMetGoal
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--surface-3)]'}`}
              />
            ))}
          </div>
        </div>

        {/* Footer tip */}
        <div className="px-4 py-3 text-center text-xs bg-[var(--surface-2)] text-[var(--text-muted)]">
          {stats.trend === 'up' && "Great job! You're completing more tasks than last week."}
          {stats.trend === 'down' && "Keep going! Consistency is key."}
          {stats.trend === 'stable' && "You're maintaining a steady pace!"}
        </div>
      </motion.div>
    </motion.div>
  );
}
