'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchWithCsrf } from '@/lib/csrf';

// ============================================================================
// Types
// ============================================================================

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (result: { recordsCreated: number }) => void;
  currentUserName: string;
}

type Step = 'upload' | 'processing' | 'complete' | 'error';

interface UploadSummary {
  total_records: number;
  by_segment?: Record<string, number>;
  priority_breakdown?: {
    high: number;
    medium: number;
    low: number;
  };
  top_recommendations?: string[];
}

interface UploadResult {
  success: boolean;
  batch_id: string | null;
  summary: UploadSummary;
  stats: {
    total_records: number;
    valid_records: number;
    records_created: number;
    records_updated: number;
    records_skipped: number;
    records_failed: number;
    parsing_errors: number;
    parsing_warnings: number;
  };
  errors: Array<{ row?: number; message: string }>;
  warnings: Array<{ row?: number; message: string }>;
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Step indicator showing current progress
 */
function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'processing', label: 'Processing' },
    { key: 'complete', label: 'Done' },
  ];

  const getStepIndex = (step: Step) => {
    if (step === 'complete') return steps.length;
    if (step === 'error') return 1; // Show as stuck on processing
    return steps.findIndex(s => s.key === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              transition-colors duration-200
              ${index < currentIndex
                ? 'bg-[var(--success)] text-white'
                : index === currentIndex
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
              }
            `}
          >
            {index < currentIndex ? (
              <Check className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                w-16 h-0.5 mx-2
                ${index < currentIndex
                  ? 'bg-[var(--success)]'
                  : 'bg-[var(--border)]'
                }
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Drag and drop file upload zone
 */
function FileDropZone({
  onFileSelect,
  isLoading,
  error,
}: {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-[var(--radius-xl)] p-12 text-center
          cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/5 scale-[1.02]'
            : isLoading
              ? 'border-[var(--border)] bg-[var(--surface-2)] cursor-not-allowed opacity-60'
              : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)]'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          disabled={isLoading}
          className="hidden"
        />

        <motion.div
          animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <FileSpreadsheet
            className={`w-14 h-14 mx-auto mb-4 ${
              isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
            }`}
          />
        </motion.div>
        <p className="text-base font-medium text-[var(--foreground)] mb-1">
          {isDragging ? 'Drop your file here' : 'Drag & drop your Allstate report'}
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          or click to browse
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          AI auto-detects any Allstate report format • CSV, Excel (.xlsx, .xls) • Max 5MB
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--danger)]/10 border border-[var(--danger)]/20"
        >
          <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--danger)]">Upload Failed</p>
            <p className="text-sm text-[var(--danger)]/80 mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--accent)]/5 border border-[var(--accent)]/20">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <p className="text-xs text-[var(--text-secondary)]">
          AI automatically detects columns and calculates cross-sell priority scores
        </p>
      </div>
    </div>
  );
}

/**
 * Processing state with progress
 */
function ProcessingState({ fileName }: { fileName: string }) {
  return (
    <div className="space-y-6 py-8">
      <div className="flex justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-[var(--accent)]" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-[var(--foreground)]">
          Processing your data...
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {fileName}
        </p>
      </div>

      <div className="space-y-3 max-w-xs mx-auto">
        <ProcessingStep label="Parsing Excel file" done />
        <ProcessingStep label="Detecting columns" done />
        <ProcessingStep label="Calculating priority scores" active />
        <ProcessingStep label="Importing to database" />
      </div>
    </div>
  );
}

function ProcessingStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center
        ${done ? 'bg-[var(--success)]' : active ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}
      `}>
        {done ? (
          <Check className="w-3 h-3 text-white" />
        ) : active ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-3 h-3 text-white" />
          </motion.div>
        ) : null}
      </div>
      <span className={`text-sm ${done || active ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>
        {label}
      </span>
    </div>
  );
}

/**
 * Upload completion summary
 */
function UploadComplete({
  result,
  onDone,
}: {
  result: UploadResult;
  onDone: () => void;
}) {
  // Safely access nested properties with defaults
  const stats = result?.stats || { records_created: 0, records_skipped: 0, records_failed: 0 };
  const summary = result?.summary || { priority_breakdown: { high: 0, medium: 0, low: 0 } };
  const errors = result?.errors || [];
  const hasIssues = (stats.records_skipped || 0) > 0 || (stats.records_failed || 0) > 0;

  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${hasIssues ? 'bg-[var(--warning)]/10' : 'bg-[var(--success)]/10'}
          `}
        >
          <Check
            className={`w-8 h-8 ${hasIssues ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}
          />
        </motion.div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">
          Import Complete!
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          {stats.records_created} cross-sell opportunities ready
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--success)]/10 border border-[var(--success)]/20 text-center">
          <Users className="w-5 h-5 text-[var(--success)] mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--success)]">{stats.records_created}</p>
          <p className="text-xs text-[var(--text-muted)]">Imported</p>
        </div>
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-center">
          <TrendingUp className="w-5 h-5 text-[var(--accent)] mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--accent)]">
            {summary.priority_breakdown?.high || 0}
          </p>
          <p className="text-xs text-[var(--text-muted)]">High Priority</p>
        </div>
        {hasIssues ? (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-center">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--warning)]">
              {(stats.records_skipped || 0) + (stats.records_failed || 0)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Skipped</p>
          </div>
        ) : (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-2)] border border-[var(--border)] text-center">
            <Check className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--foreground)]">100%</p>
            <p className="text-xs text-[var(--text-muted)]">Success</p>
          </div>
        )}
      </div>

      {/* Priority Breakdown */}
      {summary.priority_breakdown && stats.records_created > 0 && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-2)] border border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">Priority Breakdown</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 rounded-full bg-[var(--surface-3)] overflow-hidden flex">
              {(summary.priority_breakdown.high || 0) > 0 && (
                <div
                  className="h-full bg-[var(--danger)]"
                  style={{ width: `${((summary.priority_breakdown.high || 0) / stats.records_created) * 100}%` }}
                />
              )}
              {(summary.priority_breakdown.medium || 0) > 0 && (
                <div
                  className="h-full bg-[var(--warning)]"
                  style={{ width: `${((summary.priority_breakdown.medium || 0) / stats.records_created) * 100}%` }}
                />
              )}
              {(summary.priority_breakdown.low || 0) > 0 && (
                <div
                  className="h-full bg-[var(--success)]"
                  style={{ width: `${((summary.priority_breakdown.low || 0) / stats.records_created) * 100}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
              High ({summary.priority_breakdown.high || 0})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
              Medium ({summary.priority_breakdown.medium || 0})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              Low ({summary.priority_breakdown.low || 0})
            </span>
          </div>
        </div>
      )}

      {/* Errors/Warnings */}
      {errors.length > 0 && (
        <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
          <p className="text-sm font-medium text-[var(--danger)] mb-2">
            {errors.length} Error{errors.length !== 1 ? 's' : ''}
          </p>
          <ul className="text-xs text-[var(--danger)]/80 space-y-1">
            {errors.slice(0, 3).map((err, i) => (
              <li key={i}>• {err.message}</li>
            ))}
            {errors.length > 3 && (
              <li>• ...and {errors.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      <Button onClick={onDone} fullWidth variant="primary" size="lg">
        View Opportunities
      </Button>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-[var(--danger)]" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Import Failed
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
          {error}
        </p>
      </div>

      <Button onClick={onRetry} variant="secondary">
        Try Again
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CsvUploadModal({ isOpen, onClose, onUploadComplete, currentUserName }: CsvUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFile(null);
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls'];

    const extension = selectedFile.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Supported formats: CSV, Excel (.xlsx, .xls)');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit`);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStep('processing');

    try {
      // Send directly to backend API
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploaded_by', currentUserName);
      formData.append('data_source', 'book_of_business');

      // Use AI-powered parsing for automatic column detection
      const response = await fetchWithCsrf('/api/analytics/ai-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process file');
      }

      setResult(data);
      setStep('complete');
      onUploadComplete?.({ recordsCreated: data.stats.records_created });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process file';
      setError(message);
      setStep('error');
    }
  }, [currentUserName, onUploadComplete]);

  const handleRetry = useCallback(() => {
    setStep('upload');
    setFile(null);
    setError(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (step !== 'processing') {
      onClose();
    }
  }, [step, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Book of Business"
      size="md"
      closeOnBackdropClick={step !== 'processing'}
      closeOnEscape={step !== 'processing'}
    >
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--foreground)] pr-8">
          Import Cross-Sell Opportunities
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Upload your Allstate report to generate prioritized opportunities
        </p>
      </ModalHeader>

      <ModalBody>
        <StepIndicator currentStep={step} />

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <FileDropZone
                onFileSelect={handleFileSelect}
                isLoading={false}
                error={error}
              />
            </motion.div>
          )}

          {step === 'processing' && file && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProcessingState fileName={file.name} />
            </motion.div>
          )}

          {step === 'complete' && result && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <UploadComplete result={result} onDone={handleClose} />
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ErrorState error={error || 'Unknown error'} onRetry={handleRetry} />
            </motion.div>
          )}
        </AnimatePresence>
      </ModalBody>

      {step === 'upload' && (
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}

export default CsvUploadModal;
