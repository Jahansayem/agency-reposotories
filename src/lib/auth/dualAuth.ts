import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { AUTH_CONFIG } from '@/lib/featureFlags';
import { validateSession } from '@/lib/sessionValidator';

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
    const session = await validateSession(request);

    if (session.valid && session.userId) {
      return {
        authenticated: true,
        authMethod: 'pin',
        userId: session.userId,
        userName: session.userName,
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
