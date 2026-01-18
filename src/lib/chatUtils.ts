/**
 * Chat Utilities
 *
 * Security, validation, and helper functions for the chat system.
 * Addresses XSS vulnerabilities, rate limiting, and input validation.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_MENTIONS_PER_MESSAGE: 10,
  MIN_MESSAGE_LENGTH: 1,
  RATE_LIMIT_MESSAGES_PER_MINUTE: 30,
  RATE_LIMIT_WINDOW_MS: 60000,
  DEBOUNCE_TYPING_MS: 300,
  TYPING_TIMEOUT_MS: 3000,
} as const;

// ============================================================================
// XSS SANITIZATION
// ============================================================================

/**
 * HTML entities that need to be escaped to prevent XSS
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * This is the primary defense against script injection.
 *
 * @param text - The raw text to sanitize
 * @returns Sanitized text safe for rendering
 *
 * @example
 * sanitizeHTML('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function sanitizeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes a message object, escaping all text fields.
 *
 * @param message - The message object to sanitize
 * @returns A new message object with sanitized text fields
 */
export function sanitizeMessage<T extends { text: string; reply_to_text?: string | null }>(
  message: T
): T {
  return {
    ...message,
    text: sanitizeHTML(message.text),
    reply_to_text: message.reply_to_text ? sanitizeHTML(message.reply_to_text) : null,
  };
}

/**
 * Validates and sanitizes a username/mention.
 * Only allows alphanumeric characters and underscores.
 *
 * @param name - The username to validate
 * @returns Sanitized username or empty string if invalid
 */
export function sanitizeUsername(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Only allow alphanumeric and underscore, max 50 chars
  return name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitState {
  timestamps: number[];
  isLimited: boolean;
}

const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Checks if a user is rate limited for sending messages.
 *
 * @param userId - The user's unique identifier
 * @returns Object with isLimited status and remaining time if limited
 */
export function checkRateLimit(userId: string): {
  isLimited: boolean;
  remainingMs: number;
  messagesRemaining: number;
} {
  const now = Date.now();
  const windowStart = now - CHAT_LIMITS.RATE_LIMIT_WINDOW_MS;

  let state = rateLimitStore.get(userId);

  if (!state) {
    state = { timestamps: [], isLimited: false };
    rateLimitStore.set(userId, state);
  }

  // Remove timestamps outside the window
  state.timestamps = state.timestamps.filter((ts) => ts > windowStart);

  const messagesInWindow = state.timestamps.length;
  const isLimited = messagesInWindow >= CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE;

  // Calculate remaining time until oldest message expires
  let remainingMs = 0;
  if (isLimited && state.timestamps.length > 0) {
    const oldestTimestamp = Math.min(...state.timestamps);
    remainingMs = Math.max(0, oldestTimestamp + CHAT_LIMITS.RATE_LIMIT_WINDOW_MS - now);
  }

  return {
    isLimited,
    remainingMs,
    messagesRemaining: Math.max(0, CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE - messagesInWindow),
  };
}

/**
 * Records a message send for rate limiting purposes.
 *
 * @param userId - The user's unique identifier
 * @returns Whether the message was allowed (not rate limited)
 */
export function recordMessageSend(userId: string): boolean {
  const { isLimited } = checkRateLimit(userId);

  if (isLimited) {
    return false;
  }

  const state = rateLimitStore.get(userId)!;
  state.timestamps.push(Date.now());

  return true;
}

/**
 * Clears rate limit state for a user (useful for testing).
 *
 * @param userId - The user's unique identifier
 */
export function clearRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Clears all rate limit state (useful for testing).
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedText?: string;
  sanitizedMentions?: string[];
}

/**
 * Validates a chat message before sending.
 *
 * @param text - The message text
 * @param mentions - Array of mentioned usernames
 * @param validUsers - Array of valid usernames for mention validation
 * @returns Validation result with errors and sanitized values
 */
