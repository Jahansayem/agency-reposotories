'use client';

import { supabase } from '@/lib/supabaseClient';
import {
  getSyncQueueFromIDB,
  removeFromSyncQueue,
  incrementSyncRetries,
  getTodosFromIDB,
  saveTodosToIDB,
  getMessagesFromIDB,
  saveMessagesToIDB,
  getUsersFromIDB,
  saveUsersToIDB,
  getUnsyncedMessagesFromIDB,
  markMessagesAsSyncedInIDB,
} from './indexedDB';
import type { Todo, ChatMessage as Message } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * Offline Sync Manager
 * Sprint 3 Issue #35: Offline Mode with IndexedDB
 *
 * Handles syncing data between IndexedDB (offline) and Supabase (online)
 * Implements conflict resolution and retry logic
 */

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 5000; // 5 seconds
const FETCH_INTERVAL = 30000; // 30 seconds

/**
 * Singleton state manager for offline sync
 * Ensures thread-safe state access and proper initialization
 */
class SyncStateManager {
  private static instance: SyncStateManager | null = null;
  private _syncIntervalId: NodeJS.Timeout | null = null;
  private _fetchIntervalId: NodeJS.Timeout | null = null;
  private _isSyncing = false;
  private _initialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SyncStateManager {
    if (!SyncStateManager.instance) {
      SyncStateManager.instance = new SyncStateManager();
    }
    return SyncStateManager.instance;
  }

  get syncIntervalId(): NodeJS.Timeout | null {
    return this._syncIntervalId;
  }

  set syncIntervalId(value: NodeJS.Timeout | null) {
    this._syncIntervalId = value;
  }

  get fetchIntervalId(): NodeJS.Timeout | null {
    return this._fetchIntervalId;
  }

