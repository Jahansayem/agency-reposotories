/**
 * Text Sanitization Utilities
 *
 * Defense-in-depth utilities for sanitizing user-generated and external content.
 * While React's JSX interpolation automatically escapes HTML, these utilities
 * provide additional protection for edge cases and make security intentions explicit.
 */

/**
 * Removes or escapes potentially dangerous HTML/script content from text.
 * This is a defense-in-depth measure on top of React's built-in escaping.
 *
 * @param text - The text to sanitize
 * @param options - Sanitization options
 * @returns Sanitized text safe for display
 */
export function sanitizeText(
  text: string | null | undefined,
  options: {
    /** Maximum length (truncates with ellipsis if exceeded) */
    maxLength?: number;
    /** Whether to preserve newlines (default: true) */
    preserveNewlines?: boolean;
    /** Whether to normalize unicode (default: true) */
    normalizeUnicode?: boolean;
  } = {}
): string {
  if (!text) return '';

  const { maxLength, preserveNewlines = true, normalizeUnicode = true } = options;

  let sanitized = text;

  // Normalize unicode to prevent homograph attacks and malformed characters
  if (normalizeUnicode) {
    try {
      sanitized = sanitized.normalize('NFKC');
    } catch {
      // If normalization fails, continue with original text
    }
  }

  // Remove null bytes and other control characters (except newlines/tabs if preserving)
  if (preserveNewlines) {
    // Keep \n, \r, \t but remove other control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    // Remove all control characters including newlines
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Strip any HTML tags (defense in depth)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove javascript: and data: URLs that could be injected
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Remove potential script injection patterns
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Truncate if maxLength is specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength - 3) + '...';
  }

  return sanitized;
}

/**
 * Sanitizes text specifically from transcription sources.
 * Applies appropriate settings for voice transcription content.
 *
 * @param transcription - The transcription text to sanitize
 * @returns Sanitized transcription
 */
export function sanitizeTranscription(transcription: string | null | undefined): string {
  return sanitizeText(transcription, {
    preserveNewlines: true,
    normalizeUnicode: true,
    maxLength: 10000, // Reasonable limit for transcriptions
  });
}

/**
 * Sanitizes text specifically for display in UI components.
 * More aggressive sanitization for short display texts.
 *
 * @param text - The text to sanitize
 * @param maxLength - Maximum length (default: 500)
 * @returns Sanitized text for display
 */
export function sanitizeForDisplay(
  text: string | null | undefined,
  maxLength: number = 500
): string {
  return sanitizeText(text, {
    preserveNewlines: false,
    normalizeUnicode: true,
    maxLength,
  });
}

/**
 * Sanitizes user names for display.
 *
 * @param name - The user name to sanitize
 * @returns Sanitized user name
 */
export function sanitizeUserName(name: string | null | undefined): string {
  if (!name) return '';

  return sanitizeText(name, {
    preserveNewlines: false,
    normalizeUnicode: true,
    maxLength: 100,
  }).trim();
}

/**
 * Sanitizes a string value for use in Supabase/PostgREST filter expressions.
 *
 * SECURITY: PostgREST filter syntax uses special characters like `,`, `(`, `)`, `.`
 * that can be exploited if user input is interpolated directly into `.or()` filters.
 * This function escapes/removes these characters to prevent filter injection.
 *
 * Example attack: userName "admin,assigned_to.eq.victim)" could manipulate the filter.
 *
 * @param value - The value to sanitize for use in a filter
 * @returns Sanitized string safe for PostgREST filter interpolation
 */
export function sanitizeForPostgrestFilter(value: string | null | undefined): string {
  if (!value) return '';

  // Remove characters that have special meaning in PostgREST filter syntax:
  // - `,` separates multiple filters in .or()
  // - `(` and `)` are used for grouping and operators
  // - `.` is used in column references like "column.eq"
  // - `:` is used in some operators
  // - `*` is wildcard in text search
  // - `%` is used for LIKE patterns
  // Also remove backslash which could escape the next character
  return value.replace(/[,().:\\*%]/g, '');
}

/**
 * Validates that a UUID string is properly formatted.
 * Use this before interpolating UUIDs into filters.
 *
 * @param uuid - The string to validate as UUID
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUuid(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default {
  sanitizeText,
  sanitizeTranscription,
  sanitizeForDisplay,
  sanitizeUserName,
  sanitizeForPostgrestFilter,
  isValidUuid,
};
