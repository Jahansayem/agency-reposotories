/**
 * Unit tests for log redaction utilities
 */

import { describe, it, expect } from 'vitest';
import {
  redactContent,
  redactAIRequest,
  redactAIResponse,
  redactErrorMessage,
  generateRequestId,
  containsPotentialPII,
} from '../lib/logRedaction';

describe('logRedaction', () => {
  describe('redactContent', () => {
    it('should redact content and return metadata', () => {
      const content = 'This is sensitive customer data with PII';
      const redacted = redactContent(content);

      expect(redacted.redacted).toBe(true);
      expect(redacted.charCount).toBe(content.length);
      expect(redacted.byteSize).toBe(Buffer.byteLength(content, 'utf8'));
      expect(redacted.contentHash).toHaveLength(16);
      expect(redacted.preview).toBe('This is sensitive customer data with PII');
    });

    it('should handle custom preview length', () => {
      const content = 'This is a very long string that should be truncated';
      const redacted = redactContent(content, 10);

      expect(redacted.preview).toBe('This is a ');
      expect(redacted.charCount).toBe(content.length);
    });

    it('should handle null/undefined content', () => {
      const redacted1 = redactContent(null);
      const redacted2 = redactContent(undefined);

      expect(redacted1.charCount).toBe(0);
      expect(redacted1.byteSize).toBe(0);
      expect(redacted2.charCount).toBe(0);
      expect(redacted2.byteSize).toBe(0);
    });

    it('should generate consistent hashes for same content', () => {
      const content = 'Test content';
      const hash1 = redactContent(content).contentHash;
      const hash2 = redactContent(content).contentHash;

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = redactContent('Content A').contentHash;
      const hash2 = redactContent('Content B').contentHash;

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('redactAIRequest', () => {
    it('should redact AI request with all metadata', () => {
      const request = {
        prompt: 'Analyze this customer data: John Doe, 555-1234',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1000,
        temperature: 0.7,
        requestId: 'req_123',
      };

      const redacted = redactAIRequest(request);

      expect(redacted.model).toBe('claude-3-5-sonnet-20241022');
      expect(redacted.maxTokens).toBe(1000);
      expect(redacted.temperature).toBe(0.7);
      expect(redacted.requestId).toBe('req_123');
      expect(redacted.promptHash).toBeDefined();
      expect(redacted.promptCharCount).toBe(request.prompt.length);
      expect(redacted.timestamp).toBeDefined();
      // Prompt should NOT be in the redacted object
      expect(JSON.stringify(redacted)).not.toContain('John Doe');
      expect(JSON.stringify(redacted)).not.toContain('555-1234');
    });

    it('should handle minimal request info', () => {
      const request = {
        prompt: 'Simple prompt',
      };

      const redacted = redactAIRequest(request);

      expect(redacted.promptHash).toBeDefined();
      expect(redacted.promptCharCount).toBe(13);
      expect(redacted.model).toBeUndefined();
    });
  });

  describe('redactAIResponse', () => {
    it('should redact AI response with all metadata', () => {
      const response = {
        content: '{"name": "John Doe", "phone": "555-1234"}',
        model: 'claude-3-5-sonnet-20241022',
        stopReason: 'end_turn',
        inputTokens: 150,
        outputTokens: 50,
        requestId: 'req_123',
        success: true,
      };

      const redacted = redactAIResponse(response);

      expect(redacted.model).toBe('claude-3-5-sonnet-20241022');
      expect(redacted.stopReason).toBe('end_turn');
      expect(redacted.inputTokens).toBe(150);
      expect(redacted.outputTokens).toBe(50);
      expect(redacted.requestId).toBe('req_123');
      expect(redacted.success).toBe(true);
      expect(redacted.responseHash).toBeDefined();
      expect(redacted.responseCharCount).toBe(response.content.length);
      // Response content should NOT be in the redacted object
      expect(JSON.stringify(redacted)).not.toContain('John Doe');
      expect(JSON.stringify(redacted)).not.toContain('555-1234');
    });

    it('should default success to true', () => {
      const response = {
        content: 'Some response',
      };

      const redacted = redactAIResponse(response);

      expect(redacted.success).toBe(true);
    });
  });

  describe('redactErrorMessage', () => {
    it('should redact error message while preserving type', () => {
      const error = new Error('Failed to parse customer data for John Doe at 123 Main St');
      const redacted = redactErrorMessage(error);

      expect(redacted.errorType).toBe('Error');
      expect(redacted.redacted).toBe(true);
      // Message is 57 chars, so preview should be 57 (not 100 - it truncates longer messages)
      expect(redacted.messagePreview.length).toBeLessThanOrEqual(100);
      expect(redacted.messagePreview).toContain('Failed to parse');
    });

    it('should handle short error messages', () => {
      const error = new Error('Short error');
      const redacted = redactErrorMessage(error);

      expect(redacted.messagePreview).toBe('Short error');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('containsPotentialPII', () => {
    it('should detect SSN', () => {
      expect(containsPotentialPII('My SSN is 123-45-6789')).toBe(true);
      expect(containsPotentialPII('No PII here')).toBe(false);
    });

    it('should detect phone numbers', () => {
      expect(containsPotentialPII('Call me at 555-123-4567')).toBe(true);
      expect(containsPotentialPII('No phone number')).toBe(false);
    });

    it('should detect email addresses', () => {
      expect(containsPotentialPII('Email: john.doe@example.com')).toBe(true);
      expect(containsPotentialPII('No email here')).toBe(false);
    });

    it('should detect credit card numbers', () => {
      expect(containsPotentialPII('Card: 4532-1234-5678-9010')).toBe(true);
      expect(containsPotentialPII('Card: 4532123456789010')).toBe(true);
      expect(containsPotentialPII('No card number')).toBe(false);
    });

    it('should handle multiple PII types', () => {
      const text = 'Contact John Doe at john@example.com or 555-1234, SSN: 123-45-6789';
      expect(containsPotentialPII(text)).toBe(true);
    });
  });
});
