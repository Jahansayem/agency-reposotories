'use client';

import { Flag, Calendar, User, Repeat, ListTree, MessageSquare, Mic, Paperclip, Music, Bell, AlertTriangle } from 'lucide-react';
import { Todo, PRIORITY_CONFIG, Subtask } from '@/types/todo';
import { Badge } from '@/components/ui';
import { WaitingBadge } from '../WaitingStatusBadge';
import { CustomerBadge } from '../customer/CustomerBadge';
import { PRIORITY_TO_BADGE_VARIANT, formatDueDate, getDaysOverdue } from './utils';

export interface MetadataBadgesProps {
  todo: Todo;
  priority: string;
  dueDateStatus: 'overdue' | 'today' | 'upcoming' | 'future' | null;
  expanded: boolean;
  isOverdue: boolean;
  subtasks: Subtask[];
  completedSubtasks: number;
  subtaskProgress: number;
  showSubtasks: boolean;
  setShowSubtasks: (show: boolean) => void;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  showTranscription: boolean;
  setShowTranscription: (show: boolean) => void;
  showAttachments: boolean;
  setShowAttachments: (show: boolean) => void;
}

export default function MetadataBadges({
  todo,
  priority,
  dueDateStatus,
  expanded,
  isOverdue,
  subtasks,
  completedSubtasks,
  subtaskProgress,
  showSubtasks,
  setShowSubtasks,
  showNotes,
  setShowNotes,
  showTranscription,
  setShowTranscription,
  showAttachments,
  setShowAttachments,
}: MetadataBadgesProps) {
  const priorityConfig = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];

  const hasSecondaryMetadata = (
    subtasks.length > 0 ||
    todo.notes ||
    todo.transcription ||
    (Array.isArray(todo.attachments) && todo.attachments.length > 0) ||
    todo.recurrence ||
    (todo.reminder_at && !todo.reminder_sent && !todo.completed) ||
    todo.merged_from?.length
  );

  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap min-w-0">
      {/* PRIMARY ROW: Priority + Due Date + Assignee (always visible for quick scanning) */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-wrap">
        {/* Priority badge */}
        <Badge
          variant={PRIORITY_TO_BADGE_VARIANT[priority as keyof typeof PRIORITY_TO_BADGE_VARIANT]}
          size="sm"
          icon={<Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
          className="flex-shrink-0"
        >
          <span className="hidden sm:inline">{priorityConfig.label}</span>
          <span className="sm:hidden">{priorityConfig.label.charAt(0)}</span>
        </Badge>

        {/* Due date */}
        {todo.due_date && dueDateStatus && (() => {
          const daysOverdue = dueDateStatus === 'overdue' ? getDaysOverdue(todo.due_date) : 0;
          const dueDateVariant = todo.completed
            ? 'default'
            : dueDateStatus === 'overdue'
              ? 'danger'
              : dueDateStatus === 'today'
                ? 'warning'
                : dueDateStatus === 'upcoming'
                  ? 'warning'
                  : 'default';
          const dueDateIcon = dueDateStatus === 'overdue' && !todo.completed
            ? <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            : <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
          const overdueText = dueDateStatus === 'overdue' && !todo.completed
            ? ` (${daysOverdue === 1 ? '1 day' : `${daysOverdue} days`})`
            : '';
          return (
            <Badge
              variant={dueDateVariant}
              size="sm"
              icon={dueDateIcon}
              pulse={dueDateStatus === 'overdue' && !todo.completed}
              className="max-w-[120px] sm:max-w-none truncate"
            >
              <span className="truncate">
                {formatDueDate(todo.due_date)}
                <span className="hidden sm:inline">{overdueText}</span>
              </span>
            </Badge>
          );
        })()}

        {/* Assignee */}
        {todo.assigned_to && (
          <Badge
            variant="brand"
            size="sm"
            icon={<User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            className="flex-shrink-0 max-w-[80px] sm:max-w-none"
          >
            <span className="truncate">{todo.assigned_to}</span>
          </Badge>
        )}

        {/* Customer badge */}
        {todo.customer_name && todo.customer_segment && (
          <CustomerBadge
            name={todo.customer_name}
            segment={todo.customer_segment}
            size="sm"
          />
        )}

        {/* Waiting for response badge */}
        <WaitingBadge todo={todo} />

        {/* "Has more" indicator */}
        {!expanded && (subtasks.length > 0 || todo.notes || todo.transcription || (Array.isArray(todo.attachments) && todo.attachments.length > 0) || todo.merged_from?.length) && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-40 group-hover:opacity-0 transition-opacity"
            title="Hover for more details"
          />
        )}
      </div>

      {/* SECONDARY ROW: Hidden by default, revealed on hover */}
      {hasSecondaryMetadata && (
        <>
          {/* Separator */}
          <div className={`w-px h-4 bg-[var(--border)] mx-1 hidden sm:block ${expanded || isOverdue ? 'sm:block' : 'sm:hidden sm:group-hover:block'}`} />

          {/* Secondary metadata */}
          <div className={`items-center gap-1 sm:gap-2 transition-opacity duration-200 ${
            expanded
              ? 'flex opacity-100'
              : 'hidden sm:flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}>
            {/* Recurrence */}
            {todo.recurrence && (
              <Badge
                variant="primary"
                size="sm"
                icon={<Repeat className="w-3 h-3" />}
              >
                {todo.recurrence}
              </Badge>
            )}

            {/* Reminder indicator */}
            {todo.reminder_at && !todo.reminder_sent && !todo.completed && (
              <Badge
                variant="info"
                size="sm"
                icon={<Bell className="w-3 h-3" />}
              >
                {(() => {
                  const reminderDate = new Date(todo.reminder_at);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
                  const diffDays = Math.round((reminderDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  if (diffDays === 0) {
                    return `Today ${reminderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                  } else if (diffDays === 1) {
                    return `Tomorrow`;
                  } else if (diffDays < 0) {
                    return 'Past';
                  } else {
                    return reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                })()}
              </Badge>
            )}

            {/* Subtasks indicator */}
            {subtasks.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                className="inline-flex items-center gap-1.5 touch-manipulation"
              >
                <Badge
                  variant={subtaskProgress === 100 ? 'success' : 'primary'}
                  size="sm"
                  icon={<ListTree className="w-3 h-3" />}
                  interactive
                >
                  {completedSubtasks}/{subtasks.length}
                </Badge>
              </button>
            )}

            {/* Notes indicator */}
            {todo.notes && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
                className="touch-manipulation"
              >
                <Badge
                  variant="default"
                  size="sm"
                  icon={<MessageSquare className="w-3 h-3" />}
                  interactive
                />
              </button>
            )}

            {/* Transcription indicator */}
            {todo.transcription && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowTranscription(!showTranscription); }}
                className="touch-manipulation"
              >
                <Badge
                  variant="info"
                  size="sm"
                  icon={<Mic className="w-3 h-3" />}
                  interactive
                />
              </button>
            )}

            {/* Attachments indicator */}
            {Array.isArray(todo.attachments) && todo.attachments.length > 0 && (() => {
              const hasAudio = todo.attachments.some(a => a.file_type === 'audio');
              const AttachmentIcon = hasAudio ? Music : Paperclip;
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAttachments(!showAttachments); }}
                  className="inline-flex items-center gap-1.5 touch-manipulation"
                >
                  <Badge
                    variant={hasAudio ? 'info' : 'warning'}
                    size="sm"
                    icon={<AttachmentIcon className="w-3 h-3" />}
                    interactive
                  >
                    {todo.attachments.length}
                  </Badge>
                </button>
              );
            })()}

            {/* Merged indicator */}
            {todo.merged_from && todo.merged_from.length > 0 && (
              <Badge
                variant="default"
                size="sm"
                icon={<ListTree className="w-3 h-3" />}
              >
                +{todo.merged_from.length}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
