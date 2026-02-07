/**
 * AI API Helper Utilities
 *
 * Centralized helpers for AI-powered API endpoints to reduce boilerplate
 * and ensure consistent error handling, validation, and response formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

// Default model to use across AI endpoints
export const DEFAULT_AI_MODEL = 'claude-sonnet-4-20250514';

// Singleton Anthropic client instance
let anthropicClient: Anthropic | null = null;

/**
 * Get or create a singleton Anthropic client instance.
 * Returns null if API key is not configured.
 */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY is not configured - AI features will be unavailable', {
      component: 'AIHelper',
    });
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}

/**
 * Check if Anthropic API is configured
 */
export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Validation options for AI requests
 */
export interface ValidationOptions {
  /** Require a JSON body to be present (default: true) */
  requireBody?: boolean;
  /** List of required fields in the request body */
  requiredFields?: string[];
  /** Custom validation function for additional checks */
  customValidator?: (body: Record<string, unknown>) => string | null;
}

/**
 * Result of request validation
 */
export type ValidationResult =
  | { valid: true; body: Record<string, unknown> }
  | { valid: false; response: NextResponse };

/**
 * Validate an incoming AI request.
 * Returns either a validated body or an error response.
 */
export async function validateAiRequest(
  request: NextRequest,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const { requireBody = true, requiredFields = [], customValidator } = options;

  // Try to parse the request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    if (requireBody) {
      return {
        valid: false,
        response: aiErrorResponse('Invalid JSON in request body', 400),
      };
    }
    body = {};
  }

  // Check required fields
  for (const field of requiredFields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      return {
        valid: false,
        response: aiErrorResponse(`${field} is required`, 400),
      };
    }
  }

  // Run custom validator if provided
  if (customValidator) {
    const error = customValidator(body);
    if (error) {
      return {
        valid: false,
        response: aiErrorResponse(error, 400),
      };
    }
  }

  return { valid: true, body };
}

/**
 * Options for calling Claude API
 */
export interface CallClaudeOptions {
  /** System prompt for context setting */
  systemPrompt?: string;
  /** User message to send */
  userMessage: string;
  /** Maximum tokens in response (default: 1024) */
  maxTokens?: number;
  /** Model to use (default: DEFAULT_AI_MODEL) */
  model?: string;
  /** Component name for logging */
  component?: string;
}

/**
 * Result of a Claude API call
 */
export type ClaudeCallResult =
  | { success: true; content: string }
  | { success: false; error: string };

/**
 * Call Claude API with standardized error handling.
 */
