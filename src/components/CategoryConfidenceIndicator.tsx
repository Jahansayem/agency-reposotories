'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Check,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import { TaskPatternMatch } from '@/lib/insurancePatterns';
import { CATEGORY_COMPLETION_RATES } from '@/lib/insurancePatterns';

interface CategoryConfidenceIndicatorProps {
  patternMatch: TaskPatternMatch | null;
  onDismiss: () => void;
  onAcceptSuggestions: () => void;
}

/**
 * Get confidence level display properties
 * | Score Range | Level | Color |
 * |-------------|-------|-------|
 * | >= 0.7      | High  | Green |
 * | >= 0.4      | Medium| Amber |
 * | < 0.4       | Low   | Gray  |
 */
function getConfidenceLevel(confidence: number): {
  level: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (confidence >= 0.7) {
    return {
      level: 'High',
      color: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success)]/10',
      borderColor: 'border-[var(--success)]/30',
    };
  } else if (confidence >= 0.4) {
    return {
      level: 'Medium',
      color: 'text-[var(--warning)]',
      bgColor: 'bg-[var(--warning)]/10',
      borderColor: 'border-[var(--warning)]/30',
    };
  }
  return {
    level: 'Low',
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--surface-2)]',
    borderColor: 'border-[var(--border)]',
  };
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * CategoryConfidenceIndicator Component
 *
 * Displays AI-detected task category with confidence level and actionable suggestions.
 * Shows when user types more than 10 characters and a pattern match is detected.
 */
export function CategoryConfidenceIndicator({
  patternMatch,
  onDismiss,
  onAcceptSuggestions,
}: CategoryConfidenceIndicatorProps) {
  if (!patternMatch) return null;

  const confidenceLevel = getConfidenceLevel(patternMatch.confidence);
  const completionRate = CATEGORY_COMPLETION_RATES[patternMatch.category];
  const hasLowCompletion = completionRate < 60;
  const hasSubtasks = patternMatch.suggestedSubtasks.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
        role="region"
        aria-label="AI task analysis"
      >
        <div
          className={`p-3 rounded-[var(--radius-lg)] border mb-3 ${confidenceLevel.bgColor} ${confidenceLevel.borderColor}`}
        >
          {/* Header with category and confidence */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${confidenceLevel.color}`} />
              <span className="text-sm font-medium text-[var(--foreground)]">
                Detected: <span className={confidenceLevel.color}>{formatCategoryName(patternMatch.category)}</span>
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceLevel.bgColor} ${confidenceLevel.color} border ${confidenceLevel.borderColor}`}>
                {confidenceLevel.level} confidence
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Dismiss suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Completion rate warning for low-performing categories */}
          {hasLowCompletion && (
            <div className="mt-2 flex items-center gap-2 text-[var(--warning)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">
                This task type has a {completionRate}% completion rate. Subtasks can help!
              </span>
            </div>
          )}

          {/* Tips if available */}
          {patternMatch.tips && (
            <div className="mt-2 flex items-start gap-2 text-[var(--text-muted)]">
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-xs">{patternMatch.tips}</span>
            </div>
          )}

          {/* Suggestions section */}
          <div className="mt-3 space-y-2">
            {/* Priority suggestion */}
            <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
              <span>
                Suggested priority:{' '}
                <span className="font-medium capitalize">{patternMatch.suggestedPriority}</span>
              </span>
            </div>

            {/* Subtasks preview */}
            {hasSubtasks && (
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                  <ChevronRight className="w-3 h-3" />
                  <span>Suggested subtasks ({patternMatch.suggestedSubtasks.length})</span>
                </div>
                <ul className="pl-4 space-y-0.5">
                  {patternMatch.suggestedSubtasks.slice(0, 3).map((subtask, index) => (
                    <li
                      key={index}
                      className="text-xs text-[var(--text-muted)] flex items-center gap-1"
                    >
                      <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                      <span className="truncate">{subtask}</span>
                      {patternMatch.estimatedMinutes[index] && (
                        <span className="text-[var(--text-muted)] ml-auto flex-shrink-0">
                          ~{patternMatch.estimatedMinutes[index]}m
                        </span>
                      )}
                    </li>
                  ))}
                  {patternMatch.suggestedSubtasks.length > 3 && (
                    <li className="text-xs text-[var(--text-muted)] italic">
                      +{patternMatch.suggestedSubtasks.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onAcceptSuggestions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-[var(--radius-lg)] hover:opacity-90 transition-colors"
            >
              <Check className="w-3 h-3" />
              Apply Suggestions
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Ignore
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CategoryConfidenceIndicator;