export function validateMessage(
  text: string,
  mentions: string[] = [],
  validUsers: string[] = []
): ValidationResult {
  const errors: string[] = [];

  // Validate text
  if (!text || typeof text !== 'string') {
    errors.push('Message text is required');
    return { isValid: false, errors };
  }

  const trimmedText = text.trim();

  if (trimmedText.length < CHAT_LIMITS.MIN_MESSAGE_LENGTH) {
    errors.push('Message cannot be empty');
  }

  if (trimmedText.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
    errors.push(`Message exceeds maximum length of ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters`);
  }

  // Validate mentions
  if (mentions.length > CHAT_LIMITS.MAX_MENTIONS_PER_MESSAGE) {
    errors.push(`Too many mentions (max ${CHAT_LIMITS.MAX_MENTIONS_PER_MESSAGE})`);
  }

  // Validate each mention is a valid user
  const sanitizedMentions: string[] = [];
  const validUserLower = validUsers.map((u) => u.toLowerCase());

  for (const mention of mentions) {
    const sanitized = sanitizeUsername(mention);
    if (sanitized && validUserLower.includes(sanitized.toLowerCase())) {
      sanitizedMentions.push(sanitized);
    }
  }

  // Check for potentially malicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedText)) {
      errors.push('Message contains potentially unsafe content');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedText: sanitizeHTML(trimmedText),
    sanitizedMentions,
  };
}

/**
 * Extracts mentions from message text and validates them.
 *
 * @param text - The message text
 * @param validUsers - Array of valid usernames
 * @returns Array of valid mentioned usernames
 */
export function extractAndValidateMentions(text: string, validUsers: string[]): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  const validUserLower = validUsers.map((u) => u.toLowerCase());
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const userName = match[1];
    if (
      validUserLower.includes(userName.toLowerCase()) &&
      mentions.length < CHAT_LIMITS.MAX_MENTIONS_PER_MESSAGE
    ) {
      // Find the correctly cased version
      const correctCase = validUsers.find((u) => u.toLowerCase() === userName.toLowerCase());
      if (correctCase && !mentions.includes(correctCase)) {
        mentions.push(correctCase);
      }
    }
  }

  return mentions;
}

// ============================================================================
// DEBOUNCING & THROTTLING
// ============================================================================

/**
 * Creates a debounced function that delays invoking the callback
 * until after the specified wait time has elapsed since the last call.
 *
 * @param callback - The function to debounce
 * @param wait - The debounce delay in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes the callback
 * at most once per specified time period.
 *
 * @param callback - The function to throttle
 * @param limit - The throttle period in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  callback: T,
  limit: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      callback(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          lastCall = Date.now();
          timeoutId = null;
          callback(...args);
        },
        limit - (now - lastCall)
      );
    }
  }) as T;
}

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

/**
 * Formats a timestamp for display in chat.
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Truncates text to a maximum length with ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Generates an accessible label for a chat message.
 *
 * @param message - The message object
 * @param isOwnMessage - Whether the message is from the current user
 * @returns Accessible label string
 */
export function getMessageAriaLabel(
  message: { text: string; created_by: string; created_at: string; edited_at?: string | null },
  isOwnMessage: boolean
): string {
  const sender = isOwnMessage ? 'You' : message.created_by;
  const time = formatMessageTime(message.created_at);
  const editedSuffix = message.edited_at ? ', edited' : '';

  return `Message from ${sender} at ${time}${editedSuffix}: ${truncateText(message.text, 100)}`;
}

/**
 * Generates an accessible label for a reaction button.
 *
 * @param reaction - The reaction type
 * @param count - Number of users who reacted
 * @param hasReacted - Whether current user has reacted
 * @returns Accessible label string
 */
export function getReactionAriaLabel(
  reaction: string,
  count: number,
  hasReacted: boolean
): string {
  const reactionNames: Record<string, string> = {
    heart: 'love',
    thumbsup: 'like',
    thumbsdown: 'dislike',
    haha: 'laugh',
    exclamation: 'important',
    question: 'question',
  };

  const name = reactionNames[reaction] || reaction;
  const userAction = hasReacted ? 'Remove your' : 'Add';

  return `${userAction} ${name} reaction. ${count} ${count === 1 ? 'person has' : 'people have'} reacted.`;
}
