/**
 * Hooks Index
 *
 * Centralized exports for all custom hooks
 */

// Core Data Hooks
export { useTodoData } from './useTodoData';
export { useFilters } from './useFilters';
export type { FilterState } from './useFilters';
export { useBulkActions } from './useBulkActions';

// Modal Management Hooks
export { useTodoModals } from './useTodoModals';
export type {
  UseTodoModalsOptions,
  UseTodoModalsReturn,
  PendingTaskData,
  ConfirmDialogState,
} from './useTodoModals';

// Accessibility & UX Hooks
export { useFocusTrap } from './useFocusTrap';
export type { UseFocusTrapOptions, UseFocusTrapReturn } from './useFocusTrap';

export { useEscapeKey } from './useEscapeKey';
export type { UseEscapeKeyOptions } from './useEscapeKey';

// Motion & Animation Hooks
export { useReducedMotion, useMotionConfig } from './useReducedMotion';

// Responsive Hooks
export { useIsMobile, useIsDesktopWide } from './useIsMobile';

export {
  useKeyboardShortcuts,
  getShortcutDisplayString,
  getModifierSymbol,
  getIsMac,
} from './useKeyboardShortcuts';
export type { KeyboardShortcut, UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';

// Chat Hooks
export { useChatSubscription } from './useChatSubscription';
export { useChatMessages } from './useChatMessages';
