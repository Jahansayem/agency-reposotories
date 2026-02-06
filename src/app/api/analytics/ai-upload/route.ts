/**
 * AI-Powered Allstate Data Upload API
 *
 * POST /api/analytics/ai-upload
 * Uses Claude AI to intelligently detect column mappings from any Allstate report format,
 * then applies the mapping programmatically to all rows for fast processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';

// Create clients lazily
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

interface ColumnMapping {
  customer_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  renewal_date: string | null;
  products: string | null;
  premium: string | null;
  tenure: string | null;
  policy_count: string | null;
  ezpay: string | null;
  balance: string | null;
  renewal_status: string | null;
  // Product presence flags
  has_auto: string | null;
  has_property: string | null;
  has_life: string | null;
  has_umbrella: string | null;
  // Monoline indicator
  monoline_flag: string | null;
}

interface AIResponse {
  column_mapping: ColumnMapping;
  product_detection: string;
  notes: string;
}

interface ParsedCustomer {
  customer_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  renewal_date?: string;
  current_products: string;
  current_premium: number;
  tenure_years: number;
  policy_count: number;
  ezpay_status: string;
  balance_due: number;
  renewal_status: string;
  recommended_product: string;
  segment_type: string;
  priority_score: number;
  priority_tier: string;
  talking_points: string[];
}

/**
 * Parse Excel file to get headers and sample rows
 */
function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string | number>[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find header row (scan first 50 rows for a row with multiple non-empty cells)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawData.length, 50); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    // Count non-empty cells
    const nonEmptyCount = row.filter(cell => {
      const val = String(cell || '').trim();
      return val !== '' && val.length > 1;
    }).length;

    // If we find a row with 5+ non-empty cells, it's likely the header
    if (nonEmptyCount >= 5) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawData[headerRowIndex] as (string | number | undefined)[];
  const headers = headerRow.map(cell => String(cell || '').trim()).filter(h => h !== '');

  // Convert data rows to objects
  const rows: Record<string, string | number>[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const dataRow = rawData[i] as (string | number | undefined)[];
    if (!dataRow || dataRow.length === 0) continue;

    const hasData = dataRow.some(cell => {
      const val = String(cell || '').trim();
      return val !== '' && val !== 'undefined';
    });
    if (!hasData) continue;

    const rowObject: Record<string, string | number> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        const cellValue = dataRow[j];
        if (typeof cellValue === 'number') {
          rowObject[headers[j]] = cellValue;
        } else {
          rowObject[headers[j]] = String(cellValue || '').trim();
        }
      }
    }
    rows.push(rowObject);
  }

  return { headers, rows };
}

/**
 * Use AI to detect column mapping from sample data
 * This is a single API call, not per-row processing
 */
