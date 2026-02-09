/**
 * Test setup for API route tests
 *
 * Unlike the main setup.ts (which uses jsdom and @testing-library),
 * API route tests run in Node environment and only need minimal setup.
 */

import { vi } from 'vitest';

// Suppress console output during tests to reduce noise
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  // Keep log and info for debugging when needed
  log: console.log,
  info: console.info,
};

// Set environment variables needed by API routes
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.FIELD_ENCRYPTION_KEY = 'test-encryption-key-32-chars-ok!';
process.env.NODE_ENV = 'test';
