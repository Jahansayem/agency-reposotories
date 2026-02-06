'use client';

import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export type RetentionRisk = 'low' | 'medium' | 'high';

export interface CustomerInsightRow {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_premium?: number;
  total_policies?: number;
  products_held?: string[];
  tenure_years?: number;
  retention_risk?: RetentionRisk;
  upcoming_renewal?: string; // ISO date string
}

export interface CsvColumnMapping {
  csvColumn: string;
  dbField: keyof CustomerInsightRow | null;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'array' | 'enum';
  enumValues?: string[];
}

export interface ParsedCsvData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface CsvValidationError {
  row: number;
  column: string;
  message: string;
}

export interface CsvUploadResult {
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: CsvValidationError[];
}

// API response shape from /api/customers/import
interface ApiImportResponse {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
}

export type CsvUploadState = 'idle' | 'parsing' | 'mapped' | 'uploading' | 'success' | 'error';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];
const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls'];
const PREVIEW_ROWS = 5;

// Database fields that can be mapped
export const CUSTOMER_INSIGHT_FIELDS: Record<keyof CustomerInsightRow, { label: string; type: CsvColumnMapping['type']; required: boolean; enumValues?: string[] }> = {
  customer_name: { label: 'Customer Name', type: 'string', required: true },
  customer_email: { label: 'Email', type: 'string', required: false },
  customer_phone: { label: 'Phone', type: 'string', required: false },
  total_premium: { label: 'Total Premium ($)', type: 'number', required: false },
  total_policies: { label: 'Total Policies', type: 'number', required: false },
  products_held: { label: 'Products Held', type: 'array', required: false },
  tenure_years: { label: 'Tenure (Years)', type: 'number', required: false },
  retention_risk: { label: 'Retention Risk', type: 'enum', required: false, enumValues: ['low', 'medium', 'high'] },
  upcoming_renewal: { label: 'Upcoming Renewal', type: 'date', required: false },
};

// ============================================================================
// CSV Parsing Utilities
// ============================================================================

/**
 * Check if file is an Excel file based on extension
 */
function isExcelFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  return extension === 'xlsx' || extension === 'xls';
}

/**
 * Parse Excel file (.xlsx/.xls) and convert to headers + rows format
 * Handles Allstate Renewal Audit Report format (headers on row 5, data starts row 6)
 * and All Purpose Audit format (headers on row 34)
 */
function parseExcelContent(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert sheet to JSON with header detection
  // First, get all data as raw arrays to find the header row
  const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find the header row by looking for common column names
  // Renewal Audit Report has headers on row 5, All Purpose Audit on row 34
  const headerIndicators = [
    'Insured First Name',
    'Insured Last Name',
    'Insured Name',      // All Purpose Audit
    'Insured Contact',   // All Purpose Audit (phone)
    'Customer Name',
    'Name',
    'Phone',
    'Email',
    'Premium',
    'Renewal Date',
    'Policy',
    'Product',
  ];

  let headerRowIndex = 0;
  // Scan up to 50 rows to handle All Purpose Audit (headers at row 34)
  for (let i = 0; i < Math.min(rawData.length, 50); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    // Skip rows with fewer than 5 columns (likely metadata rows)
    if (row.length < 5) continue;

    const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    const matchCount = headerIndicators.filter(indicator =>
      rowStr.includes(indicator.toLowerCase())
    ).length;

    // If we find at least 2 header indicators, this is likely the header row
    if (matchCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  // Extract headers from the header row
  const headerRow = rawData[headerRowIndex] as (string | number | undefined)[];
  const headers = headerRow.map(cell => String(cell || '').trim()).filter(h => h !== '');

  // Convert remaining rows to string arrays
  const rows: string[][] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const dataRow = rawData[i] as (string | number | undefined)[];
    if (!dataRow || dataRow.length === 0) continue;

    // Skip rows that appear to be empty or contain only whitespace
    const hasData = dataRow.some(cell => {
      const val = String(cell || '').trim();
      return val !== '' && val !== 'undefined';
    });
    if (!hasData) continue;

    // Convert all cells to strings, maintaining column alignment with headers
    const rowData: string[] = [];
    for (let j = 0; j < headers.length; j++) {
      const cellValue = dataRow[j];
      if (typeof cellValue === 'number') {
        rowData.push(cellValue.toString());
      } else {
        rowData.push(String(cellValue || '').trim());
      }
    }
    rows.push(rowData);
  }

  return { headers, rows };
}

/**
 * Parse CSV content handling quoted fields and escaped quotes
 */
function parseCsvContent(content: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  // Handle different line endings and quoted fields
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentLine += char;
    }
  }

  // Add last line if present
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse each line into fields
  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    return fields;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