  set fetchIntervalId(value: NodeJS.Timeout | null) {
    this._fetchIntervalId = value;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  set isSyncing(value: boolean) {
    this._isSyncing = value;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  markInitialized(): void {
    this._initialized = true;
  }

  reset(): void {
    if (this._syncIntervalId) {
      clearInterval(this._syncIntervalId);
      this._syncIntervalId = null;
    }
    if (this._fetchIntervalId) {
      clearInterval(this._fetchIntervalId);
      this._fetchIntervalId = null;
    }
    this._isSyncing = false;
  }
}

// Get singleton instance for controlled state access
const syncState = SyncStateManager.getInstance();

/**
 * Start periodic sync (when app comes online)
 */
export function startPeriodicSync(): void {
  if (syncState.syncIntervalId) {
    return; // Already running
  }

  logger.debug('Starting periodic sync', { component: 'offlineSync', action: 'startPeriodicSync' });
  syncState.markInitialized();

  // Sync immediately on start
  syncOfflineData();

  // Then sync every 5 seconds
  syncState.syncIntervalId = setInterval(() => {
    syncOfflineData();
  }, SYNC_INTERVAL);

  // Fetch fresh data every 30 seconds
  syncState.fetchIntervalId = setInterval(() => {
    fetchAndCacheData();
  }, FETCH_INTERVAL);
}

/**
 * Stop periodic sync (when app goes offline)
 */
export function stopPeriodicSync(): void {
  syncState.reset();
  logger.debug('Stopped periodic sync', { component: 'offlineSync', action: 'stopPeriodicSync' });
}

/**
 * Sync offline data to Supabase
 * Processes the sync queue and uploads pending changes
 */
export async function syncOfflineData(): Promise<void> {
  if (syncState.isSyncing) {
    return; // Already syncing
  }

  if (!navigator.onLine) {
    logger.debug('Cannot sync: offline', { component: 'offlineSync', action: 'syncOfflineData' });
    return;
  }

  syncState.isSyncing = true;

  try {
    // Get all pending sync operations
    const queue = await getSyncQueueFromIDB();

    if (queue.length === 0) {
      // No pending operations
      return;
    }

    logger.debug(`Syncing ${queue.length} operations`, { component: 'offlineSync', action: 'syncOfflineData' });

    // Process queue items in order (by timestamp)
    for (const item of queue) {
      try {
        await processSyncQueueItem(item);
        // Success - remove from queue
        await removeFromSyncQueue(item.id);
        logger.debug(`Synced ${item.type} ${item.table}`, { component: 'offlineSync', action: 'syncOfflineData', metadata: { itemId: item.id } });
      } catch (error) {
        logger.error(`Failed to sync ${item.type} ${item.table}`, error as Error, { component: 'offlineSync', action: 'syncOfflineData', itemId: item.id, itemType: item.type, itemTable: item.table });

        // Increment retry count
        await incrementSyncRetries(item.id);

        // If max retries reached, remove from queue (log error)
        if (item.retries >= MAX_RETRIES) {
          logger.warn(`Max retries reached for sync item, removing from queue`, { component: 'offlineSync', action: 'syncOfflineData', itemId: item.id });
          await removeFromSyncQueue(item.id);
        }
      }
    }

    // Sync unsynced messages
    await syncUnsyncedMessages();

    logger.debug('Sync complete', { component: 'offlineSync', action: 'syncOfflineData' });
  } catch (error) {
    logger.error('Sync error', error as Error, { component: 'offlineSync', action: 'syncOfflineData' });
  } finally {
    syncState.isSyncing = false;
  }
}

/**
 * Process a single sync queue item
 */
async function processSyncQueueItem(item: {
  type: 'create' | 'update' | 'delete';
  table: 'todos' | 'messages';
  data: any;
}): Promise<void> {
  if (item.table === 'todos') {
    await syncTodoOperation(item);
  } else if (item.table === 'messages') {
    await syncMessageOperation(item);
  }
}

/**
 * Sync a todo operation to Supabase
 */
async function syncTodoOperation(item: {
  type: 'create' | 'update' | 'delete';
  data: Todo;
}): Promise<void> {
  if (item.type === 'create') {
    // Warn if todo is missing agency_id (data isolation risk)
    if (!item.data.agency_id) {
      logger.warn('[offlineSync] Todo missing agency_id - data isolation risk', {
        component: 'offlineSync',
        action: 'syncTodoOperation',
        todoId: item.data.id,
        todoText: item.data.text?.substring(0, 50),
      });
    }
    const { error } = await supabase.from('todos').insert(item.data);
    if (error) throw error;
  } else if (item.type === 'update') {
    const { error } = await supabase
      .from('todos')
      .update(item.data)
      .eq('id', item.data.id);
    if (error) throw error;
  } else if (item.type === 'delete') {
    const { error } = await supabase.from('todos').delete().eq('id', item.data.id);
    if (error) throw error;
  }
}

/**
 * Sync a message operation to Supabase
 */
async function syncMessageOperation(item: {
  type: 'create' | 'update' | 'delete';
  data: Message;
}): Promise<void> {
  if (item.type === 'create') {
    const { error } = await supabase.from('messages').insert(item.data);
    if (error) throw error;
  } else if (item.type === 'update') {
    const { error } = await supabase
      .from('messages')
      .update(item.data)
      .eq('id', item.data.id);
    if (error) throw error;
  } else if (item.type === 'delete') {
    const { error } = await supabase.from('messages').delete().eq('id', item.data.id);
    if (error) throw error;
  }
}

/**
 * Sync unsynced messages (created while offline)
 */
async function syncUnsyncedMessages(): Promise<void> {
  const unsyncedMessages = await getUnsyncedMessagesFromIDB();

  if (unsyncedMessages.length === 0) {
    return;
  }

  logger.debug(`Syncing ${unsyncedMessages.length} unsynced messages`, { component: 'offlineSync', action: 'syncUnsyncedMessages' });

  const syncedIds: string[] = [];

  for (const message of unsyncedMessages) {
    try {
      const { error } = await supabase.from('messages').insert(message);

      if (error) {
        logger.error('Failed to sync message', error, { component: 'offlineSync', action: 'syncUnsyncedMessages', messageId: message.id });
      } else {
        syncedIds.push(message.id);
      }
    } catch (error) {
      logger.error('Failed to sync message', error as Error, { component: 'offlineSync', action: 'syncUnsyncedMessages', messageId: message.id });
    }
  }

  if (syncedIds.length > 0) {
    await markMessagesAsSyncedInIDB(syncedIds);
    logger.debug(`Synced ${syncedIds.length} messages`, { component: 'offlineSync', action: 'syncUnsyncedMessages' });
  }
}

/**
 * Fetch fresh data from Supabase and cache in IndexedDB
 */
export async function fetchAndCacheData(): Promise<void> {
  if (!navigator.onLine) {
    logger.debug('Cannot fetch: offline', { component: 'offlineSync', action: 'fetchAndCacheData' });
    return;
  }

  try {
    // Fetch todos
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (todosError) throw todosError;

    if (todos) {
      await saveTodosToIDB(todos as Todo[]);
      logger.debug(`Cached ${todos.length} todos`, { component: 'offlineSync', action: 'fetchAndCacheData' });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); // Limit to last 500 messages

    if (messagesError) throw messagesError;

    if (messages) {
      await saveMessagesToIDB(messages as Message[]);
      logger.debug(`Cached ${messages.length} messages`, { component: 'offlineSync', action: 'fetchAndCacheData' });
    }

    // Fetch users
    const { data: users, error: usersError } = await supabase.from('users').select('*');

    if (usersError) throw usersError;

    if (users) {
      await saveUsersToIDB(users);
      logger.debug(`Cached ${users.length} users`, { component: 'offlineSync', action: 'fetchAndCacheData' });
    }
  } catch (error) {
    logger.error('Error fetching and caching data', error as Error, { component: 'offlineSync', action: 'fetchAndCacheData' });
  }
}

/**
 * Check if data is available offline
 */
export async function hasOfflineData(): Promise<boolean> {
  const todos = await getTodosFromIDB();
  const messages = await getMessagesFromIDB();
  const users = await getUsersFromIDB();

  return todos.length > 0 || messages.length > 0 || users.length > 0;
}

/**
 * Get offline status summary
 */
export async function getOfflineStatus(): Promise<{
  isOnline: boolean;
  hasCachedData: boolean;
  pendingSyncCount: number;
  unsyncedMessagesCount: number;
}> {
  const queue = await getSyncQueueFromIDB();
  const unsyncedMessages = await getUnsyncedMessagesFromIDB();
  const hasCached = await hasOfflineData();

  return {
    isOnline: navigator.onLine,
    hasCachedData: hasCached,
    pendingSyncCount: queue.length,
    unsyncedMessagesCount: unsyncedMessages.length,
  };
}

/**
 * Force sync now (manual sync trigger)
 */
export async function forceSyncNow(): Promise<void> {
  logger.debug('Force syncing', { component: 'offlineSync', action: 'forceSyncNow' });

  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }

  // Fetch fresh data first
  await fetchAndCacheData();

  // Then sync offline changes
  await syncOfflineData();
}
