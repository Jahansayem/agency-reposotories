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
  /** Allstate agency code from PingFederate SAML (e.g., "A1234") */
  allstate_agency_code?: string;
}

// ============================================
// Agency Membership Types
// ============================================

/**
 * Role within an agency.
 * - `owner`: Full access to all features, can manage billing and agency settings
 * - `manager`: Team oversight, can manage team members but not agency settings
 * - `staff`: Limited access, can manage own tasks and use basic features
 */
export type AgencyRole = 'owner' | 'manager' | 'staff';

/**
 * Status of a member within an agency.
 * - `active`: Currently active member
 * - `invited`: Invitation sent but not yet accepted
 * - `suspended`: Temporarily disabled access
 */
export type MemberStatus = 'active' | 'invited' | 'suspended';

/**
 * Granular permissions for agency members.
 * Total: 20 permission flags organized by category.
 *
 * These permissions can be customized per user beyond the role defaults.
 */
export interface AgencyPermissions {
  // ---- Task Permissions (8) ----
  /** Can create new tasks */
  can_create_tasks: boolean;
  /** Can edit tasks they created */
  can_edit_own_tasks: boolean;
  /** Can edit any task in the agency */
  can_edit_all_tasks: boolean;
  /** Can delete tasks they created */
  can_delete_own_tasks: boolean;
  /** Can delete any task in the agency */
  can_delete_all_tasks: boolean;
  /** Can assign tasks to other team members */
  can_assign_tasks: boolean;
  /** Can view all tasks (not just assigned to them) */
  can_view_all_tasks: boolean;
  /** Can reorder tasks in the list view */
  can_reorder_tasks: boolean;

  // ---- Team Permissions (3) ----
  /** Can view tasks assigned to team members */
  can_view_team_tasks: boolean;
  /** Can view team statistics and performance metrics */
  can_view_team_stats: boolean;
  /** Can invite/remove users and change roles */
  can_manage_team: boolean;

  // ---- Chat Permissions (4) ----
  /** Can use team chat and DMs */
  can_use_chat: boolean;
  /** Can delete their own messages */
  can_delete_own_messages: boolean;
  /** Can delete any message in the agency */
  can_delete_all_messages: boolean;
  /** Can pin messages in chat */
  can_pin_messages: boolean;

  // ---- Feature Permissions (6) ----
  /** Can view strategic goals dashboard */
  can_view_strategic_goals: boolean;
  /** Can create and edit strategic goals */
  can_edit_strategic_goals: boolean;
  /** Can view archived tasks */
  can_view_archive: boolean;
  /** Can use AI-powered features (smart parse, email generation, etc.) */
  can_use_ai_features: boolean;
  /** Can create and manage task templates */
  can_manage_templates: boolean;
  /** Can view the activity log */
  can_view_activity_log: boolean;

  // ---- Legacy Permission Aliases ----
  // These are deprecated but maintained for backwards compatibility.
  // They map to the newer, more granular permissions above.

  /**
   * @deprecated Use `can_edit_all_tasks` instead
   * Alias for can_edit_all_tasks - can edit any task in the agency
   */
  can_edit_any_task: boolean;

  /**
   * @deprecated Use `can_delete_all_tasks` instead
   * Alias for can_delete_all_tasks - can delete any task
   */
  can_delete_tasks: boolean;

  /**
   * @deprecated Use `can_delete_all_messages` instead
   * Alias for can_delete_all_messages - can delete any message
   */
  can_delete_any_message: boolean;

