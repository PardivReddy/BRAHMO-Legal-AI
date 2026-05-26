import { AIProviderError, classifyOpenAIError, isRetryableError } from '@/lib/ai/utils/errors';
import { logger } from '@/lib/ai/utils/logger';
import { withRetries } from '@/lib/ai/orchestration/retry';
import { estimateTokens } from '@/lib/ai/utils/tokenizer';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

function getApiKey(): string {
  const apiKey = AI_CONFIG.openAIApiKey;
  if (!apiKey) {
    throw new AIProviderError('OpenAI API key is not configured.', {
      provider: 'openai',
      code: 'INVALID_KEY',
    });
  }
  return apiKey;
}

function buildRequestBody(prompt: string, options: GenerateOptions): Record<string, unknown> {
  const model = options.model ?? DEFAULT_OPENAI_MODEL;
  return {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxOutputTokens ?? 2048,
    temperature: options.temperature ?? 0.4,
  };
}

function parseOpenAIError(error: unknown): AIProviderError {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  const code = classifyOpenAIError(error);
  return new AIProviderError(message, {
    provider: 'openai',
    code,
    original: error,
  });
}

export class OpenAIProvider implements AIProvider {
  public readonly name: AIProviderName = 'openai';

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.openAIApiKey);
  }

  public async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const model = options.model ?? DEFAULT_OPENAI_MODEL;
    const body = buildRequestBody(prompt, options);

    try {
      const response = await withRetries(
        async () => {
          const res = await fetch(OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getApiKey()}`,
            },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const payload = await res.text();
            throw new Error(`OpenAI request failed ${res.status}: ${payload}`);
          }

          const data = (await res.json()) as {
            choices: Array<{ message?: { content?: string }; text?: string }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };

          const text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? '';
          const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt);
          const outputTokens = data.usage?.completion_tokens ?? estimateTokens(text);
          const totalTokens = data.usage?.total_tokens ?? inputTokens + outputTokens;

          return {
            text,
            model,
            provider: 'openai' as const,
            inputTokens,
            outputTokens,
            totalTokens,
          };
        },
        (error) => isRetryableError(error.code),
        AI_CONFIG.maxRetries,
        AI_CONFIG.baseRetryDelayMs
      );

      return response;
    } catch (error: unknown) {
      if (error instanceof AIProviderError) {
        logger.warn('OpenAI provider failed', {
          provider: 'openai',
          model,
          errorCode: error.code,
        });
        throw error;
      }
      throw parseOpenAIError(error);
    }
  }
}

export const openAIProvider = new OpenAIProvider();
