'use client';

import { useState } from 'react';
import { Check, Copy, FileText, Mail, ListTree, Paperclip, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Todo, TodoPriority, TodoStatus, RecurrencePattern, Subtask, Attachment, MAX_ATTACHMENTS_PER_TODO, WaitingContactType } from '@/types/todo';
import { Badge, Button, IconButton } from '@/components/ui';
import AttachmentList from '../AttachmentList';
import ReminderPicker from '../ReminderPicker';
import { WaitingStatusBadge } from '../WaitingStatusBadge';
import SubtaskItem from './SubtaskItem';
import { filterSystemUserName } from './utils';

export interface ExpandedPanelProps {
  todo: Todo;
  users: string[];
  priority: string;
  status: string;
  dueDateStatus: 'overdue' | 'today' | 'upcoming' | 'future' | null;
  subtasks: Subtask[];
  completedSubtasks: number;
  subtaskProgress: number;
  notes: string;
  setNotes: (notes: string) => void;
  canEdit: boolean;
  canAssignTasks: boolean;
  canDeleteTasks: boolean;
  onToggle: () => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onStatusChange?: (id: string, status: TodoStatus) => void;
  onDuplicate?: (todo: Todo) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onSetRecurrence?: (id: string, recurrence: RecurrencePattern) => void;
  onUpdateSubtasks?: (id: string, subtasks: Subtask[]) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  onSetReminder?: (id: string, reminderAt: string | null) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  setExpanded: (expanded: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowContentImporter: (show: boolean) => void;
  setShowAttachmentUpload: (show: boolean) => void;
}

export default function ExpandedPanel({
  todo,
  users,
  priority,
  status,
  dueDateStatus,
  subtasks,
  completedSubtasks,
  subtaskProgress,
  notes,
  setNotes,
  canEdit,
  canAssignTasks,
  canDeleteTasks,
  onToggle,
  onSetPriority,
  onSetDueDate,
  onAssign,
  onStatusChange,
  onDuplicate,
  onSaveAsTemplate,
  onEmailCustomer,
  onUpdateNotes,
  onSetRecurrence,
  onUpdateSubtasks,
  onUpdateAttachments,
  onSetReminder,
  onMarkWaiting,
  onClearWaiting,
  setExpanded,
  setShowDeleteConfirm,
  setShowContentImporter,
  setShowAttachmentUpload,
}: ExpandedPanelProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const handleNotesBlur = () => {
    if (onUpdateNotes && notes !== todo.notes) {
      onUpdateNotes(todo.id, notes);
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!onUpdateSubtasks || !canEdit) return;
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdateSubtasks(todo.id, updated);
  };

  const deleteSubtask = (subtaskId: string) => {
    if (!onUpdateSubtasks || !canEdit) return;
    const updated = subtasks.filter(s => s.id !== subtaskId);
    onUpdateSubtasks(todo.id, updated);
  };

  const updateSubtaskText = (subtaskId: string, newText: string) => {
    if (!onUpdateSubtasks || !canEdit) return;
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, text: newText } : s
    );
    onUpdateSubtasks(todo.id, updated);
  };

  const addManualSubtask = () => {
    if (!onUpdateSubtasks || !canEdit || !newSubtaskText.trim()) return;
    const newSubtask: Subtask = {
      id: `${todo.id}-sub-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
      priority: 'medium',
    };
    onUpdateSubtasks(todo.id, [...subtasks, newSubtask]);
    setNewSubtaskText('');
  };

  return (
    <div className="px-4 pb-4 pt-3 border-t border-[var(--border-subtle)]">

      {/* PRIMARY ACTION - Mark Done/Reopen prominently displayed */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant={todo.completed ? 'secondary' : 'primary'}
          size="md"
          leftIcon={<Check className="w-4 h-4" />}
          onClick={onToggle}
        >
          {todo.completed ? 'Reopen Task' : 'Mark Done'}
        </Button>

        {/* Secondary actions: Duplicate, Save Template */}
        <div className="flex items-center gap-2">
          {onDuplicate && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Copy className="w-4 h-4" />}
              onClick={() => onDuplicate(todo)}
              aria-label="Duplicate task"
            />
          )}
          {onSaveAsTemplate && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => onSaveAsTemplate(todo)}
              aria-label="Save as template"
            />
          )}
          {onEmailCustomer && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Mail className="w-4 h-4" />}
              onClick={() => onEmailCustomer(todo)}
              aria-label="Email summary"
            />
          )}
        </div>
      </div>

      {/* SECTION 1: Core Fields - Compact Grid */}
      <div className="rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border-subtle)] p-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {/* Status */}
          {onStatusChange && (
            <div>
              <label className="text-label text-[var(--text-muted)] mb-1 block">Status</label>
              <select
                value={status}
                onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
                disabled={!canEdit}
                className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => onSetPriority(todo.id, e.target.value as TodoPriority)}
              disabled={!canEdit}
              className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due date with overdue warning */}
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block flex items-center gap-1.5">
              Due Date
              {dueDateStatus === 'overdue' && !todo.completed && (
                <span className="inline-flex items-center gap-0.5 text-red-500">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  <span className="text-badge normal-case">Overdue</span>
                </span>
              )}
            </label>
            <input
              type="date"
              value={todo.due_date ? todo.due_date.split('T')[0] : ''}
              onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
              disabled={!canEdit}
              className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${
                dueDateStatus === 'overdue' && !todo.completed ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''
              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Assign to */}
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block">Assigned To</label>
            <select
              value={todo.assigned_to || ''}
              onChange={(e) => onAssign(todo.id, e.target.value || null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              disabled={!canEdit || !canAssignTasks}
              className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${(!canEdit || !canAssignTasks) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Recurrence */}
          {onSetRecurrence && (
            <div>
              <label className="text-label text-[var(--text-muted)] mb-1 block">Repeat</label>
              <select
                value={todo.recurrence || ''}
                onChange={(e) => onSetRecurrence(todo.id, (e.target.value || null) as RecurrencePattern)}
                disabled={!canEdit}
                className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {/* Reminder */}
          {onSetReminder && !todo.completed && (
            <div>
              <label className="text-label text-[var(--text-muted)] mb-1 block">Reminder</label>
              <ReminderPicker
                value={todo.reminder_at || undefined}
                dueDate={todo.due_date || undefined}
                onChange={(time) => onSetReminder(todo.id, time)}
                compact
              />
            </div>
          )}
        </div>

        {/* Waiting for Customer Response */}
        {onMarkWaiting && onClearWaiting && !todo.completed && (
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
            <span className="text-label text-[var(--text-muted)] shrink-0">Customer Response</span>
            <WaitingStatusBadge
              todo={todo}
              onMarkWaiting={(contactType, followUpHours) => onMarkWaiting(todo.id, contactType, followUpHours)}
              onClearWaiting={() => onClearWaiting(todo.id)}
            />
          </div>
        )}
      </div>

      {/* SECTION DIVIDER */}
      <div className="h-px bg-[var(--border)] my-3" />

      {/* SECTION 2: Notes */}
      {onUpdateNotes && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] mb-2">
            <FileText className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes or context..."
            disabled={!canEdit}
            className={`input-refined w-full text-sm leading-relaxed px-3 py-2.5 text-[var(--foreground)] resize-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            rows={4}
          />
        </div>
      )}

      {/* SECTION 3: Subtasks */}
      {onUpdateSubtasks && (
        <div className="mb-4 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTree className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span className="text-sm font-medium text-[var(--accent)]">Subtasks</span>
              {subtasks.length > 0 && (
                <span className="text-xs text-[var(--accent)]/70">({completedSubtasks}/{subtasks.length})</span>
              )}
            </div>
            <button
              onClick={() => setShowContentImporter(true)}
              className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-gold-light)] hover:bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              Import
            </button>
          </div>

          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div className="mb-3">
              <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Subtask list */}
          {subtasks.length > 0 && (
            <div className="space-y-2 mb-3">
              {subtasks.map((subtask) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={toggleSubtask}
                  onDelete={deleteSubtask}
                  onUpdate={updateSubtaskText}
                />
              ))}
            </div>
          )}

          {/* Add subtask input */}
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSubtaskText.trim()) {
                addManualSubtask();
              }
            }}
            placeholder="Add a subtask (press Enter)..."
            disabled={!canEdit}
            className={`input-refined w-full text-sm px-3 py-2 text-[var(--foreground)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>
      )}

      {/* SECTION 4: Attachments */}
      {onUpdateAttachments && (
        <div className="mb-4 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
              {Array.isArray(todo.attachments) && todo.attachments.length > 0 && (
                <span className="text-xs text-[var(--accent-gold)]/70">
                  ({todo.attachments.length}/{MAX_ATTACHMENTS_PER_TODO})
                </span>
              )}
            </div>
            {(Array.isArray(todo.attachments) ? todo.attachments.length : 0) < MAX_ATTACHMENTS_PER_TODO && (
              <button
                onClick={() => setShowAttachmentUpload(true)}
                className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add
              </button>
            )}
          </div>

          {/* Attachment list or drop zone */}
          {Array.isArray(todo.attachments) && todo.attachments.length > 0 ? (
            <AttachmentList
              attachments={todo.attachments}
              todoId={todo.id}
              onRemove={(attachmentId) => {
                const updated = todo.attachments?.filter(a => a.id !== attachmentId) || [];
                onUpdateAttachments(todo.id, updated, true);
              }}
              canRemove={true}
            />
          ) : (
            <button
              onClick={() => setShowAttachmentUpload(true)}
              className="w-full p-4 border-2 border-dashed border-[var(--accent-gold)]/30 rounded-[var(--radius-md)] text-center hover:border-[var(--accent-gold)]/50 hover:bg-[var(--accent-gold)]/5 transition-colors cursor-pointer"
            >
              <Paperclip className="w-5 h-5 text-[var(--accent-gold)]/50 mx-auto mb-1" aria-hidden="true" />
              <p className="text-xs text-[var(--accent-gold)]/70">
                Drop files here or click to browse
              </p>
            </button>
          )}
        </div>
      )}

      {/* SECTION 5: Metadata footer */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          {todo.created_by && <span>Created by {todo.created_by}</span>}
          {todo.created_at && (
            <span>• {new Date(todo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {todo.updated_at && filterSystemUserName(todo.updated_by) && (
            <span className="hidden sm:inline">• Updated by {filterSystemUserName(todo.updated_by)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canDeleteTasks && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)]"
            >
              Delete
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
