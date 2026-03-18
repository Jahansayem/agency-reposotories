/**
 * Auto-retry utility with exponential backoff for network operations.
 *
 * Retries a given async function up to maxRetries times, doubling the
 * delay between each attempt (baseDelay * 2^attempt) with jitter.
 *
 * Non-retryable errors (auth failures, RLS violations, constraint errors)
 * are thrown immediately without retry.
 */

const NON_RETRYABLE_CODES = new Set([
  '42501',    // RLS / insufficient_privilege
  '23502',    // not_null_violation
  '23505',    // unique_violation
  '23503',    // foreign_key_violation
  '42P01',    // undefined_table
  'PGRST301', // PostgREST JWT expired
]);

function defaultIsRetryable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return true;
  const e = error as Record<string, unknown>;
  if (typeof e.code === 'string' && NON_RETRYABLE_CODES.has(e.code)) return false;
  const status = typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : null;
  if (status !== null && (status === 401 || status === 403 || status === 404 || status === 422)) return false;
  return true;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  /** Maximum delay ceiling in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Custom function to determine if an error is retryable (default: retry on network/5xx errors only) */
  isRetryable?: (error: unknown) => boolean;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetriesOrOptions: number | RetryOptions = 3,
  baseDelay = 1000
): Promise<T> => {
  let maxRetries: number;
  let maxDelay: number;
  let isRetryable: (error: unknown) => boolean;
  let signal: AbortSignal | undefined;

  if (typeof maxRetriesOrOptions === 'object') {
    maxRetries = maxRetriesOrOptions.maxRetries ?? 3;
    baseDelay = maxRetriesOrOptions.baseDelay ?? 1000;
    maxDelay = maxRetriesOrOptions.maxDelay ?? 30000;
    isRetryable = maxRetriesOrOptions.isRetryable ?? defaultIsRetryable;
    signal = maxRetriesOrOptions.signal;
  } else {
    maxRetries = maxRetriesOrOptions;
    maxDelay = 30000;
    isRetryable = defaultIsRetryable;
  }

  for (let i = 0; i < maxRetries; i++) {
    // Check for abort before each attempt
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1 || !isRetryable(error)) throw error;

      // Exponential backoff with jitter, capped at maxDelay
      const exponentialDelay = baseDelay * Math.pow(2, i);
      const cappedDelay = Math.min(exponentialDelay, maxDelay);
      const jitteredDelay = cappedDelay * (0.5 + Math.random() * 0.5);

      await abortableSleep(jitteredDelay, signal);
    }
  }
  // Unreachable: loop always returns or throws, but satisfies TypeScript
  throw new Error('Max retries exceeded');
};
