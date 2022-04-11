const DEFAULT_MAX_RETRY_COUNT = 5;
const DEFAULT_MAXIMUM_BACKOFF_MS = 32 * 1000;

interface RetryOptions {
  maxBackoffMs?: number;
  maxRetryCount?: number;
  retryOn: (error: unknown) => boolean;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Retry an async function when it throws an error, if the error passes the `retryOn` predicate
 */
export async function retryPromise<T>(
  callback: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxRetryCount = options.maxRetryCount ?? DEFAULT_MAX_RETRY_COUNT;

  let count = 0;

  while (true) {
    try {
      return await callback();
    } catch (e) {
      if (count >= maxRetryCount) {
        throw e;
      }

      if (options.retryOn(e)) {
        const jitter = Math.floor(Math.random() * 500);

        const waitTime = Math.min(
          Math.pow(2, count) * 100 + jitter,
          options.maxBackoffMs ?? DEFAULT_MAXIMUM_BACKOFF_MS
        );

        await wait(waitTime);

        count++;
        continue;
      }

      throw e;
    }
  }
}
