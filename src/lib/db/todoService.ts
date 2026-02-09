/**
 * Todo Service with Atomic Dual-Write Support
 *
 * Writes to both old (JSONB) and new (normalized) schemas
 * for zero-downtime migration. All write operations use
 * PostgreSQL functions (via supabase.rpc()) to ensure atomicity
 * and prevent race conditions between dual-write steps.
 *
 * Race condition fix (2026-02-08):
 * Previously, createTodo/updateTodo/deleteTodo performed sequential
 * client-side writes to the old schema and then the normalized schema.
 * If the second write failed (network error, timeout, etc.), data would
 * be inconsistent: the old schema would have the change but the normalized
 * schema would not (or vice versa for deletes). Now all dual-writes are
 * wrapped in PostgreSQL functions that execute within a single transaction.
 */

import { supabase } from '@/lib/supabaseClient';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';
import { Todo, TodoStatus, TodoPriority } from '@/types/todo';

/** Default number of todos per page when pagination is used */
const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed page size to prevent abuse */
const MAX_PAGE_SIZE = 200;

/** Pagination parameters for getTodos */
export interface TodoPaginationParams {
  /** Page number (1-based). Defaults to 1. */
  page?: number;
  /** Number of items per page. Defaults to 50, max 200. */
  pageSize?: number;
}

/** Pagination metadata returned alongside results */
export interface TodoPaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Paginated result from getTodos */
export interface PaginatedTodosResult {
  data: Todo[];
  pagination: TodoPaginationMeta;
}

/**
 * Shape returned by the PostgreSQL RPC functions.
 * On success the JSONB contains the todo row fields.
 * On failure it contains { error: true, message: string }.
 */
interface RpcTodoResult {
  error?: boolean;
  message?: string;
  [key: string]: unknown;
}

export class TodoService {
  /**
   * Create a new todo with atomic dual-write support.
   *
   * Uses the `todo_create_with_sync` PostgreSQL function to insert into
   * the old (JSONB) schema and, when the normalized_schema feature flag
   * is enabled, atomically sync subtasks, attachments, and user assignments
   * to the normalized tables -- all within a single database transaction.
   */
  async createTodo(todo: Partial<Todo>): Promise<Todo> {
    const useNormalizedSchema = isFeatureEnabled('normalized_schema');

    try {
      const { data, error } = await supabase.rpc('todo_create_with_sync', {
        p_text: todo.text ?? '',
        p_completed: todo.completed ?? false,
        p_status: todo.status ?? 'todo',
        p_priority: todo.priority ?? 'medium',
        p_created_by: todo.created_by ?? null,
        p_assigned_to: todo.assigned_to ?? null,
        p_due_date: todo.due_date ?? null,
        p_notes: todo.notes ?? null,
        p_recurrence: todo.recurrence ?? null,
        p_subtasks: JSON.stringify(todo.subtasks ?? []),
        p_attachments: JSON.stringify(todo.attachments ?? []),
        p_transcription: todo.transcription ?? null,
        p_agency_id: todo.agency_id ?? null,
        p_sync_normalized: useNormalizedSchema,
      });

      if (error) throw error;

      const result = data as RpcTodoResult;
      if (result?.error) {
        throw new Error(result.message ?? 'Unknown error from todo_create_with_sync');
      }

      return result as unknown as Todo;
    } catch (error) {
      logger.error('Failed to create todo', error as Error, {
        component: 'TodoService',
        action: 'createTodo',
      });
      throw error;
    }
  }

  /**
   * Update a todo with atomic dual-write support.
   *
   * Uses the `todo_update_with_sync` PostgreSQL function to update the
   * old (JSONB) schema and re-sync normalized tables atomically.
   * The function uses row-level locking (SELECT FOR UPDATE) to prevent
   * concurrent modifications from creating inconsistent state.
   */
  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    const useNormalizedSchema = isFeatureEnabled('normalized_schema');

