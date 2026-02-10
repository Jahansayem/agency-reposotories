import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSession } from '@/lib/sessionValidator';
import { setSessionCookie } from '@/lib/sessionCookies';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';
import { safeLogActivity } from '@/lib/safeActivityLog';
import { USER_COLORS } from '@/lib/constants';

/**
 * Hash PIN using SHA-256 (matching existing format)
 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * Hash an invitation token for DB lookup
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/invitations/accept
 *
 * Accept an invitation. Can be called by:
 * 1. A new user (is_new_user=true) -- creates user account first
 * 2. An existing logged-in user -- uses session to identify user
 *
 * Request body:
 * {
 *   token: string;         // Invitation token (required)
 *   name?: string;         // Display name (required if is_new_user)
 *   pin?: string;          // 4-digit PIN (required if is_new_user)
 *   email?: string;        // Email (optional)
 *   is_new_user?: boolean; // Whether to create a new user account
 * }
 *
 * Response: { success, agency, role }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, pin, email, is_new_user } = body;

    // ---- Token validation ----
    if (!token || typeof token !== 'string') {
      return apiErrorResponse('VALIDATION_ERROR', 'Invitation token is required');
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return apiErrorResponse('INVALID_TOKEN', 'Invalid token format');
    }

    const tokenHash = hashToken(token);
    const supabase = createServiceRoleClient();

    // ---- Look up invitation ----
    const { data: invitation, error: invError } = await supabase
      .from('agency_invitations')
      .select('id, agency_id, email, role, status, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (invError || !invitation) {
      return apiErrorResponse('INVALID_TOKEN', 'Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      return apiErrorResponse(
        'INVALID_STATE',
        invitation.status === 'accepted'
          ? 'This invitation has already been accepted'
          : 'This invitation is no longer valid',
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return apiErrorResponse('EXPIRED', 'This invitation has expired');
    }

    // Verify agency is active
    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name, slug, is_active')
      .eq('id', invitation.agency_id)
      .single();

    if (!agency || !agency.is_active) {
      return apiErrorResponse('AGENCY_INACTIVE', 'The agency associated with this invitation is no longer active');
    }

    let userId: string;
    let userName: string;

    if (is_new_user) {
      // ---- Create new user ----
      if (!name?.trim()) {
        return apiErrorResponse('VALIDATION_ERROR', 'Name is required for new users');
      }

      if (!pin || !/^\d{4}$/.test(pin)) {
        return apiErrorResponse('VALIDATION_ERROR', 'PIN must be exactly 4 digits');
      }

      const trimmedName = name.trim();

      // Check name uniqueness
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('name', trimmedName)
        .maybeSingle();

      if (existingUser) {
        return apiErrorResponse('DUPLICATE_NAME', 'A user with this name already exists', 409);
      }

      // If invitation has email constraint, validate it
      if (invitation.email && email && invitation.email.toLowerCase() !== email.toLowerCase()) {
        return apiErrorResponse('EMAIL_MISMATCH', 'Email does not match the invitation');
      }

      const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
      const pinHash = hashPin(pin);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: trimmedName,
          pin_hash: pinHash,
          color,
          role: 'staff',
          ...(email ? { email } : {}),
        })
        .select('id, name')
        .single();

      if (userError) {
        logger.error('Failed to create user during invitation acceptance', userError, {
          name: trimmedName,
        });
        return apiErrorResponse('INSERT_FAILED', 'Failed to create user account', 500);
      }

      userId = newUser.id;
      userName = newUser.name;
    } else {
      // ---- Existing user: validate session ----
      // Import here to avoid circular dependencies at module level
      const { validateSession } = await import('@/lib/sessionValidator');
      const session = await validateSession(request);

      if (!session.valid || !session.userId || !session.userName) {
        return apiErrorResponse('UNAUTHORIZED', 'Authentication required. Please log in first or register as a new user.', 401);
      }

      userId = session.userId;
      userName = session.userName;
    }

    // ---- Check if user is already a member ----
    // SECURITY: Verify agency_id is present to prevent duplicate memberships
    // when invitation has null agency_id (data integrity issue)
    if (!invitation.agency_id) {
      logger.error('Invitation has null agency_id', null, {
        invitationId: invitation.id,
        userId,
      });
      return apiErrorResponse('INVALID_STATE', 'Invalid invitation: missing agency association', 500);
    }

    const { data: existingMember } = await supabase
      .from('agency_members')
      .select('id, status')
      .eq('user_id', userId)
      .eq('agency_id', invitation.agency_id)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return apiErrorResponse('ALREADY_MEMBER', 'You are already a member of this agency', 409);
      }
      // If suspended, they can't rejoin via invitation
      if (existingMember.status === 'suspended') {
        return apiErrorResponse('SUSPENDED', 'Your membership in this agency has been suspended. Contact the agency owner.', 403);
      }
    }

    // ---- Accept the invitation (call Postgres function) ----
    const { data: acceptResult, error: acceptError } = await supabase
      .rpc('accept_agency_invitation', {
        p_invitation_id: invitation.id,
        p_user_id: userId,
      });

    if (acceptError) {
      logger.error('Failed to accept invitation via RPC', acceptError, {
        userId,
        invitationId: invitation.id,
      });

      // Fallback: manual acceptance if RPC doesn't exist
      if (acceptError.message?.includes('function') || acceptError.code === '42883') {
        logger.warn('accept_agency_invitation RPC not found, using fallback logic', {
          userId,
          invitationId: invitation.id,
        });

        // Import DEFAULT_PERMISSIONS
        const { DEFAULT_PERMISSIONS } = await import('@/types/agency');

        // Manually create membership and update invitation
        const { error: memberError } = await supabase
          .from('agency_members')
          .insert({
            user_id: userId,
            agency_id: invitation.agency_id,
            role: invitation.role,
            status: 'active',
            permissions: DEFAULT_PERMISSIONS[invitation.role as keyof typeof DEFAULT_PERMISSIONS],
            is_default_agency: false,
          });

        if (memberError) {
          logger.error('Fallback: failed to create membership', memberError, {
            userId,
            agencyId: invitation.agency_id,
          });
          return apiErrorResponse('INSERT_FAILED', 'Failed to join agency', 500);
        }

        // Mark invitation as accepted
        await supabase
          .from('agency_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: userId,
          })
          .eq('id', invitation.id);
      } else {
        return apiErrorResponse('ACCEPT_FAILED', 'Failed to accept invitation', 500);
      }
    }

    // ---- Create/refresh session ----
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const session = await createSession(userId, ip, userAgent, invitation.agency_id);

    if (!session) {
      logger.error('Failed to create session after invitation acceptance', null, {
        userId,
      });
      // Still return success -- user can log in manually
      return NextResponse.json({
        success: true,
        agency: { id: agency.id, name: agency.name, slug: agency.slug },
        role: invitation.role,
        message: 'Invitation accepted. Please log in to continue.',
      });
    }

    // Log activity (safe - will not break operation if it fails)
    await safeLogActivity(supabase, {
      action: 'task_created', // Reuse existing action type
      user_name: userName,
      agency_id: agency.id,
      details: {
        type: 'invitation_accepted',
        agency_name: agency.name,
        role: invitation.role,
      },
    });

    // Build response
    const response = NextResponse.json({
      success: true,
      agency: { id: agency.id, name: agency.name, slug: agency.slug },
      role: invitation.role,
    });

    setSessionCookie(response, session.token);

    logger.info('Invitation accepted', {
      userId,
      userName,
      agencyId: agency.id,
      agencyName: agency.name,
      role: invitation.role,
      isNewUser: !!is_new_user,
    });

    return response;
  } catch (error) {
    logger.error('Accept invitation error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
