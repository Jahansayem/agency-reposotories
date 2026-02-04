import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useTaskListKeyboardNav - Roving tabindex pattern for keyboard navigation
 *
 * Implements WCAG 2.1 keyboard navigation best practices:
 * - Arrow keys to navigate between items
 * - Home/End to jump to first/last item
 * - Enter/Space to activate focused item
 * - Roving tabindex (only one item in tab order at a time)
 *
 * @param itemCount - Number of items in the list
 * @param onActivate - Callback when item is activated (Enter/Space)
 * @returns Navigation state and handlers
 */
export function useTaskListKeyboardNav(
  itemCount: number,
  onActivate?: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Reset focused index if item count changes and current index is out of bounds
  useEffect(() => {
    if (focusedIndex >= itemCount && itemCount > 0) {
      setFocusedIndex(0);
    }
  }, [itemCount, focusedIndex]);

  // Register a ref for an item at a specific index
  const registerItemRef = useCallback((index: number) => {
    return (element: HTMLElement | null) => {
      itemRefs.current[index] = element;
    };
  }, []);

  // Focus an item by index
  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      setFocusedIndex(index);
      itemRefs.current[index]?.focus();
    }
  }, [itemCount]);

  // Keyboard event handler for an item
  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let handled = false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(index + 1, itemCount - 1);
        focusItem(nextIndex);
        handled = true;
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        focusItem(prevIndex);
        handled = true;
        break;

      case 'Home':
        e.preventDefault();
        focusItem(0);
        handled = true;
        break;

      case 'End':
        e.preventDefault();
        focusItem(itemCount - 1);
        handled = true;
        break;

      case 'Enter':
      case ' ':
        // Only handle if not already handled by other elements (buttons, checkboxes)
        const target = e.target as HTMLElement;
        const isInteractive = target.tagName === 'BUTTON' ||
                             target.tagName === 'INPUT' ||
                             target.tagName === 'A';

        if (!isInteractive && onActivate) {
          e.preventDefault();
          onActivate(index);
          handled = true;
        }
        break;
    }

    return handled;
  }, [itemCount, focusItem, onActivate]);

  // Get props for a specific item
  const getItemProps = useCallback((index: number) => {
    return {
      ref: registerItemRef(index),
      tabIndex: index === focusedIndex ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => handleItemKeyDown(e, index),
      'data-keyboard-nav-index': index,
    };
  }, [focusedIndex, registerItemRef, handleItemKeyDown]);

  // Focus the first item (useful for initial focus)
  const focusFirstItem = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    focusItem,
    focusFirstItem,
  };
}
