/**
 * useTodoModals Hook
 *
 * Manages visibility state for all modals in the TodoList component.
 * Provides centralized modal state management with proper cleanup.
 *
 * This hook consolidates modal state that was previously scattered
 * across 20+ useState calls in TodoList.tsx.
 *
 * Refactored in Sprint 4 to compose two smaller hooks:
 * - useModalState: raw useState pairs
 * - useTodoModalActions: action handlers combining state changes
 *
 * This file preserves full backward compatibility -- the return type
 * and public API are unchanged.
 */

import { Todo, TodoPriority, Subtask, CelebrationData, ActivityLogEntry } from '@/types/todo';
import { DuplicateMatch } from '@/lib/duplicateDetection';
import { useModalState } from './useModalState';
import { useTodoModalActions } from './useTodoModalActions';

// ============================================
// Types & Interfaces (re-exported for consumers)
// ============================================

export interface UseTodoModalsOptions {
  /** Callback when any modal opens */
  onModalOpen?: (modalName: string) => void;
  /** Callback when any modal closes */
  onModalClose?: (modalName: string) => void;
}

export interface PendingTaskData {
  text: string;
  priority: TodoPriority;
  dueDate?: string;
  assignedTo?: string;
  subtasks?: Subtask[];
  transcription?: string;
  sourceFile?: File;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface UseTodoModalsReturn {
  // ============================================
  // Celebration State
  // ============================================
  showCelebration: boolean;
  celebrationText: string;
  showEnhancedCelebration: boolean;
  celebrationData: CelebrationData | null;

  // ============================================
  // Progress & Welcome State
  // ============================================
  showProgressSummary: boolean;
  showWelcomeBack: boolean;
  showWeeklyChart: boolean;

  // ============================================
  // Utility Modals State
  // ============================================
  showShortcuts: boolean;
  showActivityFeed: boolean;
  showStrategicDashboard: boolean;

  // ============================================
  // Template State
  // ============================================
  templateTodo: Todo | null;

  // ============================================
  // Confirm Dialog State
  // ============================================
  confirmDialog: ConfirmDialogState;

  // ============================================
  // Completion Summary State
  // ============================================
  showCompletionSummary: boolean;
  completedTaskForSummary: Todo | null;

  // ============================================
  // Duplicate Detection State
  // ============================================
  showDuplicateModal: boolean;
  duplicateMatches: DuplicateMatch[];
  pendingTask: PendingTaskData | null;

  // ============================================
  // Email Modal State
  // ============================================
  showEmailModal: boolean;
  emailTargetTodos: Todo[];

  // ============================================
  // Archive Modal State
  // ============================================
  showArchiveView: boolean;
  selectedArchivedTodo: Todo | null;
  archiveQuery: string;
  archiveTick: number;

  // ============================================
  // Merge Modal State
  // ============================================
  showMergeModal: boolean;
  mergeTargets: Todo[];
  selectedPrimaryId: string | null;
  isMerging: boolean;

  // ============================================
  // Activity Log State
  // ============================================
  activityLog: ActivityLogEntry[];

  // ============================================
  // Actions - Celebration
  // ============================================
  triggerCelebration: (text: string) => void;
  dismissCelebration: () => void;
  triggerEnhancedCelebration: (data: CelebrationData) => void;
  dismissEnhancedCelebration: () => void;

  // ============================================
  // Actions - Progress & Welcome
  // ============================================
  openProgressSummary: () => void;
  closeProgressSummary: () => void;
  openWelcomeBack: () => void;
  closeWelcomeBack: () => void;
  openWeeklyChart: () => void;
  closeWeeklyChart: () => void;

  // ============================================
  // Actions - Utility Modals
  // ============================================
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openActivityFeed: () => void;
  closeActivityFeed: () => void;
  openStrategicDashboard: () => void;
  closeStrategicDashboard: () => void;

  // ============================================
  // Actions - Template
  // ============================================
  openTemplateModal: (todo: Todo) => void;
  closeTemplateModal: () => void;

  // ============================================
  // Actions - Confirm Dialog
  // ============================================
  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;

  // ============================================
  // Actions - Completion Summary
  // ============================================
  openCompletionSummary: (todo: Todo) => void;
  closeCompletionSummary: () => void;

  // ============================================
  // Actions - Duplicate Detection
  // ============================================
  openDuplicateModal: (pendingTask: PendingTaskData, matches: DuplicateMatch[]) => void;
  closeDuplicateModal: () => void;
  clearDuplicateState: () => void;

  // ============================================
  // Actions - Email
  // ============================================
  openEmailModal: (todos: Todo[]) => void;
  closeEmailModal: () => void;

  // ============================================
  // Actions - Archive
  // ============================================
  openArchiveView: () => void;
  closeArchiveView: () => void;
  selectArchivedTodo: (todo: Todo | null) => void;
  setArchiveQuery: (query: string) => void;
  incrementArchiveTick: () => void;

  // ============================================
  // Actions - Merge
  // ============================================
  openMergeModal: (targets: Todo[]) => void;
  closeMergeModal: () => void;
  setMergePrimaryId: (id: string | null) => void;
  setMergingState: (isMerging: boolean) => void;

  // ============================================
  // Actions - Activity Log
  // ============================================
  setActivityLog: (log: ActivityLogEntry[]) => void;

  // ============================================
  // Utility Actions
  // ============================================
  closeAllModals: () => void;
}

/**
 * Hook that manages all modal visibility state for the TodoList component.
 *
 * Now composed from two smaller hooks:
 * - `useModalState` for raw state
 * - `useTodoModalActions` for action handlers
 *
 * @param options - Configuration options
 * @returns Modal state and actions
 *
 * @example
 * ```tsx
 * function TodoList() {
 *   const {
 *     showShortcuts,
 *     openShortcuts,
 *     closeShortcuts,
 *     closeAllModals,
 *   } = useTodoModals();
 *
 *   return (
 *     <>
 *       <button onClick={openShortcuts}>Show Shortcuts</button>
 *       <KeyboardShortcutsModal show={showShortcuts} onClose={closeShortcuts} />
 *     </>
 *   );
 * }
 * ```
 */
export function useTodoModals(
  options: UseTodoModalsOptions = {}
): UseTodoModalsReturn {
  // Raw state from useModalState
  const state = useModalState();

  // Actions that compose state changes with lifecycle callbacks
  const actions = useTodoModalActions(state, options);

  return {
    // ============================================
    // State values (from useModalState)
    // ============================================

    // Celebration
    showCelebration: state.showCelebration,
    celebrationText: state.celebrationText,
    showEnhancedCelebration: state.showEnhancedCelebration,
    celebrationData: state.celebrationData,

    // Progress & Welcome
    showProgressSummary: state.showProgressSummary,
    showWelcomeBack: state.showWelcomeBack,
    showWeeklyChart: state.showWeeklyChart,

    // Utility Modals
    showShortcuts: state.showShortcuts,
    showActivityFeed: state.showActivityFeed,
    showStrategicDashboard: state.showStrategicDashboard,

    // Template
    templateTodo: state.templateTodo,

    // Confirm Dialog
    confirmDialog: state.confirmDialog,

    // Completion Summary
    showCompletionSummary: state.showCompletionSummary,
    completedTaskForSummary: state.completedTaskForSummary,

    // Duplicate Detection
    showDuplicateModal: state.showDuplicateModal,
    duplicateMatches: state.duplicateMatches,
    pendingTask: state.pendingTask,

    // Email Modal
    showEmailModal: state.showEmailModal,
    emailTargetTodos: state.emailTargetTodos,

    // Archive
    showArchiveView: state.showArchiveView,
    selectedArchivedTodo: state.selectedArchivedTodo,
    archiveQuery: state.archiveQuery,
    archiveTick: state.archiveTick,

    // Merge Modal
    showMergeModal: state.showMergeModal,
    mergeTargets: state.mergeTargets,
    selectedPrimaryId: state.selectedPrimaryId,
    isMerging: state.isMerging,

    // Activity Log
    activityLog: state.activityLog,

    // ============================================
    // Actions (from useTodoModalActions)
    // ============================================
    ...actions,
  };
}
