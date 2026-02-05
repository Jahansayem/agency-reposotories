'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, Trash2, Crown, Briefcase, User as UserIcon, Loader2, AlertCircle, Check, Mail, Send, Edit2, ChevronDown, Settings } from 'lucide-react';
import { useAgency } from '@/contexts/AgencyContext';
import type { AgencyRole, AgencyPermissions } from '@/types/agency';
import { InvitationForm } from '@/components/InvitationForm';
import { PendingInvitationsList } from '@/components/PendingInvitationsList';
import { MemberPermissionsPanel } from '@/components/permissions';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';

// ============================================
// Types
// ============================================

interface AgencyMember {
  id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  global_role: string;
  agency_role: AgencyRole;
  permissions: AgencyPermissions;
  status: string;
  is_default_agency: boolean;
  joined_at: string;
}

interface AgencyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
}

// ============================================
// Helper Functions
// ============================================

const getRoleIcon = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return <Crown className="w-4 h-4" />;
    case 'manager':
      return <Briefcase className="w-4 h-4" />;
    default:
      return <UserIcon className="w-4 h-4" />;
  }
};

const getRoleLabel = (role: AgencyRole): string => {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    default:
      return 'Staff';
  }
};

const getRoleColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'text-yellow-600 dark:text-yellow-500';
    case 'manager':
      return 'text-blue-600 dark:text-blue-500';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getRoleBadgeColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'manager':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  }
};

// ============================================
// Component
// ============================================

