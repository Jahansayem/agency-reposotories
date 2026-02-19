/**
 * AI Agent Types
 *
 * Types for the agent_conversations, agent_messages, and agent_usage tables.
 * Used by the AI conversational agent feature.
 */

export type AgentMessageRole = 'user' | 'assistant' | 'system';

export type ToolCallStatus = 'running' | 'success' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface AgentConversation {
  id: string;
  agencyId: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: AgentMessageRole;
  content: string;
  toolCalls: ToolCall[] | null;
  createdAt: string;
}

export interface AgentUsage {
  id: string;
  agencyId: string;
  userId: string;
  conversationId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  createdAt: string;
}

// Extended types with relationships

export interface AgentConversationWithMessages extends AgentConversation {
  messages: AgentMessage[];
}

export interface AgentConversationWithUsage extends AgentConversation {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
}

// API request/response types

export interface CreateConversationRequest {
  agencyId: string;
  userId: string;
  title?: string;
}

export interface CreateConversationResponse {
  conversation: AgentConversation;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export interface SendMessageResponse {
  userMessage: AgentMessage;
  assistantMessage: AgentMessage;
  usage: AgentUsage;
}

export interface GetConversationHistoryResponse {
  conversation: AgentConversation;
  messages: AgentMessage[];
}

export interface GetUsageStatsRequest {
  agencyId: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetUsageStatsResponse {
  totalTokens: number;
  totalCost: number;
  conversationCount: number;
  messageCount: number;
  byModel: {
    model: string;
    tokens: number;
    cost: number;
    count: number;
  }[];
}
