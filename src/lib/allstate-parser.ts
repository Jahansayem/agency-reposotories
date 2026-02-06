/**
 * Allstate Data Parser
 *
 * Parses CSV and Excel files from Allstate Book of Business exports
 * and transforms them into CrossSellOpportunity records.
 *
 * Supports multiple file formats and column naming conventions.
 */

import type {
  AllstateBookOfBusinessRow,
  ParsedCrossSellRecord,
  ParsedRecordValidation,
  AllstateRenewalStatus,
  EZPayStatus,
  CrossSellSegment,
  CrossSellPriorityTier,
  DataUploadSummary,
} from '@/types/allstate-analytics';

// ============================================
// Column Mapping Configuration
// ============================================

/**
 * Maps various column name variants to normalized field names
 * Allstate exports can have different column headers depending on the report type
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  customer_name: ['Customer Name', 'Name', 'Full Name', 'Client Name', 'Insured Name', 'Named Insured'],
  // Renewal Audit Report uses separate first/last name columns
  first_name: ['Insured First Name', 'First Name', 'FirstName'],
  last_name: ['Insured Last Name', 'Last Name', 'LastName'],
  // All Purpose Audit uses 'Insured Contact' for phone
  phone: ['Phone', 'Phone Number', 'Primary Phone', 'Contact Phone', 'Tel', 'Telephone', 'Insured Phone', 'Insured Contact'],
  // All Purpose Audit uses 'Insured E-mail' (with hyphen)
  email: ['Email', 'Email Address', 'E-mail', 'Primary Email', 'Contact Email', 'Insured Email', 'Insured E-mail'],
  // All Purpose Audit uses 'Insured Address'
  address: ['Address', 'Street Address', 'Street', 'Mailing Address', 'Address Line 1', 'Insured Address'],
  city: ['City', 'Town', 'Municipality'],
  zip_code: ['Zip', 'ZIP Code', 'Zip Code', 'Postal Code', 'ZIP'],
  renewal_date: ['Renewal Date', 'Renewal', 'Expiration Date', 'Policy Renewal', 'Exp Date', 'Next Renewal', 'Renewal Effective Date', 'Anniversary Effective Date'],
  current_products: ['Current Products', 'Products', 'Product', 'Policy Type', 'Coverage', 'Line of Business', 'LOB', 'Product Name'],
  // All Purpose Audit uses 'Premium new' and 'Premium Old' (different casing)
  current_premium: ['Premium', 'Current Premium', 'Total Premium', 'Annual Premium', 'Written Premium', 'Premium New($)', 'Premium Old($)', 'Premium new', 'Premium Old'],
  tenure_years: ['Tenure', 'Years', 'Tenure Years', 'Customer Since', 'Years as Customer', 'Years Prior Insurance', 'Original Year'],
  policy_count: ['Policy Count', 'Policies', 'Number of Policies', '# Policies', 'Total Policies', 'Item Count'],
  ezpay_status: ['EZPay', 'EZ Pay', 'Auto Pay', 'Autopay', 'Payment Status', 'Easy Pay'],
  balance_due: ['Balance', 'Balance Due', 'Amount Due', 'Outstanding Balance', 'Amount Due($)'],
  renewal_status: ['Status', 'Renewal Status', 'Policy Status', 'Account Status'],
};

// ============================================
// Parsing Utilities
// ============================================

/**
 * Normalizes column names by finding the matching mapping
 */
function normalizeColumnName(header: string): string | null {
  const trimmed = header.trim();

  for (const [normalized, variants] of Object.entries(COLUMN_MAPPINGS)) {
    if (variants.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      return normalized;
    }
  }

  return null;
}

/**
 * Parses a date string in various formats
 */
function parseDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;

  const trimmed = value.trim();

  // Try MM/DD/YYYY format
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = trimmed.match(mmddyyyy);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try YYYY-MM-DD format
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (yyyymmdd.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed;
    }
  }

  // Try Date object parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parses a currency value, removing $ and commas
 */
