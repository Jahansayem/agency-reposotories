/**
 * Auth Library Unit Tests
 *
 * Tests for PIN-based authentication utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock crypto.subtle for Node.js environment
const mockDigest = vi.fn();
vi.stubGlobal('crypto', {
  subtle: {
    digest: mockDigest,
  },
});

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

// Import after mocking
import {
  hashPin,
  verifyPin,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  getLockoutState,
  incrementLockout,
  clearLockout,
  isLockedOut,
  getRandomUserColor,
  getUserInitials,
  isValidPin,
  type AuthUser,
} from '@/lib/auth';

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.store = {};

    // Setup mock for crypto.subtle.digest
    mockDigest.mockImplementation(async (_algorithm: string, data: ArrayBuffer) => {
      // Simple mock hash - just return a predictable buffer based on input
      const input = new Uint8Array(data);
      const hash = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        hash[i] = (input[i % input.length] + i) % 256;
      }
      return hash.buffer;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPin', () => {
    it('should hash a PIN using SHA-256', async () => {
      const hash = await hashPin('1234');

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 32 bytes = 64 hex chars
    });

    it('should produce consistent hashes for same input', async () => {
      const hash1 = await hashPin('1234');
      const hash2 = await hashPin('1234');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      // Override mock to actually differentiate inputs
      mockDigest.mockImplementation(async (_algorithm: string, data: ArrayBuffer) => {
        const input = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          hash[i] = (input[0] + i) % 256; // Use first byte as differentiator
        }
        return hash.buffer;
      });

      const hash1 = await hashPin('1234');
      const hash2 = await hashPin('5678');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPin', () => {
    it('should return true for matching PIN and hash', async () => {
      const hash = await hashPin('1234');
      const result = await verifyPin('1234', hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching PIN', async () => {
      // Override mock to differentiate inputs
      mockDigest.mockImplementation(async (_algorithm: string, data: ArrayBuffer) => {
        const input = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          hash[i] = (input[0] + i) % 256;
        }
        return hash.buffer;
      });

      const hash = await hashPin('1234');
      const result = await verifyPin('5678', hash);

      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    describe('getStoredSession', () => {
      it('should return null when no session exists', () => {
        const session = getStoredSession();
        expect(session).toBeNull();
      });

      it('should return stored session when it exists', () => {
        const mockSession = {
          userId: 'user-123',
          userName: 'TestUser',
          loginAt: '2025-01-15T10:00:00Z',
        };
        mockLocalStorage.store['todoSession'] = JSON.stringify(mockSession);

        const session = getStoredSession();
        expect(session).toEqual(mockSession);
      });

      it('should return null for invalid JSON', () => {
        mockLocalStorage.store['todoSession'] = 'invalid-json';

        const session = getStoredSession();
        expect(session).toBeNull();
      });
    });

    describe('setStoredSession', () => {
      it('should store user session in localStorage', () => {
        const user: AuthUser = {
          id: 'user-123',
          name: 'TestUser',
          color: '#0033A0',
          role: 'staff',
          created_at: new Date().toISOString(),
        };

        setStoredSession(user);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'todoSession',
          expect.stringContaining('user-123')
        );

        const stored = JSON.parse(mockLocalStorage.store['todoSession']);
        expect(stored.userId).toBe('user-123');
        expect(stored.userName).toBe('TestUser');
        expect(stored.loginAt).toBeDefined();
      });
    });

    describe('clearStoredSession', () => {
      it('should remove session and legacy keys', () => {
        mockLocalStorage.store['todoSession'] = 'session';
        mockLocalStorage.store['todoUserName'] = 'legacy1';
        mockLocalStorage.store['userName'] = 'legacy2';

        clearStoredSession();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('todoSession');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('todoUserName');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('userName');
      });
    });
  });

  describe('Lockout Management', () => {
    describe('getLockoutState', () => {
      it('should return default state when no lockout exists', () => {
        const state = getLockoutState('user-123');
        expect(state).toEqual({ attempts: 0 });
      });

      it('should return stored lockout state', () => {
        const mockState = { attempts: 2, lockedUntil: '2025-01-15T10:01:00Z' };
        mockLocalStorage.store['authLockout_user-123'] = JSON.stringify(mockState);

        const state = getLockoutState('user-123');
        expect(state).toEqual(mockState);
      });

      it('should return default state for invalid JSON', () => {
        mockLocalStorage.store['authLockout_user-123'] = 'invalid';

        const state = getLockoutState('user-123');
        expect(state).toEqual({ attempts: 0 });
      });
    });

    describe('incrementLockout', () => {
      it('should increment attempt counter', () => {
        const state = incrementLockout('user-123');
        expect(state.attempts).toBe(1);
      });

      it('should lock after 3 failed attempts', () => {
        incrementLockout('user-123');
        incrementLockout('user-123');
        const state = incrementLockout('user-123');

        expect(state.attempts).toBe(3);
        expect(state.lockedUntil).toBeDefined();
      });

      it('should set lockout duration to ~30 seconds', () => {
        incrementLockout('user-123');
        incrementLockout('user-123');
        const state = incrementLockout('user-123');

        const lockUntil = new Date(state.lockedUntil!);
        const now = new Date();
        const diffSeconds = (lockUntil.getTime() - now.getTime()) / 1000;

        expect(diffSeconds).toBeGreaterThan(28);
        expect(diffSeconds).toBeLessThanOrEqual(31);
      });
    });

    describe('clearLockout', () => {
      it('should remove lockout state', () => {
        mockLocalStorage.store['authLockout_user-123'] = JSON.stringify({ attempts: 3 });

        clearLockout('user-123');

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authLockout_user-123');
      });
    });

    describe('isLockedOut', () => {
      it('should return not locked when no lockout exists', () => {
        const result = isLockedOut('user-123');
        expect(result).toEqual({ locked: false, remainingSeconds: 0 });
      });

      it('should return locked with remaining time when locked', () => {
        const futureTime = new Date();
        futureTime.setSeconds(futureTime.getSeconds() + 15);
        mockLocalStorage.store['authLockout_user-123'] = JSON.stringify({
          attempts: 3,
          lockedUntil: futureTime.toISOString(),
        });

        const result = isLockedOut('user-123');
        expect(result.locked).toBe(true);
        expect(result.remainingSeconds).toBeGreaterThan(10);
        expect(result.remainingSeconds).toBeLessThanOrEqual(16);
      });

      it('should clear lockout and return not locked when lockout expired', () => {
        const pastTime = new Date();
        pastTime.setSeconds(pastTime.getSeconds() - 10);
        mockLocalStorage.store['authLockout_user-123'] = JSON.stringify({
          attempts: 3,
          lockedUntil: pastTime.toISOString(),
        });

        const result = isLockedOut('user-123');
        expect(result).toEqual({ locked: false, remainingSeconds: 0 });
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authLockout_user-123');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getRandomUserColor', () => {
      it('should return a valid hex color', () => {
        const color = getRandomUserColor();
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should return one of the predefined colors', () => {
        const validColors = [
          '#0033A0', '#059669', '#7c3aed', '#dc2626',
          '#ea580c', '#0891b2', '#be185d', '#4f46e5',
        ];

        // Run multiple times to increase coverage
        for (let i = 0; i < 20; i++) {
          const color = getRandomUserColor();
          expect(validColors).toContain(color);
        }
      });
    });

    describe('getUserInitials', () => {
      it('should return first two letters for single name', () => {
        expect(getUserInitials('Derrick')).toBe('DE');
      });

      it('should return first and last initials for full name', () => {
        expect(getUserInitials('John Smith')).toBe('JS');
      });

      it('should handle multiple names', () => {
        expect(getUserInitials('John Michael Smith')).toBe('JS');
      });

      it('should handle extra whitespace', () => {
        expect(getUserInitials('  John   Smith  ')).toBe('JS');
      });

      it('should return uppercase', () => {
        expect(getUserInitials('john smith')).toBe('JS');
      });
    });

    describe('isValidPin', () => {
      it('should return true for valid 4-digit PIN', () => {
        expect(isValidPin('1234')).toBe(true);
        expect(isValidPin('0000')).toBe(true);
        expect(isValidPin('9999')).toBe(true);
      });

      it('should return false for non-4-digit strings', () => {
        expect(isValidPin('123')).toBe(false);
        expect(isValidPin('12345')).toBe(false);
        expect(isValidPin('')).toBe(false);
      });

      it('should return false for non-numeric characters', () => {
        expect(isValidPin('abcd')).toBe(false);
        expect(isValidPin('12a4')).toBe(false);
        expect(isValidPin('12-4')).toBe(false);
      });
    });
  });
});
