'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Mic, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSaveNotes } from '@/hooks/useAutoSaveNotes';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  transcription?: string;
  /** Whether user can edit the task (has permission or owns the task) */
  canEdit?: boolean;
}

export default function NotesSection({
  notes,
  onNotesChange,
  onSaveNotes,
  transcription,
  canEdit = true,
}: NotesSectionProps) {
  const [isOpen, setIsOpen] = useState(!!notes || !!transcription);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save notes with debounce
  const { value, saveStatus, handleChange, handleManualSave } = useAutoSaveNotes({
    initialValue: notes,
    onSave: onSaveNotes,
    onChange: onNotesChange,
    debounceMs: 1500,
    enabled: canEdit,
  });

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight * 4;
    const maxHeight = lineHeight * 14;
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, isOpen, autoResize]);

  return (
    <div>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between w-full py-2 text-left text-[var(--foreground)]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
          Notes
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2 space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    if (canEdit) {
                      handleChange(e.target.value);
                      autoResize();
                    }
                  }}
                  placeholder={canEdit ? "Add notes or context..." : "No notes"}
                  rows={4}
                  className={`w-full px-3 py-2.5 pb-8 text-sm leading-relaxed resize-none bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--foreground)] outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!canEdit}
                  readOnly={!canEdit}
                />
                {/* Character count */}
                <span className="absolute bottom-2 left-3 text-label text-[var(--text-muted)] pointer-events-none select-none">
                  {value.length}
                </span>

                {/* Save status indicator and manual save button */}
                {canEdit && (
                  <div className="absolute bottom-2 right-3 flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {saveStatus === 'saving' && (
                        <motion.span
                          key="saving"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="text-label text-[var(--text-muted)] flex items-center gap-1"
                        >
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </motion.span>
                      )}
                      {saveStatus === 'saved' && (
                        <motion.span
                          key="saved"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="text-label text-green-600 dark:text-green-400 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Saved
                        </motion.span>
                      )}
                      {saveStatus === 'error' && (
                        <motion.span
                          key="error"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="text-label text-red-600 dark:text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Error saving
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Manual save button - only show when not currently saving */}
                    {saveStatus !== 'saving' && (
                      <button
                        type="button"
                        onClick={handleManualSave}
                        className="p-1 rounded hover:bg-[var(--surface-3)] transition-colors"
                        title="Save now"
                      >
                        <Save className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--accent)]" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {transcription && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent)] rounded-[var(--radius-md)] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-label text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Voicemail Transcription
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--foreground)]">
                      {transcription}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
