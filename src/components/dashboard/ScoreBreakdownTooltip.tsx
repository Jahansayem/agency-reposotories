'use client';

import { CheckCircle2, AlertTriangle, ListTodo, Zap } from 'lucide-react';
import { ScoreBreakdown } from '@/lib/aiDashboardInsights';

interface ScoreBreakdownTooltipProps {
  breakdown: ScoreBreakdown;
}

/**
 * Score Breakdown Tooltip
 *
 * Explains how the productivity score is calculated with visual breakdown.
 * Shows each factor that contributes to the final score.
 */
export default function ScoreBreakdownTooltip({ breakdown }: ScoreBreakdownTooltipProps) {
  const {
    baseScore,
    completionBonus,
    completionsCount,
    overdueePenalty,
    overdueCount,
    backlogBonus,
    activeTaskCount,
    priorityBonus,
    highPriorityCompleted,
    finalScore,
  } = breakdown;

  return (
    <div className="space-y-3">
      <div className="font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
        Score Breakdown
      </div>

      {/* Base Score */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Base score</span>
        <span className="font-medium text-[var(--foreground)]">+{baseScore}</span>
      </div>

      {/* Completion Bonus */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[var(--text-muted)]">
            Weekly completions ({completionsCount})
          </span>
        </div>
        <span className={`font-medium ${completionBonus > 0 ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>
          +{completionBonus}
        </span>
      </div>

      {/* Overdue Penalty */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[var(--text-muted)]">
            Overdue tasks ({overdueCount})
          </span>
        </div>
        <span className={`font-medium ${overdueePenalty > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
          {overdueePenalty > 0 ? `-${overdueePenalty}` : '0'}
        </span>
      </div>

      {/* Backlog Bonus */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[var(--text-muted)]">
            Manageable backlog ({activeTaskCount} tasks)
          </span>
        </div>
        <span className={`font-medium ${backlogBonus > 0 ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>
          +{backlogBonus}
        </span>
      </div>

      {/* Priority Bonus */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[var(--text-muted)]">
            High priority done ({highPriorityCompleted})
          </span>
        </div>
        <span className={`font-medium ${priorityBonus > 0 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
          +{priorityBonus}
        </span>
      </div>

      {/* Divider and Total */}
      <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between">
        <span className="font-semibold text-[var(--foreground)]">Total Score</span>
        <span className={`font-bold text-lg ${
          finalScore >= 70 ? 'text-emerald-500' :
          finalScore >= 40 ? 'text-amber-500' :
          'text-red-500'
        }`}>
          {finalScore}
        </span>
      </div>

      {/* Tips */}
      <div className="text-badge text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
        {finalScore < 50 && overdueCount > 0 && (
          <p>💡 Clear overdue tasks to boost your score</p>
        )}
        {finalScore < 50 && overdueCount === 0 && (
          <p>💡 Complete more tasks this week to improve</p>
        )}
        {finalScore >= 50 && finalScore < 70 && (
          <p>💡 Focus on high-priority tasks for bonus points</p>
        )}
        {finalScore >= 70 && (
          <p>🎉 Great productivity! Keep it up!</p>
        )}
      </div>
    </div>
  );
}
