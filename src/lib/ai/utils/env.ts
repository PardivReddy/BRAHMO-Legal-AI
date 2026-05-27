import type { AIProviderName } from '@/lib/ai/providers/types';

export interface AIEnvConfig {
  geminiApiKey?: string;
  openAIApiKey?: string;
  groqApiKey?: string;
  claudeApiKey?: string;
  openAIModelChain: readonly string[];
  claudeModelChain: readonly string[];
  maxDailyRequests: number;
  maxDailyTokens: number;
  providerRequestLimit: number;
  providerTokenLimit: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerCooldownMs: number;
  maxRetries: number;
  baseRetryDelayMs: number;
}

const DEFAULT_OPENAI_MODEL_CHAIN = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] as const;
const DEFAULT_CLAUDE_MODEL_CHAIN = ['claude-3.5', 'claude-3'] as const;

export const AI_CONFIG: AIEnvConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  openAIApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  claudeApiKey: process.env.CLAUDE_API_KEY,
  openAIModelChain: DEFAULT_OPENAI_MODEL_CHAIN,
  claudeModelChain: DEFAULT_CLAUDE_MODEL_CHAIN,
  maxDailyRequests: Number(process.env.AI_MAX_DAILY_REQUESTS ?? 1000),
  maxDailyTokens: Number(process.env.AI_MAX_DAILY_TOKENS ?? 200_000),
  providerRequestLimit: Number(process.env.AI_PROVIDER_REQUEST_LIMIT ?? 500),
  providerTokenLimit: Number(process.env.AI_PROVIDER_TOKEN_LIMIT ?? 100_000),
  circuitBreakerFailureThreshold: Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD ?? 5),
  circuitBreakerCooldownMs: Number(process.env.AI_CIRCUIT_COOLDOWN_MS ?? 600_000),
  maxRetries: Number(process.env.AI_MAX_RETRIES ?? 3),
  baseRetryDelayMs: Number(process.env.AI_BASE_RETRY_DELAY_MS ?? 1000),
};

export const PROVIDER_MODEL_OVERRIDES: Partial<Record<AIProviderName, readonly string[]>> = {
  openai: DEFAULT_OPENAI_MODEL_CHAIN,
  claude: DEFAULT_CLAUDE_MODEL_CHAIN,
};

export const ENV_SCHEMA_DESCRIPTION = {
  GEMINI_API_KEY: 'Google Gemini API key for Gemini provider.',
  GOOGLE_GENERATIVE_AI_API_KEY: 'Alternative Google Gemini key name.',
  OPENAI_API_KEY: 'OpenAI API key for fallback provider.',
  GROQ_API_KEY: 'Groq API key for fallback provider.',
  CLAUDE_API_KEY: 'Anthropic Claude API key for fallback provider.',
  AI_MAX_DAILY_REQUESTS: 'Maximum total AI requests per day across all providers.',
  AI_MAX_DAILY_TOKENS: 'Maximum total AI tokens per day across all providers.',
  AI_PROVIDER_REQUEST_LIMIT: 'Maximum requests per provider per day.',
  AI_PROVIDER_TOKEN_LIMIT: 'Maximum tokens per provider per day.',
  AI_CIRCUIT_FAILURE_THRESHOLD: 'Consecutive provider failures before circuit opens.',
  AI_CIRCUIT_COOLDOWN_MS: 'Milliseconds a provider circuit remains open.',
  AI_MAX_RETRIES: 'Maximum retry attempts for retryable failures.',
  AI_BASE_RETRY_DELAY_MS: 'Base delay in ms for exponential backoff retries.',
};

export function getProviderEnvStatus(): Record<AIProviderName, boolean> {
  return {
    gemini: Boolean(AI_CONFIG.geminiApiKey),
    openai: Boolean(AI_CONFIG.openAIApiKey),
    groq: Boolean(AI_CONFIG.groqApiKey),
    claude: Boolean(AI_CONFIG.claudeApiKey),
    local: false,
  };
}
