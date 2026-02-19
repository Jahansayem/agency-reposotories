import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock aiApiHelper
vi.mock('@/lib/aiApiHelper', () => ({
  callClaude: vi.fn(),
  parseAiJsonResponse: vi.fn(),
  aiSuccessResponse: (data: object) => Response.json({ success: true, ...data }),
  aiErrorResponse: (msg: string, status = 500) => Response.json({ success: false, error: msg }, { status }),
  validateAiRequest: vi.fn(),
  withAiErrorHandling: (_name: string, handler: Function) => handler,
  withSessionAuth: (handler: Function) => handler,
}));

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { callClaude, parseAiJsonResponse, validateAiRequest } from '@/lib/aiApiHelper';

describe('match-customer-opportunity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts name and returns matched opportunity', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Call Janis Urich about her claim', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: '{"customer_name":"Janis Urich"}',
    });
    vi.mocked(parseAiJsonResponse).mockReturnValue({ customer_name: 'Janis Urich' });

    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Janis Urich about her claim', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(callClaude).toHaveBeenCalledOnce();
  });

  it('returns matched:false when Claude extraction returns null name', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Review documents', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: '{"customer_name":null}',
    });
    vi.mocked(parseAiJsonResponse).mockReturnValue({ customer_name: null });

    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Review documents', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.matched).toBe(false);
  });

  it('returns matched:false silently when Claude call fails', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'Call Bob Jones', agencyId: 'agency-1' },
      response: null,
    });
    vi.mocked(callClaude).mockResolvedValue({ success: false, error: 'timeout' });

    const { POST } = await import('@/app/api/ai/match-customer-opportunity/route');
    const req = new Request('http://localhost/api/ai/match-customer-opportunity', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Bob Jones', agencyId: 'agency-1' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.matched).toBe(false);
  });
});
