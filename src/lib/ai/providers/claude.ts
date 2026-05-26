import { AIProviderError, classifyClaudeError, isRetryableError } from '@/lib/ai/utils/errors';
import { logger } from '@/lib/ai/utils/logger';
import { withRetries } from '@/lib/ai/orchestration/retry';
import { estimateTokens } from '@/lib/ai/utils/tokenizer';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';

const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/complete';
const DEFAULT_CLAUDE_MODEL = 'claude-3.5';

function getApiKey(): string {
  const apiKey = AI_CONFIG.claudeApiKey;
  if (!apiKey) {
    throw new AIProviderError('Claude API key is not configured.', {
      provider: 'claude',
      code: 'INVALID_KEY',
    });
  }
  return apiKey;
}

function buildRequestBody(prompt: string, options: GenerateOptions): Record<string, unknown> {
  const model = options.model ?? DEFAULT_CLAUDE_MODEL;
  return {
    model,
    prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
    max_tokens_to_sample: options.maxOutputTokens ?? 2048,
    temperature: options.temperature ?? 0.4,
    stop_sequences: ['\n\nHuman:'],
  };
}

function parseClaudeError(error: unknown): AIProviderError {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  const code = classifyClaudeError(error);
  return new AIProviderError(message, {
    provider: 'claude',
    code,
    original: error,
  });
}

export class ClaudeProvider implements AIProvider {
  public readonly name: AIProviderName = 'claude';

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.claudeApiKey);
  }

  public async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const model = options.model ?? DEFAULT_CLAUDE_MODEL;
    const body = buildRequestBody(prompt, options);

    try {
      const result = await withRetries(
        async () => {
          const res = await fetch(CLAUDE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getApiKey()}`,
            },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const payload = await res.text();
            throw new Error(`Claude request failed ${res.status}: ${payload}`);
          }

          const data = (await res.json()) as {
            completion: string;
            stop_reason?: string;
            metadata?: unknown;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };

          const text = data.completion ?? '';
          const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt);
          const outputTokens = data.usage?.completion_tokens ?? estimateTokens(text);
          const totalTokens = data.usage?.total_tokens ?? inputTokens + outputTokens;

          return {
            text,
            model,
            provider: 'claude' as const,
            inputTokens,
            outputTokens,
            totalTokens,
          };
        },
        (error) => isRetryableError(error.code),
        AI_CONFIG.maxRetries,
        AI_CONFIG.baseRetryDelayMs
      );

      return result;
    } catch (error: unknown) {
      if (error instanceof AIProviderError) {
        logger.warn('Claude provider failed', {
          provider: 'claude',
          model,
          errorCode: error.code,
        });
        throw error;
      }
      throw parseClaudeError(error);
    }
  }
}

export const claudeProvider = new ClaudeProvider();
