export type TodoStatus = 'todo' | 'in_progress' | 'done';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | null;

// Waiting for customer response types
export type WaitingContactType = 'call' | 'email' | 'other';

// Attachment category type (defined before Attachment interface for clarity)
// Note: 'other' is a catch-all for unknown file types
export type AttachmentCategory = 'document' | 'image' | 'audio' | 'video' | 'archive' | 'other';

// ============================================
// Dashboard-Related Insurance Workflow Types
// ============================================

// Task categories for insurance workflows (dashboard view)
// Note: This is separate from TaskCategory which is used for pattern analysis
export type DashboardTaskCategory = 'quote' | 'renewal' | 'claim' | 'service' | 'follow-up' | 'prospecting' | 'other';

// Policy types
export type PolicyType = 'auto' | 'home' | 'life' | 'commercial' | 'bundle';

// Renewal status tracking
export type RenewalStatus = 'pending' | 'contacted' | 'confirmed' | 'at-risk';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  estimatedMinutes?: number;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_type: AttachmentCategory;
  file_size: number;
  storage_path: string;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Allowed attachment file types
export const ALLOWED_ATTACHMENT_TYPES = {
  // Documents
  'application/pdf': { ext: 'pdf', category: 'document' },
  'application/msword': { ext: 'doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', category: 'document' },
  'application/vnd.ms-excel': { ext: 'xls', category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', category: 'document' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', category: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', category: 'document' },
  'text/plain': { ext: 'txt', category: 'document' },
  'text/csv': { ext: 'csv', category: 'document' },
  // Images
  'image/jpeg': { ext: 'jpg', category: 'image' },
  'image/png': { ext: 'png', category: 'image' },
  'image/gif': { ext: 'gif', category: 'image' },
  'image/webp': { ext: 'webp', category: 'image' },
  'image/svg+xml': { ext: 'svg', category: 'image' },
  // Audio
  'audio/mpeg': { ext: 'mp3', category: 'audio' },
  'audio/wav': { ext: 'wav', category: 'audio' },
  'audio/ogg': { ext: 'ogg', category: 'audio' },
  'audio/webm': { ext: 'webm', category: 'audio' },
  'audio/mp4': { ext: 'm4a', category: 'audio' },
  'audio/x-m4a': { ext: 'm4a', category: 'audio' },
  // Video
  'video/mp4': { ext: 'mp4', category: 'video' },
  'video/webm': { ext: 'webm', category: 'video' },
  'video/quicktime': { ext: 'mov', category: 'video' },
  // Archives
  'application/zip': { ext: 'zip', category: 'archive' },
  'application/x-rar-compressed': { ext: 'rar', category: 'archive' },
} as const;

export type AttachmentMimeType = keyof typeof ALLOWED_ATTACHMENT_TYPES;

// Max file size: 25MB
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
// Max attachments per todo
export const MAX_ATTACHMENTS_PER_TODO = 10;

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  status: TodoStatus;
  priority: TodoPriority;
  created_at: string;
  created_by: string;
  assigned_to?: string;
  due_date?: string;
  notes?: string;
  recurrence?: RecurrencePattern;
  updated_at?: string;
  updated_by?: string;
  subtasks?: Subtask[];
  attachments?: Attachment[];
  transcription?: string;
  merged_from?: string[]; // IDs of tasks that were merged into this one
  reminder_at?: string; // Simple single reminder timestamp
  reminder_sent?: boolean; // Whether simple reminder has been sent
  reminders?: TaskReminder[]; // Multiple reminders (from task_reminders table)
  agency_id?: string; // Multi-tenancy: which agency this task belongs to
  display_order?: number; // Manual sort order for list view (lower numbers appear first)
  // Waiting for customer response tracking
  waiting_for_response?: boolean;
  waiting_since?: string;
  waiting_contact_type?: WaitingContactType;
  follow_up_after_hours?: number; // Default 48 hours
  // Dashboard-related insurance workflow fields
  category?: DashboardTaskCategory;
  premium_amount?: number;
  customer_name?: string;
  policy_type?: PolicyType;
  renewal_status?: RenewalStatus;
}

// ============================================
// Reminder Types
// ============================================

