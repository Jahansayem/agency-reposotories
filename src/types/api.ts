/**
 * Shared API response types for consistent typing across all API routes.
 *
 * TYPE-011 Fix: Provides strongly-typed response shapes instead of ad-hoc definitions.
 *
 * Usage:
 *   import type { ApiSuccessResponse, ApiErrorResponse, ApiPaginatedResponse } from '@/types/api';
 *
 *   // In API route:
 *   return NextResponse.json({ success: true, data: todos } satisfies ApiSuccessResponse<Todo[]>);
 *
 *   // In client code:
 *   const response = await fetch('/api/todos');
 *   const data: ApiResponse<Todo[]> = await response.json();
 */

import type { Todo, ChatMessage, TaskTemplate, ActivityLogEntryLoose, User, StrategicGoal } from './todo';
import type { Agency, AgencyMember, AgencyInvitation } from './agency';

// ============================================
// Base Response Types
// ============================================

/**
 * Standard success response shape.
 * All successful API responses should extend this.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standard error response shape.
 * All error responses follow this format.
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorCode;
  message: string;
  /** Optional additional error details for debugging */
  details?: Record<string, unknown>;
}

/**
 * Union type for any API response.
 * Use this when you don't know if the response will be success or error.
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response wrapper for list endpoints.
 */
export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================================
// Error Codes
// ============================================

/**
 * Standardized error codes for API responses.
 * Use these instead of ad-hoc strings for consistent error handling.
 */
export type ApiErrorCode =
  // Authentication/Authorization
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SESSION_EXPIRED'
  | 'SESSION_FAILED'
  | 'INVALID_TOKEN'
  | 'ACCOUNT_LOCKED'

  // Validation
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_FIELD'
  | 'INVALID_FORMAT'

  // Resource errors
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'

  // Rate limiting
  | 'RATE_LIMITED'
  | 'TOO_MANY_REQUESTS'

  // Server errors
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'AI_SERVICE_ERROR'

  // Feature-specific
  | 'UPLOAD_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_USED';

// ============================================
// Resource-Specific Response Types
// ============================================

// ----- Todos -----

export interface TodoListResponse extends ApiSuccessResponse<Todo[]> {
  data: Todo[];
}

export interface TodoSingleResponse extends ApiSuccessResponse<Todo> {
  data: Todo;
}

export interface TodoCreateResponse extends ApiSuccessResponse<Todo> {
  data: Todo;
  /** ID of created activity log entry */
  activityId?: string;
}

export interface TodoUpdateResponse extends ApiSuccessResponse<Todo> {
  data: Todo;
}

export interface TodoDeleteResponse extends ApiSuccessResponse<{ id: string }> {
  data: { id: string };
}

export interface TodoReorderResponse extends ApiSuccessResponse<{ updated: number }> {
  data: { updated: number };
}

// ----- Chat Messages -----

export interface ChatMessageListResponse extends ApiSuccessResponse<ChatMessage[]> {
  data: ChatMessage[];
}

export interface ChatMessageSingleResponse extends ApiSuccessResponse<ChatMessage> {
  data: ChatMessage;
}

// ----- Users -----

export interface UserListResponse extends ApiSuccessResponse<User[]> {
  data: User[];
}

export interface UserSingleResponse extends ApiSuccessResponse<User> {
  data: User;
}

// ----- Authentication -----

export type LoginResponse = ApiSuccessResponse<{
  user: {
    id: string;
    name: string;
    color: string;
    role: string;
  };
  currentAgencyId?: string;
  agencies: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    is_default: boolean;
  }>;
}>;

export type RegisterResponse = ApiSuccessResponse<{
  user: {
    id: string;
    name: string;
    color: string;
  };
}>;

// ----- Agencies -----

export interface AgencyListResponse extends ApiSuccessResponse<Agency[]> {
  data: Agency[];
}

export interface AgencySingleResponse extends ApiSuccessResponse<Agency> {
  data: Agency;
}

export interface AgencyMemberListResponse extends ApiSuccessResponse<AgencyMember[]> {
  data: AgencyMember[];
}

