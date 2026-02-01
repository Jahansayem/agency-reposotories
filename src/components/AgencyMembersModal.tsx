'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, Trash2, Crown, Shield, User as UserIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAgency } from '@/contexts/AgencyContext';
import type { AgencyRole } from '@/types/agency';

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
    case 'admin':
      return <Shield className="w-4 h-4" />;
    default:
      return <UserIcon className="w-4 h-4" />;
  }
};

const getRoleColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'text-yellow-600 dark:text-yellow-500';
    case 'admin':
      return 'text-blue-600 dark:text-blue-500';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getRoleBadgeColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'admin':
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

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<AgencyRole>('member');

  // Check if current user can manage members
  const canManageMembers = currentRole === 'owner' || currentRole === 'admin';

  // Load members and available users
  useEffect(() => {
    if (isOpen && currentAgency) {
      loadMembers();
      loadAllUsers();
    }
  }, [isOpen, currentAgency]);

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
      console.error('Failed to load members:', err);
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
      console.error('Failed to load users:', err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser || !currentAgency) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/agencies/${currentAgency.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setSelectedRole('member');
      await loadMembers(); // Reload list

    } catch (err) {
      console.error('Failed to add member:', err);
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
      const response = await fetch(
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
      console.error('Failed to remove member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setShowAddForm(false);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  // Get users not already in the agency
  const availableUsers = allUsers.filter(
    u => !members.some(m => m.user_name === u.name)
  );

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
                        {(['member', 'admin', 'owner'] as AgencyRole[]).map((role) => (
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
                              <span className="capitalize text-sm">{role}</span>
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
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="
                          flex items-center gap-4 p-4 rounded-lg
                          bg-gray-50 dark:bg-gray-700/50
                          hover:bg-gray-100 dark:hover:bg-gray-700
                          transition-colors
                        "
                      >
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

                        {/* Role Badge */}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${getRoleBadgeColor(member.agency_role)}`}>
                          {getRoleIcon(member.agency_role)}
                          <span className="text-xs font-medium capitalize">{member.agency_role}</span>
                        </div>

                        {/* Remove Button */}
                        {canManageMembers && member.user_name !== currentUserName && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user_name)}
                            disabled={isSubmitting || (member.agency_role === 'owner' && currentRole !== 'owner')}
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
                    ))}
                  </div>
                )}

                {/* Info Text */}
                {!canManageMembers && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Only agency owners and admins can manage members
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
