import type { AIProviderName } from '@/lib/ai/providers/types';

export interface ProviderMetrics {
  requests: {
    total: number;
    success: number;
    failures: number;
    retries: number;
    fallbacks: number;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: {
    average: number;
    p95: number;
    max: number;
  };
  timeouts?: {
    total?: number;
    perProvider?: boolean;
  };
  circuitBreaker?: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure?: string;
  };
}

export interface AIStatus {
  configuredProviders: AIProviderName[];
  availableProviders: AIProviderName[];
  activeProvider: AIProviderName | null;
  degradedMode: boolean;
  quotaState: 'normal' | 'warning' | 'exhausted';
  fallbackActivity: boolean;
  startupReady: boolean;
  deploymentReady: boolean;
}