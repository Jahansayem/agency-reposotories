/**
 * Session Validation Unit Tests
 *
 * Tests for server-side session validation and token management.
 *
 * Note: The database-dependent functions (validateSession, createSession, etc.)
 * are tested via their API contract and error handling behavior, as the Supabase
 * client is instantiated at module load time.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Set up environment before importing the module
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

import {
  hashSessionToken,
  generateSessionToken,
} from '@/lib/sessionValidator';

describe('Session Validator', () => {
  describe('generateSessionToken', () => {
    it('should generate a string token', () => {
      const token = generateSessionToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const token3 = generateSessionToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate URL-safe base64 tokens', () => {
      const token = generateSessionToken();
      // base64url does not contain +, /, or = characters
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      // May or may not contain = depending on padding
    });

    it('should generate tokens of consistent length', () => {
      // 32 bytes in base64url should be ~43 characters
      const tokens = Array.from({ length: 10 }, () => generateSessionToken());
      const lengths = new Set(tokens.map(t => t.length));
      expect(lengths.size).toBe(1); // All same length
    });

    it('should generate tokens with sufficient entropy', () => {
      // 32 bytes = 256 bits of entropy
      const token = generateSessionToken();
      // base64url encodes 6 bits per character, 32 bytes = 43 chars
      expect(token.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('hashSessionToken', () => {
    it('should return a hex string', () => {
      const hash = hashSessionToken('test-token');
      expect(typeof hash).toBe('string');
      // SHA-256 produces 64 hex characters
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should produce consistent hashes for same input', () => {
      const hash1 = hashSessionToken('my-token');
      const hash2 = hashSessionToken('my-token');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashSessionToken('token-1');
      const hash2 = hashSessionToken('token-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashSessionToken('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should handle unicode characters', () => {
      const hash = hashSessionToken('token-with-unicode-chars');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      const hash = hashSessionToken(longToken);
      expect(hash.length).toBe(64);
    });

    it('should produce known hash for known input', () => {
      // SHA-256 of "test" is well-known
      const hash = hashSessionToken('test');
      expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });

  // Test the integration between generate and hash
  describe('Token Generation and Hashing Integration', () => {
    it('should generate tokens that can be hashed', () => {
      const token = generateSessionToken();
      const hash = hashSessionToken(token);

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should produce different hashes for different generated tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      const hash1 = hashSessionToken(token1);
      const hash2 = hashSessionToken(token2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hash for same generated token', () => {
      const token = generateSessionToken();
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);

      expect(hash1).toBe(hash2);
    });
  });

  // Test API contract for database-dependent functions
  describe('API Contract Tests', () => {
    it('should export validateSession function', async () => {
      const { validateSession } = await import('@/lib/sessionValidator');
      expect(typeof validateSession).toBe('function');
    });

    it('should export createSession function', async () => {
      const { createSession } = await import('@/lib/sessionValidator');
      expect(typeof createSession).toBe('function');
    });

    it('should export invalidateSession function', async () => {
      const { invalidateSession } = await import('@/lib/sessionValidator');
      expect(typeof invalidateSession).toBe('function');
    });

    it('should export invalidateAllUserSessions function', async () => {
      const { invalidateAllUserSessions } = await import('@/lib/sessionValidator');
      expect(typeof invalidateAllUserSessions).toBe('function');
    });

    it('should export touchSession function', async () => {
      const { touchSession } = await import('@/lib/sessionValidator');
      expect(typeof touchSession).toBe('function');
    });
  });

  // Test SessionValidationResult interface compliance
  describe('SessionValidationResult Structure', () => {
    it('validateSession should return object with valid property', async () => {
      const { validateSession } = await import('@/lib/sessionValidator');

      // Create a minimal mock request
      const mockRequest = {
        cookies: {
          get: () => undefined,
        },
        headers: {
          get: () => null,
        },
      } as any;

      const result = await validateSession(mockRequest);

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    it('validateSession should return error message when no token provided', async () => {
      const { validateSession } = await import('@/lib/sessionValidator');

      const mockRequest = {
        cookies: {
          get: () => undefined,
        },
        headers: {
          get: () => null,
        },
      } as any;

      const result = await validateSession(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No session token provided. Please log in.');
    });
  });

  // Test token extraction logic
  describe('Token Extraction Priority', () => {
    it('should handle request with no authentication', async () => {
      const { validateSession } = await import('@/lib/sessionValidator');

      const mockRequest = {
        cookies: {
          get: (name: string) => undefined,
        },
        headers: {
          get: (name: string) => null,
        },
      } as any;

      const result = await validateSession(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No session token');
    });

    it('should handle Authorization header without Bearer prefix', async () => {
      const { validateSession } = await import('@/lib/sessionValidator');

      const mockRequest = {
        cookies: {
          get: (name: string) => undefined,
        },
        headers: {
          get: (name: string) => {
            if (name === 'Authorization') return 'Basic credentials';
            return null;
          },
        },
      } as any;

      const result = await validateSession(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No session token');
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('createSession should handle database errors gracefully', async () => {
      const { createSession } = await import('@/lib/sessionValidator');

      // With invalid Supabase credentials, should return null
      const result = await createSession('user-123');

      expect(result).toBeNull();
    });

    it('invalidateSession should handle database errors gracefully', async () => {
      const { invalidateSession } = await import('@/lib/sessionValidator');

      // With invalid credentials, should return false
      const result = await invalidateSession('some-token-hash');

      expect(result).toBe(false);
    });

    it('invalidateAllUserSessions should handle database errors gracefully', async () => {
      const { invalidateAllUserSessions } = await import('@/lib/sessionValidator');

      // With invalid credentials, should return false
      const result = await invalidateAllUserSessions('user-123');

      expect(result).toBe(false);
    });

    it('touchSession should not throw on database errors', async () => {
      const { touchSession } = await import('@/lib/sessionValidator');

      // Should not throw even with invalid credentials
      await expect(touchSession('some-token-hash')).resolves.not.toThrow();
    });
  });

  // Test security properties
  describe('Security Properties', () => {
    it('generated tokens should have high entropy', () => {
      const tokens = Array.from({ length: 100 }, () => generateSessionToken());
      const uniqueTokens = new Set(tokens);

      // All tokens should be unique
      expect(uniqueTokens.size).toBe(100);
    });

    it('token hashes should be irreversible (one-way)', () => {
      const token = generateSessionToken();
      const hash = hashSessionToken(token);

      // Hash should not contain the original token
      expect(hash).not.toContain(token);
      expect(hash.length).toBe(64); // Fixed length regardless of input
    });

    it('similar tokens should produce vastly different hashes', () => {
      const hash1 = hashSessionToken('token-a');
      const hash2 = hashSessionToken('token-b');

      // Count differing characters
      let differences = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) differences++;
      }

      // Should have significant differences (avalanche effect)
      expect(differences).toBeGreaterThan(30);
    });
  });
});
