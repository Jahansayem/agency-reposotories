'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  initDB,
  getTodosFromIDB,
  saveTodoToIDB,
  deleteTodoFromIDB,
  getMessagesFromIDB,
  saveMessageToIDB,
  addToSyncQueue,
} from '@/lib/db/indexedDB';
import {
  startPeriodicSync,
  stopPeriodicSync,
  fetchAndCacheData,
  forceSyncNow,
  getOfflineStatus,
} from '@/lib/db/offlineSync';
import type { Todo, ChatMessage as Message } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * useOfflineSupport Hook
 * Sprint 3 Issue #35: Offline Mode with IndexedDB
 *
 * Provides offline data access and sync functionality
 * Automatically switches between online/offline modes
 *
 * Usage:
 * ```tsx
 * const { isOnline, todos, messages, createTodo, updateTodo, deleteTodo } = useOfflineSupport();
 * ```
 */

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [syncStatus, setSyncStatus] = useState({
    pendingSyncCount: 0,
    unsyncedMessagesCount: 0,
  });

  // Initialize IndexedDB
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await initDB();

        if (mounted) {
          setIsInitialized(true);
          logger.debug('IndexedDB initialized', { component: 'useOfflineSupport', action: 'initialize' });

          // Load cached data
          const cachedTodos = await getTodosFromIDB();
          const cachedMessages = await getMessagesFromIDB();

          setTodos(cachedTodos);
          setMessages(cachedMessages);

          // If online, fetch fresh data
          if (navigator.onLine) {
            await fetchAndCacheData();
            // Reload after fetching
            setTodos(await getTodosFromIDB());
            setMessages(await getMessagesFromIDB());
          }
        }
      } catch (error) {
        logger.error('Failed to initialize IndexedDB', error as Error, { component: 'useOfflineSupport', action: 'initialize' });
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      logger.debug('App is online', { component: 'useOfflineSupport', action: 'handleOnline' });
      setIsOnline(true);

      // Start syncing
      startPeriodicSync();

      // Fetch fresh data
      try {
        await fetchAndCacheData();
        // Reload data
        setTodos(await getTodosFromIDB());
        setMessages(await getMessagesFromIDB());
      } catch (error) {
        logger.error('Failed to fetch data after coming online', error as Error, { component: 'useOfflineSupport', action: 'handleOnline' });
      }

      // Update sync status
      updateSyncStatus();
    };

    const handleOffline = () => {
      logger.debug('App is offline', { component: 'useOfflineSupport', action: 'handleOffline' });
      setIsOnline(false);

      // Stop syncing
      stopPeriodicSync();
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start syncing if online
    if (navigator.onLine) {
      startPeriodicSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopPeriodicSync();
    };
  }, []);

  // Update sync status periodically
  const updateSyncStatus = useCallback(async () => {
    const status = await getOfflineStatus();
    setSyncStatus({
      pendingSyncCount: status.pendingSyncCount,
      unsyncedMessagesCount: status.unsyncedMessagesCount,
    });
  }, []);

  // Update sync status every 5 seconds
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // ============================================================================
  // TODO OPERATIONS (Offline-First)
  // ============================================================================

  /**
   * Create a todo (works offline)
   */
  const createTodo = useCallback(
    async (todo: Todo) => {
      // Save to IndexedDB immediately
      await saveTodoToIDB(todo);
      setTodos((prev) => [todo, ...prev]);

      // Queue for sync
      if (!isOnline) {
        await addToSyncQueue('create', 'todos', todo);
      }

      updateSyncStatus();
    },
    [isOnline, updateSyncStatus]
  );

  /**
   * Update a todo (works offline)
   */
  const updateTodo = useCallback(
    async (todo: Todo) => {
      // Save to IndexedDB immediately
      await saveTodoToIDB(todo);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));

      // Queue for sync
      if (!isOnline) {
        await addToSyncQueue('update', 'todos', todo);
      }

      updateSyncStatus();
    },
    [isOnline, updateSyncStatus]
  );

  /**
   * Delete a todo (works offline)
   */
  const deleteTodo = useCallback(
    async (todoId: string) => {
      // Delete from IndexedDB immediately
      await deleteTodoFromIDB(todoId);
      setTodos((prev) => prev.filter((t) => t.id !== todoId));

      // Queue for sync
      if (!isOnline) {
        await addToSyncQueue('delete', 'todos', { id: todoId });
      }

      updateSyncStatus();
    },
    [isOnline, updateSyncStatus]
  );

  // ============================================================================
  // MESSAGE OPERATIONS (Offline-First)
  // ============================================================================

  /**
   * Create a message (works offline)
   */
  const createMessage = useCallback(
    async (message: Message) => {
      // Save to IndexedDB immediately (mark as unsynced if offline)
      await saveMessageToIDB(message, isOnline);
      setMessages((prev) => [message, ...prev]);

      // Queue for sync if offline
      if (!isOnline) {
        await addToSyncQueue('create', 'messages', message);
      }

      updateSyncStatus();
    },
    [isOnline, updateSyncStatus]
  );

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    try {
      await forceSyncNow();

      // Reload data after sync
      setTodos(await getTodosFromIDB());
      setMessages(await getMessagesFromIDB());

      updateSyncStatus();
    } catch (error) {
      logger.error('Failed to sync', error as Error, { component: 'useOfflineSupport', action: 'syncNow' });
      throw error;
    }
  }, [isOnline, updateSyncStatus]);

  return {
    // Status
    isOnline,
    isInitialized,
    syncStatus,

    // Data
    todos,
    messages,

    // Operations
    createTodo,
    updateTodo,
    deleteTodo,
    createMessage,
    syncNow,
  };
}
