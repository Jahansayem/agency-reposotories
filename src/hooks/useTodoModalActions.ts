/**
 * useTodoModalActions Hook
 *
 * Action handlers that compose multiple state changes for modal operations.
 * Depends on the raw state from useModalState. Each action combines state
 * updates with optional lifecycle callbacks (onModalOpen/onModalClose).
 *
 * Extracted from useTodoModals as part of Sprint 4 component refactoring.
 */

import { useCallback } from 'react';
import { Todo, CelebrationData, ActivityLogEntry } from '@/types/todo';
import { DuplicateMatch } from '@/lib/duplicateDetection';
import type { PendingTaskData, ConfirmDialogState, UseTodoModalsOptions } from './useTodoModals';
import type { UseModalStateReturn } from './useModalState';
import { defaultConfirmDialog } from './useModalState';

export interface UseTodoModalActionsReturn {
  // Celebration
  triggerCelebration: (text: string) => void;
  dismissCelebration: () => void;
  triggerEnhancedCelebration: (data: CelebrationData) => void;
  dismissEnhancedCelebration: () => void;

  // Progress & Welcome
  openProgressSummary: () => void;
  closeProgressSummary: () => void;
  openWelcomeBack: () => void;
  closeWelcomeBack: () => void;
  openWeeklyChart: () => void;
  closeWeeklyChart: () => void;

  // Utility Modals
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openActivityFeed: () => void;
  closeActivityFeed: () => void;
  openStrategicDashboard: () => void;
  closeStrategicDashboard: () => void;

  // Template
  openTemplateModal: (todo: Todo) => void;
  closeTemplateModal: () => void;

  // Confirm Dialog
  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;

  // Completion Summary
  openCompletionSummary: (todo: Todo) => void;
  closeCompletionSummary: () => void;

  // Duplicate Detection
  openDuplicateModal: (pendingTask: PendingTaskData, matches: DuplicateMatch[]) => void;
  closeDuplicateModal: () => void;
  clearDuplicateState: () => void;

  // Email
  openEmailModal: (todos: Todo[]) => void;
  closeEmailModal: () => void;

  // Archive
  openArchiveView: () => void;
  closeArchiveView: () => void;
  selectArchivedTodo: (todo: Todo | null) => void;
  setArchiveQuery: (query: string) => void;
  incrementArchiveTick: () => void;

  // Merge
  openMergeModal: (targets: Todo[]) => void;
  closeMergeModal: () => void;
  setMergePrimaryId: (id: string | null) => void;
  setMergingState: (isMerging: boolean) => void;

  // Activity Log
  setActivityLog: (log: ActivityLogEntry[]) => void;

  // Utility
  closeAllModals: () => void;
}

/**
 * Action handlers for modal operations. Composes state from useModalState
 * with lifecycle callbacks from options.
 */
