'use client';

import { useState } from 'react';
import { Mail, Send, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface InvitationFormProps {
  agencyId: string;
  currentUserRole: string;
  onInvitationSent?: () => void;
}

// ============================================
// Component
// ============================================

export function InvitationForm({
  agencyId,
  currentUserRole,
  onInvitationSent,
}: InvitationFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Owners can invite managers and staff; managers can only invite staff
  const canInviteManager = currentUserRole === 'owner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Enforce role permissions
    if (role === 'manager' && !canInviteManager) {
      setError('Only owners can invite managers');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInviteUrl(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${agencyId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteUrl(data.invitation?.invite_url || null);
      setEmail('');
      onInvitationSent?.();
    } catch (err) {
      logger.error('Failed to send invitation', err as Error, { component: 'InvitationForm', action: 'handleInvite', agencyId });
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendAnother = () => {
    setInviteUrl(null);
    setCopied(false);
    setError(null);
  };

  // Show success state with invite URL
  if (inviteUrl) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-800 dark:text-green-200 text-sm">
              Invitation sent successfully!
            </p>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mb-3">
            Share this link with the invitee:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="
                flex-1 px-3 py-2 rounded-lg text-xs
                bg-white dark:bg-gray-700
                border border-green-300 dark:border-green-700
                text-gray-900 dark:text-white
                truncate
              "
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopyUrl}
              leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={handleSendAnother}
          fullWidth
        >
          Send another invitation
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Email input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Email Address
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="colleague@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          disabled={isSubmitting}
          fullWidth
        />
      </div>

      {/* Role selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Role
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole('staff')}
            disabled={isSubmitting}
            className={`
              px-4 py-2.5 rounded-lg border-2 transition-all text-sm
              ${role === 'staff'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => {
              if (canInviteManager) setRole('manager');
            }}
            disabled={isSubmitting || !canInviteManager}
            className={`
              px-4 py-2.5 rounded-lg border-2 transition-all text-sm
              ${role === 'manager'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Manager
          </button>
        </div>
        {!canInviteManager && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only owners can invite managers
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSubmitting}
        leftIcon={<Send className="w-4 h-4" />}
        fullWidth
        disabled={isSubmitting || !email.trim()}
      >
        {isSubmitting ? 'Sending...' : 'Send Invitation'}
      </Button>
    </form>
  );
}
