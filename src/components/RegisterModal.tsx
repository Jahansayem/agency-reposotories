'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getRandomUserColor, getUserInitials, isValidPin } from '@/lib/auth';
// Note: hashPin removed — PIN hashing now happens server-side in /api/auth/register
import type { AuthUser } from '@/types/todo';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

type Step = 'name' | 'pin' | 'confirm';

export default function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stable random color — computed once per mount to prevent flickering on re-renders
  const [userColor] = useState(() => getRandomUserColor());

  const nameInputRef = useRef<HTMLInputElement>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus on mount and step changes
  useEffect(() => {
    if (!isOpen) return;

    if (step === 'name') {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (step === 'pin') {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    } else if (step === 'confirm') {
      setTimeout(() => confirmPinInputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, step]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('name');
      setName('');
      setInviteCode('');
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handlePinChange = (
    index: number,
    value: string,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    pinState: string[],
    setPinState: (p: string[]) => void
  ) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinState];
    newPin[index] = value.slice(-1);
    setPinState(newPin);
    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    pinState: string[]
  ) => {
    if (e.key === 'Backspace' && !pinState[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    // Check if name already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('name', trimmedName)
      .single();

    if (existingUser) {
      setError('This name is already taken. Please choose a different name.');
      return;
    }

    setStep('pin');
  };

  const handlePinSubmit = () => {
    const pinString = pin.join('');
    if (!isValidPin(pinString)) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setError('');
    setStep('confirm');
  };

  const handleConfirmPinSubmit = async () => {
    const pinString = pin.join('');
    const confirmPinString = confirmPin.join('');

    if (!isValidPin(confirmPinString)) {
      setError('Please enter all 4 digits');
      return;
    }

    if (pinString !== confirmPinString) {
      setError('PINs do not match. Please try again.');
      setConfirmPin(['', '', '', '']);
      confirmPinInputRefs.current[0]?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Use the server-side register API (handles PIN hashing, session creation, weak PIN validation)
      const response = await fetchWithCsrf('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pin: pinString,
          ...(inviteCode.trim() ? { invitation_token: inviteCode.trim() } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'DUPLICATE_NAME') {
          setError('This name is already taken. Please try a different name.');
          setStep('name');
        } else {
          setError(result.message || 'Failed to create account. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      if (!result.success || !result.user) {
        setError('Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Build AuthUser from server response (server already created session + HttpOnly cookie)
      const newUser: AuthUser = {
        id: result.user.id,
        name: result.user.name,
        color: result.user.color || getRandomUserColor(),
        role: result.user.role || 'staff',
        created_at: new Date().toISOString(),
      };

      onSuccess(newUser);
      onClose();
    } catch (err) {
      logger.error('Unexpected registration error', err as Error, { component: 'RegisterModal', action: 'handlePinSubmit', userName: name.trim() });
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (step === 'pin' && pin.every(d => d !== '') && !isSubmitting) {
      handlePinSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, step]);

  // Auto-submit when confirm PIN is complete
  useEffect(() => {
    if (step === 'confirm' && confirmPin.every(d => d !== '') && !isSubmitting) {
      handleConfirmPinSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPin, step]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] rounded-[var(--radius-2xl)] shadow-2xl max-w-md w-full overflow-hidden"
        role="dialog"
        aria-labelledby="register-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 id="register-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
            Create Account
          </h2>
          <button
            onClick={onClose}
            aria-label="Close registration modal"
            className="p-2 rounded-[var(--radius-lg)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 bg-[var(--surface-2)]">
          <div className="flex items-center justify-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'name' ? 'text-[var(--primary)]' : step === 'pin' || step === 'confirm' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
              {step === 'pin' || step === 'confirm' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Name</span>
            </div>

            <div className={`h-px w-8 ${step === 'pin' || step === 'confirm' ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />

            <div className={`flex items-center gap-2 ${step === 'pin' ? 'text-[var(--primary)]' : step === 'confirm' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
              {step === 'confirm' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">PIN</span>
            </div>

            <div className={`h-px w-8 ${step === 'confirm' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />

            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Name */}
          {step === 'name' && (
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  What&apos;s your name?
                </label>
                <input
                  ref={nameInputRef}
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'name-error' : undefined}
                  className="w-full px-4 py-3 rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  disabled={isSubmitting}
                  maxLength={50}
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  This name will be visible to your team members
                </p>
              </div>

              <div>
                <label htmlFor="invite-code" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Agency Invite Code <span className="text-[var(--text-muted)]">(Optional)</span>
                </label>
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code if you have one"
                  aria-describedby="invite-code-help"
                  className="w-full px-4 py-3 rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  disabled={isSubmitting}
                />
                <p id="invite-code-help" className="mt-2 text-xs text-[var(--text-muted)]">
                  If you have an agency invitation, paste the code here to auto-join
                </p>
              </div>

              {error && (
                <div
                  id="name-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="flex items-center gap-2 text-[var(--danger)] text-sm bg-[var(--danger-light)] py-2 px-3 rounded-[var(--radius-lg)]"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-[var(--radius-lg)] transition-colors"
              >
                Continue
              </button>
            </form>
          )}

          {/* Step 2: PIN */}
          {step === 'pin' && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-[var(--radius-2xl)] flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
                  style={{ backgroundColor: userColor }}
                >
                  {getUserInitials(name)}
                </div>
                <p className="font-medium text-[var(--foreground)]">{name}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Create a 4-digit PIN</p>
              </div>

              <div className="flex justify-center gap-3">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      pinInputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, pinInputRefs, pin, setPin)}
                    onKeyDown={(e) => handlePinKeyDown(e, index, pinInputRefs, pin)}
                    disabled={isSubmitting}
                    aria-label={`PIN digit ${index + 1} of 4`}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'pin-error' : undefined}
                    className={`w-14 h-16 text-center text-xl font-bold rounded-[var(--radius-xl)] border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] focus:border-[var(--primary)]'
                    } text-[var(--foreground)]`}
                  />
                ))}
              </div>

              {error && (
                <div
                  id="pin-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="flex items-center justify-center gap-2 text-[var(--danger)] text-sm bg-[var(--danger-light)] py-2 px-3 rounded-[var(--radius-lg)]"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-xs text-center text-[var(--text-muted)]">
                You&apos;ll use this PIN to sign in
              </p>

              <button
                onClick={() => setStep('name')}
                className="w-full py-2 px-4 text-[var(--text-muted)] hover:text-[var(--foreground)] font-medium transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: Confirm PIN */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-[var(--radius-2xl)] flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
                  style={{ backgroundColor: userColor }}
                >
                  {getUserInitials(name)}
                </div>
                <p className="font-medium text-[var(--foreground)]">{name}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Confirm your PIN</p>
              </div>

              <div className="flex justify-center gap-3">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      confirmPinInputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(index, e.target.value, confirmPinInputRefs, confirmPin, setConfirmPin)
                    }
                    onKeyDown={(e) => handlePinKeyDown(e, index, confirmPinInputRefs, confirmPin)}
                    disabled={isSubmitting}
                    aria-label={`Confirm PIN digit ${index + 1} of 4`}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'confirm-pin-error' : undefined}
                    className={`w-14 h-16 text-center text-xl font-bold rounded-[var(--radius-xl)] border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] focus:border-[var(--primary)]'
                    } text-[var(--foreground)]`}
                  />
                ))}
              </div>

              {error && (
                <div
                  id="confirm-pin-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="flex items-center justify-center gap-2 text-[var(--danger)] text-sm bg-[var(--danger-light)] py-2 px-3 rounded-[var(--radius-lg)]"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {isSubmitting && (
                <div className="text-center text-sm text-[var(--text-muted)]">
                  Creating your account...
                </div>
              )}

              <button
                onClick={() => {
                  setStep('pin');
                  setConfirmPin(['', '', '', '']);
                }}
                disabled={isSubmitting}
                className="w-full py-2 px-4 text-[var(--text-muted)] hover:text-[var(--foreground)] font-medium transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
