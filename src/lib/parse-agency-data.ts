/**
 * Parse Agency Data
 * TypeScript port of bealer-lead-model/src/parse_derrick_data.py
 *
 * Extract real metrics: loss ratios, commission timing, customer segmentation, etc.
 *
 * Source: /Users/adrianstier/bealer-lead-model/src/parse_derrick_data.py
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// Source: parse_derrick_data.py lines 1-16
// ============================================================================

/**
 * Configuration for data directories
 * Source: parse_derrick_data.py lines 14-15
 */
export interface DataDirectoryConfig {
  dataDir: string;
  brittneyDir: string;
}

/**
 * Parsed Excel/CSV data row - generic record type
 */
export type DataRow = Record<string, string | number | boolean | null>;

/**
 * Parsed DataFrame equivalent - array of data rows with column metadata
 */
export interface DataFrame {
  rows: DataRow[];
  columns: string[];
  rowCount: number;
}

/**
 * Column analysis result for identifying column types
 * Source: parse_derrick_data.py lines 49-58 (column identification pattern)
 */
export interface ColumnAnalysis {
  premiumColumns: string[];
  claimsColumns: string[];
  policyColumns: string[];
  customerColumns: string[];
  productColumns: string[];
  retentionColumns: string[];
  growthColumns: string[];
  statusColumns: string[];
}

/**
 * Numeric column statistics
 * Source: parse_derrick_data.py lines 61-66, 122-127
 */
export interface NumericStats {
  columnName: string;
  total: number;
  average: number;
  median: number;
  count: number;
}

/**
 * Value counts result (equivalent to pandas value_counts)
 * Source: parse_derrick_data.py lines 116, 137, 257, 308
 */
export interface ValueCounts {
  [value: string]: number;
}

/**
 * Products per customer analysis
 * Source: parse_derrick_data.py lines 131-137
 */
export interface ProductsPerCustomerAnalysis {
  average: number;
  median: number;
  distribution: ValueCounts;
}

/**
 * Premium analysis result
 * Source: parse_derrick_data.py lines 119-127, 294-302
 */
export interface PremiumAnalysis {
  columnName: string;
  total: number;
  average: number;
  median: number;
  count?: number;
}

/**
 * Claims data parsing result
 * Source: parse_derrick_data.py lines 18-71
 */
export interface ClaimsDataResult {
  fileName: string;
  rowCount: number;
  columns: string[];
  columnAnalysis: ColumnAnalysis;
  numericTotals: NumericStats[];
  sampleRows: DataRow[];
}

/**
 * All Purpose Audit parsing result
 * Source: parse_derrick_data.py lines 74-145
 */
export interface AllPurposeAuditResult {
  fileName: string;
  rowCount: number;
  columns: string[];
  uniqueCustomers: number;
  productDistribution: Record<string, ValueCounts>;
  premiumAnalysis: PremiumAnalysis[];
  productsPerCustomer: ProductsPerCustomerAnalysis;
  dataFrame: DataFrame;
}

/**
 * Business metrics parsing result
 * Source: parse_derrick_data.py lines 148-180
 */
export interface BusinessMetricsResult {
  fileName: string;
  sheets: SheetData[];
}

/**
 * Single sheet data
 * Source: parse_derrick_data.py lines 168-174
 */
export interface SheetData {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  sampleRows: DataRow[];
  dataFrame: DataFrame;
}

/**
 * Policy Growth & Retention parsing result
 * Source: parse_derrick_data.py lines 183-222
 */
export interface PolicyGrowthRetentionResult {
  fileName: string;
  rowCount: number;
  columns: string[];
  retentionColumns: string[];
  growthColumns: string[];
  sampleRows: DataRow[];
  dataFrame: DataFrame;
}

/**
 * Renewal Audit parsing result
 * Source: parse_derrick_data.py lines 225-263
 */
export interface RenewalAuditResult {
  fileName: string;
  rowCount: number;
  columns: string[];
  renewalStatusDistribution: ValueCounts;
  sampleRows: DataRow[];
  dataFrame: DataFrame;
}

/**
 * New Business Details parsing result
 * Source: parse_derrick_data.py lines 266-314
 */
export interface NewBusinessDetailsResult {
  fileName: string;
  rowCount: number;
  columns: string[];
  premiumAnalysis: PremiumAnalysis[];
  productTypeDistribution: ValueCounts;
  sampleRows: DataRow[];
  dataFrame: DataFrame;
}

