/**
 * useIsLandscape Hook
 *
 * Detects landscape orientation on mobile devices.
 * Landscape is defined as:
 * - window.innerHeight < 500px AND
 * - window.matchMedia('(orientation: landscape)') matches
 *
 * This hook is useful for:
 * - Adjusting layouts in landscape mode
 * - Reducing navigation heights
 * - Optimizing vertical space usage
 *
 * @returns {boolean} true if device is in landscape mode
 *
 * @example
 * const isLandscape = useIsLandscape();
 *
 * return (
 *   <div className={isLandscape ? 'h-12' : 'h-16'}>
 *     Navigation
 *   </div>
 * );
 */

'use client';

import { useState, useEffect } from 'react';

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if we're in landscape mode
      // Height < 500px AND orientation is landscape
      const isLandscapeMode =
        typeof window !== 'undefined' &&
        window.innerHeight < 500 &&
        window.matchMedia('(orientation: landscape)').matches;

      setIsLandscape(isLandscapeMode);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation and resize events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return isLandscape;
}

export default useIsLandscape;
