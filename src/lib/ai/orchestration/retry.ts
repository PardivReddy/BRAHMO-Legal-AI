import { AIProviderError } from '@/lib/ai/utils/errors';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetries<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: AIProviderError) => boolean,
  maxAttempts: number,
  baseDelayMs: number
): Promise<T> {
  let attempt = 0;
  let lastError: AIProviderError | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await operation();
    } catch (error: unknown) {
      if (!(error instanceof AIProviderError)) {
        throw error;
      }

      lastError = error;
      if (!shouldRetry(error) || attempt >= maxAttempts) {
        throw error;
      }

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(backoff * (0.5 + Math.random() * 0.5));
      await sleep(jitter);
    }
  }

  throw lastError ?? new AIProviderError('Retry exhausted without a typed AI error.', {
    provider: 'gemini',
    code: 'UNKNOWN',
  });
}
