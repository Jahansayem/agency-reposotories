'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  Flag,
  User,
  Trash2,
  Clock,
  AlertCircle,
  X,
  FileText,
  Edit3,
  CheckSquare,
  Square,
  Plus,
  Paperclip,
  Music,
  Mic,
  Copy,
  Repeat,
  BookmarkPlus,
  Mail,
  Upload,
  File,
  Image,
  Video,
} from 'lucide-react';
import { Todo, TodoStatus, TodoPriority, PRIORITY_CONFIG, Subtask, RecurrencePattern, Attachment, WaitingContactType } from '@/types/todo';
import Celebration from './Celebration';
import ContentToSubtasksImporter from './ContentToSubtasksImporter';

// Import from kanban submodules
import { KanbanCard } from './kanban/KanbanCard';
import { KanbanColumn } from './kanban/KanbanColumn';
import {
  columns,
  getTodosByStatus,
  getSnoozeDate,
  formatFileSize,
} from './kanban/kanbanUtils';

interface KanbanBoardProps {
  todos: Todo[];
  users: string[];
  onStatusChange: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onSetReminder?: (id: string, reminderAt: string | null) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  onUpdateNotes?: (id: string, notes: string) => void;
  onUpdateText?: (id: string, text: string) => void;
  onUpdateSubtasks?: (id: string, subtasks: Subtask[]) => void;
  onToggle?: (id: string, completed: boolean) => void;
  onDuplicate?: (todo: Todo) => void;
  onSetRecurrence?: (id: string, recurrence: RecurrencePattern) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
  // Selection support
  showBulkActions?: boolean;
  selectedTodos?: Set<string>;
  onSelectTodo?: (id: string, selected: boolean) => void;
  // Sectioned view - groups tasks by date within each column
  useSectionedView?: boolean;
  onOpenDetail?: (todoId: string) => void;
}

// Task Detail Modal Component
interface TaskDetailModalProps {
  todo: Todo;
  users: string[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onUpdateText?: (id: string, text: string) => void;
  onUpdateSubtasks?: (id: string, subtasks: Subtask[]) => void;
  onToggle?: (id: string, completed: boolean) => void;
  onDuplicate?: (todo: Todo) => void;
  onSetRecurrence?: (id: string, recurrence: RecurrencePattern) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
}

function TaskDetailModal({
  todo,
  users,
  onClose,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetPriority,
  onStatusChange,
  onUpdateNotes,
  onUpdateText,
  onUpdateSubtasks,
  onToggle,
  onDuplicate,
  onSetRecurrence,
  onUpdateAttachments,
  onSaveAsTemplate,
  onEmailCustomer,
}: TaskDetailModalProps) {
  const [editingText, setEditingText] = useState(false);
  const [text, setText] = useState(todo.text);
  const [notes, setNotes] = useState(todo.notes || '');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showContentImporter, setShowContentImporter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  const handleSnooze = (days: number) => {
    onSetDueDate(todo.id, getSnoozeDate(days));
    setShowSnoozeMenu(false);
  };

  // Sync local state when todo prop changes (e.g., from real-time updates)
  useEffect(() => {
    if (!editingText) {
      setText(todo.text);
    }
  }, [todo.text, editingText]);

  useEffect(() => {
    setNotes(todo.notes || '');
  }, [todo.notes]);

  const priority = todo.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];

  const handleSaveText = () => {
    if (onUpdateText && text.trim() !== todo.text) {
      onUpdateText(todo.id, text.trim());
    }
    setEditingText(false);
  };

  const handleSaveNotes = () => {
    if (onUpdateNotes && notes !== (todo.notes || '')) {
      onUpdateNotes(todo.id, notes);
    }
  };

  const handleToggleSubtask = (index: number) => {
    if (!onUpdateSubtasks) return;
    const updated = subtasks.map((s, i) =>
      i === index ? { ...s, completed: !s.completed } : s
    );
    onUpdateSubtasks(todo.id, updated);
  };

