/**
 * Payload Validators
 *
 * Runtime validation for data from real-time subscriptions and external sources.
 * Prevents runtime errors when database returns unexpected null/undefined values.
 */

import type { Todo, ChatMessage, Subtask, Attachment, RecurrencePattern, MessageReaction, TapbackType, AttachmentCategory } from '@/types/todo';

/**
 * Validate and normalize a Todo from real-time payload
 * Ensures all required fields exist and arrays are properly initialized
 */
export function parseTodo(payload: unknown): Todo | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;

  // Required fields
  if (typeof data.id !== 'string' || !data.id) {
    return null;
  }
  if (typeof data.text !== 'string') {
    return null;
  }
  if (typeof data.created_by !== 'string' || !data.created_by) {
    return null;
  }

  // Build validated Todo with proper defaults
  const todo: Todo = {
    id: data.id,
    text: data.text,
    completed: typeof data.completed === 'boolean' ? data.completed : false,
    status: isValidStatus(data.status) ? data.status : 'todo',
    priority: isValidPriority(data.priority) ? data.priority : 'medium',
    created_at: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
    created_by: data.created_by,
    // Optional fields with proper defaults
    assigned_to: typeof data.assigned_to === 'string' ? data.assigned_to : undefined,
    due_date: typeof data.due_date === 'string' ? data.due_date : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    recurrence: isValidRecurrence(data.recurrence) ? data.recurrence as RecurrencePattern : undefined,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : undefined,
    updated_by: typeof data.updated_by === 'string' ? data.updated_by : undefined,
    transcription: typeof data.transcription === 'string' ? data.transcription : undefined,
    display_order: typeof data.display_order === 'number' ? data.display_order : undefined,
    agency_id: typeof data.agency_id === 'string' ? data.agency_id : undefined,
    // Arrays - always ensure they're arrays
    subtasks: parseSubtasks(data.subtasks),
    attachments: parseAttachments(data.attachments),
    merged_from: Array.isArray(data.merged_from) ? data.merged_from.filter(id => typeof id === 'string') : undefined,
  };

  return todo;
}

/**
 * Parse and validate subtasks array
 */
function parseSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .filter(item =>
      typeof item.id === 'string' &&
      typeof item.text === 'string'
    )
    .map(item => ({
      id: item.id as string,
      text: item.text as string,
      completed: typeof item.completed === 'boolean' ? item.completed : false,
      priority: isValidPriority(item.priority) ? item.priority : 'medium',
      estimatedMinutes: typeof item.estimatedMinutes === 'number' ? item.estimatedMinutes : undefined,
    }));
}

/**
 * Parse and validate attachments array
 */
function parseAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .filter(item =>
      typeof item.id === 'string' &&
      typeof item.file_name === 'string' &&
      typeof item.storage_path === 'string'
    )
    .map(item => ({
      id: item.id as string,
      file_name: item.file_name as string,
      file_type: isValidAttachmentCategory(item.file_type) ? item.file_type : 'document',
      file_size: typeof item.file_size === 'number' ? item.file_size : 0,
      mime_type: typeof item.mime_type === 'string' ? item.mime_type : 'application/octet-stream',
      storage_path: item.storage_path as string,
      uploaded_by: typeof item.uploaded_by === 'string' ? item.uploaded_by : 'unknown',
      uploaded_at: typeof item.uploaded_at === 'string' ? item.uploaded_at : new Date().toISOString(),
    }));
}

/**
 * Validate and normalize a ChatMessage from real-time payload
 */
export function parseChatMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;

  // Required fields
  if (typeof data.id !== 'string' || !data.id) {
    return null;
  }
  if (typeof data.text !== 'string') {
    return null;
  }
  if (typeof data.created_by !== 'string' || !data.created_by) {
    return null;
  }

  const message: ChatMessage = {
    id: data.id,
    text: data.text,
    created_by: data.created_by,
    created_at: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
    // Optional fields
    related_todo_id: typeof data.related_todo_id === 'string' ? data.related_todo_id : undefined,
    recipient: typeof data.recipient === 'string' ? data.recipient : undefined,
    reply_to_id: typeof data.reply_to_id === 'string' ? data.reply_to_id : undefined,
    reply_to_text: typeof data.reply_to_text === 'string' ? data.reply_to_text : undefined,
    reply_to_user: typeof data.reply_to_user === 'string' ? data.reply_to_user : undefined,
    edited_at: typeof data.edited_at === 'string' ? data.edited_at : undefined,
    deleted_at: typeof data.deleted_at === 'string' ? data.deleted_at : undefined,
    is_pinned: typeof data.is_pinned === 'boolean' ? data.is_pinned : false,
    pinned_by: typeof data.pinned_by === 'string' ? data.pinned_by : undefined,
    pinned_at: typeof data.pinned_at === 'string' ? data.pinned_at : undefined,
    // Arrays
    reactions: parseReactions(data.reactions),
    read_by: Array.isArray(data.read_by) ? data.read_by.filter(r => typeof r === 'string') : [],
    mentions: Array.isArray(data.mentions) ? data.mentions.filter(m => typeof m === 'string') : [],
    attachments: Array.isArray(data.attachments) ? data.attachments : undefined,
  };

  return message;
}

/**
 * Parse reactions array
 */
function parseReactions(value: unknown): MessageReaction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .filter(item =>
      isValidTapbackType(item.reaction) &&
      typeof item.user === 'string'
    )
    .map(item => ({
      user: item.user as string,
      reaction: item.reaction as TapbackType,
      created_at: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    }));
}

/**
 * Type guards for status
 */
function isValidStatus(value: unknown): value is 'todo' | 'in_progress' | 'done' {
  return value === 'todo' || value === 'in_progress' || value === 'done';
}

/**
 * Type guard for priority
 */
function isValidPriority(value: unknown): value is 'low' | 'medium' | 'high' | 'urgent' {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent';
}

/**
 * Type guard for attachment category
 */
function isValidAttachmentCategory(value: unknown): value is AttachmentCategory {
  return value === 'document' || value === 'image' || value === 'audio' ||
         value === 'video' || value === 'archive' || value === 'other';
}

/**
 * Type guard for recurrence
 */
function isValidRecurrence(value: unknown): value is RecurrencePattern {
  return value === null || value === 'daily' || value === 'weekly' || value === 'monthly';
}

/**
 * Type guard for tapback types
 */
function isValidTapbackType(value: unknown): value is TapbackType {
  return value === 'heart' || value === 'thumbsup' || value === 'thumbsdown' ||
         value === 'laugh' || value === 'exclamation' || value === 'question';
}
