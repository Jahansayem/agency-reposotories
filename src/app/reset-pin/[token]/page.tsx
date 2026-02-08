'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { hashPin } from '@/lib/auth';
import Link from 'next/link';

export default function ResetPinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string | undefined;

  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'pin' | 'confirm' | 'success'>('pin');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (step === 'pin') {
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
    } else if (step === 'confirm') {
      setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Validate token exists
  useEffect(() => {
    if (!token || token.length !== 64) {
      setError('Invalid reset link. Please request a new PIN reset.');
    }
  }, [token]);

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

  const handlePinSubmit = () => {
    const pinString = pin.join('');
    if (pinString.length !== 4 || !/^\d{4}$/.test(pinString)) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setError('');
    setStep('confirm');
  };

  const handleConfirmPinSubmit = async () => {
    const pinString = pin.join('');
    const confirmPinString = confirmPin.join('');

    if (confirmPinString.length !== 4 || !/^\d{4}$/.test(confirmPinString)) {
      setError('Please enter all 4 digits');
      return;
    }

    if (pinString !== confirmPinString) {
      setError('PINs do not match. Please try again.');
      setConfirmPin(['', '', '', '']);
      confirmPinRefs.current[0]?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Hash PIN client-side before sending
      const pinHash = await hashPin(pinString);

      const response = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin: pinHash }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset PIN');
      }

      setStep('success');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset PIN. Please try again.');
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#00205B] via-[#0033A0] to-[#1E3A5F]">
      {/* Back to Login Link */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-[28px] border border-white/10 p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-2xl)] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #A8D4F5 0%, #72B5E8 25%, #0033A0 60%, #00205B 100%)' }}
            >
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Reset Your PIN</h1>
            <p className="text-sm text-white/60">
              {step === 'success' ? 'PIN reset successful!' : 'Choose a new 4-digit PIN'}
            </p>
          </div>

          {/* Success State */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <p className="text-white text-lg font-medium">
                Your PIN has been reset!
              </p>
              <p className="text-white/60 text-sm">
                Redirecting you to login...
              </p>
            </motion.div>
          )}

          {/* PIN Entry Step */}
          {step === 'pin' && (
            <div className="space-y-6">
              <p className="text-center text-sm text-white/60">
                Enter your new 4-digit PIN
              </p>

              <div className="flex justify-center gap-3">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { pinRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, pinRefs, pin, setPin)}
                    onKeyDown={(e) => handlePinKeyDown(e, index, pinRefs, pin)}
                    disabled={isSubmitting}
                    aria-label={`PIN digit ${index + 1} of 4`}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-[var(--radius-xl)] border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)]/10 text-white'
                        : 'border-white/10 bg-white/5 text-white focus:border-[var(--brand-sky)] focus:bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-500/10 py-3 px-4 rounded-[var(--radius-xl)] border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          )}

          {/* Confirm PIN Step */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <p className="text-center text-sm text-white/60">
                Confirm your new PIN
              </p>

              <div className="flex justify-center gap-3">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { confirmPinRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, confirmPinRefs, confirmPin, setConfirmPin)}
                    onKeyDown={(e) => handlePinKeyDown(e, index, confirmPinRefs, confirmPin)}
                    disabled={isSubmitting}
                    aria-label={`Confirm PIN digit ${index + 1} of 4`}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-[var(--radius-xl)] border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)]/10 text-white'
                        : 'border-white/10 bg-white/5 text-white focus:border-[var(--brand-sky)] focus:bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-500/10 py-3 px-4 rounded-[var(--radius-xl)] border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}

              {isSubmitting && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-[var(--brand-sky)] animate-spin" />
                  <span className="text-sm text-white/50">Resetting PIN...</span>
                </div>
              )}

              <button
                onClick={() => {
                  setStep('pin');
                  setConfirmPin(['', '', '', '']);
                }}
                disabled={isSubmitting}
                className="w-full py-2 px-4 text-white/60 hover:text-white font-medium transition-colors disabled:opacity-50 text-sm"
              >
                Back
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-white/20 text-xs">
          Bealer Agency &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
