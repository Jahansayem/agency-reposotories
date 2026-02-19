'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { AgentMessage, AgentUsage, AgentToolCall, ToolStatus } from '@/types/agent';

interface UseAgentReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  usage: AgentUsage;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<AgentUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseStreamChunk = (chunk: string): {
    content?: string;
    toolCall?: Partial<AgentToolCall>;
    usage?: AgentUsage;
  } | null => {
    try {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          return data;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessage: AgentMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const parsed = parseStreamChunk(chunk);
          if (!parsed) continue;

          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];

            if (lastMsg.role === 'assistant') {
              if (parsed.content) {
                lastMsg.content += parsed.content;
              }

              if (parsed.toolCall) {
                const existingToolIndex = lastMsg.toolCalls?.findIndex(
                  tc => tc.id === parsed.toolCall?.id
                );

                if (existingToolIndex !== undefined && existingToolIndex >= 0) {
                  // Update existing tool call
                  if (lastMsg.toolCalls) {
                    lastMsg.toolCalls[existingToolIndex] = {
                      ...lastMsg.toolCalls[existingToolIndex],
                      ...parsed.toolCall,
                    } as AgentToolCall;
                  }
                } else {
                  // Add new tool call
                  if (!lastMsg.toolCalls) lastMsg.toolCalls = [];
                  lastMsg.toolCalls.push({
                    id: parsed.toolCall.id || `tool-${Date.now()}`,
                    name: parsed.toolCall.name || 'unknown',
                    status: parsed.toolCall.status || 'running',
                    input: parsed.toolCall.input || {},
                    result: parsed.toolCall.result,
                    error: parsed.toolCall.error,
                  });
                }
              }

              if (parsed.usage) {
                setUsage(parsed.usage);
              }
            }

            return updated;
          });
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Agent error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message'
      );

      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant' && !lastMsg.content) {
          lastMsg.content = 'Sorry, I encountered an error processing your request.';
        }
        return updated;
      });

      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUsage({ inputTokens: 0, outputTokens: 0, totalCost: 0 });
  }, []);

  return {
    messages,
    isLoading,
    usage,
    sendMessage,
    clearMessages,
  };
}
