'use client';

import { Copy, FileText, Mail, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface OverflowMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSaveAsTemplate?: () => void;
  onEmailCustomer?: () => void;
  onSnooze?: (days: number) => void;
  completed: boolean;
  /** Whether user can delete the task (has permission or owns the task) */
  canDelete?: boolean;
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
  canDelete = true,
}: OverflowMenuProps) {
  const [showSnoozeSubmenu, setShowSnoozeSubmenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Reset states when menu closes
  useEffect(() => {
    if (!isOpen) {
      setShowSnoozeSubmenu(false);
      setConfirmingDelete(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowSnoozeSubmenu(false);
    setConfirmingDelete(false);
    onToggle();
  };

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete();
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
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[210px] rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xl)] overflow-hidden"
          >
            {onDuplicate && (
              <button
                role="menuitem"
                onClick={() => handleAction(onDuplicate)}
                className="flex items-center gap-2.5 w-full px-3 min-h-[40px] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
              >
                <Copy size={16} className="text-[var(--accent)]" />
                Duplicate
              </button>
            )}

            {onSaveAsTemplate && (
              <button
                role="menuitem"
                onClick={() => handleAction(onSaveAsTemplate)}
                className="flex items-center gap-2.5 w-full px-3 min-h-[40px] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
              >
                <FileText size={16} className="text-[var(--accent)]" />
                Save as Template
              </button>
            )}

            {onEmailCustomer && (
              <button
                role="menuitem"
                onClick={() => handleAction(onEmailCustomer)}
                className="flex items-center gap-2.5 w-full px-3 min-h-[40px] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
              >
                <Mail size={16} className="text-[var(--accent)]" />
                Email Update
              </button>
            )}

            {onSnooze && !completed && (
              <div className="relative">
                <button
                  role="menuitem"
                  onClick={() => setShowSnoozeSubmenu(!showSnoozeSubmenu)}
                  className="flex items-center gap-2.5 w-full px-3 min-h-[40px] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
                >
                  <Clock size={16} className="text-[var(--accent)]" />
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
                          role="menuitem"
                          onClick={() => {
                            onSnooze(option.days);
                            handleClose();
                          }}
                          className="flex items-center w-full pl-11 pr-3 min-h-[36px] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Divider - only show if delete button is visible */}
            {canDelete && (
              <div className="border-t border-[var(--border)] my-1" />
            )}

            {/* Delete button - only show if user has permission or owns the task */}
            {canDelete && (
              <button
                role="menuitem"
                onClick={handleDeleteClick}
                className={`flex items-center gap-2.5 w-full px-3 min-h-[40px] text-sm font-medium active:scale-[0.98] transition-all ${
                  confirmingDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'text-[var(--danger)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Trash2 size={16} />
                {confirmingDelete ? 'Confirm Delete?' : 'Delete Task'}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
