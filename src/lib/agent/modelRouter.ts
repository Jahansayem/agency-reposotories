/**
 * AI Model Router
 *
 * Selects the appropriate Claude model based on request complexity.
 */

export type ClaudeModel = 'claude-3-5-haiku-20241022' | 'claude-3-5-sonnet-20241022';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Select Claude model based on conversation complexity
 *
 * Strategy:
 * - Haiku (fast, cheap): Simple queries, reads, searches
 * - Sonnet (powerful): Writes, bulk operations, complex analysis
 */
export function selectModel(messages: Message[]): ClaudeModel {
  // Default to Haiku for performance
  let model: ClaudeModel = 'claude-3-5-haiku-20241022';

  // Get the last user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage || typeof lastUserMessage.content !== 'string') {
    return model;
  }

  const content = lastUserMessage.content.toLowerCase();

  // Upgrade to Sonnet for write operations
  const writePatterns = [
    'create',
    'add',
    'new task',
    'schedule',
    'update',
    'change',
    'edit',
    'delete',
    'remove',
    'bulk',
    'multiple',
    'draft email',
  ];

  if (writePatterns.some(pattern => content.includes(pattern))) {
    model = 'claude-3-5-sonnet-20241022';
  }

  // Upgrade to Sonnet for complex analysis
  const complexPatterns = [
    'analyze',
    'compare',
    'summarize',
    'recommend',
    'strategy',
    'optimize',
    'prioritize',
    'forecast',
  ];

  if (complexPatterns.some(pattern => content.includes(pattern))) {
    model = 'claude-3-5-sonnet-20241022';
  }

  // Upgrade to Sonnet for multi-step operations
  if (content.includes(' and ') || content.includes(' then ')) {
    model = 'claude-3-5-sonnet-20241022';
  }

  return model;
}

/**
 * Get model display name for logging
 */
export function getModelDisplayName(model: ClaudeModel): string {
  return model.includes('haiku') ? 'Claude 3.5 Haiku' : 'Claude 3.5 Sonnet';
}
