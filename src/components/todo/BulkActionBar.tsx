'use client';

import { memo } from 'react';
import { X, Trash2, Check, GitMerge, ChevronDown } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

interface BulkActionBarProps {
  selectedCount: number;
  users: string[];
  viewMode: 'list' | 'kanban';
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkComplete: () => void;
  onBulkAssign: (assignedTo: string) => void;
  onBulkReschedule: (date: string) => void;
  onInitiateMerge: () => void;
  getDateOffset: (days: number) => string;
}

function BulkActionBar({
  selectedCount,
  users,
  viewMode,
  onClearSelection,
  onBulkDelete,
  onBulkComplete,
  onBulkAssign,
  onBulkReschedule,
  onInitiateMerge,
  getDateOffset,
}: BulkActionBarProps) {
  const canDeleteTasks = usePermission('can_delete_tasks');
  const canEditAnyTask = usePermission('can_edit_any_task');
  const canAssignTasks = usePermission('can_assign_tasks');

  return (
    <div data-testid="bulk-action-bar" className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[var(--surface)] border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className={`mx-auto px-4 sm:px-6 py-3 ${viewMode === 'kanban' ? 'max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]' : 'max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl'}`}>
          <div className="flex items-center justify-between gap-4">
            {/* Left side - selection info with dismiss button */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClearSelection}
                className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                title="Clear selection"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span data-testid="selection-count" className="text-sm font-bold text-[var(--foreground)]">{selectedCount}</span>
                <span className="text-sm text-[var(--text-muted)]">selected</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-[var(--border)]" />
            </div>

            {/* Action buttons - horizontal inline */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {/* Mark Complete */}
              <button
                onClick={onBulkComplete}
                disabled={!canEditAnyTask}
                data-testid="bulk-complete-button"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-lg)] text-white transition-all text-sm font-medium whitespace-nowrap ${
                  canEditAnyTask ? 'bg-[var(--success)] hover:opacity-90' : 'bg-[var(--success)] opacity-40 cursor-not-allowed'
                }`}
                title={!canEditAnyTask ? 'You do not have permission to edit tasks' : undefined}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Mark Complete</span>
              </button>

              {/* Reassign dropdown */}
              <div className="relative" data-testid="bulk-assign-dropdown">
                <select
                  onChange={(e) => { if (e.target.value) onBulkAssign(e.target.value); e.target.value = ''; }}
                  disabled={!canAssignTasks}
                  data-testid="bulk-assign-button"
                  className={`appearance-none px-3 py-2 pr-7 rounded-[var(--radius-lg)] bg-[var(--surface-2)] text-[var(--foreground)] transition-colors text-sm font-medium border border-[var(--border)] ${
                    canAssignTasks ? 'hover:bg-[var(--surface-3)] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                  aria-label="Reassign"
                  title={!canAssignTasks ? 'You do not have permission to assign tasks' : undefined}
                >
                  <option value="">Reassign</option>
                  {users.map((user) => (
                    <option key={user} value={user} data-testid={`assignee-option-${user}`}>{user}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[var(--text-muted)]" />
              </div>

              {/* Change Date dropdown */}
              <div className="relative" data-testid="bulk-reschedule-options">
                <select
                  onChange={(e) => {
                    if (e.target.value) onBulkReschedule(e.target.value);
                    e.target.value = '';
                  }}
                  disabled={!canEditAnyTask}
                  data-testid="bulk-reschedule-button"
                  className={`appearance-none px-3 py-2 pr-7 rounded-[var(--radius-lg)] bg-[var(--surface-2)] text-[var(--foreground)] transition-colors text-sm font-medium border border-[var(--border)] ${
                    canEditAnyTask ? 'hover:bg-[var(--surface-3)] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                  aria-label="Change Date"
                  title={!canEditAnyTask ? 'You do not have permission to edit tasks' : undefined}
                >
                  <option value="">Change Date</option>
                  <option value={getDateOffset(0)}>Today</option>
                  <option value={getDateOffset(1)} data-testid="reschedule-tomorrow">Tomorrow</option>
                  <option value={getDateOffset(7)}>Next Week</option>
                  <option value={getDateOffset(30)}>Next Month</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[var(--text-muted)]" />
              </div>

              {/* Merge - only show when 2+ selected */}
              {selectedCount >= 2 && (
                <button
                  onClick={onInitiateMerge}
                  data-testid="bulk-merge-button"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--brand-blue)] text-white hover:opacity-90 transition-all text-sm font-medium whitespace-nowrap"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge
                </button>
              )}

              {/* Delete - disabled if user lacks can_delete_tasks permission */}
              <button
                onClick={onBulkDelete}
                disabled={!canDeleteTasks}
                data-testid="bulk-delete-button"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-lg)] text-white transition-all text-sm font-medium whitespace-nowrap ${
                  canDeleteTasks
                    ? 'bg-[var(--danger)] hover:opacity-90'
                    : 'bg-[var(--danger)] opacity-40 cursor-not-allowed'
                }`}
                title={!canDeleteTasks ? 'You do not have permission to delete tasks' : undefined}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(BulkActionBar);