export async function callClaude(options: CallClaudeOptions): Promise<ClaudeCallResult> {
  const {
    systemPrompt,
    userMessage,
    maxTokens = 1024,
    model = DEFAULT_AI_MODEL,
    component = 'AIEndpoint',
  } = options;

  const client = getAnthropicClient();
  if (!client) {
    return { success: false, error: 'AI service not configured' };
  }

  // AI-TIMEOUT-001: 30-second timeout for all AI calls to prevent hanging requests
  const AI_TIMEOUT_MS = 30000; // 30 seconds

  try {
    const messageOptions: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userMessage }],
    };

    // Only add system prompt if provided
    if (systemPrompt) {
      messageOptions.system = systemPrompt;
    }

    // AI-TIMEOUT-001: Race the API call against a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI request timed out after ${AI_TIMEOUT_MS}ms`));
      }, AI_TIMEOUT_MS);
    });

    const message = await Promise.race([
      client.messages.create(messageOptions),
      timeoutPromise,
    ]);

    // Extract text content from response
    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      logger.error('No text response from AI', undefined, { component });
      return { success: false, error: 'No text response from AI' };
    }

    return { success: true, content: textContent.text };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // AI-TIMEOUT-001: Log timeout errors specially for monitoring
    if (errorMessage.includes('timed out')) {
      logger.error('Claude API timeout', error, {
        component,
        timeoutMs: AI_TIMEOUT_MS,
        model,
        maxTokens,
      });
    } else {
      logger.error('Claude API call failed', error, { component, details: errorMessage });
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Safely parse JSON from AI response text.
 * Handles responses that may be wrapped in markdown code blocks.
 *
 * @param content The raw text response from Claude
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseAiJsonResponse<T = Record<string, unknown>>(
  content: string
): T | null {
  try {
    // Try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

/**
 * Create a standardized error response for AI endpoints.
 *
 * @param message User-facing error message
 * @param status HTTP status code (default: 500)
 * @param details Optional internal details (not exposed to client in production)
 */
export function aiErrorResponse(
  message: string,
  status = 500,
  details?: string
): NextResponse {
  const body: { success: false; error: string; details?: string } = {
    success: false,
    error: message,
  };

  // Only include details in development
  if (details && process.env.NODE_ENV === 'development') {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}

/**
 * Create a standardized success response for AI endpoints.
 *
 * @param data Response data to include
 */
export function aiSuccessResponse<T extends object>(
  data: T
): NextResponse {
  return NextResponse.json({
    success: true,
    ...data,
  });
}

/**
 * Common validation functions for reuse
 */
export const validators = {
  /**
   * Validate that a field is a non-empty string
   */
  isNonEmptyString: (value: unknown): boolean =>
    typeof value === 'string' && value.trim().length > 0,

  /**
   * Validate that a field is a valid priority
   */
  isValidPriority: (value: unknown): value is 'low' | 'medium' | 'high' | 'urgent' =>
    typeof value === 'string' && ['low', 'medium', 'high', 'urgent'].includes(value),

  /**
   * Validate that a field is a valid array of strings (like user list)
   */
  isStringArray: (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string'),

  /**
   * Sanitize and validate priority, returning 'medium' as default
   */
  sanitizePriority: (value: unknown): 'low' | 'medium' | 'high' | 'urgent' =>
    validators.isValidPriority(value) ? value : 'medium',

  /**
   * Clamp estimated minutes to valid range
   */
  clampEstimatedMinutes: (value: unknown, min = 5, max = 480): number | undefined => {
    if (typeof value !== 'number') return undefined;
    return Math.min(Math.max(value, min), max);
  },
};

/**
 * Common date helpers for AI endpoints
 */
export const dateHelpers = {
  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayISO: (): string => new Date().toISOString().split('T')[0],

  /**
   * Get current day of week
   */
  getDayOfWeek: (): string =>
    new Date().toLocaleDateString('en-US', { weekday: 'long' }),

  /**
   * Format a user list for prompts
   */
  formatUserList: (users: unknown): string => {
    if (Array.isArray(users) && users.length > 0) {
      return users.filter((u) => typeof u === 'string').join(', ');
    }
    return 'no team members registered';
  },
};

/**
 * Subtask interface used across multiple AI endpoints
 */
export interface ParsedSubtask {
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedMinutes?: number;
}

/**
 * Validate and sanitize an array of subtasks from AI response
 */
export function validateSubtasks(
  subtasks: unknown,
  maxCount = 10
): ParsedSubtask[] {
  if (!Array.isArray(subtasks)) return [];

  const mapped = subtasks.slice(0, maxCount).map((subtask: unknown): ParsedSubtask | null => {
    if (typeof subtask !== 'object' || subtask === null) return null;

    const s = subtask as Record<string, unknown>;
    const text = typeof s.text === 'string' ? s.text.trim().slice(0, 200) : '';
    if (!text) return null;

    return {
      text,
      priority: validators.sanitizePriority(s.priority),
      estimatedMinutes: validators.clampEstimatedMinutes(s.estimatedMinutes),
    };
  });

  return mapped.filter((s): s is ParsedSubtask => s !== null);
}

/**
 * Higher-order function to wrap AI endpoint handlers with standard error handling
 */
export function withAiErrorHandling(
  component: string,
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in ${component}`, error, { component, details: errorMessage });
      return aiErrorResponse(
        'An unexpected error occurred. Please try again.',
        500,
        errorMessage
      );
    }
  };
}
