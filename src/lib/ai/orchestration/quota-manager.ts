import type { AIProviderName } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';
import { logger } from '@/lib/ai/utils/logger';

interface ProviderUsage {
  requests: number;
  tokens: number;
}

interface DailyQuotaState {
  date: string;
  requests: number;
  tokens: number;
  providers: Record<AIProviderName, ProviderUsage>;
}

const state: DailyQuotaState = {
  date: new Date().toISOString().slice(0, 10),
  requests: 0,
  tokens: 0,
  providers: {
    gemini: { requests: 0, tokens: 0 },
    openai: { requests: 0, tokens: 0 },
    claude: { requests: 0, tokens: 0 },
    local: { requests: 0, tokens: 0 },
  },
};

function ensureToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (state.date !== today) {
    state.date = today;
    state.requests = 0;
    state.tokens = 0;
    for (const provider of Object.keys(state.providers) as AIProviderName[]) {
      state.providers[provider] = { requests: 0, tokens: 0 };
    }
    logger.info('Daily quota state reset for new day', { date: today });
  }
}

export function canUseProvider(provider: AIProviderName): boolean {
  ensureToday();
  const providerUsage = state.providers[provider];
  if (!providerUsage) {
    return false;
  }

  if (state.requests >= AI_CONFIG.maxDailyRequests) {
    return false;
  }

  if (state.tokens >= AI_CONFIG.maxDailyTokens) {
    return false;
  }

  if (providerUsage.requests >= AI_CONFIG.providerRequestLimit) {
    return false;
  }

  if (providerUsage.tokens >= AI_CONFIG.providerTokenLimit) {
    return false;
  }

  return true;
}

export function recordUsage(provider: AIProviderName, tokens: number): void {
  ensureToday();
  state.requests += 1;
  state.tokens += tokens;
  state.providers[provider].requests += 1;
  state.providers[provider].tokens += tokens;

  logger.info('AI quota recorded', {
    provider,
    quotaTokens: tokens,
    dailyRequests: state.requests,
    dailyTokens: state.tokens,
    providerRequests: state.providers[provider].requests,
    providerTokens: state.providers[provider].tokens,
  });
}

export function getQuotaStatus() {
  ensureToday();
  return {
    date: state.date,
    requests: state.requests,
    tokens: state.tokens,
    providers: state.providers,
    limits: {
      maxDailyRequests: AI_CONFIG.maxDailyRequests,
      maxDailyTokens: AI_CONFIG.maxDailyTokens,
      providerRequestLimit: AI_CONFIG.providerRequestLimit,
      providerTokenLimit: AI_CONFIG.providerTokenLimit,
    },
  };
}
