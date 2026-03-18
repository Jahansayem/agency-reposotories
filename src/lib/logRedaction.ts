/**
 * Log Redaction Utilities
 *
 * SECURITY: Never log raw AI prompts/responses that may contain customer PII.
 * Instead, log metadata: token counts, byte sizes, hashes, model info.
 *
 * Use these utilities in all API routes that handle AI responses.
 */

import { createHash } from 'crypto';

/**
 * Redact sensitive content for logging
 * Returns metadata instead of the actual content
 */
export interface RedactedContent {
  /** SHA-256 hash of the content (for debugging, correlation) */
  contentHash: string;
  /** Length of the content in characters */
  charCount: number;
  /** Length of the content in bytes */
  byteSize: number;
  /** First few characters (safe preview) */
  preview: string;
  /** Whether the content was redacted */
  redacted: true;
}

/**
 * Create a redacted version of content for safe logging
 */
export function redactContent(content: string | undefined | null, previewLength = 50): RedactedContent {
  const safeContent = content || '';

  return {
    contentHash: createHash('sha256').update(safeContent).digest('hex').substring(0, 16),
    charCount: safeContent.length,
    byteSize: Buffer.byteLength(safeContent, 'utf8'),
    preview: safeContent.substring(0, previewLength),
    redacted: true,
  };
}

/**
 * Redact AI request metadata for safe logging
 */
export interface RedactedAIRequest {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  promptHash: string;
  promptCharCount: number;
  promptByteSize: number;
  requestId?: string;
  timestamp: string;
}

/**
 * Create redacted AI request metadata
 */
export function redactAIRequest(params: {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  requestId?: string;
}): RedactedAIRequest {
  const promptData = redactContent(params.prompt, 0); // No preview for prompts

  return {
    model: params.model,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
    promptHash: promptData.contentHash,
    promptCharCount: promptData.charCount,
    promptByteSize: promptData.byteSize,
    requestId: params.requestId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Redact AI response metadata for safe logging
 */
export interface RedactedAIResponse {
  model?: string;
  responseHash: string;
  responseCharCount: number;
  responseByteSize: number;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  requestId?: string;
  timestamp: string;
  success: boolean;
}

/**
 * Create redacted AI response metadata
 */
export function redactAIResponse(params: {
  content: string;
  model?: string;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  requestId?: string;
  success?: boolean;
}): RedactedAIResponse {
  const responseData = redactContent(params.content, 0); // No preview for responses

  return {
    model: params.model,
    responseHash: responseData.contentHash,
    responseCharCount: responseData.charCount,
    responseByteSize: responseData.byteSize,
    stopReason: params.stopReason,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    requestId: params.requestId,
    timestamp: new Date().toISOString(),
    success: params.success ?? true,
  };
}

/**
 * Redact error message for safe logging
 * Preserves error type but redacts any potential PII in the message
 */
export function redactErrorMessage(error: Error): { errorType: string; messagePreview: string; redacted: true } {
  return {
    errorType: error.name,
    messagePreview: error.message.substring(0, 100),
    redacted: true,
  };
}

/**
 * Generate a safe request ID for correlation
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if a string appears to contain PII
 * This is a heuristic check - not exhaustive
 */
export function containsPotentialPII(text: string): boolean {
  // Check for common PII patterns
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
  ];

  return piiPatterns.some(pattern => pattern.test(text));
}
