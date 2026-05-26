import type { AIProviderName } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';
import { logger } from '@/lib/ai/utils/logger';

interface CircuitState {
  failureCount: number;
  disabledUntil: number | null;
}

const circuitState = new Map<AIProviderName, CircuitState>();

function getState(provider: AIProviderName): CircuitState {
  const state = circuitState.get(provider);
  if (state) {
    return state;
  }

  const initial: CircuitState = { failureCount: 0, disabledUntil: null };
  circuitState.set(provider, initial);
  return initial;
}

export function isCircuitOpen(provider: AIProviderName): boolean {
  const state = getState(provider);
  if (!state.disabledUntil) {
    return false;
  }

  if (Date.now() >= state.disabledUntil) {
    state.failureCount = 0;
    state.disabledUntil = null;
    logger.info('Circuit breaker recovered', { provider });
    return false;
  }

  return true;
}

export function recordSuccess(provider: AIProviderName): void {
  const state = getState(provider);
  if (state.failureCount > 0 || state.disabledUntil) {
    logger.info('Circuit breaker reset after success', { provider });
  }
  state.failureCount = 0;
  state.disabledUntil = null;
}

export function recordFailure(provider: AIProviderName): void {
  const state = getState(provider);
  state.failureCount += 1;

  if (state.failureCount >= AI_CONFIG.circuitBreakerFailureThreshold && !state.disabledUntil) {
    state.disabledUntil = Date.now() + AI_CONFIG.circuitBreakerCooldownMs;
    logger.warn('Circuit breaker opened for provider', {
      provider,
      disabledUntil: state.disabledUntil,
      failureCount: state.failureCount,
    });
    return;
  }

  logger.debug('Circuit breaker recorded failure', {
    provider,
    failureCount: state.failureCount,
  });
}
