/**
 * Extract Real Metrics from Derrick's Data
 * Properly parse Excel files with header rows and extract actionable insights
 *
 * Ported from Python: /Users/adrianstier/bealer-lead-model/src/extract_real_metrics.py
 * Original Python file: 353 lines
 *
 * NOTE: This TypeScript port requires the 'xlsx' library for Excel file reading.
 * Install with: npm install xlsx
 *
 * @module extract-real-metrics
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// =============================================================================
// CONSTANTS
// Source: extract_real_metrics.py, lines 13-14
// =============================================================================

/** Directory containing raw report data files */
export const DATA_DIR = path.resolve('data/04_raw_reports');

/** Directory containing Brittney Bealer's data files */
export const BRITTNEY_DIR = path.resolve('data/07_brittney_bealer');

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a row from the Policy Growth & Retention Report
 * Source: extract_real_metrics.py, lines 17-80
 */
export interface PolicyRetentionRow {
  Status?: string;
  'Product Description'?: string;
  'Insured Name'?: string;
  [key: string]: string | number | undefined;
}

/**
 * Represents a row from the Renewal Audit Report
 * Source: extract_real_metrics.py, lines 83-157
 */
export interface RenewalAuditRow {
  'Renewal Status'?: string;
  'Product Name'?: string;
  'Premium New($)'?: number;
  'Premium Old($)'?: number;
  'Premium Change(%)'?: number;
  [key: string]: string | number | undefined;
}

/**
 * Represents a row from the New Business Details Report
 * Source: extract_real_metrics.py, lines 221-279
 */
export interface NewBusinessRow {
  Product?: string;
  'Transaction Type'?: string;
  'Item Count'?: number;
  [key: string]: string | number | undefined;
}

/**
 * Customer segmentation result
 * Source: extract_real_metrics.py, lines 206-212
 */
export interface CustomerSegmentation {
  totalCustomers: number;
  elite: number;
  premium: number;
  standard: number;
  productsPerCustomer: Map<string, number>;
}

/**
 * Premium change distribution analysis
 * Source: extract_real_metrics.py, lines 136-140
 */
export interface PremiumChangeDistribution {
  above20Percent: number;
  between10And20Percent: number;
  between0And10Percent: number;
  decrease: number;
}

/**
 * Premium change statistics
 * Source: extract_real_metrics.py, lines 126-140
 */
export interface PremiumChangeStats {
  averageChange: number;
  medianChange: number;
  maxIncrease: number;
  maxDecrease: number;
  distribution: PremiumChangeDistribution;
}

/**
 * Policy retention extraction result
 * Source: extract_real_metrics.py, lines 17-80
 */
export interface PolicyRetentionResult {
  data: PolicyRetentionRow[];
  totalPolicies: number;
  statusDistribution: Map<string, number>;
  productMix: Map<string, number>;
  activePolicies: number;
  retentionColumns: string[];
}

/**
 * Renewal audit extraction result
 * Source: extract_real_metrics.py, lines 83-157
 */
export interface RenewalAuditResult {
  data: RenewalAuditRow[];
  totalRenewals: number;
  statusDistribution: Map<string, number>;
  renewedCount: number;
  retentionRate: number;
  premiumChangeStats: PremiumChangeStats | null;
  productDistribution: Map<string, number>;
}

/**
 * New business extraction result
 * Source: extract_real_metrics.py, lines 221-279
 */
export interface NewBusinessResult {
  data: NewBusinessRow[];
  totalTransactions: number;
  productDistribution: Map<string, number>;
  transactionTypes: Map<string, number>;
  itemsPerTransaction: {
    average: number;
    median: number;
    distribution: Map<number, number>;
  } | null;
}

/**
 * Comprehensive summary result
 * Source: extract_real_metrics.py, lines 342-348
 */
