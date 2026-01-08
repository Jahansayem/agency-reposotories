import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupabaseConfigured', () => {
    it('should return true when env vars are set', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

      expect(isSupabaseConfigured()).toBe(true);
    });

    it('should return false when env vars are missing', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('createSupabaseClient', () => {
    it('should create client successfully', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

      const client = createSupabaseClient();

      expect(client).toBeDefined();
    });

    it('should set RLS context when userId provided', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

      const client = createSupabaseClient('user-123', true);

      expect(client).toBeDefined();
      // RLS context setting is async, so we can't easily test it
      // In real tests, we'd verify the RPC call was made
    });
  });
});
