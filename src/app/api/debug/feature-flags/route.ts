import { NextResponse } from 'next/server';
import { getAllFeatureFlags } from '@/lib/featureFlags';

/**
 * GET /api/debug/feature-flags
 * Debug endpoint to check feature flag status
 */
export async function GET() {
  const flags = getAllFeatureFlags();

  return NextResponse.json({
    flags,
    env: {
      NEXT_PUBLIC_ENABLE_MULTI_TENANCY: process.env.NEXT_PUBLIC_ENABLE_MULTI_TENANCY,
    }
  });
}
