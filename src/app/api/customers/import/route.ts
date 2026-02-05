/**
 * Customer Import API
 *
 * POST /api/customers/import - Import customers from parsed CSV data
 *
 * SECURITY FEATURES:
 * - Session-based authentication (required)
 * - Rate limiting (20 imports per hour)
 * - Field-level encryption for PII (email, phone)
 * - Audit logging for compliance
 * - Agency-scoped data isolation
 * - Log sanitization for sensitive data
 *
 * Features:
 * - Batch insert into customer_insights table
 * - Duplicate detection based on customer_email or customer_name
 * - Validation of required fields
 * - Detailed error reporting per row
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { validateSession } from '@/lib/sessionValidator';
import { encryptField } from '@/lib/fieldEncryption';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { securityMonitor, SecurityEventType, AlertSeverity } from '@/lib/securityMonitor';

// Valid retention risk values
const VALID_RETENTION_RISKS = ['low', 'medium', 'high'] as const;
type RetentionRisk = (typeof VALID_RETENTION_RISKS)[number];

// Request body types
interface CustomerImportRow {
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

interface ImportRequestBody {
  customers: CustomerImportRow[];
  agency_id?: string;
}

// Response types
interface ImportError {
  row: number;
  message: string;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: ImportError[];
}

// Validation helper
function validateCustomer(
  customer: CustomerImportRow,
  rowIndex: number
): ImportError | null {
  // Required field: customer_name
  if (!customer.customer_name || typeof customer.customer_name !== 'string') {
    return {
      row: rowIndex,
      message: 'customer_name is required and must be a string',
    };
  }

  if (customer.customer_name.trim().length === 0) {
    return {
      row: rowIndex,
      message: 'customer_name cannot be empty',
    };
  }

  // Validate optional fields if provided
  if (
    customer.customer_email !== undefined &&
    customer.customer_email !== null &&
    customer.customer_email !== ''
  ) {
    // Basic email format validation (don't leak PII in error messages)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.customer_email)) {
      return {
        row: rowIndex,
        message: 'Invalid email format',
      };
    }
  }

  if (customer.total_premium !== undefined && customer.total_premium !== null) {
    if (typeof customer.total_premium !== 'number' || customer.total_premium < 0) {
      return {
        row: rowIndex,
        message: 'total_premium must be a non-negative number',
      };
    }
  }

  if (customer.total_policies !== undefined && customer.total_policies !== null) {
    if (
      typeof customer.total_policies !== 'number' ||
      !Number.isInteger(customer.total_policies) ||
      customer.total_policies < 0
    ) {
      return {
        row: rowIndex,
        message: 'total_policies must be a non-negative integer',
      };
    }
  }

  if (customer.tenure_years !== undefined && customer.tenure_years !== null) {
    if (
      typeof customer.tenure_years !== 'number' ||
      !Number.isInteger(customer.tenure_years) ||
      customer.tenure_years < 0
    ) {
      return {
        row: rowIndex,
        message: 'tenure_years must be a non-negative integer',
      };
    }
  }

  if (customer.retention_risk !== undefined && customer.retention_risk !== null) {
    if (!VALID_RETENTION_RISKS.includes(customer.retention_risk as RetentionRisk)) {
      return {
        row: rowIndex,
        message: `retention_risk must be one of: ${VALID_RETENTION_RISKS.join(', ')}`,
      };
    }
  }

  if (customer.upcoming_renewal !== undefined && customer.upcoming_renewal !== null) {
    const date = new Date(customer.upcoming_renewal);
    if (isNaN(date.getTime())) {
      return {
        row: rowIndex,
        message: 'Invalid date format for upcoming_renewal',
      };
    }
  }

  if (customer.products_held !== undefined && customer.products_held !== null) {
    if (!Array.isArray(customer.products_held)) {
      return {
        row: rowIndex,
        message: 'products_held must be an array of strings',
      };
    }
    for (const product of customer.products_held) {
      if (typeof product !== 'string') {
        return {
          row: rowIndex,
          message: 'products_held must contain only strings',
        };
      }
    }
  }

  return null;
}

// Normalize customer data for database insertion with PII encryption
function normalizeCustomer(
  customer: CustomerImportRow,
  agencyId?: string
): Record<string, unknown> {
  // Encrypt PII fields before storage (email, phone)
  const encryptedEmail = customer.customer_email?.trim()
    ? encryptField(customer.customer_email.trim(), 'customer_insights.customer_email')
    : null;

  const encryptedPhone = customer.customer_phone?.trim()
    ? encryptField(customer.customer_phone.trim(), 'customer_insights.customer_phone')
    : null;

  return {
    agency_id: agencyId || null,
    customer_name: customer.customer_name.trim(),
    customer_email: encryptedEmail,
    customer_phone: encryptedPhone,
    total_premium: customer.total_premium ?? 0,
    total_policies: customer.total_policies ?? 0,
    products_held: customer.products_held ?? [],
    tenure_years: customer.tenure_years ?? 0,
    retention_risk: customer.retention_risk ?? 'low',
    upcoming_renewal: customer.upcoming_renewal
      ? new Date(customer.upcoming_renewal).toISOString().split('T')[0]
      : null,
  };
}

// Log import activity for audit trail
async function logImportActivity(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userName: string,
  importedCount: number,
  duplicateCount: number,
  errorCount: number,
  agencyId?: string
): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      action: 'customer_import',
      user_name: userName,
      details: {
        imported: importedCount,
        duplicates: duplicateCount,
        errors: errorCount,
        agency_id: agencyId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to log customer import activity', error as Error, {
      component: 'CustomerImport',
      action: 'audit_log',
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATION - Validate session
    const session = await validateSession(request);
    if (!session.valid || !session.userName) {
      logger.warn('Unauthorized customer import attempt', {
        component: 'CustomerImport',
        action: 'auth_failure',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: [{ row: 0, message: 'Authentication required. Please log in.' }],
        },
        { status: 401 }
      );
    }

    // 2. RATE LIMITING - Prevent abuse (reuse upload limiter: 20/hour)
    const rateLimitResult = await checkRateLimit(
      `customer-import:${session.userId || session.userName}`,
      rateLimiters.upload
    );

    if (!rateLimitResult.success) {
      logger.warn('Customer import rate limit exceeded', {
        component: 'CustomerImport',
        action: 'rate_limit',
        user: session.userName,
      });

      await securityMonitor.recordEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: AlertSeverity.MEDIUM,
        userId: session.userId,
        details: {
          action: 'customer_import',
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        },
      });

      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: [{ row: 0, message: 'Rate limit exceeded. Please try again later.' }],
        },
        { status: 429 }
      );
    }

    const body: ImportRequestBody = await request.json();

    // 3. AGENCY SCOPING - Use session agency if not specified
    const agencyId = body.agency_id || session.agencyId;

    // Validate request body structure
    if (!body.customers || !Array.isArray(body.customers)) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: [{ row: 0, message: 'Request body must contain a "customers" array' }],
        },
        { status: 400 }
      );
    }

    if (body.customers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: [{ row: 0, message: 'No customers provided for import' }],
        },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 1000;
    if (body.customers.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: [{ row: 0, message: `Maximum ${MAX_BATCH_SIZE} customers per import` }],
        },
        { status: 400 }
      );
    }

    // Validate all customers first
    const validationErrors: ImportError[] = [];
    for (let i = 0; i < body.customers.length; i++) {
      const error = validateCustomer(body.customers[i], i + 1); // 1-indexed rows for user readability
      if (error) {
        validationErrors.push(error);
      }
    }

    // If there are validation errors, return them without importing
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Build lookup keys for duplicate detection
    // We'll check by email first (if present), then by name
    const customerEmails = body.customers
      .filter((c) => c.customer_email)
      .map((c) => c.customer_email!.toLowerCase().trim());

    const customerNames = body.customers.map((c) => c.customer_name.trim());

    // Fetch existing customers for duplicate detection
    let existingByEmail: Set<string> = new Set();
    let existingByName: Set<string> = new Set();

    // Check for existing customers by email
    if (customerEmails.length > 0) {
      const { data: existingEmailCustomers, error: emailError } = await supabase
        .from('customer_insights')
        .select('customer_email')
        .in('customer_email', customerEmails);

      if (emailError) {
        logger.error('Database error checking duplicate emails', emailError, {
          component: 'CustomerImport',
          action: 'duplicate_check',
        });
        return NextResponse.json(
          {
            success: false,
            imported: 0,
            duplicates: 0,
            errors: [{ row: 0, message: 'Database error during import. Please try again.' }],
          },
          { status: 500 }
        );
      }

      existingByEmail = new Set(
        (existingEmailCustomers || [])
          .map((c) => c.customer_email?.toLowerCase())
          .filter(Boolean) as string[]
      );
    }

    // Check for existing customers by name
    if (customerNames.length > 0) {
      const { data: existingNameCustomers, error: nameError } = await supabase
        .from('customer_insights')
        .select('customer_name')
        .in('customer_name', customerNames);

      if (nameError) {
        logger.error('Database error checking duplicate names', nameError, {
          component: 'CustomerImport',
          action: 'duplicate_check',
        });
        return NextResponse.json(
          {
            success: false,
            imported: 0,
            duplicates: 0,
            errors: [{ row: 0, message: 'Database error during import. Please try again.' }],
          },
          { status: 500 }
        );
      }

      existingByName = new Set(
        (existingNameCustomers || []).map((c) => c.customer_name).filter(Boolean) as string[]
      );
    }

    // Separate new customers from duplicates
    const customersToInsert: Record<string, unknown>[] = [];
    const duplicateRows: number[] = [];
    const insertErrors: ImportError[] = [];

    for (let i = 0; i < body.customers.length; i++) {
      const customer = body.customers[i];
      const rowNum = i + 1;

      // Check for duplicate by email (if email is present)
      if (customer.customer_email) {
        const emailLower = customer.customer_email.toLowerCase().trim();
        if (existingByEmail.has(emailLower)) {
          duplicateRows.push(rowNum);
          continue;
        }
      }

      // Check for duplicate by name
      if (existingByName.has(customer.customer_name.trim())) {
        duplicateRows.push(rowNum);
        continue;
      }

      // Also check against customers we're about to insert (prevent duplicates within batch)
      const alreadyInBatch = customersToInsert.some(
        (c) =>
          c.customer_name === customer.customer_name.trim() ||
          (customer.customer_email &&
            c.customer_email === customer.customer_email.toLowerCase().trim())
      );

      if (alreadyInBatch) {
        duplicateRows.push(rowNum);
        continue;
      }

      customersToInsert.push(normalizeCustomer(customer, agencyId));
    }

    // Insert new customers in batches of 100
    let importedCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < customersToInsert.length; i += BATCH_SIZE) {
      const batch = customersToInsert.slice(i, i + BATCH_SIZE);

      const { data, error: insertError } = await supabase
        .from('customer_insights')
        .insert(batch)
        .select('id');

      if (insertError) {
        logger.error('Batch insert failed', insertError, {
          component: 'CustomerImport',
          action: 'batch_insert',
          batchStart: i,
          batchSize: batch.length,
        });
        // Don't leak database error messages - use generic message
        const batchStartRow = i + 1;
        insertErrors.push({
          row: batchStartRow,
          message: `Batch insert failed (rows ${batchStartRow}-${batchStartRow + batch.length - 1})`,
        });
      } else {
        importedCount += data?.length || 0;
      }
    }

    const success = importedCount > 0 || (duplicateRows.length > 0 && insertErrors.length === 0);

    // 4. AUDIT LOGGING - Record import for compliance
    await logImportActivity(
      supabase,
      session.userName,
      importedCount,
      duplicateRows.length,
      insertErrors.length,
      agencyId
    );

    // Log successful import (sanitized - no customer data)
    logger.info('Customer import completed', {
      component: 'CustomerImport',
      action: 'import_complete',
      user: session.userName,
      imported: importedCount,
      duplicates: duplicateRows.length,
      errors: insertErrors.length,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      success,
      imported: importedCount,
      duplicates: duplicateRows.length,
      errors: insertErrors,
    });
  } catch (error) {
    logger.error('Customer import failed', error as Error, {
      component: 'CustomerImport',
      action: 'import_error',
    });

    return NextResponse.json(
      {
        success: false,
        imported: 0,
        duplicates: 0,
        errors: [
          {
            row: 0,
            message: 'Failed to process import. Please try again.',
          },
        ],
      },
      { status: 500 }
    );
  }
}
