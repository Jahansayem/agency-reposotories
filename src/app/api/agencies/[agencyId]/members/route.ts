/**
 * Agency Members API - Secured with withAgencyAuth
 *
 * All handlers require valid session authentication and agency membership.
 * POST and DELETE require owner or manager role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PERMISSIONS, ELEVATED_PERMISSIONS } from '@/types/agency';
import type { AgencyRole, AgencyPermissions } from '@/types/agency';
import { apiErrorResponse } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import {
  withAgencyAuth,
  setAgencyContext,
  type AgencyAuthContext,
} from '@/lib/agencyAuth';
import {
  securityMonitor,
  SecurityEventType,
  AlertSeverity,
} from '@/lib/securityMonitor';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Validate that the agencyId from URL params matches the authenticated context.
 * This prevents IDOR (Insecure Direct Object Reference) attacks.
 */
async function validateAgencyIdMatch(
  request: NextRequest,
  ctx: AgencyAuthContext
): Promise<{ valid: boolean; agencyIdFromParams: string | null; error?: NextResponse }> {
  // Extract agencyId from URL path: /api/agencies/[agencyId]/members
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agenciesIndex = pathParts.indexOf('agencies');
  const agencyIdFromParams = agenciesIndex >= 0 ? pathParts[agenciesIndex + 1] : null;

  if (!agencyIdFromParams) {
    return {
      valid: false,
      agencyIdFromParams: null,
      error: apiErrorResponse('VALIDATION_ERROR', 'Agency ID is required in URL path', 400),
    };
  }

  // Verify URL agency ID matches authenticated context
  // This prevents accessing another agency's members via URL manipulation
  if (ctx.agencyId && agencyIdFromParams !== ctx.agencyId) {
    await securityMonitor.recordEvent({
      type: SecurityEventType.ACCESS_DENIED,
      severity: AlertSeverity.HIGH,
      userId: ctx.userId,
      userName: ctx.userName,
      endpoint: request.url,
      details: {
        reason: 'Agency ID mismatch - potential IDOR attempt',
        urlAgencyId: agencyIdFromParams,
        sessionAgencyId: ctx.agencyId,
      },
    });

    logger.security('Agency ID mismatch in members API', {
      userId: ctx.userId,
      userName: ctx.userName,
      urlAgencyId: agencyIdFromParams,
      sessionAgencyId: ctx.agencyId,
    });

    return {
      valid: false,
      agencyIdFromParams,
      error: apiErrorResponse('FORBIDDEN', 'Access denied to this agency', 403),
    };
  }

  return { valid: true, agencyIdFromParams };
}

/**
 * GET /api/agencies/[agencyId]/members
 * List all members of an agency
 *
 * Access: Any authenticated member of the agency
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    // Validate agency ID from URL matches context
    const validation = await validateAgencyIdMatch(request, ctx);
    if (!validation.valid) {
      return validation.error!;
    }

    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const agencyId = ctx.agencyId || validation.agencyIdFromParams;

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
          global_role
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
    logger.error('Error fetching agency members', error, { component: 'api/agencies/members', action: 'GET' });
    return apiErrorResponse('INTERNAL_ERROR', 'Failed to fetch members', 500);
  }
});

/**
 * POST /api/agencies/[agencyId]/members
 * Add a user to an agency
 *
 * Access: Owner or Manager only
 */