export function useTodoModalActions(
  state: UseModalStateReturn,
  options: UseTodoModalsOptions = {},
): UseTodoModalActionsReturn {
  const { onModalOpen, onModalClose } = options;

  // ============================================
  // Celebration
  // ============================================
  const triggerCelebration = useCallback((text: string) => {
    state.setCelebrationText(text);
    state.setShowCelebration(true);
    onModalOpen?.('celebration');
  }, [onModalOpen, state]);

  const dismissCelebration = useCallback(() => {
    state.setShowCelebration(false);
    state.setCelebrationText('');
    onModalClose?.('celebration');
  }, [onModalClose, state]);

  const triggerEnhancedCelebration = useCallback((data: CelebrationData) => {
    state.setCelebrationData(data);
    state.setShowEnhancedCelebration(true);
    onModalOpen?.('enhancedCelebration');
  }, [onModalOpen, state]);

  const dismissEnhancedCelebration = useCallback(() => {
    state.setShowEnhancedCelebration(false);
    state.setCelebrationData(null);
    onModalClose?.('enhancedCelebration');
  }, [onModalClose, state]);

  // ============================================
  // Progress & Welcome
  // ============================================
  const openProgressSummary = useCallback(() => {
    state.setShowProgressSummary(true);
    onModalOpen?.('progressSummary');
  }, [onModalOpen, state]);

  const closeProgressSummary = useCallback(() => {
    state.setShowProgressSummary(false);
    onModalClose?.('progressSummary');
  }, [onModalClose, state]);

  const openWelcomeBack = useCallback(() => {
    state.setShowWelcomeBack(true);
    onModalOpen?.('welcomeBack');
  }, [onModalOpen, state]);

  const closeWelcomeBack = useCallback(() => {
    state.setShowWelcomeBack(false);
    onModalClose?.('welcomeBack');
  }, [onModalClose, state]);

  const openWeeklyChart = useCallback(() => {
    state.setShowWeeklyChart(true);
    onModalOpen?.('weeklyChart');
  }, [onModalOpen, state]);

  const closeWeeklyChart = useCallback(() => {
    state.setShowWeeklyChart(false);
    onModalClose?.('weeklyChart');
  }, [onModalClose, state]);

  // ============================================
  // Utility Modals
  // ============================================
  const openShortcuts = useCallback(() => {
    state.setShowShortcuts(true);
    onModalOpen?.('shortcuts');
  }, [onModalOpen, state]);

  const closeShortcuts = useCallback(() => {
    state.setShowShortcuts(false);
    onModalClose?.('shortcuts');
  }, [onModalClose, state]);

  const openActivityFeed = useCallback(() => {
    state.setShowActivityFeed(true);
    onModalOpen?.('activityFeed');
  }, [onModalOpen, state]);

  const closeActivityFeed = useCallback(() => {
    state.setShowActivityFeed(false);
    onModalClose?.('activityFeed');
  }, [onModalClose, state]);

  const openStrategicDashboard = useCallback(() => {
    state.setShowStrategicDashboard(true);
    onModalOpen?.('strategicDashboard');
  }, [onModalOpen, state]);

  const closeStrategicDashboard = useCallback(() => {
    state.setShowStrategicDashboard(false);
    onModalClose?.('strategicDashboard');
  }, [onModalClose, state]);

  // ============================================
  // Template
  // ============================================
  const openTemplateModal = useCallback((todo: Todo) => {
    state.setTemplateTodo(todo);
    onModalOpen?.('template');
  }, [onModalOpen, state]);

  const closeTemplateModal = useCallback(() => {
    state.setTemplateTodo(null);
    onModalClose?.('template');
  }, [onModalClose, state]);

  // ============================================
  // Confirm Dialog
  // ============================================
  const openConfirmDialog = useCallback((title: string, message: string, onConfirm: () => void) => {
    state.setConfirmDialog({ isOpen: true, title, message, onConfirm });
    onModalOpen?.('confirmDialog');
  }, [onModalOpen, state]);

  const closeConfirmDialog = useCallback(() => {
    state.setConfirmDialog(defaultConfirmDialog);
    onModalClose?.('confirmDialog');
  }, [onModalClose, state]);

  // ============================================
  // Completion Summary
  // ============================================
  const openCompletionSummary = useCallback((todo: Todo) => {
    state.setCompletedTaskForSummary(todo);
    state.setShowCompletionSummary(true);
    onModalOpen?.('completionSummary');
  }, [onModalOpen, state]);

  const closeCompletionSummary = useCallback(() => {
    state.setShowCompletionSummary(false);
    state.setCompletedTaskForSummary(null);
    onModalClose?.('completionSummary');
  }, [onModalClose, state]);

  // ============================================
  // Duplicate Detection
  // ============================================
  const openDuplicateModal = useCallback((task: PendingTaskData, matches: DuplicateMatch[]) => {
    state.setPendingTask(task);
    state.setDuplicateMatches(matches);
    state.setShowDuplicateModal(true);
    onModalOpen?.('duplicateDetection');
  }, [onModalOpen, state]);

  const closeDuplicateModal = useCallback(() => {
    state.setShowDuplicateModal(false);
    onModalClose?.('duplicateDetection');
  }, [onModalClose, state]);

  const clearDuplicateState = useCallback(() => {
    state.setShowDuplicateModal(false);
    state.setDuplicateMatches([]);
    state.setPendingTask(null);
    onModalClose?.('duplicateDetection');
  }, [onModalClose, state]);

  // ============================================
  // Email
  // ============================================
  const openEmailModal = useCallback((todos: Todo[]) => {
    state.setEmailTargetTodos(todos);
    state.setShowEmailModal(true);
    onModalOpen?.('email');
  }, [onModalOpen, state]);

  const closeEmailModal = useCallback(() => {
    state.setShowEmailModal(false);
    state.setEmailTargetTodos([]);
    onModalClose?.('email');
  }, [onModalClose, state]);

  // ============================================
  // Archive
  // ============================================
  const openArchiveView = useCallback(() => {
    state.setShowArchiveView(true);
    onModalOpen?.('archive');
  }, [onModalOpen, state]);

  const closeArchiveView = useCallback(() => {
    state.setShowArchiveView(false);
    state.setSelectedArchivedTodo(null);
    state.setArchiveQueryState('');
    onModalClose?.('archive');
  }, [onModalClose, state]);

  const selectArchivedTodo = useCallback((todo: Todo | null) => {
    state.setSelectedArchivedTodo(todo);
  }, [state]);

  const setArchiveQuery = useCallback((query: string) => {
    state.setArchiveQueryState(query);
  }, [state]);

  const incrementArchiveTick = useCallback(() => {
    state.setArchiveTick((prev) => prev + 1);
  }, [state]);

  // ============================================
  // Merge
  // ============================================
  const openMergeModal = useCallback((targets: Todo[]) => {
    state.setMergeTargets(targets);
    state.setSelectedPrimaryId(targets[0]?.id || null);
    state.setShowMergeModal(true);
    onModalOpen?.('merge');
  }, [onModalOpen, state]);

  const closeMergeModal = useCallback(() => {
    state.setShowMergeModal(false);
    state.setMergeTargets([]);
    state.setSelectedPrimaryId(null);
    state.setIsMerging(false);
    onModalClose?.('merge');
  }, [onModalClose, state]);

  const setMergePrimaryId = useCallback((id: string | null) => {
    state.setSelectedPrimaryId(id);
  }, [state]);

  const setMergingState = useCallback((merging: boolean) => {
    state.setIsMerging(merging);
  }, [state]);

  // ============================================
  // Activity Log
  // ============================================
  const setActivityLog = useCallback((log: ActivityLogEntry[]) => {
    state.setActivityLogState(log);
  }, [state]);

  // ============================================
  // Close All
  // ============================================
  const closeAllModals = useCallback(() => {
    // Celebration
    state.setShowCelebration(false);
    state.setCelebrationText('');
    state.setShowEnhancedCelebration(false);
    state.setCelebrationData(null);

    // Progress & Welcome
    state.setShowProgressSummary(false);
    state.setShowWelcomeBack(false);
    state.setShowWeeklyChart(false);

    // Utility
    state.setShowShortcuts(false);
    state.setShowActivityFeed(false);
    state.setShowStrategicDashboard(false);

    // Template
    state.setTemplateTodo(null);

    // Confirm Dialog
    state.setConfirmDialog(defaultConfirmDialog);

    // Completion Summary
    state.setShowCompletionSummary(false);
    state.setCompletedTaskForSummary(null);

    // Duplicate Detection
    state.setShowDuplicateModal(false);
    state.setDuplicateMatches([]);
    state.setPendingTask(null);

    // Email
    state.setShowEmailModal(false);
    state.setEmailTargetTodos([]);

    // Archive
    state.setShowArchiveView(false);
    state.setSelectedArchivedTodo(null);
    state.setArchiveQueryState('');

    // Merge
    state.setShowMergeModal(false);
    state.setMergeTargets([]);
    state.setSelectedPrimaryId(null);
    state.setIsMerging(false);

    onModalClose?.('all');
  }, [onModalClose, state]);

  return {
    // Celebration
    triggerCelebration,
    dismissCelebration,
    triggerEnhancedCelebration,
    dismissEnhancedCelebration,

    // Progress & Welcome
    openProgressSummary,
    closeProgressSummary,
    openWelcomeBack,
    closeWelcomeBack,
    openWeeklyChart,
    closeWeeklyChart,

    // Utility Modals
    openShortcuts,
    closeShortcuts,
    openActivityFeed,
    closeActivityFeed,
    openStrategicDashboard,
    closeStrategicDashboard,

    // Template
    openTemplateModal,
    closeTemplateModal,

    // Confirm Dialog
    openConfirmDialog,
    closeConfirmDialog,

    // Completion Summary
    openCompletionSummary,
    closeCompletionSummary,

    // Duplicate Detection
    openDuplicateModal,
    closeDuplicateModal,
    clearDuplicateState,

    // Email
    openEmailModal,
    closeEmailModal,

    // Archive
    openArchiveView,
    closeArchiveView,
    selectArchivedTodo,
    setArchiveQuery,
    incrementArchiveTick,

    // Merge
    openMergeModal,
    closeMergeModal,
    setMergePrimaryId,
    setMergingState,

    // Activity Log
    setActivityLog,

    // Utility
    closeAllModals,
  };
}
