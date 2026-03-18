/**
 * CSRF Protection Unit Tests
 *
 * Tests for CSRF token generation, validation, and client-side helpers.
 *
 * Architecture note: the CSRF system uses an HttpOnly secret cookie pattern:
 *   - csrf_secret: HttpOnly cookie (unreadable by JS)
 *   - csrf_nonce: non-HttpOnly cookie (JS reads this to build the header)
 *   - X-CSRF-Token header: "nonce:HMAC-SHA256(secret, nonce).slice(0, 32)"
 *
 * getClientCsrfToken() returns an in-memory cached token (set by the server
 * endpoint /api/csrf), NOT a value parsed directly from document.cookie.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHmac } from 'crypto';
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

// Helper: compute the valid nonce:signature token for a given secret/nonce
function buildValidToken(secret: string, nonce: string): string {
  const signature = createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
  return `${nonce}:${signature}`;
}

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
        cookies: { csrf_secret: 'some-secret' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });

    it('should return true when tokens match (HttpOnly pattern)', () => {
      // The new pattern: csrf_secret + csrf_nonce cookies, header = "nonce:HMAC(secret,nonce)[0:32]"
      const secret = 'test-secret-value';
      const nonce = 'test-nonce-value';
      const token = buildValidToken(secret, nonce);

      const request = createMockRequest('POST', '/api/todos', {
        cookies: {
          csrf_secret: secret,
          csrf_nonce: nonce,
        },
        headers: { 'X-CSRF-Token': token },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const request = createMockRequest('POST', '/api/todos', {
        cookies: {
          csrf_secret: 'secret-a',
          csrf_nonce: 'nonce-a',
        },
        headers: { 'X-CSRF-Token': 'nonce-a:bad-signature-here-00000000' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });
  });

  describe('getOrCreateCsrfToken', () => {
    it('should return existing secret from cookie', () => {
      // Production reads csrf_secret (not csrf_token)
      const request = createMockRequest('GET', '/', {
        cookies: { csrf_secret: 'existing-secret' },
      });

      const token = getOrCreateCsrfToken(request);
      expect(token).toBe('existing-secret');
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

      it('should return null when no token has been cached (document exists)', () => {
        // getClientCsrfToken() returns the in-memory cachedCsrfToken, which is
        // set by fetchCsrfTokenFromServer() after a /api/csrf call.
        // Simply having document.cookie does not populate the cache.
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=some-nonce; other=value',
        });

        const result = getClientCsrfToken();
        // No server fetch has happened, so cached token is null
        expect(result).toBeNull();
      });

      it('should return null when token not found in cache', () => {
        vi.stubGlobal('document', {
          cookie: 'other=value; another=test',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should return null when cookie string is empty', () => {
        vi.stubGlobal('document', {
          cookie: '',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should return null when no nonce cookie exists', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=first-nonce',
        });

        // Without a server-side fetch, cache is still null
        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should return null in the absence of a prior server fetch', () => {
        vi.stubGlobal('document', {
          cookie: 'other=value; csrf_nonce=last-nonce',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });
    });

    describe('addCsrfHeader', () => {
      it('should return headers unchanged when no cached token', () => {
        // No token has been cached, so no header is added
        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);
        expect(result).toEqual(headers);
      });

      it('should return headers unchanged even when nonce cookie exists (no cache)', () => {
        // addCsrfHeader uses getClientCsrfToken() which returns the in-memory
        // cache. Without a prior server fetch the cache is null, so no header.
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=my-nonce',
        });

        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);
        expect(result).toEqual(headers);
      });

      it('should return empty headers object unchanged (no cache)', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=nonce123',
        });

        const result = addCsrfHeader({});
        expect(result).toEqual({});
      });

      it('should work with undefined headers (no cache)', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=nonce456',
        });

        const result = addCsrfHeader();
        // Returns the default empty object since no token is cached
        expect(result).toEqual({});
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

    it('should return null when CSRF validation passes (HttpOnly pattern)', () => {
      // Must supply: csrf_secret cookie, csrf_nonce cookie, and valid header token
      const secret = 'valid-csrf-secret-for-test';
      const nonce = 'valid-csrf-nonce';
      const token = buildValidToken(secret, nonce);

      const request = createMockRequest('POST', '/api/todos', {
        cookies: {
          csrf_secret: secret,
          csrf_nonce: nonce,
        },
        headers: { 'X-CSRF-Token': token },
      });
      const result = csrfMiddleware(request);
      expect(result).toBeNull();
    });
  });

  describe('getClientCsrfToken edge cases', () => {
    it('should return null regardless of URL-encoded cookies (cache-based)', () => {
      // getClientCsrfToken() does not parse document.cookie; it returns
      // cachedCsrfToken. These cookie values cannot affect the result.
      vi.stubGlobal('document', {
        cookie: 'csrf_nonce=%E0%A4%A',  // Invalid UTF-8 sequence
      });

      const result = getClientCsrfToken();
      expect(result).toBeNull();
    });

    it('should return null even when nonce cookie is present (cache-based)', () => {
      vi.stubGlobal('document', {
        cookie: 'malformed-cookie; csrf_nonce=valid-nonce',
      });

      const result = getClientCsrfToken();
      expect(result).toBeNull();
    });
  });

  describe('fetchWithCsrf', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
    });

    it('should not include CSRF token in headers when no nonce cookie exists', async () => {
      // ensureCsrfToken() checks for csrf_nonce cookie; without it, returns null
      vi.stubGlobal('document', {
        cookie: '',
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
      expect(headers.get('X-CSRF-Token')).toBeNull();
    });

    it('should include user name header when session exists', async () => {
      vi.stubGlobal('document', {
        cookie: '',
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
        cookie: '',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue('invalid-json'),
      });

      await expect(fetchWithCsrf('/api/test')).resolves.toBeDefined();
    });

    it('should handle missing userName in session', async () => {
      vi.stubGlobal('document', {
        cookie: '',
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
