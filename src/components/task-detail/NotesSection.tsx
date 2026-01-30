'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  transcription?: string;
}

export default function NotesSection({
  notes,
  onNotesChange,
  onSaveNotes,
  transcription,
}: NotesSectionProps) {
  const [isOpen, setIsOpen] = useState(!!notes || !!transcription);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const minHeight = lineHeight * 3;
    const maxHeight = lineHeight * 12;
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    autoResize();
  }, [notes, isOpen, autoResize]);

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
        <span className="flex items-center gap-2 text-[13px] font-semibold">
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
                  value={notes}
                  onChange={(e) => {
                    onNotesChange(e.target.value);
                    autoResize();
                  }}
                  onBlur={onSaveNotes}
                  placeholder="Add notes or context..."
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] resize-none bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--foreground)] outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-[var(--text-muted)] pointer-events-none select-none">
                  {notes.length}
                </span>
              </div>

              {transcription && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent)] rounded-[var(--radius-md)] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Voicemail Transcription
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
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
