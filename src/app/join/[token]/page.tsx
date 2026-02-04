'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  User,
  Lock,
  Check,
  Loader2,
  AlertCircle,
  Mail,
  Clock,
} from 'lucide-react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { fetchWithCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

type Step = 'loading' | 'invalid' | 'account' | 'existing_user' | 'complete';

interface ValidatedInvitation {
  agency_name: string;
  role: string;
  email: string;
  expires_at: string;
}

// ============================================
// Component
// ============================================

export default function JoinInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [invitation, setInvitation] = useState<ValidatedInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data for new user
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Existing user login
  const [existingUserName, setExistingUserName] = useState('');
  const [existingUserPin, setExistingUserPin] = useState('');

  // Check if multi-tenancy is enabled and validate invitation via API
  useEffect(() => {
    if (!isFeatureEnabled('multi_tenancy')) {
      setStep('invalid');
      setError('Multi-agency support is not enabled');
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await fetchWithCsrf('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setStep('invalid');
        setError(data.error || 'This invitation link is invalid or has expired');
        return;
      }

      setInvitation({
        agency_name: data.agency_name,
        role: data.role,
        email: data.email,
        expires_at: data.expires_at,
      });

      setStep('account');
    } catch (err) {
      logger.error('Error validating invitation', err as Error, { component: 'JoinInvitationPage', action: 'validateInvitation', token });
      setStep('invalid');
      setError('Failed to load invitation');
    }
  };

  const handleCreateAccount = async () => {
    // Validate
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          is_new_user: true,
          name: userName.trim(),
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If user already exists, suggest login
        if (data.error?.toLowerCase().includes('already exists')) {
          setError('A user with this name already exists. Please login instead.');
          setStep('existing_user');
          setExistingUserName(userName);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to create account');
      }

      setStep('complete');
    } catch (err) {
      logger.error('Error creating account', err as Error, { component: 'JoinInvitationPage', action: 'handleCreateAccount', userName, token });
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingUserLogin = async () => {
    if (!existingUserName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (existingUserPin.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          is_new_user: false,
          name: existingUserName.trim(),
          pin: existingUserPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join agency');
      }

      setStep('complete');
    } catch (err) {
      logger.error('Error accepting invitation', err as Error, { component: 'JoinInvitationPage', action: 'handleExistingUserLogin', existingUserName, token });
      setError(err instanceof Error ? err.message : 'Failed to join agency');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/');
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid invitation
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <button
            onClick={handleGoToLogin}
            className="
              w-full py-3 px-4 rounded-lg
              bg-blue-600 hover:bg-blue-700
              text-white font-medium
              transition-colors
            "
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-[#0033A0]"
          >
            {invitation?.agency_name?.charAt(0) || 'A'}
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {invitation?.agency_name || 'Agency'}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          You&apos;ve been invited to join
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Invitation Info Banner */}
          {(step === 'account' || step === 'existing_user') && invitation && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Invitation for {invitation.email}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
                <span>
                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Create Account Step */}
          {step === 'account' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Create Your Account
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Join {invitation?.agency_name} as a {invitation?.role}
              </p>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        setError(null);
                      }}
                      placeholder="e.g., John Smith"
                      className="
                        w-full pl-10 pr-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      "
                    />
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    4-Digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ''));
                        setError(null);
                      }}
                      placeholder="****"
                      className="
                        w-full pl-10 pr-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        tracking-widest text-center font-mono
                      "
                    />
                  </div>
                </div>

                {/* Confirm PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value.replace(/\D/g, ''));
                        setError(null);
                      }}
                      placeholder="****"
                      className="
                        w-full pl-10 pr-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        tracking-widest text-center font-mono
                      "
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={isLoading}
                  className={`
                    w-full py-3 px-4 rounded-lg
                    bg-blue-600 hover:bg-blue-700
                    text-white font-medium
                    transition-colors flex items-center justify-center gap-2
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Join {invitation?.agency_name}
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep('existing_user')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>
          )}

          {/* Existing User Login */}
          {step === 'existing_user' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Sign In to Join
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Enter your existing credentials to join {invitation?.agency_name}
              </p>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={existingUserName}
                      onChange={(e) => {
                        setExistingUserName(e.target.value);
                        setError(null);
                      }}
                      placeholder="e.g., John Smith"
                      className="
                        w-full pl-10 pr-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      "
                    />
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={existingUserPin}
                      onChange={(e) => {
                        setExistingUserPin(e.target.value.replace(/\D/g, ''));
                        setError(null);
                      }}
                      placeholder="****"
                      className="
                        w-full pl-10 pr-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        tracking-widest text-center font-mono
                      "
                    />
                  </div>
                </div>

                <button
                  onClick={handleExistingUserLogin}
                  disabled={isLoading}
                  className={`
                    w-full py-3 px-4 rounded-lg
                    bg-blue-600 hover:bg-blue-700
                    text-white font-medium
                    transition-colors flex items-center justify-center gap-2
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Sign In & Join
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep('account')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create a new account instead
                </button>
              </div>
            </>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to {invitation?.agency_name}!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                You&apos;ve successfully joined as a {invitation?.role}.
              </p>
              <button
                onClick={handleGoToLogin}
                className="
                  w-full py-3 px-4 rounded-lg
                  bg-blue-600 hover:bg-blue-700
                  text-white font-medium
                  transition-colors
                "
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
