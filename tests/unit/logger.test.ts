import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry with actual function implementations BEFORE importing logger
vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

// Import logger after mocking Sentry
import { logger, withErrorLogging } from '@/lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test message', { userId: '123' });

      expect(console.info).toHaveBeenCalledWith(
        '[INFO] Test message',
        { userId: '123' }
      );
    });
  });

  describe('warn', () => {
    it('should log warnings', () => {
      logger.warn('Warning message', { component: 'TestComponent' });

      expect(console.warn).toHaveBeenCalledWith(
        '[WARN] Warning message',
        { component: 'TestComponent' }
      );
    });

    it('should send breadcrumb to Sentry', () => {
      logger.warn('Warning message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'warning',
          message: 'Warning message',
          level: 'warning',
        })
      );
    });
  });

  describe('error', () => {
    it('should log errors', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { action: 'testAction' });

      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Error occurred',
        error,
        { action: 'testAction' }
      );
    });

    it('should capture exception in Sentry', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { component: 'TestComponent' });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'TestComponent',
          }),
        })
      );
    });
  });

  describe('performance', () => {
    it('should log slow operations as warnings', () => {
      logger.performance('SlowOperation', 2000, { component: 'Test' });

      expect(console.warn).toHaveBeenCalled();
    });

    it('should start and measure timer', () => {
      const timer = logger.startTimer();
      const duration = timer();

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('withErrorLogging', () => {
    it('should wrap function and log errors', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      const wrapped = withErrorLogging(fn, {
        component: 'Test',
        action: 'testAction',
      });

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should return result on success', async () => {
      const fn = async () => 'success';

      const wrapped = withErrorLogging(fn, {
        component: 'Test',
        action: 'testAction',
      });

      const result = await wrapped();
      expect(result).toBe('success');
    });
  });
});
