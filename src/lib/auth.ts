// Auth utilities for PIN-based authentication

// Re-export AuthUser from the canonical location to avoid duplicate definitions
import type { AuthUser } from '@/types/todo';
export type { AuthUser } from '@/types/todo';

// Import centralized constants
import {
  SESSION_TIMEOUTS,
  getRandomUserColor,
  getUserInitials,
  isValidPin,
} from './constants';

// Re-export utilities from constants for backward compatibility
export { getRandomUserColor, getUserInitials, isValidPin };

export interface StoredSession {
  userId: string;
  userName: string;
  loginAt: string;
}

const SESSION_KEY = 'todoSession';

// Hash PIN using SHA-256
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify PIN against hash
// Uses constant-time comparison to prevent timing attacks
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const inputHash = await hashPin(pin);
  if (inputHash.length !== hash.length) {
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

// Session management
export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session: StoredSession = JSON.parse(raw);

    // Check session expiry using centralized timeout constant
    // BUGFIX UTIL-001: Handle invalid timestamps and use >= for exact boundary
    if (session.loginAt) {
      const loginTime = new Date(session.loginAt).getTime();
      // Check for invalid timestamp (NaN)
      if (isNaN(loginTime)) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      // Use >= to ensure exact expiry time is also considered expired
      if (Date.now() - loginTime >= SESSION_TIMEOUTS.MAX_AGE) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

export function setStoredSession(user: AuthUser): void {
  const session: StoredSession = {
    userId: user.id,
    userName: user.name,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
  // Also clear legacy key
  localStorage.removeItem('todoUserName');
  localStorage.removeItem('userName');
}

// ============================================================================
// CLIENT-SIDE LOCKOUT REMOVED (Security Fix P0 #4)
// ============================================================================
// Lockout is now handled entirely server-side via serverLockout.ts (Redis)
// These functions are kept as stubs to maintain API compatibility
// but no longer perform client-side lockout logic
// ============================================================================

interface LockoutState {
  attempts: number;
  lockedUntil?: string;
}

/**
 * @deprecated Client-side lockout removed. Server handles all lockout via Redis.
 * Returns empty state for backward compatibility.
 */
export function getLockoutState(_userId: string): LockoutState {
  return { attempts: 0 };
}

/**
 * @deprecated Client-side lockout removed. Server handles all lockout via Redis.
 * Returns empty state for backward compatibility.
 */
export function incrementLockout(_userId: string): LockoutState {
  // No-op: server handles lockout via API endpoint
  return { attempts: 0 };
}

/**
 * @deprecated Client-side lockout removed. Server handles all lockout via Redis.
 * No-op for backward compatibility.
 */
export function clearLockout(_userId: string): void {
  // No-op: server handles lockout clearance
}

/**
 * @deprecated Client-side lockout removed. Server handles all lockout via Redis.
 * Always returns unlocked for backward compatibility.
 */
export function isLockedOut(_userId: string): { locked: false; remainingSeconds: 0 } {
  // Server-side lockout is checked via API response
  return { locked: false, remainingSeconds: 0 };
}

// Note: getRandomUserColor, getUserInitials, and isValidPin are now
// imported from './constants' and re-exported above for backward compatibility
