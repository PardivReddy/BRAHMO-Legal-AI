import type { AIProviderName } from '@/lib/ai/providers/types';
import type { AIErrorCode } from '@/lib/ai/utils/errors';

export interface AIMetricEvent {
  provider: AIProviderName;
  model: string;
  latencyMs: number;
  retries: number;
  fallbackUsed: boolean;
  errorCode?: AIErrorCode;
  tokenUsage?: { input: number; output: number; total: number };
  degraded: boolean;
  requestId?: string;
}

export function logAIMetric(event: AIMetricEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    provider: event.provider,
    model: event.model,
    latencyMs: event.latencyMs,
    retries: event.retries,
    fallbackUsed: event.fallbackUsed,
    errorCode: event.errorCode ?? null,
    tokenUsage: event.tokenUsage ?? null,
    degraded: event.degraded,
    requestId: event.requestId ?? null,
  };

  console.info('[AI][METRIC]', JSON.stringify(payload));
}
