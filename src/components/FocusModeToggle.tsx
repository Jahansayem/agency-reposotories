'use client';

import { Focus, X } from 'lucide-react';
import { useTodoStore } from '@/store/todoStore';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusModeToggleProps {
  className?: string;
}

/**
 * FocusModeToggle - A toggle button for enabling/disabling focus mode
 *
 * Focus mode hides all secondary UI elements to maximize task visibility:
 * - Hamburger menu / AppMenu
 * - Stats, filters, secondary features
 * - Shows ONLY task input + task list
 *
 * Keyboard shortcut: Cmd/Ctrl + Shift + F
 */
export default function FocusModeToggle({ className = '' }: FocusModeToggleProps) {
  const { focusMode } = useTodoStore((state) => state.ui);
  const toggleFocusMode = useTodoStore((state) => state.toggleFocusMode);

  return (
    <button
      onClick={toggleFocusMode}
      className={`p-2 rounded-[var(--radius-xl)] transition-all duration-200 ${
        focusMode
          ? 'bg-[var(--accent)] text-white shadow-md'
          : 'text-[var(--text-muted)] hover:text-[var(--brand-blue)] hover:bg-[var(--surface-2)]'} ${className}`}
      aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
      aria-pressed={focusMode}
      title={focusMode ? 'Exit Focus Mode (Ctrl+Shift+F)' : 'Focus Mode (Ctrl+Shift+F)'}
    >
      <Focus className="w-5 h-5" />
    </button>
  );
}

/**
 * ExitFocusModeButton - A minimal floating button to exit focus mode
 *
 * This button appears in the bottom-left corner when focus mode is enabled,
 * providing a clear way to exit focus mode.
 */
export function ExitFocusModeButton() {
  const { focusMode } = useTodoStore((state) => state.ui);
  const setFocusMode = useTodoStore((state) => state.setFocusMode);

  return (
    <AnimatePresence>
      {focusMode && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={() => setFocusMode(false)}
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 ${
            'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}`}
          aria-label="Exit focus mode"
          title="Exit Focus Mode (Ctrl+Shift+F)"
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Focus</span>
          <kbd className={`text-xs px-1.5 py-0.5 rounded ${
            'bg-[var(--surface-2)]'}`}>
            Esc
          </kbd>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
