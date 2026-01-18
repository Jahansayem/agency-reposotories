/**
 * useEscapeKey Hook
 *
 * Simple hook that calls a callback when the Escape key is pressed.
 * Use this for modals and dialogs that need to close on Escape.
 *
 * For full focus trap functionality (Tab cycling, focus restoration),
 * use useFocusTrap instead.
 */

import { useEffect, useCallback } from 'react';

export interface UseEscapeKeyOptions {
  /** Whether the escape handler is enabled (default: true) */
  enabled?: boolean;
  /** Whether to prevent default behavior (default: true) */
  preventDefault?: boolean;
  /** Whether to stop event propagation (default: true) */
  stopPropagation?: boolean;
}

/**
 * Hook that calls a callback when Escape key is pressed
 *
 * @param onEscape - Callback to call when Escape is pressed
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Modal({ onClose }) {
 *   useEscapeKey(onClose);
 *
 *   return <div>Modal content...</div>;
 * }
 * ```
 */
export function useEscapeKey(
  onEscape: () => void,
  options: UseEscapeKeyOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        onEscape();
      }
    },
    [onEscape, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);
}

export default useEscapeKey;
