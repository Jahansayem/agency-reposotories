import { useEffect, useState } from 'react';

/**
 * Hook to detect if the mobile keyboard is visible
 * Uses visualViewport API to detect keyboard state on iOS and Android
 *
 * @returns {boolean} true if keyboard is visible, false otherwise
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const initialHeight = viewport.height;

    const handleResize = () => {
      // Keyboard is visible if viewport height significantly decreased
      // (usually by 300-400px on mobile)
      const currentHeight = viewport.height;
      const heightDiff = initialHeight - currentHeight;

      // Consider keyboard visible if height decreased by more than 150px
      // (accounts for some browser chrome variations)
      setIsKeyboardVisible(heightDiff > 150);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return isKeyboardVisible;
}
