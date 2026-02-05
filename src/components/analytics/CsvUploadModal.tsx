'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Table,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  useCsvUpload,
  CUSTOMER_INSIGHT_FIELDS,
  type CustomerInsightRow,
} from '@/hooks/useCsvUpload';

// ============================================================================
// Types
// ============================================================================

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (result: { recordsCreated: number; recordsUpdated: number }) => void;
}

type Step = 'upload' | 'preview' | 'mapping' | 'uploading' | 'complete';

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Step indicator showing current progress
 */
function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'uploading', label: 'Import' },
  ];

  const getStepIndex = (step: Step) => {
    if (step === 'complete') return steps.length;
    return steps.findIndex(s => s.key === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
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
              <Check className="w-3.5 h-3.5" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                w-12 h-0.5 mx-1
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
          relative border-2 border-dashed rounded-[var(--radius-xl)] p-10 text-center
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
          accept=".csv,text/csv"
          disabled={isLoading}
          className="hidden"
        />

        {isLoading ? (
          <div className="space-y-3">
            <Loader2 className="w-12 h-12 mx-auto text-[var(--accent)] animate-spin" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              Parsing CSV file...
            </p>
          </div>
        ) : (
          <>
            <motion.div
              animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <FileSpreadsheet
                className={`w-12 h-12 mx-auto mb-4 ${
                  isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                }`}
              />
            </motion.div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">
              {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Maximum file size: 5MB
            </p>
          </>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--danger)]/10 border border-[var(--danger)]/20"
        >
          <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * CSV data preview table
 */
function DataPreview({
  headers,
  rows,
  totalRows,
}: {
  headers: string[];
  rows: string[][];
  totalRows: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--foreground)]">
            Data Preview
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Showing {rows.length} of {totalRows} rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-[var(--foreground)] whitespace-nowrap border-b border-[var(--border)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50"
              >
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap max-w-[200px] truncate"
                    title={row[colIndex] || ''}
                  >
                    {row[colIndex] || <span className="text-[var(--text-muted)] italic">empty</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Column mapping interface
 */
function ColumnMapping({
  headers,
  mappings,
  onUpdateMapping,
  validationErrors,
}: {
  headers: string[];
  mappings: Map<string, keyof CustomerInsightRow | null>;
  onUpdateMapping: (csvColumn: string, dbField: keyof CustomerInsightRow | null) => void;
  validationErrors: Array<{ column: string; message: string }>;
}) {
  const dbFields = Object.entries(CUSTOMER_INSIGHT_FIELDS);

  // Get already mapped fields to prevent duplicates
  const usedFields = new Set(Array.from(mappings.values()).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-sm font-medium text-[var(--foreground)]">
          Map CSV Columns to Database Fields
        </span>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Match your CSV columns to the corresponding database fields. Customer Name is required.
      </p>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {headers.map((header) => {
          const currentMapping = mappings.get(header);
          const fieldError = validationErrors.find(e => e.column === header);

          return (
            <div
              key={header}
              className={`
                flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border
                ${fieldError ? 'border-[var(--danger)]/50 bg-[var(--danger)]/5' : 'border-[var(--border)] bg-[var(--surface)]'}
              `}
            >
              {/* CSV Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">
                    {header}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />

              {/* Database Field Selector */}
              <div className="flex-1 min-w-0">
                <select
                  value={currentMapping || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    onUpdateMapping(header, value ? value as keyof CustomerInsightRow : null);
                  }}
                  className={`
                    w-full px-3 py-2 text-sm rounded-[var(--radius-md)]
                    bg-[var(--surface-2)] text-[var(--foreground)]
                    border border-[var(--border)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
                    ${currentMapping ? 'border-[var(--success)]/50' : ''}
                  `}
                >
                  <option value="">-- Skip this column --</option>
                  {dbFields.map(([field, config]) => {
                    const isUsed = usedFields.has(field as keyof CustomerInsightRow) && currentMapping !== field;
                    return (
                      <option
                        key={field}
                        value={field}
                        disabled={isUsed}
                      >
                        {config.label}
                        {config.required ? ' (required)' : ''}
                        {isUsed ? ' (already mapped)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0 w-5">
                {currentMapping && (
                  <Check className="w-4 h-4 text-[var(--success)]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapping summary */}
      <div className="flex items-center gap-4 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">
            {Array.from(mappings.values()).filter(Boolean).length} of {headers.length} columns mapped
          </span>
        </div>
        {!Array.from(mappings.values()).includes('customer_name') && (
          <span className="text-xs text-[var(--danger)]">
            Customer Name must be mapped
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Upload progress indicator
 */
function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-4 py-8">
      <div className="flex justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Upload className="w-12 h-12 text-[var(--accent)]" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Importing customers...
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {progress}% complete
        </p>
      </div>

      <div className="w-full max-w-xs mx-auto h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[var(--accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
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
  result: {
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    recordsFailed: number;
  };
  onDone: () => void;
}) {
  const total = result.recordsCreated + result.recordsUpdated;
  const hasIssues = result.recordsSkipped > 0 || result.recordsFailed > 0;

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

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Import Complete
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Successfully imported {total} customer{total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--success)]/10 border border-[var(--success)]/20">
          <p className="text-2xl font-bold text-[var(--success)]">{result.recordsCreated}</p>
          <p className="text-xs text-[var(--text-muted)]">New customers</p>
        </div>
        <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 border border-[var(--accent)]/20">
          <p className="text-2xl font-bold text-[var(--accent)]">{result.recordsUpdated}</p>
          <p className="text-xs text-[var(--text-muted)]">Updated</p>
        </div>
        {result.recordsSkipped > 0 && (
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--warning)]/10 border border-[var(--warning)]/20">
            <p className="text-2xl font-bold text-[var(--warning)]">{result.recordsSkipped}</p>
            <p className="text-xs text-[var(--text-muted)]">Skipped</p>
          </div>
        )}
        {result.recordsFailed > 0 && (
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
            <p className="text-2xl font-bold text-[var(--danger)]">{result.recordsFailed}</p>
            <p className="text-xs text-[var(--text-muted)]">Failed</p>
          </div>
        )}
      </div>

      <Button onClick={onDone} fullWidth variant="primary">
        Done
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CsvUploadModal({ isOpen, onClose, onUploadComplete }: CsvUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');

  const {
    state,
    file,
    parsedData,
    columnMappings,
    validationErrors,
    uploadResult,
    progress,
    error,
    parseFile,
    updateMapping,
    upload,
    reset,
    getPreviewRows,
    isMappingValid,
  } = useCsvUpload({
    onSuccess: (result) => {
      setStep('complete');
      onUploadComplete?.({
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
      });
    },
    onError: () => {
      // Stay on current step to show error
    },
  });

  // Sync step with upload state
  useEffect(() => {
    if (state === 'uploading') {
      setStep('uploading');
    }
  }, [state]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setStep('upload');
    }
  }, [isOpen, reset]);

  const handleFileSelect = async (selectedFile: File) => {
    const success = await parseFile(selectedFile);
    if (success) {
      setStep('preview');
    }
  };

  const handleBack = () => {
    if (step === 'preview') {
      reset();
      setStep('upload');
    } else if (step === 'mapping') {
      setStep('preview');
    }
  };

  const handleNext = () => {
    if (step === 'preview') {
      setStep('mapping');
    } else if (step === 'mapping') {
      upload();
    }
  };

  const handleClose = () => {
    if (state !== 'uploading') {
      onClose();
    }
  };

  const canProceed = step === 'preview' || (step === 'mapping' && isMappingValid());

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Book of Business"
      description="Upload a CSV file to import customer data"
      size="lg"
      closeOnBackdropClick={state !== 'uploading'}
      closeOnEscape={state !== 'uploading'}
    >
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--foreground)] pr-8">
          Import Book of Business
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Upload a CSV file with your customer data
        </p>
      </ModalHeader>

      <ModalBody>
        <StepIndicator currentStep={step} />

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <FileDropZone
                onFileSelect={handleFileSelect}
                isLoading={state === 'parsing'}
                error={error}
              />
            </motion.div>
          )}

          {step === 'preview' && parsedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)]">
                <FileSpreadsheet className="w-5 h-5 text-[var(--accent)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {file?.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {parsedData.totalRows} rows, {parsedData.headers.length} columns
                  </p>
                </div>
                <Check className="w-5 h-5 text-[var(--success)]" />
              </div>

              <DataPreview
                headers={parsedData.headers}
                rows={getPreviewRows()}
                totalRows={parsedData.totalRows}
              />
            </motion.div>
          )}

          {step === 'mapping' && parsedData && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ColumnMapping
                headers={parsedData.headers}
                mappings={columnMappings}
                onUpdateMapping={updateMapping}
                validationErrors={validationErrors.slice(0, 5)}
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--danger)]/10 border border-[var(--danger)]/20"
                >
                  <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <UploadProgress progress={progress} />
            </motion.div>
          )}

          {step === 'complete' && uploadResult && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <UploadComplete result={uploadResult} onDone={handleClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </ModalBody>

      {step !== 'uploading' && step !== 'complete' && (
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={step === 'upload' ? handleClose : handleBack}
            disabled={state === 'parsing'}
          >
            {step === 'upload' ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                Back
              </>
            )}
          </Button>

          {step !== 'upload' && (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed || state === 'parsing'}
              loading={state === 'uploading'}
            >
              {step === 'mapping' ? (
                <>
                  Import {parsedData?.totalRows || 0} Customers
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}

export default CsvUploadModal;