async function detectColumnMapping(
  headers: string[],
  sampleRows: Record<string, string | number>[]
): Promise<AIResponse> {
  const anthropic = getAnthropicClient();

  const schemaPrompt = `You are parsing an Allstate insurance report. Here are the column headers:
${JSON.stringify(headers, null, 2)}

Here are 5 sample rows:
${JSON.stringify(sampleRows.slice(0, 5), null, 2)}

Identify which columns map to each field. Look for columns with similar names or containing the expected data.

Common column name patterns:
- Customer name: "Insured Name", "Customer Name", "Name", or separate "First_Name"/"Last_Name"
- Phone: "Phone", "Phone_Number", "Insured Contact"
- Email: "Email", "Email_Address"
- Address: "Street_Address", "Address"
- City: "City"
- Zip: "Zip_Code", "Zip"
- Renewal date: "Renewal Date", "X-Date"
- Premium: "Premium", "Total Premium"
- Tenure: "Tenure", "Years"
- EZPay: "EZPay", "EZ_Pay"
- Balance: "Balance", "Balance_Due"
- Product presence flags: "Presence_of_Auto", "Presence_of_Property", "Presence_of_Life"
- Monoline indicator: "Monoline_or_Multiline_Household"

Respond with ONLY a JSON object (no markdown):
{
  "column_mapping": {
    "customer_name": "exact column name or null",
    "first_name": "exact column name or null",
    "last_name": "exact column name or null",
    "phone": "exact column name or null",
    "email": "exact column name or null",
    "address": "exact column name or null",
    "city": "exact column name or null",
    "zip_code": "exact column name or null",
    "renewal_date": "exact column name or null",
    "products": "exact column name or null",
    "premium": "exact column name or null",
    "tenure": "exact column name or null",
    "policy_count": "exact column name or null",
    "ezpay": "exact column name or null",
    "balance": "exact column name or null",
    "renewal_status": "exact column name or null",
    "has_auto": "exact column name or null",
    "has_property": "exact column name or null",
    "has_life": "exact column name or null",
    "has_umbrella": "exact column name or null",
    "monoline_flag": "exact column name or null"
  },
  "product_detection": "description of how to detect products from available columns",
  "notes": "any important notes about this file format"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      { role: 'user', content: schemaPrompt }
    ]
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI failed to provide column mapping');
  }

  return JSON.parse(jsonMatch[0]) as AIResponse;
}

/**
 * Apply column mapping to transform a raw row into a customer record
 */
function transformRow(
  row: Record<string, string | number>,
  mapping: ColumnMapping
): ParsedCustomer | null {
  // Get customer name
  let customerName = '';
  if (mapping.customer_name && row[mapping.customer_name]) {
    customerName = String(row[mapping.customer_name]).trim();
  } else if (mapping.first_name && mapping.last_name) {
    const first = row[mapping.first_name] ? String(row[mapping.first_name]).trim() : '';
    const last = row[mapping.last_name] ? String(row[mapping.last_name]).trim() : '';
    customerName = `${first} ${last}`.trim();
  }

  if (!customerName) {
    return null; // Skip rows without customer name
  }

  // Get basic fields
  const phone = mapping.phone ? String(row[mapping.phone] || '').trim() : undefined;
  const email = mapping.email ? String(row[mapping.email] || '').trim() : undefined;
  const address = mapping.address ? String(row[mapping.address] || '').trim() : undefined;
  const city = mapping.city ? String(row[mapping.city] || '').trim() : undefined;
  const zipCode = mapping.zip_code ? String(row[mapping.zip_code] || '').trim() : undefined;

  // Parse renewal date (handle MM/DD format)
  let renewalDate: string | undefined;
  if (mapping.renewal_date && row[mapping.renewal_date]) {
    const dateStr = String(row[mapping.renewal_date]).trim();
    if (dateStr) {
      // Handle MM/DD format (no year)
      const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (mmddMatch) {
        const month = mmddMatch[1].padStart(2, '0');
        const day = mmddMatch[2].padStart(2, '0');
        const year = new Date().getFullYear();
        renewalDate = `${year}-${month}-${day}`;
      } else {
        // Try parsing as full date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          renewalDate = parsed.toISOString().split('T')[0];
        }
      }
    }
  }

  // Get numeric fields
  const currentPremium = mapping.premium ? parseFloat(String(row[mapping.premium] || '0').replace(/[$,]/g, '')) || 0 : 0;
  const tenureYears = mapping.tenure ? parseFloat(String(row[mapping.tenure] || '0')) || 0 : 0;
  const policyCount = mapping.policy_count ? parseInt(String(row[mapping.policy_count] || '1')) || 1 : 1;
  const balanceDue = mapping.balance ? parseFloat(String(row[mapping.balance] || '0').replace(/[$,]/g, '')) || 0 : 0;

  // Get EZPay status (must be 'Yes', 'No', or 'Pending' per DB constraint)
  let ezpayStatus = 'No';  // Default to 'No' if not found
  if (mapping.ezpay && row[mapping.ezpay] !== undefined) {
    const val = String(row[mapping.ezpay]).toLowerCase().trim();
    if (val === 'yes' || val === 'y' || val === '1' || val === 'true') {
      ezpayStatus = 'Yes';
    } else if (val === 'pending') {
      ezpayStatus = 'Pending';
    }
    // Otherwise stays 'No'
  }

  // Detect products from presence flags
  const products: string[] = [];
  if (mapping.has_auto) {
    const val = String(row[mapping.has_auto] || '').toLowerCase();
    if (val === 'yes' || val === 'y' || val === '1' || val === 'true' || val === 'x') {
      products.push('Auto');
    }
  }
  if (mapping.has_property) {
    const val = String(row[mapping.has_property] || '').toLowerCase();
    if (val === 'yes' || val === 'y' || val === '1' || val === 'true' || val === 'x') {
      products.push('Property');
    }
  }
  if (mapping.has_life) {
    const val = String(row[mapping.has_life] || '').toLowerCase();
    if (val === 'yes' || val === 'y' || val === '1' || val === 'true' || val === 'x') {
      products.push('Life');
    }
  }
  if (mapping.has_umbrella) {
    const val = String(row[mapping.has_umbrella] || '').toLowerCase();
    if (val === 'yes' || val === 'y' || val === '1' || val === 'true' || val === 'x') {
      products.push('Umbrella');
    }
  }

  // If no product flags found, try the products column
  if (products.length === 0 && mapping.products && row[mapping.products]) {
    const prodStr = String(row[mapping.products]).trim();
    if (prodStr) {
      products.push(...prodStr.split(/[,;]/).map(p => p.trim()).filter(Boolean));
    }
  }

  const currentProducts = products.length > 0 ? products.join(', ') : 'Unknown';
  const isMonoline = products.length === 1;

  // Check monoline flag if available
  // IMPORTANT: "Multiline" contains "mono" so we need to check for "multi" first
  let monolineFromFlag = false;
  if (mapping.monoline_flag && row[mapping.monoline_flag]) {
    const val = String(row[mapping.monoline_flag]).toLowerCase().trim();
    // Check for multiline first (it contains "mono" so would match incorrectly)
    const isMultiline = val.includes('multi');
    // Only set monoline if explicitly monoline and NOT multiline
    monolineFromFlag = !isMultiline && (val.includes('mono') || val === '1' || val === 'yes' || val === 'single');
  }

  // Determine segment and recommendation based on ACTUAL products held
  const hasAuto = products.some(p => p.toLowerCase().includes('auto'));
  const hasProperty = products.some(p => p.toLowerCase().includes('property') || p.toLowerCase().includes('home'));
  const hasLife = products.some(p => p.toLowerCase().includes('life'));
  const hasUmbrella = products.some(p => p.toLowerCase().includes('umbrella'));

  // TRUE monoline = only ONE product line
  // Even if the flag says "monoline", if they have multiple products, they're NOT monoline
  const isTrueMonoline = (isMonoline || monolineFromFlag) && products.length <= 1;

  let segmentType = 'other';
  let recommendedProduct = 'Additional Coverage';

  if (isTrueMonoline) {
    // Customer has only ONE product - good cross-sell opportunity
    if (hasAuto && !hasProperty) {
      segmentType = 'auto_to_home';
      recommendedProduct = 'Homeowners/Renters';
    } else if (hasProperty && !hasAuto) {
      segmentType = 'home_to_auto';
      recommendedProduct = 'Auto Insurance';
    } else {
      segmentType = 'mono_to_bundle';
      recommendedProduct = 'Bundle Package';
    }
  } else if (hasAuto && hasProperty && !hasLife) {
    // Already bundled auto+home, suggest life
    segmentType = 'add_life';
    recommendedProduct = 'Life Insurance';
  } else if (hasAuto && hasProperty && hasLife && !hasUmbrella) {
    // Has auto+home+life, suggest umbrella
    segmentType = 'add_umbrella';
    recommendedProduct = 'Umbrella Coverage';
  } else if (!hasLife) {
    // Has some products but no life
    segmentType = 'add_life';
    recommendedProduct = 'Life Insurance';
  } else {
    // Fully loaded customer
    segmentType = 'add_umbrella';
    recommendedProduct = 'Umbrella Coverage';
  }

  // Calculate priority score
  let priorityScore = 0;

  // TRUE mono-line customers are high priority for cross-sell
  if (isTrueMonoline) {
    priorityScore += 40;
  }

  // Upcoming renewals
  if (renewalDate) {
    const daysUntil = Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 30) {
      priorityScore += 25;
    } else if (daysUntil > 30 && daysUntil <= 60) {
      priorityScore += 15;
    }
  }

  // Balance due
  if (balanceDue > 0) {
    priorityScore += 10;
  }

  // No EZPay
  if (ezpayStatus === 'No') {
    priorityScore += 10;
  }

  // High premium customers
  if (currentPremium > 2000) {
    priorityScore += 15;
  }

  // Long tenure loyalty bonus
  if (tenureYears >= 10) {
    priorityScore += 5;
  }

  // Determine tier
  let priorityTier = 'LOW';
  if (priorityScore >= 80) {
    priorityTier = 'HOT';
  } else if (priorityScore >= 60) {
    priorityTier = 'HIGH';
  } else if (priorityScore >= 40) {
    priorityTier = 'MEDIUM';
  }

  // Generate talking points
  const talkingPoints: string[] = [];

  if (isTrueMonoline) {
    talkingPoints.push(`Currently ${currentProducts}-only - great opportunity to discuss ${recommendedProduct}`);
  } else if (hasAuto && hasProperty && !hasLife) {
    talkingPoints.push(`Already bundled (${currentProducts}) - perfect candidate for ${recommendedProduct}`);
  }

  if (renewalDate) {
    const daysUntil = Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 30) {
      talkingPoints.push(`Renewal coming up soon - perfect time to review coverage`);
    }
  }

  if (tenureYears >= 5) {
    talkingPoints.push(`Loyal customer of ${Math.round(tenureYears)} years - thank them for their business`);
  }

  if (ezpayStatus === 'No') {
    talkingPoints.push('Mention EZPay convenience for automatic payments');
  }

  if (talkingPoints.length === 0) {
    talkingPoints.push('Review current coverage and identify any gaps');
    talkingPoints.push(`Discuss ${recommendedProduct} options`);
  }

  return {
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
    renewal_status: 'Pending',
    recommended_product: recommendedProduct,
    segment_type: segmentType,
    priority_score: priorityScore,
    priority_tier: priorityTier,
    talking_points: talkingPoints.slice(0, 3),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = formData.get('uploaded_by') as string;
    const agencyId = formData.get('agency_id') as string | null;
    const dryRun = formData.get('dry_run') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!uploadedBy) {
      return NextResponse.json({ error: 'uploaded_by is required' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: CSV, XLSX, XLS' },
        { status: 400 }
      );
    }

    // Parse file
    const buffer = await file.arrayBuffer();
    const { headers, rows } = parseExcelFile(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });
    }

    console.log(`Processing ${rows.length} rows...`);

    // Use AI to detect column mapping (single API call)
    console.log('Detecting column mapping with AI...');
    const aiResponse = await detectColumnMapping(headers, rows.slice(0, 10));
    console.log('AI Column Mapping:', aiResponse.column_mapping);
    console.log('Product Detection:', aiResponse.product_detection);

    // Apply mapping to all rows programmatically (fast!)
    console.log('Transforming rows...');
    const customers: ParsedCustomer[] = [];
    for (const row of rows) {
      const customer = transformRow(row, aiResponse.column_mapping);
      if (customer) {
        customers.push(customer);
      }
    }

    console.log(`Transformed ${customers.length} valid records from ${rows.length} rows`);

    if (customers.length === 0) {
      return NextResponse.json({ error: 'Could not extract any valid records' }, { status: 400 });
    }

    // Sort by priority score
    customers.sort((a, b) => b.priority_score - a.priority_score);

    // Prepare records for database
    const opportunities = customers.map((c, index) => ({
      agency_id: agencyId || undefined,
      priority_rank: index + 1,
      priority_tier: c.priority_tier,
      priority_score: c.priority_score,
      customer_name: c.customer_name,
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      city: c.city || null,
      zip_code: c.zip_code || null,
      renewal_date: c.renewal_date || null,
      days_until_renewal: c.renewal_date
        ? Math.max(0, Math.ceil((new Date(c.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
      current_products: c.current_products,
      recommended_product: c.recommended_product,
      segment: `${c.segment_type}: ${c.current_products} → ${c.recommended_product}`,
      segment_type: c.segment_type,
      current_premium: c.current_premium,
      potential_premium_add: getPotentialPremium(c.segment_type),
      expected_conversion_pct: getConversionRate(c.segment_type),
      retention_lift_pct: getRetentionLift(c.segment_type),
      talking_point_1: c.talking_points[0] || null,
      talking_point_2: c.talking_points[1] || null,
      talking_point_3: c.talking_points[2] || null,
      balance_due: c.balance_due,
      ezpay_status: c.ezpay_status,
      tenure_years: c.tenure_years,
      policy_count: c.policy_count,
      renewal_status: c.renewal_status,
    }));

    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    // Insert/update database if not dry run
    if (!dryRun) {
      // Get all customer names being uploaded
      const customerNames = opportunities.map(o => o.customer_name);

      // Build query to find existing records
      let existingQuery = supabase
        .from('cross_sell_opportunities')
        .select('id, customer_name')
        .in('customer_name', customerNames);

      // Filter by agency if provided
      if (agencyId) {
        existingQuery = existingQuery.eq('agency_id', agencyId);
      }

      const { data: existing } = await existingQuery;
      const existingNames = new Set(existing?.map(e => e.customer_name) || []);
      const existingIds = existing?.map(e => e.id) || [];

      console.log(`Found ${existingNames.size} existing customers to update`);

      // Delete existing records for these customers (to replace with fresh data)
      if (existingIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('cross_sell_opportunities')
          .delete()
          .in('id', existingIds);

        if (deleteError) {
          console.error('Failed to delete existing records:', deleteError);
        } else {
          recordsUpdated = existingIds.length;
        }
      }

      // Insert all records (both new and updated)
      const BATCH_SIZE = 100;
      for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
        const batch = opportunities.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from('cross_sell_opportunities')
          .insert(batch);

        if (insertError) {
          console.error('Failed to insert batch:', insertError);
          recordsFailed += batch.length;
        } else {
          // Count as created or updated based on whether they existed before
          batch.forEach(record => {
            if (existingNames.has(record.customer_name)) {
              // Already counted in recordsUpdated via delete
            } else {
              recordsCreated++;
            }
          });
        }
      }
    }

    // Calculate summary stats
    const tierCounts = {
      HOT: opportunities.filter(o => o.priority_tier === 'HOT').length,
      HIGH: opportunities.filter(o => o.priority_tier === 'HIGH').length,
      MEDIUM: opportunities.filter(o => o.priority_tier === 'MEDIUM').length,
      LOW: opportunities.filter(o => o.priority_tier === 'LOW').length,
    };

    // Return response matching the frontend UploadResult interface
    return NextResponse.json({
      success: true,
      batch_id: null,
      dry_run: dryRun,
      stats: {
        total_records: rows.length,
        valid_records: customers.length,
        records_created: dryRun ? 0 : recordsCreated,
        records_updated: dryRun ? 0 : recordsUpdated,
        records_skipped: rows.length - customers.length,
        records_failed: recordsFailed,
        parsing_errors: 0,
        parsing_warnings: 0,
      },
      summary: {
        total_records: customers.length,
        priority_breakdown: {
          high: tierCounts.HOT + tierCounts.HIGH,
          medium: tierCounts.MEDIUM,
          low: tierCounts.LOW,
        },
        by_segment: {},
        top_recommendations: [],
      },
      errors: [] as Array<{ row?: number; message: string }>,
      warnings: [] as Array<{ row?: number; message: string }>,
      sample_records: customers.slice(0, 5),
    });
  } catch (error) {
    console.error('AI Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Helper functions for estimates
function getPotentialPremium(segment: string): number {
  const premiums: Record<string, number> = {
    auto_to_home: 2963,
    home_to_auto: 2800,
    mono_to_bundle: 1500,
    add_life: 1200,
    add_umbrella: 350,
    other: 1000,
  };
  return premiums[segment] || 1000;
}

function getConversionRate(segment: string): number {
  const rates: Record<string, number> = {
    auto_to_home: 22,
    home_to_auto: 25,
    mono_to_bundle: 30,
    add_life: 15,
    add_umbrella: 18,
    other: 10,
  };
  return rates[segment] || 10;
}

function getRetentionLift(segment: string): number {
  const lifts: Record<string, number> = {
    auto_to_home: 19,
    home_to_auto: 19,
    mono_to_bundle: 25,
    add_life: 15,
    add_umbrella: 12,
    other: 10,
  };
  return lifts[segment] || 10;
}
