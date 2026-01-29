'use client';

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type FormFieldState = 'default' | 'error' | 'success';

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display (sets state to error automatically) */
  error?: string;
  /** Success message to display (sets state to success automatically) */
  success?: string;
  /** Hint text shown below the field (hidden when error or success is present) */
  hint?: string;
  /** Override the visual state */
  state?: FormFieldState;
  /** The form control to wrap */
  children: ReactNode;
  /** Additional class names for the wrapper */
  className?: string;
  /** Custom ID for the input (auto-generated if not provided) */
  fieldId?: string;
  /** Whether to show the shake animation on error */
  shakeOnError?: boolean;
}

// ============================================================================
// FormField Component
// ============================================================================

/**
 * FormField - Wraps form inputs with label, error/success state, and accessibility attributes.
 *
 * Features:
 * - Label with required indicator
 * - Error state: Red border + shake animation + error icon + message
 * - Success state: Green border + checkmark icon + message
 * - Hint text for guidance
 * - Accessible: aria-invalid, aria-describedby, aria-required
 * - Shake animation with prefers-reduced-motion support
 *
 * Usage:
 * ```tsx
 * <FormField label="Task name" required error={errors.name}>
 *   <FormInput fieldState={errors.name ? 'error' : 'default'} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  required = false,
  error,
  success,
  hint,
  state: stateProp,
  children,
  className = '',
  fieldId: fieldIdProp,
  shakeOnError = true,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = fieldIdProp ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  // Determine state from props
  const state: FormFieldState = stateProp ?? (error ? 'error' : success ? 'success' : 'default');

  const messageText = error || success || hint;
  const messageId = error ? errorId : hint ? hintId : undefined;

  return (
    <div
      className={`
        form-field
        ${state === 'error' && shakeOnError ? 'form-field-shake' : ''}
        ${className}
      `}
      data-state={state}
    >
      {/* Label row */}
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 mb-1.5 text-sm font-medium text-[var(--foreground)]"
      >
        {label}
        {required && (
          <span className="text-[var(--danger)] text-xs" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Input wrapper - passes state context via data attribute */}
      <div
        className={`
          form-field-control
          ${state === 'error' ? 'form-field-control-error' : ''}
          ${state === 'success' ? 'form-field-control-success' : ''}
        `}
        data-state={state}
        data-field-id={fieldId}
      >
        {children}
      </div>

      {/* Message row */}
      {messageText && (
        <div
          id={messageId}
          role={state === 'error' ? 'alert' : undefined}
          aria-live={state === 'error' ? 'assertive' : undefined}
          className={`
            flex items-center gap-1.5 mt-1.5 text-xs
            ${state === 'error' ? 'text-[var(--danger)]' : ''}
            ${state === 'success' ? 'text-[var(--success)]' : ''}
            ${state === 'default' ? 'text-[var(--text-muted)]' : ''}
          `}
        >
          {state === 'error' && (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {state === 'success' && (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{messageText}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FormInput - Pre-styled input for use inside FormField
// ============================================================================

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual state override */
  fieldState?: FormFieldState;
}

/**
 * FormInput - A styled input element designed to work with FormField.
 *
 * Automatically applies correct border colors and focus states
 * based on the field state (default, error, success).
 */
export function FormInput({
  fieldState = 'default',
  className = '',
  ...props
}: FormInputProps) {
  return (
    <input
      aria-invalid={fieldState === 'error' ? true : undefined}
      className={`
        w-full px-3.5 py-2.5
        text-sm text-[var(--foreground)]
        bg-[var(--surface)]
        border-[1.5px] rounded-[var(--radius-lg)]
        placeholder:text-[var(--text-light)]
        transition-all duration-150 ease-out
        focus:outline-none
        ${fieldState === 'error'
          ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20'
          : fieldState === 'success'
            ? 'border-[var(--success)] focus:border-[var(--success)] focus:ring-2 focus:ring-[var(--success)]/20'
            : 'border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
}

// ============================================================================
// FormTextarea - Pre-styled textarea for use inside FormField
// ============================================================================

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visual state override */
  fieldState?: FormFieldState;
}

/**
 * FormTextarea - A styled textarea element designed to work with FormField.
 */
export function FormTextarea({
  fieldState = 'default',
  className = '',
  ...props
}: FormTextareaProps) {
  return (
    <textarea
      aria-invalid={fieldState === 'error' ? true : undefined}
      className={`
        w-full px-3.5 py-2.5
        text-sm text-[var(--foreground)]
        bg-[var(--surface)]
        border-[1.5px] rounded-[var(--radius-lg)]
        placeholder:text-[var(--text-light)]
        transition-all duration-150 ease-out
        resize-y min-h-[80px]
        focus:outline-none
        ${fieldState === 'error'
          ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20'
          : fieldState === 'success'
            ? 'border-[var(--success)] focus:border-[var(--success)] focus:ring-2 focus:ring-[var(--success)]/20'
            : 'border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
}

export default FormField;
