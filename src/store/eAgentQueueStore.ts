'use client';

/**
 * eAgent Logging Queue Store
 *
 * Persistent queue for customer-linked tasks that have been completed.
 * Agents can review queued items and export them to Allstate's eAgent CRM
 * at their convenience. Uses localStorage so the queue survives page refreshes.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { Todo } from '@/types/todo';

export interface EAgentQueueItem {
  id: string;           // unique queue item id
  todoId: string;       // reference to the original todo
  todo: Todo;           // snapshot of the todo at completion time
  completedBy: string;
  completedAt: string;  // ISO timestamp
  queuedAt: string;     // ISO timestamp
  exported: boolean;    // whether the agent has copied/exported this item
}

interface EAgentQueueState {
  items: EAgentQueueItem[];

  // Actions
  addToQueue: (todo: Todo, completedBy: string) => void;
  markExported: (id: string) => void;
  markAllExported: () => void;
  removeItem: (id: string) => void;
  clearExported: () => void;
  clearAll: () => void;
}

export const useEAgentQueueStore = create<EAgentQueueState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addToQueue: (todo: Todo, completedBy: string) => {
          // Only queue customer-linked tasks
          if (!todo.customer_name && !todo.customer_id) return;

          // Don't queue duplicates (same todoId already in queue)
          const existing = get().items.find((item) => item.todoId === todo.id);
          if (existing) return;

          const now = new Date().toISOString();
          const newItem: EAgentQueueItem = {
            id: crypto.randomUUID(),
            todoId: todo.id,
            todo: { ...todo }, // snapshot
            completedBy,
            completedAt: now,
            queuedAt: now,
            exported: false,
          };

          set(
            (state) => ({ items: [newItem, ...state.items] }),
            false,
            'addToQueue'
          );
        },

        markExported: (id: string) => {
          set(
            (state) => ({
              items: state.items.map((item) =>
                item.id === id ? { ...item, exported: true } : item
              ),
            }),
            false,
            'markExported'
          );
        },

        markAllExported: () => {
          set(
            (state) => ({
              items: state.items.map((item) => ({ ...item, exported: true })),
            }),
            false,
            'markAllExported'
          );
        },

        removeItem: (id: string) => {
          set(
            (state) => ({
              items: state.items.filter((item) => item.id !== id),
            }),
            false,
            'removeItem'
          );
        },

        clearExported: () => {
          set(
            (state) => ({
              items: state.items.filter((item) => !item.exported),
            }),
            false,
            'clearExported'
          );
        },

        clearAll: () => {
          set({ items: [] }, false, 'clearAll');
        },
      }),
      {
        name: 'eagent-queue',
      }
    ),
    { name: 'EAgentQueueStore' }
  )
);

// Selectors — computed values derived from state

export const selectPendingItems = (state: EAgentQueueState): EAgentQueueItem[] =>
  state.items
    .filter((item) => !item.exported)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

export const selectExportedItems = (state: EAgentQueueState): EAgentQueueItem[] =>
  state.items.filter((item) => item.exported);

export const selectPendingCount = (state: EAgentQueueState): number =>
  state.items.filter((item) => !item.exported).length;
