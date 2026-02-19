export type AgentRole = 'user' | 'assistant' | 'system';
export type ToolStatus = 'running' | 'success' | 'error';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: Date;
  toolCalls?: AgentToolCall[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}
