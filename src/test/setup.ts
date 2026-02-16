import { expect, afterEach, vi } from 'vitest';

// Only import jsdom-dependent modules when running in a browser-like environment
// API route tests run in 'node' environment and don't need these
const isNodeEnv = typeof window === 'undefined' &&
  typeof document === 'undefined';

if (!isNodeEnv) {
  // Dynamic imports to avoid failing in Node environment
  const { cleanup } = await import('@testing-library/react');
  const matchers = await import('@testing-library/jest-dom/matchers');

  expect.extend(matchers);

  afterEach(() => {
    cleanup();
  });
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: [], error: null })),
      update: vi.fn(() => ({ data: [], error: null })),
      delete: vi.fn(() => ({ data: [], error: null })),
    })),
    auth: {
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
  },
}));

global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
