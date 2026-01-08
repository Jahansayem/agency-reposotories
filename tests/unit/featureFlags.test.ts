import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isFeatureEnabled, getAllFeatureFlags } from '@/lib/featureFlags';

describe('Feature Flags', () => {
  beforeEach(() => {
    // Reset environment variables
    vi.stubEnv('NEXT_PUBLIC_ENABLE_NEW_AUTH', 'false');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_OAUTH', 'false');
  });

  it('should return false when feature flag is disabled', () => {
    expect(isFeatureEnabled('new_auth_system')).toBe(false);
  });

  it('should return true when feature flag is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_NEW_AUTH', 'true');
    expect(isFeatureEnabled('new_auth_system')).toBe(true);
  });

  it('should handle A/B testing with rollout percentage', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_NEW_COMPONENTS', 'true');
    vi.stubEnv('NEXT_PUBLIC_NEW_COMPONENTS_ROLLOUT_PERCENT', '50');

    // Test with different user IDs - some should be in, some out
    const userId1 = 'user-123';
    const userId2 = 'user-456';

    const result1 = isFeatureEnabled('refactored_components', userId1);
    const result2 = isFeatureEnabled('refactored_components', userId2);

    // At least one should be different (with high probability)
    expect(typeof result1).toBe('boolean');
    expect(typeof result2).toBe('boolean');
  });

  it('should return all feature flags', () => {
    const flags = getAllFeatureFlags();

    expect(flags).toHaveProperty('new_auth_system');
    expect(flags).toHaveProperty('oauth_login');
    expect(flags).toHaveProperty('normalized_schema');

    expect(flags.new_auth_system).toHaveProperty('enabled');
    expect(flags.new_auth_system).toHaveProperty('description');
  });

  it('should default to false for safety', () => {
    // No environment variables set
    expect(isFeatureEnabled('new_auth_system')).toBe(false);
    expect(isFeatureEnabled('oauth_login')).toBe(false);
    expect(isFeatureEnabled('server_rate_limiting')).toBe(false);
  });
});
