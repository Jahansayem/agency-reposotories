import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/secureLogger';

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content Security Policy violation reports from browsers.
 * Used to monitor and debug CSP issues without breaking functionality.
 */

interface CspViolationReport {
  'csp-report'?: {
    'document-uri'?: string;
    'referrer'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'blocked-uri'?: string;
    'status-code'?: number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
  // New reporting API format
  body?: {
    documentURL?: string;
    referrer?: string;
    violatedDirective?: string;
    effectiveDirective?: string;
    originalPolicy?: string;
    blockedURL?: string;
    statusCode?: number;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // CSP reports can come as application/csp-report or application/reports+json
    if (!contentType.includes('csp-report') &&
        !contentType.includes('reports+json') &&
        !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const report: CspViolationReport = await request.json();

    // Extract report data (handle both old and new formats)
    const violation = report['csp-report'] || report.body || {};

    const logData = {
      documentUri: violation['document-uri'] || violation.documentURL,
      referrer: violation['referrer'] || violation.referrer,
      violatedDirective: violation['violated-directive'] || violation.violatedDirective,
      effectiveDirective: violation['effective-directive'] || violation.effectiveDirective,
      blockedUri: violation['blocked-uri'] || violation.blockedURL,
      sourceFile: violation['source-file'] || violation.sourceFile,
      lineNumber: violation['line-number'] || violation.lineNumber,
      columnNumber: violation['column-number'] || violation.columnNumber,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    };

    // Log the violation
    logger.security('CSP Violation', {
      ...logData,
      type: 'csp_violation',
    });

    // In production, you might want to:
    // 1. Store in database for analysis
    // 2. Send alerts for certain violation types
    // 3. Aggregate similar violations

    // Return success - browsers expect 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Failed to process CSP report', error);

    // Still return success to avoid console errors in browser
    return new NextResponse(null, { status: 204 });
  }
}

// Also handle OPTIONS for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
