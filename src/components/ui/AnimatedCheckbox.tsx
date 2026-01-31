'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { prefersReducedMotion, DURATION, EASE } from '@/lib/animations';

interface AnimatedCheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox is toggled */
  onChange: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
  /** Accessible label */
  'aria-label'?: string;
}

const sizeConfig = {
  sm: {
    box: 'w-5 h-5',
    icon: 'w-3 h-3',
    border: 'border-2',
  },
  md: {
    box: 'w-7 h-7 sm:w-6 sm:h-6',
    icon: 'w-4 h-4 sm:w-3.5 sm:h-3.5',
    border: 'border-2',
  },
  lg: {
    box: 'w-8 h-8',
    icon: 'w-5 h-5',
    border: 'border-[2.5px]',
  },
};

/**
 * AnimatedCheckbox - A checkbox with satisfying completion animations
 *
 * Features:
 * - Scale bounce on check
 * - Checkmark path animation
 * - Color transition
 * - Respects reduced motion preferences
 */
export function AnimatedCheckbox({
  checked,
  onChange,
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: AnimatedCheckboxProps) {
  const reducedMotion = prefersReducedMotion();
  const config = sizeConfig[size];

  // Animation variants for the container
  const containerVariants = {
    unchecked: {
      scale: 1,
      backgroundColor: 'transparent',
    },
    checked: {
      scale: reducedMotion ? 1 : [1, 1.15, 1],
      backgroundColor: 'var(--success)',
      transition: {
        scale: {
          duration: DURATION.medium,
          times: [0, 0.4, 1],
          ease: EASE.spring,
        },
        backgroundColor: {
          duration: DURATION.fast,
        },
      },
    },
  };

  // Animation for the checkmark
  const checkmarkVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: DURATION.normal,
          ease: EASE.easeOut,
          delay: DURATION.instant,
        },
        opacity: {
          duration: DURATION.instant,
        },
      },
    },
  };

  return (
    // Outer touch target - 48px minimum for WCAG 2.5.5 compliance
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-label={ariaLabel || (checked ? 'Mark as incomplete' : 'Mark as complete')}
      aria-checked={checked}
      role="checkbox"
      className={`
        min-w-[48px] min-h-[48px]
        flex items-center justify-center
        flex-shrink-0
        touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
        focus-visible:rounded-[var(--radius-lg)]
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Visual checkbox - smaller than the touch target */}
      <motion.span
        variants={reducedMotion ? undefined : containerVariants}
        initial={false}
        animate={checked ? 'checked' : 'unchecked'}
        whileHover={
          disabled || reducedMotion
            ? undefined
            : {
                scale: 1.05,
                borderColor: checked ? 'var(--success)' : 'var(--success)',
              }
        }
        whileTap={disabled || reducedMotion ? undefined : { scale: 0.95 }}
        className={`
          ${config.box}
          ${config.border}
          rounded-[var(--radius-lg)]
          flex items-center justify-center
          transition-colors
          ${
            checked
              ? 'border-[var(--success)] bg-[var(--success)]'
              : 'border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success)]/10'
          }
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {checked && (
            <motion.svg
              key="checkmark"
              viewBox="0 0 24 24"
              className={`${config.icon} text-white`}
              initial={reducedMotion ? false : 'hidden'}
              animate="visible"
              exit="hidden"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={reducedMotion ? undefined : checkmarkVariants}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

/**
 * Simplified animated checkbox for subtasks
 */
interface SubtaskCheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

export function SubtaskCheckbox({
  checked,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: SubtaskCheckboxProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    // Outer touch target - 48px minimum for WCAG 2.5.5 compliance
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-label={ariaLabel || (checked ? 'Mark subtask as incomplete' : 'Mark subtask as complete')}
      aria-checked={checked}
      role="checkbox"
      className={`
        min-w-[48px] min-h-[48px]
        flex items-center justify-center
        flex-shrink-0
        touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
        focus-visible:rounded-[var(--radius-lg)]
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Visual checkbox - smaller than the touch target */}
      <motion.span
        whileHover={disabled || reducedMotion ? undefined : { scale: 1.1 }}
        whileTap={disabled || reducedMotion ? undefined : { scale: 0.9 }}
        className={`
          w-5 h-5 sm:w-4 sm:h-4
          rounded
          border-2
          flex items-center justify-center
          transition-all duration-150
          ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'border-[var(--border)] hover:border-[var(--accent)]'
          }
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {checked && (
            <motion.div
              initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: DURATION.fast }}
            >
              <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

export default AnimatedCheckbox;
