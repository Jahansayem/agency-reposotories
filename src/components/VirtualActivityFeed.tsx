'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDistance } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ArrowRightCircle,
  Tag,
  Calendar,
  UserPlus,
  ListChecks,
  FileText,
  Paperclip,
  GitMerge,
} from 'lucide-react';

/**
 * VirtualActivityFeed Component
 * Sprint 3 Issue #33: Virtual Scrolling
 *
 * Renders a virtualized activity feed for optimal performance
 * Handles hundreds of activity log entries without lag
 */

interface ActivityLogEntry {
  id: string;
  action: string;
  todo_text: string | null;
  user_name: string;
  created_at: string;
  details?: Record<string, any>;
}

interface VirtualActivityFeedProps {
  activityLog: ActivityLogEntry[];
  estimatedItemHeight?: number;
  overscan?: number;
}

// Icon mapping for different actions
const actionIcons: Record<string, any> = {
  task_created: CheckCircle2,
  task_updated: Edit,
  task_deleted: Trash2,
  task_completed: CheckCircle2,
  task_reopened: XCircle,
  status_changed: ArrowRightCircle,
  priority_changed: Tag,
  assigned_to_changed: UserPlus,
  due_date_changed: Calendar,
  subtask_added: ListChecks,
  subtask_completed: CheckCircle2,
  subtask_deleted: XCircle,
  notes_updated: FileText,
  attachment_added: Paperclip,
  attachment_removed: Trash2,
  tasks_merged: GitMerge,
};

// Color mapping for different actions
const actionColors: Record<string, string> = {
  task_created: 'text-green-600 dark:text-green-400',
  task_updated: 'text-blue-600 dark:text-blue-400',
  task_deleted: 'text-red-600 dark:text-red-400',
  task_completed: 'text-green-600 dark:text-green-400',
  task_reopened: 'text-yellow-600 dark:text-yellow-400',
  status_changed: 'text-purple-600 dark:text-purple-400',
  priority_changed: 'text-orange-600 dark:text-orange-400',
  assigned_to_changed: 'text-blue-600 dark:text-blue-400',
  due_date_changed: 'text-indigo-600 dark:text-indigo-400',
  subtask_added: 'text-green-600 dark:text-green-400',
  subtask_completed: 'text-green-600 dark:text-green-400',
  subtask_deleted: 'text-red-600 dark:text-red-400',
  notes_updated: 'text-gray-600 dark:text-gray-400',
  attachment_added: 'text-blue-600 dark:text-blue-400',
  attachment_removed: 'text-red-600 dark:text-red-400',
  tasks_merged: 'text-purple-600 dark:text-purple-400',
};

/**
 * Humanize status strings for display
 * Converts internal values like 'in_progress' to 'In Progress'
 */
function humanizeStatus(status: string | undefined): string {
  if (!status) return '';
  const statusMap: Record<string, string> = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'done': 'Done',
    'not_started': 'Not Started',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Humanize priority strings for display
 */
function humanizePriority(priority: string | undefined): string {
  if (!priority) return '';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

// Format action text
function formatAction(entry: ActivityLogEntry): string {
  const action = entry.action.replace(/_/g, ' ');

  if (entry.details) {
    if ('from' in entry.details && 'to' in entry.details) {
      // Humanize status and priority values
      const from = entry.action === 'status_changed'
        ? humanizeStatus(entry.details.from as string)
        : entry.action === 'priority_changed'
          ? humanizePriority(entry.details.from as string)
          : entry.details.from;
      const to = entry.action === 'status_changed'
        ? humanizeStatus(entry.details.to as string)
        : entry.action === 'priority_changed'
          ? humanizePriority(entry.details.to as string)
          : entry.details.to;
      return `${action}: ${from} → ${to}`;
    }
  }

  return action;
}

export function VirtualActivityFeed({
  activityLog,
  estimatedItemHeight = 80,
  overscan = 5,
}: VirtualActivityFeedProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: activityLog.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const entry = activityLog[virtualItem.index];
          const Icon = actionIcons[entry.action] || FileText;
          const colorClass = actionColors[entry.action] || 'text-gray-600 dark:text-gray-400';

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="border-b border-gray-200 dark:border-gray-700"
            >
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.user_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                          {formatAction(entry)}
                        </p>
                        {entry.todo_text && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {entry.todo_text}
                          </p>
                        )}
                      </div>

                      <time className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDistance(new Date(entry.created_at), new Date(), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activityLog.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <p>No activity yet</p>
        </div>
      )}
    </div>
  );
}