    try {
      // Convert the updates to a plain JSONB object for the RPC call.
      // Note: updated_at is always set to NOW() by the PostgreSQL function,
      // so we do not include it in the client-side payload.
      const { data, error } = await supabase.rpc('todo_update_with_sync', {
        p_todo_id: id,
        p_updates: updates,
        p_sync_normalized: useNormalizedSchema,
      });

      if (error) throw error;

      const result = data as RpcTodoResult;
      if (result?.error) {
        throw new Error(result.message ?? 'Unknown error from todo_update_with_sync');
      }

      return result as unknown as Todo;
    } catch (error) {
      logger.error('Failed to update todo', error as Error, {
        component: 'TodoService',
        action: 'updateTodo',
        todoId: id,
      });
      throw error;
    }
  }

  /**
   * Get a todo (reads from new schema if available, falls back to old)
   */
  async getTodo(id: string): Promise<Todo | null> {
    const useNormalizedSchema = isFeatureEnabled('normalized_schema');

    try {
      // Fetch base todo
      const { data: todo, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!todo) return null;

      // If new schema enabled, fetch from normalized tables
      if (useNormalizedSchema) {
        return await this.enrichTodoFromNormalizedSchema(todo);
      }

      return todo;
    } catch (error) {
      logger.error('Failed to get todo', error as Error, {
        component: 'TodoService',
        action: 'getTodo',
        todoId: id,
      });
      return null;
    }
  }

  /**
   * Get todos with optional filters and pagination.
   *
   * Supports offset-based pagination via `page` and `pageSize` params.
   * When no pagination params are provided, defaults are applied
   * (page 1, pageSize 50) to prevent unbounded queries.
   *
   * Returns a PaginatedTodosResult containing the data array and
   * pagination metadata (totalCount, totalPages, hasNextPage, etc.).
   */
  async getTodos(filters?: {
    assignedTo?: string;
    createdBy?: string;
    status?: TodoStatus;
    completed?: boolean;
  }, pagination?: TodoPaginationParams): Promise<PaginatedTodosResult> {
    const useNormalizedSchema = isFeatureEnabled('normalized_schema');

    // Normalize pagination params
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination?.pageSize ?? DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * pageSize;

    try {
      // Build a count query to get the total number of matching rows
      let countQuery = supabase.from('todos').select('*', { count: 'exact', head: true });

      // Build the data query with ordering and range
      let query = supabase.from('todos').select('*').order('created_at', { ascending: false });

      // Apply filters to both queries
      if (filters?.assignedTo) {
        countQuery = countQuery.eq('assigned_to', filters.assignedTo);
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.createdBy) {
        countQuery = countQuery.eq('created_by', filters.createdBy);
        query = query.eq('created_by', filters.createdBy);
      }
      if (filters?.status) {
        countQuery = countQuery.eq('status', filters.status);
        query = query.eq('status', filters.status);
      }
      if (filters?.completed !== undefined) {
        countQuery = countQuery.eq('completed', filters.completed);
        query = query.eq('completed', filters.completed);
      }

      // Apply pagination range
      query = query.range(offset, offset + pageSize - 1);

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([countQuery, query]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      const totalCount = countResult.count ?? 0;
      const todos = dataResult.data ?? [];

      // Enrich from normalized schema if enabled
      const enrichedTodos = useNormalizedSchema
        ? await Promise.all(todos.map(todo => this.enrichTodoFromNormalizedSchema(todo)))
        : todos;

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: enrichedTodos,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to get todos', error as Error, {
        component: 'TodoService',
        action: 'getTodos',
      });
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  /**
   * Delete a todo atomically from both schemas.
   *
   * Uses the `todo_delete_with_sync` PostgreSQL function to delete
   * from the normalized schema tables and the old schema within a
   * single transaction. Row-level locking prevents concurrent
   * modifications during deletion.
   */
  async deleteTodo(id: string): Promise<void> {
    const useNormalizedSchema = isFeatureEnabled('normalized_schema');

    try {
      const { data, error } = await supabase.rpc('todo_delete_with_sync', {
        p_todo_id: id,
        p_sync_normalized: useNormalizedSchema,
      });

      if (error) throw error;

      const result = data as RpcTodoResult | null;
      if (result?.error) {
        throw new Error(result.message ?? 'Unknown error from todo_delete_with_sync');
      }
    } catch (error) {
      logger.error('Failed to delete todo', error as Error, {
        component: 'TodoService',
        action: 'deleteTodo',
        todoId: id,
      });
      throw error;
    }
  }

  /**
   * Enrich todo with data from normalized schema
   * @private
   */
  private async enrichTodoFromNormalizedSchema(todo: Todo): Promise<Todo> {
    try {
      // Fetch subtasks
      const { data: subtasks } = await supabase
        .from('subtasks_v2')
        .select('*')
        .eq('todo_id', todo.id)
        .order('display_order');

      if (subtasks && subtasks.length > 0) {
        todo.subtasks = subtasks.map(st => ({
          id: st.id,
          text: st.text,
          completed: st.completed,
          priority: st.priority as TodoPriority,
          estimatedMinutes: st.estimated_minutes,
        }));
      }

      // Fetch attachments
      const { data: attachments } = await supabase
        .from('attachments_v2')
        .select('*')
        .eq('todo_id', todo.id);

      if (attachments && attachments.length > 0) {
        todo.attachments = attachments.map(att => ({
          id: att.id,
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size,
          storage_path: att.storage_path,
          mime_type: att.mime_type,
          uploaded_by: att.uploaded_by_name || '',
          uploaded_at: att.uploaded_at,
        }));
      }

      return todo;
    } catch (error) {
      logger.error('Failed to enrich from normalized schema', error as Error, {
        component: 'TodoService',
        action: 'enrichTodoFromNormalizedSchema',
        todoId: todo.id,
      });
      // Return original todo on error
      return todo;
    }
  }
}

export const todoService = new TodoService();
