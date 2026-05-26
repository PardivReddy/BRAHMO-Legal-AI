import { logger } from '@/lib/ai/utils/logger';
import { logAIMetric } from '@/lib/ai/utils/metrics';
import { canUseProvider, getQuotaStatus, recordUsage } from '@/lib/ai/orchestration/quota-manager';
import { isCircuitOpen, recordFailure, recordSuccess } from '@/lib/ai/orchestration/circuit-breaker';
import { ensurePromptWithinLimit } from '@/lib/ai/orchestration/context-manager';
import { shouldFallbackOnError, PROVIDER_FALLBACK_SEQUENCE } from '@/lib/ai/orchestration/fallback';
import { AIProviderError } from '@/lib/ai/utils/errors';
import { geminiProvider } from '@/lib/ai/providers/gemini';
import { openAIProvider } from '@/lib/ai/providers/openai';
import { claudeProvider } from '@/lib/ai/providers/claude';
import { localProvider } from '@/lib/ai/providers/local';
import type {
  AIProvider,
  AIProviderName,
  GenerateOptions,
  GenerateResult,
} from '@/lib/ai/providers/types';
import { ProviderMetrics } from '@/lib/ai/orchestration/types';
import { AI_CONFIG, getProviderEnvStatus } from '@/lib/ai/utils/env';

const providerRegistry: Record<AIProviderName, AIProvider> = {
  gemini: geminiProvider,
  openai: openAIProvider,
  claude: claudeProvider,
  local: localProvider,
};

const globalContainer = globalThis as typeof globalThis & {
  __BRAHMO_AI_PROVIDER_METRICS__?: Map<AIProviderName, ProviderMetrics>;
  __BRAHMO_AI_PROVIDER_WRAPPER_CACHE__?: Map<AIProviderName, AIProvider>;
};

const providerWrapperCache =
  globalContainer.__BRAHMO_AI_PROVIDER_WRAPPER_CACHE__ ??
  new Map<AIProviderName, AIProvider>();

const providerMetrics =
  globalContainer.__BRAHMO_AI_PROVIDER_METRICS__ ??
  new Map<AIProviderName, ProviderMetrics>();

globalContainer.__BRAHMO_AI_PROVIDER_WRAPPER_CACHE__ = providerWrapperCache;
globalContainer.__BRAHMO_AI_PROVIDER_METRICS__ = providerMetrics;

function initializeProviderMetrics(provider: AIProviderName): ProviderMetrics {
  const metrics: ProviderMetrics = {
    requests: { total: 0, success: 0, failures: 0, retries: 0, fallbacks: 0 },
    tokens: { prompt: 0, completion: 0, total: 0 },
    latency: { average: 0, p95: 0, max: 0 },
  };
  providerMetrics.set(provider, metrics);
  return metrics;
}

export function getActiveProviderMetrics(): Record<AIProviderName, ProviderMetrics> {
  const result: Partial<Record<AIProviderName, ProviderMetrics>> = {};

  // Initialize metrics for all known providers
  (['gemini', 'openai', 'claude', 'local'] as AIProviderName[]).forEach(provider => {
    result[provider] = providerMetrics.get(provider) || initializeProviderMetrics(provider);
  });
  return result as Record<AIProviderName, ProviderMetrics>;
}

export interface OrchestratorOptions extends GenerateOptions {
  preferredProviders?: AIProviderName[];
}