/**
 * Auto-detect column mappings based on header names
 */
function autoDetectMappings(headers: string[]): Map<string, keyof CustomerInsightRow | null> {
  const mappings = new Map<string, keyof CustomerInsightRow | null>();

  const patterns: Record<keyof CustomerInsightRow, RegExp[]> = {
    customer_name: [/^(customer[_\s]?)?name$/i, /^insured$/i, /^client$/i, /^policyholder$/i],
    customer_email: [/^e?mail$/i, /^email[_\s]?address$/i],
    customer_phone: [/^phone$/i, /^tel(ephone)?$/i, /^mobile$/i, /^cell$/i],
    total_premium: [/^(total[_\s]?)?premium$/i, /^annualized[_\s]?premium$/i, /^annual[_\s]?premium$/i],
    total_policies: [/^(total[_\s]?)?polic(y|ies)$/i, /^policy[_\s]?count$/i, /^num[_\s]?policies$/i],
    products_held: [/^products?$/i, /^lines?$/i, /^coverage$/i, /^products?[_\s]?held$/i],
    tenure_years: [/^tenure$/i, /^years?$/i, /^tenure[_\s]?years?$/i, /^customer[_\s]?since$/i],
    retention_risk: [/^risk$/i, /^retention[_\s]?risk$/i, /^churn[_\s]?risk$/i],
    upcoming_renewal: [/^renewal$/i, /^renewal[_\s]?date$/i, /^next[_\s]?renewal$/i, /^expir(y|ation)$/i],
  };

  for (const header of headers) {
    let matched = false;
    for (const [field, regexList] of Object.entries(patterns)) {
      if (regexList.some(regex => regex.test(header))) {
        mappings.set(header, field as keyof CustomerInsightRow);
        matched = true;
        break;
      }
    }
    if (!matched) {
      mappings.set(header, null);
    }
  }

  return mappings;
}

/**
 * Validate and transform a single row based on mappings
 */
function transformRow(
  row: string[],
  headers: string[],
  mappings: Map<string, keyof CustomerInsightRow | null>
): { data: CustomerInsightRow; errors: CsvValidationError[]; rowIndex: number } {
  const data: Partial<CustomerInsightRow> = {};
  const errors: CsvValidationError[] = [];

  headers.forEach((header, colIndex) => {
    const field = mappings.get(header);
    if (!field) return;

    const value = row[colIndex]?.trim() || '';
    const fieldConfig = CUSTOMER_INSIGHT_FIELDS[field];

    if (!value && fieldConfig.required) {
      errors.push({
        row: 0, // Will be set by caller
        column: header,
        message: `Required field "${fieldConfig.label}" is empty`,
      });
      return;
    }

    if (!value) return;

    try {
      switch (fieldConfig.type) {
        case 'string':
          (data as Record<string, unknown>)[field] = value;
          break;

        case 'number': {
          const num = parseFloat(value.replace(/[$,]/g, ''));
          if (isNaN(num)) {
            errors.push({
              row: 0,
              column: header,
              message: `Invalid number "${value}" for field "${fieldConfig.label}"`,
            });
          } else {
            (data as Record<string, unknown>)[field] = num;
          }
          break;
        }

        case 'date': {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              row: 0,
              column: header,
              message: `Invalid date "${value}" for field "${fieldConfig.label}"`,
            });
          } else {
            (data as Record<string, unknown>)[field] = date.toISOString().split('T')[0];
          }
          break;
        }

        case 'array': {
          // Handle comma-separated or semicolon-separated values
          const items = value.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          (data as Record<string, unknown>)[field] = items;
          break;
        }

        case 'enum': {
          const normalized = value.toLowerCase();
          if (fieldConfig.enumValues?.includes(normalized)) {
            (data as Record<string, unknown>)[field] = normalized;
          } else {
            errors.push({
              row: 0,
              column: header,
              message: `Invalid value "${value}" for "${fieldConfig.label}". Expected: ${fieldConfig.enumValues?.join(', ')}`,
            });
          }
          break;
        }
      }
    } catch {
      errors.push({
        row: 0,
        column: header,
        message: `Failed to parse "${value}" for field "${fieldConfig.label}"`,
      });
    }
  });

  return { data: data as CustomerInsightRow, errors, rowIndex: 0 };
}

