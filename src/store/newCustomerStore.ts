'use client';

/**
 * New Customer Store
 *
 * Persistent store for tracking customers created via the quick-add form
 * in CustomerSearchInput. The eAgent panel can read this store to show
 * "New Customers to Import" so agents can sync them to Allstate's eAgent CRM.
 *
 * Uses localStorage via Zustand persist middleware (same pattern as eAgentQueueStore).
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface NewCustomerItem {
  id: string;
  name: string;
  phone?: string;
  policyType?: string;
  createdAt: string;
  importedToEAgent: boolean;
}

interface NewCustomerState {
  items: NewCustomerItem[];

  // Actions
  addCustomer: (customer: Omit<NewCustomerItem, 'createdAt' | 'importedToEAgent'>) => void;
  markImported: (id: string) => void;
  markAllImported: () => void;
  removeItem: (id: string) => void;
  clearImported: () => void;
  clearAll: () => void;
}

export const useNewCustomerStore = create<NewCustomerState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addCustomer: (customer) => {
          // Don't add duplicates (same id already in store)
          const existing = get().items.find((item) => item.id === customer.id);
          if (existing) return;

          const newItem: NewCustomerItem = {
            ...customer,
            createdAt: new Date().toISOString(),
            importedToEAgent: false,
          };

          set(
            (state) => ({ items: [newItem, ...state.items] }),
            false,
            'addCustomer'
          );
        },

        markImported: (id: string) => {
          set(
            (state) => ({
              items: state.items.map((item) =>
                item.id === id ? { ...item, importedToEAgent: true } : item
              ),
            }),
            false,
            'markImported'
          );
        },

        markAllImported: () => {
          set(
            (state) => ({
              items: state.items.map((item) => ({ ...item, importedToEAgent: true })),
            }),
            false,
            'markAllImported'
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

        clearImported: () => {
          set(
            (state) => ({
              items: state.items.filter((item) => !item.importedToEAgent),
            }),
            false,
            'clearImported'
          );
        },

        clearAll: () => {
          set({ items: [] }, false, 'clearAll');
        },
      }),
      {
        name: 'new-customers',
      }
    ),
    { name: 'NewCustomerStore' }
  )
);

// Selectors

export const selectPendingImports = (state: NewCustomerState): NewCustomerItem[] =>
  state.items
    .filter((item) => !item.importedToEAgent)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const selectImportedItems = (state: NewCustomerState): NewCustomerItem[] =>
  state.items.filter((item) => item.importedToEAgent);

export const selectPendingImportCount = (state: NewCustomerState): number =>
  state.items.filter((item) => !item.importedToEAgent).length;