export type ReminderType = 'push_notification' | 'chat_message' | 'both';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface TaskReminder {
  id: string;
  todo_id: string;
  user_id?: string; // User to remind (null = assigned user)
  reminder_time: string;
  reminder_type: ReminderType;
  status: ReminderStatus;
  message?: string; // Custom reminder message
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Preset reminder options for UI
export type ReminderPreset =
  | 'at_time'        // At specific time
  | '5_min_before'   // 5 minutes before due date
  | '15_min_before'  // 15 minutes before due date
  | '30_min_before'  // 30 minutes before due date
  | '1_hour_before'  // 1 hour before due date
  | '1_day_before'   // 1 day before due date
  | 'morning_of'     // 9 AM on due date
  | 'custom';        // Custom time selection

export interface ReminderPresetConfig {
  label: string;
  description: string;
  icon: string;
  calculateTime: (dueDate?: Date) => Date | null;
}

export const REMINDER_PRESETS: Record<ReminderPreset, ReminderPresetConfig> = {
  at_time: {
    label: 'At time',
    description: 'Remind at a specific time',
    icon: '⏰',
    calculateTime: () => null, // User selects time
  },
  '5_min_before': {
    label: '5 min before',
    description: '5 minutes before due time',
    icon: '⚡',
    calculateTime: (dueDate) => dueDate ? new Date(dueDate.getTime() - 5 * 60 * 1000) : null,
  },
  '15_min_before': {
    label: '15 min before',
    description: '15 minutes before due time',
    icon: '🔔',
    calculateTime: (dueDate) => dueDate ? new Date(dueDate.getTime() - 15 * 60 * 1000) : null,
  },
  '30_min_before': {
    label: '30 min before',
    description: '30 minutes before due time',
    icon: '⏱️',
    calculateTime: (dueDate) => dueDate ? new Date(dueDate.getTime() - 30 * 60 * 1000) : null,
  },
  '1_hour_before': {
    label: '1 hour before',
    description: '1 hour before due time',
    icon: '🕐',
    calculateTime: (dueDate) => dueDate ? new Date(dueDate.getTime() - 60 * 60 * 1000) : null,
  },
  '1_day_before': {
    label: '1 day before',
    description: '24 hours before due time',
    icon: '📅',
    calculateTime: (dueDate) => dueDate ? new Date(dueDate.getTime() - 24 * 60 * 60 * 1000) : null,
  },
  morning_of: {
    label: 'Morning of',
    description: '9 AM on the due date',
    icon: '🌅',
    calculateTime: (dueDate) => {
      if (!dueDate) return null;
      const morning = new Date(dueDate);
      morning.setHours(9, 0, 0, 0);
      return morning;
    },
  },
  custom: {
    label: 'Custom',
    description: 'Choose a specific date and time',
    icon: '📝',
    calculateTime: () => null, // User selects time
  },
};

export type SortOption = 'created' | 'due_date' | 'priority' | 'alphabetical' | 'custom' | 'urgency';
export type QuickFilter = 'all' | 'my_tasks' | 'due_today' | 'overdue' | 'waiting' | 'needs_followup';

export type ViewMode = 'list' | 'kanban';

export interface User {
  id: string;
  name: string;
  color: string;
  pin_hash?: string;
  email?: string;
  global_role?: GlobalRole;
  created_at?: string;
  last_login?: string;
}

/**
 * User role within an agency context.
 * Aligned with AgencyRole from agency.ts.
 *
 * - `owner`: Agency owner with full permissions
 * - `manager`: Team manager with oversight capabilities
 * - `staff`: Regular team member with limited permissions
 */
export type UserRole = 'owner' | 'manager' | 'staff';

/**
 * Global platform role (cross-agency).
 *
 * - `user`: Standard user (most users)
 * - `super_admin`: Platform administrator with cross-agency access
 */
export type GlobalRole = 'user' | 'super_admin';

// Import agency types for re-export
import type { AgencyMembership, AgencyRole, AgencyPermissions } from './agency';
export type { AgencyMembership, AgencyRole, AgencyPermissions };

export interface AuthUser {
  id: string;
  name: string;
  color: string;
  email?: string;
  role: UserRole;
  global_role?: GlobalRole;
  created_at: string;
  last_login?: string;
  streak_count?: number;
  streak_last_date?: string;
  welcome_shown_at?: string;
  // Multi-tenancy fields
  agencies?: AgencyMembership[];
  current_agency_id?: string;
  current_agency_role?: AgencyRole;
  current_agency_permissions?: AgencyPermissions;
}

export const PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; bgColor: string; icon: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: '!' },
  high: { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: '!!' },
  medium: { label: 'Medium', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: '-' },
  low: { label: 'Low', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)', icon: '...' },
};

