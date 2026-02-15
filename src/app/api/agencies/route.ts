import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateAgencySlug, DEFAULT_PERMISSIONS, SUBSCRIPTION_LIMITS } from '@/types/agency';
import type { Agency } from '@/types/agency';
import { extractAndValidateUserName } from '@/lib/apiAuth';
import { apiErrorResponse } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { safeLogActivity } from '@/lib/safeActivityLog';

/**
 * POST /api/agencies
 * Create a new agency
 *
 * Access: Any authenticated user can create an agency.
 * The creating user becomes the owner of the new agency.
 *
 * Request body:
 * {
 *   name: string;           // Agency name (required)
 *   slug?: string;          // URL slug (auto-generated if not provided)
 *   logo_url?: string;      // Logo URL (optional)
 *   primary_color?: string; // Hex color (defaults to Allstate Blue)
 *   secondary_color?: string; // Hex color (defaults to Sky Blue)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via session — any authenticated user can create
    const { userName, error: authError } = await extractAndValidateUserName(request);
    if (authError) return authError;

    const body = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return apiErrorResponse('VALIDATION_ERROR', 'Agency name is required');
    }

    // Generate slug if not provided
    const slug = body.slug || generateAgencySlug(body.name);

    // API-007: Validate slug format (alphanumeric, lowercase, hyphens, max 50 chars)
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (slug.length < 1 || slug.length > 50) {
      return apiErrorResponse('VALIDATION_ERROR', 'Slug must be between 1 and 50 characters');
    }
    if (!slugRegex.test(slug)) {
      return apiErrorResponse('VALIDATION_ERROR', 'Slug must be lowercase alphanumeric with hyphens only (no leading/trailing hyphens)');
    }

    // Check if slug already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingAgency) {
      return apiErrorResponse('DUPLICATE_SLUG', 'An agency with this name already exists. Please choose a different name.', 409);
    }

    // Get the authenticated user's record
    const { data: creator } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('name', userName)
      .single();

    if (!creator) {
      return apiErrorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Default values
    const primary_color = body.primary_color || '#0033A0'; // Allstate Blue
    const secondary_color = body.secondary_color || '#72B5E8'; // Sky Blue
    const subscription_tier = 'professional'; // Default tier
    const limits = SUBSCRIPTION_LIMITS[subscription_tier];

    // Create the agency
    const { data: newAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: body.name.trim(),
        slug,
        logo_url: body.logo_url,
        primary_color,
        secondary_color,
        subscription_tier,
        max_users: limits.users,
        max_storage_mb: limits.storage_mb,
        is_active: true,
      })
      .select()
      .single();

    if (agencyError) {
      logger.error('Failed to create agency', agencyError, { component: 'api/agencies', action: 'POST' });
      return apiErrorResponse('INSERT_FAILED', 'Failed to create agency', 500);
    }

    // Assign the creator as owner of the new agency
    const { error: memberError } = await supabase
      .from('agency_members')
      .insert({
        user_id: creator.id,
        agency_id: newAgency.id,
        role: 'owner',
        status: 'active',
        permissions: DEFAULT_PERMISSIONS.owner,
        is_default_agency: false, // Keep their existing default agency
      });

    if (memberError) {
      logger.error('Failed to assign creator as owner', memberError, { component: 'api/agencies', action: 'POST' });
      // Rollback: delete the agency
      const { error: rollbackError } = await supabase.from('agencies').delete().eq('id', newAgency.id);
      if (rollbackError) {
        logger.error('CRITICAL: Failed to rollback agency creation — orphaned agency', rollbackError, {
          component: 'api/agencies', action: 'POST', agencyId: newAgency.id,
        });
      }

      return apiErrorResponse('INSERT_FAILED', 'Failed to assign owner to agency', 500);
    }

    // Log activity (safe - will not break operation if it fails)
    await safeLogActivity(supabase, {
      action: 'agency_created',
      user_name: creator.name,
      agency_id: newAgency.id,
      details: {
        agency_name: newAgency.name,
        agency_slug: newAgency.slug,
      },
    });

    return NextResponse.json({
      success: true,
      agency: newAgency as Agency,
      message: `Agency "${newAgency.name}" created successfully. You are now the owner.`,
    });

  } catch (error) {
    logger.error('Unexpected error in POST /api/agencies', error, { component: 'api/agencies', action: 'POST' });
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * GET /api/agencies
 * List agencies the authenticated user belongs to.
 *
 * Access: Authenticated users only. Returns only agencies the user is a member of.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate via session
    const { userName, error: authError } = await extractAndValidateUserName(request);
    if (authError) return authError;

    // Look up the user's ID from the validated session name
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('name', userName)
      .single();

    if (userError || !user) {
      return apiErrorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Get agencies for the authenticated user only
    const { data, error } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        role,
        status,
        is_default_agency,
        agencies!inner (
          id,
          name,
          slug,
          logo_url,
          primary_color,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('agencies.is_active', true);

    if (error) throw error;

    const agencies = (data || []).map((m: any) => ({
      ...m.agencies,
      user_role: m.role,
      is_default: m.is_default_agency,
    }));

    return NextResponse.json({ agencies });

  } catch (error) {
    logger.error('Error in GET /api/agencies', error, { component: 'api/agencies', action: 'GET' });
    return apiErrorResponse('INTERNAL_ERROR', 'Failed to fetch agencies', 500);
  }
}
