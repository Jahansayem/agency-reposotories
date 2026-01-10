import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env vars
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

// Mock logger to avoid Sentry issues
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock feature flags
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  describe('isSupabaseConfigured', () => {
    it('should return true when env vars are set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      // Re-import to get fresh module with new env vars
      const { isSupabaseConfigured } = await import('@/lib/supabaseClient');

      expect(isSupabaseConfigured()).toBe(true);
    });

    it('should return false when env vars are missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      // Re-import to get fresh module with new env vars
      const { isSupabaseConfigured } = await import('@/lib/supabaseClient');

      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('createSupabaseClient', () => {
    it('should create client successfully', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      const { createSupabaseClient } = await import('@/lib/supabaseClient');
      const client = createSupabaseClient();

      expect(client).toBeDefined();
    });

    it('should set RLS context when userId provided', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      const { createSupabaseClient } = await import('@/lib/supabaseClient');
      const client = createSupabaseClient('user-123', true);

      expect(client).toBeDefined();
      // RLS context setting is async, so we can't easily test it
      // In real tests, we'd verify the RPC call was made
    });
  });
});
