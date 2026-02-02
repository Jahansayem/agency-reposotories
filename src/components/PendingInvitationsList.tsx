'use client';

import { useState, useEffect } from 'react';
import { Mail, Clock, Trash2, Loader2, AlertCircle, Users } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf';

// ============================================
// Types
// ============================================

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface PendingInvitationsListProps {
  agencyId: string;
  currentUserRole: string;
  refreshTrigger?: number;
}

// ============================================
// Component
// ============================================

export function PendingInvitationsList({
  agencyId,
  currentUserRole,
  refreshTrigger,
}: PendingInvitationsListProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Owners can revoke any invitation; managers can only revoke staff invitations
  const canRevokeInvitation = (invitation: PendingInvitation): boolean => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'manager' && invitation.role === 'staff') return true;
    return false;
  };

  const loadInvitations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${agencyId}/invitations`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invitations');
      }

      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      loadInvitations();
    }
  }, [agencyId, refreshTrigger]);

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    setRevokingId(invitationId);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/agencies/${agencyId}/invitations/${invitationId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      // Remove from local list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    } finally {
      setRevokingId(null);
    }
  };

  const formatExpiry = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return 'Expiring soon';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => {
        const isExpired = new Date(invitation.expires_at) < new Date();
        return (
          <div
            key={invitation.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg
              bg-gray-50 dark:bg-gray-700/50
              ${isExpired ? 'opacity-60' : ''}
            `}
          >
            {/* Email icon */}
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {invitation.email}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="capitalize">{invitation.role}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isExpired ? 'Expired' : formatExpiry(invitation.expires_at)}
                </span>
              </div>
            </div>

            {/* Revoke button */}
            {canRevokeInvitation(invitation) && !isExpired && (
              <button
                onClick={() => handleRevoke(invitation.id)}
                disabled={revokingId === invitation.id}
                className="
                  p-2 rounded-lg
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                aria-label={`Revoke invitation for ${invitation.email}`}
              >
                {revokingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