// ============================================================================
// Hook
// ============================================================================

export interface UseCsvUploadOptions {
  onSuccess?: (result: CsvUploadResult) => void;
  onError?: (error: Error) => void;
}

export function useCsvUpload(options: UseCsvUploadOptions = {}) {
  const { onSuccess, onError } = options;

  // State
  const [state, setState] = useState<CsvUploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Map<string, keyof CustomerInsightRow | null>>(new Map());
  const [validationErrors, setValidationErrors] = useState<CsvValidationError[]>([]);
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state
  const isMountedRef = useRef(true);

  /**
   * Validate file before parsing
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const extension = file.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension) && !ALLOWED_TYPES.includes(file.type)) {
      return 'Supported formats: CSV, Excel (.xlsx, .xls)';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit`;
    }

    // Check file is not empty
    if (file.size === 0) {
      return 'File is empty';
    }

    return null;
  }, []);

  /**
   * Parse CSV or Excel file and auto-detect mappings
   */
  const parseFile = useCallback(async (selectedFile: File): Promise<boolean> => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setState('error');
      return false;
    }

    setState('parsing');
    setError(null);
    setFile(selectedFile);

    try {
      let headers: string[];
      let rows: string[][];

      if (isExcelFile(selectedFile.name)) {
        // Parse Excel file using xlsx library
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(selectedFile);
        });

        const result = parseExcelContent(buffer);
        headers = result.headers;
        rows = result.rows;
      } else {
        // Parse CSV file as text
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(selectedFile);
        });

        const result = parseCsvContent(content);
        headers = result.headers;
        rows = result.rows;
      }

      if (headers.length === 0) {
        throw new Error('No headers found in file');
      }

      if (rows.length === 0) {
        throw new Error('No data rows found in file');
      }

      if (isMountedRef.current) {
        setParsedData({
          headers,
          rows,
          totalRows: rows.length,
        });

        // Auto-detect column mappings
        const detected = autoDetectMappings(headers);
        setColumnMappings(detected);

        setState('mapped');
      }

      return true;
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to parse file';
        setError(message);
        setState('error');
        onError?.(err instanceof Error ? err : new Error(message));
      }
      return false;
    }
  }, [validateFile, onError]);

  /**
   * Update a column mapping
   */
  const updateMapping = useCallback((csvColumn: string, dbField: keyof CustomerInsightRow | null) => {
    setColumnMappings(prev => {
      const next = new Map(prev);
      next.set(csvColumn, dbField);
      return next;
    });
  }, []);

  /**
   * Validate all rows before upload
   */
  const validateData = useCallback((): CsvValidationError[] => {
    if (!parsedData) return [];

    const errors: CsvValidationError[] = [];

    // Check if customer_name is mapped
    const hasNameMapping = Array.from(columnMappings.values()).includes('customer_name');
    if (!hasNameMapping) {
      errors.push({
        row: 0,
        column: 'customer_name',
        message: 'Customer Name field must be mapped to a CSV column',
      });
      return errors;
    }

    // Validate each row
    parsedData.rows.forEach((row, rowIndex) => {
      const { errors: rowErrors } = transformRow(row, parsedData.headers, columnMappings);
      rowErrors.forEach(err => {
        errors.push({ ...err, row: rowIndex + 2 }); // +2 for 1-indexed and header row
      });
    });

    setValidationErrors(errors);
    return errors;
  }, [parsedData, columnMappings]);

  /**
   * Upload data to API
   */
  const upload = useCallback(async (): Promise<CsvUploadResult | null> => {
    if (!parsedData) {
      setError('No data to upload');
      return null;
    }

    // Validate data first
    const errors = validateData();
    if (errors.length > 0) {
      // Allow upload with warnings, but show them
      setValidationErrors(errors);
    }

    setState('uploading');
    setProgress(0);
    setError(null);

    try {
      // Transform all rows
      const transformedRows: CustomerInsightRow[] = [];
      const transformErrors: CsvValidationError[] = [];

      parsedData.rows.forEach((row, rowIndex) => {
        const { data, errors: rowErrors } = transformRow(row, parsedData.headers, columnMappings);

        // Only include rows that have required customer_name
        if (data.customer_name) {
          transformedRows.push(data);
        } else {
          rowErrors.push({
            row: rowIndex + 2,
            column: 'customer_name',
            message: 'Missing required customer name',
          });
        }

        transformErrors.push(...rowErrors.map(e => ({ ...e, row: rowIndex + 2 })));
      });

      if (transformedRows.length === 0) {
        throw new Error('No valid rows to upload. Ensure Customer Name is mapped correctly.');
      }

      // Simulate progress updates during upload
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Make API call
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers: transformedRows,
          fileName: file?.name,
        }),
      });

      clearInterval(progressInterval);

      const apiResponse: ApiImportResponse = await response.json();

      if (!response.ok) {
        throw new Error(apiResponse.errors?.[0]?.message || `Upload failed with status ${response.status}`);
      }

      // Transform API response to our result format
      const result: CsvUploadResult = {
        success: apiResponse.success,
        recordsCreated: apiResponse.imported,
        recordsUpdated: 0, // API does not update, only inserts
        recordsSkipped: apiResponse.duplicates,
        recordsFailed: apiResponse.errors.length,
        errors: apiResponse.errors.map(e => ({
          row: e.row,
          column: '',
          message: e.message,
        })),
      };

      if (isMountedRef.current) {
        setProgress(100);
        setUploadResult(result);
        setState('success');
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to upload data';
        setError(message);
        setState('error');
        onError?.(err instanceof Error ? err : new Error(message));
      }
      return null;
    }
  }, [parsedData, columnMappings, file, validateData, onSuccess, onError]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState('idle');
    setFile(null);
    setParsedData(null);
    setColumnMappings(new Map());
    setValidationErrors([]);
    setUploadResult(null);
    setProgress(0);
    setError(null);
  }, []);

  /**
   * Get preview rows (first N rows)
   */
  const getPreviewRows = useCallback((count: number = PREVIEW_ROWS): string[][] => {
    if (!parsedData) return [];
    return parsedData.rows.slice(0, count);
  }, [parsedData]);

  /**
   * Check if mappings are valid for upload
   */
  const isMappingValid = useCallback((): boolean => {
    return Array.from(columnMappings.values()).includes('customer_name');
  }, [columnMappings]);

  return {
    // State
    state,
    file,
    parsedData,
    columnMappings,
    validationErrors,
    uploadResult,
    progress,
    error,

    // Actions
    parseFile,
    updateMapping,
    validateData,
    upload,
    reset,

    // Utilities
    getPreviewRows,
    isMappingValid,
    validateFile,

    // Constants
    CUSTOMER_INSIGHT_FIELDS,
    MAX_FILE_SIZE,
    PREVIEW_ROWS,
  };
}

export default useCsvUpload;
