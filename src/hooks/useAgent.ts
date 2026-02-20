'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';
import type { AgentMessage, AgentUsage, AgentToolCall, ToolStatus } from '@/types/agent';

// Simplified usage type for frontend state
interface AgentUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

interface UseAgentReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  usage: AgentUsageSummary;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<AgentUsageSummary>({
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      conversationId: 'local', // Frontend-only message, no conversation yet
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
      toolCalls: null,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessage: AgentMessage = {
      id: `assistant-${Date.now()}`,
      conversationId: 'local', // Frontend-only message, no conversation yet
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
      toolCalls: null,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Build message history from current state
      const messageHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetchWithCsrf('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messageHistory
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || 'AI request failed');
      }

      // Update the assistant message with the response
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.content = data.message || '';
        }
        return updated;
      });

      // Update usage if provided (estimated tokens)
      if (data.estimatedInputTokens && data.estimatedOutputTokens) {
        setUsage(prevUsage => ({
          inputTokens: prevUsage.inputTokens + (data.estimatedInputTokens || 0),
          outputTokens: prevUsage.outputTokens + (data.estimatedOutputTokens || 0),
          totalCost: prevUsage.totalCost, // Cost tracking would need backend support
        }));
      }

      setIsLoading(false);
    } catch (error) {
      logger.error('Agent error', error instanceof Error ? error : new Error(String(error)), { component: 'useAgent' });
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
  }, [messages, isLoading, toast]);

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
