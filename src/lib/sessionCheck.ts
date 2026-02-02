/**
 * Client-side Session Validation Helper
 *
 * Provides utilities to check if the user has a valid session cookie
 * before making API calls.
 */

/**
 * Check if session cookie exists (client-side)
 * Returns true if the session_token cookie is present
 */
export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith('session_token=')) {
      return true;
    }
  }
  return false;
}

/**
 * Get user session from localStorage (legacy)
 */
export function getLegacySession(): { userId: string; userName: string } | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const session = localStorage.getItem('todoSession');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.userId && parsed.userName) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Check if user needs to log in again
 * Returns true if user has a legacy session but no session cookie
 */
export function needsRelogin(): boolean {
  const hasLegacy = getLegacySession() !== null;
  const hasCookie = hasSessionCookie();

  // If user has localStorage session but no cookie, they need to log in again
  return hasLegacy && !hasCookie;
}

/**
 * Prompt user to log in again if session is invalid
 */
export function promptReloginIfNeeded(): boolean {
  if (needsRelogin()) {
    alert('Your session has expired. Please log in again to continue.');
    // Clear legacy session
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('todoSession');
    }
    // Reload page to show login screen
    window.location.reload();
    return true;
  }
  return false;
}
