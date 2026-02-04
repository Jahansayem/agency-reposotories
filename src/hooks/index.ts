/**
 * Hooks Index
 *
 * Centralized exports for all custom hooks
 */

// Core Data Hooks
export { useTodoData, setReorderingFlag } from './useTodoData';
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

export { useTaskListKeyboardNav } from './useTaskListKeyboardNav';

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

// Form Hooks
export { useForm, useUnsavedChanges } from './useForm';
export type { UseFormOptions, UseFormReturn, UseUnsavedChangesOptions } from './useForm';

// Error Handling Hooks
export { useErrorToast } from './useErrorToast';

// React Query Hooks (Sprint 3 Issue #31)
export {
  useTodosQuery,
  useCompleteTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
  useCreateTodoMutation,
} from './useTodosQuery';

// Dashboard Hooks
export { useAgencyMetrics } from './useAgencyMetrics';

// Auth & Permissions
export { usePermission, usePermissions } from './usePermission';
export { useRoleCheck } from './useRoleCheck';
