/**
 * useModalState Hook
 *
 * Manages basic modal open/close state (the useState pairs) for all modals
 * in the TodoList component. This hook contains only the raw state -- no
 * action logic that combines multiple state changes.
 *
 * Extracted from useTodoModals as part of Sprint 4 component refactoring.
 */

import { useState } from 'react';
import { Todo, CelebrationData, ActivityLogEntry } from '@/types/todo';
import { DuplicateMatch } from '@/lib/duplicateDetection';
import type { PendingTaskData, ConfirmDialogState } from './useTodoModals';

export const defaultConfirmDialog: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
};

export interface UseModalStateReturn {
  // Celebration
  showCelebration: boolean;
  setShowCelebration: (v: boolean) => void;
  celebrationText: string;
  setCelebrationText: (v: string) => void;
  showEnhancedCelebration: boolean;
  setShowEnhancedCelebration: (v: boolean) => void;
  celebrationData: CelebrationData | null;
  setCelebrationData: (v: CelebrationData | null) => void;

  // Progress & Welcome
  showProgressSummary: boolean;
  setShowProgressSummary: (v: boolean) => void;
  showWelcomeBack: boolean;
  setShowWelcomeBack: (v: boolean) => void;
  showWeeklyChart: boolean;
  setShowWeeklyChart: (v: boolean) => void;

  // Utility Modals
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
  showActivityFeed: boolean;
  setShowActivityFeed: (v: boolean) => void;
  showStrategicDashboard: boolean;
  setShowStrategicDashboard: (v: boolean) => void;

  // Template
  templateTodo: Todo | null;
  setTemplateTodo: (v: Todo | null) => void;

  // Confirm Dialog
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: (v: ConfirmDialogState) => void;

  // Completion Summary
  showCompletionSummary: boolean;
  setShowCompletionSummary: (v: boolean) => void;
  completedTaskForSummary: Todo | null;
  setCompletedTaskForSummary: (v: Todo | null) => void;

  // Duplicate Detection
  showDuplicateModal: boolean;
  setShowDuplicateModal: (v: boolean) => void;
  duplicateMatches: DuplicateMatch[];
  setDuplicateMatches: (v: DuplicateMatch[]) => void;
  pendingTask: PendingTaskData | null;
  setPendingTask: (v: PendingTaskData | null) => void;

  // Email Modal
  showEmailModal: boolean;
  setShowEmailModal: (v: boolean) => void;
  emailTargetTodos: Todo[];
  setEmailTargetTodos: (v: Todo[]) => void;

  // Archive
  showArchiveView: boolean;
  setShowArchiveView: (v: boolean) => void;
  selectedArchivedTodo: Todo | null;
  setSelectedArchivedTodo: (v: Todo | null) => void;
  archiveQuery: string;
  setArchiveQueryState: (v: string) => void;
  archiveTick: number;
  setArchiveTick: React.Dispatch<React.SetStateAction<number>>;

  // Merge Modal
  showMergeModal: boolean;
  setShowMergeModal: (v: boolean) => void;
  mergeTargets: Todo[];
  setMergeTargets: (v: Todo[]) => void;
  selectedPrimaryId: string | null;
  setSelectedPrimaryId: (v: string | null) => void;
  isMerging: boolean;
  setIsMerging: (v: boolean) => void;

  // Activity Log
  activityLog: ActivityLogEntry[];
  setActivityLogState: (v: ActivityLogEntry[]) => void;
}

/**
 * Raw state management for all modals. Returns state + setters.
 */
export function useModalState(): UseModalStateReturn {
  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState('');
  const [showEnhancedCelebration, setShowEnhancedCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  // Progress & Welcome
  const [showProgressSummary, setShowProgressSummary] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showWeeklyChart, setShowWeeklyChart] = useState(false);

  // Utility Modals
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showStrategicDashboard, setShowStrategicDashboard] = useState(false);

  // Template
  const [templateTodo, setTemplateTodo] = useState<Todo | null>(null);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);

  // Completion Summary
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [completedTaskForSummary, setCompletedTaskForSummary] = useState<Todo | null>(null);

  // Duplicate Detection
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingTask, setPendingTask] = useState<PendingTaskData | null>(null);

  // Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTargetTodos, setEmailTargetTodos] = useState<Todo[]>([]);

  // Archive
  const [showArchiveView, setShowArchiveView] = useState(false);
  const [selectedArchivedTodo, setSelectedArchivedTodo] = useState<Todo | null>(null);
  const [archiveQuery, setArchiveQueryState] = useState('');
  const [archiveTick, setArchiveTick] = useState(0);

  // Merge Modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<Todo[]>([]);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Activity Log
  const [activityLog, setActivityLogState] = useState<ActivityLogEntry[]>([]);

  return {
    // Celebration
    showCelebration, setShowCelebration,
    celebrationText, setCelebrationText,
    showEnhancedCelebration, setShowEnhancedCelebration,
    celebrationData, setCelebrationData,

    // Progress & Welcome
    showProgressSummary, setShowProgressSummary,
    showWelcomeBack, setShowWelcomeBack,
    showWeeklyChart, setShowWeeklyChart,

    // Utility Modals
    showShortcuts, setShowShortcuts,
    showActivityFeed, setShowActivityFeed,
    showStrategicDashboard, setShowStrategicDashboard,

    // Template
    templateTodo, setTemplateTodo,

    // Confirm Dialog
    confirmDialog, setConfirmDialog,

    // Completion Summary
    showCompletionSummary, setShowCompletionSummary,
    completedTaskForSummary, setCompletedTaskForSummary,

    // Duplicate Detection
    showDuplicateModal, setShowDuplicateModal,
    duplicateMatches, setDuplicateMatches,
    pendingTask, setPendingTask,

    // Email Modal
    showEmailModal, setShowEmailModal,
    emailTargetTodos, setEmailTargetTodos,

    // Archive
    showArchiveView, setShowArchiveView,
    selectedArchivedTodo, setSelectedArchivedTodo,
    archiveQuery, setArchiveQueryState,
    archiveTick, setArchiveTick,

    // Merge Modal
    showMergeModal, setShowMergeModal,
    mergeTargets, setMergeTargets,
    selectedPrimaryId, setSelectedPrimaryId,
    isMerging, setIsMerging,

    // Activity Log
    activityLog, setActivityLogState,
  };
}
