'use client'; // Enforce client-only boundary
import { AUTH_CONFIG } from '@/lib/featureFlags';

/**
 * Client-side hook to check auth mode configuration
 * Safe to use in client components (no server imports)
 *
 * Returns the current authentication configuration:
 * - clerkEnabled: Whether Clerk auth is available
 * - pinEnabled: Whether PIN auth is available
 * - isDualAuth: Whether both systems are enabled (dual-auth mode)
 */
export function useAuthMode() {
  return {
    clerkEnabled: AUTH_CONFIG.clerkEnabled,
    pinEnabled: AUTH_CONFIG.pinEnabled,
    isDualAuth: AUTH_CONFIG.isDualAuthMode,
  };
}