/**
 * Comprehensive summary report
 * Source: parse_derrick_data.py lines 317-361
 */
export interface SummaryReport {
  filesAnalyzed: string[];
  keyMetrics: Record<string, number | string>;
  dataQuality: Record<string, string>;
  recommendations: string[];
  claimsData: ClaimsDataResult | null;
  auditData: AllPurposeAuditResult | null;
  metricsData: BusinessMetricsResult | null;
  growthData: PolicyGrowthRetentionResult | null;
  renewalData: RenewalAuditResult | null;
  newBizData: NewBusinessDetailsResult | null;
}

// ============================================================================
// CONSTANTS
// Source: parse_derrick_data.py lines 14-15
// ============================================================================

/**
 * Default data directory paths
 * Source: parse_derrick_data.py lines 14-15
 */
export const DEFAULT_DATA_DIR = 'data/04_raw_reports';
export const DEFAULT_BRITTNEY_DIR = 'data/07_brittney_bealer';

/**
 * Claims files to check
 * Source: parse_derrick_data.py lines 26-29
 */
export const CLAIMS_FILES = [
  '2025-10_Claims_Detail_Report.xlsx',
  '24MM Adjusted Paid Loss Detail Report_All_Oct-2025.xlsx'
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a file exists
 * Source: parse_derrick_data.py lines 31, 83-84, 157-158, etc. (file existence checks)
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Read Excel file and return as DataFrame
 * Source: parse_derrick_data.py lines 39, 91, 170, 199, 241, 282 (pd.read_excel calls)
 */
export function readExcelFile(
  filePath: string,
  sheetIndex: number = 0
): DataFrame {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
    defval: null,
    raw: false
  });

  // Get column names from first row or sheet range
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const columns: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = worksheet[cellAddress];
    columns.push(cell ? String(cell.v) : `Column${col}`);
  }

  return {
    rows: jsonData,
    columns,
    rowCount: jsonData.length
  };
}

/**
 * Read Excel file and return all sheets
 * Source: parse_derrick_data.py lines 165-166 (pd.ExcelFile and sheet_names)
 */
export function readExcelFileAllSheets(filePath: string): {
  sheetNames: string[];
  sheets: Record<string, DataFrame>
} {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const sheets: Record<string, DataFrame> = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
      defval: null,
      raw: false
    });

    // Get column names
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const columns: string[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      columns.push(cell ? String(cell.v) : `Column${col}`);
    }

    sheets[sheetName] = {
      rows: jsonData,
      columns,
      rowCount: jsonData.length
    };
  }

  return { sheetNames, sheets };
}

/**
 * Get columns matching search terms (case-insensitive)
 * Source: parse_derrick_data.py lines 52-58, 104-110, 119, 209-216, 254, 295, 305
 */
export function findMatchingColumns(
  columns: string[],
  searchTerms: string[]
): string[] {
  return columns.filter(col =>
    searchTerms.some(term => col.toLowerCase().includes(term.toLowerCase()))
  );
}

/**
 * Analyze columns to identify their types
 * Source: parse_derrick_data.py lines 49-58 (column identification pattern)
 */
export function analyzeColumns(columns: string[]): ColumnAnalysis {
  return {
    premiumColumns: findMatchingColumns(columns, ['premium', 'prem', 'written']),
    claimsColumns: findMatchingColumns(columns, ['claim', 'loss', 'paid', 'incurred']),
    policyColumns: findMatchingColumns(columns, ['policy', 'type', 'product', 'line']),
    customerColumns: findMatchingColumns(columns, ['customer', 'insured', 'name', 'account']),
    productColumns: findMatchingColumns(columns, ['product', 'policy', 'type', 'line']),
    retentionColumns: findMatchingColumns(columns, ['retention', 'lapse', 'cancel', 'renewal']),
    growthColumns: findMatchingColumns(columns, ['growth', 'new', 'net']),
    statusColumns: findMatchingColumns(columns, ['status', 'result', 'outcome'])
  };
}

/**
 * Check if a value is numeric
 * Source: parse_derrick_data.py line 61 (df.select_dtypes(include=[np.number]))
 */
export function isNumeric(value: unknown): value is number {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[,$]/g, ''));
    return !isNaN(parsed);
  }
  return false;
}

/**
 * Parse a value as number
 */
export function parseNumeric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[,$]/g, '')) || 0;
  }
  return 0;
}

