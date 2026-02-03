'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/animations';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * FilterBottomSheet Component
 *
 * A mobile-optimized bottom sheet for displaying filter controls.
 * Features drag-to-dismiss, backdrop tap to close, and smooth animations.
 *
 * UX Benefits over inline panel:
 * - Doesn't push content down
 * - Native mobile pattern (iOS/Android familiarity)
 * - Easy drag-to-dismiss gesture
 * - Maintains context of task list behind it
 */
export function FilterBottomSheet({
  isOpen,
  onClose,
  title = 'Filters',
  children,
}: FilterBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  // Handle drag to dismiss
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={reducedMotion ? { y: 0 } : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: reducedMotion ? 0.1 : undefined
            }}
            drag={reducedMotion ? false : 'y'}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-sheet-title"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--border)]">
              <h2 id="filter-sheet-title" className="text-lg font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FilterBottomSheet;
