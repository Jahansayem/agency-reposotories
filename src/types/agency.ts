/**
 * Agency Types for Multi-Tenancy
 *
 * These types support the multi-agency architecture allowing multiple
 * Allstate agencies to use the platform with complete data isolation.
 */

// ============================================
// Core Agency Types
// ============================================

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  subscription_tier: SubscriptionTier;
  max_users: number;
  max_storage_mb: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Agency Membership Types
// ============================================

export type AgencyRole = 'owner' | 'manager' | 'staff';

export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface AgencyPermissions {
  // Task Management
  can_create_tasks: boolean;
  can_edit_any_task: boolean;
  can_delete_tasks: boolean;
  can_assign_tasks: boolean;
  can_reorder_tasks: boolean;
  can_view_all_tasks: boolean;

  // Strategic Goals
  can_view_strategic_goals: boolean;
  can_manage_strategic_goals: boolean;

  // Team Management
  can_invite_users: boolean;
  can_remove_users: boolean;
  can_change_roles: boolean;

  // Templates & Content
  can_manage_templates: boolean;
  can_use_ai_features: boolean;

  // Chat & Communication
  can_pin_messages: boolean;
  can_delete_any_message: boolean;

  // Reporting & Analytics
  can_view_activity_feed: boolean;
  can_view_dashboard: boolean;
  can_view_archive: boolean;

  // Agency Administration
  can_manage_agency_settings: boolean;
  can_view_security_events: boolean;
  can_manage_billing: boolean;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  permissions: AgencyPermissions;
  status: MemberStatus;
  is_default_agency: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    name: string;
    color: string;
    email?: string;
  };
  agency?: Agency;
}

// ============================================
// Agency Invitation Types
// ============================================

export interface AgencyInvitation {
  id: string;
  agency_id: string;
  email: string;
  role: Exclude<AgencyRole, 'owner'>; // Can't invite as owner
  token: string;
  invited_by?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  // Joined data
  agency?: Agency;
}

// ============================================
// Agency Context Types
// ============================================

/**
 * User's membership in an agency, used for agency switching
 */
export interface AgencyMembership {
  agency_id: string;
  agency_name: string;
  agency_slug: string;
  role: AgencyRole;
  permissions: AgencyPermissions;
  is_default: boolean;
}

/**
 * Current agency context for the application
 */
export interface AgencyContext {
  currentAgency: Agency | null;
  currentAgencyId: string | null;
  currentRole: AgencyRole | null;
  currentPermissions: AgencyPermissions | null;
  agencies: AgencyMembership[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateAgencyRequest {
  name: string;
  slug?: string; // Auto-generated from name if not provided
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface UpdateAgencyRequest {
  name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface InviteUserRequest {
  email: string;
  role: Exclude<AgencyRole, 'owner'>;
}

export interface UpdateMemberRequest {
  role?: AgencyRole;
  permissions?: Partial<AgencyPermissions>;
  status?: MemberStatus;
}

// ============================================
// Default Permissions by Role
// ============================================

export const DEFAULT_PERMISSIONS: Record<AgencyRole, AgencyPermissions> = {
  owner: {
    can_create_tasks: true,
    can_edit_any_task: true,
    can_delete_tasks: true,
    can_assign_tasks: true,
    can_reorder_tasks: true,
    can_view_all_tasks: true,
    can_view_strategic_goals: true,
    can_manage_strategic_goals: true,
    can_invite_users: true,
    can_remove_users: true,
    can_change_roles: true,
    can_manage_templates: true,
    can_use_ai_features: true,
    can_pin_messages: true,
    can_delete_any_message: true,
    can_view_activity_feed: true,
    can_view_dashboard: true,
    can_view_archive: true,
    can_manage_agency_settings: true,
    can_view_security_events: true,
    can_manage_billing: true,
  },
  manager: {
    can_create_tasks: true,
    can_edit_any_task: true,
    can_delete_tasks: true,
    can_assign_tasks: true,
    can_reorder_tasks: true,
    can_view_all_tasks: true,
    can_view_strategic_goals: true,
    can_manage_strategic_goals: false,
    can_invite_users: true,
    can_remove_users: true,
    can_change_roles: false,
    can_manage_templates: true,
    can_use_ai_features: true,
    can_pin_messages: true,
    can_delete_any_message: true,
    can_view_activity_feed: true,
    can_view_dashboard: true,
    can_view_archive: true,
    can_manage_agency_settings: false,
    can_view_security_events: true,
    can_manage_billing: false,
  },
  staff: {
    can_create_tasks: true,
    can_edit_any_task: false,
    can_delete_tasks: false,
    can_assign_tasks: false,
    can_reorder_tasks: false,
    can_view_all_tasks: false,
    can_view_strategic_goals: false,
    can_manage_strategic_goals: false,
    can_invite_users: false,
    can_remove_users: false,
    can_change_roles: false,
    can_manage_templates: false,
    can_use_ai_features: true,
    can_pin_messages: false,
    can_delete_any_message: false,
    can_view_activity_feed: true,
    can_view_dashboard: true,
    can_view_archive: false,
    can_manage_agency_settings: false,
    can_view_security_events: false,
    can_manage_billing: false,
  },
};

// ============================================
// Subscription Tier Limits
// ============================================

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, { users: number; storage_mb: number }> = {
  starter: { users: 10, storage_mb: 1024 },        // 1GB
  professional: { users: 50, storage_mb: 5120 },   // 5GB
  enterprise: { users: 999, storage_mb: 51200 },   // 50GB
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if user has a specific permission in their current agency
 */
export function hasPermission(
  permissions: AgencyPermissions | null | undefined,
  permission: keyof AgencyPermissions
): boolean {
  if (!permissions) return false;
  return permissions[permission] === true;
}

/**
 * Check if user is agency owner
 */
export function isAgencyOwner(membership: AgencyMembership | AgencyMember | null | undefined): boolean {
  if (!membership) return false;
  return membership.role === 'owner';
}

/**
 * Check if user is agency admin (owner or admin)
 */
export function isAgencyAdmin(membership: AgencyMembership | AgencyMember | null | undefined): boolean {
  if (!membership) return false;
  return membership.role === 'owner' || membership.role === 'manager';
}

/**
 * Check if user can view strategic goals
 */
export function canViewGoals(membership: AgencyMembership | AgencyMember | null | undefined): boolean {
  if (!membership) return false;
  if (isAgencyAdmin(membership)) return true;
  const permissions = 'permissions' in membership ? membership.permissions : null;
  return hasPermission(permissions, 'can_view_strategic_goals');
}

/**
 * Check if user can invite other users
 */
export function canInviteUsers(membership: AgencyMembership | AgencyMember | null | undefined): boolean {
  if (!membership) return false;
  if (isAgencyAdmin(membership)) return true;
  const permissions = 'permissions' in membership ? membership.permissions : null;
  return hasPermission(permissions, 'can_invite_users');
}

/**
 * Generate URL-friendly slug from agency name
 */
export function generateAgencySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Check if invitation is still valid (not expired and not accepted)
 */
export function isInvitationValid(invitation: AgencyInvitation): boolean {
  if (invitation.accepted_at) return false;
  return new Date(invitation.expires_at) > new Date();
}
