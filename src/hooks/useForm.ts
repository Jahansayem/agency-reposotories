'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Validator, ValidationResult } from '@/lib/validation';

// ============================================
// Types
// ============================================

export interface UseFormOptions<T extends Record<string, any>> {
  /** Initial values for all form fields */
  initialValues: T;
  /**
   * Validation function that returns errors for each field.
   * Called on blur (first touch) and on every change after first touch.
   */
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  /**
   * Per-field validators as an alternative to a single validate function.
   * Each key maps to a Validator or array of Validators.
   */
  validators?: Partial<Record<keyof T, Validator | Validator[]>>;
  /**
   * Called when form is submitted and validation passes.
   */
  onSubmit: (values: T) => void | Promise<void>;
  /**
   * If true, validates all fields on mount. Defaults to false.
   */
  validateOnMount?: boolean;
  /**
   * If true, re-validates on every keystroke even before blur.
   * Defaults to false (validate on blur first, then on change after touch).
   */
  validateOnChange?: boolean;
}

export interface UseFormReturn<T extends Record<string, any>> {
  /** Current form values */
  values: T;
  /** Current validation errors (only for touched fields unless submitted) */
  errors: Partial<Record<keyof T, string>>;
  /** Which fields have been interacted with (blurred at least once) */
  touched: Partial<Record<keyof T, boolean>>;
  /** Whether any field value differs from initialValues */
  isDirty: boolean;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Whether the form has been submitted at least once */
  isSubmitted: boolean;
  /** Whether the form is valid (no errors) */
  isValid: boolean;
  /** Set a single field value */
  setValue: (field: keyof T, value: any) => void;
  /** Set multiple field values at once */
  setValues: (values: Partial<T>) => void;
  /** Handle input change event - use with native inputs */
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Handle input blur event - triggers validation for the field */
  handleBlur: (field: keyof T) => () => void;
  /** Handle form submission */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form to initial values (or new values) */
  reset: (newValues?: T) => void;
  /** Set a specific field error manually */
  setFieldError: (field: keyof T, error: string | null) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Mark a field as touched */
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  /** Get props to spread on a native input element */
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    'aria-invalid': boolean | undefined;
  };
  /** Get error state for a field (only shows error if touched or submitted) */
  getFieldError: (field: keyof T) => string | undefined;
  /** Check if a specific field is valid (touched and no error) */
  isFieldValid: (field: keyof T) => boolean;
  /** Per-field dirty status */
  dirtyFields: Partial<Record<keyof T, boolean>>;
}

// ============================================
// Compose validators helper (internal)
// ============================================

function runValidators(value: string, fieldValidators: Validator | Validator[]): ValidationResult {
  if (Array.isArray(fieldValidators)) {
    for (const validate of fieldValidators) {
      const error = validate(value ?? '');
      if (error) return error;
    }
    return null;
  }
  return fieldValidators(value ?? '');
}

