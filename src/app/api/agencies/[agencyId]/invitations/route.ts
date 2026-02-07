import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { verifyAgencyAccess } from '@/lib/agencyAuth';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';
import { sendInvitationEmail } from '@/lib/email';
import { safeLogActivity } from '@/lib/safeActivityLog';

/**
 * Hash an invitation token for storage (store hash, not plaintext)
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * GET /api/agencies/[agencyId]/invitations
 *
 * List pending invitations for an agency.
 * Auth: Owner or Manager only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;

    // Verify agency access with owner/manager role requirement
    const auth = await verifyAgencyAccess(request, {
      agencyId,
      requiredRoles: ['owner', 'manager'],
    });

    if (!auth.success || !auth.context) {
      return auth.response || apiErrorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const supabase = createServiceRoleClient();

    const { data: invitations, error } = await supabase
      .from('agency_invitations')
      .select('id, agency_id, email, role, status, expires_at, invited_by, created_at, accepted_at, accepted_by')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch invitations', error, { agencyId });
      return apiErrorResponse('FETCH_FAILED', 'Failed to fetch invitations', 500);
    }

    return NextResponse.json({
      success: true,
      invitations: invitations || [],
    });
  } catch (error) {
    logger.error('GET invitations error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * POST /api/agencies/[agencyId]/invitations
 *
 * Create a new invitation for an agency.
 * Auth: Owner or Manager only.
 *
 * Request body:
 * {
 *   email: string;               // Email of invitee (optional but recommended)
 *   role: 'manager' | 'staff';   // Role to assign
 *   expires_in_days?: number;     // Days until expiry (default 7)
 * }
 *
 * Response: { success, invitation: { id, token, email, role, expires_at, invite_url } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;

    // Verify agency access with owner/manager role requirement
    const auth = await verifyAgencyAccess(request, {
      agencyId,
      requiredRoles: ['owner', 'manager'],
    });

    if (!auth.success || !auth.context) {
      return auth.response || apiErrorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { email, role, expires_in_days } = body;

    // ---- Validation ----
    if (!role || !['manager', 'staff'].includes(role)) {
      return apiErrorResponse('INVALID_ROLE', 'Role must be "manager" or "staff"');
    }

    // Only owners can invite managers
    if (role === 'manager' && auth.context.agencyRole !== 'owner') {
      return apiErrorResponse('FORBIDDEN', 'Only agency owners can invite managers', 403);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiErrorResponse('INVALID_EMAIL', 'Invalid email format');
    }

    const supabase = createServiceRoleClient();

    // ---- Check max_users limit ----
    const { data: agency } = await supabase
      .from('agencies')
      .select('max_users, name')
      .eq('id', agencyId)
      .single();

    if (!agency) {
      return apiErrorResponse('NOT_FOUND', 'Agency not found', 404);
    }

    // Count current members + pending invitations
    const { count: memberCount } = await supabase
      .from('agency_members')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'active');

    const { count: pendingCount } = await supabase
      .from('agency_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'pending');

    const totalSlots = (memberCount || 0) + (pendingCount || 0);
    if (totalSlots >= agency.max_users) {
      return apiErrorResponse(
        'MAX_USERS_REACHED',
        `Agency has reached its maximum of ${agency.max_users} users. Upgrade your plan or remove existing members.`,
        403,
      );
    }

    // ---- Check for duplicate pending invitation to same email ----
    if (email) {
      const { data: existingInvite } = await supabase
        .from('agency_invitations')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        return apiErrorResponse('DUPLICATE_INVITATION', 'A pending invitation already exists for this email address', 409);
      }
    }

    // ---- Generate token ----
    // Generate plaintext token (sent to invitee), store sha256 hash in DB
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    // Calculate expiration (default 7 days)
    const expiresInDays = expires_in_days && expires_in_days > 0 && expires_in_days <= 30
      ? expires_in_days
      : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // ---- Insert invitation ----
    const { data: invitation, error: insertError } = await supabase
      .from('agency_invitations')
      .insert({
        agency_id: agencyId,
        email: email ? email.toLowerCase() : null,
        role,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: auth.context.userName,
      })
      .select('id, email, role, expires_at, created_at')
      .single();

    if (insertError) {
      logger.error('Failed to create invitation', insertError, { agencyId });
      return apiErrorResponse('INSERT_FAILED', 'Failed to create invitation', 500);
    }

    // Build invite URL
    const baseUrl = request.headers.get('origin')
      || request.headers.get('x-forwarded-host')
        ? `https://${request.headers.get('x-forwarded-host')}`
        : process.env.NEXT_PUBLIC_APP_URL
        || 'https://shared-todo-list-production.up.railway.app';
    const inviteUrl = `${baseUrl}/join/${token}`;

    // Log activity (safe - will not break operation if it fails)
    await safeLogActivity(supabase, {
      action: 'task_created', // Reuse existing action type; ideally 'invitation_created'
      user_name: auth.context.userName,
      agency_id: agencyId,
      details: {
        type: 'invitation_created',
        email: email || null,
        role,
        invitation_id: invitation.id,
      },
    });

    // BUGFIX SILENT-002: Properly log email send failures instead of fire-and-forget
    if (email) {
      sendInvitationEmail(email, agency.name, inviteUrl, role).catch((emailError) => {
        logger.error('Failed to send invitation email', emailError, {
          component: 'invitations/route',
          action: 'POST',
          email,
          agencyId,
          invitationId: invitation.id,
        });
        // Could also update the invitation record to mark email failed
        // for future retry or UI notification
      });
    }

    logger.info('Invitation created', {
      agencyId,
      invitationId: invitation.id,
      role,
      email: email || 'none',
      invitedBy: auth.context.userName,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token, // Return plaintext token to the creator (only time it's visible)
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl,
      },
    });
  } catch (error) {
    logger.error('POST invitations error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
