/**
 * Form Validation Utilities
 *
 * A composable validation system for forms across the application.
 * Provides common validators and utilities for composing custom validation rules.
 */

// ============================================
// Types
// ============================================

export type ValidationResult = string | null;
export type Validator = (value: string) => ValidationResult;
export type AsyncValidator = (value: string) => Promise<ValidationResult>;

export interface FieldValidationState {
  isValid: boolean;
  error: string | null;
  isValidating: boolean;
}

// ============================================
// Basic Validators
// ============================================

/**
 * Validates that a field is not empty
 */
export const required = (fieldName: string): Validator => (value: string): ValidationResult => {
  if (!value?.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates email format
 */
export const validateEmail = (value: string): ValidationResult => {
  if (!value) return null; // Let required() handle empty check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Invalid email format';
  }
  return null;
};

/**
 * Validates that email is required and properly formatted
 */
export const requiredEmail = (value: string): ValidationResult => {
  if (!value?.trim()) return 'Email is required';
  return validateEmail(value);
};

/**
 * Validates phone number format (minimum 10 digits)
 */
export const validatePhone = (value: string): ValidationResult => {
  if (!value) return null; // Let required() handle empty check
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  if (digits.length > 15) {
    return 'Phone number is too long';
  }
  return null;
};

/**
 * Validates that phone is required and properly formatted
 */
export const requiredPhone = (value: string): ValidationResult => {
  if (!value?.trim()) return 'Phone number is required';
  return validatePhone(value);
};

// ============================================
// Length Validators
// ============================================

/**
 * Validates minimum length
 */
export const minLength = (min: number, fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null; // Let required() handle empty check
  if (value.length < min) {
    return fieldName
      ? `${fieldName} must be at least ${min} characters`
      : `Must be at least ${min} characters`;
  }
  return null;
};

/**
 * Validates maximum length
 */
export const maxLength = (max: number, fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  if (value.length > max) {
    return fieldName
      ? `${fieldName} must be no more than ${max} characters`
      : `Must be no more than ${max} characters`;
  }
  return null;
};

/**
 * Validates length is within a range
 */
export const lengthBetween = (min: number, max: number, fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  if (value.length < min || value.length > max) {
    return fieldName
      ? `${fieldName} must be between ${min} and ${max} characters`
      : `Must be between ${min} and ${max} characters`;
  }
  return null;
};

// ============================================
// Pattern Validators
// ============================================

/**
 * Validates value matches a pattern
 */
export const pattern = (regex: RegExp, message: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  if (!regex.test(value)) {
    return message;
  }
  return null;
};

/**
 * Validates alphanumeric characters only
 */
export const alphanumeric = (fieldName?: string): Validator =>
  pattern(/^[a-zA-Z0-9]+$/, fieldName ? `${fieldName} must be alphanumeric` : 'Must be alphanumeric');

/**
 * Validates no special characters (letters, numbers, spaces only)
 */
export const noSpecialChars = (fieldName?: string): Validator =>
  pattern(/^[a-zA-Z0-9\s]+$/, fieldName ? `${fieldName} cannot contain special characters` : 'Cannot contain special characters');

// ============================================
// Number Validators
// ============================================

/**
 * Validates value is a number
 */
export const isNumber = (value: string): ValidationResult => {
  if (!value) return null;
  if (isNaN(Number(value))) {
    return 'Must be a valid number';
  }
  return null;
};

/**
 * Validates value is within a numeric range
 */
export const numberBetween = (min: number, max: number, fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  const num = Number(value);
  if (isNaN(num)) return 'Must be a valid number';
  if (num < min || num > max) {
    return fieldName
      ? `${fieldName} must be between ${min} and ${max}`
      : `Must be between ${min} and ${max}`;
  }
  return null;
};

/**
 * Validates value is a positive number
 */
export const positiveNumber = (fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return fieldName ? `${fieldName} must be a positive number` : 'Must be a positive number';
  }
  return null;
};

// ============================================
// URL Validator
// ============================================

/**
 * Validates URL format
 */
export const validateUrl = (value: string): ValidationResult => {
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return 'Invalid URL format';
  }
};

// ============================================
// Date Validators
// ============================================