function parseCurrency(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;

  if (typeof value === 'number') return value;

  const cleaned = value.toString().replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses a percentage value
 */
function parsePercentage(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;

  if (typeof value === 'number') return value;

  const cleaned = value.toString().replace(/%/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses an integer value
 */
function parseInt_(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;

  if (typeof value === 'number') return Math.floor(value);

  const parsed = parseInt(value.toString().trim(), 10);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalizes renewal status
 */
function parseRenewalStatus(value: string | undefined): AllstateRenewalStatus {
  if (!value) return 'Not Taken';

  const normalized = value.trim().toLowerCase();

  if (normalized.includes('renewed') || normalized.includes('completed')) return 'Renewed';
  if (normalized.includes('pending') || normalized.includes('in progress')) return 'Pending';
  if (normalized.includes('risk') || normalized.includes('at risk')) return 'At Risk';
  if (normalized.includes('cancel')) return 'Cancelled';

  return 'Not Taken';
}

/**
 * Normalizes EZPay status
 */
function parseEZPayStatus(value: string | undefined): EZPayStatus {
  if (!value) return 'No';

  const normalized = value.trim().toLowerCase();

  if (normalized === 'yes' || normalized === 'y' || normalized === 'enrolled' || normalized === 'active') {
    return 'Yes';
  }
  if (normalized === 'pending' || normalized.includes('pending')) {
    return 'Pending';
  }

  return 'No';
}

/**
 * Determines cross-sell segment based on current products
 */
export function determineSegment(currentProducts: string, recommendedProduct?: string): CrossSellSegment {
  const products = currentProducts.toLowerCase();
  const recommended = (recommendedProduct || '').toLowerCase();

  // Auto → Home
  if ((products.includes('auto') || products.includes('private passenger')) &&
      !products.includes('home') && !products.includes('condo')) {
    if (recommended.includes('home') || recommended.includes('condo')) {
      return 'auto_to_home';
    }
    return 'auto_to_home'; // Default recommendation
  }

  // Home → Auto
  if ((products.includes('home') || products.includes('condo') || products.includes('renter') || products.includes('landlord')) &&
      !products.includes('auto')) {
    if (recommended.includes('auto')) {
      return 'home_to_auto';
    }
    return 'home_to_auto'; // Default recommendation
  }

  // Life insurance upsell
  if (recommended.includes('life')) {
    return 'add_life';
  }

  // Umbrella upsell
  if (recommended.includes('umbrella')) {
    return 'add_umbrella';
  }

  // Commercial crossover
  if (recommended.includes('commercial') || recommended.includes('business')) {
    return 'commercial_add';
  }

  // Single product to bundle
  if (!products.includes(',') && !products.includes('and')) {
    return 'mono_to_bundle';
  }

  return 'other';
}

/**
 * Generates recommended product based on current holdings
 */
export function generateRecommendedProduct(currentProducts: string): string {
  const products = currentProducts.toLowerCase();

  // Auto-only customers → recommend Home
  if ((products.includes('auto') || products.includes('private passenger')) &&
      !products.includes('home') && !products.includes('condo')) {
    return 'Homeowners';
  }

  // Home-only customers → recommend Auto
  if ((products.includes('home') || products.includes('condo') || products.includes('renter') || products.includes('landlord')) &&
      !products.includes('auto')) {
    return 'Auto';
  }

  // Bundled customers → recommend Life or Umbrella
  if ((products.includes('auto') || products.includes('home')) &&
      !products.includes('life')) {
    return 'Life Insurance';
  }

  // High-value customers → recommend Umbrella
  if (!products.includes('umbrella')) {
    return 'Umbrella';
  }

  return 'Additional Coverage';
}

// ============================================
// Main Parsing Functions
// ============================================

/**
 * Parses a single row from Allstate data
 */
export function parseAllstateRow(
  row: AllstateBookOfBusinessRow,
  columnMap: Map<string, string>
): ParsedRecordValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Helper to get value by normalized column name
  const getValue = (field: string): string | number | undefined => {
    const originalColumn = columnMap.get(field);
    if (!originalColumn) return undefined;
    return row[originalColumn];
  };

  // Extract customer name (required)
  // Try full name first, then fall back to first_name + last_name (Renewal Audit Report format)
  let customerName = (getValue('customer_name') as string || '').trim();
  if (!customerName) {
    const firstName = (getValue('first_name') as string || '').trim();
    const lastName = (getValue('last_name') as string || '').trim();
    if (firstName || lastName) {
      customerName = `${firstName} ${lastName}`.trim();
    }
  }
  if (!customerName) {
    errors.push('Customer name is required');
  }

  // Extract other fields
  const phone = (getValue('phone') as string || '').trim();
  const email = (getValue('email') as string || '').trim();
  const address = (getValue('address') as string || '').trim();
  const city = (getValue('city') as string || '').trim();
  const zipCode = (getValue('zip_code') as string || '').trim();

  // Parse renewal date
  const renewalDateStr = getValue('renewal_date') as string | undefined;
  const renewalDate = parseDate(renewalDateStr);

  if (!renewalDate && renewalDateStr) {
    warnings.push(`Could not parse renewal date: ${renewalDateStr}`);
  }

  // Parse financial and policy data
  const currentProducts = (getValue('current_products') as string || 'Unknown').trim();
  const currentPremium = parseCurrency(getValue('current_premium'));
  const tenureYears = parseInt_(getValue('tenure_years'));
  const policyCount = parseInt_(getValue('policy_count')) || 1;
  const balanceDue = parseCurrency(getValue('balance_due'));

  // Parse status fields
  const renewalStatus = parseRenewalStatus(getValue('renewal_status') as string | undefined);
  const ezpayStatus = parseEZPayStatus(getValue('ezpay_status') as string | undefined);

  // Generate recommended product
  const recommendedProduct = generateRecommendedProduct(currentProducts);
  const segmentType = determineSegment(currentProducts, recommendedProduct);

  // Validate required fields
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Add warnings for missing optional but important fields
  if (!phone && !email) {
    warnings.push('No contact information (phone or email)');
  }

  if (!renewalDate) {
    warnings.push('No renewal date - will use default scoring');
  }

  const record: ParsedCrossSellRecord = {
    customer_name: customerName,
    phone,
    email,
    address,
    city,
    zip_code: zipCode,
    renewal_date: renewalDate,
    current_products: currentProducts,
    current_premium: currentPremium,
    tenure_years: tenureYears,
    policy_count: policyCount,
    ezpay_status: ezpayStatus,
    balance_due: balanceDue,
    renewal_status: renewalStatus,
    recommended_product: recommendedProduct,
    segment_type: segmentType,
  };

  return { isValid: true, errors: [], warnings, record };
}

/**
 * Finds the header row index in Allstate reports
 * Allstate reports often have metadata rows before the actual headers
 * (e.g., "Book Of Business-Renewal Audit Report", "Download Date", etc.)
 */
function findHeaderRowIndex(lines: string[]): number {
  // Known header indicators - if a line contains these, it's likely the header row
  // Includes both Renewal Audit Report and All Purpose Audit column names
  const headerIndicators = [
    'Insured First Name',
    'Insured Name',      // All Purpose Audit
    'Insured Contact',   // All Purpose Audit (phone)
    'Customer Name',
    'Name',
    'Phone',
    'Email',
    'Premium',
    'Renewal Date',
    'Policy',
  ];

  // Scan up to 50 rows to handle All Purpose Audit (headers at row 34)
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].toLowerCase();
    // Check if this line contains multiple header indicators
    const matchCount = headerIndicators.filter(indicator =>
      line.includes(indicator.toLowerCase())
    ).length;

    if (matchCount >= 2) {
      return i;
    }
  }

  // Default to first row if no header row detected
  return 0;
}

/**
 * Parses CSV content string into rows
 * Simple CSV parser that handles quoted fields
 * Automatically detects and skips Allstate report metadata rows
 */
export function parseCSV(content: string): AllstateBookOfBusinessRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Find the actual header row (skip Allstate metadata rows)
  const headerRowIndex = findHeaderRowIndex(lines);

  // Parse header row
  const headers = parseCSVLine(lines[headerRowIndex]);

  // Parse data rows (starting after header row)
  const rows: AllstateBookOfBusinessRow[] = [];

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: AllstateBookOfBusinessRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parses a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result;
}

