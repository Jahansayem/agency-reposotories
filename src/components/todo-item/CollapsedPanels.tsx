'use client';

import { Mic, Paperclip } from 'lucide-react';
import { Todo, Subtask, Attachment } from '@/types/todo';
import AttachmentList from '../AttachmentList';
import SubtaskItem from './SubtaskItem';
import { sanitizeTranscription } from '@/lib/sanitize';

export interface CollapsedPanelsProps {
  todo: Todo;
  subtasks: Subtask[];
  subtaskProgress: number;
  showNotes: boolean;
  showTranscription: boolean;
  showSubtasks: boolean;
  showAttachments: boolean;
  canEdit: boolean;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onUpdateSubtaskText: (subtaskId: string, text: string) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
}

export default function CollapsedPanels({
  todo,
  subtasks,
  subtaskProgress,
  showNotes,
  showTranscription,
  showSubtasks,
  showAttachments,
  canEdit,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskText,
  onUpdateAttachments,
}: CollapsedPanelsProps) {
  const guardedToggleSubtask = (subtaskId: string) => {
    if (!canEdit) return;
    onToggleSubtask(subtaskId);
  };
  const guardedDeleteSubtask = (subtaskId: string) => {
    if (!canEdit) return;
    onDeleteSubtask(subtaskId);
  };
  const guardedUpdateSubtaskText = (subtaskId: string, text: string) => {
    if (!canEdit) return;
    onUpdateSubtaskText(subtaskId, text);
  };
  return (
    <>
      {/* Notes display */}
      {showNotes && todo.notes && (
        <div className="mx-4 mb-3 p-3 bg-[var(--surface-2)] rounded-[var(--radius-md)] text-sm text-[var(--text-muted)]">
          {todo.notes}
        </div>
      )}

      {/* Transcription display */}
      {showTranscription && todo.transcription && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent)]/5 rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent)]">Voicemail Transcription</span>
          </div>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
            {sanitizeTranscription(todo.transcription)}
          </p>
        </div>
      )}

      {/* Subtasks display */}
      {showSubtasks && subtasks.length > 0 && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-[var(--accent)] mb-1">
              <span>Progress</span>
              <span>{subtaskProgress}%</span>
            </div>
            <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>

          {/* Subtask list */}
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={guardedToggleSubtask}
                onDelete={guardedDeleteSubtask}
                onUpdate={guardedUpdateSubtaskText}
              />
            ))}
          </div>
        </div>
      )}

      {/* Attachments display */}
      {showAttachments && Array.isArray(todo.attachments) && todo.attachments.length > 0 && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
            <span className="text-xs text-[var(--accent-gold)]/70">({todo.attachments.length})</span>
          </div>
          <AttachmentList
            attachments={todo.attachments}
            todoId={todo.id}
            onRemove={(attachmentId) => {
              if (onUpdateAttachments) {
                const updated = todo.attachments?.filter(a => a.id !== attachmentId) || [];
                onUpdateAttachments(todo.id, updated, true);
              }
            }}
            canRemove={!!onUpdateAttachments && !todo.completed}
          />
        </div>
      )}
    </>
  );
}