export function AgencyMembersModal({
  isOpen,
  onClose,
  currentUserName,
}: AgencyMembersModalProps) {
  const { currentAgency, currentRole } = useAgency();

  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab state: 'members' | 'invite' | 'pending'
  const [activeTab, setActiveTab] = useState<'members' | 'invite' | 'pending'>('members');
  const [invitationRefreshTrigger, setInvitationRefreshTrigger] = useState(0);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<AgencyRole>('staff');

  // Role editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Permissions panel state
  const [expandedPermissionsMemberId, setExpandedPermissionsMemberId] = useState<string | null>(null);

  // Check if current user can manage members
  const canManageMembers = currentRole === 'owner' || currentRole === 'manager';

  // Load members and available users
  useEffect(() => {
    if (isOpen && currentAgency) {
      loadMembers();
      loadAllUsers();
    }
  }, [isOpen, currentAgency]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-role-dropdown]')) {
        setEditingMemberId(null);
      }
    };

    if (editingMemberId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [editingMemberId]);

  const loadMembers = async () => {
    if (!currentAgency) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agencies/${currentAgency.id}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      setMembers(data.members || []);
    } catch (err) {
      logger.error('Failed to load members', err as Error, { component: 'AgencyMembersModal', action: 'loadMembers', agencyId: currentAgency?.id });
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      // In a real app, this would be an API endpoint
      // For now, we'll just use the members list
      // TODO: Create /api/users endpoint to list all users
    } catch (err) {
      logger.error('Failed to load users', err as Error, { component: 'AgencyMembersModal', action: 'loadAllUsers' });
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser || !currentAgency) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${currentAgency.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          user_name: selectedUser,
          role: selectedRole,
          requested_by: currentUserName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setSuccess(data.message);
      setShowAddForm(false);
      setSelectedUser('');
      setSelectedRole('staff');
      await loadMembers(); // Reload list

    } catch (err) {
      logger.error('Failed to add member', err as Error, { component: 'AgencyMembersModal', action: 'handleAddMember', agencyId: currentAgency?.id, selectedUser });
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!currentAgency) return;
    if (!confirm(`Remove ${memberName} from this agency?`)) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithCsrf(
        `/api/agencies/${currentAgency.id}/members?memberId=${memberId}&requested_by=${currentUserName}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setSuccess(`${memberName} removed from agency`);
      await loadMembers(); // Reload list

    } catch (err) {
      logger.error('Failed to remove member', err as Error, { component: 'AgencyMembersModal', action: 'handleRemoveMember', agencyId: currentAgency?.id, memberId, memberName });
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId: string, memberName: string, currentRole: AgencyRole, newRole: AgencyRole) => {
    if (!currentAgency) return;

    // Confirm the change
    const confirmMsg = `Change ${memberName}'s role from ${getRoleLabel(currentRole)} to ${getRoleLabel(newRole)}?`;
    if (!confirm(confirmMsg)) return;

    setIsChangingRole(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${currentAgency.id}/members`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberId,
          newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      setSuccess(`${memberName}'s role changed to ${getRoleLabel(newRole)}`);
      setEditingMemberId(null);
      await loadMembers(); // Reload list

    } catch (err) {
      logger.error('Failed to change role', err as Error, {
        component: 'AgencyMembersModal',
        action: 'handleChangeRole',
        agencyId: currentAgency?.id,
        memberId,
        memberName,
        currentRole,
        newRole
      });
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isChangingRole) {
      setShowAddForm(false);
      setEditingMemberId(null);
      setExpandedPermissionsMemberId(null);
      setError(null);
      setSuccess(null);
      setActiveTab('members');
      onClose();
    }
  };

  // Handle permission update from panel - update local state
  const handlePermissionUpdate = (memberId: string, updatedPermissions: AgencyPermissions) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === memberId ? { ...m, permissions: updatedPermissions } : m
      )
    );
  };

  // Get users not already in the agency
  const availableUsers = allUsers.filter(
    u => !members.some(m => m.user_name === u.name)
  );

  // Check if user is the only owner
  const isOnlyOwner = (member: AgencyMember) => {
    if (member.agency_role !== 'owner') return false;
    const ownerCount = members.filter(m => m.agency_role === 'owner').length;
    return ownerCount === 1;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="
                bg-white dark:bg-gray-800
                rounded-xl shadow-2xl
                w-full max-w-3xl
                max-h-[90vh] overflow-y-auto
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Agency Members
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentAgency?.name} • {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              {canManageMembers && (
                <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                  <nav className="flex -mb-px gap-4" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('members')}
                      className={`
                        py-3 px-1 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'members'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Members
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('invite')}
                      className={`
                        py-3 px-1 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'invite'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Invite
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`
                        py-3 px-1 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'pending'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Pending
                      </span>
                    </button>
                  </nav>
                </div>
              )}

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                  </div>
                )}

                {/* ========== Invite Tab ========== */}
                {activeTab === 'invite' && canManageMembers && currentAgency && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Invite a Team Member
                    </h3>
                    <InvitationForm
                      agencyId={currentAgency.id}
                      currentUserRole={currentRole || 'staff'}
                      onInvitationSent={() => setInvitationRefreshTrigger((prev) => prev + 1)}
                    />
                  </div>
                )}

                {/* ========== Pending Tab ========== */}
                {activeTab === 'pending' && canManageMembers && currentAgency && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Pending Invitations
                    </h3>
                    <PendingInvitationsList
                      agencyId={currentAgency.id}
                      currentUserRole={currentRole || 'staff'}
                      refreshTrigger={invitationRefreshTrigger}
                    />
                  </div>
                )}

                {/* ========== Members Tab ========== */}
                {activeTab === 'members' && (
                  <>
                    {/* Add Member Button */}
                    {canManageMembers && !showAddForm && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="
                          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                          border-2 border-dashed border-gray-300 dark:border-gray-600
                          text-gray-600 dark:text-gray-400
                          hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50
                          dark:hover:border-blue-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20
                          transition-all
                        "
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Team Member</span>
                      </button>
                    )}

                    {/* Add Member Form */}
                    {showAddForm && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">Add New Member</h3>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            User Name
                          </label>
                          <input
                            type="text"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            placeholder="Enter exact user name (e.g., Sefra)"
                            disabled={isSubmitting}
                            className="
                              w-full px-4 py-2 rounded-lg
                              bg-white dark:bg-gray-700
                              border border-gray-300 dark:border-gray-600
                              text-gray-900 dark:text-white
                              placeholder:text-gray-400
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              disabled:opacity-50
                            "
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            User must already have an account in the system
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['staff', 'manager', 'owner'] as AgencyRole[]).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setSelectedRole(role)}
                                disabled={isSubmitting || (role === 'owner' && currentRole !== 'owner')}
                                className={`
                                  px-4 py-2 rounded-lg border-2 transition-all
                                  ${selectedRole === role
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                  }
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                              >
                                <div className="flex items-center gap-2 justify-center">
                                  {getRoleIcon(role)}
                                  <span className="text-sm">{getRoleLabel(role)}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          {currentRole !== 'owner' && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Only owners can assign the owner role
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddForm(false)}
                            disabled={isSubmitting}
                            className="
                              flex-1 px-4 py-2 rounded-lg
                              text-gray-700 dark:text-gray-300
                              hover:bg-gray-100 dark:hover:bg-gray-700
                              transition-colors
                              disabled:opacity-50
                            "
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddMember}
                            disabled={isSubmitting || !selectedUser.trim()}
                            className="
                              flex-1 px-4 py-2 rounded-lg
                              bg-blue-600 hover:bg-blue-700
                              text-white font-medium
                              transition-colors
                              disabled:opacity-50
                              flex items-center justify-center gap-2
                            "
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Add Member
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No members yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {members.map((member) => {
                          const isPermissionsExpanded = expandedPermissionsMemberId === member.id;
                          const canCustomizePermissions =
                            currentRole === 'owner' &&
                            member.user_name !== currentUserName &&
                            !isOnlyOwner(member);

                          return (
                            <div
                              key={member.id}
                              className={`
                                p-4 rounded-lg
                                bg-gray-50 dark:bg-gray-700/50
                                ${!isPermissionsExpanded ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                                transition-colors
                              `}
                            >
                              <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                  style={{ backgroundColor: member.user_color }}
                                >
                                  {member.user_name.charAt(0)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {member.user_name}
                                    {member.user_name === currentUserName && (
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Joined {new Date(member.joined_at).toLocaleDateString()}
                                  </p>
                                </div>

                                {/* Role Badge with Edit */}
                                <div className="relative" data-role-dropdown>
                                  {currentRole === 'owner' && !isOnlyOwner(member) ? (
                                    <>
                                      <button
                                        onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                                        disabled={isChangingRole || isSubmitting}
                                        className={`
                                          flex items-center gap-1.5 px-3 py-1 rounded-full
                                          ${getRoleBadgeColor(member.agency_role)}
                                          hover:opacity-80 transition-opacity
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                      >
                                        {getRoleIcon(member.agency_role)}
                                        <span className="text-xs font-medium">{getRoleLabel(member.agency_role)}</span>
                                        <Edit2 className="w-3 h-3 ml-0.5 opacity-60" />
                                      </button>

                                      {/* Role Dropdown */}
                                      <AnimatePresence>
                                        {editingMemberId === member.id && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                            transition={{ duration: 0.15 }}
                                            className="
                                              absolute right-0 top-full mt-2 z-20
                                              bg-white dark:bg-gray-800
                                              border border-gray-200 dark:border-gray-700
                                              rounded-lg shadow-xl
                                              py-1 min-w-[140px]
                                            "
                                            data-role-dropdown
                                          >
                                            {(['staff', 'manager', 'owner'] as AgencyRole[]).map((role) => (
                                              <button
                                                key={role}
                                                onClick={() => {
                                                  if (role !== member.agency_role) {
                                                    handleChangeRole(member.id, member.user_name, member.agency_role, role);
                                                  } else {
                                                    setEditingMemberId(null);
                                                  }
                                                }}
                                                disabled={isChangingRole}
                                                className={`
                                                  w-full px-3 py-2 text-left
                                                  flex items-center gap-2
                                                  hover:bg-gray-100 dark:hover:bg-gray-700
                                                  transition-colors
                                                  disabled:opacity-50 disabled:cursor-not-allowed
                                                  ${role === member.agency_role ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                                `}
                                              >
                                                <div className={getRoleColor(role)}>
                                                  {getRoleIcon(role)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {getRoleLabel(role)}
                                                </span>
                                                {role === member.agency_role && (
                                                  <Check className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400" />
                                                )}
                                              </button>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </>
                                  ) : (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${getRoleBadgeColor(member.agency_role)}`}>
                                      {getRoleIcon(member.agency_role)}
                                      <span className="text-xs font-medium">{getRoleLabel(member.agency_role)}</span>
                                      {isOnlyOwner(member) && (
                                        <span className="text-[10px] opacity-60">(only)</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Customize Permissions Button (Owner only, not for self) */}
                                {canCustomizePermissions && (
                                  <button
                                    onClick={() =>
                                      setExpandedPermissionsMemberId(
                                        isPermissionsExpanded ? null : member.id
                                      )
                                    }
                                    disabled={isSubmitting || isChangingRole}
                                    className={`
                                      p-2 rounded-lg transition-colors
                                      ${isPermissionsExpanded
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                      }
                                      disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                    aria-label={`Customize ${member.user_name}'s permissions`}
                                    title="Customize permissions"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Remove Button */}
                                {canManageMembers && member.user_name !== currentUserName && (
                                  <button
                                    onClick={() => handleRemoveMember(member.id, member.user_name)}
                                    disabled={isSubmitting || isChangingRole || (member.agency_role === 'owner' && currentRole !== 'owner')}
                                    className="
                                      p-2 rounded-lg
                                      text-red-600 dark:text-red-400
                                      hover:bg-red-50 dark:hover:bg-red-900/20
                                      transition-colors
                                      disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                    aria-label={`Remove ${member.user_name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Permission Panel (expanded) */}
                              <AnimatePresence>
                                {isPermissionsExpanded && currentAgency && (
                                  <MemberPermissionsPanel
                                    memberId={member.id}
                                    memberName={member.user_name}
                                    memberRole={member.agency_role}
                                    permissions={member.permissions}
                                    agencyId={currentAgency.id}
                                    onUpdate={(updatedPermissions) =>
                                      handlePermissionUpdate(member.id, updatedPermissions)
                                    }
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Info Text */}
                    {!canManageMembers && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Only agency owners and managers can manage members
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
