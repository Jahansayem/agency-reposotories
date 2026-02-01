import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_PERMISSIONS } from '@/types/agency';
import type { AgencyRole } from '@/types/agency';

/**
 * GET /api/agencies/[agencyId]/members
 * List all members of an agency
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;

    const { data, error } = await supabase
      .from('agency_members')
      .select(`
        id,
        user_id,
        role,
        status,
        permissions,
        is_default_agency,
        created_at,
        users!inner (
          id,
          name,
          color,
          role as global_role
        )
      `)
      .eq('agency_id', agencyId)
      .order('created_at');

    if (error) throw error;

    const members = (data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      user_name: m.users.name,
      user_color: m.users.color,
      global_role: m.users.global_role,
      agency_role: m.role,
      status: m.status,
      permissions: m.permissions,
      is_default_agency: m.is_default_agency,
      joined_at: m.created_at,
    }));

    return NextResponse.json({ members });

  } catch (error) {
    console.error('Error fetching agency members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agencies/[agencyId]/members
 * Add a user to an agency
 *
 * Access: Owner or Admin only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;
    const body = await request.json();
    const { user_name, role, requested_by } = body;

    if (!user_name || !role || !requested_by) {
      return NextResponse.json(
        { error: 'user_name, role, and requested_by are required' },
        { status: 400 }
      );
    }

    // Verify requesting user has permission (owner or admin)
    const { data: requester } = await supabase
      .from('agency_members')
      .select('role')
      .eq('agency_id', agencyId)
      .eq('user_id', (await supabase.from('users').select('id').eq('name', requested_by).single()).data?.id)
      .single();

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only agency owners and admins can add members.' },
        { status: 403 }
      );
    }

    // Get user to add
    const { data: userToAdd, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', user_name)
      .single();

    if (userError || !userToAdd) {
      return NextResponse.json(
        { error: `User "${user_name}" not found` },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('agency_members')
      .select('id')
      .eq('user_id', userToAdd.id)
      .eq('agency_id', agencyId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: `${user_name} is already a member of this agency` },
        { status: 409 }
      );
    }

    // Add user to agency
    const permissions = DEFAULT_PERMISSIONS[role as AgencyRole];

    const { data: newMember, error: insertError } = await supabase
      .from('agency_members')
      .insert({
        user_id: userToAdd.id,
        agency_id: agencyId,
        role: role as AgencyRole,
        status: 'active',
        permissions,
        is_default_agency: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to add member:', insertError);
      return NextResponse.json(
        { error: 'Failed to add member', details: insertError.message },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await supabase.from('activity_log').insert({
        action: 'member_added',
        user_name: requested_by,
        details: {
          agency_id: agencyId,
          added_user: user_name,
          role: role,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    return NextResponse.json({
      success: true,
      member: newMember,
      message: `${user_name} added to agency as ${role}`,
    });

  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agencies/[agencyId]/members/[memberId]
 * Remove a user from an agency
 *
 * Access: Owner or Admin only (can't remove other owners)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const requestedBy = searchParams.get('requested_by');

    if (!memberId || !requestedBy) {
      return NextResponse.json(
        { error: 'memberId and requested_by are required' },
        { status: 400 }
      );
    }

    // Verify requesting user has permission
    const { data: requester } = await supabase
      .from('agency_members')
      .select('role')
      .eq('agency_id', agencyId)
      .eq('user_id', (await supabase.from('users').select('id').eq('name', requestedBy).single()).data?.id)
      .single();

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only agency owners and admins can remove members.' },
        { status: 403 }
      );
    }

    // Get member to remove
    const { data: memberToRemove } = await supabase
      .from('agency_members')
      .select('role, user_id, users!inner(name)')
      .eq('id', memberId)
      .eq('agency_id', agencyId)
      .single();

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Can't remove owners (unless you're also an owner)
    if (memberToRemove.role === 'owner' && requester.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove other owners' },
        { status: 403 }
      );
    }

    // Delete the membership
    const { error: deleteError } = await supabase
      .from('agency_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Failed to remove member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove member', details: deleteError.message },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await supabase.from('activity_log').insert({
        action: 'member_removed',
        user_name: requestedBy,
        details: {
          agency_id: agencyId,
          removed_user: (memberToRemove as any).users.name,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Member removed from agency`,
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
