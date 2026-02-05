'use client';

/**
 * Allstate Data Uploader Component
 *
 * Modal component for uploading weekly Allstate Book of Business data.
 * Supports CSV files and shows upload progress and results.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import type { AllstateDataSource, DataUploadSummary } from '@/types/allstate-analytics';
import { PRIORITY_TIER_CONFIG } from '@/types/allstate-analytics';

interface AllstateDataUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId?: string;
  uploadedBy: string;
  onUploadComplete?: (summary: DataUploadSummary) => void;
}

type UploadStep = 'select' | 'preview' | 'uploading' | 'complete' | 'error';

interface UploadResult {
  success: boolean;
  summary?: DataUploadSummary;
  stats?: {
    total_records: number;
    valid_records: number;
    records_created: number;
    records_skipped: number;
    records_failed: number;
    parsing_errors: number;
  };
  errors?: Array<{ row: number; errors: string[] }>;
  batch_id?: string;
}

export function AllstateDataUploader({
  isOpen,
  onClose,
  agencyId,
  uploadedBy,
  onUploadComplete,
}: AllstateDataUploaderProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [dataSource, setDataSource] = useState<AllstateDataSource>('book_of_business');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validTypes.includes(extension)) {
      setErrorMessage('Invalid file type. Please upload a CSV or Excel file.');
      setStep('error');
      return;
    }

    // For now, only CSV is supported
    if (extension !== '.csv') {
      setErrorMessage('Excel files are not yet supported. Please export your data as CSV.');
      setStep('error');
      return;
    }

    setFile(selectedFile);
    setStep('preview');
    setErrorMessage(null);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // Upload file
  const handleUpload = useCallback(async () => {
    if (!file) return;

    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('data_source', dataSource);
      formData.append('uploaded_by', uploadedBy);
      if (agencyId) formData.append('agency_id', agencyId);

      const response = await fetch('/api/analytics/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResult = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.errors?.[0] || 'Upload failed');
      }

      setUploadResult(result);
      setStep('complete');

      if (result.summary && onUploadComplete) {
        onUploadComplete(result.summary);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
    }
  }, [file, dataSource, uploadedBy, agencyId, onUploadComplete]);

  // Reset state
  const handleReset = useCallback(() => {
    setStep('select');
    setFile(null);
    setUploadResult(null);
    setErrorMessage(null);
  }, []);

  // Close modal
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Allstate Data
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Import Book of Business for cross-sell analysis
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step: Select File */}
            {step === 'select' && (
              <div className="space-y-4">
                {/* Data source selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Source
                  </label>
                  <select
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value as AllstateDataSource)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="book_of_business">Book of Business</option>
                    <option value="cross_sell_report">Cross-Sell Report</option>
                    <option value="renewal_list">Renewal List</option>
                    <option value="retention_report">Retention Report</option>
                    <option value="production_report">Production Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Supports CSV files (Excel support coming soon)
                  </p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Export your Book of Business from Allstate Gateway and upload here
                </p>
              </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && file && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Upload & Process
                  </button>
                </div>
              </div>
            )}

            {/* Step: Uploading */}
            {step === 'uploading' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  Processing your data...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Analyzing cross-sell opportunities
                </p>
              </div>
            )}

            {/* Step: Complete */}
            {step === 'complete' && uploadResult?.summary && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Upload Complete!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {uploadResult.stats?.records_created || 0} opportunities imported
                  </p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  {/* HOT opportunities */}
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: PRIORITY_TIER_CONFIG.HOT.bgColor }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{PRIORITY_TIER_CONFIG.HOT.icon}</span>
                      <span className="text-sm font-medium" style={{ color: PRIORITY_TIER_CONFIG.HOT.color }}>
                        HOT
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {uploadResult.summary.hot_opportunities}
                    </p>
                  </div>

                  {/* HIGH opportunities */}
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: PRIORITY_TIER_CONFIG.HIGH.bgColor }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{PRIORITY_TIER_CONFIG.HIGH.icon}</span>
                      <span className="text-sm font-medium" style={{ color: PRIORITY_TIER_CONFIG.HIGH.color }}>
                        High Priority
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {uploadResult.summary.high_opportunities}
                    </p>
                  </div>

                  {/* Renewals this week */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        This Week
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {uploadResult.summary.renewals_this_week}
                    </p>
                  </div>

                  {/* Potential premium */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Potential
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${(uploadResult.summary.total_potential_premium / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Done
                </button>
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Failed
                </h3>
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>

                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AllstateDataUploader;
