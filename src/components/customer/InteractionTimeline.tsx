'use client';

/**
 * Interaction Timeline
 *
 * Renders a chronological timeline of customer interactions.
 * Supports pagination via "Load older interactions" button.
 */

import { useState } from 'react';
import {
  CheckCircle,
  Phone,
  FileText,
  PlusCircle,
  StickyNote,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useCustomerHistory } from '@/hooks/useCustomerHistory';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { CustomerInteractionWithTask, InteractionType } from '@/types/interaction';

interface InteractionTimelineProps {
  customerId: string;
  onViewTask?: (taskId: string) => void;
}

const PAGE_SIZE = 20;

// Icon and color config per interaction type
function getInteractionIcon(type: InteractionType) {
  switch (type) {
    case 'task_completed':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'subtask_completed':
      return { icon: CheckCircle, color: 'text-blue-500' };
    case 'contact_attempt':
      return { icon: Phone, color: 'text-purple-500' };
    case 'task_created':
      return { icon: PlusCircle, color: 'text-amber-500' };
    case 'note_added':
      return { icon: StickyNote, color: 'text-gray-500' };
    default:
      return { icon: FileText, color: 'text-gray-400' };
  }
}

// Outcome badge styling
function getOutcomeBadge(outcome: string): { label: string; className: string } {
  switch (outcome) {
    case 'contacted_interested':
      return { label: 'Interested', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    case 'contacted_not_interested':
      return { label: 'Not Interested', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    case 'contacted_callback_scheduled':
      return { label: 'Callback', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    case 'contacted_wrong_timing':
      return { label: 'Wrong Timing', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'left_voicemail':
      return { label: 'Voicemail', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
    case 'no_answer':
      return { label: 'No Answer', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' };
    case 'invalid_contact':
      return { label: 'Invalid', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    case 'declined_permanently':
      return { label: 'Declined', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    default:
      return { label: outcome, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
  }
}

function formatMethodLabel(method: string): string {
  switch (method) {
    case 'phone': return 'Phone';
    case 'email': return 'Email';
    case 'in_person': return 'In Person';
    case 'mail': return 'Mail';
    default: return method;
  }
}

export function InteractionTimeline({ customerId, onViewTask }: InteractionTimelineProps) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useCustomerHistory(customerId, {
    limit: PAGE_SIZE,
    offset,
  });

  // Track all loaded interactions for "load more" pagination
  const [previousInteractions, setPreviousInteractions] = useState<CustomerInteractionWithTask[]>([]);

  // Combine previous pages with current page
  const allInteractions = offset === 0
    ? (data?.interactions || [])
    : [...previousInteractions, ...(data?.interactions || [])];

  const total = data?.total || 0;
  const hasMore = allInteractions.length < total;

  const handleLoadMore = () => {
    // Save current interactions before loading more
    setPreviousInteractions(allInteractions);
    setOffset(prev => prev + PAGE_SIZE);
  };

  // Loading state
  if (isLoading && offset === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading history...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" />
        <span>{error instanceof Error ? error.message : 'Failed to load history'}</span>
      </div>
    );
  }

  // Empty state
  if (!allInteractions.length) {
    return (
      <div className="text-sm text-[var(--text-muted)] text-center py-6">
        No interaction history yet
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid="interaction-timeline">
      {allInteractions.map((interaction, index) => (
        <InteractionItem
          key={interaction.id}
          interaction={interaction}
          onViewTask={onViewTask}
          isLast={index === allInteractions.length - 1 && !hasMore}
        />
      ))}

      {/* Load more button */}
      {hasMore && (
        <div className="pt-3">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface-2)] rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading...
              </span>
            ) : (
              `Load older interactions (${total - allInteractions.length} remaining)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Individual Interaction Item
// ============================================

function InteractionItem({
  interaction,
  onViewTask,
  isLast,
}: {
  interaction: CustomerInteractionWithTask;
  onViewTask?: (taskId: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { icon: Icon, color } = getInteractionIcon(interaction.interactionType);

  const isContact = interaction.interactionType === 'contact_attempt';
  const contactMethod = interaction.details?.method as string | undefined;
  const contactOutcome = interaction.details?.outcome as string | undefined;
  const contactNotes = interaction.details?.notes as string | undefined;

  const hasExpandableContent = isContact && contactNotes;

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-[11px] top-[28px] bottom-0 w-px bg-[var(--border)]"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-[22px] h-[22px] ${color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        {/* Summary line */}
        <p className="text-sm text-[var(--foreground)] leading-snug">
          {interaction.summary}
        </p>

        {/* Meta line: time + user */}
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
          <span>{formatRelativeTime(interaction.createdAt)}</span>
          {interaction.createdByName && (
            <>
              <span aria-hidden="true">·</span>
              <span>{interaction.createdByName}</span>
            </>
          )}
        </div>

        {/* Contact attempt details */}
        {isContact && (contactMethod || contactOutcome) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {contactMethod && (
              <span className="px-2 py-0.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--foreground)] rounded">
                {formatMethodLabel(contactMethod)}
              </span>
            )}
            {contactOutcome && (() => {
              const badge = getOutcomeBadge(contactOutcome);
              return (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.className}`}>
                  {badge.label}
                </span>
              );
            })()}
          </div>
        )}

        {/* Expandable notes for contact attempts */}
        {hasExpandableContent && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {expanded ? 'Hide notes' : 'Show notes'}
            </button>
            {expanded && (
              <p className="mt-1 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded p-2 leading-relaxed">
                {contactNotes}
              </p>
            )}
          </div>
        )}

        {/* View task link */}
        {interaction.taskId && onViewTask && (
          <button
            type="button"
            onClick={() => onViewTask(interaction.taskId!)}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            View task
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default InteractionTimeline;
