import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createSession } from '@/lib/sessionValidator';
import { setSessionCookie } from '@/lib/sessionCookies';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { generateAgencySlug, DEFAULT_PERMISSIONS, SUBSCRIPTION_LIMITS } from '@/types/agency';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';
import { safeLogActivity } from '@/lib/safeActivityLog';
import { isWeakPin } from '@/lib/constants';

/**
 * Hash PIN using SHA-256 (server-side, matching existing client-side hash format)
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

// Allstate brand user colors
const USER_COLORS = [
  '#0033A0', '#72B5E8', '#C9A227', '#003D7A',
  '#6E8AA7', '#5BA8A0', '#E87722', '#98579B',
];

/**
 * POST /api/auth/register
 *
 * Server-side registration endpoint. Creates a new user, optionally accepts
 * an invitation or creates a new agency atomically.
 *
 * Request body:
 * {
 *   name: string;           // Display name (required)
 *   pin: string;            // 4-digit PIN (required)
 *   email?: string;         // Email address (optional)
 *   invitation_token?: string; // Accept invitation during registration
 *   create_agency?: {       // Create a new agency during registration
 *     name: string;
 *     slug?: string;
 *     primary_color?: string;
 *   }
 * }
 *
 * Response: { success, user, agency? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, pin, email, invitation_token, create_agency } = body;

    // ---- Validation ----
    if (!name?.trim()) {
      return apiErrorResponse('VALIDATION_ERROR', 'Name is required');
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return apiErrorResponse('VALIDATION_ERROR', 'PIN must be exactly 4 digits');
    }

    // Reject common weak PINs
    if (isWeakPin(pin)) {
      return apiErrorResponse('VALIDATION_ERROR', 'PIN is too common. Please choose a less predictable PIN.');
    }

    if (name.trim().length > 100) {
      return apiErrorResponse('VALIDATION_ERROR', 'Name must be 100 characters or fewer');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiErrorResponse('INVALID_EMAIL', 'Invalid email format');
    }

    // Cannot provide both invitation_token and create_agency
    if (invitation_token && create_agency) {
      return apiErrorResponse('VALIDATION_ERROR', 'Cannot accept an invitation and create an agency at the same time');
    }

    const supabase = createServiceRoleClient();
    const trimmedName = name.trim();
    const pinHash = hashPin(pin);

    // ---- Check if name is already taken ----
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('name', trimmedName)
      .maybeSingle();

    if (existingUser) {
      return apiErrorResponse('DUPLICATE_NAME', 'A user with this name already exists', 409);
    }

    // ---- If invitation_token provided, validate it first ----
    let invitation: {
      id: string;
      agency_id: string;
      email: string;
      role: string;
      status: string;
      expires_at: string;
    } | null = null;

    if (invitation_token) {
      const tokenHash = hashToken(invitation_token);
      const { data: inv, error: invError } = await supabase
        .from('agency_invitations')
        .select('id, agency_id, email, role, status, expires_at')
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .maybeSingle();

      if (invError || !inv) {
        return apiErrorResponse('INVALID_TOKEN', 'Invalid or expired invitation');
      }

      // Check expiration
      if (new Date(inv.expires_at) < new Date()) {
        return apiErrorResponse('EXPIRED', 'This invitation has expired');
      }

      // If the invitation has an email, the registering email should match
      if (inv.email && email && inv.email.toLowerCase() !== email.toLowerCase()) {
        return apiErrorResponse('EMAIL_MISMATCH', 'Email does not match the invitation');
      }

      invitation = inv;
    }

    // ---- Create the user ----
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        pin_hash: pinHash,
        color,
        role: 'staff',
        ...(email ? { email } : {}),
      })
      .select('id, name, color, role')
      .single();

    if (userError) {
      logger.error('Failed to create user', userError, { name: trimmedName });
      return apiErrorResponse('INSERT_FAILED', 'Failed to create user', 500);
    }

    let agencyInfo: { id: string; name: string; slug: string } | null = null;
    let agencyRole: string | null = null;
    let agencyId: string | undefined;

    // ---- Accept invitation if provided ----
    if (invitation) {
      // Call the accept_agency_invitation Postgres function
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_agency_invitation', {
          p_invitation_id: invitation.id,
          p_user_id: newUser.id,
        });

      if (acceptError) {
        logger.error('Failed to accept invitation', acceptError, {
          userId: newUser.id,
          invitationId: invitation.id,
        });
        // User was created but invitation acceptance failed.
        // Still return success but note the issue.
        return apiErrorResponse('ACCEPT_FAILED', 'User created but invitation acceptance failed. Please try accepting the invitation again after logging in.', 500);
      }

      // Get agency details
      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name, slug')
        .eq('id', invitation.agency_id)
        .single();

      if (agency) {
        agencyInfo = agency;
        agencyRole = invitation.role;
        agencyId = agency.id;
      }
    }

    // ---- Create agency if requested ----
    if (create_agency) {
      if (!create_agency.name?.trim()) {
        // User already created; we can't undo easily. Return error context.
        return apiErrorResponse('VALIDATION_ERROR', 'Agency name is required when creating an agency');
      }

      const agencyName = create_agency.name.trim();
      const slug = create_agency.slug || generateAgencySlug(agencyName);

      // Check slug uniqueness
      const { data: existingAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingAgency) {
        return apiErrorResponse('DUPLICATE_SLUG', 'An agency with this name already exists. Please choose a different name.', 409);
      }

      const subscriptionTier = 'professional';
      const limits = SUBSCRIPTION_LIMITS[subscriptionTier];

      const { data: newAgency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyName,
          slug,
          primary_color: create_agency.primary_color || '#0033A0',
          secondary_color: '#72B5E8',
          subscription_tier: subscriptionTier,
          max_users: limits.users,
          max_storage_mb: limits.storage_mb,
          is_active: true,
        })
        .select('id, name, slug')
        .single();

      if (agencyError) {
        logger.error('Failed to create agency during registration', agencyError, {
          userId: newUser.id,
          agencyName,
        });
        return apiErrorResponse('INSERT_FAILED', 'User created but agency creation failed', 500);
      }

      // Assign user as owner
      const { error: memberError } = await supabase
        .from('agency_members')
        .insert({
          user_id: newUser.id,
          agency_id: newAgency.id,
          role: 'owner',
          status: 'active',
          permissions: DEFAULT_PERMISSIONS.owner,
          is_default_agency: true,
        });

      if (memberError) {
        logger.error('Failed to assign owner during registration', memberError, {
          userId: newUser.id,
          agencyId: newAgency.id,
        });
        // Rollback agency creation
        await supabase.from('agencies').delete().eq('id', newAgency.id);
        return apiErrorResponse('INSERT_FAILED', 'Failed to set up agency ownership', 500);
      }

      agencyInfo = newAgency;
      agencyRole = 'owner';
      agencyId = newAgency.id;

      // Log activity (safe - will not break operation if it fails)
      await safeLogActivity(supabase, {
        action: 'agency_created',
        user_name: newUser.name,
        agency_id: newAgency.id,
        details: {
          agency_name: newAgency.name,
          agency_slug: newAgency.slug,
        },
      });
    }

    // ---- Create session ----
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const session = await createSession(newUser.id, ip, userAgent, agencyId);

    if (!session) {
      logger.error('Failed to create session during registration', null, {
        userId: newUser.id,
      });
      return apiErrorResponse('SESSION_FAILED', 'User created but session creation failed. Please log in.', 500);
    }

    // ---- Build response ----
    const responseBody: Record<string, unknown> = {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        color: newUser.color,
        role: newUser.role || 'staff',
      },
    };

    if (agencyInfo) {
      responseBody.agency = {
        id: agencyInfo.id,
        name: agencyInfo.name,
        slug: agencyInfo.slug,
        role: agencyRole,
      };
    }

    const response = NextResponse.json(responseBody);
    setSessionCookie(response, session.token);

    logger.info('User registered successfully', {
      userId: newUser.id,
      userName: newUser.name,
      hasInvitation: !!invitation,
      hasAgency: !!agencyInfo,
      ip,
    });

    return response;
  } catch (error) {
    logger.error('Registration endpoint error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