  const handleAddSubtask = () => {
    if (!onUpdateSubtasks || !newSubtaskText.trim()) return;
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
      priority: 'medium',
    };
    onUpdateSubtasks(todo.id, [...subtasks, newSubtask]);
    setNewSubtaskText('');
  };

  const handleDeleteSubtask = (index: number) => {
    if (!onUpdateSubtasks) return;
    const updated = subtasks.filter((_, i) => i !== index);
    onUpdateSubtasks(todo.id, updated);
  };

  const handleAddImportedSubtasks = (importedSubtasks: Subtask[]) => {
    if (!onUpdateSubtasks) return;
    onUpdateSubtasks(todo.id, [...subtasks, ...importedSubtasks]);
    setShowContentImporter(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onUpdateAttachments) return;

    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Determine file type
        let fileType: 'image' | 'document' | 'audio' | 'video' | 'other' = 'other';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('audio/')) fileType = 'audio';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) fileType = 'document';

        // Create a temporary URL for the file (in real app, would upload to storage)
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);

        newAttachments.push({
          id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          storage_path: url,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
          uploaded_by: todo.created_by,
        });
      }

      const updatedAttachments = [...(todo.attachments || []), ...newAttachments];
      onUpdateAttachments(todo.id, updatedAttachments);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!onUpdateAttachments) return;
    // Revoke blob URL if it was created locally
    const removedAttachment = (todo.attachments || []).find(a => a.id === attachmentId);
    if (removedAttachment?.storage_path?.startsWith('blob:')) {
      URL.revokeObjectURL(removedAttachment.storage_path);
      blobUrlsRef.current = blobUrlsRef.current.filter(url => url !== removedAttachment.storage_path);
    }
    const updated = (todo.attachments || []).filter(a => a.id !== attachmentId);
    onUpdateAttachments(todo.id, updated);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return Image;
      case 'audio': return Mic;
      case 'video': return Video;
      case 'document': return FileText;
      default: return File;
    }
  };

  const recurrenceOptions: { value: string; label: string }[] = [
    { value: '', label: 'No repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const attachments = todo.attachments || [];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)] bg-[var(--surface)]`}
      >
        {/* Priority bar */}
        <div className="h-2" style={{ backgroundColor: priorityConfig.color }} />

        {/* Header */}
        <div className={`flex items-start justify-between p-4 border-b border-[var(--border)]`}>
          <div className="flex-1 min-w-0 pr-4">
            {editingText ? (
              <div className="space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-base font-medium resize-none bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveText}
                    className="px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setText(todo.text);
                      setEditingText(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-[var(--radius-lg)] transition-colors text-[var(--text-muted)] hover:bg-[var(--surface-2)]`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onUpdateText && setEditingText(true)}
                className={`text-lg font-semibold cursor-pointer hover:opacity-80 text-[var(--foreground)] ${todo.completed ? 'line-through opacity-60' : ''}`}
              >
                {todo.text}
                {onUpdateText && (
                  <Edit3 className="inline-block w-4 h-4 ml-2 opacity-40" />
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close task details"
            className={`p-2 rounded-[var(--radius-lg)] transition-colors hover:bg-[var(--surface-2)] text-[var(--text-muted)]`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status, Priority, Due Date, Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                Status
              </label>
              <select
                value={todo.status || 'todo'}
                onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
                className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => onSetPriority(todo.id, e.target.value as TodoPriority)}
                className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                Due Date
              </label>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={todo.due_date ? todo.due_date.split('T')[0] : ''}
                  onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
                  className={`flex-1 min-w-0 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
                />
                {!todo.completed && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                      className={`p-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm transition-colors bg-[var(--surface)] text-[var(--text-muted)] hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400`}
                      title="Snooze (quick reschedule)"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    {showSnoozeMenu && (
                      <div className={`absolute right-0 top-full mt-1 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-50 py-1 min-w-[140px] border border-[var(--border)] bg-[var(--surface-elevated)]`}>
                        <button
                          onClick={() => handleSnooze(1)}
                          className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)] text-[var(--foreground)]`}
                        >
                          Tomorrow
                        </button>
                        <button
                          onClick={() => handleSnooze(2)}
                          className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)] text-[var(--foreground)]`}
                        >
                          In 2 Days
                        </button>
                        <button
                          onClick={() => handleSnooze(7)}
                          className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)] text-[var(--foreground)]`}
                        >
                          Next Week
                        </button>
                        <button
                          onClick={() => handleSnooze(30)}
                          className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)] text-[var(--foreground)]`}
                        >
                          Next Month
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                Assigned To
              </label>
              <select
                value={todo.assigned_to || ''}
                onChange={(e) => onAssign(todo.id, e.target.value || null)}
                className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
              <FileText className="inline-block w-3.5 h-3.5 mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Add notes or context..."
              rows={3}
              className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm resize-none bg-[var(--surface)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
            />
          </div>

          {/* Voicemail Transcription */}
          {todo.transcription && (
            <div className={`p-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/15 bg-[var(--accent)]/8`}>
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--accent)]">Voicemail Transcription</span>
              </div>
              <p className={`text-sm whitespace-pre-wrap leading-relaxed text-[var(--foreground)]`}>
                {todo.transcription}
              </p>
            </div>
          )}

          {/* Subtasks */}
          {onUpdateSubtasks && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-medium text-[var(--text-muted)]`}>
                  <CheckSquare className="inline-block w-3.5 h-3.5 mr-1" />
                  Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                </label>
                <button
                  onClick={() => setShowContentImporter(true)}
                  className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30`}
                >
                  <Mail className="w-3 h-3" />
                  Import
                </button>
              </div>

              <div className="space-y-1.5">
                {subtasks.map((subtask, index) => (
                  <div
                    key={subtask.id || index}
                    className={`flex items-center gap-2 p-2 rounded-[var(--radius-lg)] bg-[var(--surface-2)]`}
                  >
                    <button
                      onClick={() => handleToggleSubtask(index)}
                      className={`flex-shrink-0 ${
                        subtask.completed
                          ? 'text-green-500'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {subtask.completed ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${
                      subtask.completed
                        ? 'line-through opacity-60'
                        : 'text-[var(--foreground)]'
                    }`}>
                      {subtask.text}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(index)}
                      className={`p-1 rounded transition-colors hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-red-500`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add subtask */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Add a subtask..."
                    className={`flex-1 px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskText.trim()}
                    aria-label="Add subtask"
                    className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recurrence */}
          {onSetRecurrence && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                <Repeat className="inline-block w-3.5 h-3.5 mr-1" />
                Repeat
              </label>
              <select
                value={todo.recurrence || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  onSetRecurrence(todo.id, value === '' ? null : value as RecurrencePattern);
                }}
                className={`w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
              >
                {recurrenceOptions.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Attachments */}
          {onUpdateAttachments && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-[var(--text-muted)]`}>
                <Paperclip className="inline-block w-3.5 h-3.5 mr-1" />
                Attachments ({attachments.length})
              </label>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {attachments.map((attachment) => {
                    const FileIcon = getFileIcon(attachment.file_type);
                    return (
                      <div
                        key={attachment.id}
                        className={`flex items-center gap-2 p-2 rounded-[var(--radius-lg)] bg-[var(--surface-2)]`}
                      >
                        <FileIcon className={`w-4 h-4 flex-shrink-0 ${
                          attachment.file_type === 'audio' ? 'text-[var(--accent)]' : 'text-amber-500'
                        }`} />
                        <span className={`flex-1 text-sm truncate text-[var(--foreground)]`}>
                          {attachment.file_name}
                        </span>
                        <span className={`text-xs text-[var(--text-light)]`}>
                          {formatFileSize(attachment.file_size)}
                        </span>
                        <button
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className={`p-1 rounded transition-colors hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-red-500`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-sm transition-colors text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:border-[var(--border-hover)] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Add files'}
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className={`pt-3 border-t border-[var(--border)]`}>
            <label className={`block text-xs font-medium mb-2 text-[var(--text-muted)]`}>
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Mark Complete Toggle */}
              {onToggle && (
                <button
                  onClick={() => onToggle(todo.id, !todo.completed)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-sm transition-colors ${
                    todo.completed
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                  }`}
                >
                  {todo.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {todo.completed ? 'Completed' : 'Mark Done'}
                </button>
              )}

              {/* Duplicate */}
              {onDuplicate && (
                <button
                  onClick={() => {
                    onDuplicate(todo);
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-sm transition-colors bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]`}
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
              )}

              {/* Save as Template */}
              {onSaveAsTemplate && (
                <button
                  onClick={() => {
                    onSaveAsTemplate(todo);
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-sm transition-colors bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save Template
                </button>
              )}

              {/* Email Customer */}
              {onEmailCustomer && (
                <button
                  onClick={() => {
                    onEmailCustomer(todo);
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-sm transition-colors bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]`}
                >
                  <Mail className="w-4 h-4" />
                  Email Update
                </button>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className={`pt-3 border-t border-[var(--border)] text-xs text-[var(--text-light)]`}>
            Created by {todo.created_by} • {new Date(todo.created_at).toLocaleDateString()}
            {todo.recurrence && (
              <span className="ml-2">
                <Repeat className="inline-block w-3 h-3 mr-0.5" />
                {todo.recurrence}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t border-[var(--border)]`}>
          <button
            onClick={() => {
              onDelete(todo.id);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[var(--radius-lg)] transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete Task
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* Content to Subtasks Importer Modal */}
      {showContentImporter && (
        <ContentToSubtasksImporter
          onClose={() => setShowContentImporter(false)}
          onAddSubtasks={handleAddImportedSubtasks}
          parentTaskText={todo.text}
        />
      )}
    </div>
  );
}

export default function KanbanBoard({
  todos,
  users,
  onStatusChange,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetPriority,
  onSetReminder,
  onMarkWaiting,
  onClearWaiting,
  onUpdateNotes,
  onUpdateText,
  onUpdateSubtasks,
  onToggle,
  onDuplicate,
  onSetRecurrence,
  onUpdateAttachments,
  onSaveAsTemplate,
  onEmailCustomer,
  showBulkActions,
  selectedTodos,
  onSelectTodo,
  useSectionedView = false,
  onOpenDetail,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [dragAnnouncement, setDragAnnouncement] = useState<string>('');

  // Derive selectedTodo from todos prop to avoid stale reference when todos update via real-time sync
  const selectedTodo = useMemo(
    () => selectedTodoId ? todos.find(t => t.id === selectedTodoId) || null : null,
    [selectedTodoId, todos]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Custom collision detection that prioritizes columns over cards
  const collisionDetection: CollisionDetection = (args) => {
    // Get all collisions using pointer within
    const pointerCollisions = pointerWithin(args);

    // Also get rect intersections as fallback
    const rectCollisions = rectIntersection(args);

    // Combine and prioritize column droppables
    const allCollisions = [...pointerCollisions, ...rectCollisions];
    const columnIds = columns.map(c => c.id);

    // First try to find a column collision
    const columnCollision = allCollisions.find(
      collision => columnIds.includes(collision.id as TodoStatus)
    );

    if (columnCollision) {
      return [columnCollision];
    }

    // If no column found, return all collisions (for card-to-card)
    return allCollisions.length > 0 ? allCollisions : [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const todoId = event.active.id as string;
    setActiveId(todoId);
    const draggedTodo = todos.find((t) => t.id === todoId);
    if (draggedTodo) {
      const currentColumn = columns.find(c => c.id === draggedTodo.status);
      setDragAnnouncement(`Picked up task: ${draggedTodo.text}. Currently in ${currentColumn?.title || 'To Do'} column.`);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    logger.debug('Drag ended', { component: 'KanbanBoard', activeId: active.id, overId: over?.id });

    const todoId = active.id as string;
    const draggedTodo = todos.find((t) => t.id === todoId);

    if (!over) {
      logger.debug('No drop target', { component: 'KanbanBoard' });
      setDragAnnouncement(draggedTodo ? `Dropped task: ${draggedTodo.text}. No change.` : 'Task dropped. No change.');
      return;
    }

    const targetId = over.id as string;
    const previousStatus = draggedTodo?.status || 'todo';

    logger.debug('Dragged todo', { component: 'KanbanBoard', todoId, targetId, previousStatus });

    // Check if dropped on a column
    const column = columns.find((c) => c.id === targetId);
    if (column) {
      logger.debug('Dropped on column', { component: 'KanbanBoard', columnId: column.id, previousStatus });
      // Only change if different column
      if (previousStatus !== column.id) {
        logger.debug('Calling onStatusChange', { component: 'KanbanBoard', todoId, newStatus: column.id });
        // Celebrate if moving to done column
        if (column.id === 'done') {
          setCelebrating(true);
        }
        onStatusChange(todoId, column.id);
        setDragAnnouncement(`Moved task to ${column.title} column.`);
      } else {
        logger.debug('Same column, no change needed', { component: 'KanbanBoard' });
        setDragAnnouncement(`Task remains in ${column.title} column.`);
      }
      return;
    }

    // Check if dropped on another card
    const overTodo = todos.find((t) => t.id === targetId);
    if (overTodo) {
      const targetStatus = overTodo.status || 'todo';
      const targetColumn = columns.find(c => c.id === targetStatus);
      logger.debug('Dropped on card', { component: 'KanbanBoard', targetId, targetStatus });
      // Only change if different column
      if (previousStatus !== targetStatus) {
        logger.debug('Calling onStatusChange', { component: 'KanbanBoard', todoId, newStatus: targetStatus });
        // Celebrate if moving to done column
        if (targetStatus === 'done') {
          setCelebrating(true);
        }
        onStatusChange(todoId, targetStatus);
        setDragAnnouncement(`Moved task to ${targetColumn?.title || targetStatus} column.`);
      } else {
        setDragAnnouncement(`Task remains in ${targetColumn?.title || targetStatus} column.`);
      }
    } else {
      logger.debug('No matching column or card found for targetId', { component: 'KanbanBoard', targetId });
      setDragAnnouncement('Task dropped. No change.');
    }
  };

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  return (
    <div className="relative">
      {/* Screen reader announcements for drag operations */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {dragAnnouncement}
      </div>
      <Celebration trigger={celebrating} onComplete={() => setCelebrating(false)} />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {columns.map((column) => {
          const columnTodos = getTodosByStatus(todos, column.id);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              columnTodos={columnTodos}
              users={users}
              activeId={activeId}
              overId={overId}
              onDelete={onDelete}
              onAssign={onAssign}
              onSetDueDate={onSetDueDate}
              onSetPriority={onSetPriority}
              onCardClick={onOpenDetail ? (todo: Todo) => onOpenDetail(todo.id) : (todo: Todo) => setSelectedTodoId(todo.id)}
              showBulkActions={showBulkActions}
              selectedTodos={selectedTodos}
              onSelectTodo={onSelectTodo}
              useSectionedView={useSectionedView}
            />
          );
        })}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTodo && <KanbanCard todo={activeTodo} />}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal - only used as fallback when onOpenDetail is not provided */}
      <AnimatePresence>
        {!onOpenDetail && selectedTodo && (
          <TaskDetailModal
            todo={selectedTodo}
            users={users}
            onClose={() => setSelectedTodoId(null)}
            onDelete={onDelete}
            onAssign={onAssign}
            onSetDueDate={onSetDueDate}
            onSetPriority={onSetPriority}
            onStatusChange={onStatusChange}
            onUpdateNotes={onUpdateNotes}
            onUpdateText={onUpdateText}
            onUpdateSubtasks={onUpdateSubtasks}
            onToggle={onToggle}
            onDuplicate={onDuplicate}
            onSetRecurrence={onSetRecurrence}
            onUpdateAttachments={onUpdateAttachments}
            onSaveAsTemplate={onSaveAsTemplate}
            onEmailCustomer={onEmailCustomer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
