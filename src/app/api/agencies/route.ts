import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateAgencySlug, DEFAULT_PERMISSIONS, SUBSCRIPTION_LIMITS } from '@/types/agency';
import type { CreateAgencyRequest, Agency } from '@/types/agency';

/**
 * POST /api/agencies
 * Create a new agency
 *
 * Access: Owner-only (Derrick) or system administrators
 *
 * Request body:
 * {
 *   name: string;           // Agency name (required)
 *   slug?: string;          // URL slug (auto-generated if not provided)
 *   logo_url?: string;      // Logo URL (optional)
 *   primary_color?: string; // Hex color (defaults to Allstate Blue)
 *   secondary_color?: string; // Hex color (defaults to Sky Blue)
 *   created_by: string;     // User name creating the agency (becomes owner)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateAgencyRequest & { created_by: string } = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Agency name is required' },
        { status: 400 }
      );
    }

    if (!body.created_by?.trim()) {
      return NextResponse.json(
        { error: 'created_by (user name) is required' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const slug = body.slug || generateAgencySlug(body.name);

    // Check if slug already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingAgency) {
      return NextResponse.json(
        { error: 'An agency with this name already exists. Please choose a different name.' },
        { status: 409 }
      );
    }

    // Get the user who is creating the agency
    const { data: creator } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('name', body.created_by)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Authorization: Only system owners (Derrick) can create agencies
    // In the future, this could be expanded to allow any user (multi-tenant SaaS model)
    const isSystemOwner = creator.role === 'owner' || creator.name === 'Derrick';

    if (!isSystemOwner) {
      return NextResponse.json(
        { error: 'Unauthorized. Only system administrators can create agencies.' },
        { status: 403 }
      );
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
      console.error('Failed to create agency:', agencyError);
      return NextResponse.json(
        { error: 'Failed to create agency', details: agencyError.message },
        { status: 500 }
      );
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
      console.error('Failed to assign creator as owner:', memberError);
      // Rollback: delete the agency
      await supabase.from('agencies').delete().eq('id', newAgency.id);

      return NextResponse.json(
        { error: 'Failed to assign owner to agency', details: memberError.message },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await supabase.from('activity_log').insert({
        action: 'agency_created',
        user_name: creator.name,
        details: {
          agency_id: newAgency.id,
          agency_name: newAgency.name,
          agency_slug: newAgency.slug,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      agency: newAgency as Agency,
      message: `Agency "${newAgency.name}" created successfully. You are now the owner.`,
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/agencies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agencies
 * List all agencies (optionally filtered by user membership)
 *
 * Query params:
 * - user_id: Filter agencies by user membership (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (userId) {
      // Get agencies for specific user
      const { data, error } = await supabase
        .from('agency_members')
        .select(`
          agency_id,
          role,
          status,
          agencies!inner (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('agencies.is_active', true);

      if (error) throw error;

      const agencies = (data || []).map((m: any) => ({
        ...m.agencies,
        user_role: m.role,
      }));

      return NextResponse.json({ agencies });
    } else {
      // Get all active agencies
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return NextResponse.json({ agencies: data || [] });
    }

  } catch (error) {
    console.error('Error in GET /api/agencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agencies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
