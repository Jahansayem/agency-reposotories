'use client';

import { memo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, AlertTriangle, CheckSquare, ChevronDown,
  Filter, RotateCcw, Check, FileText, MoreHorizontal, Layers, X, Flame
} from 'lucide-react';
import { prefersReducedMotion, DURATION } from '@/lib/animations';
import { QuickFilter, SortOption, TodoStatus } from '@/types/todo';
import TemplatePicker from '../TemplatePicker';
import { FilterBottomSheet } from '../ui/FilterBottomSheet';
import { FilterChip, FilterChipOverflow } from '../ui/FilterChip';
import { useIsMobile } from '@/hooks/useIsMobile';

interface DateRange {
  start: string;
  end: string;
}

interface TodoFiltersBarProps {
  // Quick filter state
  quickFilter: QuickFilter;
  setQuickFilter: (filter: QuickFilter) => void;

  // Toggle states
  highPriorityOnly: boolean;
  setHighPriorityOnly: (value: boolean) => void;
  showCompleted: boolean;
  setShowCompleted: (value: boolean) => void;

  // Advanced filters
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  statusFilter: TodoStatus | 'all';
  setStatusFilter: (status: TodoStatus | 'all') => void;
  assignedToFilter: string;
  setAssignedToFilter: (assignee: string) => void;
  customerFilter: string;
  setCustomerFilter: (customer: string) => void;
  hasAttachmentsFilter: boolean | null;
  setHasAttachmentsFilter: (value: boolean | null) => void;
  dateRangeFilter: DateRange;
  setDateRangeFilter: (range: DateRange) => void;

  // Sort
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Dropdown states
  showMoreDropdown: boolean;
  setShowMoreDropdown: (show: boolean) => void;
  showTemplatePicker: boolean;
  setShowTemplatePicker: (show: boolean) => void;

  // Bulk actions
  showBulkActions: boolean;
  setShowBulkActions: (show: boolean) => void;
  clearSelection: () => void;

  // Sectioned view
  useSectionedView: boolean;
  setUseSectionedView: (value: boolean) => void;
  shouldUseSections: boolean;

  // Data for dropdowns
  users: string[];
  uniqueCustomers: string[];

  // Template callback
  onAddFromTemplate: (text: string, priority: 'low' | 'medium' | 'high' | 'urgent', assignedTo?: string, subtasks?: { id: string; text: string; completed: boolean }[]) => void;

  // Theme
  userName: string;

  // Result count for live feedback
  filteredCount?: number;
  totalCount?: number;

  // Ref for search input focus (keyboard shortcut)
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

function TodoFiltersBar({
  quickFilter,
  setQuickFilter,
  highPriorityOnly,
  setHighPriorityOnly,
  showCompleted,
  setShowCompleted,
  showAdvancedFilters,
  setShowAdvancedFilters,
  statusFilter,
  setStatusFilter,
  assignedToFilter,
  setAssignedToFilter,
  customerFilter,
  setCustomerFilter,
  hasAttachmentsFilter,
  setHasAttachmentsFilter,
  dateRangeFilter,
  setDateRangeFilter,
  sortOption,
  setSortOption,
  searchQuery,
  setSearchQuery,
  showMoreDropdown,
  setShowMoreDropdown,
  showTemplatePicker,
  setShowTemplatePicker,
  showBulkActions,
  setShowBulkActions,
  clearSelection,
  useSectionedView,
  setUseSectionedView,
  shouldUseSections,
  users,
  uniqueCustomers,
  onAddFromTemplate,
  userName,
  filteredCount,
  totalCount,
  searchInputRef,
}: TodoFiltersBarProps) {
  const isMobile = useIsMobile();
  const filtersBarRef = useRef<HTMLDivElement>(null);
  // Global keyboard shortcuts for filters
  // / = Focus search, f = Toggle filters panel, m/t/o/a = Quick filters, Escape = Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (except Escape)
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement ||
                       target instanceof HTMLTextAreaElement ||
                       target.isContentEditable;

      if (isTyping) {
        if (e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          if (searchQuery) setSearchQuery('');
          if (showAdvancedFilters) setShowAdvancedFilters(false);
        }
        return;
      }

      // Focus search with /
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef?.current?.focus();
      }

