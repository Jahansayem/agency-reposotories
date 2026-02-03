'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Loader2, Check, AlertCircle } from 'lucide-react';
import { generateAgencySlug } from '@/types/agency';
import type { Agency } from '@/types/agency';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface CreateAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agency: Agency) => void;
  currentUserName: string;
}

interface FormData {
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
}

interface FormErrors {
  name?: string;
  slug?: string;
  primaryColor?: string;
  general?: string;
}

// ============================================
// Default Colors
// ============================================

const ALLSTATE_COLORS = [
  { name: 'Brand Blue', hex: '#0033A0' },
  { name: 'Sky Blue', hex: '#72B5E8' },
  { name: 'Gold', hex: '#C9A227' },
  { name: 'Navy', hex: '#003D7A' },
  { name: 'Teal', hex: '#5BA8A0' },
  { name: 'Orange', hex: '#E87722' },
  { name: 'Purple', hex: '#98579B' },
  { name: 'Muted Blue', hex: '#6E8AA7' },
];

// ============================================
// Component
// ============================================

export function CreateAgencyModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserName,
}: CreateAgencyModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    primaryColor: '#0033A0', // Default to Brand Blue
    secondaryColor: '#72B5E8', // Default to Sky Blue
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: autoGenerateSlug ? generateAgencySlug(name) : prev.slug,
    }));
    setErrors(prev => ({ ...prev, name: undefined }));
  };

  const handleSlugChange = (slug: string) => {
    setAutoGenerateSlug(false);
    setFormData(prev => ({ ...prev, slug }));
    setErrors(prev => ({ ...prev, slug: undefined }));
  };

  const handleColorSelect = (color: string, type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      setFormData(prev => ({ ...prev, primaryColor: color }));
    } else {
      setFormData(prev => ({ ...prev, secondaryColor: color }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agency name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agency name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Agency name must be less than 100 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug must be at least 3 characters';
    }

    if (!formData.primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.primaryColor = 'Invalid color format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          created_by: currentUserName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to create agency' });
        return;
      }

      // Success!
      onSuccess(data.agency);
      resetForm();
      onClose();

    } catch (error) {
      logger.error('Failed to create agency', error as Error, { component: 'CreateAgencyModal', action: 'handleSubmit' });
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      primaryColor: '#0033A0',
      secondaryColor: '#72B5E8',
    });
    setErrors({});
    setAutoGenerateSlug(true);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
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
                w-full max-w-2xl
                max-h-[90vh] overflow-y-auto
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Create New Agency
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Set up a new Allstate agency workspace
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* General Error */}
                {errors.general && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {errors.general}
                      </p>
                    </div>
                  </div>
                )}

                {/* Agency Name */}
                <div>
                  <label htmlFor="agency-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agency-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g., Bealer Agency Chicago"
                    className={`
                      w-full px-4 py-3 rounded-lg
                      bg-white dark:bg-gray-700
                      border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      text-gray-900 dark:text-white
                      placeholder:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This will be displayed to users when switching agencies
                  </p>
                </div>

                {/* Slug */}
                <div>
                  <label htmlFor="agency-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      /agencies/
                    </span>
                    <input
                      id="agency-slug"
                      type="text"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="bealer-agency-chicago"
                      className={`
                        flex-1 px-4 py-3 rounded-lg
                        bg-white dark:bg-gray-700
                        border ${errors.slug ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                        text-gray-900 dark:text-white
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        font-mono text-sm
                      `}
                    />
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug}</p>
                  )}
                  {autoGenerateSlug && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Auto-generated from agency name (edit to customize)
                    </p>
                  )}
                </div>

                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Primary Color
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {ALLSTATE_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => handleColorSelect(color.hex, 'primary')}
                        disabled={isSubmitting}
                        className="relative group"
                        title={color.name}
                      >
                        <div
                          className={`
                            w-12 h-12 rounded-lg
                            border-2 ${formData.primaryColor === color.hex ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}
                            transition-all duration-200
                            hover:scale-105
                            disabled:opacity-50
                          `}
                          style={{ backgroundColor: color.hex }}
                        />
                        {formData.primaryColor === color.hex && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Used for agency icon and branding
                  </p>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Preview
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      {formData.name.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formData.name || 'Agency Name'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        /{formData.slug || 'agency-slug'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You will be the agency owner
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="
                        px-4 py-2 rounded-lg
                        text-gray-700 dark:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="
                        px-6 py-2 rounded-lg
                        bg-blue-600 hover:bg-blue-700
                        text-white font-medium
                        transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2
                      "
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4" />
                          Create Agency
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
