'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, AlertTriangle, CheckSquare, ChevronDown,
  Filter, RotateCcw, Check, FileText, MoreHorizontal, Layers, X
} from 'lucide-react';
import { prefersReducedMotion, DURATION } from '@/lib/animations';
import { QuickFilter, SortOption, TodoStatus } from '@/types/todo';
import TemplatePicker from '../TemplatePicker';

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
}: TodoFiltersBarProps) {
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
        {/* Quick filter dropdown - 40px minimum touch target */}
        <div className="relative flex-shrink-0">
          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
            className="appearance-none h-10 pl-3 pr-8 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Quick filter"
          >
            <option value="all">All Tasks</option>
            <option value="my_tasks">My Tasks</option>
            <option value="due_today">Due Today</option>
            <option value="overdue">Overdue</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
        </div>

        {/* Sort dropdown - 40px minimum touch target */}
        <div className="relative flex-shrink-0">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            aria-label="Sort tasks"
            className="appearance-none h-10 pl-3 pr-8 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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

        {/* Advanced Filters button with count badge - 40px minimum touch target */}
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center gap-2 h-10 px-3 text-sm font-medium rounded-lg transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
            showAdvancedFilters || advancedFilterCount > 0
              ? 'bg-[var(--accent)] text-white shadow-md'
              : 'bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]'
          }`}
          aria-expanded={showAdvancedFilters}
          aria-label={`Advanced filters${advancedFilterCount > 0 ? ` (${advancedFilterCount} active)` : ''}`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {advancedFilterCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs rounded-full bg-white/25 font-bold">
              {advancedFilterCount}
            </span>
          )}
        </button>

        {/* More dropdown - moved to right side - 40px minimum touch target */}
        <div className="relative ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowMoreDropdown(!showMoreDropdown)}
            className={`flex items-center gap-2 h-10 px-3 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
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
      {activeFilterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="region" aria-label="Active filters">
          <span className="text-xs font-medium text-[var(--text-muted)]" id="active-filters-label">
            Active:
          </span>
          {activeFilterChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  chip.onClear();
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
              aria-label={`Remove filter: ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ))}
          {activeFilterChips.length > 1 && (
            <button
              type="button"
              onClick={clearAllFilters}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  clearAllFilters();
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
              aria-label="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      )}

      {/* Selection mode hint */}
      {showBulkActions && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          Click tasks to select them
        </div>
      )}

      {/* Advanced Filters Drawer - expandable panel */}
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
              className="mt-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
              role="region"
              aria-labelledby="advanced-filters-title"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAdvancedFilters(false);
                    }
                  }}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Close advanced filters panel"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Filters Grid - responsive layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Task Properties Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Task Properties
                  </h4>

                  {/* Status filter */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as TodoStatus | 'all')}
                      className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {/* Priority toggles */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Priority
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setHighPriorityOnly(!highPriorityOnly)}
                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                          highPriorityOnly
                            ? 'bg-[var(--danger)] text-white'
                            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
                        }`}
                        role="switch"
                        aria-checked={highPriorityOnly}
                        aria-label="Show only high priority tasks"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                          High Priority Only
                        </span>
                        {highPriorityOnly && <Check className="w-4 h-4" aria-hidden="true" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
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
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Assignment
                  </h4>

                  {/* Assigned to filter */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Assigned To
                    </label>
                    <select
                      value={assignedToFilter}
                      onChange={(e) => setAssignedToFilter(e.target.value)}
                      className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Customer
                    </label>
                    <select
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="all">All Customers</option>
                      {uniqueCustomers.map((customer) => (
                        <option key={customer} value={customer}>{customer}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Attachments
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Has Attachments
                    </label>
                    <select
                      value={hasAttachmentsFilter === null ? 'all' : hasAttachmentsFilter ? 'yes' : 'no'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHasAttachmentsFilter(val === 'all' ? null : val === 'yes');
                      }}
                      className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="all">Any</option>
                      <option value="yes">With Attachments</option>
                      <option value="no">Without Attachments</option>
                    </select>
                  </div>
                </div>

                {/* Date Range Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Due Date
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={dateRangeFilter.start}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
                        placeholder="Start date"
                        className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                      <input
                        type="date"
                        value={dateRangeFilter.end}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
                        placeholder="End date"
                        className="w-full text-sm py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with actions */}
              {advancedFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    {advancedFilterCount} {advancedFilterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-dark)] font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(TodoFiltersBar);