      // Toggle advanced filters with f
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowAdvancedFilters(!showAdvancedFilters);
      }

      // Quick filter shortcuts
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setQuickFilter(quickFilter === 'my_tasks' ? 'all' : 'my_tasks');
      }
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setQuickFilter(quickFilter === 'due_today' ? 'all' : 'due_today');
      }
      if (e.key === 'o' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue');
      }
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setQuickFilter('all');
      }

      // Toggle high priority with p
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHighPriorityOnly(!highPriorityOnly);
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAdvancedFilters) {
          setShowAdvancedFilters(false);
        } else if (showMoreDropdown) {
          setShowMoreDropdown(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAdvancedFilters, setShowAdvancedFilters, searchQuery, setSearchQuery,
      quickFilter, setQuickFilter, highPriorityOnly, setHighPriorityOnly,
      showMoreDropdown, setShowMoreDropdown, searchInputRef]);

  const hasActiveFilters = quickFilter !== 'all' ||
    highPriorityOnly ||
    showCompleted ||
    searchQuery ||
    statusFilter !== 'all' ||
    assignedToFilter !== 'all' ||
    customerFilter !== 'all' ||
    hasAttachmentsFilter !== null ||
    dateRangeFilter.start ||
    dateRangeFilter.end;

  const advancedFilterCount = [
    statusFilter !== 'all',
    assignedToFilter !== 'all',
    customerFilter !== 'all',
    hasAttachmentsFilter !== null,
    dateRangeFilter.start || dateRangeFilter.end
  ].filter(Boolean).length;

  const activeFilterChips = [
    quickFilter !== 'all' && {
      label: quickFilter === 'my_tasks' ? 'Mine' : quickFilter === 'due_today' ? 'Due Today' : 'Overdue',
      onClear: () => setQuickFilter('all'),
    },
    highPriorityOnly && {
      label: 'High Priority',
      onClear: () => setHighPriorityOnly(false),
    },
    showCompleted && {
      label: 'Completed',
      onClear: () => setShowCompleted(false),
    },
    searchQuery && {
      label: `Search: "${searchQuery}"`,
      onClear: () => setSearchQuery(''),
    },
    statusFilter !== 'all' && {
      label: `Status: ${statusFilter.replace('_', ' ')}`,
      onClear: () => setStatusFilter('all'),
    },
    assignedToFilter !== 'all' && {
      label: `Assigned: ${assignedToFilter === 'unassigned' ? 'Unassigned' : assignedToFilter}`,
      onClear: () => setAssignedToFilter('all'),
    },
    customerFilter !== 'all' && {
      label: `Customer: ${customerFilter}`,
      onClear: () => setCustomerFilter('all'),
    },
    hasAttachmentsFilter !== null && {
      label: `Attachments: ${hasAttachmentsFilter ? 'Yes' : 'No'}`,
      onClear: () => setHasAttachmentsFilter(null),
    },
    (dateRangeFilter.start || dateRangeFilter.end) && {
      label: `Due: ${dateRangeFilter.start || 'Any'} - ${dateRangeFilter.end || 'Any'}`,
      onClear: () => setDateRangeFilter({ start: '', end: '' }),
    },
  ].filter(Boolean) as { label: string; onClear: () => void }[];

  const clearAllFilters = () => {
    setQuickFilter('all');
    setHighPriorityOnly(false);
    setShowCompleted(false);
    setSearchQuery('');
    setStatusFilter('all');
    setAssignedToFilter('all');
    setCustomerFilter('all');
    setHasAttachmentsFilter(null);
    setDateRangeFilter({ start: '', end: '' });
  };

  return (
    <div className="mb-4">
      {/* ═══════════════════════════════════════════════════════════════════════════
          SIMPLIFIED FILTERS BAR - UX Phase 2 (Feb 2026)
          Layout: 3 main controls + active filter chips
          - Quick Filter dropdown (All/Mine/Today/Overdue)
          - Sort dropdown (New/Due/Priority/etc.)
          - Advanced Filters button (opens drawer with all filters)
          Goal: Reduce visual clutter, improve scannability
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* Main Controls Row - 3 simplified controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {/* Quick filter dropdown - 44px minimum touch target (WCAG 2.5.5) */}
        <div className="relative flex-shrink-0">
          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
            data-testid="quick-filter"
            className="appearance-none min-h-[44px] h-11 pl-3 pr-8 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Quick filter"
          >
            <option value="all">All Tasks</option>
            <option value="my_tasks">My Tasks</option>
            <option value="due_today">Due Today</option>
            <option value="overdue">Overdue</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
        </div>

        {/* Sort dropdown - 44px minimum touch target (WCAG 2.5.5) */}
        <div className="relative flex-shrink-0">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            aria-label="Sort tasks"
            className="appearance-none min-h-[44px] h-11 pl-3 pr-8 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="created">Newest First</option>
            <option value="due_date">By Due Date</option>
            <option value="priority">By Priority</option>
            <option value="urgency">By Urgency</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="custom">Custom Order</option>
          </select>
          <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
        </div>

        {/* High Priority Quick Toggle - Promoted from advanced panel for easy access */}
        <button
          type="button"
          onClick={() => setHighPriorityOnly(!highPriorityOnly)}
          className={`flex items-center gap-1.5 min-h-[44px] h-11 px-3 text-sm font-medium rounded-lg transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] touch-manipulation ${
            highPriorityOnly
              ? 'bg-[var(--danger)] text-white shadow-md'
              : 'bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]'
          }`}
          aria-pressed={highPriorityOnly}
          aria-label={highPriorityOnly ? 'Remove high priority filter' : 'Show only high priority tasks'}
          title="Press 'p' to toggle"
        >
          <Flame className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Urgent</span>
        </button>

        {/* Advanced Filters button with count badge - 44px minimum touch target (WCAG 2.5.5) */}
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center gap-2 min-h-[44px] h-11 px-3 text-sm font-medium rounded-lg transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] touch-manipulation ${
            showAdvancedFilters || advancedFilterCount > 0
              ? 'bg-[var(--accent)] text-white shadow-md'
              : 'bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]'
          }`}
          aria-expanded={showAdvancedFilters}
          aria-label={`Advanced filters${advancedFilterCount > 0 ? ` (${advancedFilterCount} active)` : ''}`}
          title="Press 'f' to toggle"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {advancedFilterCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs rounded-full bg-white/30 font-bold">
              {advancedFilterCount}
            </span>
          )}
        </button>

        {/* Live Result Count - Shows immediate feedback */}
        {filteredCount !== undefined && totalCount !== undefined && (
          <span className="hidden sm:flex items-center text-sm text-[var(--text-muted)] flex-shrink-0" aria-live="polite">
            {filteredCount === totalCount ? (
              <span>{totalCount} tasks</span>
            ) : (
              <span>{filteredCount} of {totalCount}</span>
            )}
          </span>
        )}

        {/* More dropdown - moved to right side - 44px minimum touch target (WCAG 2.5.5) */}
        <div className="relative ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowMoreDropdown(!showMoreDropdown)}
            className={`flex items-center gap-2 min-h-[44px] h-11 px-3 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
              showMoreDropdown || showBulkActions || useSectionedView
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]'
            }`}
            aria-expanded={showMoreDropdown}
            aria-haspopup="menu"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">More</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showMoreDropdown && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowMoreDropdown(false)} />

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg border z-50 overflow-hidden bg-[var(--surface)] border-[var(--border)]">
                {/* Templates button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDropdown(false);
                    setShowTemplatePicker(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                >
                  <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>Templates</span>
                </button>

                {/* Select/Bulk actions button */}
                <button
                  type="button"
                  onClick={() => {
                    if (showBulkActions) {
                      clearSelection();
                    }
                    setShowBulkActions(!showBulkActions);
                    setShowMoreDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    showBulkActions
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{showBulkActions ? 'Cancel Selection' : 'Select Tasks'}</span>
                  {showBulkActions && <Check className="w-4 h-4 ml-auto text-[var(--accent)]" />}
                </button>

                {/* Sections Toggle - Show when not using custom sort */}
                {shouldUseSections && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseSectionedView(!useSectionedView);
                      setShowMoreDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      useSectionedView
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                    }`}
                    aria-pressed={useSectionedView}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Group by Sections</span>
                    {useSectionedView && <Check className="w-4 h-4 ml-auto text-[var(--accent)]" />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Template Picker - controlled from More dropdown */}
        <div className="relative">
          <TemplatePicker
            currentUserName={userName}
            users={users}
            isOpen={showTemplatePicker}
            onOpenChange={setShowTemplatePicker}
            hideTrigger={true}
            onSelectTemplate={(text, priority, assignedTo, subtasks) => {
              onAddFromTemplate(text, priority, assignedTo, subtasks);
              setShowTemplatePicker(false);
            }}
          />
        </div>
      </div>

      {/* Active Filter Chips - Shows what's currently filtered */}
      {/* Mobile: Show max 2 chips + overflow, Desktop: Show all */}
      <AnimatePresence mode="popLayout">
        {activeFilterChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex flex-wrap items-center gap-2"
            role="region"
            aria-label="Active filters"
          >
            <span className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide" id="active-filters-label">
              Active:
            </span>

            {/* Render chips with mobile overflow handling */}
            <AnimatePresence mode="popLayout">
              {(isMobile ? activeFilterChips.slice(0, 2) : activeFilterChips).map((chip) => (
                <FilterChip
                  key={chip.label}
                  label={chip.label}
                  onClear={chip.onClear}
                  variant={chip.label.includes('High Priority') ? 'danger' : 'default'}
                />
              ))}
            </AnimatePresence>

            {/* Mobile overflow indicator */}
            {isMobile && activeFilterChips.length > 2 && (
              <FilterChipOverflow
                count={activeFilterChips.length - 2}
                onClick={() => setShowAdvancedFilters(true)}
              />
            )}

            {/* Clear All button - 44px touch target */}
            {activeFilterChips.length > 1 && (
              <motion.button
                type="button"
                onClick={clearAllFilters}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 touch-manipulation"
                aria-label="Clear all active filters"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Clear All</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection mode hint */}
      {showBulkActions && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          Click tasks to select them
        </div>
      )}

      {/* Advanced Filters Content - shared between desktop panel and mobile bottom sheet */}
      {(() => {
        const advancedFiltersContent = (
          <>
            {/* Filters Grid - responsive layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Task Properties Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--surface-3)] px-2 py-1 rounded-md inline-block">
                  Task Properties
                </h4>

                {/* Status filter */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TodoStatus | 'all')}
                    className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Priority toggles */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Visibility
                  </label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCompleted(!showCompleted)}
                      className={`flex items-center justify-between min-h-[44px] px-3 py-2 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] touch-manipulation ${
                        showCompleted
                          ? 'bg-[var(--success)] text-white'
                          : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
                      }`}
                      role="switch"
                      aria-checked={showCompleted}
                      aria-label="Show completed tasks"
                    >
                      <span className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" aria-hidden="true" />
                        Show Completed
                      </span>
                      {showCompleted && <Check className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--surface-3)] px-2 py-1 rounded-md inline-block">
                  Assignment
                </h4>

                {/* Assigned to filter */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Assigned To
                  </label>
                  <select
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="all">Anyone</option>
                    <option value="unassigned">Unassigned</option>
                    {users.map((user) => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                {/* Customer filter */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Customer
                  </label>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="all">All Customers{uniqueCustomers.length > 0 ? ` (${uniqueCustomers.length})` : ''}</option>
                    {uniqueCustomers.length === 0 && (
                      <option disabled>No customer names detected</option>
                    )}
                    {uniqueCustomers.map((customer) => (
                      <option key={customer} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--surface-3)] px-2 py-1 rounded-md inline-block">
                  Attachments
                </h4>

                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Has Attachments
                  </label>
                  <select
                    value={hasAttachmentsFilter === null ? 'all' : hasAttachmentsFilter ? 'yes' : 'no'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHasAttachmentsFilter(val === 'all' ? null : val === 'yes');
                    }}
                    className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="all">Any</option>
                    <option value="yes">With Attachments</option>
                    <option value="no">Without Attachments</option>
                  </select>
                </div>
              </div>

              {/* Date Range Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--surface-3)] px-2 py-1 rounded-md inline-block">
                  Due Date
                </h4>

                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateRangeFilter.start}
                      onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
                      aria-label="Start date"
                      className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                    <input
                      type="date"
                      value={dateRangeFilter.end}
                      onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
                      aria-label="End date"
                      className="w-full min-h-[44px] text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with actions */}
            {(advancedFilterCount > 0 || hasActiveFilters) && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  {activeFilterChips.length} {activeFilterChips.length === 1 ? 'filter' : 'filters'} active
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 min-h-[44px] px-3 py-2 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 font-medium transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)]">
                <span className="font-medium">Keyboard:</span>{' '}
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded text-[10px] font-mono">/</kbd> search{' '}
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded text-[10px] font-mono">m</kbd> mine{' '}
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded text-[10px] font-mono">t</kbd> today{' '}
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded text-[10px] font-mono">p</kbd> priority{' '}
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded text-[10px] font-mono">esc</kbd> close
              </p>
            </div>
          </>
        );

        return (
          <>
            {/* Mobile: Bottom Sheet */}
            {isMobile && (
              <FilterBottomSheet
                isOpen={showAdvancedFilters}
                onClose={() => setShowAdvancedFilters(false)}
                title="Advanced Filters"
              >
                {advancedFiltersContent}
              </FilterBottomSheet>
            )}

            {/* Desktop: Inline Panel */}
            {!isMobile && (
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={prefersReducedMotion() ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: DURATION.normal }}
                    className="overflow-hidden"
                  >
                    <div
                      ref={filtersBarRef}
                      className="mt-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
                      role="region"
                      aria-labelledby="advanced-filters-title"
                      tabIndex={-1}
                    >
                      {/* Header with close button */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2" id="advanced-filters-title">
                          <Filter className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                          Advanced Filters
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedFilters(false)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          aria-label="Close advanced filters panel"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {advancedFiltersContent}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        );
      })()}
    </div>
  );
}

export default memo(TodoFiltersBar);