export interface AgencyInvitationListResponse extends ApiSuccessResponse<AgencyInvitation[]> {
  data: AgencyInvitation[];
}

export type InvitationValidateResponse = ApiSuccessResponse<{
  valid: boolean;
  invitation?: {
    id: string;
    email: string;
    role: string;
    agency_name: string;
  };
}>;

export type InvitationAcceptResponse = ApiSuccessResponse<{
  membership: AgencyMember;
}>;

// ----- Templates -----

export interface TemplateListResponse extends ApiSuccessResponse<TaskTemplate[]> {
  data: TaskTemplate[];
}

export interface TemplateSingleResponse extends ApiSuccessResponse<TaskTemplate> {
  data: TaskTemplate;
}

// ----- Activity -----

export interface ActivityListResponse extends ApiSuccessResponse<ActivityLogEntryLoose[]> {
  data: ActivityLogEntryLoose[];
}

// ----- Goals -----

export interface GoalListResponse extends ApiSuccessResponse<StrategicGoal[]> {
  data: StrategicGoal[];
}

export interface GoalSingleResponse extends ApiSuccessResponse<StrategicGoal> {
  data: StrategicGoal;
}

// ----- AI Endpoints -----

export type SmartParseResponse = ApiSuccessResponse<{
  mainTask: {
    text: string;
    priority: string;
    assignedTo?: string;
    dueDate?: string;
  };
  subtasks: Array<{
    text: string;
    priority: string;
    estimatedMinutes?: number;
  }>;
}>;

export type EnhanceTaskResponse = ApiSuccessResponse<{
  enhancedText: string;
  priority?: string;
  suggestions?: {
    assignedTo?: string;
    notes?: string;
  };
}>;

export type TranscribeResponse = ApiSuccessResponse<{
  transcription: string;
  tasks?: Array<{
    text: string;
    priority: string;
    transcription?: string;
  }>;
}>;

export type GenerateEmailResponse = ApiSuccessResponse<{
  subject: string;
  body: string;
  warnings?: Array<{
    type: 'sensitive_info' | 'date_promise' | 'pricing' | 'coverage_details' | 'negative_news';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}>;

// ----- Attachments -----

export type AttachmentUploadResponse = ApiSuccessResponse<{
  attachment: {
    id: string;
    file_name: string;
    storage_path: string;
    file_size: number;
    file_type: string;
    mime_type: string;
    uploaded_by: string;
    uploaded_at: string;
  };
}>;

// ----- Push Notifications -----

export type PushSubscribeResponse = ApiSuccessResponse<{
  subscribed: boolean;
}>;

export type PushSendResponse = ApiSuccessResponse<{
  sent: number;
  failed: number;
}>;

// ----- Health Check -----

export type HealthCheckResponse = ApiSuccessResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    redis?: boolean;
    ai?: boolean;
  };
}>;

// ============================================
// Request Types (for type-safe request bodies)
// ============================================

export interface TodoCreateRequest {
  text: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
  notes?: string;
  subtasks?: Array<{
    text: string;
    priority?: string;
    estimatedMinutes?: number;
  }>;
  created_by: string;
}

export interface TodoUpdateRequest {
  id: string;
  text?: string;
  completed?: boolean;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  notes?: string | null;
  subtasks?: Array<{
    id: string;
    text: string;
    completed: boolean;
    priority: string;
    estimatedMinutes?: number;
  }>;
  updated_by: string;
}

export interface ChatMessageCreateRequest {
  text: string;
  created_by: string;
  recipient?: string | null;
  related_todo_id?: string;
  reply_to_id?: string;
  mentions?: string[];
}

export interface InvitationCreateRequest {
  email: string;
  role: 'owner' | 'manager' | 'staff';
  invited_by: string;
}

export interface SmartParseRequest {
  text: string;
  users: string[];
}

export interface GenerateEmailRequest {
  customerName: string;
  tasks: Array<{
    text: string;
    notes?: string;
    completed: boolean;
    subtasks?: Array<{ text: string; completed: boolean }>;
    transcription?: string;
    attachments?: Array<{ file_name: string; file_type: string }>;
  }>;
  tone?: 'friendly' | 'formal' | 'brief';
}
