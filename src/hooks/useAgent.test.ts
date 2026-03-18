import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgent } from './useAgent';

// Create mock functions
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastWarning = vi.fn();

// Mock dependencies
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    error: mockToastError,
    success: mockToastSuccess,
    warning: mockToastWarning,
  }),
}));

describe('useAgent', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty messages and not loading', () => {
      const { result } = renderHook(() => useAgent());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      });
    });

    it('should provide sendMessage and clearMessages functions', () => {
      const { result } = renderHook(() => useAgent());

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.clearMessages).toBe('function');
    });
  });

  describe('sendMessage', () => {
    it('should create user message immediately', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Hello!"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.messages.length).toBeGreaterThan(0);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Test message');
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });

    it('should not send while loading', async () => {
      const { result } = renderHook(() => useAgent());

      // Create a response that never resolves to keep isLoading=true
      let resolveResponse: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      fetchMock.mockReturnValue(pendingPromise);

      // Start first message (won't complete because fetch never resolves)
      let sendPromise: Promise<void>;
      act(() => {
        sendPromise = result.current.sendMessage('First message');
      });

      // The hook should now be loading
      expect(result.current.isLoading).toBe(true);

      // Try to send another message while first is loading
      // Need fresh reference since useCallback depends on isLoading
      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      // Should only have called fetch once (second was blocked by isLoading guard)
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Clean up by resolving the pending promise
      resolveResponse!(new Response(
        new ReadableStream({ start(controller) { controller.close(); } }),
        { status: 200 }
      ));
      await act(async () => {
        await sendPromise;
      });
    });

    it('should set loading state during request', async () => {
      const { result } = renderHook(() => useAgent());

      let resolveResponse: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      fetchMock.mockReturnValue(pendingPromise);

      let sendPromise: Promise<void>;
      act(() => {
        sendPromise = result.current.sendMessage('Test');
      });

      // Should be loading while request is pending
      expect(result.current.isLoading).toBe(true);

      // Resolve the response
      resolveResponse!(new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Response"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      ));

      await act(async () => {
        await sendPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('JSON response handling', () => {
    it('should handle JSON response and set assistant message', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Hello world!',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Hi');
      });

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toBe('Hello world!');
    });

    // Tool calls and streaming features removed in current implementation
    // Skip these tests until streaming is re-implemented
    it.skip('should parse tool call chunks', async () => {
      // TODO: Re-implement when streaming support is added back
    });

    it.skip('should update existing tool call when receiving updates', async () => {
      // TODO: Re-implement when streaming support is added back
    });

    it('should update usage when response includes token counts', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Done',
            estimatedInputTokens: 100,
            estimatedOutputTokens: 50,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.usage.inputTokens).toBe(100);
      expect(result.current.usage.outputTokens).toBe(50);
    });

    it('should handle JSON parse errors gracefully', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response('Invalid JSON', { status: 200 })
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Should show error message
      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toContain('error');
    });
  });

  describe('error handling', () => {
    it('should show error toast on HTTP error', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'Server error' }),
          { status: 500, statusText: 'Internal Server Error' }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockToastError).toHaveBeenCalledWith('Server error');
    });

    it('should show error toast on network error', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockToastError).toHaveBeenCalledWith('Network error');
    });

    it('should show error message in assistant response on error', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toBe(
        'Sorry, I encountered an error processing your request.'
      );
    });

    it('should handle API error responses', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: 'API error message' }),
          { status: 200 }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockToastError).toHaveBeenCalledWith('API error message');
    });

    it('should stop loading on error', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('should reset messages to empty array', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: 'Response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('should reset usage to zero', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Response',
            estimatedInputTokens: 100,
            estimatedOutputTokens: 50,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.usage.inputTokens).toBe(100);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      });
    });
  });

  describe('message structure', () => {
    it('should create messages with correct structure', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: 'Hi' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      const userMessage = result.current.messages[0];
      expect(userMessage).toHaveProperty('id');
      expect(userMessage).toHaveProperty('conversationId');
      expect(userMessage).toHaveProperty('role');
      expect(userMessage).toHaveProperty('content');
      expect(userMessage).toHaveProperty('createdAt');
      expect(userMessage).toHaveProperty('timestamp');
      expect(userMessage).toHaveProperty('toolCalls');
    });

    it('should set conversationId to "local" for frontend-only messages', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: 'Response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages[0].conversationId).toBe('local');
    });

    it('should initialize toolCalls as null', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: 'Response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages[0].toolCalls).toBeNull();
    });
  });

  describe('API request', () => {
    it('should send POST request to /api/ai/agent with messages array', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: 'Response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/agent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('messages'),
        })
      );

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.messages).toEqual([
        { role: 'user', content: 'Test message' }
      ]);
    });
  });
});
