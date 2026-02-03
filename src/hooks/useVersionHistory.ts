'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Todo } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * useVersionHistory Hook
 * Sprint 3 Issue #41: Version History
 *
 * Manages version history for todos - viewing past versions and restoring them.
 *
 * Usage:
 * ```tsx
 * const { versions, loading, loadVersions, restoreVersion } = useVersionHistory(todoId);
 * ```
 */

export interface TodoVersion {
  id: string;
  todo_id: string;
  version_number: number;

  // Todo snapshot at this version
  text: string;
  completed: boolean;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  notes: string | null;
  subtasks: any[];
  recurrence: string | null;

  // Change metadata
  changed_by: string;
  changed_at: string;
  change_type: 'created' | 'updated' | 'restored';
  change_summary: string | null;

  created_at: string;
}

export function useVersionHistory(todoId?: string) {
  const [versions, setVersions] = useState<TodoVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all versions for a todo
   */
  const loadVersions = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('todo_versions')
        .select('*')
        .eq('todo_id', id)
        .order('version_number', { ascending: false });

      if (fetchError) throw fetchError;

      setVersions(data || []);
    } catch (err) {
      logger.error('Failed to load version history', err as Error, { component: 'useVersionHistory', action: 'loadVersions', todoId: id });
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restore a specific version
   * Creates a new version with change_type='restored'
   */
  const restoreVersion = useCallback(async (
    versionId: string,
    currentUser: string
  ): Promise<boolean> => {
    try {
      // Get the version to restore
      const { data: version, error: versionError } = await supabase
        .from('todo_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError || !version) {
        throw new Error('Version not found');
      }

      // Update the todo with the old version's data
      const { error: updateError } = await supabase
        .from('todos')
        .update({
          text: version.text,
          completed: version.completed,
          status: version.status,
          priority: version.priority,
          assigned_to: version.assigned_to,
          due_date: version.due_date,
          notes: version.notes,
          subtasks: version.subtasks,
          recurrence: version.recurrence,
          updated_by: currentUser,
          updated_at: new Date().toISOString(),
        })
        .eq('id', version.todo_id);

      if (updateError) throw updateError;

      // The trigger will automatically create a new version
      // But we want to mark it as 'restored' instead of 'updated'
      // So we'll update the latest version's change_type
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger

      const { data: latestVersion } = await supabase
        .from('todo_versions')
        .select('id')
        .eq('todo_id', version.todo_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (latestVersion) {
        await supabase
          .from('todo_versions')
          .update({
            change_type: 'restored',
            change_summary: `Restored to version ${version.version_number} by ${currentUser}`,
          })
          .eq('id', latestVersion.id);
      }

      // Reload versions
      await loadVersions(version.todo_id);

      return true;
    } catch (err) {
      logger.error('Failed to restore version', err as Error, { component: 'useVersionHistory', action: 'restoreVersion', versionId });
      setError(err instanceof Error ? err.message : 'Failed to restore version');
      return false;
    }
  }, [loadVersions]);

  /**
   * Get differences between two versions
   */
  const getVersionDiff = useCallback((
    version1: TodoVersion,
    version2: TodoVersion
  ): {
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
    changed: boolean;
  }[] => {
    const fields = [
      { key: 'text', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assigned_to', label: 'Assigned To' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'completed', label: 'Completed' },
      { key: 'notes', label: 'Notes' },
      { key: 'subtasks', label: 'Subtasks' },
      { key: 'recurrence', label: 'Recurrence' },
    ];

    return fields.map(({ key, label }) => {
      const oldValue = (version1 as any)[key];
      const newValue = (version2 as any)[key];

      let changed = false;
      if (key === 'subtasks') {
        changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      } else {
        changed = oldValue !== newValue;
      }

      return {
        field: key,
        label,
        oldValue,
        newValue,
        changed,
      };
    });
  }, []);

  /**
   * Auto-load versions when todoId changes
   */
  useEffect(() => {
    if (todoId) {
      loadVersions(todoId);
    } else {
      setVersions([]);
    }
  }, [todoId, loadVersions]);

  return {
    /**
     * List of versions (newest first)
     */
    versions,

    /**
     * Loading state
     */
    loading,

    /**
     * Error message (if any)
     */
    error,

    /**
     * Load versions for a todo
     */
    loadVersions,

    /**
     * Restore a specific version
     * Returns true if successful
     */
    restoreVersion,

    /**
     * Get differences between two versions
     */
    getVersionDiff,
  };
}
