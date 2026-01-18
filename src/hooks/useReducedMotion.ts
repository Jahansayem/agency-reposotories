'use client';

import { useState, useEffect } from 'react';

/**
 * useReducedMotion Hook
 *
 * Detects user's preference for reduced motion from OS accessibility settings.
 * Returns true if the user prefers reduced motion.
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * // Skip animations
 * if (prefersReducedMotion) {
 *   return <div>Static content</div>;
 * }
 *
 * // Or adjust Framer Motion
 * <motion.div
 *   animate={{ opacity: 1 }}
 *   transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
 * />
 * ```
 */
export function useReducedMotion(): boolean {
  // Default to false during SSR
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get motion transition config based on user preference
 *
 * Usage:
 * ```tsx
 * const motionConfig = useMotionConfig();
 * <motion.div transition={motionConfig.spring} />
 * ```
 */
export function useMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    // Instant transition for reduced motion
    instant: { duration: 0 },

    // Fast transition (150ms) or instant
    fast: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.15, ease: [0.4, 0, 0.2, 1] },

    // Normal transition (250ms) or instant
    normal: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.25, ease: [0.4, 0, 0.2, 1] },

    // Slow transition (400ms) or instant
    slow: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.4, ease: [0.4, 0, 0.2, 1] },

    // Spring animation or instant
    spring: prefersReducedMotion
      ? { duration: 0 }
      : { type: 'spring' as const, damping: 20, stiffness: 300 },

    // Bouncy spring or instant
    bouncy: prefersReducedMotion
      ? { duration: 0 }
      : { type: 'spring' as const, damping: 12, stiffness: 150 },

    // Whether to skip decorative animations entirely
    skipAnimations: prefersReducedMotion,
  };
}

export default useReducedMotion;
