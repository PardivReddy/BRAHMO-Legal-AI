import type { AIProviderName } from '@/lib/ai/providers/types';
import { AIProviderError, AIErrorCode, shouldFallbackToAnotherProvider } from '@/lib/ai/utils/errors';

export const PROVIDER_FALLBACK_SEQUENCE: AIProviderName[] = ['gemini', 'openai', 'groq', 'claude', 'local'];

export function getNextProvider(current: AIProviderName): AIProviderName | null {
  const index = PROVIDER_FALLBACK_SEQUENCE.indexOf(current);
  if (index < 0 || index === PROVIDER_FALLBACK_SEQUENCE.length - 1) {
    return null;
  }
  return PROVIDER_FALLBACK_SEQUENCE[index + 1];
}

export function shouldFallbackOnError(error: AIProviderError): boolean {
  return shouldFallbackToAnotherProvider(error.code);
}

export function isProviderEligible(
  provider: AIProviderName,
  availableProviders: AIProviderName[]
): boolean {
  return availableProviders.includes(provider);
}

export function fallbackReason(error: AIProviderError): AIErrorCode {
  return error.code;
}
