'use client';

import { Variants, Transition, TargetAndTransition } from 'framer-motion';

/**
 * Shared Animation Variants Library
 *
 * Provides consistent, reusable animations across the application.
 * All animations are designed to be:
 * - Subtle and professional (200-300ms max)
 * - Non-distracting (enhance, don't overshadow content)
 * - Accessible (respects prefers-reduced-motion)
 */

// ============================================================================
// TIMING PRESETS
// ============================================================================

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  medium: 0.25,
  slow: 0.3,
} as const;

export const EASE = {
  // Standard easing for most animations
  default: [0.4, 0, 0.2, 1] as const,
  // For elements entering the screen
  easeOut: [0, 0, 0.2, 1] as const,
  // For elements leaving the screen
  easeIn: [0.4, 0, 1, 1] as const,
  // For elements that overshoot slightly (bouncy feel)
  spring: [0.175, 0.885, 0.32, 1.275] as const,
  // Linear for continuous animations
  linear: [0, 0, 1, 1] as const,
} as const;

// Spring config for natural motion
export const SPRING = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 } as const,
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as const,
  bouncy: { type: 'spring', stiffness: 300, damping: 10 } as const,
} as const;

// ============================================================================
// MODAL ANIMATIONS
// ============================================================================

/**
 * Backdrop animation for modals and overlays
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Modal container animation - scale + fade + slight upward motion
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
};

export const modalTransition: Transition = {
  duration: DURATION.normal,
  ease: EASE.default,
};

// ============================================================================
// LIST ITEM ANIMATIONS
// ============================================================================

/**
 * Standard list item enter/exit animations
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.95,
    transition: {
      duration: DURATION.fast,
    },
  },
};

/**
 * Container for staggered list animations
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Slide out animation for deleted items
 */
export const slideOutVariants: Variants = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
  exit: {
    opacity: 0,
    x: '-100%',
    transition: {
      duration: DURATION.normal,
      ease: EASE.easeIn,
    },
  },
};

/**
 * Fade out animation for deleted items (alternative)
 */
export const fadeOutVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: { opacity: 1, height: 'auto', marginBottom: undefined },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: DURATION.fast },
      height: { duration: DURATION.normal, delay: DURATION.fast * 0.5 },
    },
  },
};

// ============================================================================
// TASK COMPLETION ANIMATIONS
// ============================================================================

/**
 * Checkbox completion animation
 */
export const checkboxVariants: Variants = {
  unchecked: {
    scale: 1,
    backgroundColor: 'transparent',
    borderColor: 'var(--border)',
  },
  checked: {
    scale: [1, 1.2, 1],
    backgroundColor: 'var(--success)',
    borderColor: 'var(--success)',
    transition: {
      scale: {
        duration: DURATION.medium,
        times: [0, 0.4, 1],
      },
      backgroundColor: { duration: DURATION.fast },
      borderColor: { duration: DURATION.fast },
    },
  },
};

/**
 * Checkmark path animation (for SVG checkmarks)
 */
export const checkmarkPathVariants: Variants = {
  unchecked: {
    pathLength: 0,
    opacity: 0,
  },
  checked: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: DURATION.normal,
        ease: EASE.easeOut,
      },
      opacity: { duration: DURATION.instant },
    },
  },
};

/**
 * Task card completion state animation
 */
export const taskCompletionVariants: Variants = {
  incomplete: {
    opacity: 1,
    x: 0,
  },
  complete: {
    opacity: 0.6,
    transition: {
      duration: DURATION.medium,
    },
  },
};

// ============================================================================
// BUTTON ANIMATIONS
// ============================================================================

/**
 * Subtle button hover state
 */
export const buttonHoverVariants: Variants = {
  idle: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: DURATION.fast,
      ease: EASE.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: DURATION.instant,
    },
  },
};

/**
 * Icon button hover with slight rotation
 */
export const iconButtonVariants: Variants = {
  idle: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: DURATION.fast,
      ease: EASE.easeOut,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: DURATION.instant,
    },
  },
};

// ============================================================================
// FILTER & TRANSITION ANIMATIONS
// ============================================================================

/**
 * Filter panel slide animation
 */
export const filterPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: undefined,
    marginBottom: undefined,
    transition: {
      height: { duration: DURATION.normal },
      opacity: { duration: DURATION.fast, delay: DURATION.fast * 0.5 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: DURATION.fast },
      height: { duration: DURATION.normal, delay: DURATION.fast * 0.5 },
    },
  },
};

/**
 * Content fade for filter changes
 */
export const contentTransitionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast,
    },
  },
};

// ============================================================================
// TOOLTIP & POPOVER ANIMATIONS
// ============================================================================

export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASE.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: DURATION.instant,
    },
  },
};

export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASE.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: DURATION.fast,
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user prefers reduced motion
 * Use this to conditionally disable animations
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation variants respecting reduced motion preference
 * Returns static states if user prefers reduced motion
 */
export function getAccessibleVariants<T extends Variants>(variants: T): T | Variants {
  if (prefersReducedMotion()) {
    // Return instant transitions for reduced motion
    const reducedVariants: Variants = {};
    for (const key of Object.keys(variants)) {
      const variant = variants[key];
      if (typeof variant === 'object' && variant !== null) {
        reducedVariants[key] = {
          ...variant,
          transition: { duration: 0 },
        };
      }
    }
    return reducedVariants as T;
  }
  return variants;
}

/**
 * Create staggered animation delay for children
 */
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}

/**
 * Hook-friendly animation configuration
 * Returns appropriate animation props based on reduced motion preference
 */
export function getAnimationProps(
  options: {
    initial?: TargetAndTransition | string;
    animate?: TargetAndTransition | string;
    exit?: TargetAndTransition | string;
    transition?: Transition;
  }
): typeof options | { initial: false } {
  if (prefersReducedMotion()) {
    return { initial: false };
  }
  return options;
}

/**
 * Layout animation transition for smooth reordering
 */
export const layoutTransition: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
};

/**
 * Preset animation configs for common use cases
 */
export const ANIMATION_PRESETS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: DURATION.fast },
  },
  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    transition: { duration: DURATION.fast },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: DURATION.normal, ease: EASE.default },
  },
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
  slideDown: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
} as const;
