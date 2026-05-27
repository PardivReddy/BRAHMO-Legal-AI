import OpenAI from 'openai';
import { AIProviderError, classifyGroqError, isRetryableError } from '@/lib/ai/utils/errors';
import { logger } from '@/lib/ai/utils/logger';
import { withRetries } from '@/lib/ai/orchestration/retry';
import { estimateTokens } from '@/lib/ai/utils/tokenizer';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 20000;

let groqClient: OpenAI | undefined;

function getApiKey(): string {
  const apiKey = AI_CONFIG.groqApiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AIProviderError('Groq API key is not configured.', {
      provider: 'groq',
      code: 'INVALID_KEY',
    });
  }
  return apiKey;
}

function getClient(): OpenAI {
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: getApiKey(),
      baseURL: GROQ_BASE_URL,
    });
  }
  return groqClient;
}

function parseGroqError(error: unknown): AIProviderError {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  const code = classifyGroqError(error);
  return new AIProviderError(message, {
    provider: 'groq',
    code,
    original: error,
  });
}

async function executeGroq(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const model = options.model ?? DEFAULT_GROQ_MODEL;
  const maxOutputTokens = options.maxOutputTokens ?? 2048;
  const temperature = options.temperature ?? 0.35;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  console.log('[GROQ] Starting generation', {
    model,
    requestId: options.requestId,
    promptLength: prompt.length,
    groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
  });

  try {
    const response = await getClient().chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxOutputTokens,
        temperature,
        user: options.requestId,
      },
      { signal: controller.signal }
    );

    const firstChoice = response.choices?.[0] as any;
    const text =
      (firstChoice?.message?.content as string | undefined) ??
      (firstChoice?.text as string | undefined) ??
      '';

    console.log('[GROQ] Response received', {
      model,
      textLength: text.length,
      usage: response.usage,
      choiceCount: response.choices?.length ?? 0,
    });

    const inputTokens = response.usage?.prompt_tokens ?? estimateTokens(prompt);
    const outputTokens = response.usage?.completion_tokens ?? estimateTokens(text);
    const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens;

    return {
      text,
      model,
      provider: 'groq',
      inputTokens,
      outputTokens,
      totalTokens,
    };
  } catch (error: unknown) {
    console.log('[GROQ] Error:', error);
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || /aborted|timeout|timed out/i.test(error.message))
    ) {
      throw new AIProviderError('Groq request timed out.', {
        provider: 'groq',
        code: 'NETWORK',
        original: error,
      });
    }

    throw parseGroqError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export class GroqProvider implements AIProvider {
  public readonly name: AIProviderName = 'groq';

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.groqApiKey ?? process.env.GROQ_API_KEY);
  }

  public async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const model = options.model ?? DEFAULT_GROQ_MODEL;

    try {
      const result = await withRetries(
        () => executeGroq(prompt, { ...options, model }),
        (error) => isRetryableError(error.code),
        AI_CONFIG.maxRetries,
        AI_CONFIG.baseRetryDelayMs
      );

      logger.info('Groq generation successful', {
        provider: 'groq',
        model: result.model,
        requestId: options.requestId,
      });

      return result;
    } catch (error: unknown) {
      if (error instanceof AIProviderError) {
        logger.warn('Groq provider failed', {
          provider: 'groq',
          model,
          errorCode: error.code,
          requestId: options.requestId,
        });
        throw error;
      }
      throw parseGroqError(error);
    }
  }
}

export const groqProvider = new GroqProvider();
