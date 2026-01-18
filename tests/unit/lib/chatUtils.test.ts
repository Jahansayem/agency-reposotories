import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sanitizeHTML,
  sanitizeMessage,
  sanitizeUsername,
  checkRateLimit,
  recordMessageSend,
  clearRateLimit,
  clearAllRateLimits,
  validateMessage,
  extractAndValidateMentions,
  debounce,
  throttle,
  formatMessageTime,
  truncateText,
  getMessageAriaLabel,
  getReactionAriaLabel,
  CHAT_LIMITS,
} from '@/lib/chatUtils';

describe('chatUtils', () => {
  describe('sanitizeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(sanitizeHTML('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(sanitizeHTML("It's working")).toBe('It&#x27;s working');
    });

    it('should handle empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeHTML(null as unknown as string)).toBe('');
      expect(sanitizeHTML(undefined as unknown as string)).toBe('');
    });

    it('should escape event handlers', () => {
      // &#x3D; is the hex entity for =, &equals; is the named entity - both valid
      expect(sanitizeHTML('<img onerror="alert(1)">')).toBe(
        '&lt;img onerror&#x3D;&quot;alert(1)&quot;&gt;'
      );
    });

    it('should preserve normal text', () => {
      expect(sanitizeHTML('Hello world!')).toBe('Hello world!');
    });

    it('should preserve mentions', () => {
      expect(sanitizeHTML('@Derrick please review')).toBe('@Derrick please review');
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize message text', () => {
      const message = {
        text: '<script>alert("xss")</script>',
        reply_to_text: 'normal reply',
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.text).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized.reply_to_text).toBe('normal reply');
    });

    it('should sanitize reply_to_text', () => {
      const message = {
        text: 'Hello',
        reply_to_text: '<img src=x onerror=alert(1)>',
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.reply_to_text).toContain('&lt;img');
    });

    it('should handle null reply_to_text', () => {
      const message = {
        text: 'Hello',
        reply_to_text: null,
      };
      const sanitized = sanitizeMessage(message);
      expect(sanitized.reply_to_text).toBeNull();
    });
  });

  describe('sanitizeUsername', () => {
    it('should only allow alphanumeric and underscore', () => {
      expect(sanitizeUsername('John_Doe')).toBe('John_Doe');
      expect(sanitizeUsername('user123')).toBe('user123');
    });

    it('should remove special characters', () => {
      expect(sanitizeUsername('John<script>Doe')).toBe('JohnscriptDoe');
      expect(sanitizeUsername('user@domain.com')).toBe('userdomaincom');
    });

    it('should limit length to 50 characters', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeUsername(longName)).toHaveLength(50);
    });

    it('should handle empty input', () => {
      expect(sanitizeUsername('')).toBe('');
      expect(sanitizeUsername(null as unknown as string)).toBe('');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      clearAllRateLimits();
    });

    it('should allow messages under the limit', () => {
      const userId = 'user1';
      const result = checkRateLimit(userId);
      expect(result.isLimited).toBe(false);
      expect(result.messagesRemaining).toBe(CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE);
    });

    it('should record message sends', () => {
      const userId = 'user1';
      const allowed = recordMessageSend(userId);
      expect(allowed).toBe(true);

      const result = checkRateLimit(userId);
      expect(result.messagesRemaining).toBe(CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE - 1);
    });

    it('should block when rate limit exceeded', () => {
      const userId = 'user1';

      // Send max messages
      for (let i = 0; i < CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE; i++) {
        recordMessageSend(userId);
      }

      const result = checkRateLimit(userId);
      expect(result.isLimited).toBe(true);
      expect(result.messagesRemaining).toBe(0);
    });

    it('should not allow sends when rate limited', () => {
      const userId = 'user1';

      // Send max messages
      for (let i = 0; i < CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE; i++) {
        recordMessageSend(userId);
      }

      const allowed = recordMessageSend(userId);
      expect(allowed).toBe(false);
    });

    it('should clear rate limit for user', () => {
      const userId = 'user1';
      recordMessageSend(userId);
      clearRateLimit(userId);

      const result = checkRateLimit(userId);
      expect(result.messagesRemaining).toBe(CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE);
    });

    it('should track rate limits independently per user', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // Max out user1
      for (let i = 0; i < CHAT_LIMITS.RATE_LIMIT_MESSAGES_PER_MINUTE; i++) {
        recordMessageSend(user1);
      }

      // user2 should still be able to send
      const result = checkRateLimit(user2);
      expect(result.isLimited).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const result = validateMessage('Hello world', [], []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty message', () => {
      const result = validateMessage('', [], []);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message text is required');
    });

    it('should reject whitespace-only message', () => {
      const result = validateMessage('   ', [], []);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message cannot be empty');
    });

    it('should reject message exceeding max length', () => {
      const longMessage = 'a'.repeat(CHAT_LIMITS.MAX_MESSAGE_LENGTH + 1);
      const result = validateMessage(longMessage, [], []);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds maximum length'))).toBe(true);
    });

    it('should reject too many mentions', () => {
      const mentions = Array(CHAT_LIMITS.MAX_MENTIONS_PER_MESSAGE + 1).fill('user');
      const result = validateMessage('Hello', mentions, ['user']);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Too many mentions'))).toBe(true);
    });

    it('should detect suspicious script patterns', () => {
      const result = validateMessage('<script>alert(1)</script>', [], []);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('unsafe content'))).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      const result = validateMessage('click here: javascript:alert(1)', [], []);
      expect(result.isValid).toBe(false);
    });

    it('should detect event handlers', () => {
      const result = validateMessage('<img onerror=alert(1)>', [], []);
      expect(result.isValid).toBe(false);
    });

    it('should sanitize valid message text', () => {
      const result = validateMessage('Hello & goodbye', [], []);
      expect(result.sanitizedText).toBe('Hello &amp; goodbye');
    });

    it('should validate mentions against valid users', () => {
      const result = validateMessage('Hello', ['Derrick', 'InvalidUser'], ['Derrick', 'Sefra']);
      expect(result.sanitizedMentions).toContain('Derrick');
      expect(result.sanitizedMentions).not.toContain('InvalidUser');
    });
  });

  describe('extractAndValidateMentions', () => {
    it('should extract valid mentions', () => {
      const mentions = extractAndValidateMentions('@Derrick please review', ['Derrick', 'Sefra']);
      expect(mentions).toContain('Derrick');
    });

    it('should ignore invalid mentions', () => {
      const mentions = extractAndValidateMentions('@Unknown hello', ['Derrick', 'Sefra']);
      expect(mentions).toHaveLength(0);
    });

    it('should extract multiple mentions', () => {
      const mentions = extractAndValidateMentions('@Derrick and @Sefra', ['Derrick', 'Sefra']);
      expect(mentions).toContain('Derrick');
      expect(mentions).toContain('Sefra');
    });

    it('should be case-insensitive', () => {
      const mentions = extractAndValidateMentions('@derrick please', ['Derrick']);
      expect(mentions).toContain('Derrick');
    });

    it('should limit mentions', () => {
      const users = Array(20)
        .fill(0)
        .map((_, i) => `User${i}`);
      const text = users.map((u) => `@${u}`).join(' ');
      const mentions = extractAndValidateMentions(text, users);
      expect(mentions.length).toBeLessThanOrEqual(CHAT_LIMITS.MAX_MENTIONS_PER_MESSAGE);
    });

    it('should not duplicate mentions', () => {
      const mentions = extractAndValidateMentions('@Derrick and @Derrick again', ['Derrick']);
      expect(mentions).toHaveLength(1);
    });

    it('should handle empty input', () => {
      expect(extractAndValidateMentions('', ['Derrick'])).toEqual([]);
      expect(extractAndValidateMentions(null as unknown as string, ['Derrick'])).toEqual([]);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      debounced();
      debounced();

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should cancel debounced call', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();
      throttled();
      throttled();

      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatMessageTime', () => {
    it('should format recent messages as "Just now"', () => {
      const now = new Date().toISOString();
      expect(formatMessageTime(now)).toBe('Just now');
    });

    it('should format messages from minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatMessageTime(fiveMinutesAgo)).toBe('5m ago');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('getMessageAriaLabel', () => {
    it('should generate label for own message', () => {
      const message = {
        text: 'Hello world',
        created_by: 'Derrick',
        created_at: new Date().toISOString(),
      };
      const label = getMessageAriaLabel(message, true);
      expect(label).toContain('You');
      expect(label).toContain('Hello world');
    });

    it('should generate label for other user message', () => {
      const message = {
        text: 'Hello world',
        created_by: 'Sefra',
        created_at: new Date().toISOString(),
      };
      const label = getMessageAriaLabel(message, false);
      expect(label).toContain('Sefra');
    });

    it('should indicate edited messages', () => {
      const message = {
        text: 'Edited message',
        created_by: 'Derrick',
        created_at: new Date().toISOString(),
        edited_at: new Date().toISOString(),
      };
      const label = getMessageAriaLabel(message, true);
      expect(label).toContain('edited');
    });
  });

  describe('getReactionAriaLabel', () => {
    it('should generate label for adding reaction', () => {
      const label = getReactionAriaLabel('heart', 0, false);
      expect(label).toContain('Add');
      expect(label).toContain('love');
    });

    it('should generate label for removing reaction', () => {
      const label = getReactionAriaLabel('heart', 1, true);
      expect(label).toContain('Remove');
    });

    it('should include reaction count', () => {
      const label = getReactionAriaLabel('thumbsup', 5, false);
      expect(label).toContain('5');
      expect(label).toContain('people');
    });

    it('should use singular for single reaction', () => {
      const label = getReactionAriaLabel('thumbsup', 1, false);
      expect(label).toContain('1 person has');
    });
  });
});
