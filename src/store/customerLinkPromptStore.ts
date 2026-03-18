'use client';

/**
 * Customer Link Prompt Store
 *
 * Manages the state for the post-completion customer linking prompt.
 * When a user completes a task that has no customer linked, the prompt
 * slides up offering to link a customer and queue it for eAgent logging.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CustomerLinkPromptState {
  isOpen: boolean;
  todoId: string | null;
  todoText: string | null;

  // Actions
  show: (todoId: string, todoText: string) => void;
  dismiss: () => void;
}

export const useCustomerLinkPromptStore = create<CustomerLinkPromptState>()(
  devtools(
    (set) => ({
      isOpen: false,
      todoId: null,
      todoText: null,

      show: (todoId: string, todoText: string) => {
        set(
          { isOpen: true, todoId, todoText },
          false,
          'show'
        );
      },

      dismiss: () => {
        set(
          { isOpen: false, todoId: null, todoText: null },
          false,
          'dismiss'
        );
      },
    }),
    { name: 'CustomerLinkPromptStore' }
  )
);
