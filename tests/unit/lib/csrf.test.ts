/**
 * CSRF Protection Unit Tests
 *
 * Tests for CSRF token generation, validation, and client-side helpers
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
  __resetCsrfClientCacheForTests,
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
  } as any;
}

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCsrfClientCacheForTests();
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
        cookies: { csrf_secret: 'some-secret', csrf_nonce: 'some-nonce' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });

    it('should return true when tokens match', () => {
      const secret = 'test-secret';
      const nonce = 'test-nonce';
      const signature = createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
      const headerToken = `${nonce}:${signature}`;
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_secret: secret, csrf_nonce: nonce },
        headers: { 'X-CSRF-Token': headerToken },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_secret: 'secret', csrf_nonce: 'nonce' },
        headers: { 'X-CSRF-Token': 'nonce:different-signature' },
      });

      const result = validateCsrfToken(request);
      expect(result).toBe(false);
    });
  });

  describe('getOrCreateCsrfToken', () => {
    it('should return existing token from cookie', () => {
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

      it('should return null when no cached token exists', () => {
        vi.stubGlobal('document', {
          cookie: 'csrf_nonce=test-nonce; other=value',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
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
          cookie: 'csrf_nonce=first-nonce',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });

      it('should handle cookie at end of string', () => {
        vi.stubGlobal('document', {
          cookie: 'other=value; csrf_nonce=last-nonce',
        });

        const result = getClientCsrfToken();
        expect(result).toBeNull();
      });
    });

    describe('addCsrfHeader', () => {
      it('should return headers unchanged when no token', () => {
        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);
        expect(result).toEqual(headers);
      });

      it('should add CSRF header when token exists', async () => {
        const nonce = 'test-nonce';
        const token = `${nonce}:test-signature`;
        vi.stubGlobal('document', {
          cookie: `csrf_nonce=${nonce}`,
        });
        vi.stubGlobal('localStorage', {
          getItem: vi.fn().mockReturnValue(null),
        });
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
          if (url === '/api/csrf') {
            return new Response(JSON.stringify({ token }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response();
        }));

        await fetchWithCsrf('/api/test');

        const headers = { 'Content-Type': 'application/json' };
        const result = addCsrfHeader(headers);

        expect(result).toEqual({
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        });
      });

      it('should work with empty headers object', async () => {
        const nonce = 'test-nonce';
        const token = `${nonce}:test-signature`;
        vi.stubGlobal('document', { cookie: `csrf_nonce=${nonce}` });
        vi.stubGlobal('localStorage', {
          getItem: vi.fn().mockReturnValue(null),
        });
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
          if (url === '/api/csrf') {
            return new Response(JSON.stringify({ token }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response();
        }));

        await fetchWithCsrf('/api/test');

        const result = addCsrfHeader({});

        expect(result).toEqual({
          'X-CSRF-Token': token,
        });
      });

      it('should work with undefined headers', async () => {
        const nonce = 'test-nonce';
        const token = `${nonce}:test-signature`;
        vi.stubGlobal('document', { cookie: `csrf_nonce=${nonce}` });
        vi.stubGlobal('localStorage', {
          getItem: vi.fn().mockReturnValue(null),
        });
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
          if (url === '/api/csrf') {
            return new Response(JSON.stringify({ token }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response();
        }));

        await fetchWithCsrf('/api/test');

        const result = addCsrfHeader();

        expect(result).toEqual({
          'X-CSRF-Token': token,
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
      const secret = 'test-secret';
      const nonce = 'test-nonce';
      const signature = createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
      const token = `${nonce}:${signature}`;
      const request = createMockRequest('POST', '/api/todos', {
        cookies: { csrf_secret: secret, csrf_nonce: nonce },
        headers: { 'X-CSRF-Token': token },
      });
      const result = csrfMiddleware(request);
      expect(result).toBeNull();
    });
  });

  describe('fetchWithCsrf', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    it('should include CSRF token in headers when available', async () => {
      const nonce = 'fetch-nonce';
      const token = `${nonce}:fetch-test-signature`;
      vi.stubGlobal('document', {
        cookie: `csrf_nonce=${nonce}`,
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
      });
      vi.mocked(fetch).mockImplementation(async (url: string) => {
        if (url === '/api/csrf') {
          return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response();
      });

      await fetchWithCsrf('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'same-origin',
        })
      );

      const requestArgs = vi.mocked(fetch).mock.calls.find((c) => c[0] === '/api/test');
      expect(requestArgs).toBeDefined();
      const requestHeaders = requestArgs?.[1]?.headers as Headers;
      expect(requestHeaders.get('X-CSRF-Token')).toBe(token);
    });

    it('should include user name header when session exists', async () => {
      const nonce = 'test-nonce';
      const token = `${nonce}:test-signature`;
      vi.stubGlobal('document', {
        cookie: `csrf_nonce=${nonce}`,
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({ userName: 'TestUser' })),
      });
      vi.mocked(fetch).mockImplementation(async (url: string) => {
        if (url === '/api/csrf') {
          return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response();
      });

      await fetchWithCsrf('/api/test');

      const requestArgs = vi.mocked(fetch).mock.calls.find((c) => c[0] === '/api/test');
      const headers = requestArgs?.[1]?.headers as Headers;
      expect(headers.get('X-User-Name')).toBe('TestUser');
    });

    it('should work without CSRF token', async () => {
      vi.stubGlobal('document', {
        cookie: '',
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
      });
      vi.mocked(fetch).mockResolvedValue(new Response());

      await fetchWithCsrf('/api/test');

      expect(fetch).toHaveBeenCalled();
    });

    it('should handle localStorage parse errors gracefully', async () => {
      const nonce = 'test-nonce';
      const token = `${nonce}:test-signature`;
      vi.stubGlobal('document', {
        cookie: `csrf_nonce=${nonce}`,
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue('invalid-json'),
      });
      vi.mocked(fetch).mockImplementation(async (url: string) => {
        if (url === '/api/csrf') {
          return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response();
      });

      await expect(fetchWithCsrf('/api/test')).resolves.toBeDefined();
    });

    it('should handle missing userName in session', async () => {
      const nonce = 'test-nonce';
      const token = `${nonce}:test-signature`;
      vi.stubGlobal('document', {
        cookie: `csrf_nonce=${nonce}`,
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({})),
      });
      vi.mocked(fetch).mockImplementation(async (url: string) => {
        if (url === '/api/csrf') {
          return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response();
      });

      await fetchWithCsrf('/api/test');

      const requestArgs = vi.mocked(fetch).mock.calls.find((c) => c[0] === '/api/test');
      const headers = requestArgs?.[1]?.headers as Headers;
      expect(headers.get('X-User-Name')).toBeNull();
    });

    it('should handle malformed cookie entries when reading nonce', async () => {
      const nonce = 'test-nonce';
      const token = `${nonce}:test-signature`;
      vi.stubGlobal('document', {
        cookie: `malformed-cookie; csrf_nonce=${nonce}`,
      });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
      });
      vi.mocked(fetch).mockImplementation(async (url: string) => {
        if (url === '/api/csrf') {
          return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response();
      });

      await fetchWithCsrf('/api/test');
      const requestArgs = vi.mocked(fetch).mock.calls.find((c) => c[0] === '/api/test');
      const headers = requestArgs?.[1]?.headers as Headers;
      expect(headers.get('X-CSRF-Token')).toBe(token);
    });
  });
});