/**
 * Get numeric columns from DataFrame
 * Source: parse_derrick_data.py line 61 (df.select_dtypes(include=[np.number]).columns)
 */
export function getNumericColumns(df: DataFrame): string[] {
  if (df.rows.length === 0) return [];

  return df.columns.filter(col => {
    // Check first few non-null values
    const values = df.rows
      .slice(0, 10)
      .map(row => row[col])
      .filter(v => v !== null && v !== undefined && v !== '');

    return values.length > 0 && values.every(v => isNumeric(v));
  });
}

/**
 * Calculate column sum
 * Source: parse_derrick_data.py lines 65-66, 125, 300
 */
export function columnSum(df: DataFrame, columnName: string): number {
  return df.rows.reduce((sum, row) => {
    const value = row[columnName];
    return sum + parseNumeric(value);
  }, 0);
}

/**
 * Calculate column average
 * Source: parse_derrick_data.py lines 126, 301
 */
export function columnMean(df: DataFrame, columnName: string): number {
  const validValues = df.rows
    .map(row => row[columnName])
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => parseNumeric(v));

  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

/**
 * Calculate column median
 * Source: parse_derrick_data.py lines 127, 135
 */
export function columnMedian(df: DataFrame, columnName: string): number {
  const validValues = df.rows
    .map(row => row[columnName])
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => parseNumeric(v))
    .sort((a, b) => a - b);

  if (validValues.length === 0) return 0;

  const mid = Math.floor(validValues.length / 2);
  return validValues.length % 2 !== 0
    ? validValues[mid]
    : (validValues[mid - 1] + validValues[mid]) / 2;
}

/**
 * Count unique values in a column
 * Source: parse_derrick_data.py line 106 (df[col].nunique())
 */
export function countUnique(df: DataFrame, columnName: string): number {
  const values = new Set(
    df.rows
      .map(row => row[columnName])
      .filter(v => v !== null && v !== undefined && v !== '')
  );
  return values.size;
}

/**
 * Get value counts for a column (equivalent to pandas value_counts)
 * Source: parse_derrick_data.py lines 116, 137, 257, 308
 */