export const POST = withAgencyAuth(
  async (request: NextRequest, ctx: AgencyAuthContext) => {
    try {
      const supabase = getSupabaseClient();
      // Validate agency ID from URL matches context
      const validation = await validateAgencyIdMatch(request, ctx);
      if (!validation.valid) {
        return validation.error!;
      }

      // Set RLS context for defense-in-depth
      await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

      const agencyId = ctx.agencyId || validation.agencyIdFromParams;
      const body = await request.json();
      const { user_name, role } = body;

      if (!user_name || !role) {
        return apiErrorResponse('VALIDATION_ERROR', 'user_name and role are required');
      }

      // Validate role is valid
      const validRoles: AgencyRole[] = ['owner', 'manager', 'staff'];
      if (!validRoles.includes(role)) {
        return apiErrorResponse('VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Managers cannot add owners - only owners can
      if (role === 'owner' && ctx.agencyRole !== 'owner') {
        await securityMonitor.recordEvent({
          type: SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
          severity: AlertSeverity.CRITICAL,
          userId: ctx.userId,
          userName: ctx.userName,
          endpoint: request.url,
          details: {
            action: 'add_member',
            attemptedRole: 'owner',
            requesterRole: ctx.agencyRole,
          },
        });

        return apiErrorResponse('FORBIDDEN', 'Only owners can add other owners', 403);
      }

      // Get user to add
      const { data: userToAdd, error: userError } = await supabase
        .from('users')
        .select('id, name')
        .eq('name', user_name)
        .single();

      if (userError || !userToAdd) {
        return apiErrorResponse('NOT_FOUND', `User "${user_name}" not found`, 404);
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('agency_members')
        .select('id')
        .eq('user_id', userToAdd.id)
        .eq('agency_id', agencyId)
        .single();

      if (existingMember) {
        return apiErrorResponse('DUPLICATE_MEMBER', `${user_name} is already a member of this agency`, 409);
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
        logger.error('Failed to add member', insertError, { component: 'api/agencies/members', action: 'POST' });
        return apiErrorResponse('INSERT_FAILED', 'Failed to add member', 500);
      }

      // Log activity with authenticated user info
      try {
        await supabase.from('activity_log').insert({
          action: 'member_added',
          user_name: ctx.userName, // Use authenticated user, not body param
          details: {
            agency_id: agencyId,
            added_user: user_name,
            role: role,
            added_by_user_id: ctx.userId,
          },
        });
      } catch (logError) {
        logger.error('Failed to log activity', logError, { component: 'api/agencies/members', action: 'POST' });
      }

      // Log security event for audit
      await securityMonitor.recordEvent({
        type: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity: AlertSeverity.LOW,
        userId: ctx.userId,
        userName: ctx.userName,
        endpoint: request.url,
        details: {
          action: 'member_added',
          agency_id: agencyId,
          added_user: user_name,
          role: role,
        },
      });

      return NextResponse.json({
        success: true,
        member: newMember,
        message: `${user_name} added to agency as ${role}`,
      });

    } catch (error) {
      logger.error('Error adding member', error, { component: 'api/agencies/members', action: 'POST' });
      return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },
  { requiredRoles: ['owner', 'manager'] }
);

/**
 * PATCH /api/agencies/[agencyId]/members
 * Update member role and/or permissions
 *
 * Supports three modes:
 * 1. Role change only (newRole) - resets permissions to role defaults
 * 2. Permission change only (permissions) - merges with existing permissions
 * 3. Both (newRole + permissions) - sets role defaults then applies overrides
 *
 * Access: Owner only (managers cannot change roles or permissions)
 */
export const PATCH = withAgencyAuth(
  async (request: NextRequest, ctx: AgencyAuthContext) => {
    try {
      const supabase = getSupabaseClient();
      // Validate agency ID from URL matches context
      const validation = await validateAgencyIdMatch(request, ctx);
      if (!validation.valid) {
        return validation.error!;
      }

      // Set RLS context for defense-in-depth
      await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

      const agencyId = ctx.agencyId || validation.agencyIdFromParams;
      const body = await request.json();
      const { memberId, newRole, permissions: permissionUpdates } = body as {
        memberId: string;
        newRole?: AgencyRole;
        permissions?: Partial<AgencyPermissions>;
      };

      // Validate at least memberId is provided
      if (!memberId) {
        return apiErrorResponse('VALIDATION_ERROR', 'memberId is required');
      }

      // Validate at least one update is provided
      if (!newRole && !permissionUpdates) {
        return apiErrorResponse('VALIDATION_ERROR', 'Either newRole or permissions must be provided');
      }

      // Validate role if provided
      const validRoles: AgencyRole[] = ['owner', 'manager', 'staff'];
      if (newRole && !validRoles.includes(newRole)) {
        return apiErrorResponse('VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Validate permission keys if provided
      if (permissionUpdates) {
        const validPermissionKeys = Object.keys(DEFAULT_PERMISSIONS.owner);
        const invalidKeys = Object.keys(permissionUpdates).filter(
          key => !validPermissionKeys.includes(key)
        );
        if (invalidKeys.length > 0) {
          return apiErrorResponse(
            'VALIDATION_ERROR',
            `Invalid permission keys: ${invalidKeys.join(', ')}`
          );
        }
      }

      // Get member to update - verify they belong to this agency
      const { data: memberToUpdate } = await supabase
        .from('agency_members')
        .select('role, user_id, permissions, users!inner(name)')
        .eq('id', memberId)
        .eq('agency_id', agencyId)
        .single();

      if (!memberToUpdate) {
        return apiErrorResponse('NOT_FOUND', 'Member not found in this agency', 404);
      }

      const memberUserName = (memberToUpdate as any).users.name;
      const currentPermissions = memberToUpdate.permissions as AgencyPermissions;
      const currentRole = memberToUpdate.role as AgencyRole;

      // ===== Security checks =====

      // Cannot change your own role if you're the only owner
      if (newRole && memberToUpdate.user_id === ctx.userId && memberToUpdate.role === 'owner') {
        const { data: otherOwners } = await supabase
          .from('agency_members')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('role', 'owner')
          .neq('user_id', ctx.userId);

        if (!otherOwners || otherOwners.length === 0) {
          return apiErrorResponse('FORBIDDEN', 'Cannot change your role as the only owner. Promote another member first.', 403);
        }
      }

      // Sole owner cannot remove their own can_manage_team permission
      if (permissionUpdates?.can_manage_team === false && memberToUpdate.user_id === ctx.userId) {
        const { data: otherOwners } = await supabase
          .from('agency_members')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('role', 'owner')
          .neq('user_id', ctx.userId);

        if (!otherOwners || otherOwners.length === 0) {
          return apiErrorResponse('FORBIDDEN', 'Cannot remove manage team permission as the only owner', 403);
        }
      }

      // ===== Build final permissions =====

      let finalPermissions: AgencyPermissions;
      let finalRole = currentRole;

      if (newRole && permissionUpdates) {
        // Case 3: Role change with permission overrides
        // Start with new role defaults, then apply overrides
        finalRole = newRole;
        finalPermissions = {
          ...DEFAULT_PERMISSIONS[newRole],
          ...permissionUpdates,
        };
      } else if (newRole) {
        // Case 1: Role change only - use role defaults
        finalRole = newRole;
        finalPermissions = DEFAULT_PERMISSIONS[newRole];
      } else {
        // Case 2: Permission change only - merge with existing
        finalPermissions = {
          ...currentPermissions,
          ...permissionUpdates,
        };
      }

      // Sync legacy aliases to maintain backwards compatibility
      finalPermissions.can_edit_any_task = finalPermissions.can_edit_all_tasks;
      finalPermissions.can_delete_tasks = finalPermissions.can_delete_all_tasks;
      finalPermissions.can_delete_any_message = finalPermissions.can_delete_all_messages;
      finalPermissions.can_manage_strategic_goals = finalPermissions.can_edit_strategic_goals;

      // ===== Check for elevated permissions granted to lower roles =====

      const effectiveRole = newRole || currentRole;
      if (permissionUpdates && (effectiveRole === 'staff' || effectiveRole === 'manager')) {
        const elevatedGranted = ELEVATED_PERMISSIONS.filter(
          perm => permissionUpdates[perm] === true && !DEFAULT_PERMISSIONS[effectiveRole][perm]
        );

        if (elevatedGranted.length > 0) {
          await securityMonitor.recordEvent({
            type: SecurityEventType.SENSITIVE_DATA_ACCESS,
            severity: AlertSeverity.MEDIUM,
            userId: ctx.userId,
            userName: ctx.userName,
            endpoint: request.url,
            details: {
              action: 'elevated_permissions_granted',
              agency_id: agencyId,
              target_user: memberUserName,
              target_user_id: memberToUpdate.user_id,
              target_role: effectiveRole,
              elevated_permissions: elevatedGranted,
            },
          });
        }
      }

      // ===== Perform the update =====

      const updatePayload: Record<string, unknown> = {
        permissions: finalPermissions,
        updated_at: new Date().toISOString(),
      };

      if (newRole) {
        updatePayload.role = newRole;
      }

      const { data: updatedMember, error: updateError } = await supabase
        .from('agency_members')
        .update(updatePayload)
        .eq('id', memberId)
        .eq('agency_id', agencyId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update member', updateError, { component: 'api/agencies/members', action: 'PATCH' });
        return apiErrorResponse('UPDATE_FAILED', 'Failed to update member', 500);
      }

      // ===== Activity logging =====

      const changedPermissions = permissionUpdates ? Object.keys(permissionUpdates) : [];
      const action = newRole && !permissionUpdates
        ? 'member_role_changed'
        : !newRole && permissionUpdates
        ? 'member_permissions_changed'
        : 'member_role_and_permissions_changed';

      try {
        await supabase.from('activity_log').insert({
          action,
          user_name: ctx.userName,
          details: {
            agency_id: agencyId,
            updated_user: memberUserName,
            updated_user_id: memberToUpdate.user_id,
            ...(newRole && {
              old_role: currentRole,
              new_role: newRole,
            }),
            ...(permissionUpdates && {
              changed_permissions: permissionUpdates,
            }),
            updated_by_user_id: ctx.userId,
          },
        });
      } catch (logError) {
        logger.error('Failed to log activity', logError, { component: 'api/agencies/members', action: 'PATCH' });
      }

      // ===== Security event for audit =====

      const severity = (currentRole === 'owner' || newRole === 'owner')
        ? AlertSeverity.HIGH
        : AlertSeverity.MEDIUM;

      await securityMonitor.recordEvent({
        type: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity,
        userId: ctx.userId,
        userName: ctx.userName,
        endpoint: request.url,
        details: {
          action,
          agency_id: agencyId,
          updated_user: memberUserName,
          updated_user_id: memberToUpdate.user_id,
          ...(newRole && { old_role: currentRole, new_role: newRole }),
          ...(permissionUpdates && { changed_permissions: Object.keys(permissionUpdates) }),
        },
      });

      // ===== Build response message =====

      let message: string;
      if (newRole && permissionUpdates) {
        message = `${memberUserName}'s role changed to ${newRole} with custom permissions`;
      } else if (newRole) {
        message = `${memberUserName}'s role changed to ${newRole}`;
      } else {
        message = `${memberUserName}'s permissions updated`;
      }

      return NextResponse.json({
        success: true,
        member: updatedMember,
        message,
        permissionsChanged: changedPermissions.length > 0 ? changedPermissions : undefined,
      });

    } catch (error) {
      logger.error('Error updating member', error, { component: 'api/agencies/members', action: 'PATCH' });
      return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },
  { requiredRoles: ['owner'] } // Only owners can change roles/permissions
);

/**
 * DELETE /api/agencies/[agencyId]/members?memberId=xxx
 * Remove a user from an agency
 *
 * Access: Owner or Manager only (managers can't remove owners)
 */
export const DELETE = withAgencyAuth(
  async (request: NextRequest, ctx: AgencyAuthContext) => {
    try {
      const supabase = getSupabaseClient();
      // Validate agency ID from URL matches context
      const validation = await validateAgencyIdMatch(request, ctx);
      if (!validation.valid) {
        return validation.error!;
      }

      // Set RLS context for defense-in-depth
      await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

      const agencyId = ctx.agencyId || validation.agencyIdFromParams;
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');

      if (!memberId) {
        return apiErrorResponse('VALIDATION_ERROR', 'memberId query parameter is required');
      }

      // Get member to remove - verify they belong to this agency
      const { data: memberToRemove } = await supabase
        .from('agency_members')
        .select('role, user_id, users!inner(name)')
        .eq('id', memberId)
        .eq('agency_id', agencyId)
        .single();

      if (!memberToRemove) {
        return apiErrorResponse('NOT_FOUND', 'Member not found in this agency', 404);
      }

      // Can't remove owners unless you're also an owner
      if (memberToRemove.role === 'owner' && ctx.agencyRole !== 'owner') {
        await securityMonitor.recordEvent({
          type: SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
          severity: AlertSeverity.CRITICAL,
          userId: ctx.userId,
          userName: ctx.userName,
          endpoint: request.url,
          details: {
            action: 'remove_owner_attempt',
            target_member_id: memberId,
            requesterRole: ctx.agencyRole,
          },
        });

        return apiErrorResponse('FORBIDDEN', 'Only owners can remove other owners', 403);
      }

      // Can't remove yourself if you're the only owner
      if (memberToRemove.user_id === ctx.userId && memberToRemove.role === 'owner') {
        const { data: otherOwners } = await supabase
          .from('agency_members')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('role', 'owner')
          .neq('user_id', ctx.userId);

        if (!otherOwners || otherOwners.length === 0) {
          return apiErrorResponse('FORBIDDEN', 'Cannot remove yourself as the only owner. Transfer ownership first.', 403);
        }
      }

      const removedUserName = (memberToRemove as any).users.name;

      // Delete the membership
      const { error: deleteError } = await supabase
        .from('agency_members')
        .delete()
        .eq('id', memberId)
        .eq('agency_id', agencyId); // Extra safety: verify agency_id

      if (deleteError) {
        logger.error('Failed to remove member', deleteError, { component: 'api/agencies/members', action: 'DELETE' });
        return apiErrorResponse('DELETE_FAILED', 'Failed to remove member', 500);
      }

      // Log activity with authenticated user info
      try {
        await supabase.from('activity_log').insert({
          action: 'member_removed',
          user_name: ctx.userName, // Use authenticated user, not query param
          details: {
            agency_id: agencyId,
            removed_user: removedUserName,
            removed_user_id: memberToRemove.user_id,
            removed_by_user_id: ctx.userId,
          },
        });
      } catch (logError) {
        logger.error('Failed to log activity', logError, { component: 'api/agencies/members', action: 'DELETE' });
      }

      // Log security event for audit
      await securityMonitor.recordEvent({
        type: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity: AlertSeverity.MEDIUM,
        userId: ctx.userId,
        userName: ctx.userName,
        endpoint: request.url,
        details: {
          action: 'member_removed',
          agency_id: agencyId,
          removed_user: removedUserName,
          removed_user_id: memberToRemove.user_id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${removedUserName} removed from agency`,
      });

    } catch (error) {
      logger.error('Error removing member', error, { component: 'api/agencies/members', action: 'DELETE' });
      return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },
  { requiredRoles: ['owner', 'manager'] }
);
