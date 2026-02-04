'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, User, FileText, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/UserContext';
import { useAgency } from '@/contexts/AgencyContext';
import { logger } from '@/lib/logger';
import type { PolicyType } from '@/types/todo';

// ============================================
// Types
// ============================================

interface LogSaleModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when a sale is successfully logged */
  onSaleLogged: () => void;
}

interface FormData {
  customerName: string;
  premiumAmount: string;
  policyType: PolicyType;
}

interface FormErrors {
  customerName?: string;
  premiumAmount?: string;
  general?: string;
}

// ============================================
// Constants
// ============================================

const POLICY_TYPES: { value: PolicyType; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto', icon: '🚗' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'life', label: 'Life', icon: '❤️' },
  { value: 'commercial', label: 'Commercial', icon: '🏢' },
  { value: 'bundle', label: 'Bundle', icon: '📦' },
];

// ============================================
// Animation Variants
// ============================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// ============================================
// Component
// ============================================

export function LogSaleModal({ isOpen, onClose, onSaleLogged }: LogSaleModalProps) {
  const currentUser = useCurrentUser();
  const { currentAgencyId } = useAgency();

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    premiumAmount: '',
    policyType: 'auto',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setFormData({
      customerName: '',
      premiumAmount: '',
      policyType: 'auto',
    });
    setErrors({});
    setShowSuccess(false);
  }, []);

  /**
   * Handle input changes
   */
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }, []);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (formData.customerName.length < 2) {
      newErrors.customerName = 'Customer name must be at least 2 characters';
    }

    if (!formData.premiumAmount.trim()) {
      newErrors.premiumAmount = 'Premium amount is required';
    } else {
      const amount = parseFloat(formData.premiumAmount.replace(/[,$]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        newErrors.premiumAmount = 'Please enter a valid premium amount';
      } else if (amount > 10000000) {
        newErrors.premiumAmount = 'Premium amount seems too high';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const premiumAmount = parseFloat(formData.premiumAmount.replace(/[,$]/g, ''));
      const policyTypeLabel = POLICY_TYPES.find((p) => p.value === formData.policyType)?.label || formData.policyType;

      // Create a completed quote task to represent the sale
      const { error: insertError } = await supabase.from('todos').insert({
        text: `${policyTypeLabel} policy sold - ${formData.customerName}`,
        completed: true,
        status: 'done',
        priority: 'medium',
        category: 'quote',
        premium_amount: premiumAmount,
        customer_name: formData.customerName.trim(),
        policy_type: formData.policyType,
        created_by: currentUser.name,
        assigned_to: currentUser.name,
        agency_id: currentAgencyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      // Show success animation briefly
      setShowSuccess(true);
      setTimeout(() => {
        resetForm();
        onSaleLogged();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log sale';
      setErrors({ general: errorMessage });
      logger.error('Failed to log sale', err as Error, {
        component: 'LogSaleModal',
        customerName: formData.customerName,
        policyType: formData.policyType,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, currentUser.name, currentAgencyId, onSaleLogged, resetForm]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, resetForm, onClose]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  }, [isSubmitting, handleClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="
              relative w-full max-w-md
              bg-[var(--surface)] dark:bg-slate-800
              rounded-2xl shadow-2xl
              border border-[var(--border-subtle)] dark:border-slate-700
              overflow-hidden
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-sale-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2
                    id="log-sale-title"
                    className="text-lg font-semibold text-[var(--foreground)] dark:text-white"
                  >
                    Log a Sale
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">
                    Record a completed policy
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="
                  p-2 rounded-lg
                  text-[var(--text-muted)] hover:text-[var(--foreground)]
                  dark:text-slate-400 dark:hover:text-white
                  hover:bg-[var(--surface-2)] dark:hover:bg-slate-700
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* General Error */}
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                >
                  {errors.general}
                </motion.div>
              )}

              {/* Customer Name */}
              <div>
                <label
                  htmlFor="customerName"
                  className="block text-sm font-medium text-[var(--foreground)] dark:text-white mb-2"
                >
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
                  <input
                    id="customerName"
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="John Smith"
                    disabled={isSubmitting || showSuccess}
                    className={`
                      w-full pl-10 pr-4 py-3 rounded-xl
                      bg-[var(--surface-2)] dark:bg-slate-700
                      border ${errors.customerName ? 'border-red-500' : 'border-[var(--border)] dark:border-slate-600'}
                      text-[var(--foreground)] dark:text-white
                      placeholder:text-[var(--text-muted)] dark:placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all
                    `}
                  />
                </div>
                {errors.customerName && (
                  <p className="mt-1 text-xs text-red-500">{errors.customerName}</p>
                )}
              </div>

              {/* Premium Amount */}
              <div>
                <label
                  htmlFor="premiumAmount"
                  className="block text-sm font-medium text-[var(--foreground)] dark:text-white mb-2"
                >
                  Premium Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
                  <input
                    id="premiumAmount"
                    type="text"
                    value={formData.premiumAmount}
                    onChange={(e) => handleInputChange('premiumAmount', e.target.value)}
                    placeholder="1,500"
                    disabled={isSubmitting || showSuccess}
                    className={`
                      w-full pl-10 pr-4 py-3 rounded-xl
                      bg-[var(--surface-2)] dark:bg-slate-700
                      border ${errors.premiumAmount ? 'border-red-500' : 'border-[var(--border)] dark:border-slate-600'}
                      text-[var(--foreground)] dark:text-white
                      placeholder:text-[var(--text-muted)] dark:placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all
                    `}
                  />
                </div>
                {errors.premiumAmount && (
                  <p className="mt-1 text-xs text-red-500">{errors.premiumAmount}</p>
                )}
              </div>

              {/* Policy Type */}
              <div>
                <label
                  htmlFor="policyType"
                  className="block text-sm font-medium text-[var(--foreground)] dark:text-white mb-2"
                >
                  Policy Type
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] dark:text-slate-400" />
                  <select
                    id="policyType"
                    value={formData.policyType}
                    onChange={(e) => handleInputChange('policyType', e.target.value)}
                    disabled={isSubmitting || showSuccess}
                    className="
                      w-full pl-10 pr-4 py-3 rounded-xl
                      bg-[var(--surface-2)] dark:bg-slate-700
                      border border-[var(--border)] dark:border-slate-600
                      text-[var(--foreground)] dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      appearance-none cursor-pointer
                      transition-all
                    "
                  >
                    {POLICY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[var(--text-muted)] dark:text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || showSuccess}
                whileHover={!isSubmitting && !showSuccess ? { scale: 1.01 } : {}}
                whileTap={!isSubmitting && !showSuccess ? { scale: 0.99 } : {}}
                className={`
                  w-full py-3.5 rounded-xl font-semibold text-white
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  disabled:cursor-not-allowed
                  ${showSuccess
                    ? 'bg-emerald-500'
                    : 'bg-[#0033A0] hover:bg-[#002880] disabled:bg-[#0033A0]/50'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logging Sale...
                  </>
                ) : showSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Sale Logged!
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Log Sale
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LogSaleModal;
