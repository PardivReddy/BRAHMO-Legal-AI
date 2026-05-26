import type { AIProviderName } from '@/lib/ai/providers/types';

export type AIErrorCode =
  | 'DAILY_QUOTA'
  | 'RATE_LIMIT'
  | 'CONTEXT_LIMIT'
  | 'SAFETY'
  | 'SERVER'
  | 'NETWORK'
  | 'INVALID_KEY'
  | 'UNKNOWN';

export interface AIErrorDetails {
  code: AIErrorCode;
  provider: AIProviderName;
  statusCode?: number;
  original?: unknown;
}

export class AIProviderError extends Error {
  public readonly code: AIErrorCode;
  public readonly provider: AIProviderName;
  public readonly statusCode?: number;
  public readonly original?: unknown;

  public constructor(message: string, details: AIErrorDetails) {
    super(message);
    this.name = 'AIProviderError';
    this.code = details.code;
    this.provider = details.provider;
    this.statusCode = details.statusCode;
    this.original = details.original;
  }
}

interface KnownErrorShape {
  statusCode?: number;
  code?: string | number;
  message?: string;
  error?: unknown;
  errors?: unknown;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null) {
    const casted = error as KnownErrorShape;
    if (typeof casted.message === 'string') return casted.message;
    if (typeof casted.code === 'string') return String(casted.code);
    if (typeof casted.statusCode === 'number') return `HTTP ${casted.statusCode}`;
  }

  return 'Unknown AI provider error.';
}

function normalizeStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const casted = error as KnownErrorShape;
  if (typeof casted.statusCode === 'number') return casted.statusCode;
  if (typeof casted.code === 'number' && casted.code >= 100 && casted.code < 600) return casted.code;
  return undefined;
}

export function classifyGeminiError(error: unknown): AIErrorCode {
  const message = extractErrorMessage(error).toLowerCase();
  const statusCode = normalizeStatusCode(error);

  if (statusCode === 401 || statusCode === 403) {
    return message.includes('quota') ? 'DAILY_QUOTA' : 'INVALID_KEY';
  }

  if (statusCode === 429 || message.includes('rate limit')) {
    return 'RATE_LIMIT';
  }

  if (statusCode === 413 || statusCode === 422 || /context|prompt.*length|max.*input/i.test(message)) {
    return 'CONTEXT_LIMIT';
  }

  if (statusCode === 403 && /safety|forbidden|disallowed/i.test(message)) {
    return 'SAFETY';
  }

  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return 'SERVER';
  }

  if (/invalid.*key|unauthorized|authentication/i.test(message)) {
    return 'INVALID_KEY';
  }

  if (/network|timeout|connection|dns|fetch/i.test(message)) {
    return 'NETWORK';
  }

  if (/quota|daily quota|exceeded|resource_exhausted/i.test(message)) {
    return 'DAILY_QUOTA';
  }

  return 'UNKNOWN';
}

export function classifyOpenAIError(error: unknown): AIErrorCode {
  const message = extractErrorMessage(error).toLowerCase();
  const statusCode = normalizeStatusCode(error);

  if (statusCode === 401) return 'INVALID_KEY';
  if (statusCode === 429) return 'RATE_LIMIT';
  if (statusCode === 413 || statusCode === 422 || /context|prompt.*length|max.*input/i.test(message)) {
    return 'CONTEXT_LIMIT';
  }
  if (statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return 'SERVER';
  }
  if (/quota|exhausted|resource_exhausted/i.test(message)) return 'DAILY_QUOTA';
  if (/safety|forbidden|disallowed|content/i.test(message)) return 'SAFETY';
  if (/network|timeout|connection|dns|fetch/i.test(message)) return 'NETWORK';
  return 'UNKNOWN';
}

export function classifyClaudeError(error: unknown): AIErrorCode {
  const message = extractErrorMessage(error).toLowerCase();
  const statusCode = normalizeStatusCode(error);

  if (statusCode === 401) return 'INVALID_KEY';
  if (statusCode === 429) return 'RATE_LIMIT';
  if (statusCode === 413 || /context|prompt.*length|max.*input/i.test(message)) return 'CONTEXT_LIMIT';
  if (statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) return 'SERVER';
  if (/quota|exhausted|resource_exhausted/i.test(message)) return 'DAILY_QUOTA';
  if (/safety|forbidden|disallowed|content/i.test(message)) return 'SAFETY';
  if (/network|timeout|connection|dns|fetch/i.test(message)) return 'NETWORK';
  return 'UNKNOWN';
}

export function isRetryableError(code: AIErrorCode): boolean {
  return code === 'NETWORK' || code === 'RATE_LIMIT' || code === 'SERVER';
}

export function shouldFallbackToAnotherProvider(code: AIErrorCode): boolean {
  return code === 'DAILY_QUOTA' || code === 'INVALID_KEY' || code === 'SERVER' || code === 'CONTEXT_LIMIT';
}
