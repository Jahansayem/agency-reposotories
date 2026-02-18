'use client';

/**
 * Customer Link Prompt
 *
 * A non-blocking slide-up prompt that appears when a user completes a task
 * without a linked customer. Offers to link a customer and queue the task
 * for eAgent logging. Auto-dismisses after 15 seconds if no interaction.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, SkipForward } from 'lucide-react';
import { useCustomerLinkPromptStore } from '@/store/customerLinkPromptStore';
import { useTodoStore } from '@/store/todoStore';
import { useEAgentQueueStore } from '@/store/eAgentQueueStore';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import { CustomerSearchInput } from './CustomerSearchInput';
import type { LinkedCustomer } from '@/types/customer';

interface CustomerLinkPromptProps {
  /** The current user name, needed for eAgent queue logging */
  userName: string;
}

export function CustomerLinkPrompt({ userName }: CustomerLinkPromptProps) {
  const { isOpen, todoId, todoText, dismiss } = useCustomerLinkPromptStore();
  const { currentAgencyId } = useAgency();
  const [selectedCustomer, setSelectedCustomer] = useState<LinkedCustomer | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  // Reset state when prompt opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setIsLinking(false);
      interactedRef.current = false;
    }
  }, [isOpen]);

  // Auto-dismiss after 15 seconds if no interaction
  useEffect(() => {
    if (!isOpen) return;

    autoDismissTimerRef.current = setTimeout(() => {
      if (!interactedRef.current) {
        dismiss();
      }
    }, 15_000);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [isOpen, dismiss]);

  // Mark as interacted when user engages with the prompt
  const markInteracted = useCallback(() => {
    interactedRef.current = true;
    // Clear auto-dismiss timer once user interacts
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const handleCustomerChange = useCallback((customer: LinkedCustomer | null) => {
    markInteracted();
    setSelectedCustomer(customer);
  }, [markInteracted]);

  const handleSkip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleLinkAndLog = useCallback(async () => {
    if (!selectedCustomer || !todoId) return;

    markInteracted();
    setIsLinking(true);

    const updates = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_segment: selectedCustomer.segment,
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Update local Zustand store optimistically
      useTodoStore.getState().updateTodo(todoId, updates);

      // 2. Persist to Supabase
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('todos')
          .update(updates)
          .eq('id', todoId);
        if (error) throw error;
      });

      // 3. Queue for eAgent now that it has a customer
      const updatedTodo = useTodoStore.getState().todos.find((t) => t.id === todoId);
      if (updatedTodo) {
        const { addToQueue } = useEAgentQueueStore.getState();
        addToQueue(updatedTodo, userName);
      }

      dismiss();
    } catch (error) {
      logger.error('Failed to link customer to completed task', error, {
        component: 'CustomerLinkPrompt',
        metadata: { todoId, customerId: selectedCustomer.id },
      });

      // Rollback optimistic update
      useTodoStore.getState().updateTodo(todoId, {
        customer_id: undefined,
        customer_name: undefined,
        customer_segment: undefined,
      });

      setIsLinking(false);
    }
  }, [selectedCustomer, todoId, userName, dismiss, markInteracted]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="
            fixed bottom-4 left-1/2 -translate-x-1/2 z-50
            w-[calc(100%-2rem)] max-w-md
            bg-[var(--surface)] border border-[var(--border)]
            rounded-xl shadow-2xl
            overflow-visible
          "
          role="dialog"
          aria-label="Link customer to completed task"
          onClick={markInteracted}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <UserPlus className="w-4 h-4 text-[var(--accent)]" />
              <span>Link a customer?</span>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="p-1 text-[var(--text-light)] hover:text-[var(--foreground)] transition-colors rounded"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Task text */}
          <div className="px-4 pb-2">
            <p className="text-xs text-[var(--text-muted)] truncate" title={todoText || ''}>
              {todoText}
            </p>
          </div>

          {/* Customer search */}
          <div className="px-4 pb-3">
            <CustomerSearchInput
              value={selectedCustomer}
              onChange={handleCustomerChange}
              placeholder="Search customers to link..."
              agencyId={currentAgencyId || undefined}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              type="button"
              onClick={handleSkip}
              className="
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-1.5 text-sm font-medium
                text-[var(--text-muted)]
                bg-[var(--surface-2)] hover:bg-[var(--border)]
                rounded-lg transition-colors
              "
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
            <button
              type="button"
              onClick={handleLinkAndLog}
              disabled={!selectedCustomer || isLinking}
              className="
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-1.5 text-sm font-medium
                text-white
                bg-[var(--accent)] hover:opacity-90
                disabled:opacity-40 disabled:cursor-not-allowed
                rounded-lg transition-colors
              "
            >
              {isLinking ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              {isLinking ? 'Linking...' : 'Link & Log'}
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          {isOpen && !interactedRef.current && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border)] rounded-b-xl overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 15, ease: 'linear' }}
                className="h-full bg-[var(--accent)] opacity-40"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CustomerLinkPrompt;