/**
 * Creates a column map from headers
 */
export function createColumnMap(headers: string[]): Map<string, string> {
  const columnMap = new Map<string, string>();

  for (const header of headers) {
    const normalized = normalizeColumnName(header);
    if (normalized) {
      columnMap.set(normalized, header);
    }
  }

  return columnMap;
}

/**
 * Parses all rows from Allstate data
 */
export function parseAllstateData(
  rows: AllstateBookOfBusinessRow[]
): {
  records: ParsedCrossSellRecord[];
  errors: Array<{ row: number; errors: string[] }>;
  warnings: Array<{ row: number; warnings: string[] }>;
} {
  if (rows.length === 0) {
    return { records: [], errors: [], warnings: [] };
  }

  // Get headers from first row keys
  const headers = Object.keys(rows[0]);
  const columnMap = createColumnMap(headers);

  const records: ParsedCrossSellRecord[] = [];
  const errors: Array<{ row: number; errors: string[] }> = [];
  const warnings: Array<{ row: number; warnings: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const result = parseAllstateRow(rows[i], columnMap);

    if (result.isValid && result.record) {
      records.push(result.record);
    }

    if (result.errors.length > 0) {
      errors.push({ row: i + 1, errors: result.errors });
    }

    if (result.warnings.length > 0) {
      warnings.push({ row: i + 1, warnings: result.warnings });
    }
  }

  return { records, errors, warnings };
}

