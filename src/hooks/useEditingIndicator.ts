'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/types/todo';

/**
 * useEditingIndicator Hook
 * Sprint 3 Issue #40: Collaborative Editing Indicators
 *
 * Tracks which users are currently editing which tasks/fields.
 * Shows real-time editing indicators to prevent conflicts.
 *
 * Usage:
 * ```tsx
 * const { setEditing, getEditingUsers, isUserEditing } = useEditingIndicator(currentUser);
 * ```
 */

interface EditingState {
  user: string;
  userId: string;
  color: string;
  task_id: string;
  field?: string; // Which field being edited (optional)
  started_at: string;
}

interface UseEditingIndicatorOptions {
  /**
   * Auto-clear editing status after this many ms of inactivity
   * Default: 30000 (30 seconds)
   */
  timeoutMs?: number;
}

export function useEditingIndicator(
  currentUser?: User,
  options: UseEditingIndicatorOptions = {}
) {
  const { timeoutMs = 30000 } = options;

  const [editingStates, setEditingStates] = useState<Map<string, EditingState[]>>(new Map());

  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const currentEditingRef = useRef<{ task_id: string; field?: string } | null>(null);

  /**
   * Broadcast editing status
   */
  const broadcastEditing = useCallback(
    async (task_id: string, field: string | undefined, editing: boolean) => {
      if (!currentUser || !channelRef.current) return;

      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'task_editing',
          payload: {
            user: currentUser.name,
            userId: currentUser.id,
            color: currentUser.color,
            task_id,
            field,
            editing,
            started_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to broadcast editing status:', error);
      }
    },
    [currentUser]
  );

  /**
   * Set editing status for a task/field
   * Call with editing=true when user starts editing
   * Call with editing=false when user stops editing
   */
  const setEditing = useCallback(
    (task_id: string, field?: string, editing: boolean = true) => {
      if (!currentUser) return;

      // Clear previous activity timer
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }

      if (editing) {
        // Start editing
        currentEditingRef.current = { task_id, field };
        broadcastEditing(task_id, field, true);

        // Auto-clear after timeout
        activityTimerRef.current = setTimeout(() => {
          setEditing(task_id, field, false);
        }, timeoutMs);
      } else {
        // Stop editing
        currentEditingRef.current = null;
        broadcastEditing(task_id, field, false);
      }
    },
    [currentUser, broadcastEditing, timeoutMs]
  );

  /**
   * Heartbeat to keep editing status alive
   * Call this periodically while user is still editing
   */
  const keepAlive = useCallback(() => {
    if (currentEditingRef.current) {
      const { task_id, field } = currentEditingRef.current;
      broadcastEditing(task_id, field, true);

      // Reset auto-clear timer
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }

      activityTimerRef.current = setTimeout(() => {
        if (currentEditingRef.current) {
          setEditing(currentEditingRef.current.task_id, currentEditingRef.current.field, false);
        }
      }, timeoutMs);
    }
  }, [broadcastEditing, setEditing, timeoutMs]);

  /**
   * Get users currently editing a task
   */
  const getEditingUsers = useCallback(
    (task_id: string, field?: string): EditingState[] => {
      const taskEditors = editingStates.get(task_id) || [];

      if (field) {
        // Filter to specific field
        return taskEditors.filter((e) => e.field === field && e.userId !== currentUser?.id);
      }

      // All editors for this task (excluding current user)
      return taskEditors.filter((e) => e.userId !== currentUser?.id);
    },
    [editingStates, currentUser]
  );

  /**
   * Check if a specific user is editing a task
   */
  const isUserEditing = useCallback(
    (task_id: string, userName: string, field?: string): boolean => {
      const editors = getEditingUsers(task_id, field);
      return editors.some((e) => e.user === userName);
    },
    [getEditingUsers]
  );

  /**
   * Get count of users editing a task
   */
  const getEditingCount = useCallback(
    (task_id: string, field?: string): number => {
      return getEditingUsers(task_id, field).length;
    },
    [getEditingUsers]
  );

  /**
   * Setup Realtime channel for editing indicators
   */
  useEffect(() => {
    if (!currentUser) return;

    const editingChannel = supabase.channel('task-editing');

    editingChannel
      .on('broadcast', { event: 'task_editing' }, (payload: { payload: EditingState & { editing: boolean } }) => {
        const { user, userId, color, task_id, field, editing, started_at } = payload.payload;

        // Ignore own broadcasts
        if (userId === currentUser.id) return;

        setEditingStates((prev) => {
          const newMap = new Map(prev);
          const taskEditors = newMap.get(task_id) || [];

          if (editing) {
            // Add or update editor
            const existingIndex = taskEditors.findIndex(
              (e) => e.userId === userId && e.field === field
            );

            if (existingIndex >= 0) {
              // Update timestamp
              taskEditors[existingIndex] = {
                user,
                userId,
                color,
                task_id,
                field,
                started_at,
              };
            } else {
              // Add new editor
              taskEditors.push({
                user,
                userId,
                color,
                task_id,
                field,
                started_at,
              });
            }
          } else {
            // Remove editor
            const filtered = taskEditors.filter(
              (e) => !(e.userId === userId && e.field === field)
            );
            newMap.set(task_id, filtered);
            return newMap;
          }

          newMap.set(task_id, taskEditors);
          return newMap;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✏️ Subscribed to collaborative editing indicators');
        }
      });

    channelRef.current = editingChannel;

    // Cleanup stale editing states (users who disconnected without stopping)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setEditingStates((prev) => {
        const newMap = new Map(prev);
        let changed = false;

        newMap.forEach((editors, task_id) => {
          const filtered = editors.filter((e) => {
            const age = now - new Date(e.started_at).getTime();
            return age < timeoutMs + 5000; // 5s grace period
          });

          if (filtered.length !== editors.length) {
            changed = true;
            newMap.set(task_id, filtered);
          }
        });

        return changed ? newMap : prev;
      });
    }, 5000); // Cleanup every 5 seconds

    return () => {
      // Stop editing on unmount
      if (currentEditingRef.current) {
        const { task_id, field } = currentEditingRef.current;
        broadcastEditing(task_id, field, false);
      }

      // Clear timers
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }

      clearInterval(cleanupInterval);

      // Unsubscribe from channel
      supabase.removeChannel(editingChannel);
      channelRef.current = null;
    };
  }, [currentUser, timeoutMs, broadcastEditing]);

  return {
    /**
     * Set editing status for a task/field
     * Call with editing=true when starting to edit
     * Call with editing=false when done editing
     */
    setEditing,

    /**
     * Keep editing status alive (call periodically while editing)
     */
    keepAlive,

    /**
     * Get users currently editing a task (excluding current user)
     */
    getEditingUsers,

    /**
     * Check if a specific user is editing a task
     */
    isUserEditing,

    /**
     * Get count of users editing a task
     */
    getEditingCount,

    /**
     * All editing states (Map of task_id -> EditingState[])
     */
    editingStates,
  };
}
