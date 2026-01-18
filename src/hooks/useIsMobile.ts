'use client';

import { useState, useEffect } from 'react';

/**
 * useIsMobile Hook
 *
 * Detects if the current viewport is mobile-sized (< 768px by default).
 * Uses matchMedia for efficient re-renders only when breakpoint is crossed.
 *
 * @param breakpoint - The max-width in pixels to consider "mobile" (default: 768)
 * @returns boolean indicating if viewport is mobile-sized
 *
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile();
 *
 * if (isMobile) {
 *   return <TaskBottomSheet task={task} />;
 * }
 * return <TaskDetailPanel task={task} />;
 * ```
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  // Default to false during SSR, will update on client
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
