'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  User,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { generateAgencySlug } from '@/types/agency';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

type Step = 'account' | 'agency' | 'complete';

interface FormData {
  // Account info
  userName: string;
  email: string;
  pin: string;
  confirmPin: string;
  // Agency info
  agencyName: string;
  agencySlug: string;
}

// ============================================
// Component
// ============================================

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    userName: '',
    email: '',
    pin: '',
    confirmPin: '',
    agencyName: '',
    agencySlug: '',
  });

  // Check if multi-tenancy is enabled
  if (!isFeatureEnabled('multi_tenancy')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Multi-Agency Signup Not Available
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This feature is not currently enabled.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug from agency name
      if (field === 'agencyName') {
        updated.agencySlug = generateAgencySlug(value);
      }

      return updated;
    });
    setError(null);
  };

  const validateAccountStep = (): boolean => {
    if (!formData.userName.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (formData.userName.length < 2) {
      setError('Name must be at least 2 characters');
      return false;
    }
    if (!formData.pin || formData.pin.length !== 4) {
      setError('PIN must be 4 digits');
      return false;
    }
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must contain only numbers');
      return false;
    }
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return false;
    }
    return true;
  };

  const validateAgencyStep = (): boolean => {
    if (!formData.agencyName.trim()) {
      setError('Please enter an agency name');
      return false;
    }
    if (formData.agencyName.length < 3) {
      setError('Agency name must be at least 3 characters');
      return false;
    }
    if (!formData.agencySlug.trim()) {
      setError('Please enter a URL slug');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.agencySlug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 'account') {
      if (validateAccountStep()) {
        setStep('agency');
      }
    } else if (step === 'agency') {
      if (validateAgencyStep()) {
        handleSignup();
      }
    }
  };

  const handlePrevStep = () => {
    if (step === 'agency') {
      setStep('account');
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Hash the PIN
      const pinHash = await hashPin(formData.pin);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('name', formData.userName)
        .single();

      if (existingUser) {
        setError('A user with this name already exists');
        setIsLoading(false);
        return;
      }

      // Check if agency slug is taken
      const { data: existingAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', formData.agencySlug)
        .single();

      if (existingAgency) {
        setError('This agency URL is already taken. Please choose another.');
        setIsLoading(false);
        return;
      }

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: formData.userName.trim(),
          email: formData.email.trim() || null,
          pin_hash: pinHash,
          color: '#0033A0', // Default Allstate blue
          global_role: 'user',
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create agency with owner
      const { data: agencyResult, error: agencyError } = await supabase
        .rpc('create_agency_with_owner', {
          p_name: formData.agencyName.trim(),
          p_slug: formData.agencySlug.trim(),
          p_user_id: newUser.id,
        });

      if (agencyError) throw agencyError;

      console.log('Created agency:', agencyResult);

      setStep('complete');
    } catch (err) {
      logger.error('Signup error', err as Error, { component: 'SignupPage', action: 'handleSignup', userName: formData.userName, agencySlug: formData.agencySlug });
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/');
  };

  // Step indicator
  const steps = [
    { key: 'account', label: 'Account' },
    { key: 'agency', label: 'Agency' },
    { key: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-[#0033A0] rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            Allstate Agency
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Task Management Platform
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-colors
                ${index < currentStepIndex
                  ? 'bg-green-500 text-white'
                  : index === currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 rounded ${
                  index < currentStepIndex
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Account Step */}
          {step === 'account' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Create Your Account
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Set up your personal account credentials
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
                      value={formData.userName}
                      onChange={(e) => updateFormData('userName', e.target.value)}
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

                {/* Email (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="john@allstate.com"
                    className="
                      w-full px-4 py-2.5 rounded-lg
                      border border-gray-300 dark:border-gray-600
                      bg-white dark:bg-gray-700
                      text-gray-900 dark:text-white
                      placeholder-gray-400
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    "
                  />
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
                      value={formData.pin}
                      onChange={(e) => updateFormData('pin', e.target.value.replace(/\D/g, ''))}
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
                      value={formData.confirmPin}
                      onChange={(e) => updateFormData('confirmPin', e.target.value.replace(/\D/g, ''))}
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
              </div>
            </>
          )}

          {/* Agency Step */}
          {step === 'agency' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Set Up Your Agency
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Create your agency workspace
              </p>

              <div className="space-y-4">
                {/* Agency Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Agency Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.agencyName}
                      onChange={(e) => updateFormData('agencyName', e.target.value)}
                      placeholder="e.g., Smith Insurance Agency"
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

                {/* Agency Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Agency URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">allstate-tasks.com/</span>
                    <input
                      type="text"
                      value={formData.agencySlug}
                      onChange={(e) => updateFormData('agencySlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="smith-agency"
                      className="
                        flex-1 px-4 py-2.5 rounded-lg
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        font-mono text-sm
                      "
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    This will be your unique agency URL
                  </p>
                </div>
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
                Welcome to Allstate Tasks!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your account and agency have been created successfully.
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

          {/* Navigation Buttons */}
          {step !== 'complete' && (
            <div className="mt-6 flex gap-3">
              {step !== 'account' && (
                <button
                  onClick={handlePrevStep}
                  className="
                    flex-1 py-2.5 px-4 rounded-lg
                    border border-gray-300 dark:border-gray-600
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    transition-colors flex items-center justify-center gap-2
                  "
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNextStep}
                disabled={isLoading}
                className={`
                  flex-1 py-2.5 px-4 rounded-lg
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
                    {step === 'agency' ? 'Create Agency' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Login Link */}
      {step !== 'complete' && (
        <p className="mt-6 text-center text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <button
            onClick={handleGoToLogin}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}
