'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { haptics } from '@/lib/haptics';

export interface DeleteConfirmDialogProps {
  todoId: string;
  todoText: string;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function DeleteConfirmDialog({
  todoId,
  todoText,
  onDelete,
  onClose,
}: DeleteConfirmDialogProps) {
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteDescriptionId = `delete-dialog-description-${todoId}`;

  // Focus management for delete confirmation dialog
  useEffect(() => {
    if (deleteDialogRef.current) {
      deleteDialogRef.current.focus();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        ref={deleteDialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`delete-dialog-title-${todoId}`}
        aria-describedby={deleteDescriptionId}
        tabIndex={-1}
        className="bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-xl max-w-sm w-full p-6 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center" aria-hidden="true">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 id={`delete-dialog-title-${todoId}`} className="font-semibold text-[var(--foreground)]">Delete Task?</h3>
            <p className="text-sm text-[var(--text-muted)]">This action cannot be undone.</p>
          </div>
        </div>
        <p id={deleteDescriptionId} className="text-sm text-[var(--text-muted)] mb-6 line-clamp-2">
          &ldquo;{todoText}&rdquo;
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              haptics.heavy();
              onDelete(todoId);
              onClose();
            }}
            fullWidth
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
