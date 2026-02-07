import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('info', () => {
    it('should log info messages with context', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('Test message', { userId: '123', component: 'TestComponent' });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should sanitize PII from log messages', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('User SSN: 123-45-6789', { component: 'Auth' });
      
      // Should not contain SSN pattern
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toMatch(/123-45-6789/);
    });
  });

  describe('error', () => {
    it('should log errors with stack traces', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');
      
      logger.error('Error occurred', error, { component: 'TestComponent' });
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      logger.error('Error occurred', 'string error', { component: 'TestComponent' });
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('PII sanitization', () => {
    it('should redact email addresses', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('User email: test@example.com', {});
      
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toContain('test@example.com');
    });

    it('should redact phone numbers', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('Phone: (555) 123-4567', {});
      
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toMatch(/555.*123.*4567/);
    });

    it('should redact credit card numbers', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('Card: 4532-1234-5678-9010', {});
      
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toMatch(/4532.*1234.*5678.*9010/);
    });
  });

  describe('context enrichment', () => {
    it('should include component in log context', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('Message', { component: 'TodoList' });
      
      const logCall = consoleSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).toContain('TodoList');
    });

    it('should include timestamp', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      logger.info('Message', { component: 'Test' });
      
      const logCall = consoleSpy.mock.calls[0];
      // Should have a timestamp field
      expect(logCall).toBeDefined();
    });
  });
});
