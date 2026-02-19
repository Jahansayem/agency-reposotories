/**
 * AI Agent Module Exports
 *
 * Central export point for all AI agent functionality.
 */

// Context building
export { getAgencyContext } from './context';
export type { ViewContext } from './context';

// Model selection
export { selectModel, getModelDisplayName } from './modelRouter';
export type { ClaudeModel } from './modelRouter';

// Usage tracking
export {
  trackTokenUsage,
  checkTokenBudget,
  getUsageStats,
} from './usage';
export type { TokenUsage, BudgetStatus } from './usage';

// Tools will be added in a future iteration when implementing full tool support
