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

  describe('streaming response parsing', () => {
    it('should parse content chunks and append to assistant message', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Hello "}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"content":"world!"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Hi');
      });

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toBe('Hello world!');
    });

    it('should parse tool call chunks', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"toolCall":{"id":"tool-1","name":"search_tasks","status":"running"}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"toolCall":{"id":"tool-1","status":"success","result":{"count":5}}}\n\n'
              )
            );
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Search tasks');
      });

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.toolCalls).toHaveLength(1);
      expect(assistantMessage?.toolCalls?.[0].name).toBe('search_tasks');
      expect(assistantMessage?.toolCalls?.[0].status).toBe('success');
      expect(assistantMessage?.toolCalls?.[0].result).toEqual({ count: 5 });
    });

    it('should update existing tool call when receiving updates', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"toolCall":{"id":"tool-1","name":"search_tasks","status":"running"}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"toolCall":{"id":"tool-1","status":"success","result":[]}}\n\n'
              )
            );
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Search');
      });

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.toolCalls).toHaveLength(1);
      expect(assistantMessage?.toolCalls?.[0].id).toBe('tool-1');
      expect(assistantMessage?.toolCalls?.[0].status).toBe('success');
    });

    it('should parse usage updates', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Done"}\n\n'));
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"usage":{"inputTokens":100,"outputTokens":50,"totalCost":0.005}}\n\n'
              )
            );
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalCost: 0.005,
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {invalid json}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"content":"Valid"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Should skip invalid chunk and process valid one
      const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toBe('Valid');
    });
  });

  describe('error handling', () => {
    it('should show error toast on HTTP error', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(
        new Response(null, { status: 500, statusText: 'Internal Server Error' })
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockToastError).toHaveBeenCalledWith('HTTP 500: Internal Server Error');
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

    it('should handle missing response body', async () => {
      const { result } = renderHook(() => useAgent());

      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockToastError).toHaveBeenCalledWith('No response body');
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

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Response"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

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

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"usage":{"inputTokens":100,"outputTokens":50,"totalCost":0.01}}\n\n'
              )
            );
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

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

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"content":"Hi"}\n\n'));
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

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

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages[0].conversationId).toBe('local');
    });

    it('should initialize toolCalls as null', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages[0].toolCalls).toBeNull();
    });
  });

  describe('API request', () => {
    it('should send POST request to /api/ai/agent with messages array', async () => {
      const { result } = renderHook(() => useAgent());

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 }
      );

      fetchMock.mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/agent',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] }),
        })
      );
    });
  });
});
