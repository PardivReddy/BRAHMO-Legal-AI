import { AIProviderError, classifyOpenAIError, isRetryableError } from '@/lib/ai/utils/errors';
import { logger } from '@/lib/ai/utils/logger';
import { withRetries } from '@/lib/ai/orchestration/retry';
import { estimateTokens } from '@/lib/ai/utils/tokenizer';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

function getApiKey(): string {
  const apiKey = AI_CONFIG.openAIApiKey ?? process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
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
    return Boolean(AI_CONFIG.openAIApiKey ?? process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  }

  public async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    // If caller passed a Gemini-specific model name (e.g., during fallback),
    // map it to a compatible OpenAI model from config to avoid 404s.
    const requestedModel = options.model ?? DEFAULT_OPENAI_MODEL;
    const model = /^gemini/i.test(String(requestedModel))
      ? AI_CONFIG.openAIModelChain[0]
      : requestedModel;
    const body = buildRequestBody(prompt, { ...options, model });

    try {
      const response = await withRetries(
        async () => {
          try {
            // First try the Chat Completions endpoint
            let res = await fetch(OPENAI_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getApiKey()}`,
              },
              body: JSON.stringify(body),
            });

            let textPayload = await res.text();

            // If Chat Completions endpoint is not found, try Responses API
            if (res.status === 404) {
              logger.info('OpenAI chat endpoint returned 404; trying responses API');
              const responsesBody = {
                model,
                input: prompt,
                max_tokens: options.maxOutputTokens ?? 2048,
                temperature: options.temperature ?? 0.4,
              };

              res = await fetch(OPENAI_RESPONSES_ENDPOINT, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${getApiKey()}`,
                },
                body: JSON.stringify(responsesBody),
              });

              textPayload = await res.text();
            }

            if (!res.ok) {
              let parsed: unknown = textPayload;
              try {
                parsed = JSON.parse(textPayload);
              } catch {
                // keep raw text
              }

              const code = classifyOpenAIError({ message: textPayload, statusCode: res.status });
              logger.error('OpenAI HTTP error', { status: res.status, body: parsed });
              throw new AIProviderError(`OpenAI request failed ${res.status}`, {
                provider: 'openai',
                code,
                statusCode: res.status,
                original: parsed,
              });
            }

            const data = (textPayload ? JSON.parse(textPayload) : {}) as any;

            // Normalize text from either Chat Completions or Responses API
            let text = '';
            if (data.choices && data.choices[0]) {
              text = data.choices[0]?.message?.content ?? data.choices[0]?.text ?? '';
            } else if (data.output && data.output[0]) {
              // Responses API: join content pieces
              const first = data.output[0];
              if (Array.isArray(first.content)) {
                text = first.content.map((c: any) => c.text ?? c?.[0]?.text ?? '').join('');
              } else if (typeof first.content === 'string') {
                text = first.content;
              } else {
                text = String(first);
              }
            }

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
          } catch (err: unknown) {
            if (err instanceof AIProviderError) throw err;
            // Wrap network / parsing errors as typed provider errors so retry logic works
            throw parseOpenAIError(err);
          }
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
        logger.debug('OpenAI provider failure details', { original: error.original });
        throw error;
      }
      const parsed = parseOpenAIError(error);
      logger.error('OpenAI provider unexpected failure', { err: String(error) });
      throw parsed;
    }
  }
}

export const openAIProvider = new OpenAIProvider();
