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
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('recovered');

    const promise = retryWithBackoff(fn, 3, 1000);

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting all retries', async () => {
    // Use real timers with tiny delays to avoid unhandled rejection warnings
    vi.useRealTimers();

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('persistent error');
    });

    await expect(retryWithBackoff(fn, 3, 1)).rejects.toThrow('persistent error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff timing', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('ok');

    const promise = retryWithBackoff(fn, 3, 100);

    // First call happens immediately
    expect(fn).toHaveBeenCalledTimes(1);

    // First retry after 100ms (100 * 2^0)
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should work with maxRetries = 1 (no retries)', async () => {
    // Use real timers to avoid unhandled rejection warning
    vi.useRealTimers();

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('immediate fail');
    });

    await expect(retryWithBackoff(fn, 1, 1)).rejects.toThrow('immediate fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should propagate the original error, not a generic one', async () => {
    // Use real timers to avoid unhandled rejection warning
    vi.useRealTimers();

    const customError = new Error('specific DB error');
    const fn = vi.fn().mockImplementation(async () => {
      throw customError;
    });

    await expect(retryWithBackoff(fn, 2, 1)).rejects.toBe(customError);
  });

  describe('non-retryable errors', () => {
    it('should not retry RLS / insufficient_privilege errors (code 42501)', async () => {
      vi.useRealTimers();

      const rlsError = { message: 'permission denied for table todos', code: '42501' };
      const fn = vi.fn().mockRejectedValue(rlsError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(rlsError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry NOT NULL constraint violations (code 23502)', async () => {
      vi.useRealTimers();

      const constraintError = { message: 'null value in column "text"', code: '23502' };
      const fn = vi.fn().mockRejectedValue(constraintError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(constraintError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry unique constraint violations (code 23505)', async () => {
      vi.useRealTimers();

      const uniqueError = { message: 'duplicate key value', code: '23505' };
      const fn = vi.fn().mockRejectedValue(uniqueError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(uniqueError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry 403 Forbidden errors', async () => {
      vi.useRealTimers();

      const forbiddenError = { message: 'Forbidden', status: 403 };
      const fn = vi.fn().mockRejectedValue(forbiddenError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(forbiddenError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry 401 Unauthorized errors', async () => {
      vi.useRealTimers();

      const authError = { message: 'JWT expired', status: 401 };
      const fn = vi.fn().mockRejectedValue(authError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(authError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should still retry transient / network errors', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce('recovered');

      const result = await retryWithBackoff(fn, 3, 1);
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry PostgREST JWT expired errors (code PGRST301)', async () => {
      vi.useRealTimers();

      const jwtError = { message: 'JWT expired', code: 'PGRST301' };
      const fn = vi.fn().mockRejectedValue(jwtError);

      await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(jwtError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