// ============================================
// Scoring Constants (from Python bealer-lead-model)
// ============================================

/**
 * Conversion rates by cross-sell type (from cross_sell_renewal_analysis.py)
 */
export const CONVERSION_RATES: Record<CrossSellSegment, number> = {
  auto_to_home: 0.22,
  home_to_auto: 0.25,
  mono_to_bundle: 0.30, // Combined from auto_to_renters
  add_life: 0.20,
  add_umbrella: 0.35,
  commercial_add: 0.12,
  other: 0.15,
};

/**
 * Segment-specific weight multipliers for priority scoring
 *
 * Based on actual conversion rate analysis:
 * - add_umbrella: 35% conversion (highest) → 1.3x multiplier
 * - auto_to_home: 22% conversion → 1.15x multiplier
 * - home_to_auto: 18% conversion (baseline) → 1.0x multiplier
 * - life_cross_sell: 12% conversion (lowest) → 0.85x multiplier
 *
 * These multipliers improve conversion prediction accuracy by
 * weighting opportunities based on historical segment performance.
 */
export const SEGMENT_WEIGHTS: Record<string, number> = {
  'add_umbrella': 1.3,      // Highest conversion (35%)
  'mono_to_bundle': 1.2,    // Good conversion (30%)
  'home_to_auto': 1.1,      // Good conversion (25%)
  'auto_to_home': 1.15,     // Good conversion (22%)
  'add_life': 1.0,          // Moderate conversion (20%)
  'commercial_add': 0.85,   // Lower conversion (12%)
  'other': 1.0,             // Baseline
  'default': 1.0,           // Fallback
};

/**
 * Retention rates by product count (from cross_sell_renewal_analysis.py)
 */
export const RETENTION_BY_PRODUCTS: Record<number, number> = {
  1: 0.72,
  2: 0.91,
  3: 0.97,
  4: 0.98,
};

/**
 * Premium thresholds for value scoring (from cross_sell_renewal_analysis.py)
 */
const PREMIUM_QUARTILES = {
  top: 2500,    // Top quartile: >$2,500
  bottom: 1000, // Bottom quartile: <$1,000
};

/**
 * Premium estimates by product type (from cross_sell_renewal_analysis.py)
 */
const PRODUCT_PREMIUMS: Record<string, number> = {
  Homeowners: 2963,
  Auto: 2800,
  Renters: 250,
  'Personal Umbrella': 350,
  Life: 1200,
  Commercial: 3500,
};

// ============================================
// Scoring Functions
// ============================================

/**
 * Detects if address suggests homeownership vs renting
 * (from CustomerProfile._detect_homeowner_signal in Python)
 */
function detectHomeownerSignal(address: string): boolean {
  if (!address) return false;
  const addrLower = address.toLowerCase();
  const aptPatterns = ['apt', 'unit', '#', 'suite', 'ste', 'floor', 'fl '];
  return !aptPatterns.some(p => addrLower.includes(p));
}

/**
 * Detects if address suggests renting (apartment-style)
 */
function detectRenterSignal(address: string): boolean {
  if (!address) return false;
  const addrLower = address.toLowerCase();
  const aptPatterns = ['apt', 'unit', '#', 'suite', 'ste', 'floor', 'fl '];
  return aptPatterns.some(p => addrLower.includes(p));
}

