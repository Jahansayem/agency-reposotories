import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/aiApiHelper', () => ({
  callClaude: vi.fn(),
  aiSuccessResponse: (data: object) => Response.json({ success: true, ...data }),
  aiErrorResponse: (msg: string, status = 500) => Response.json({ success: false, error: msg }, { status }),
  validateAiRequest: vi.fn(),
  withAiErrorHandling: (_name: string, handler: Function) => handler,
  withSessionAuth: (handler: Function) => handler,
}));

import { callClaude, validateAiRequest } from '@/lib/aiApiHelper';

describe('opportunity-coaching', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns coaching text when Claude succeeds', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: {
        taskText: 'Call Janis about her claim',
        customerName: 'Janis Urich',
        recommendedProduct: 'Home Insurance',
        currentProducts: 'Auto',
        tenureYears: 9,
        currentPremium: 890,
        potentialPremiumAdd: 340,
        talkingPoint1: 'Long-term customer qualifies for bundle discount',
        talkingPoint2: 'Bundling saves average 15%',
      },
    });
    vi.mocked(callClaude).mockResolvedValue({
      success: true,
      content: 'You are calling about her claim. Once resolved, mention the bundle opportunity.',
    });

    const { POST } = await import('@/app/api/ai/opportunity-coaching/route');
    const req = new Request('http://localhost/api/ai/opportunity-coaching', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'Call Janis about her claim', customerName: 'Janis Urich', recommendedProduct: 'Home Insurance', currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, potentialPremiumAdd: 340, talkingPoint1: 'Long-term customer', talkingPoint2: 'Bundling saves 15%' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.coaching).toBeTruthy();
    expect(typeof json.coaching).toBe('string');
  });

  it('returns error when Claude fails', async () => {
    vi.mocked(validateAiRequest).mockResolvedValue({
      valid: true,
      body: { taskText: 'test', customerName: 'Test', recommendedProduct: 'Home', currentProducts: 'Auto', tenureYears: 1, currentPremium: 500, potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2' },
    });
    vi.mocked(callClaude).mockResolvedValue({ success: false, error: 'rate limited' });

    const { POST } = await import('@/app/api/ai/opportunity-coaching/route');
    const req = new Request('http://localhost/api/ai/opportunity-coaching', {
      method: 'POST',
      body: JSON.stringify({ taskText: 'test', customerName: 'Test', recommendedProduct: 'Home', currentProducts: 'Auto', tenureYears: 1, currentPremium: 500, potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2' }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(false);
  });
});
