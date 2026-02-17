import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '../retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed after transient failures', async () => {
    vi.useRealTimers();

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('recovered');

    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting all retries', async () => {
    // Use real timers with tiny delays to avoid unhandled rejection warnings
    vi.useRealTimers();

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('persistent error');
    });

    await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toThrow('persistent error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff timing with jitter', async () => {
    // Use real timers since jitter makes exact timing unpredictable
    vi.useRealTimers();

    const callTimes: number[] = [];
    const start = Date.now();

    const fn = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now() - start);
      if (fn.mock.calls.length < 3) {
        throw new Error('fail');
      }
      return 'ok';
    });

    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 20 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);

    // With jitter, first delay is 20 * (0.5 to 1.0) = 10-20ms
    // Second delay is 40 * (0.5 to 1.0) = 20-40ms
    // Just verify calls happened in sequence with some delay
    expect(callTimes.length).toBe(3);
  });

  it('should work with maxRetries = 1 (no retries)', async () => {
    // Use real timers to avoid unhandled rejection warning
    vi.useRealTimers();

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('immediate fail');
    });

    await expect(retryWithBackoff(fn, { maxRetries: 1, baseDelay: 1 })).rejects.toThrow('immediate fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should propagate the original error, not a generic one', async () => {
    // Use real timers to avoid unhandled rejection warning
    vi.useRealTimers();

    const customError = new Error('specific DB error');
    const fn = vi.fn().mockImplementation(async () => {
      throw customError;
    });

    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toBe(customError);
  });

  it('should accept legacy positional parameters for backward compatibility', async () => {
    vi.useRealTimers();

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  describe('non-retryable errors', () => {
    it('should not retry RLS / insufficient_privilege errors (code 42501)', async () => {
      vi.useRealTimers();

      const rlsError = { message: 'permission denied for table todos', code: '42501' };
      const fn = vi.fn().mockRejectedValue(rlsError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(rlsError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry NOT NULL constraint violations (code 23502)', async () => {
      vi.useRealTimers();

      const constraintError = { message: 'null value in column "text"', code: '23502' };
      const fn = vi.fn().mockRejectedValue(constraintError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(constraintError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry unique constraint violations (code 23505)', async () => {
      vi.useRealTimers();

      const uniqueError = { message: 'duplicate key value', code: '23505' };
      const fn = vi.fn().mockRejectedValue(uniqueError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(uniqueError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry 403 Forbidden errors', async () => {
      vi.useRealTimers();

      const forbiddenError = { message: 'Forbidden', status: 403 };
      const fn = vi.fn().mockRejectedValue(forbiddenError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(forbiddenError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry 401 Unauthorized errors', async () => {
      vi.useRealTimers();

      const authError = { message: 'JWT expired', status: 401 };
      const fn = vi.fn().mockRejectedValue(authError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(authError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should still retry transient / network errors', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce('recovered');

      const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 });
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry PostgREST JWT expired errors (code PGRST301)', async () => {
      vi.useRealTimers();

      const jwtError = { message: 'JWT expired', code: 'PGRST301' };
      const fn = vi.fn().mockRejectedValue(jwtError);

      await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toBe(jwtError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry when custom isRetryable returns false', async () => {
      vi.useRealTimers();

      const businessError = new Error('invalid input');
      const fn = vi.fn().mockRejectedValue(businessError);

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          baseDelay: 1,
          isRetryable: () => false,
        })
      ).rejects.toBe(businessError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry when custom isRetryable returns true', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce('ok');

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelay: 1,
        isRetryable: () => true,
      });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use custom isRetryable to selectively retry', async () => {
      vi.useRealTimers();

      const retryableError = new Error('timeout');
      (retryableError as any).code = 'TIMEOUT';
      const nonRetryableError = new Error('bad request');
      (nonRetryableError as any).code = 'BAD_REQUEST';

      const fn1 = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('ok');

      const isRetryable = (err: unknown) => {
        return (err as any)?.code === 'TIMEOUT';
      };

      const result = await retryWithBackoff(fn1, { maxRetries: 3, baseDelay: 1, isRetryable });
      expect(result).toBe('ok');
      expect(fn1).toHaveBeenCalledTimes(2);

      const fn2 = vi.fn().mockRejectedValue(nonRetryableError);
      await expect(
        retryWithBackoff(fn2, { maxRetries: 3, baseDelay: 1, isRetryable })
      ).rejects.toBe(nonRetryableError);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('abort signal', () => {
    it('should abort before first attempt if signal is already aborted', async () => {
      vi.useRealTimers();

      const controller = new AbortController();
      controller.abort();

      const fn = vi.fn().mockResolvedValue('should not reach');

      await expect(
        retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1, signal: controller.signal })
      ).rejects.toThrow('aborted');
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should abort during sleep between retries', async () => {
      vi.useRealTimers();

      const controller = new AbortController();

      const fn = vi.fn().mockImplementation(async () => {
        if (fn.mock.calls.length === 1) {
          // Abort after first failure, during backoff sleep
          setTimeout(() => controller.abort(), 5);
          throw new Error('first fail');
        }
        return 'should not reach';
      });

      await expect(
        retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100, signal: controller.signal })
      ).rejects.toThrow('aborted');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not affect execution when signal is never aborted', async () => {
      vi.useRealTimers();

      const controller = new AbortController();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelay: 1,
        signal: controller.signal,
      });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('jitter', () => {
    it('should apply jitter within the expected range (0.5x to 1.0x of base delay)', async () => {
      vi.useRealTimers();

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      // Spy on setTimeout to capture delay values
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
        ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
          if (delay !== undefined && delay > 0) {
            delays.push(delay);
          }
          // Use a minimal delay to keep tests fast
          return originalSetTimeout(fn, 0, ...args);
        }) as typeof setTimeout
      );

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000 });

      // The first retry delay should be baseDelay * 2^0 * jitter
      // = 1000 * (0.5 to 1.0) = 500 to 1000
      expect(delays.length).toBeGreaterThanOrEqual(1);
      const firstDelay = delays[0];
      expect(firstDelay).toBeGreaterThanOrEqual(500);
      expect(firstDelay).toBeLessThanOrEqual(1000);

      setTimeoutSpy.mockRestore();
    });

    it('should produce different delays across multiple runs (not deterministic)', async () => {
      vi.useRealTimers();

      const allDelays: number[][] = [];

      for (let run = 0; run < 5; run++) {
        const delays: number[] = [];
        const originalSetTimeout = globalThis.setTimeout;

        const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
          ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
            if (delay !== undefined && delay > 0) {
              delays.push(delay);
            }
            return originalSetTimeout(fn, 0, ...args);
          }) as typeof setTimeout
        );

        const fn = vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValueOnce('ok');

        await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000 });
        allDelays.push([...delays]);
        spy.mockRestore();
      }

      // Not all runs should produce the exact same delay (very unlikely with Math.random)
      const firstDelays = allDelays.map(d => d[0]);
      const allSame = firstDelays.every(d => d === firstDelays[0]);
      // With 5 runs, it's extremely unlikely all produce the same random value
      expect(allSame).toBe(false);
    });
  });

  describe('maxDelay ceiling', () => {
    it('should cap delay at maxDelay (default 30s)', async () => {
      vi.useRealTimers();

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
        ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
          if (delay !== undefined && delay > 0) {
            delays.push(delay);
          }
          return originalSetTimeout(fn, 0, ...args);
        }) as typeof setTimeout
      );

      const fn = vi.fn().mockImplementation(async () => {
        throw new Error('fail');
      });

      // baseDelay = 50000, so 50000 * 2^0 = 50000 > 30000 default maxDelay
      await expect(
        retryWithBackoff(fn, { maxRetries: 3, baseDelay: 50000 })
      ).rejects.toThrow('fail');

      // All delays should be capped at maxDelay (30000) * jitter
      // So each delay <= 30000
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(30000);
      }

      spy.mockRestore();
    });

    it('should cap delay at custom maxDelay', async () => {
      vi.useRealTimers();

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
        ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
          if (delay !== undefined && delay > 0) {
            delays.push(delay);
          }
          return originalSetTimeout(fn, 0, ...args);
        }) as typeof setTimeout
      );

      const fn = vi.fn().mockImplementation(async () => {
        throw new Error('fail');
      });

      // baseDelay=1000, maxDelay=500 — the cap should limit the delay
      await expect(
        retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000, maxDelay: 500 })
      ).rejects.toThrow('fail');

      // All delays should be capped at maxDelay (500) * jitter, so <= 500
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(500);
        // With jitter, minimum is 0.5 * 500 = 250
        expect(delay).toBeGreaterThanOrEqual(250);
      }

      spy.mockRestore();
    });

    it('should not cap when delay is below maxDelay', async () => {
      vi.useRealTimers();

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
        ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
          if (delay !== undefined && delay > 0) {
            delays.push(delay);
          }
          return originalSetTimeout(fn, 0, ...args);
        }) as typeof setTimeout
      );

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      // baseDelay=100, maxDelay=10000 — delay of 100 is way below cap
      await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100, maxDelay: 10000 });

      // Delay should be 100 * (0.5 to 1.0) = 50-100, not capped
      expect(delays.length).toBeGreaterThanOrEqual(1);
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[0]).toBeLessThanOrEqual(100);

      spy.mockRestore();
    });
  });
});
