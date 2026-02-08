'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, RefreshCw, Target, X, ChevronRight } from 'lucide-react';
import type { Todo } from '@/types/todo';

const STORAGE_KEY = 'dashboard_dismissed_prompts';
const MAX_PROMPTS = 2;

// Feature prompt configurations
const FEATURE_PROMPTS = {
  reminders: {
    key: 'reminders',
    icon: Bell,
    title: 'Try task reminders',
    description: 'Never miss a deadline with timely notifications',
    action: 'Set reminder',
    iconBg: 'bg-blue-500/10 dark:bg-blue-400/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-l-blue-500',
  },
  recurring: {
    key: 'recurring',
    icon: RefreshCw,
    title: 'Set up recurring tasks',
    description: 'Automate routine work with repeating tasks',
    action: 'Learn more',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-l-emerald-500',
  },
  goals: {
    key: 'goals',
    icon: Target,
    title: 'Track long-term goals',
    description: 'Strategic Goals help you plan and measure success',
    action: 'Explore',
    iconBg: 'bg-[var(--brand-blue)]/10 dark:bg-[var(--brand-sky)]/20',
    iconColor: 'text-[var(--brand-blue)] dark:text-[var(--brand-sky)]',
    borderColor: 'border-l-[var(--brand-blue)]',
  },
} as const;

type FeatureKey = keyof typeof FEATURE_PROMPTS;

interface FeatureAdoptionPromptsProps {
  todos: Todo[];
  hasReminders?: boolean;
  hasRecurringTasks?: boolean;
  hasStrategicGoals?: boolean;
  onDismiss?: (featureKey: string) => void;
}

export default function FeatureAdoptionPrompts({
  todos,
  hasReminders = false,
  hasRecurringTasks = false,
  hasStrategicGoals = false,
  onDismiss,
}: FeatureAdoptionPromptsProps) {
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load dismissed prompts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedPrompts(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsInitialized(true);
  }, []);

  // Save dismissed prompts to localStorage
  const saveDismissedPrompts = useCallback((prompts: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(prompts)));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Handle dismissing a prompt
  const handleDismiss = useCallback((featureKey: string) => {
    setDismissedPrompts((prev) => {
      const next = new Set(prev);
      next.add(featureKey);
      saveDismissedPrompts(next);
      return next;
    });
    onDismiss?.(featureKey);
  }, [onDismiss, saveDismissedPrompts]);

  // Determine which prompts to show
  const activePrompts = useMemo(() => {
    const prompts: FeatureKey[] = [];

    // Only consider features that are not being used and not dismissed
    if (!hasReminders && !dismissedPrompts.has('reminders')) {
      prompts.push('reminders');
    }
    if (!hasRecurringTasks && !dismissedPrompts.has('recurring')) {
      prompts.push('recurring');
    }
    if (!hasStrategicGoals && !dismissedPrompts.has('goals')) {
      prompts.push('goals');
    }

    // Return only up to MAX_PROMPTS
    return prompts.slice(0, MAX_PROMPTS);
  }, [hasReminders, hasRecurringTasks, hasStrategicGoals, dismissedPrompts]);

  // Don't render until initialized (prevents hydration mismatch)
  if (!isInitialized) {
    return null;
  }

  // Don't render if no prompts to show
  if (activePrompts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <AnimatePresence mode="popLayout">
        {activePrompts.map((featureKey, index) => {
          const prompt = FEATURE_PROMPTS[featureKey];
          const Icon = prompt.icon;

          return (
            <motion.div
              key={prompt.key}
              layout
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 10 }}
              transition={{
                duration: 0.25,
                delay: index * 0.05,
                layout: { duration: 0.2 },
              }}
              className={`
                relative flex-1 min-w-0
                flex items-center gap-3
                px-3 py-2.5
                rounded-[var(--radius-lg)]
                border-l-[3px] ${prompt.borderColor}
                bg-[var(--surface)] border border-[var(--border)]
                shadow-sm
                group
              `}
            >
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 p-1.5 rounded-[var(--radius-md)]
                  ${prompt.iconBg}
                `}
              >
                <Icon className={`w-4 h-4 ${prompt.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-medium text-[var(--foreground)] truncate">
                    {prompt.title}
                  </h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 hidden sm:block">
                  {prompt.description}
                </p>
              </div>

              {/* Action button */}
              <button
                onClick={() => {
                  // Could emit an event or open a modal - for now just dismiss
                  handleDismiss(featureKey);
                }}
                className={`
                  flex-shrink-0 flex items-center gap-1
                  text-xs font-medium
                  text-[var(--accent)] hover:text-[var(--accent)]/80
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1
                  rounded px-2 py-1
                  hover:bg-[var(--accent)]/5
                `}
              >
                <span className="hidden xs:inline">{prompt.action}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(featureKey)}
                className={`
                  flex-shrink-0
                  p-1 rounded-full
                  text-[var(--text-muted)] hover:text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-colors
                  opacity-0 group-hover:opacity-100
                  focus-visible:opacity-100
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1
                `}
                aria-label={`Dismiss ${prompt.title} prompt`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