export interface ComprehensiveSummary {
  retentionData: PolicyRetentionResult | null;
  renewalData: RenewalAuditResult | null;
  segmentation: CustomerSegmentation | null;
  newBizData: NewBusinessResult | null;
  insights: string[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Read an Excel file and return rows as array of objects
 * Equivalent to pandas read_excel with skiprows
 *
 * @param filePath - Path to the Excel file
 * @param skipRows - Number of header rows to skip (default: 0)
 * @returns Array of row objects
 */
function readExcel<T extends Record<string, unknown>>(
  filePath: string,
  skipRows: number = 0
): T[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON, skip header rows by using range option
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  range.s.r = skipRows; // Start row

  const data = XLSX.utils.sheet_to_json<T>(sheet, {
    range: range,
    defval: undefined,
  });

  // Clean column names (trim whitespace)
  // Source: extract_real_metrics.py, lines 33-34, 98-99, 172, 237
  return data.map((row) => {
    const cleanedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim();
      cleanedRow[cleanKey] = value;
    }
    return cleanedRow as T;
  });
}

/**
 * Calculate median of a numeric array
 * Equivalent to pandas Series.median()
 *
 * @param values - Array of numbers
 * @returns Median value
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Count occurrences of values in an array
 * Equivalent to pandas Series.value_counts()
 *
 * @param values - Array of values to count
 * @returns Map of value to count, sorted by count descending
 */
function valueCounts<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    if (value !== undefined && value !== null) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  // Sort by count descending
  return new Map(
    [...counts.entries()].sort((a, b) => b[1] - a[1])
  );
}

/**
 * Group array items by a key function
 * Equivalent to pandas DataFrame.groupby()
 *
 * @param items - Array of items to group
 * @param keyFn - Function to extract grouping key
 * @returns Map of key to array of items
 */
function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (key !== undefined && key !== null) {
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }
  }
  return groups;
}

/**
 * Format a number as percentage string
 *
 * @param value - Decimal value (0.85 = 85%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with commas
 *
 * @param value - Number to format
 * @returns Formatted string with commas
 */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

// =============================================================================
// EXTRACTION FUNCTIONS
// Source: extract_real_metrics.py, lines 17-279
// =============================================================================

/**
 * Extract real retention metrics from Policy Growth & Retention report
 *
 * Source: extract_real_metrics.py, lines 17-80
 *
 * @param customPath - Optional custom file path (for testing)
 * @returns PolicyRetentionResult or null on error
 */
