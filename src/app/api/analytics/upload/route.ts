/**
 * Allstate Data Upload API
 *
 * POST /api/analytics/upload
 * Handles CSV/Excel file uploads from Allstate Book of Business exports
 *
 * Workflow:
 * 1. Parse uploaded file (CSV or Excel)
 * 2. Validate and transform records
 * 3. Calculate priority scores
 * 4. Insert into cross_sell_opportunities table
 * 5. Generate upload summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  parseCSV,
  parseAllstateData,
  calculatePriorityScore,
  calculatePriorityTier,
  calculatePotentialPremium,
  generateTalkingPoints,
  generateUploadSummary,
} from '@/lib/allstate-parser';
import {
  calculateEnhancedScore,
  type EnhancedScoreResult,
} from '@/lib/analytics/enhanced-scoring';
import type {
  AllstateBookOfBusinessRow,
  AllstateDataSource,
  CrossSellOpportunity,
  DataUploadBatch,
  ParsedCrossSellRecord,
} from '@/types/allstate-analytics';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Parse Excel file (.xlsx/.xls) and convert to array of row objects
 * Handles Allstate Renewal Audit Report format (headers on row 5, data starts row 6)
 */
function parseExcelFile(buffer: ArrayBuffer): AllstateBookOfBusinessRow[] {
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
    return [];
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
  const headers = headerRow.map(cell => String(cell || '').trim());

  // Convert remaining rows to objects using the headers
  const rows: AllstateBookOfBusinessRow[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const dataRow = rawData[i] as (string | number | undefined)[];
    if (!dataRow || dataRow.length === 0) continue;

    // Skip rows that appear to be empty or contain only whitespace
    const hasData = dataRow.some(cell => {
      const val = String(cell || '').trim();
      return val !== '' && val !== 'undefined';
    });
    if (!hasData) continue;

    const rowObject: AllstateBookOfBusinessRow = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        // Keep numeric values as numbers for premium/balance fields
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

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dataSource = (formData.get('data_source') as AllstateDataSource) || 'book_of_business';
    const uploadedBy = formData.get('uploaded_by') as string;
    const agencyId = formData.get('agency_id') as string | null;
    const skipDuplicates = formData.get('skip_duplicates') === 'true';
    const updateExisting = formData.get('update_existing') === 'true';
    const dryRun = formData.get('dry_run') === 'true';

    // Enhanced scoring options (uses lead-scoring model for deeper analysis)
    const useEnhancedScoring = formData.get('use_enhanced_scoring') === 'true';
    const blendWeight = parseFloat(formData.get('blend_weight') as string) || 0.6;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!uploadedBy) {
      return NextResponse.json(
        { error: 'uploaded_by is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    let fileType: 'csv' | 'xlsx' | 'xls';

    if (fileName.endsWith('.csv')) {
      fileType = 'csv';
    } else if (fileName.endsWith('.xlsx')) {
      fileType = 'xlsx';
    } else if (fileName.endsWith('.xls')) {
      fileType = 'xls';
    } else {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: CSV, XLSX, XLS' },
        { status: 400 }
      );
    }

    // Parse file based on type
    let rows: AllstateBookOfBusinessRow[];
    if (fileType === 'csv') {
      // Read as text for CSV
      const fileContent = await file.text();
      rows = parseCSV(fileContent);
    } else {
      // Read as ArrayBuffer for Excel files
      const buffer = await file.arrayBuffer();
      try {
        rows = parseExcelFile(buffer);
      } catch (parseError) {
        console.error('Excel parsing error:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse Excel file. Please ensure the file is a valid .xlsx or .xls file.' },
          { status: 400 }
        );
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found in file' },
        { status: 400 }
      );
    }

    // Parse and validate records
    const { records, errors, warnings } = parseAllstateData(rows);

    if (records.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid records found',
          parsing_errors: errors.slice(0, 10), // Return first 10 errors
        },
        { status: 400 }
      );
    }

    // Create upload batch record
    const batchData: Partial<DataUploadBatch> = {
      agency_id: agencyId || undefined,
      file_name: file.name,
      file_size: file.size,
      file_type: fileType,
      data_source: dataSource,
      status: 'processing',
      uploaded_by: uploadedBy,
      total_records: rows.length,
    };

    let batchId: string | null = null;

    if (!dryRun) {
      const { data: batch, error: batchError } = await supabase
        .from('data_upload_batches')
        .insert(batchData)
        .select('id')
        .single();

      if (batchError) {
        console.error('Failed to create upload batch:', batchError);
        return NextResponse.json(
          { error: 'Failed to create upload batch' },
          { status: 500 }
        );
      }

      batchId = batch.id;
    }

    // Process records and prepare for insertion
    const opportunities: Partial<CrossSellOpportunity>[] = [];
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsFailed = 0;

    // Sort by priority score for ranking
    // Use enhanced scoring when enabled (combines allstate-parser + lead-scoring model)
    const scoredRecords = records.map(record => {
      if (useEnhancedScoring) {
        const enhancedResult = calculateEnhancedScore(record, {
          useLeadScoring: true,
          blendWeight,
          includeBreakdown: false,
        });
        return {
          record,
          score: enhancedResult.score,
          tier: enhancedResult.tier,
          enhanced: enhancedResult,
        };
      } else {
        const score = calculatePriorityScore(record);
        return {
          record,
          score,
          tier: calculatePriorityTier(score, record.renewal_date),
          enhanced: null as EnhancedScoreResult | null,
        };
      }
    }).sort((a, b) => b.score - a.score);

    for (let i = 0; i < scoredRecords.length; i++) {
      const { record, score, tier, enhanced } = scoredRecords[i];
      const segment = record.segment_type || 'other';
      const potentialPremium = calculatePotentialPremium(segment, record.current_premium);
      const [tp1, tp2, tp3] = generateTalkingPoints(record);

      // Calculate days until renewal
      let daysUntilRenewal = 365;
      if (record.renewal_date) {
        daysUntilRenewal = Math.ceil(
          (new Date(record.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      }

      // Check for existing record if skip_duplicates or update_existing
      if (skipDuplicates || updateExisting) {
        const { data: existing } = await supabase
          .from('cross_sell_opportunities')
          .select('id')
          .eq('customer_name', record.customer_name)
          .eq('agency_id', agencyId || '')
          .maybeSingle();

        if (existing) {
          if (skipDuplicates) {
            recordsSkipped++;
            continue;
          }
          // updateExisting logic would go here
        }
      }

      const opportunity: Partial<CrossSellOpportunity> = {
        agency_id: agencyId || undefined,
        upload_batch_id: batchId || undefined,
        priority_rank: i + 1,
        priority_tier: tier,
        priority_score: score,
        customer_name: record.customer_name,
        phone: record.phone,
        email: record.email,
        address: record.address,
        city: record.city,
        zip_code: record.zip_code,
        renewal_date: record.renewal_date || undefined,
        days_until_renewal: Math.max(0, daysUntilRenewal),
        renewal_status: record.renewal_status,
        current_products: record.current_products,
        recommended_product: record.recommended_product || 'Additional Coverage',
        segment: `${record.segment_type}: ${record.current_products} → ${record.recommended_product}`,
        segment_type: segment,
        current_premium: record.current_premium,
        potential_premium_add: potentialPremium,
        expected_conversion_pct: getExpectedConversion(segment),
        retention_lift_pct: getRetentionLift(segment),
        talking_point_1: tp1,
        talking_point_2: tp2,
        talking_point_3: tp3,
        balance_due: record.balance_due,
        ezpay_status: record.ezpay_status,
        tenure_years: record.tenure_years,
        policy_count: record.policy_count,
      };

      opportunities.push(opportunity);
    }

    // Insert opportunities if not dry run
    if (!dryRun && opportunities.length > 0) {
      // Insert in batches of 100
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
          recordsCreated += batch.length;
        }
      }

      // Update batch status
      if (batchId) {
        const summary = generateUploadSummary(records);

        await supabase
          .from('data_upload_batches')
          .update({
            status: recordsFailed > 0 ? 'partial' : 'completed',
            processed_at: new Date().toISOString(),
            records_created: recordsCreated,
            records_updated: recordsUpdated,
            records_skipped: recordsSkipped,
            records_failed: recordsFailed,
            error_details: errors.slice(0, 20),
            summary,
          })
          .eq('id', batchId);
      }
    }

    // Generate summary
    const summary = generateUploadSummary(records);

    // Calculate enhanced scoring stats if enabled
    const enhancedScoringStats = useEnhancedScoring ? {
      enabled: true,
      blend_weight: blendWeight,
      enhanced_records: scoredRecords.filter(r => r.enhanced?.enhanced).length,
      average_confidence: scoredRecords.reduce((sum, r) =>
        sum + (r.enhanced?.confidence || 0.7), 0) / scoredRecords.length,
    } : { enabled: false };

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      dry_run: dryRun,
      summary,
      stats: {
        total_records: rows.length,
        valid_records: records.length,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_skipped: recordsSkipped,
        records_failed: recordsFailed,
        parsing_errors: errors.length,
        parsing_warnings: warnings.length,
      },
      enhanced_scoring: enhancedScoringStats,
      errors: errors.slice(0, 10),
      warnings: warnings.slice(0, 10),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/upload
 * List recent upload batches
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agency_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('data_upload_batches')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch upload batches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch upload history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      batches: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching upload batches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for conversion and retention rates
function getExpectedConversion(segment: string): number {
  const rates: Record<string, number> = {
    auto_to_home: 22,
    home_to_auto: 25,
    mono_to_bundle: 30,
    add_life: 15,
    add_umbrella: 18,
    commercial_add: 12,
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
    commercial_add: 20,
    other: 10,
  };
  return lifts[segment] || 10;
}