function buildRequestId(): string {
  return `ai-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function getAIStatus() {
  const providers = getProviderEnvStatus();

  // Derive lists in both legacy and new shapes for backward compatibility
  const configuredProviders = (Object.keys(providers) as Array<keyof typeof providers>).filter(
    (k) => providers[k]
  ) as AIProviderName[];

  const availableProviders = configuredProviders.filter((p) => providerRegistry[p]?.isAvailable());

  // Least-surprise defaults (kept for older consumers)
  const defaults = {
    geminiModelChain: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    openAIModelChain: AI_CONFIG.openAIModelChain,
    claudeModelChain: AI_CONFIG.claudeModelChain,
  };

  return {
    // legacy fields
    configured: configuredProviders.length > 0,
    providers,
    defaults,

    // new richer status shape used by health endpoints and tooling
    configuredProviders,
    availableProviders,
    activeProvider: availableProviders.length > 0 ? availableProviders[0] : null,
    degradedMode: availableProviders.length < configuredProviders.length,
    quotaState: 'normal' as const,
    fallbackActivity: false,
    startupReady: true,
    deploymentReady: true,
  };
}

export function assertAIConfigured(): void {
  if (!getAIStatus().configured) {
    throw new Error('No AI provider is configured. Add GEMINI_API_KEY, OPENAI_API_KEY, or CLAUDE_API_KEY.');
  }
}

function createProviderWrapper(provider: AIProvider): AIProvider {
  const metrics = initializeProviderMetrics(provider.name);

  return {
    name: provider.name,
    isAvailable: provider.isAvailable.bind(provider),
    generate: async (prompt: string, options?: GenerateOptions) => {
      const startTime = Date.now();
      metrics.requests.total++;

      try {
        const result = await provider.generate(prompt, options);
        const duration = Date.now() - startTime;

        // Update success metrics
        metrics.requests.success++;
        metrics.tokens.prompt += result.inputTokens;
        metrics.tokens.completion += result.outputTokens;
        metrics.tokens.total += result.totalTokens;

        // Update latency metrics
        metrics.latency.average =
          (metrics.latency.average * (metrics.requests.success - 1) + duration) /
          metrics.requests.success;
        metrics.latency.max = Math.max(metrics.latency.max, duration);

        return result;
      } catch (error) {
        metrics.requests.failures++;
        throw error;
      }
    },
  };
}

export async function generateContent(
  prompt: string,
  options: OrchestratorOptions = {}
): Promise<GenerateResult> {
  const requestId = options.requestId ?? buildRequestId();
  const normalized = ensurePromptWithinLimit(prompt);
  const orderedProviders = options.preferredProviders ?? PROVIDER_FALLBACK_SEQUENCE;
  let lastError: AIProviderError | null = null;

  for (const providerName of orderedProviders) {
    const provider = providerWrapperCache.get(providerName) ?? createProviderWrapper(providerRegistry[providerName]);
    providerWrapperCache.set(providerName, provider);

    if (!provider.isAvailable()) {
      logger.debug('Provider skipped because unavailable', { provider: providerName, requestId });
      continue;
    }

    if (isCircuitOpen(providerName)) {
      logger.warn('Provider circuit open, skipping provider', { provider: providerName, requestId });
      continue;
    }

    if (!canUseProvider(providerName)) {
      logger.warn('Provider quota exhausted, skipping provider', { provider: providerName, requestId });
      continue;
    }

    try {
      const start = Date.now();
      const result = await provider.generate(normalized.prompt, {
        ...options,
        requestId,
      });

      recordSuccess(providerName);
      recordUsage(providerName, result.totalTokens);

      logAIMetric({
        provider: providerName,
        model: result.model,
        latencyMs: Date.now() - start,
        retries: 0,
        fallbackUsed: false,
        tokenUsage: {
          input: result.inputTokens,
          output: result.outputTokens,
          total: result.totalTokens,
        },
        degraded: Boolean(result.degraded),
        requestId,
      });

      return result;
    } catch (error: unknown) {
      if (!(error instanceof AIProviderError)) {
        logger.error('Unexpected AI error', { provider: providerName, requestId, error: String(error) });
        lastError = new AIProviderError('Unexpected provider failure.', {
          provider: providerName,
          code: 'UNKNOWN',
          original: error,
        });
      } else {
        lastError = error;
      }

      recordFailure(providerName);
      logAIMetric({
        provider: providerName,
        model: options.model ?? 'unknown',
        latencyMs: 0,
        retries: 0,
        fallbackUsed: shouldFallbackOnError(lastError),
        errorCode: lastError.code,
        degraded: false,
        requestId,
      });

      if (!shouldFallbackOnError(lastError) || providerName === 'local') {
        break;
      }

      logger.info('Falling back to next provider', {
        provider: providerName,
        reason: lastError.code,
        requestId,
      });
    }
  }

  const degradedText = 'AI services are temporarily unavailable.';
  logger.error('All AI providers failed or were unavailable', { requestId, lastError: lastError?.message });

  return {
    text: degradedText,
    model: 'none',
    provider: null,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    degraded: true,
  };
}

export function getQuotaSummary() {
  return getQuotaStatus();
}