export const STATUS_CONFIG: Record<TodoStatus, { label: string; color: string; bgColor: string }> = {
  todo: { label: 'To Do', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  done: { label: 'Done', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
};

// Waiting for customer response configuration
export const WAITING_CONTACT_CONFIG: Record<WaitingContactType, { label: string; icon: string; color: string }> = {
  call: { label: 'Phone Call', icon: '📞', color: '#8b5cf6' },
  email: { label: 'Email', icon: '✉️', color: '#3b82f6' },
  other: { label: 'Other', icon: '💬', color: '#6b7280' },
};

// Default follow-up time in hours
export const DEFAULT_FOLLOW_UP_HOURS = 48;

// Helper to calculate waiting duration
export function getWaitingDuration(waitingSince: string): { hours: number; days: number; isOverdue: boolean; followUpHours?: number } {
  const since = new Date(waitingSince);
  const now = new Date();
  const diffMs = now.getTime() - since.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  return { hours, days, isOverdue: false }; // isOverdue determined by follow_up_after_hours
}

// Helper to check if follow-up is overdue
export function isFollowUpOverdue(todo: Pick<Todo, 'waiting_for_response' | 'waiting_since' | 'follow_up_after_hours'>): boolean {
  if (!todo.waiting_for_response || !todo.waiting_since) return false;
  const since = new Date(todo.waiting_since);
  const now = new Date();
  const diffHours = (now.getTime() - since.getTime()) / (1000 * 60 * 60);
  const threshold = todo.follow_up_after_hours ?? DEFAULT_FOLLOW_UP_HOURS;
  return diffHours >= threshold;
}

// Format waiting duration for display
export function formatWaitingDuration(waitingSince: string): string {
  const { hours, days } = getWaitingDuration(waitingSince);
  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

// Tapback reaction types (iMessage-style)
export type TapbackType = 'heart' | 'thumbsup' | 'thumbsdown' | 'haha' | 'exclamation' | 'question';

export interface MessageReaction {
  user: string;
  reaction: TapbackType;
  created_at: string;
}

// Chat attachment types
export interface ChatAttachment {
  id: string;
  file_name: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  file_size: number; // bytes
  mime_type: string;
  storage_path: string;
  thumbnail_path?: string; // For images/videos
  uploaded_by: string;
  uploaded_at: string;
}

/**
 * Chat message types
 *
 * Nullable pattern convention:
 * - `field?: T` = Optional field, may not exist in payload
 * - `field: T | null` = Required field that can be explicitly null (null has semantic meaning)
 *
 * For fields that may not exist in legacy data BUT where null is meaningful when present,
 * we use `field?: T | null`. This is intentional to handle both cases.
 */
export interface ChatMessage {
  // Required fields (always present)
  id: string;
  text: string;
  created_by: string;
  created_at: string;

  // Truly optional fields (absence means "not applicable")
  related_todo_id?: string;
  reactions?: MessageReaction[];
  read_by?: string[];
  mentions?: string[];
  agency_id?: string;
  attachments?: ChatAttachment[];
  is_pinned?: boolean;

  // Nullable fields where null has semantic meaning:
  // - null = explicit absence of value (e.g., no recipient = team chat)
  // - undefined = field not in payload (legacy data)
  recipient?: string | null;       // null = team chat, string = DM recipient
  reply_to_id?: string | null;     // null = not a reply
  reply_to_text?: string | null;   // null = not a reply
  reply_to_user?: string | null;   // null = not a reply
  edited_at?: string | null;       // null = never edited
  deleted_at?: string | null;      // null = not deleted (soft delete)
  pinned_by?: string | null;       // null = not pinned
  pinned_at?: string | null;       // null = not pinned
}

// User presence status
export type PresenceStatus = 'online' | 'away' | 'offline' | 'dnd';

export interface UserPresence {
  user_name: string;
  status: PresenceStatus;
  last_seen: string;
  custom_status?: string;
}

// Muted conversation settings
export interface MutedConversation {
  conversation_key: string; // 'team' or username
  muted_until?: string | null; // null = muted forever, string = muted until date, undefined = not muted
}

// Chat conversation type
export type ChatConversation =
  | { type: 'team' }
  | { type: 'dm'; userName: string };

// Task Template types
export interface TemplateSubtask {
  text: string;
  priority: TodoPriority;
  estimatedMinutes?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  default_priority: TodoPriority;
  default_assigned_to?: string;
  subtasks: TemplateSubtask[];
  created_by: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  agency_id?: string; // Multi-tenancy: which agency this template belongs to
}

// Activity Log types
export type ActivityAction =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_completed'
  | 'task_reopened'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned_to_changed'
  | 'due_date_changed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'subtask_deleted'
  | 'notes_updated'
  | 'template_created'
  | 'template_used'
  | 'attachment_added'
  | 'attachment_removed'
  | 'tasks_merged'
  | 'reminder_added'
  | 'reminder_removed'
  | 'reminder_sent'
  | 'marked_waiting'
  | 'customer_responded'
  | 'follow_up_overdue'
  | 'task_reordered';

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  todo_id?: string;
  todo_text?: string;
  user_name: string;
  details: Record<string, unknown>;
  created_at: string;
  agency_id?: string; // Multi-tenancy: which agency this activity belongs to
}

// Legacy constants removed in Phase 4E multi-tenancy migration.
// Use usePermission('can_view_activity_feed') and usePermission('can_view_all_tasks') instead.

// Notification settings for activity feed
export interface ActivityNotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  notifyOwnActions: boolean; // Also notify for your own actions (useful for testing)
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: ActivityNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  browserNotificationsEnabled: false,
  notifyOwnActions: false,
};

// Strategic Goals Types (Owner Dashboard)
export type GoalStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface GoalCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  display_order: number;
  created_at: string;
  agency_id?: string; // Multi-tenancy: which agency this category belongs to
}

