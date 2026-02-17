'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Copy,
  Check,
  X,
  ChevronDown,
  Phone,
  FileText,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEAgentQueueStore } from '@/store/eAgentQueueStore';
import {
  generateEAgentNote,
  generateTranscriptionOnly,
  copyToClipboard,
} from '@/lib/summaryGenerator';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { prefersReducedMotion } from '@/lib/animations';

// ============================================
// Types
// ============================================

interface EAgentExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Track copy state per item, plus a "copyAll" key
type CopyStates = Record<string, 'idle' | 'copied'>;

// Success auto-clear timeout (2 seconds)
const COPY_FEEDBACK_TIMEOUT = 2000;

// ============================================
// Component
// ============================================

export function EAgentExportPanel({ isOpen, onClose }: EAgentExportPanelProps) {
  const [copyStates, setCopyStates] = useState<CopyStates>({});
  const [exportedExpanded, setExportedExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reducedMotion = prefersReducedMotion();

  // Store
  const items = useEAgentQueueStore((s) => s.items);
  const markExported = useEAgentQueueStore((s) => s.markExported);
  const markAllExported = useEAgentQueueStore((s) => s.markAllExported);
  const removeItem = useEAgentQueueStore((s) => s.removeItem);
  const clearExported = useEAgentQueueStore((s) => s.clearExported);

  // Derived lists
  const pendingItems = useMemo(() => items.filter((i) => !i.exported), [items]);
  const exportedItems = useMemo(() => items.filter((i) => i.exported), [items]);
  const pendingCount = pendingItems.length;
  const exportedCount = exportedItems.length;

  // Focus trap
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    onEscape: onClose,
    autoFocus: true,
    enabled: isOpen,
  });

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Clean up all timeouts on unmount
  useEffect(() => {
    const refs = timeoutRefs.current;
    return () => {
      refs.forEach((t) => clearTimeout(t));
      refs.clear();
    };
  }, []);

  // ============================================
  // Copy helpers
  // ============================================

  const setCopiedState = useCallback((key: string) => {
    // Clear existing timeout for this key
    const existing = timeoutRefs.current.get(key);
    if (existing) clearTimeout(existing);

    setCopyStates((prev) => ({ ...prev, [key]: 'copied' }));

    const timeout = setTimeout(() => {
      setCopyStates((prev) => ({ ...prev, [key]: 'idle' }));
      timeoutRefs.current.delete(key);
    }, COPY_FEEDBACK_TIMEOUT);

    timeoutRefs.current.set(key, timeout);
  }, []);

  const handleCopyItem = useCallback(
    async (itemId: string, text: string) => {
      try {
        const success = await copyToClipboard(text);
        if (success) {
          setCopiedState(itemId);
          setStatusMessage('Copied to clipboard');
        }
      } catch {
        setStatusMessage('Failed to copy to clipboard');
      }
    },
    [setCopiedState]
  );

  const handleCopyAll = useCallback(async () => {
    if (pendingItems.length === 0) return;

    const allNotes = pendingItems
      .map((item) => generateEAgentNote(item.todo, item.completedBy))
      .join('\n\n---\n\n');

    try {
      const success = await copyToClipboard(allNotes);
      if (success) {
        setCopiedState('copyAll');
        setStatusMessage(`Copied ${pendingItems.length} items to clipboard`);
      }
    } catch {
      setStatusMessage('Failed to copy to clipboard');
    }
  }, [pendingItems, setCopiedState]);

  const handleCopyTranscription = useCallback(
    async (itemId: string, text: string) => {
      const key = `transcription-${itemId}`;
      try {
        const success = await copyToClipboard(text);
        if (success) {
          setCopiedState(key);
          setStatusMessage('Call notes copied');
        }
      } catch {
        setStatusMessage('Failed to copy call notes');
      }
    },
    [setCopiedState]
  );

  const handleMarkDone = useCallback(
    (id: string) => {
      markExported(id);
    },
    [markExported]
  );

  const handleMarkAllDone = useCallback(() => {
    markAllExported();
  }, [markAllExported]);

  // ============================================
  // Render helpers
  // ============================================

  const getCopyState = (key: string): 'idle' | 'copied' => {
    return copyStates[key] || 'idle';
  };

  // ============================================
  // Panel animation variants
  // ============================================

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const panelVariants = {
    hidden: { x: '100%' },
    visible: { x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 0.5 } : backdropVariants.hidden}
            animate={backdropVariants.visible}
            exit={backdropVariants.hidden}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <motion.div
            ref={containerRef}
            initial={reducedMotion ? { x: 0 } : panelVariants.hidden}
            animate={panelVariants.visible}
            exit={panelVariants.hidden}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              duration: reducedMotion ? 0.1 : undefined,
            }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[var(--surface)] shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eagent-panel-title"
            aria-describedby="eagent-panel-description"
          >
            {/* Live region for screen reader announcements */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {statusMessage}
            </div>

            {/* ──────────────────────────────────────────
                Header
                ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="eagent-panel-title"
                    className="text-lg font-semibold text-[var(--foreground)]"
                  >
                    Log to eAgent
                  </h2>
                  <p
                    id="eagent-panel-description"
                    className="text-sm text-[var(--text-muted)]"
                  >
                    {pendingCount === 0
                      ? 'No tasks to log'
                      : `${pendingCount} ${pendingCount === 1 ? 'task' : 'tasks'} to log`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-lg)] hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                aria-label="Close eAgent export panel"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" aria-hidden="true" />
              </button>
            </div>

            {/* ──────────────────────────────────────────
                Scrollable content
                ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {/* Empty state */}
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-[var(--text-muted)]" aria-hidden="true" />
                  </div>
                  <p className="text-base font-medium text-[var(--foreground)] mb-1">
                    No tasks to log
                  </p>
                  <p className="text-sm text-[var(--text-muted)] max-w-xs">
                    Customer-linked tasks will appear here when completed
                  </p>
                </div>
              )}

              {/* ──────────────────────────────────────
                  Pending items section
                  ────────────────────────────────────── */}
              {pendingItems.length > 0 && (
                <div className="px-5 py-4">
                  {/* Section header with Copy All */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]">
                      Pending ({pendingCount})
                    </h3>
                    <div className="flex items-center gap-2">
                      {pendingItems.length > 1 && (
                        <>
                          <button
                            onClick={handleCopyAll}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-lg)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] ${
                              getCopyState('copyAll') === 'copied'
                                ? 'bg-[var(--success)] text-white'
                                : 'bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]'
                            }`}
                            aria-label="Copy all pending items to clipboard"
                          >
                            {getCopyState('copyAll') === 'copied' ? (
                              <>
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                Copy All
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleMarkAllDone}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                            aria-label="Mark all pending items as logged"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            Done All
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Item cards */}
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {pendingItems.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 50 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                          className="bg-[var(--surface-2)] rounded-[var(--radius-xl)] p-4 border border-[var(--border)]"
                        >
                          {/* Customer name and time */}
                          <div className="flex items-start justify-between mb-1.5">
                            <p className="text-base font-semibold text-[var(--foreground)] leading-tight">
                              {item.todo.customer_name || 'Unknown Customer'}
                            </p>
                            <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Task text */}
                          <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">
                            {item.todo.text}
                          </p>

                          {/* Badges */}
                          {item.todo.transcription && (
                            <div className="mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                                <Phone className="w-3 h-3" aria-hidden="true" />
                                Call notes
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Copy eAgent note */}
                            <button
                              onClick={() =>
                                handleCopyItem(
                                  item.id,
                                  generateEAgentNote(item.todo, item.completedBy)
                                )
                              }
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-lg)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface-2)] ${
                                getCopyState(item.id) === 'copied'
                                  ? 'bg-[var(--success)] text-white'
                                  : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                              }`}
                              aria-label={`Copy eAgent note for ${item.todo.customer_name || 'task'}`}
                            >
                              {getCopyState(item.id) === 'copied' ? (
                                <>
                                  <Check className="w-4 h-4" aria-hidden="true" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>

                            {/* Mark as logged */}
                            <button
                              onClick={() => handleMarkDone(item.id)}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-lg)] bg-[var(--surface-3)] text-[var(--foreground)] hover:bg-[var(--success)]/10 hover:text-[var(--success)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface-2)]"
                              aria-label={`Mark ${item.todo.customer_name || 'task'} as logged in eAgent`}
                            >
                              <Check className="w-4 h-4" aria-hidden="true" />
                              Done
                            </button>
                          </div>

                          {/* Copy transcription only link */}
                          {item.todo.transcription && (
                            <button
                              onClick={() =>
                                handleCopyTranscription(
                                  item.id,
                                  generateTranscriptionOnly(item.todo)
                                )
                              }
                              className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors focus:outline-none focus:underline ${
                                getCopyState(`transcription-${item.id}`) === 'copied'
                                  ? 'text-[var(--success)]'
                                  : 'text-[var(--accent)] hover:text-[var(--accent)]/80'
                              }`}
                              aria-label={`Copy call notes only for ${item.todo.customer_name || 'task'}`}
                            >
                              {getCopyState(`transcription-${item.id}`) === 'copied' ? (
                                <>
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  Call notes copied
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3" aria-hidden="true" />
                                  Copy call notes only
                                </>
                              )}
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────
                  Exported items section (collapsible)
                  ────────────────────────────────────── */}
              {exportedItems.length > 0 && (
                <div className="px-5 py-4 border-t border-[var(--border)]">
                  {/* Collapsible header */}
                  <button
                    onClick={() => setExportedExpanded(!exportedExpanded)}
                    className="w-full flex items-center justify-between py-1 text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-[var(--radius-lg)]"
                    aria-expanded={exportedExpanded}
                    aria-controls="exported-items-section"
                  >
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]">
                      Already logged ({exportedCount})
                    </h3>
                    <motion.div
                      animate={{ rotate: exportedExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                    </motion.div>
                  </button>

                  {/* Collapsible content */}
                  <AnimatePresence>
                    {exportedExpanded && (
                      <motion.div
                        id="exported-items-section"
                        initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {/* Clear all logged button */}
                        <div className="flex justify-end mt-3 mb-3">
                          <button
                            onClick={clearExported}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-lg)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                            aria-label="Remove all logged items from the list"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Clear all logged
                          </button>
                        </div>

                        {/* Exported item cards (muted) */}
                        <div className="space-y-2">
                          {exportedItems.map((item) => (
                            <div
                              key={item.id}
                              className="bg-[var(--surface-2)]/50 rounded-[var(--radius-xl)] p-3 border border-[var(--border)]/50 opacity-60"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-sm font-medium text-[var(--text-muted)] leading-tight">
                                  {item.todo.customer_name || 'Unknown Customer'}
                                </p>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="p-1 rounded-[var(--radius-lg)] hover:bg-[var(--surface-3)] transition-colors flex-shrink-0 ml-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                  aria-label={`Remove ${item.todo.customer_name || 'task'} from logged list`}
                                >
                                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                </button>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                                {item.todo.text}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Completed {formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default EAgentExportPanel;