/**
 * Validates date is not in the past
 */
export const futureDate = (fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date';
  if (date < new Date()) {
    return fieldName ? `${fieldName} must be in the future` : 'Date must be in the future';
  }
  return null;
};

/**
 * Validates date is not in the future
 */
export const pastDate = (fieldName?: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date';
  if (date > new Date()) {
    return fieldName ? `${fieldName} must be in the past` : 'Date must be in the past';
  }
  return null;
};

// ============================================
// Comparison Validators
// ============================================

/**
 * Validates value matches another value (useful for password confirmation)
 */
export const matches = (otherValue: string, fieldName: string): Validator => (value: string): ValidationResult => {
  if (!value) return null;
  if (value !== otherValue) {
    return `Does not match ${fieldName}`;
  }
  return null;
};

// ============================================
// Composition Utilities
// ============================================

/**
 * Compose multiple validators into one
 * Validators are run in order, first error wins
 */
export const compose = (...validators: Validator[]): Validator => (value: string): ValidationResult => {
  for (const validate of validators) {
    const error = validate(value);
    if (error) return error;
  }
  return null;
};

/**
 * Compose multiple async validators into one
 */
export const composeAsync = (...validators: (Validator | AsyncValidator)[]): AsyncValidator =>
  async (value: string): Promise<ValidationResult> => {
    for (const validate of validators) {
      const error = await validate(value);
      if (error) return error;
    }
    return null;
  };

/**
 * Run validator only if condition is true
 */
export const when = (condition: boolean, validator: Validator): Validator => (value: string): ValidationResult => {
  if (!condition) return null;
  return validator(value);
};

/**
 * Run validator only if value is not empty
 */
export const optional = (validator: Validator): Validator => (value: string): ValidationResult => {
  if (!value?.trim()) return null;
  return validator(value);
};

// ============================================
// Form-Level Validation
// ============================================

export type FormValidators<T> = {
  [K in keyof T]?: Validator | Validator[];
};

export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Validate all fields in a form
 */
export function validateForm<T extends Record<string, string>>(
  values: T,
  validators: FormValidators<T>
): FormErrors<T> {
  const errors: FormErrors<T> = {};

  for (const key of Object.keys(validators) as (keyof T)[]) {
    const fieldValidators = validators[key];
    if (!fieldValidators) continue;

    const value = values[key] || '';

    if (Array.isArray(fieldValidators)) {
      // Multiple validators - compose them
      const error = compose(...fieldValidators)(value);
      if (error) errors[key] = error;
    } else {
      // Single validator
      const error = fieldValidators(value);
      if (error) errors[key] = error;
    }
  }

  return errors;
}

/**
 * Check if form has any errors
 */
export function hasErrors<T>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(error => error !== null && error !== undefined);
}

// ============================================
// Formatting Utilities (for display)
// ============================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Parse phone number to digits only
 */
export function parsePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============================================
// Insurance-Specific Validators
// ============================================

/**
 * Validates policy number format (alphanumeric, 6-20 chars)
 */
export const validatePolicyNumber = (value: string): ValidationResult => {
  if (!value) return null;
  if (!/^[A-Za-z0-9-]{6,20}$/.test(value)) {
    return 'Invalid policy number format';
  }
  return null;
};

/**
 * Validates VIN (Vehicle Identification Number)
 * 17 characters, no I, O, or Q
 */
export const validateVIN = (value: string): ValidationResult => {
  if (!value) return null;
  const vin = value.toUpperCase();
  if (vin.length !== 17) {
    return 'VIN must be exactly 17 characters';
  }
  if (/[IOQ]/.test(vin)) {
    return 'VIN cannot contain I, O, or Q';
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return 'Invalid VIN format';
  }
  return null;
};

/**
 * Validates SSN format (for display purposes, not storing raw SSNs)
 * Accepts XXX-XX-XXXX or XXXXXXXXX
 */
export const validateSSNFormat = (value: string): ValidationResult => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 9) {
    return 'SSN must be 9 digits';
  }
  // Check for obviously invalid SSNs
  if (digits.startsWith('000') || digits.startsWith('666') || digits.startsWith('9')) {
    return 'Invalid SSN';
  }
  return null;
};
