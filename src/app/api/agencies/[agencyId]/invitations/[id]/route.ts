import { NextRequest, NextResponse } from 'next/server';
import { verifyAgencyAccess } from '@/lib/agencyAuth';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';

/**
 * DELETE /api/agencies/[agencyId]/invitations/[id]
 *
 * Revoke a pending invitation.
 * Auth: Owner or Manager only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string; id: string }> }
) {
  try {
    const { agencyId, id: invitationId } = await params;

    // Verify agency access with owner/manager role requirement
    const auth = await verifyAgencyAccess(request, {
      agencyId,
      requiredRoles: ['owner', 'manager'],
    });

    if (!auth.success || !auth.context) {
      return auth.response || apiErrorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const supabase = createServiceRoleClient();

    // Fetch the invitation to verify it belongs to this agency and is pending
    const { data: invitation, error: fetchError } = await supabase
      .from('agency_invitations')
      .select('id, agency_id, status, role')
      .eq('id', invitationId)
      .eq('agency_id', agencyId)
      .single();

    if (fetchError || !invitation) {
      return apiErrorResponse('NOT_FOUND', 'Invitation not found', 404);
    }

    if (invitation.status !== 'pending') {
      return apiErrorResponse('INVALID_STATE', `Cannot revoke an invitation that is already ${invitation.status}`);
    }

    // Only owners can revoke manager invitations
    if (invitation.role === 'manager' && auth.context.agencyRole !== 'owner') {
      return apiErrorResponse('FORBIDDEN', 'Only agency owners can revoke manager invitations', 403);
    }

    // Update status to revoked
    const { error: updateError } = await supabase
      .from('agency_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    if (updateError) {
      logger.error('Failed to revoke invitation', updateError, {
        agencyId,
        invitationId,
      });
      return apiErrorResponse('UPDATE_FAILED', 'Failed to revoke invitation', 500);
    }

    logger.info('Invitation revoked', {
      agencyId,
      invitationId,
      revokedBy: auth.context.userName,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    logger.error('DELETE invitation error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
