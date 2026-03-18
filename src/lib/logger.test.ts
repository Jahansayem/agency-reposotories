/**
 * Unit tests for unified logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, LogLevel } from './logger';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

describe('UnifiedLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console spies
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Basic logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { userId: '123' });
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message', { action: 'test' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { component: 'test' });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message', new Error('Test error'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('PII Redaction', () => {
    it('should redact passwords from context', () => {
      logger.info('User login', { password: 'secret123' });

      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[REDACTED]');
      expect(call).not.toContain('secret123');
    });

    it('should redact API keys from context', () => {
      logger.info('API call', { api_key: 'sk-123456' });

      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[REDACTED]');
      expect(call).not.toContain('sk-123456');
    });

    it('should redact tokens from context', () => {
      logger.info('Auth', { token: 'abc123xyz' });

      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[REDACTED]');
      expect(call).not.toContain('abc123xyz');
    });

    it('should redact SSN from messages', () => {
      logger.info('Customer SSN is 123-45-6789');

      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('123-45-6789');
      expect(call).toContain('[SSN REDACTED]');
    });

    it('should redact credit card numbers from messages', () => {
      logger.info('Card number: 4111-1111-1111-1111');

      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('4111-1111-1111-1111');
      expect(call).toContain('[CARD REDACTED]');
    });

    it('should redact email addresses from messages', () => {
      logger.info('Email: john.doe@example.com');

      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('john.doe@example.com');
      expect(call).toContain('[EMAIL REDACTED]');
    });

    it('should handle nested object redaction', () => {
      logger.info('User data', {
        user: {
          name: 'John',
          password: 'secret',
          credentials: {
            api_key: 'sk-123'
          }
        }
      });

      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('secret');
      expect(call).not.toContain('sk-123');
      expect(call).toContain('[REDACTED]');
    });

    it('should truncate very long strings', () => {
      const longString = 'a'.repeat(2000);
      logger.info(longString);

      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[TRUNCATED]');
      expect(call.length).toBeLessThan(longString.length);
    });

    it('should limit array size', () => {
      const largeArray = Array(200).fill('item');
      logger.info('Large array', { items: largeArray });

      // Should not throw or hang
      expect(console.info).toHaveBeenCalled();
    });

    it('should prevent infinite recursion with depth limit', () => {
      const circular: any = { level: 0 };
      circular.child = { level: 1, parent: circular };

      // Should not throw or hang
      logger.info('Circular reference', circular);
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('Sentry Integration', () => {
    it('should send breadcrumb for warnings', () => {
      logger.warn('Warning message', { component: 'test' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'warning',
          level: 'warning',
        })
      );
    });

    it('should send exception for errors', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should send breadcrumb for security events', () => {
      logger.security('Failed login', { ip: '1.2.3.4' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'security',
          level: 'warning',
        })
      );
    });
  });

  describe('Specialized logging methods', () => {
    it('should log API requests', () => {
      logger.apiRequest('POST', '/api/todos', {
        userId: '123',
        statusCode: 200,
        duration: 150,
      });

      expect(console.info).toHaveBeenCalled();
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('POST /api/todos');
      expect(call).toContain('api_request');
    });

    it('should log AI calls', () => {
      logger.aiCall('claude', {
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(console.info).toHaveBeenCalled();
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('AI Call: claude');
      expect(call).toContain('ai_call');
    });

    it('should log security events', () => {
      logger.security('Suspicious activity', {
        ip: '1.2.3.4',
        endpoint: '/api/admin',
      });

      expect(console.warn).toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });
  });

  describe('Performance logging', () => {
    it('should log slow operations as warnings', () => {
      logger.performance('Database query', 1500);

      expect(console.warn).toHaveBeenCalled();
      const call = (console.warn as any).mock.calls[0][0];
      expect(call).toContain('1500ms');
    });

    it('should create working performance timers', () => {
      const timer = logger.startTimer();

      // Simulate some work
      const duration = timer();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(typeof duration).toBe('number');
    });
  });

  describe('Error handling', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(console.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should handle non-Error values', () => {
      logger.error('String error', 'Something went wrong');

      expect(console.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should handle undefined errors', () => {
      logger.error('Error with no details');

      expect(console.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('Structured logging format', () => {
    it('should produce JSON output in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.info('Test message', { userId: '123' });

      const call = (console.info as any).mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(call)).not.toThrow();

      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.userId).toBe('123');
      expect(parsed.timestamp).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should produce human-readable output in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.info('Test message', { userId: '123' });

      const call = (console.info as any).mock.calls[0][0];

      // Should contain [INFO] prefix
      expect(call).toContain('[INFO]');
      expect(call).toContain('Test message');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Sensitive field detection', () => {
    const sensitiveFields = [
      'password',
      'pin',
      'pin_hash',
      'token',
      'api_key',
      'apikey',
      'secret',
      'authorization',
      'auth',
      'credentials',
      'credit_card',
      'ssn',
      'social_security',
      'cookie',
      'private_key',
      'secret_key',
    ];

    sensitiveFields.forEach(field => {
      it(`should redact ${field} field`, () => {
        logger.info('Sensitive data', { [field]: 'sensitive-value' });

        const call = (console.info as any).mock.calls[0][0];
        expect(call).not.toContain('sensitive-value');
        expect(call).toContain('[REDACTED]');
      });
    });

    it('should allow CSRF tokens (exception)', () => {
      logger.info('Request', { csrf_token: 'csrf-123' });

      const call = (console.info as any).mock.calls[0][0];
      // CSRF tokens should NOT be redacted (they're safe to log)
      expect(call).toContain('csrf-123');
    });
  });
});
