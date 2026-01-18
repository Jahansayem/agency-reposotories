/**
 * CSRF Protection Unit Tests
 *
 * Tests for CSRF token generation, validation, and client-side helpers
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  getOrCreateCsrfToken,
  shouldProtectRoute,
  getClientCsrfToken,
  addCsrfHeader,
  csrfMiddleware,
  fetchWithCsrf,
} from '@/lib/csrf';

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  pathname: string,
  options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
) {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers(options.headers || {});

  return {
    method,
    nextUrl: { pathname },
    url,
    headers,
    cookies: {
      get: (name: string) => {
        const value = options.cookies?.[name];
        return value ? { value } : undefined;
      },
    },
  } as unknown as Parameters<typeof validateCsrfToken>[0];
}

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('shouldProtectRoute', () => {
    it('should protect POST requests to /api/*', () => {
      const request = createMockRequest('POST', '/api/todos');
      expect(shouldProtectRoute(request)).toBe(true);
    });

    it('should protect PUT requests to /api/*', () => {
      const request = createMockRequest('PUT', '/api/todos/123');
      expect(shouldProtectRoute(request)).toBe(true);
    });

    it('should protect PATCH requests to /api/*', () => {
      const request = createMockRequest('PATCH', '/api/todos/123');
      expect(shouldProtectRoute(request)).toBe(true);
    });

    it('should protect DELETE requests to /api/*', () => {
      const request = createMockRequest('DELETE', '/api/todos/123');
      expect(shouldProtectRoute(request)).toBe(true);
    });

    it('should not protect GET requests', () => {
      const request = createMockRequest('GET', '/api/todos');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect non-API routes', () => {
      const request = createMockRequest('POST', '/dashboard');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect exempt routes - /api/outlook/', () => {
      const request = createMockRequest('POST', '/api/outlook/create-task');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect exempt routes - /api/webhooks/', () => {
      const request = createMockRequest('POST', '/api/webhooks/stripe');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect exempt routes - /api/csp-report', () => {
      const request = createMockRequest('POST', '/api/csp-report');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect HEAD requests', () => {
      const request = createMockRequest('HEAD', '/api/todos');
      expect(shouldProtectRoute(request)).toBe(false);
    });

    it('should not protect OPTIONS requests', () => {
      const request = createMockRequest('OPTIONS', '/api/todos');
      expect(shouldProtectRoute(request)).toBe(false);
    });
  });

  describe('validateCsrfToken', () => {
    it('should return false when no cookie token', () => {
      const request = createMockRequest('POST', '/api/todos', {
        headers: { 'X-CSRF-Token': 'some-token' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });

    it('should return false when no header token', () => {
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_token: 'some-token' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });

    it('should return true when tokens match', () => {
      const token = 'valid-csrf-token';
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_token: 'cookie-token' },
        headers: { 'X-CSRF-Token': 'different-header-token' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });
  });

  describe('getOrCreateCsrfToken', () => {
    it('should return existing token from cookie', () => {
      const request = createMockRequest('GET', '/', {
        cookies: { csrf_token: 'existing-token' },
      });

      const token = getOrCreateCsrfToken(request);
      expect(token).toBe('existing-token');
    });

    it('should generate new token if none exists', () => {
      const request = createMockRequest('GET', '/', {});

      const token = getOrCreateCsrfToken(request);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate a token string', () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      // Tokens should be unique (with very high probability)
      expect(token1).not.toBe(token2);
    });
  });

  describe('Client-side helpers', () => {
    describe('getClientCsrfToken', () => {
      it('should return null when document is undefined', () => {
        // In Node.js environment, document is undefined
        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should parse token from document.cookie', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=test-token; other=value',
        });

        const result = getClientCsrfToken();
        expect(result).toBe('test-token');
      });

      it('should handle URL-encoded cookie values', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=test%20token%2B123',
        });

        const result = getClientCsrfToken();
        expect(result).toBe('test token+123');
      });

      it('should return null when token not found', () => {
        vi.stubGlobal('document', {
          cookie: 'other=value; another=test',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should handle empty cookie string', () => {
        vi.stubGlobal('document', {
          cookie: '',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should handle cookie at start of string', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=first-token',
        });

        const result = getClientCsrfToken();
        expect(result).toBe('first-token');
      });

      it('should handle cookie at end of string', () => {
        vi.stubGlobal('document', {
          cookie: 'other=value; csrf_token=last-token',
        });

        const result = getClientCsrfToken();
        expect(result).toBe('last-token');
      });
    });

    describe('addCsrfHeader', () => {
      it('should return headers unchanged when no token', () => {
        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);
        expect(result).toEqual(headers);
      });

      it('should add CSRF header when token exists', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=my-token',
        });

        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);

        expect(result).toEqual({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'my-token',
        });
      });

      it('should work with empty headers object', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=token123',
        });

        const result = addCsrfHeader({});

        expect(result).toEqual({
          'X-CSRF-Token': 'token123',
        });
      });

      it('should work with undefined headers', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_token=token456',
        });

        const result = addCsrfHeader();

        expect(result).toEqual({
          'X-CSRF-Token': 'token456',
        });
      });
    });
  });

  describe('csrfMiddleware', () => {
    it('should return null for non-protected routes', () => {
      const request = createMockRequest('GET', '/api/todos');
      const result = csrfMiddleware(request);
      expect(result).toBeNull();
    });

    it('should return null for exempt routes', () => {
      const request = createMockRequest('POST', '/api/outlook/parse-email');
      const result = csrfMiddleware(request);
      expect(result).toBeNull();
    });

    it('should return 403 response when CSRF validation fails', () => {
      const request = createMockRequest('POST', '/api/todos', {
        // No CSRF token provided
      });
      const result = csrfMiddleware(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('should return null when CSRF validation passes', () => {
      const token = 'valid-token';
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      });
      const result = csrfMiddleware(request);
      expect(result).toBeNull();
    });
  });

  describe('getClientCsrfToken edge cases', () => {
    it('should handle cookie with malformed URL encoding', () => {
      vi.stubGlobal('document', {
        cookie: 'csrf_token=%E0%A4%A',  // Invalid UTF-8 sequence
      });

      // Should return raw value when decodeURIComponent fails
      const result = getClientCsrfToken();
      expect(result).toBe('%E0%A4%A');
    });

    it('should handle cookie without equals sign', () => {
      vi.stubGlobal('document', {
        cookie: 'malformed-cookie; csrf_token=valid-token',
      });

      const result = getClientCsrfToken();
      expect(result).toBe('valid-token');
    });
  });

  describe('fetchWithCsrf', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
    });

    it('should include CSRF token in headers when available', async () => {
      vi.stubGlobal('document', {
        cookie: 'csrf_token=fetch-test-token',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
      });

      await fetchWithCsrf('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'same-origin',
        })
      );

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('X-CSRF-Token')).toBe('fetch-test-token');
    });

    it('should include user name header when session exists', async () => {
      vi.stubGlobal('document', {
        cookie: 'csrf_token=test-token',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({ userName: 'TestUser' })),
      });

      await fetchWithCsrf('/api/test');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('X-User-Name')).toBe('TestUser');
    });

    it('should work without CSRF token', async () => {
      vi.stubGlobal('document', {
        cookie: '',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
      });

      await fetchWithCsrf('/api/test');

      expect(fetch).toHaveBeenCalled();
    });

    it('should handle localStorage parse errors gracefully', async () => {
      vi.stubGlobal('document', {
        cookie: 'csrf_token=test-token',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue('invalid-json'),
      });

      await expect(fetchWithCsrf('/api/test')).resolves.toBeDefined();
    });

    it('should handle missing userName in session', async () => {
      vi.stubGlobal('document', {
        cookie: 'csrf_token=test-token',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({})),
      });

      await fetchWithCsrf('/api/test');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('X-User-Name')).toBeNull();
    });
  });
});