export function valueCounts(df: DataFrame, columnName: string): ValueCounts {
  const counts: ValueCounts = {};

  for (const row of df.rows) {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== '') {
      const key = String(value);
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Get top N value counts sorted by count descending
 * Source: parse_derrick_data.py lines 116 (.head(10))
 */
export function valueCountsTopN(df: DataFrame, columnName: string, n: number = 10): ValueCounts {
  const counts = valueCounts(df, columnName);

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

  return Object.fromEntries(sorted);
}

/**
 * Group by column and count
 * Source: parse_derrick_data.py lines 132-133 (df.groupby(customer_col).size())
 */
export function groupByCount(df: DataFrame, groupColumn: string): ValueCounts {
  const counts: ValueCounts = {};

  for (const row of df.rows) {
    const key = String(row[groupColumn] ?? '');
    if (key) {
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Calculate statistics on group counts
 * Source: parse_derrick_data.py lines 134-137
 */
export function groupCountStats(counts: ValueCounts): { average: number; median: number } {
  const values = Object.values(counts);

  if (values.length === 0) {
    return { average: 0, median: 0 };
  }

  const average = values.reduce((a, b) => a + b, 0) / values.length;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  return { average, median };
}

/**
 * Get first N rows of DataFrame
 * Source: parse_derrick_data.py lines 46, 98, 174, 206, 248, 289 (.head())
 */
export function head(df: DataFrame, n: number = 5): DataRow[] {
  return df.rows.slice(0, n);
}

/**
 * Count rows matching a condition
 * Source: parse_derrick_data.py line 302 (len(df[df[col] > 0]))
 */
export function countWhere(
  df: DataFrame,
  columnName: string,
  predicate: (value: unknown) => boolean
): number {
  return df.rows.filter(row => predicate(row[columnName])).length;
}

// ============================================================================
// MAIN PARSING FUNCTIONS
// Source: parse_derrick_data.py lines 18-361
// ============================================================================

/**
 * Parse claims data for loss ratios
 * Source: parse_derrick_data.py lines 18-71
 *
 * @param dataDir - Directory containing claims files
 * @returns ClaimsDataResult or null if no files found
 */
export function parseClaimsData(
  dataDir: string = DEFAULT_DATA_DIR
): ClaimsDataResult | null {
  // Source: parse_derrick_data.py lines 26-29
  const claimsFiles = CLAIMS_FILES.map(f => path.join(dataDir, f));

  // Source: parse_derrick_data.py lines 31-69
  for (const claimsFile of claimsFiles) {
    if (!fileExists(claimsFile)) {
      continue;
    }

    try {
      // Source: parse_derrick_data.py line 39
      const df = readExcelFile(claimsFile);

      // Source: parse_derrick_data.py lines 49-58
      const columnAnalysis = analyzeColumns(df.columns);

      // Source: parse_derrick_data.py lines 61-66
      const numericCols = getNumericColumns(df);
      const numericTotals: NumericStats[] = numericCols.slice(0, 5).map(col => ({
        columnName: col,
        total: columnSum(df, col),
        average: columnMean(df, col),
        median: columnMedian(df, col),
        count: df.rowCount
      }));

      return {
        fileName: path.basename(claimsFile),
        rowCount: df.rowCount,
        columns: df.columns.slice(0, 10),
        columnAnalysis,
        numericTotals,
        sampleRows: head(df, 5)
      };

    } catch (error) {
      // Source: parse_derrick_data.py lines 68-69
      console.error(`Error reading ${path.basename(claimsFile)}:`, error);
    }
  }

  // Source: parse_derrick_data.py line 71
  return null;
}

/**
 * Parse All Purpose Audit for customer portfolio
 * Source: parse_derrick_data.py lines 74-145
 *
 * @param dataDir - Directory containing audit file
 * @returns AllPurposeAuditResult or null if file not found
 */
export function parseAllPurposeAudit(
  dataDir: string = DEFAULT_DATA_DIR
): AllPurposeAuditResult | null {
  // Source: parse_derrick_data.py line 81
  const auditFile = path.join(dataDir, 'All_Purpose_Audit.xlsx');

  // Source: parse_derrick_data.py lines 83-85
  if (!fileExists(auditFile)) {
    console.error(`File not found: ${auditFile}`);
    return null;
  }

  try {
    // Source: parse_derrick_data.py line 91
    const df = readExcelFile(auditFile);

    // Source: parse_derrick_data.py lines 104-107
    const columnAnalysis = analyzeColumns(df.columns);
    let uniqueCustomers = 0;

    if (columnAnalysis.customerColumns.length > 0) {
      uniqueCustomers = countUnique(df, columnAnalysis.customerColumns[0]);
    }

    // Source: parse_derrick_data.py lines 110-116
    const productDistribution: Record<string, ValueCounts> = {};
    for (const col of columnAnalysis.productColumns.slice(0, 2)) {
      productDistribution[col] = valueCountsTopN(df, col, 10);
    }

    // Source: parse_derrick_data.py lines 119-127
    const premiumAnalysis: PremiumAnalysis[] = [];
    for (const col of columnAnalysis.premiumColumns.slice(0, 2)) {
      const numericCols = getNumericColumns(df);
      if (numericCols.includes(col)) {
        premiumAnalysis.push({
          columnName: col,
          total: columnSum(df, col),
          average: columnMean(df, col),
          median: columnMedian(df, col)
        });
      }
    }

    // Source: parse_derrick_data.py lines 130-137
    let productsPerCustomer: ProductsPerCustomerAnalysis = {
      average: 0,
      median: 0,
      distribution: {}
    };

    if (columnAnalysis.customerColumns.length > 0 && df.rowCount > 0) {
      const customerCol = columnAnalysis.customerColumns[0];
      const groupCounts = groupByCount(df, customerCol);
      const stats = groupCountStats(groupCounts);

      // Get distribution of products per customer
      const countDistribution: ValueCounts = {};
      for (const count of Object.values(groupCounts)) {
        const key = String(count);
        countDistribution[key] = (countDistribution[key] || 0) + 1;
      }

      // Sort by key (number of products) and take top 10
      const sortedDistribution = Object.entries(countDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .slice(0, 10);

      productsPerCustomer = {
        average: stats.average,
        median: stats.median,
        distribution: Object.fromEntries(sortedDistribution)
      };
    }

    // Source: parse_derrick_data.py line 139
    return {
      fileName: 'All_Purpose_Audit.xlsx',
      rowCount: df.rowCount,
      columns: df.columns.slice(0, 15),
      uniqueCustomers,
      productDistribution,
      premiumAnalysis,
      productsPerCustomer,
      dataFrame: df
    };

  } catch (error) {
    // Source: parse_derrick_data.py lines 141-145
    console.error('Error parsing All Purpose Audit:', error);
    return null;
  }
}

/**
 * Parse business metrics for commission timing and other details
 * Source: parse_derrick_data.py lines 148-180
 *
 * @param dataDir - Directory containing metrics file
 * @returns BusinessMetricsResult or null if file not found
 */
export function parseBusinessMetrics(
  dataDir: string = DEFAULT_DATA_DIR
): BusinessMetricsResult | null {
  // Source: parse_derrick_data.py line 155
  const metricsFile = path.join(dataDir, '2025-11-14_Business_Metrics.xlsx');

  // Source: parse_derrick_data.py lines 157-159
  if (!fileExists(metricsFile)) {
    console.error(`File not found: ${metricsFile}`);
    return null;
  }

  try {
    // Source: parse_derrick_data.py lines 165-166
    const { sheetNames, sheets } = readExcelFileAllSheets(metricsFile);

    // Source: parse_derrick_data.py lines 168-174
    const sheetDataArray: SheetData[] = sheetNames.map(sheetName => {
      const df = sheets[sheetName];
      return {
        sheetName,
        rowCount: df.rowCount,
        columnCount: df.columns.length,
        columns: df.columns,
        sampleRows: head(df, 5),
        dataFrame: df
      };
    });

    // Source: parse_derrick_data.py line 176
    return {
      fileName: '2025-11-14_Business_Metrics.xlsx',
      sheets: sheetDataArray
    };

  } catch (error) {
    // Source: parse_derrick_data.py lines 178-180
    console.error('Error parsing Business Metrics:', error);
    return null;
  }
}

/**
 * Parse policy growth and retention report
 * Source: parse_derrick_data.py lines 183-222
 *
 * @param dataDir - Directory containing report file
 * @returns PolicyGrowthRetentionResult or null if file not found
 */
export function parsePolicyGrowthRetention(
  dataDir: string = DEFAULT_DATA_DIR
): PolicyGrowthRetentionResult | null {
  // Source: parse_derrick_data.py line 190
  const reportFile = path.join(dataDir, '2025-10_Policy_Growth_Retention_Report.xlsx');

  // Source: parse_derrick_data.py lines 192-194
  if (!fileExists(reportFile)) {
    console.error(`File not found: ${reportFile}`);
    return null;
  }

  try {
    // Source: parse_derrick_data.py line 199
    const df = readExcelFile(reportFile);

    // Source: parse_derrick_data.py lines 209-216
    const columnAnalysis = analyzeColumns(df.columns);

    // Source: parse_derrick_data.py line 218
    return {
      fileName: '2025-10_Policy_Growth_Retention_Report.xlsx',
      rowCount: df.rowCount,
      columns: df.columns,
      retentionColumns: columnAnalysis.retentionColumns,
      growthColumns: columnAnalysis.growthColumns,
      sampleRows: head(df, 10),
      dataFrame: df
    };

  } catch (error) {
    // Source: parse_derrick_data.py lines 220-222
    console.error('Error parsing Policy Growth & Retention:', error);
    return null;
  }
}

/**
 * Parse renewal audit report
 * Source: parse_derrick_data.py lines 225-263
 *
 * @param dataDir - Directory containing renewal audit file
 * @returns RenewalAuditResult or null if file not found
 */
export function parseRenewalAudit(
  dataDir: string = DEFAULT_DATA_DIR
): RenewalAuditResult | null {
  // Source: parse_derrick_data.py line 232
  const renewalFile = path.join(dataDir, 'Renewal_Audit_Report.xlsx');

  // Source: parse_derrick_data.py lines 234-236
  if (!fileExists(renewalFile)) {
    console.error(`File not found: ${renewalFile}`);
    return null;
  }

  try {
    // Source: parse_derrick_data.py line 241
    const df = readExcelFile(renewalFile);

    // Source: parse_derrick_data.py lines 254-257
    const columnAnalysis = analyzeColumns(df.columns);
    let renewalStatusDistribution: ValueCounts = {};

    if (columnAnalysis.statusColumns.length > 0) {
      renewalStatusDistribution = valueCounts(df, columnAnalysis.statusColumns[0]);
    }

    // Source: parse_derrick_data.py line 259
    return {
      fileName: 'Renewal_Audit_Report.xlsx',
      rowCount: df.rowCount,
      columns: df.columns,
      renewalStatusDistribution,
      sampleRows: head(df, 5),
      dataFrame: df
    };

  } catch (error) {
    // Source: parse_derrick_data.py lines 261-263
    console.error('Error parsing Renewal Audit:', error);
    return null;
  }
}

/**
 * Parse new business details from Brittney's folder
 * Source: parse_derrick_data.py lines 266-314
 *
 * @param brittneyDir - Directory containing new business file
 * @returns NewBusinessDetailsResult or null if file not found
 */
export function parseNewBusinessDetails(
  brittneyDir: string = DEFAULT_BRITTNEY_DIR
): NewBusinessDetailsResult | null {
  // Source: parse_derrick_data.py line 273
  const nbFile = path.join(brittneyDir, 'New Business Details_1764017841226.xlsx');

  // Source: parse_derrick_data.py lines 275-277
  if (!fileExists(nbFile)) {
    console.error(`File not found: ${nbFile}`);
    return null;
  }

  try {
    // Source: parse_derrick_data.py line 282
    const df = readExcelFile(nbFile);

    const columnAnalysis = analyzeColumns(df.columns);

    // Source: parse_derrick_data.py lines 294-302
    const premiumAnalysis: PremiumAnalysis[] = [];
    for (const col of columnAnalysis.premiumColumns.slice(0, 2)) {
      const numericCols = getNumericColumns(df);
      if (numericCols.includes(col)) {
        premiumAnalysis.push({
          columnName: col,
          total: columnSum(df, col),
          average: columnMean(df, col),
          median: columnMedian(df, col),
          count: countWhere(df, col, (v) => parseNumeric(v) > 0)
        });
      }
    }

    // Source: parse_derrick_data.py lines 305-308
    let productTypeDistribution: ValueCounts = {};
    if (columnAnalysis.productColumns.length > 0) {
      productTypeDistribution = valueCounts(df, columnAnalysis.productColumns[0]);
    }

    // Source: parse_derrick_data.py line 310
    return {
      fileName: 'New Business Details_1764017841226.xlsx',
      rowCount: df.rowCount,
      columns: df.columns,
      premiumAnalysis,
      productTypeDistribution,
      sampleRows: head(df, 5),
      dataFrame: df
    };

  } catch (error) {
    // Source: parse_derrick_data.py lines 312-314
    console.error('Error parsing New Business Details:', error);
    return null;
  }
}

/**
 * Generate comprehensive summary of all parsed data
 * Source: parse_derrick_data.py lines 317-361
 *
 * @param config - Data directory configuration
 * @returns SummaryReport with all parsed data and recommendations
 */
export function generateSummaryReport(
  config: DataDirectoryConfig = {
    dataDir: DEFAULT_DATA_DIR,
    brittneyDir: DEFAULT_BRITTNEY_DIR
  }
): SummaryReport {
  const { dataDir, brittneyDir } = config;

  // Source: parse_derrick_data.py lines 324-328
  const summary: SummaryReport = {
    filesAnalyzed: [],
    keyMetrics: {},
    dataQuality: {},
    recommendations: [
      // Source: parse_derrick_data.py lines 354-359
      '1. Extract loss ratios from claims data',
      '2. Segment customers from All Purpose Audit (Elite/Premium/Standard/Low-Value)',
      '3. Calculate actual retention rates from renewal data',
      '4. Analyze new business conversion patterns',
      '5. Update Phase 1 models with actual data'
    ],
    claimsData: null,
    auditData: null,
    metricsData: null,
    growthData: null,
    renewalData: null,
    newBizData: null
  };

  // Source: parse_derrick_data.py lines 332-337
  summary.claimsData = parseClaimsData(dataDir);
  summary.auditData = parseAllPurposeAudit(dataDir);
  summary.metricsData = parseBusinessMetrics(dataDir);
  summary.growthData = parsePolicyGrowthRetention(dataDir);
  summary.renewalData = parseRenewalAudit(dataDir);
  summary.newBizData = parseNewBusinessDetails(brittneyDir);

  // Source: parse_derrick_data.py lines 344-352
  if (summary.auditData) {
    summary.filesAnalyzed.push(`All Purpose Audit: ${summary.auditData.rowCount.toLocaleString()} rows`);
    summary.keyMetrics['uniqueCustomers'] = summary.auditData.uniqueCustomers;
  }
  if (summary.growthData) {
    summary.filesAnalyzed.push(`Policy Growth & Retention: ${summary.growthData.rowCount.toLocaleString()} rows`);
  }
  if (summary.renewalData) {
    summary.filesAnalyzed.push(`Renewal Audit: ${summary.renewalData.rowCount.toLocaleString()} rows`);
  }
  if (summary.newBizData) {
    summary.filesAnalyzed.push(`New Business Details: ${summary.newBizData.rowCount.toLocaleString()} rows`);
  }

  return summary;
}

// ============================================================================
// BROWSER-COMPATIBLE FUNCTIONS (for client-side use)
// These functions work with pre-parsed data or ArrayBuffer input
// ============================================================================

/**
 * Parse Excel file from ArrayBuffer (browser-compatible)
 * Use this when reading files from file input or fetch
 */
export function parseExcelFromBuffer(
  buffer: ArrayBuffer,
  sheetIndex: number = 0
): DataFrame {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
    defval: null,
    raw: false
  });

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const columns: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = worksheet[cellAddress];
    columns.push(cell ? String(cell.v) : `Column${col}`);
  }

  return {
    rows: jsonData,
    columns,
    rowCount: jsonData.length
  };
}

/**
 * Parse all sheets from Excel ArrayBuffer (browser-compatible)
 */
export function parseExcelAllSheetsFromBuffer(buffer: ArrayBuffer): {
  sheetNames: string[];
  sheets: Record<string, DataFrame>;
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const sheets: Record<string, DataFrame> = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
      defval: null,
      raw: false
    });

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const columns: string[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      columns.push(cell ? String(cell.v) : `Column${col}`);
    }

    sheets[sheetName] = {
      rows: jsonData,
      columns,
      rowCount: jsonData.length
    };
  }

  return { sheetNames, sheets };
}

