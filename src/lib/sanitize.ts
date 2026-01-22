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

export default {
  sanitizeText,
  sanitizeTranscription,
  sanitizeForDisplay,
  sanitizeUserName,
};
