import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { AUTH_CONFIG } from '@/lib/featureFlags';

interface DualAuthResult {
  authenticated: boolean;
  authMethod: 'clerk' | 'pin' | 'none';
  userId?: string;
  userName?: string;
  clerkUserId?: string;
  error?: string;
}

/**
 * Validate authentication using either Clerk or PIN session
 *
 * Supports dual-auth mode where both authentication methods are valid.
 * Checks Clerk first (if enabled), then falls back to PIN session.
 */
export async function validateDualAuth(request: NextRequest): Promise<DualAuthResult> {
  // Try Clerk authentication first (if enabled)
  if (AUTH_CONFIG.clerkEnabled) {
    try {
      const { userId: clerkUserId } = await auth();

      if (clerkUserId) {
        // User is authenticated via Clerk
        const user = await currentUser();

        return {
          authenticated: true,
          authMethod: 'clerk',
          clerkUserId,
          // Use email or first name as userName for compatibility
          userName: user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User',
          userId: clerkUserId,
        };
      }
    } catch {
      // Clerk auth failed, will try PIN auth below
      console.log('[DualAuth] Clerk auth not available, trying PIN auth');
    }
  }

  // Try PIN session authentication
  if (AUTH_CONFIG.pinEnabled) {
    // Check for session token in various locations
    let sessionToken = request.cookies.get('session_token')?.value || null;

    if (!sessionToken) {
      sessionToken = request.headers.get('X-Session-Token');
    }

    if (!sessionToken) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      sessionToken = request.cookies.get('session')?.value || null;
    }

    if (sessionToken) {
      // Session token exists - the actual validation happens in sessionValidator
      // Here we just confirm a token is present
      return {
        authenticated: true,
        authMethod: 'pin',
        // Actual user details come from sessionValidator in the API route
      };
    }
  }

  // No valid authentication found
  return {
    authenticated: false,
    authMethod: 'none',
    error: 'No valid authentication found. Please log in.',
  };
}

/**
 * Get the current authenticated user from Clerk
 * Returns null if Clerk is not enabled or user is not authenticated
 */
export async function getClerkUser() {
  if (!AUTH_CONFIG.clerkEnabled) {
    return null;
  }

  try {
    const user = await currentUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if the request has a valid Clerk session
 */
export async function hasClerkSession(): Promise<boolean> {
  if (!AUTH_CONFIG.clerkEnabled) {
    return false;
  }

  try {
    const { userId } = await auth();
    return !!userId;
  } catch {
    return false;
  }
}

/**
 * Hook to use in client components for checking auth status
 */
export function useAuthMode() {
  return {
    clerkEnabled: AUTH_CONFIG.clerkEnabled,
    pinEnabled: AUTH_CONFIG.pinEnabled,
    isDualAuth: AUTH_CONFIG.isDualAuthMode,
  };
}