  /**
   * @deprecated Use `can_edit_strategic_goals` instead
   * Alias for can_edit_strategic_goals - can manage strategic goals
   */
  can_manage_strategic_goals: boolean;
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

/**
 * Default permission sets for each agency role.
 *
 * - **Owner**: Full access to all permissions
 * - **Manager**: Most permissions except strategic goals edit and team management
 * - **Staff**: Limited permissions - can manage own tasks, use chat, use AI features
 *
 * Individual users can have permissions customized beyond these defaults.
 */
export const DEFAULT_PERMISSIONS: Record<AgencyRole, AgencyPermissions> = {
  owner: {
    // Task permissions - all true
    can_create_tasks: true,
    can_edit_own_tasks: true,
    can_edit_all_tasks: true,
    can_delete_own_tasks: true,
    can_delete_all_tasks: true,
    can_assign_tasks: true,
    can_view_all_tasks: true,
    can_reorder_tasks: true,
    // Team permissions - all true
    can_view_team_tasks: true,
    can_view_team_stats: true,
    can_manage_team: true,
    // Chat permissions - all true
    can_use_chat: true,
    can_delete_own_messages: true,
    can_delete_all_messages: true,
    can_pin_messages: true,
    // Feature permissions - all true
    can_view_strategic_goals: true,
    can_edit_strategic_goals: true,
    can_view_archive: true,
    can_use_ai_features: true,
    can_manage_templates: true,
    can_view_activity_log: true,
    // Legacy aliases (mirror the new permission values)
    can_edit_any_task: true,
    can_delete_tasks: true,
    can_delete_any_message: true,
    can_manage_strategic_goals: true,
  },
  manager: {
    // Task permissions - most true
    can_create_tasks: true,
    can_edit_own_tasks: true,
    can_edit_all_tasks: true,
    can_delete_own_tasks: true,
    can_delete_all_tasks: false, // Cannot delete all tasks
    can_assign_tasks: true,
    can_view_all_tasks: true,
    can_reorder_tasks: true,
    // Team permissions - can view but not manage
    can_view_team_tasks: true,
    can_view_team_stats: true,
    can_manage_team: false, // Cannot manage team
    // Chat permissions - most true
    can_use_chat: true,
    can_delete_own_messages: true,
    can_delete_all_messages: false, // Cannot delete all messages
    can_pin_messages: true,
    // Feature permissions - limited strategic goals
    can_view_strategic_goals: true,
    can_edit_strategic_goals: false, // Cannot edit strategic goals
    can_view_archive: true,
    can_use_ai_features: true,
    can_manage_templates: true,
    can_view_activity_log: true,
    // Legacy aliases (mirror the new permission values)
    can_edit_any_task: true,
    can_delete_tasks: false,
    can_delete_any_message: false,
    can_manage_strategic_goals: false,
  },
  staff: {
    // Task permissions - only own tasks
    can_create_tasks: true,
    can_edit_own_tasks: true,
    can_edit_all_tasks: false,
    can_delete_own_tasks: true,
    can_delete_all_tasks: false,
    can_assign_tasks: false, // Cannot assign tasks
    can_view_all_tasks: false, // Only their own tasks
    can_reorder_tasks: false,
    // Team permissions - none
    can_view_team_tasks: false,
    can_view_team_stats: false,
    can_manage_team: false,
    // Chat permissions - basic
    can_use_chat: true,
    can_delete_own_messages: true,
    can_delete_all_messages: false,
    can_pin_messages: false, // Cannot pin messages
    // Feature permissions - limited
    can_view_strategic_goals: false, // Cannot view strategic goals
    can_edit_strategic_goals: false,
    can_view_archive: false, // Cannot view archive
    can_use_ai_features: true,
    can_manage_templates: false, // Cannot manage templates
    can_view_activity_log: true,
    // Legacy aliases (mirror the new permission values)
    can_edit_any_task: false,
    can_delete_tasks: false,
    can_delete_any_message: false,
    can_manage_strategic_goals: false,
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
// Permission Categories for UI
// ============================================

/**
 * Permission metadata for displaying in the permission editor UI.
 */
export interface PermissionMeta {
  key: keyof AgencyPermissions;
  label: string;
  description: string;
}

/**
 * Category grouping for permissions in the UI.
 */
export interface PermissionCategoryMeta {
  label: string;
  icon: string;
  permissions: PermissionMeta[];
}

/**
 * Permission categories organized for the permission editor UI.
 * Groups the 20 permissions into 4 logical categories.
 */
export const PERMISSION_CATEGORIES: Record<string, PermissionCategoryMeta> = {
  tasks: {
    label: 'Task Permissions',
    icon: 'CheckSquare',
    permissions: [
      { key: 'can_create_tasks', label: 'Create tasks', description: 'Create new tasks' },
      { key: 'can_edit_own_tasks', label: 'Edit own tasks', description: 'Edit tasks they created' },
      { key: 'can_edit_all_tasks', label: 'Edit all tasks', description: 'Edit any task in the agency' },
      { key: 'can_delete_own_tasks', label: 'Delete own tasks', description: 'Delete tasks they created' },
      { key: 'can_delete_all_tasks', label: 'Delete all tasks', description: 'Delete any task (admin)' },
      { key: 'can_assign_tasks', label: 'Assign tasks', description: 'Assign tasks to team members' },
      { key: 'can_view_all_tasks', label: 'View all tasks', description: 'See tasks beyond own assignments' },
      { key: 'can_reorder_tasks', label: 'Reorder tasks', description: 'Change task display order' },
    ],
  },
  team: {
    label: 'Team Permissions',
    icon: 'Users',
    permissions: [
      { key: 'can_view_team_tasks', label: 'View team tasks', description: 'See tasks assigned to others' },
      { key: 'can_view_team_stats', label: 'View team stats', description: 'See team performance metrics' },
      { key: 'can_manage_team', label: 'Manage team', description: 'Invite/remove members, change roles' },
    ],
  },
  chat: {
    label: 'Chat Permissions',
    icon: 'MessageSquare',
    permissions: [
      { key: 'can_use_chat', label: 'Use chat', description: 'Send messages and DMs' },
      { key: 'can_delete_own_messages', label: 'Delete own messages', description: 'Delete their messages' },
      { key: 'can_delete_all_messages', label: 'Delete all messages', description: 'Delete any message (admin)' },
      { key: 'can_pin_messages', label: 'Pin messages', description: 'Pin important messages' },
    ],
  },
  features: {
    label: 'Feature Permissions',
    icon: 'Sparkles',
    permissions: [
      { key: 'can_view_strategic_goals', label: 'View goals', description: 'See strategic goals dashboard' },
      { key: 'can_edit_strategic_goals', label: 'Edit goals', description: 'Create and modify goals' },
      { key: 'can_view_archive', label: 'View archive', description: 'Access archived tasks' },
      { key: 'can_use_ai_features', label: 'Use AI features', description: 'Smart parse, email generation' },
      { key: 'can_manage_templates', label: 'Manage templates', description: 'Create/edit task templates' },
      { key: 'can_view_activity_log', label: 'View activity log', description: 'See team activity history' },
    ],
  },
};

/**
 * Elevated permissions that warrant security warnings when granted to lower roles.
 * These permissions give significant access that typically only managers/owners should have.
 */
export const ELEVATED_PERMISSIONS: (keyof AgencyPermissions)[] = [
  'can_delete_all_tasks',
  'can_delete_all_messages',
  'can_manage_team',
  'can_edit_strategic_goals',
  'can_edit_all_tasks',
  'can_view_all_tasks',
];

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
 * Check if user can invite other users (requires can_manage_team permission)
 */
export function canInviteUsers(membership: AgencyMembership | AgencyMember | null | undefined): boolean {
  if (!membership) return false;
  if (isAgencyAdmin(membership)) return true;
  const permissions = 'permissions' in membership ? membership.permissions : null;
  return hasPermission(permissions, 'can_manage_team');
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
