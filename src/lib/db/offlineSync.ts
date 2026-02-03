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

let syncIntervalId: NodeJS.Timeout | null = null;
let fetchIntervalId: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Start periodic sync (when app comes online)
 */
export function startPeriodicSync(): void {
  if (syncIntervalId) {
    return; // Already running
  }

  console.log('Starting periodic sync...');

  // Sync immediately on start
  syncOfflineData();

  // Then sync every 5 seconds
  syncIntervalId = setInterval(() => {
    syncOfflineData();
  }, SYNC_INTERVAL);

  // Fetch fresh data every 30 seconds
  fetchIntervalId = setInterval(() => {
    fetchAndCacheData();
  }, FETCH_INTERVAL);
}

/**
 * Stop periodic sync (when app goes offline)
 */
export function stopPeriodicSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (fetchIntervalId) {
    clearInterval(fetchIntervalId);
    fetchIntervalId = null;
  }

  console.log('Stopped periodic sync');
}

/**
 * Sync offline data to Supabase
 * Processes the sync queue and uploads pending changes
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) {
    return; // Already syncing
  }

  if (!navigator.onLine) {
    console.log('Cannot sync: offline');
    return;
  }

  isSyncing = true;

  try {
    // Get all pending sync operations
    const queue = await getSyncQueueFromIDB();

    if (queue.length === 0) {
      // No pending operations
      return;
    }

    console.log(`Syncing ${queue.length} operations...`);

    // Process queue items in order (by timestamp)
    for (const item of queue) {
      try {
        await processSyncQueueItem(item);
        // Success - remove from queue
        await removeFromSyncQueue(item.id);
        console.log(`✓ Synced ${item.type} ${item.table}:`, item.id);
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

    console.log('Sync complete');
  } catch (error) {
    logger.error('Sync error', error as Error, { component: 'offlineSync', action: 'syncOfflineData' });
  } finally {
    isSyncing = false;
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

  console.log(`Syncing ${unsyncedMessages.length} unsynced messages...`);

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
    console.log(`Synced ${syncedIds.length} messages`);
  }
}

/**
 * Fetch fresh data from Supabase and cache in IndexedDB
 */
export async function fetchAndCacheData(): Promise<void> {
  if (!navigator.onLine) {
    console.log('Cannot fetch: offline');
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
      console.log(`Cached ${todos.length} todos`);
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
      console.log(`Cached ${messages.length} messages`);
    }

    // Fetch users
    const { data: users, error: usersError } = await supabase.from('users').select('*');

    if (usersError) throw usersError;

    if (users) {
      await saveUsersToIDB(users);
      console.log(`Cached ${users.length} users`);
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
  console.log('Force syncing...');

  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }

  // Fetch fresh data first
  await fetchAndCacheData();

  // Then sync offline changes
  await syncOfflineData();
}