export interface StrategicGoal {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  status: GoalStatus;
  priority: GoalPriority;
  target_date?: string;
  target_value?: string;
  current_value?: string;
  progress_percent: number;
  notes?: string;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  agency_id?: string; // Multi-tenancy: which agency this goal belongs to
  // Joined data
  category?: GoalCategory;
  milestones?: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  target_date?: string;
  display_order: number;
  created_at: string;
}

// Agency metrics for dashboard
export interface AgencyMetrics {
  id: string;
  agency_id: string;
  month: string;
  retention_rate?: number;
  premium_goal?: number;
  premium_actual?: number;
  policies_goal?: number;
  policies_actual?: number;
  created_at: string;
  updated_at: string;
}

export const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)', icon: '○' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: '◐' },
  on_hold: { label: 'On Hold', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: '⏸' },
  completed: { label: 'Completed', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: '✓' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: '✕' },
};

export const GOAL_PRIORITY_CONFIG: Record<GoalPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  high: { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  medium: { label: 'Medium', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  low: { label: 'Low', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
};

// Legacy isOwner(), isAdmin(), canViewStrategicGoals() functions deleted in Phase 4E.
// Use usePermission() hook or useRoleCheck() hook instead.
// See src/hooks/usePermission.ts and src/hooks/useRoleCheck.ts.

// ============================================
// Task Completion & Celebration Types
// ============================================

// Task category for pattern analysis (Feature 4)
// Based on data analysis: Policy (42%), Follow-up (40%), Vehicle (25%), Payment (18%), Endorsement (18%), Claims (10.5%), Quotes (10.5%)
export type TaskCategory =
  | 'policy_review'    // 42% - Policy reviews, renewals, coverage checks
  | 'follow_up'        // 40% - Calls, callbacks, customer communication
  | 'vehicle_add'      // 25% - Adding/removing vehicles, auto changes
  | 'payment'          // 18% - Payment processing, billing issues (100% completion rate!)
  | 'endorsement'      // 18% - Policy changes, endorsements
  | 'claim'            // 10.5% - Claims processing (87.5% completion rate)
  | 'quote'            // 10.5% - New quotes, proposals (50% completion rate - needs improvement)
  | 'documentation'    // 12% - Sending docs, dec pages
  | 'new_client'       // 2.6% - New client onboarding (100% completion rate)
  | 'cancellation'     // 6.6% - Policy cancellations
  | 'other';

// Task pattern learned from historical data
export interface TaskPattern {
  id: string;
  pattern_text: string;
  category: TaskCategory;
  occurrence_count: number;
  avg_priority: TodoPriority;
  common_subtasks: string[];
  last_occurrence: string;
  created_at: string;
  updated_at?: string;
}

// Quick task template for common insurance tasks
export interface QuickTaskTemplate {
  text: string;
  category: TaskCategory;
  defaultPriority: TodoPriority;
  suggestedSubtasks: string[];
  icon?: string;
}

// Celebration data for enhanced completion feedback
export interface CelebrationData {
  completedTask: Todo;
  nextTasks: Todo[];
  streakCount: number;
  encouragementMessage: string;
}

// Celebration intensity levels
export type CelebrationIntensity = 'light' | 'medium' | 'high';

// Task completion summary for copying to external systems
export interface TaskCompletionSummaryData {
  taskText: string;
  completedBy: string;
  completedAt: string;
  priority: TodoPriority;
  assignedTo?: string;
  dueDate?: string;
  subtasksCompleted: number;
  subtasksTotal: number;
  subtaskDetails: Array<{ text: string; completed: boolean }>;
  notes?: string;
  attachments: string[];
  transcription?: string;
}

// Insurance-specific quick task definitions
// Based on task analysis: Policy (42%), Follow-up (40%), Vehicle (25%), Payment (18%), Claims (10.5%), Quotes (10.5%)
export const INSURANCE_QUICK_TASKS: QuickTaskTemplate[] = [
  // TOP CATEGORY: Policy Review/Renewal (42% of all tasks)
  {
    text: 'Policy review for [customer]',
    category: 'policy_review',
    defaultPriority: 'medium',
    suggestedSubtasks: [
      'Review current coverage limits',
      'Check for discount opportunities',
      'Verify contact information',
      'Prepare renewal quote if applicable',
    ],
    icon: '📋',
  },
  // TOP CATEGORY: Follow-up/Communication (40% of all tasks - HIGHEST URGENCY)
  {
    text: 'Follow up call - [customer]',
    category: 'follow_up',
    defaultPriority: 'high',
    suggestedSubtasks: [
      'Review account notes before call',
      'Make call or leave voicemail',
      'Document conversation details',
      'Schedule next follow-up if needed',
    ],
    icon: '📞',
  },
  // TOP CATEGORY: Vehicle/Auto Changes (25% of all tasks - 84% completion rate)
  {
    text: 'Add vehicle to policy - [customer]',
    category: 'vehicle_add',
    defaultPriority: 'high',
    suggestedSubtasks: [
      'Collect VIN and vehicle information',
      'Verify registration',
      'Calculate premium change',
      'Update policy and send new dec page',
    ],
    icon: '🚗',
  },
  // Payment/Billing (18% - 100% completion rate, best performing)
  {
    text: 'Payment/billing issue - [customer]',
    category: 'payment',
    defaultPriority: 'high',
    suggestedSubtasks: [
      'Review account status',
      'Contact carrier if needed',
      'Process payment or resolve issue',
      'Confirm resolution with customer',
    ],
    icon: '💳',
  },
  // NEW: Endorsement/Policy Change (18% of all tasks)
  {
    text: 'Policy endorsement - [customer]',
    category: 'endorsement',
    defaultPriority: 'medium',
    suggestedSubtasks: [
      'Review requested change details',
      'Calculate premium impact',
      'Process endorsement with carrier',
      'Send updated declarations page',
    ],
    icon: '📝',
  },
  // Claims (10.5% - 87.5% completion rate)
  {
    text: 'Process claim for [customer]',
    category: 'claim',
    defaultPriority: 'urgent',
    suggestedSubtasks: [
      'File claim with carrier',
      'Document incident details',
      'Coordinate with adjuster',
      'Follow up on claim status',
      'Update customer on progress',
    ],
    icon: '🚨',
  },
  // Quotes/Proposals (10.5% - LOWEST completion rate at 50%, needs better breakdown)
  {
    text: 'Quote request - [customer]',
    category: 'quote',
    defaultPriority: 'medium',
    suggestedSubtasks: [
      'Collect all required customer information',
      'Pull MVR and claims history',
      'Run quotes with multiple carriers',
      'Compare coverage options and pricing',
      'Prepare proposal document',
      'Send quote and schedule follow-up',
    ],
    icon: '📊',
  },
  // New Client (2.6% but 100% completion rate - keep it)
  {
    text: 'New client onboarding - [customer]',
    category: 'new_client',
    defaultPriority: 'high',
    suggestedSubtasks: [
      'Gather customer information',
      'Pull MVR for all drivers',
      'Run quotes with multiple carriers',
      'Present options and bind coverage',
      'Set up account in management system',
      'Send welcome packet',
    ],
    icon: '👋',
  },
  // NEW: Documentation (12% of all tasks - 67% completion rate)
  {
    text: 'Send documents to [customer]',
    category: 'documentation',
    defaultPriority: 'medium',
    suggestedSubtasks: [
      'Locate requested documents',
      'Verify document accuracy',
      'Email documents to customer',
      'Confirm receipt with customer',
    ],
    icon: '📄',
  },
  // NEW: Cancellation (6.6% - important to track)
  {
    text: 'Process cancellation - [customer]',
    category: 'other',
    defaultPriority: 'high',
    suggestedSubtasks: [
      'Verify cancellation request',
      'Offer retention options if applicable',
      'Process cancellation with carrier',
      'Send confirmation to customer',
      'Update account records',
    ],
    icon: '❌',
  },
];
