import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/aiApiHelper', () => ({
  callClaude: vi.fn(),
}));

vi.mock('@/lib/agent/context', () => ({
  getAgencyContext: vi.fn(() => 'System prompt'),
}));

vi.mock('@/lib/agent/modelRouter', () => ({
  selectModel: vi.fn(() => 'claude-3-5-sonnet-20241022'),
  getModelDisplayName: vi.fn(() => 'Claude 3.5 Sonnet'),
}));

vi.mock('@/lib/agent/usage', () => ({
  trackTokenUsage: vi.fn(),
  checkTokenBudget: vi.fn(),
}));

// Mock agencyAuth wrapper
vi.mock('@/lib/agencyAuth', () => ({
  withAgencyAuth: (handler: any) => handler,
}));

describe('POST /api/ai/agent', () => {
  const mockContext = {
    agencyId: 'agency-1',
    userId: 'user-1',
    userName: 'Test User',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock implementations
    const { checkTokenBudget } = await import('@/lib/agent/usage');
    (checkTokenBudget as any).mockResolvedValue({
      isBlocked: false,
      isWarning: false,
      used: 50000,
      budget: 100000,
      percentUsed: 0.5,
    });

    const { callClaude } = await import('@/lib/aiApiHelper');
    (callClaude as any).mockResolvedValue({
      success: true,
      content: 'AI response',
    });
  });

  describe('request validation', () => {
    it('should reject request without messages', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages array is required');
    });

    it('should reject request with empty messages array', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages array is required');
    });

    it('should reject request with non-array messages', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({ messages: 'invalid' }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages array is required');
    });

    it('should reject request where last message is not from user', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi' },
          ],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Last message must be from user');
    });
  });

  describe('budget enforcement', () => {
    it('should block request when budget exceeded', async () => {
      const { checkTokenBudget } = await import('@/lib/agent/usage');
      (checkTokenBudget as any).mockResolvedValue({
        isBlocked: true,
        isWarning: true,
        used: 110000,
        budget: 100000,
        percentUsed: 1.1,
      });

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Monthly token budget exceeded');
      expect(data.budget.used).toBe(110000);
      expect(data.budget.limit).toBe(100000);
    });

    it('should allow request when budget not exceeded', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(200);
    });

    it('should log warning when budget at warning threshold', async () => {
      const { checkTokenBudget } = await import('@/lib/agent/usage');
      (checkTokenBudget as any).mockResolvedValue({
        isBlocked: false,
        isWarning: true,
        used: 85000,
        budget: 100000,
        percentUsed: 0.85,
      });

      const { logger } = await import('@/lib/logger');

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      await POST(request, mockContext);

      expect(logger.info).toHaveBeenCalledWith(
        'AI agent request',
        expect.objectContaining({
          budgetWarning: true,
          budgetPercentUsed: 85,
        })
      );
    });
  });

  describe('successful request', () => {
    it('should return AI response', async () => {
      const { callClaude } = await import('@/lib/aiApiHelper');
      (callClaude as any).mockResolvedValue({
        success: true,
        content: 'This is the AI response',
      });

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('This is the AI response');
    });

    it('should include model name in response', async () => {
      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.model).toBe('Claude 3.5 Sonnet');
    });

    it('should include budget status in response', async () => {
      const { checkTokenBudget } = await import('@/lib/agent/usage');
      (checkTokenBudget as any).mockResolvedValue({
        isBlocked: false,
        isWarning: true,
        used: 85000,
        budget: 100000,
        percentUsed: 0.85,
      });

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.budgetStatus).toEqual({
        percentUsed: 85,
        isWarning: true,
      });
    });

    it('should call trackTokenUsage', async () => {
      const { trackTokenUsage } = await import('@/lib/agent/usage');

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test message' }],
        }),
      });

      await POST(request, mockContext);

      expect(trackTokenUsage).toHaveBeenCalledWith(
        'agency-1',
        'user-1',
        expect.any(Number), // estimatedInputTokens
        expect.any(Number), // estimatedOutputTokens
        'Claude 3.5 Sonnet'
      );
    });

    it('should call selectModel with messages', async () => {
      const { selectModel } = await import('@/lib/agent/modelRouter');

      const messages = [{ role: 'user' as const, content: 'Test' }];

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      await POST(request, mockContext);

      expect(selectModel).toHaveBeenCalledWith(messages);
    });

    it('should build conversation context from message history', async () => {
      const { callClaude } = await import('@/lib/aiApiHelper');

      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      await POST(request, mockContext);

      expect(callClaude).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: 'Second message',
          component: 'ai-agent',
        })
      );
    });
  });

  describe('AI API error handling', () => {
    it('should handle AI API failure', async () => {
      const { callClaude } = await import('@/lib/aiApiHelper');
      (callClaude as any).mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI request failed');
      expect(data.message).toBe('API error');
    });

    it('should handle unexpected errors', async () => {
      const { callClaude } = await import('@/lib/aiApiHelper');
      (callClaude as any).mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI agent request failed');
      expect(data.message).toBe('Unexpected error');
    });

    it('should log errors', async () => {
      const { callClaude } = await import('@/lib/aiApiHelper');
      const { logger } = await import('@/lib/logger');
      (callClaude as any).mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      await POST(request, mockContext);

      expect(logger.error).toHaveBeenCalledWith(
        'AI agent error',
        expect.any(Error),
        expect.objectContaining({
          component: 'ai-agent',
          agencyId: 'agency-1',
          userId: 'user-1',
        })
      );
    });
  });

  describe('viewContext parameter', () => {
    it('should pass viewContext to getAgencyContext', async () => {
      const { getAgencyContext } = await import('@/lib/agent/context');

      const viewContext = {
        view: 'tasks',
        filters: { status: 'todo' },
      };

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
          viewContext,
        }),
      });

      await POST(request, mockContext);

      expect(getAgencyContext).toHaveBeenCalledWith(mockContext, viewContext);
    });

    it('should work without viewContext', async () => {
      const { getAgencyContext } = await import('@/lib/agent/context');

      const request = new NextRequest('http://localhost/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      await POST(request, mockContext);

      expect(getAgencyContext).toHaveBeenCalledWith(mockContext, undefined);
    });
  });
});
