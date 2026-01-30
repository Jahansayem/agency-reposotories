'use client';

import { useState } from 'react';
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

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-2 text-left"
        style={{ color: 'var(--foreground)' }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          Notes
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-1 pb-2 space-y-3">
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                onBlur={onSaveNotes}
                placeholder="Add notes or context..."
                rows={4}
                className="w-full px-3 py-2 text-sm resize-y"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--foreground)',
                  outline: 'none',
                }}
              />

              {transcription && (
                <div
                  className="flex gap-3 p-3 rounded-lg"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                    style={{
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}
                  >
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-light)' }}
                    >
                      Voicemail Transcription
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--foreground)' }}
                    >
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