export function extractPolicyRetentionData(
  customPath?: string
): PolicyRetentionResult | null {
  // Source: extract_real_metrics.py, lines 17-23
  console.log('='.repeat(80));
  console.log('EXTRACTING RETENTION METRICS');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, line 24
  const filePath = customPath || path.join(DATA_DIR, '2025-10_Policy_Growth_Retention_Report.xlsx');

  try {
    // Source: extract_real_metrics.py, line 28
    // Read Excel, skip header rows
    const df = readExcel<PolicyRetentionRow>(filePath, 6); // Skip the metadata rows

    // Source: extract_real_metrics.py, lines 30-31
    console.log(`\n  Loaded ${formatNumber(df.length)} policies`);
    const columns = Object.keys(df[0] || {}).slice(0, 15);
    console.log(`Columns: ${columns.join(', ')}`);

    // Source: extract_real_metrics.py, lines 37-39
    // Key columns for retention analysis
    const statusCol = 'Status';
    const productCol = 'Product Description';
    const retentionColumns = Object.keys(df[0] || {}).filter((c) =>
      c.includes('Retention')
    );

    // Source: extract_real_metrics.py, line 41
    console.log(`\nRetention columns found: ${retentionColumns.join(', ')}`);

    const totalPolicies = df.length;
    let statusDistribution = new Map<string, number>();
    let productMix = new Map<string, number>();
    let activePolicies = 0;

    // Source: extract_real_metrics.py, lines 44-57
    // Analyze policy status
    if (df.some((row) => row[statusCol] !== undefined)) {
      console.log(`\n   POLICY STATUS DISTRIBUTION:`);
      const statuses = df.map((row) => row[statusCol]).filter(Boolean) as string[];
      statusDistribution = valueCounts(statuses);

      let count = 0;
      for (const [status, statusCount] of statusDistribution.entries()) {
        if (count >= 10) break;
        const pct = (statusCount / totalPolicies) * 100;
        console.log(
          `   ${status.padEnd(30)} ${formatNumber(statusCount).padStart(6)} (${pct.toFixed(1).padStart(5)}%)`
        );
        count++;
      }

      // Source: extract_real_metrics.py, lines 54-57
      // Calculate retention metrics
      const activeStatuses = ['Active', 'Pending Renewal'];
      activePolicies = df.filter(
        (row) => row[statusCol] && activeStatuses.includes(row[statusCol] as string)
      ).length;

      console.log(
        `\n   ACTIVE POLICIES: ${formatNumber(activePolicies)} / ${formatNumber(totalPolicies)} = ${formatPercent(activePolicies / totalPolicies)}`
      );
    }

    // Source: extract_real_metrics.py, lines 59-66
    // Analyze by product
    if (df.some((row) => row[productCol] !== undefined)) {
      console.log(`\n   PRODUCT MIX:`);
      const products = df.map((row) => row[productCol]).filter(Boolean) as string[];
      productMix = valueCounts(products);

      let count = 0;
      for (const [product, productCount] of productMix.entries()) {
        if (count >= 15) break;
        const pct = (productCount / totalPolicies) * 100;
        console.log(
          `   ${product.padEnd(40)} ${formatNumber(productCount).padStart(5)} (${pct.toFixed(1).padStart(4)}%)`
        );
        count++;
      }
    }

    // Source: extract_real_metrics.py, lines 69-72
    // Extract retention numerator/denominator if available
    for (const col of retentionColumns) {
      const values = df.map((row) => row[col]).filter((v) => typeof v === 'number') as number[];
      if (values.length > 0) {
        const retentionSum = values.reduce((a, b) => a + b, 0);
        console.log(`\n   ${col}: ${formatNumber(retentionSum)}`);
      }
    }

    // Source: extract_real_metrics.py, line 74
    return {
      data: df,
      totalPolicies,
      statusDistribution,
      productMix,
      activePolicies,
      retentionColumns,
    };
  } catch (error) {
    // Source: extract_real_metrics.py, lines 76-80
    console.error(`   Error: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return null;
  }
}

/**
 * Extract renewal patterns and retention from Renewal Audit
 *
 * Source: extract_real_metrics.py, lines 83-157
 *
 * @param customPath - Optional custom file path (for testing)
 * @returns RenewalAuditResult or null on error
 */
export function extractRenewalAuditData(
  customPath?: string
): RenewalAuditResult | null {
  // Source: extract_real_metrics.py, lines 86-88
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTING RENEWAL AUDIT DATA');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, line 90
  const filePath = customPath || path.join(DATA_DIR, 'Renewal_Audit_Report.xlsx');

  try {
    // Source: extract_real_metrics.py, line 94
    // Read Excel, skip header rows
    const df = readExcel<RenewalAuditRow>(filePath, 3);

    // Source: extract_real_metrics.py, line 96
    console.log(`\n   Loaded ${formatNumber(df.length)} renewals`);

    // Source: extract_real_metrics.py, line 101
    const columns = Object.keys(df[0] || {}).slice(0, 20);
    console.log(`Columns: ${columns.join(', ')}`);

    // Source: extract_real_metrics.py, lines 103-108
    // Key columns
    const statusCol = 'Renewal Status';
    const productCol = 'Product Name';
    const premiumChangeCol = 'Premium Change(%)';

    const totalRenewals = df.length;
    let statusDistribution = new Map<string, number>();
    let renewedCount = 0;
    let retentionRate = 0;
    let premiumChangeStats: PremiumChangeStats | null = null;
    let productDistribution = new Map<string, number>();

    // Source: extract_real_metrics.py, lines 111-123
    // Analyze renewal status
    if (df.some((row) => row[statusCol] !== undefined)) {
      console.log(`\n   RENEWAL STATUS:`);
      const statuses = df.map((row) => row[statusCol]).filter(Boolean) as string[];
      statusDistribution = valueCounts(statuses);

      for (const [status, statusCount] of statusDistribution.entries()) {
        const pct = (statusCount / totalRenewals) * 100;
        console.log(
          `   ${status.padEnd(30)} ${formatNumber(statusCount).padStart(5)} (${pct.toFixed(1).padStart(5)}%)`
        );
      }

      // Source: extract_real_metrics.py, lines 121-123
      // Calculate retention rate
      const renewed = df.filter(
        (row) =>
          row[statusCol] &&
          (row[statusCol] as string).toLowerCase().includes('renewed')
      );
      renewedCount = renewed.length;
      retentionRate = renewedCount / totalRenewals;
      console.log(`\n   RENEWAL RETENTION RATE: ${formatPercent(retentionRate)}`);
    }

    // Source: extract_real_metrics.py, lines 126-140
    // Analyze premium changes (rate increases)
    if (df.some((row) => row[premiumChangeCol] !== undefined)) {
      const premiumChanges = df
        .map((row) => row[premiumChangeCol])
        .filter((v) => typeof v === 'number') as number[];

      if (premiumChanges.length > 0) {
        const avgChange = premiumChanges.reduce((a, b) => a + b, 0) / premiumChanges.length;
        const medianChange = calculateMedian(premiumChanges);
        const maxIncrease = Math.max(...premiumChanges);
        const maxDecrease = Math.min(...premiumChanges);

        // Source: extract_real_metrics.py, lines 129-134
        console.log(`\n   PREMIUM CHANGES (Rate Increases):`);
        console.log(`   Average Change: ${avgChange.toFixed(1)}%`);
        console.log(`   Median Change: ${medianChange.toFixed(1)}%`);
        console.log(`   Max Increase: ${maxIncrease.toFixed(1)}%`);
        console.log(`   Max Decrease: ${maxDecrease.toFixed(1)}%`);

        // Source: extract_real_metrics.py, lines 136-140
        // Distribution
        const distribution: PremiumChangeDistribution = {
          above20Percent: premiumChanges.filter((v) => v > 20).length,
          between10And20Percent: premiumChanges.filter((v) => v >= 10 && v <= 20).length,
          between0And10Percent: premiumChanges.filter((v) => v >= 0 && v < 10).length,
          decrease: premiumChanges.filter((v) => v < 0).length,
        };

        console.log(`\n   Distribution:`);
        console.log(`      >20% increase: ${distribution.above20Percent} policies`);
        console.log(`      10-20% increase: ${distribution.between10And20Percent} policies`);
        console.log(`      0-10% increase: ${distribution.between0And10Percent} policies`);
        console.log(`      Decrease: ${distribution.decrease} policies`);

        premiumChangeStats = {
          averageChange: avgChange,
          medianChange,
          maxIncrease,
          maxDecrease,
          distribution,
        };
      }
    }

    // Source: extract_real_metrics.py, lines 143-149
    // Analyze by product
    if (df.some((row) => row[productCol] !== undefined)) {
      console.log(`\n   RENEWALS BY PRODUCT:`);
      const products = df.map((row) => row[productCol]).filter(Boolean) as string[];
      productDistribution = valueCounts(products);

      let count = 0;
      for (const [product, productCount] of productDistribution.entries()) {
        if (count >= 10) break;
        const pct = (productCount / totalRenewals) * 100;
        console.log(
          `   ${product.padEnd(35)} ${formatNumber(productCount).padStart(4)} (${pct.toFixed(1).padStart(4)}%)`
        );
        count++;
      }
    }

    // Source: extract_real_metrics.py, line 151
    return {
      data: df,
      totalRenewals,
      statusDistribution,
      renewedCount,
      retentionRate,
      premiumChangeStats,
      productDistribution,
    };
  } catch (error) {
    // Source: extract_real_metrics.py, lines 153-157
    console.error(`   Error: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return null;
  }
}

/**
 * Extract customer portfolio and segment by value
 *
 * Source: extract_real_metrics.py, lines 160-218
 *
 * @param customPath - Optional custom file path (for testing)
 * @returns CustomerSegmentation or null on error
 */
export function extractCustomerSegmentation(
  customPath?: string
): CustomerSegmentation | null {
  // Source: extract_real_metrics.py, lines 163-165
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTING CUSTOMER SEGMENTATION');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, line 167
  const filePath = customPath || path.join(DATA_DIR, '2025-10_Policy_Growth_Retention_Report.xlsx');

  try {
    // Source: extract_real_metrics.py, lines 171-172
    // Use policy data to segment customers
    const df = readExcel<PolicyRetentionRow>(filePath, 6);

    // Source: extract_real_metrics.py, line 175
    // Group by customer (Insured Name)
    const customerCol = 'Insured Name';

    if (df.some((row) => row[customerCol] !== undefined)) {
      // Source: extract_real_metrics.py, lines 178-179
      // Count products per customer
      const customerGroups = groupBy(df, (row) => row[customerCol] as string);
      const customerProducts = new Map<string, number>();

      for (const [customer, policies] of customerGroups.entries()) {
        customerProducts.set(customer, policies.length);
      }

      const productCounts = [...customerProducts.values()];
      const totalCustomers = customerProducts.size;
      const avgProducts = productCounts.reduce((a, b) => a + b, 0) / totalCustomers;
      const medianProducts = calculateMedian(productCounts);

      // Source: extract_real_metrics.py, lines 181-185
      console.log(`\n   CUSTOMER ANALYSIS:`);
      console.log(`   Total Unique Customers: ${formatNumber(totalCustomers)}`);
      console.log(`   Total Policies: ${formatNumber(df.length)}`);
      console.log(`   Average Products/Customer: ${avgProducts.toFixed(2)}`);
      console.log(`   Median Products/Customer: ${Math.round(medianProducts)}`);

      // Source: extract_real_metrics.py, lines 187-197
      // Segment customers
      const eliteCustomers = [...customerProducts.entries()].filter(([, count]) => count >= 3);
      const premiumCustomers = [...customerProducts.entries()].filter(([, count]) => count === 2);
      const standardCustomers = [...customerProducts.entries()].filter(([, count]) => count === 1);

      console.log(`\n   CUSTOMER SEGMENTATION:`);
      console.log(
        `   Elite (3+ products):     ${formatNumber(eliteCustomers.length).padStart(4)} customers (${formatPercent(eliteCustomers.length / totalCustomers).padStart(5)})`
      );
      console.log(
        `   Premium (2 products):    ${formatNumber(premiumCustomers.length).padStart(4)} customers (${formatPercent(premiumCustomers.length / totalCustomers).padStart(5)})`
      );
      console.log(
        `   Standard (1 product):    ${formatNumber(standardCustomers.length).padStart(4)} customers (${formatPercent(standardCustomers.length / totalCustomers).padStart(5)})`
      );

      // Source: extract_real_metrics.py, lines 199-204
      // Products per customer distribution
      console.log(`\n   Products Per Customer Distribution:`);
      const productCountDist = valueCounts(productCounts);
      const sortedCounts = [...productCountDist.entries()].sort((a, b) => a[0] - b[0]).slice(0, 10);

      for (const [nProducts, count] of sortedCounts) {
        const pct = (count / totalCustomers) * 100;
        console.log(
          `      ${nProducts} products: ${formatNumber(count).padStart(4)} customers (${pct.toFixed(1).padStart(4)}%)`
        );
      }

      // Source: extract_real_metrics.py, lines 206-212
      return {
        totalCustomers,
        elite: eliteCustomers.length,
        premium: premiumCustomers.length,
        standard: standardCustomers.length,
        productsPerCustomer: customerProducts,
      };
    }

    return null;
  } catch (error) {
    // Source: extract_real_metrics.py, lines 214-218
    console.error(`   Error: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return null;
  }
}

/**
 * Extract new business data
 *
 * Source: extract_real_metrics.py, lines 221-279
 *
 * @param customPath - Optional custom file path (for testing)
 * @returns NewBusinessResult or null on error
 */
export function extractNewBusinessMetrics(
  customPath?: string
): NewBusinessResult | null {
  // Source: extract_real_metrics.py, lines 224-226
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTING NEW BUSINESS METRICS');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, line 228
  const filePath = customPath || path.join(BRITTNEY_DIR, 'New Business Details_1764017841226.xlsx');

  try {
    // Source: extract_real_metrics.py, line 232
    // Read Excel, skip header rows
    const df = readExcel<NewBusinessRow>(filePath, 3);

    // Source: extract_real_metrics.py, line 234
    console.log(`\n   Loaded ${formatNumber(df.length)} new business transactions`);

    // Source: extract_real_metrics.py, line 239
    const columns = Object.keys(df[0] || {});
    console.log(`Columns: ${columns.join(', ')}`);

    const totalTransactions = df.length;
    let productDistribution = new Map<string, number>();
    let transactionTypes = new Map<string, number>();
    let itemsPerTransaction: NewBusinessResult['itemsPerTransaction'] = null;

    // Source: extract_real_metrics.py, lines 241-249
    // Analyze by product
    const productCol = 'Product';
    if (df.some((row) => row[productCol] !== undefined)) {
      console.log(`\n   NEW BUSINESS BY PRODUCT:`);
      const products = df.map((row) => row[productCol]).filter(Boolean) as string[];
      productDistribution = valueCounts(products);

      for (const [product, count] of productDistribution.entries()) {
        const pct = (count / totalTransactions) * 100;
        console.log(
          `   ${product.padEnd(30)} ${formatNumber(count).padStart(4)} (${pct.toFixed(1).padStart(5)}%)`
        );
      }
    }

    // Source: extract_real_metrics.py, lines 252-259
    // Analyze transaction types
    const transCol = 'Transaction Type';
    if (df.some((row) => row[transCol] !== undefined)) {
      console.log(`\n   TRANSACTION TYPES:`);
      const transTypes = df.map((row) => row[transCol]).filter(Boolean) as string[];
      transactionTypes = valueCounts(transTypes);

      for (const [transType, count] of transactionTypes.entries()) {
        const pct = (count / totalTransactions) * 100;
        console.log(
          `   ${transType.padEnd(30)} ${formatNumber(count).padStart(4)} (${pct.toFixed(1).padStart(5)}%)`
        );
      }
    }

    // Source: extract_real_metrics.py, lines 262-271
    // Item count (products per transaction)
    const itemCol = 'Item Count';
    if (df.some((row) => row[itemCol] !== undefined)) {
      const itemCounts = df
        .map((row) => row[itemCol])
        .filter((v) => typeof v === 'number') as number[];

      if (itemCounts.length > 0) {
        const avgItems = itemCounts.reduce((a, b) => a + b, 0) / itemCounts.length;
        const medianItems = calculateMedian(itemCounts);

        console.log(`\n   ITEMS PER TRANSACTION:`);
        console.log(`   Average: ${avgItems.toFixed(2)}`);
        console.log(`   Median: ${Math.round(medianItems)}`);

        const itemDist = valueCounts(itemCounts);
        const sortedItemDist = new Map(
          [...itemDist.entries()].sort((a, b) => a[0] - b[0])
        );

        for (const [items, count] of sortedItemDist.entries()) {
          const pct = (count / totalTransactions) * 100;
          console.log(
            `      ${items} items: ${formatNumber(count).padStart(4)} transactions (${pct.toFixed(1).padStart(5)}%)`
          );
        }

        itemsPerTransaction = {
          average: avgItems,
          median: medianItems,
          distribution: sortedItemDist,
        };
      }
    }

    // Source: extract_real_metrics.py, line 273
    return {
      data: df,
      totalTransactions,
      productDistribution,
      transactionTypes,
      itemsPerTransaction,
    };
  } catch (error) {
    // Source: extract_real_metrics.py, lines 275-279
    console.error(`   Error: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return null;
  }
}

// =============================================================================
// SUMMARY AND INSIGHTS
// Source: extract_real_metrics.py, lines 282-352
// =============================================================================

/**
 * Generate comprehensive summary with real data
 *
 * Source: extract_real_metrics.py, lines 282-348
 *
 * @param customPaths - Optional custom file paths for each data source
 * @returns ComprehensiveSummary with all extracted data and insights
 */
export function generateFinalSummary(customPaths?: {
  retentionPath?: string;
  renewalPath?: string;
  segmentationPath?: string;
  newBizPath?: string;
}): ComprehensiveSummary {
  // Source: extract_real_metrics.py, lines 285-287
  console.log('\n\n' + '='.repeat(80));
  console.log('COMPREHENSIVE ANALYSIS SUMMARY');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, lines 290-293
  // Extract all metrics
  const retentionData = extractPolicyRetentionData(customPaths?.retentionPath);
  const renewalData = extractRenewalAuditData(customPaths?.renewalPath);
  const segmentation = extractCustomerSegmentation(customPaths?.segmentationPath);
  const newBizData = extractNewBusinessMetrics(customPaths?.newBizPath);

  // Source: extract_real_metrics.py, lines 296-298
  // Generate actionable insights
  console.log('\n\n' + '='.repeat(80));
  console.log('KEY INSIGHTS & RECOMMENDATIONS');
  console.log('='.repeat(80));

  // Source: extract_real_metrics.py, line 300
  const insights: string[] = [];

  // Source: extract_real_metrics.py, lines 302-309
  // 1. Retention insights
  if (renewalData !== null && renewalData.retentionRate > 0) {
    insights.push(`   Current renewal retention rate: ${formatPercent(renewalData.retentionRate)}`);

    if (renewalData.retentionRate < 0.85) {
      insights.push(`      Retention below 85% target - implement churn prediction model`);
    }
  }

  // Source: extract_real_metrics.py, lines 312-317
  // 2. Rate increase insights
  if (renewalData !== null && renewalData.premiumChangeStats !== null) {
    const avgRateIncrease = renewalData.premiumChangeStats.averageChange;
    insights.push(`   Average rate increase: ${avgRateIncrease.toFixed(1)}%`);

    if (avgRateIncrease > 10) {
      insights.push(`      High rate increases (${avgRateIncrease.toFixed(1)}%) driving churn risk`);
    }
  }

  // Source: extract_real_metrics.py, lines 320-327
  // 3. Segmentation insights
  if (segmentation !== null) {
    const elitePct = (segmentation.elite / segmentation.totalCustomers) * 100;
    const premiumPct = (segmentation.premium / segmentation.totalCustomers) * 100;

    insights.push(
      `   Customer Segmentation: ${elitePct.toFixed(1)}% Elite, ${premiumPct.toFixed(1)}% Premium`
    );

    if (elitePct + premiumPct < 40) {
      insights.push(
        `   Only ${Math.round(elitePct + premiumPct)}% top-tier customers - focus on cross-sell/upsell`
      );
    }
  }

  // Source: extract_real_metrics.py, lines 330-332
  // Print insights
  console.log('\n   INSIGHTS:');
  insights.forEach((insight, i) => {
    console.log(`   ${i + 1}. ${insight}`);
  });

  // Source: extract_real_metrics.py, lines 335-339
  // Recommendations
  console.log('\n\n   RECOMMENDATIONS FOR PHASE 1 MODEL UPDATES:');
  console.log('   1. Use actual retention rate in models (vs 85% assumption)');
  console.log('   2. Use actual rate increase data (vs 8% assumption)');
  console.log('   3. Use actual customer segmentation distribution');
  console.log('   4. Build churn prediction model with renewal audit data');
  console.log('   5. Implement cross-sell timing based on new business patterns');

  // Source: extract_real_metrics.py, lines 342-348
  return {
    retentionData,
    renewalData,
    segmentation,
    newBizData,
    insights,
  };
}

// =============================================================================
// MAIN ENTRY POINT
// Source: extract_real_metrics.py, lines 351-352
// =============================================================================

/**
 * Main function - execute when run directly
 *
 * Source: extract_real_metrics.py, lines 351-352
 */
export function main(): ComprehensiveSummary {
  return generateFinalSummary();
}

// Export utility functions for testing and reuse
export {
  readExcel,
  calculateMedian,
  valueCounts,
  groupBy,
  formatPercent,
  formatNumber,
};