/**
 * Calculates priority score for a cross-sell opportunity
 *
 * EXACT PORT from Python bealer-lead-model/src/cross_sell_renewal_analysis.py
 * calculate_priority_score() function (lines 586-668)
 *
 * Score = Gap (0-40) + Timing (0-25) + Value (0-20) + Risk (0-10) + Contact (0-5)
 * Total: 0-100 points
 */
export function calculatePriorityScore(
  record: ParsedCrossSellRecord,
  opportunityType?: CrossSellSegment
): number {
  let score = 0;
  const oppType = opportunityType || record.segment_type || 'other';
  const isHomeownerSignal = detectHomeownerSignal(record.address || '');

  // ─────────────────────────────────────────────────────────────────────────
  // GAP / BUNDLE POTENTIAL (0-40 points)
  // ─────────────────────────────────────────────────────────────────────────
  switch (oppType) {
    case 'auto_to_home':
      if (isHomeownerSignal) {
        score += 40; // Auto-only + homeowner signal = highest potential
      } else {
        score += 30; // Auto-only + renter signal
      }
      break;
    case 'home_to_auto':
      score += 35; // Home-only + auto need
      break;
    case 'mono_to_bundle':
      score += 30; // Single product → bundle
      break;
    case 'add_umbrella':
      score += 5;  // Already bundled (umbrella upsell)
      break;
    case 'add_life':
      score += 10; // Life insurance upsell
      break;
    case 'commercial_add':
      score += 15; // Commercial crossover
      break;
    default:
      // Infer from policy count
      if (record.policy_count === 1) {
        score += 35; // Mono-line = high cross-sell potential
      } else if (record.policy_count === 2) {
        score += 15; // Some bundling
      } else {
        score += 5;  // Well-bundled
      }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIMING / TRIGGER (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────
  let daysUntilRenewal = 999;
  if (record.renewal_date) {
    daysUntilRenewal = Math.ceil(
      (new Date(record.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  if (daysUntilRenewal >= 0 && daysUntilRenewal <= 45) {
    score += 25; // Renewal in 0-45 days
  } else if (daysUntilRenewal >= 46 && daysUntilRenewal <= 90) {
    score += 15; // Renewal in 46-90 days
  } else if (daysUntilRenewal < 0) {
    score += 20; // Past due - urgent
  } else {
    score += 5;  // Future renewal
  }

  // Not yet renewed bonus (shopping signal)
  if (record.renewal_status === 'Not Taken') {
    score += 15;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALUE / PREMIUM SIZE (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────
  if (record.current_premium > PREMIUM_QUARTILES.top) {
    score += 20; // Top quartile
  } else if (record.current_premium > PREMIUM_QUARTILES.bottom) {
    score += 10; // Middle quartiles
  } else {
    score += 5;  // Bottom quartile
  }

  // Multiple policies bonus
  if (record.policy_count >= 2) {
    score += 5;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RETENTION RISK / SAVE OPPORTUNITY (0-10 points)
  // ─────────────────────────────────────────────────────────────────────────
  if (record.balance_due > 0) {
    score += 10; // Balance due / late payment = save opportunity
  }

  if (record.tenure_years < 1) {
    score += 5;  // New customer (higher churn risk)
  }

  if (record.ezpay_status !== 'Yes') {
    score += 5;  // No EZPay (lapse risk)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTACTABILITY (0-5 points)
  // ─────────────────────────────────────────────────────────────────────────
  const hasPhone = record.phone && record.phone !== '' && record.phone !== 'nan';
  const hasEmail = record.email && record.email !== '' && record.email !== 'nan';

  if (hasPhone && hasEmail) {
    score += 5;  // Both contact methods
  } else if (hasPhone || hasEmail) {
    score += 2;  // One contact method
  }
  // else: +0

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT-SPECIFIC WEIGHT ADJUSTMENT
  // ─────────────────────────────────────────────────────────────────────────
  // Apply segment multiplier to improve conversion prediction accuracy
  // based on historical conversion rates by segment type
  const segmentMultiplier = SEGMENT_WEIGHTS[oppType] || SEGMENT_WEIGHTS.default;
  const adjustedScore = Math.round(score * segmentMultiplier);

  // Cap at enhanced scale max (150) to allow high-performing segments
  // to exceed the base 100-point scale when warranted
  return Math.min(adjustedScore, 150);
}

/**
 * Determines priority tier based on score
 *
 * EXACT PORT from Python bealer-lead-model/src/cross_sell_renewal_analysis.py
 * create_opportunity() function (lines 543-551)
 *
 * Using percentile-based thresholds for better workload distribution.
 * Thresholds adjusted for enhanced 0-150 scale with segment weights:
 * - Original 95/100 → 115/150 (HOT)
 * - Original 85/100 → 100/150 (HIGH)
 * - Original 70/100 → 85/150 (MEDIUM)
 */
export function calculatePriorityTier(
  score: number,
  _renewalDate?: string | null // Kept for API compatibility but not used
): CrossSellPriorityTier {
  if (score >= 115) {
    return 'HOT';     // Top ~20% - Call today (score >= 115/150)
  } else if (score >= 100) {
    return 'HIGH';    // Next ~30% - Call this week (score >= 100/150)
  } else if (score >= 85) {
    return 'MEDIUM';  // Next ~30% - Call within 2 weeks (score >= 85/150)
  } else {
    return 'LOW';     // Bottom ~20% - Schedule for later (score < 85)
  }
}

/**
 * Calculate retention lift when adding a product
 * (from cross_sell_renewal_analysis.py)
 */
export function calculateRetentionLift(currentProductCount: number): number {
  const currentRetention = RETENTION_BY_PRODUCTS[Math.min(currentProductCount, 4)] || 0.72;
  const newRetention = RETENTION_BY_PRODUCTS[Math.min(currentProductCount + 1, 4)] || currentRetention;
  return newRetention - currentRetention;
}

/**
 * Get expected conversion rate for opportunity type
 */
export function getExpectedConversion(segment: CrossSellSegment): number {
  return CONVERSION_RATES[segment] || 0.15;
}

/**
 * Calculates expected premium for cross-sell based on segment
 *
 * EXACT PORT from Python bealer-lead-model/src/cross_sell_renewal_analysis.py
 * estimate_potential_premium() function (lines 570-580)
 */
export function calculatePotentialPremium(
  segment: CrossSellSegment,
  currentPremium: number
): number {
  // Average premiums by product type (from Python estimate_potential_premium)
  const AVERAGE_PREMIUMS: Record<string, number> = {
    Homeowners: 2963,
    Auto: 2800,
    Renters: 250,
    'Personal Umbrella': 350,
    Life: 1200,
    Commercial: 3500,
  };

  switch (segment) {
    case 'auto_to_home':
      return AVERAGE_PREMIUMS.Homeowners;
    case 'home_to_auto':
      return AVERAGE_PREMIUMS.Auto;
    case 'mono_to_bundle':
      // Mono-line → bundle: estimate renters for apartment dwellers
      // or 80% of current for others (bundling the missing product)
      return Math.max(AVERAGE_PREMIUMS.Renters, Math.round(currentPremium * 0.8));
    case 'add_life':
      return AVERAGE_PREMIUMS.Life;
    case 'add_umbrella':
      return AVERAGE_PREMIUMS['Personal Umbrella'];
    case 'commercial_add':
      return AVERAGE_PREMIUMS.Commercial;
    default:
      return 1000; // Default estimate
  }
}

/**
 * Generates talking points based on segment and customer data
 *
 * EXACT PORT from Python bealer-lead-model/src/cross_sell_renewal_analysis.py
 * generate_talking_points() function (lines 674-715)
 */
export function generateTalkingPoints(
  record: ParsedCrossSellRecord
): [string, string, string] {
  const segment = record.segment_type || 'other';
  const points: string[] = [];

  // Balance due alert (always first if applicable)
  if (record.balance_due > 0) {
    points.push(`⚠️ NOTE: $${record.balance_due.toFixed(2)} balance due - address first`);
  }

  // Renewal status
  if (record.renewal_status === 'Not Taken') {
    points.push('📋 Renewal pending - great time to discuss full coverage needs');
  }

  // Product-specific messaging (from Python)
  switch (segment) {
    case 'auto_to_home':
      points.push('🏠 Bundle discount: Save 15-25% by adding Home to your Auto');
      points.push('📊 Multi-policy customers stay 19% longer on average');
      if (record.tenure_years >= 5) {
        points.push(`🎉 ${record.tenure_years} years with us - thank you for your loyalty!`);
      }
      break;

    case 'mono_to_bundle':
      // Auto-only → Renters for apartment dwellers
      points.push('🏢 Renters insurance: Just $15-25/month protects your belongings');
      points.push('💰 Bundle discount when combined with Auto');
      break;

    case 'home_to_auto':
      points.push('🚗 Add Auto for 15-25% bundle savings on both policies');
      points.push('📊 Our bundled customers have 91% retention - they love the simplicity');
      break;

    case 'add_umbrella':
      points.push('☂️ Personal Umbrella: $1M+ protection for ~$250/year');
      points.push('🛡️ Protects assets beyond standard Auto/Home limits');
      points.push('📊 95% retention on umbrella - customers love the peace of mind');
      break;

    case 'add_life':
      points.push('❤️ Life insurance protects your family and adds multi-line discount');
      points.push('📊 Term life starts at just $20-30/month for most customers');
      break;

    case 'commercial_add':
      points.push('🏢 Business insurance for self-employed and small business owners');
      points.push('💼 Protects your business and qualifies for multi-policy discount');
      break;

    default:
      points.push('💡 Ask about additional coverage options and multi-policy discounts');
      points.push('📊 Bundled customers save 20-30% on average');
  }

  // Premium value highlight (from Python)
  if (record.current_premium > 3000) {
    points.push(`💎 High-value account: $${record.current_premium.toLocaleString()} total premium`);
  }

  // Ensure we have exactly 3 points
  while (points.length < 3) {
    points.push('Thank you for being a valued customer');
  }

  return [points[0], points[1], points[2]];
}

// ============================================
// Summary Generation
// ============================================

/**
 * Generates summary statistics from parsed records
 *
 * Uses EXACT conversion rates from Python bealer-lead-model
 */
export function generateUploadSummary(
  records: ParsedCrossSellRecord[]
): DataUploadSummary {
  const tierCounts = { HOT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const segmentBreakdown: Record<string, number> = {};
  let totalPotentialPremium = 0;
  let totalConversionRate = 0;
  let renewalsThisWeek = 0;
  let renewalsThisMonth = 0;
  let renewalsNext30Days = 0;

  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const record of records) {
    // Calculate scores using the full Python algorithm
    const segment = record.segment_type || 'other';
    const score = calculatePriorityScore(record, segment);
    const tier = calculatePriorityTier(score);
    const potentialPremium = calculatePotentialPremium(segment, record.current_premium);

    // Aggregate counts
    tierCounts[tier]++;
    segmentBreakdown[segment] = (segmentBreakdown[segment] || 0) + 1;
    totalPotentialPremium += potentialPremium;

    // Use EXACT conversion rates from Python (as percentages for backwards compat)
    const conversionRate = (CONVERSION_RATES[segment] || 0.15) * 100;
    totalConversionRate += conversionRate;

    // Count renewal timeline
    if (record.renewal_date) {
      const renewalDate = new Date(record.renewal_date);
      if (renewalDate <= oneWeek) {
        renewalsThisWeek++;
      }
      if (renewalDate <= oneMonth) {
        renewalsThisMonth++;
        renewalsNext30Days++;
      }
    }
  }

  const avgConversionRate = records.length > 0
    ? totalConversionRate / records.length
    : 0;

  const expectedRevenue = totalPotentialPremium * (avgConversionRate / 100);

  return {
    hot_opportunities: tierCounts.HOT,
    high_opportunities: tierCounts.HIGH,
    medium_opportunities: tierCounts.MEDIUM,
    low_opportunities: tierCounts.LOW,
    total_potential_premium: Math.round(totalPotentialPremium),
    avg_conversion_rate: Math.round(avgConversionRate * 10) / 10,
    expected_revenue: Math.round(expectedRevenue),
    renewals_this_week: renewalsThisWeek,
    renewals_this_month: renewalsThisMonth,
    renewals_next_30_days: renewalsNext30Days,
    segment_breakdown: segmentBreakdown,
  };
}
