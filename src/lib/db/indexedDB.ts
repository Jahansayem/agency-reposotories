import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Todo, ChatMessage as Message, User } from '@/types/todo';

/**
 * BUGFIX TYPE-003: Discriminated union for sync queue data
 * Provides type safety for offline sync operations
 */
export type SyncQueueData =
  | { table: 'todos'; data: Partial<Todo> & { id: string } }
  | { table: 'messages'; data: Partial<Message> & { id: string } };

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'todos' | 'messages';
  data: Partial<Todo> | Partial<Message>;
  timestamp: number;
  retries: number;
}

/**
 * IndexedDB Schema for Offline Support
 * Sprint 3 Issue #35: Offline Mode with IndexedDB
 *
 * Stores todos, messages, and users locally for offline access
 * Implements sync queue for mutations made while offline
 */

interface BealerTasksDB extends DBSchema {
  todos: {
    key: string;
    value: Todo;
    indexes: {
      'by-assigned': string;
      'by-created': string;
      'by-status': string;
      'by-updated': string;
    };
  };
  messages: {
    key: string;
    value: Message & { synced?: boolean };
    indexes: {
      'by-created': string;
      'by-user': string;
      'by-todo': string;
    };
  };
  users: {
    key: string;
    value: User;
    indexes: {
      'by-name': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-table': string;
    };
  };
}

const DB_NAME = 'wavezly-tasks-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<BealerTasksDB> | null = null;

/**
 * Initialize IndexedDB database
 * Creates object stores and indexes
 */
export async function initDB(): Promise<IDBPDatabase<BealerTasksDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BealerTasksDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Todos store
      if (!db.objectStoreNames.contains('todos')) {
        const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('by-assigned', 'assigned_to', { unique: false });
        todoStore.createIndex('by-created', 'created_at', { unique: false });
        todoStore.createIndex('by-status', 'status', { unique: false });
        todoStore.createIndex('by-updated', 'updated_at', { unique: false });
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('by-created', 'created_at', { unique: false });
        messageStore.createIndex('by-user', 'created_by', { unique: false });
        messageStore.createIndex('by-todo', 'related_todo_id', { unique: false });
      }

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-name', 'name', { unique: true });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('by-table', 'table', { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBPDatabase<BealerTasksDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ============================================================================
// TODOS
// ============================================================================

/**
 * Save todos to IndexedDB
 */
export async function saveTodosToIDB(todos: Todo[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('todos', 'readwrite');
  const store = tx.objectStore('todos');

  await Promise.all(todos.map((todo) => store.put(todo)));
  await tx.done;
}

/**
 * Get all todos from IndexedDB
 */
export async function getTodosFromIDB(): Promise<Todo[]> {
  const db = await getDB();
  return await db.getAll('todos');
}

/**
 * Get a single todo by ID
 */
export async function getTodoByIdFromIDB(id: string): Promise<Todo | undefined> {
  const db = await getDB();
  return await db.get('todos', id);
}

/**
 * Save a single todo to IndexedDB
 */
export async function saveTodoToIDB(todo: Todo): Promise<void> {
  const db = await getDB();
  await db.put('todos', todo);
}

/**
 * Delete a todo from IndexedDB
 */
export async function deleteTodoFromIDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('todos', id);
}

/**
 * Get todos by assigned user
 */
export async function getTodosByAssignedFromIDB(userName: string): Promise<Todo[]> {
  const db = await getDB();
  return await db.getAllFromIndex('todos', 'by-assigned', userName);
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Save messages to IndexedDB
 */
export async function saveMessagesToIDB(messages: Message[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const store = tx.objectStore('messages');

  await Promise.all(
    messages.map((message) => store.put({ ...message, synced: true }))
  );
  await tx.done;
}

/**
 * Get all messages from IndexedDB
 */
export async function getMessagesFromIDB(): Promise<Message[]> {
  const db = await getDB();
  const messages = await db.getAll('messages');
  // Remove the synced flag before returning
  return messages.map(({ synced, ...message }) => message as Message);
}

/**
 * Save a single message to IndexedDB
 */
export async function saveMessageToIDB(
  message: Message,
  synced: boolean = false
): Promise<void> {
  const db = await getDB();
  await db.put('messages', { ...message, synced });
}

/**
 * Get unsynced messages (created while offline)
 */
export async function getUnsyncedMessagesFromIDB(): Promise<Message[]> {
  const db = await getDB();
  const allMessages = await db.getAll('messages');
  return allMessages
    .filter((msg) => !msg.synced)
    .map(({ synced, ...message }) => message as Message);
}

/**
 * Mark messages as synced
 */
export async function markMessagesAsSyncedInIDB(messageIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const store = tx.objectStore('messages');

  await Promise.all(
    messageIds.map(async (id) => {
      const message = await store.get(id);
      if (message) {
        await store.put({ ...message, synced: true });
      }
    })
  );

  await tx.done;
}

// ============================================================================
// USERS
// ============================================================================

/**
 * Save users to IndexedDB
 */
export async function saveUsersToIDB(users: User[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');

  await Promise.all(users.map((user) => store.put(user)));
  await tx.done;
}

/**
 * Get all users from IndexedDB
 */
export async function getUsersFromIDB(): Promise<User[]> {
  const db = await getDB();
  return await db.getAll('users');
}

/**
 * Get user by name
 */
export async function getUserByNameFromIDB(name: string): Promise<User | undefined> {
  const db = await getDB();
  return await db.getFromIndex('users', 'by-name', name);
}

// ============================================================================
// SYNC QUEUE
// ============================================================================

/**
 * Add operation to sync queue
 * BUGFIX TYPE-003: Uses proper typed data instead of any
 */
export async function addToSyncQueue<T extends 'todos' | 'messages'>(
  type: 'create' | 'update' | 'delete',
  table: T,
  data: T extends 'todos' ? (Partial<Todo> & { id: string }) : (Partial<Message> & { id: string })
): Promise<void> {
  const db = await getDB();
  const id = `${table}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db.put('syncQueue', {
    id,
    type,
    table,
    data,
    timestamp: Date.now(),
    retries: 0,
  });
}

/**
 * Get all items from sync queue
 * BUGFIX TYPE-003: Returns properly typed items
 */
export async function getSyncQueueFromIDB(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return await db.getAllFromIndex('syncQueue', 'by-timestamp');
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

/**
 * Increment retry count for sync queue item
 */
export async function incrementSyncRetries(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);

  if (item) {
    await db.put('syncQueue', {
      ...item,
      retries: item.retries + 1,
    });
  }
}

/**
 * Clear all data from IndexedDB (for testing/debugging)
 */
export async function clearAllIDBData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['todos', 'messages', 'users', 'syncQueue'], 'readwrite');

  await Promise.all([
    tx.objectStore('todos').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('users').clear(),
    tx.objectStore('syncQueue').clear(),
  ]);

  await tx.done;
}