/**
 * Analyze a DataFrame for common agency data patterns
 * Browser-compatible version that works with pre-parsed data
 */
export function analyzeDataFrame(df: DataFrame): {
  columnAnalysis: ColumnAnalysis;
  numericColumns: string[];
  uniqueValuesPerColumn: Record<string, number>;
  sampleRows: DataRow[];
} {
  const columnAnalysis = analyzeColumns(df.columns);
  const numericColumns = getNumericColumns(df);

  const uniqueValuesPerColumn: Record<string, number> = {};
  for (const col of df.columns) {
    uniqueValuesPerColumn[col] = countUnique(df, col);
  }

  return {
    columnAnalysis,
    numericColumns,
    uniqueValuesPerColumn,
    sampleRows: head(df, 5)
  };
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

/**
 * All types and functions are exported inline with their definitions above.
 *
 * EXPORTED TYPES:
 * - DataDirectoryConfig
 * - DataRow
 * - DataFrame
 * - ColumnAnalysis
 * - NumericStats
 * - ValueCounts
 * - ProductsPerCustomerAnalysis
 * - PremiumAnalysis
 * - ClaimsDataResult
 * - AllPurposeAuditResult
 * - BusinessMetricsResult
 * - SheetData
 * - PolicyGrowthRetentionResult
 * - RenewalAuditResult
 * - NewBusinessDetailsResult
 * - SummaryReport
 *
 * EXPORTED CONSTANTS:
 * - DEFAULT_DATA_DIR
 * - DEFAULT_BRITTNEY_DIR
 * - CLAIMS_FILES
 *
 * EXPORTED UTILITY FUNCTIONS:
 * - fileExists
 * - readExcelFile
 * - readExcelFileAllSheets
 * - findMatchingColumns
 * - analyzeColumns
 * - isNumeric
 * - parseNumeric
 * - getNumericColumns
 * - columnSum
 * - columnMean
 * - columnMedian
 * - countUnique
 * - valueCounts
 * - valueCountsTopN
 * - groupByCount
 * - groupCountStats
 * - head
 * - countWhere
 *
 * EXPORTED PARSING FUNCTIONS:
 * - parseClaimsData
 * - parseAllPurposeAudit
 * - parseBusinessMetrics
 * - parsePolicyGrowthRetention
 * - parseRenewalAudit
 * - parseNewBusinessDetails
 * - generateSummaryReport
 *
 * EXPORTED BROWSER-COMPATIBLE FUNCTIONS:
 * - parseExcelFromBuffer
 * - parseExcelAllSheetsFromBuffer
 * - analyzeDataFrame
 */
