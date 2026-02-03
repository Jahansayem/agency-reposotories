'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CompletionPredictionProps {
  activeTasks: number;
  weeklyCompleted: number;
  className?: string;
}

/**
 * CompletionPrediction Component
 *
 * Predicts when all active tasks will be completed based on current velocity.
 * Provides encouraging or warning messages based on the prediction.
 */
export default function CompletionPrediction({
  activeTasks,
  weeklyCompleted,
  className = '',
}: CompletionPredictionProps) {
  const prediction = useMemo(() => {
    // No active tasks - all done!
    if (activeTasks === 0) {
      return {
        type: 'complete' as const,
        message: 'All caught up!',
        subtext: 'No active tasks remaining',
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
      };
    }

    // Calculate daily velocity (assuming 5-day work week)
    const dailyVelocity = weeklyCompleted / 5;

    // No completions this week
    if (dailyVelocity === 0) {
      return {
        type: 'warning' as const,
        message: 'No velocity this week',
        subtext: 'Complete a task to see predictions',
        icon: AlertTriangle,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      };
    }

    // Calculate days to complete all tasks
    const daysToComplete = Math.ceil(activeTasks / dailyVelocity);

    // Generate prediction message
    if (daysToComplete <= 1) {
      return {
        type: 'excellent' as const,
        message: 'On track for today',
        subtext: `${activeTasks} task${activeTasks > 1 ? 's' : ''} remaining at current pace`,
        icon: TrendingUp,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        daysToComplete,
      };
    } else if (daysToComplete <= 3) {
      return {
        type: 'good' as const,
        message: `Clear in ~${daysToComplete} days`,
        subtext: `At your current pace of ${weeklyCompleted}/week`,
        icon: Target,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        daysToComplete,
      };
    } else if (daysToComplete <= 7) {
      return {
        type: 'moderate' as const,
        message: `Clear by end of week`,
        subtext: `${activeTasks} tasks at ${weeklyCompleted}/week velocity`,
        icon: Clock,
        color: 'text-[var(--brand-blue)]',
        bgColor: 'bg-[var(--brand-blue)]/10',
        daysToComplete,
      };
    } else {
      const weeks = Math.ceil(daysToComplete / 5);
      return {
        type: 'slow' as const,
        message: `~${weeks} week${weeks > 1 ? 's' : ''} at current pace`,
        subtext: 'Consider prioritizing or delegating',
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        daysToComplete,
      };
    }
  }, [activeTasks, weeklyCompleted]);

  const Icon = prediction.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${prediction.bgColor} ${className}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${prediction.bgColor}`}>
        <Icon className={`w-4 h-4 ${prediction.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${prediction.color}`}>
          {prediction.message}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {prediction.subtext}
        </p>
      </div>
    </motion.div>
  );
}
