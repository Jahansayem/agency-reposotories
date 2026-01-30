'use client';

import { Copy, FileText, Mail, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface OverflowMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSaveAsTemplate?: () => void;
  onEmailCustomer?: () => void;
  onSnooze?: (days: number) => void;
  completed: boolean;
}

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 Days', days: 2 },
  { label: 'Next Week', days: 7 },
  { label: 'Next Month', days: 30 },
];

export default function OverflowMenu({
  isOpen,
  onToggle,
  onDelete,
  onDuplicate,
  onSaveAsTemplate,
  onEmailCustomer,
  onSnooze,
  completed,
}: OverflowMenuProps) {
  const [showSnoozeSubmenu, setShowSnoozeSubmenu] = useState(false);

  const handleClose = () => {
    setShowSnoozeSubmenu(false);
    onToggle();
  };

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {onDuplicate && (
              <button
                onClick={() => handleAction(onDuplicate)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <Copy size={16} className="text-[var(--text-muted)]" />
                Duplicate
              </button>
            )}

            {onSaveAsTemplate && (
              <button
                onClick={() => handleAction(onSaveAsTemplate)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <FileText size={16} className="text-[var(--text-muted)]" />
                Save as Template
              </button>
            )}

            {onEmailCustomer && (
              <button
                onClick={() => handleAction(onEmailCustomer)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <Mail size={16} className="text-[var(--text-muted)]" />
                Email Update
              </button>
            )}

            {onSnooze && !completed && (
              <div className="relative">
                <button
                  onClick={() => setShowSnoozeSubmenu(!showSnoozeSubmenu)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Clock size={16} className="text-[var(--text-muted)]" />
                  Snooze
                </button>

                <AnimatePresence>
                  {showSnoozeSubmenu && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.12 }}
                      className="overflow-hidden"
                    >
                      {SNOOZE_OPTIONS.map((option) => (
                        <button
                          key={option.days}
                          onClick={() => {
                            onSnooze(option.days);
                            handleClose();
                          }}
                          className="flex items-center w-full pl-10 pr-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--border)] my-1" />

            <button
              onClick={() => handleAction(onDelete)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-[var(--surface-2)] transition-colors"
            >
              <Trash2 size={16} />
              Delete Task
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