// ============================================
// Hook Implementation
// ============================================

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  validators,
  onSubmit,
  validateOnMount = false,
  validateOnChange = false,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Keep stable reference to initialValues for dirty comparison
  const initialValuesRef = useRef(initialValues);

  // Update ref if initialValues changes identity
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValues]);

  // ── Dirty tracking ──
  const isDirty = useMemo(() => {
    const init = initialValuesRef.current;
    return Object.keys(init).some(
      (key) => values[key as keyof T] !== init[key as keyof T]
    );
  }, [values]);

  const dirtyFields = useMemo(() => {
    const init = initialValuesRef.current;
    const result: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(init) as (keyof T)[]) {
      if (values[key] !== init[key]) {
        result[key] = true;
      }
    }
    return result;
  }, [values]);

  // ── Validation logic ──
  const validateField = useCallback(
    (field: keyof T, currentValues: T): string | undefined => {
      // Per-field validator takes priority
      if (validators && validators[field]) {
        const fieldValidator = validators[field]!;
        const error = runValidators(String(currentValues[field] ?? ''), fieldValidator);
        if (error) return error;
      }

      // Then run the full validate function
      if (validate) {
        const allErrors = validate(currentValues);
        return allErrors[field] ?? undefined;
      }

      return undefined;
    },
    [validate, validators]
  );

  const validateAllFields = useCallback(
    (currentValues: T): Partial<Record<keyof T, string>> => {
      const allErrors: Partial<Record<keyof T, string>> = {};

      // Run per-field validators
      if (validators) {
        for (const key of Object.keys(validators) as (keyof T)[]) {
          const fieldValidator = validators[key];
          if (fieldValidator) {
            const error = runValidators(String(currentValues[key] ?? ''), fieldValidator);
            if (error) allErrors[key] = error;
          }
        }
      }

      // Run the full validate function and merge
      if (validate) {
        const formErrors = validate(currentValues);
        for (const key of Object.keys(formErrors) as (keyof T)[]) {
          if (formErrors[key] && !allErrors[key]) {
            allErrors[key] = formErrors[key];
          }
        }
      }

      return allErrors;
    },
    [validate, validators]
  );

  // ── Validate on mount ──
  useEffect(() => {
    if (validateOnMount) {
      const allErrors = validateAllFields(initialValues);
      setErrors(allErrors);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── isValid ──
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 ||
      Object.values(errors).every((e) => e === undefined || e === null);
  }, [errors]);

  // ── Field setters ──
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => {
        const next = { ...prev, [field]: value };

        // Re-validate if field has been touched or if validateOnChange is set
        if (touched[field] || validateOnChange || isSubmitted) {
          const fieldError = validateField(field, next);
          setErrors((prevErrors) => {
            if (fieldError) {
              return { ...prevErrors, [field]: fieldError };
            }
            const { [field]: _, ...rest } = prevErrors as any;
            return rest;
          });
        }

        return next;
      });
    },
    [touched, validateOnChange, isSubmitted, validateField]
  );

  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState((prev) => {
        const next = { ...prev, ...newValues };

        // Re-validate changed fields if needed
        if (isSubmitted || validateOnChange) {
          const allErrors = validateAllFields(next);
          setErrors(allErrors);
        }

        return next;
      });
    },
    [isSubmitted, validateOnChange, validateAllFields]
  );

  // ── Event handlers ──
  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const inputValue =
          e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;
        setValue(field, inputValue);
      },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      // Mark as touched
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur
      setValuesState((currentValues) => {
        const fieldError = validateField(field, currentValues);
        setErrors((prevErrors) => {
          if (fieldError) {
            return { ...prevErrors, [field]: fieldError };
          }
          const { [field]: _, ...rest } = prevErrors as any;
          return rest;
        });
        return currentValues; // no change to values
      });
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      setIsSubmitted(true);

      // Touch all fields
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      for (const key of Object.keys(values) as (keyof T)[]) {
        allTouched[key] = true;
      }
      setTouched(allTouched);

      // Validate all fields
      const allErrors = validateAllFields(values);
      setErrors(allErrors);

      // Check for errors
      const hasAnyErrors = Object.values(allErrors).some(
        (e) => e !== undefined && e !== null
      );
      if (hasAnyErrors) {
        return;
      }

      // Submit
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateAllFields, onSubmit]
  );

  // ── Reset ──
  const reset = useCallback(
    (newValues?: T) => {
      const resetTo = newValues ?? initialValuesRef.current;
      setValuesState(resetTo);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
      setIsSubmitted(false);
      if (newValues) {
        initialValuesRef.current = newValues;
      }
    },
    []
  );

  // ── Manual error/touched setters ──
  const setFieldError = useCallback(
    (field: keyof T, error: string | null) => {
      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        }
        const { [field]: _, ...rest } = prev as any;
        return rest;
      });
    },
    []
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [field]: isTouched }));
    },
    []
  );

  // ── Convenience getters ──
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field] ?? '',
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      'aria-invalid': ((touched[field] || isSubmitted) && !!errors[field]) || undefined,
    }),
    [values, handleChange, handleBlur, touched, isSubmitted, errors]
  );

  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      if ((touched[field] || isSubmitted) && errors[field]) {
        return errors[field] as string;
      }
      return undefined;
    },
    [touched, isSubmitted, errors]
  );

  const isFieldValid = useCallback(
    (field: keyof T): boolean => {
      return !!touched[field] && !errors[field];
    },
    [touched, errors]
  );

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    isSubmitted,
    isValid,
    setValue,
    setValues,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldError,
    clearErrors,
    setFieldTouched,
    getFieldProps,
    getFieldError,
    isFieldValid,
    dirtyFields,
  };
}

// ============================================
// useUnsavedChanges Hook
// ============================================

export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Message to show in the browser's beforeunload dialog */
  message?: string;
  /** Whether the guard is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook that warns users about unsaved changes when navigating away.
 *
 * Handles:
 * - Browser navigation (back button, close tab) via beforeunload
 * - Returns a `confirmNavigation` function for in-app navigation
 *
 * Usage:
 * ```tsx
 * const { confirmNavigation } = useUnsavedChanges({ isDirty: form.isDirty });
 *
 * const handleClose = () => {
 *   if (confirmNavigation()) {
 *     onClose();
 *   }
 * };
 * ```
 */
export function useUnsavedChanges({
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  enabled = true,
}: UseUnsavedChangesOptions) {
  // Browser beforeunload handler
  useEffect(() => {
    if (!isDirty || !enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a dialog
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message, enabled]);

  /**
   * Call before in-app navigation. Returns true if the user confirms
   * or if there are no unsaved changes.
   */
  const confirmNavigation = useCallback((): boolean => {
    if (!isDirty || !enabled) return true;
    return window.confirm(message);
  }, [isDirty, message, enabled]);

  return { confirmNavigation };
}

export default useForm;
