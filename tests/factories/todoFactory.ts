import { faker } from '@faker-js/faker';
import { Todo, TodoPriority, TodoStatus, Subtask, Attachment } from '@/types/todo';

/**
 * Create a mock todo with optional overrides
 */
export function createMockTodo(overrides?: Partial<Todo>): Todo {
  return {
    id: faker.string.uuid(),
    text: faker.lorem.sentence(),
    completed: false,
    status: 'todo' as TodoStatus,
    priority: 'medium' as TodoPriority,
    created_at: faker.date.recent().toISOString(),
    created_by: faker.person.firstName(),
    assigned_to: undefined,
    due_date: undefined,
    notes: undefined,
    recurrence: null,
    updated_at: faker.date.recent().toISOString(),
    updated_by: faker.person.firstName(),
    subtasks: [],
    attachments: [],
    transcription: undefined,
    merged_from: undefined,
    ...overrides,
  };
}

/**
 * Create a list of mock todos
 */
export function createMockTodoList(count: number = 10, overrides?: Partial<Todo>): Todo[] {
  return Array.from({ length: count }, () => createMockTodo(overrides));
}

/**
 * Create a mock subtask
 */
export function createMockSubtask(overrides?: Partial<Subtask>): Subtask {
  return {
    id: faker.string.uuid(),
    text: faker.lorem.sentence(),
    completed: false,
    priority: 'medium' as TodoPriority,
    estimatedMinutes: faker.number.int({ min: 15, max: 120 }),
    ...overrides,
  };
}

/**
 * Create a mock attachment
 */
export function createMockAttachment(overrides?: Partial<Attachment>): Attachment {
  return {
    id: faker.string.uuid(),
    file_name: faker.system.fileName(),
    file_type: 'pdf',
    file_size: faker.number.int({ min: 1024, max: 1024000 }),
    storage_path: `todos/${faker.string.uuid()}/${faker.system.fileName()}`,
    mime_type: 'application/pdf',
    uploaded_by: faker.person.firstName(),
    uploaded_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Create a todo with subtasks
 */
export function createMockTodoWithSubtasks(
  subtaskCount: number = 3,
  overrides?: Partial<Todo>
): Todo {
  return createMockTodo({
    subtasks: Array.from({ length: subtaskCount }, () => createMockSubtask()),
    ...overrides,
  });
}

/**
 * Create a completed todo
 */
export function createMockCompletedTodo(overrides?: Partial<Todo>): Todo {
  return createMockTodo({
    completed: true,
    status: 'done',
    ...overrides,
  });
}

/**
 * Create an overdue todo
 */
export function createMockOverdueTodo(overrides?: Partial<Todo>): Todo {
  return createMockTodo({
    due_date: faker.date.past().toISOString(),
    priority: 'urgent',
    ...overrides,
  });
}
