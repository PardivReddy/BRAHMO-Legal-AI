import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { AIProviderError, classifyGeminiError, isRetryableError } from '@/lib/ai/utils/errors';
import { logger } from '@/lib/ai/utils/logger';
import { withRetries } from '@/lib/ai/orchestration/retry';
import { estimateTokens } from '@/lib/ai/utils/tokenizer';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { AI_CONFIG } from '@/lib/ai/utils/env';

export const GEMINI_MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] as const;

let geminiClient: GoogleGenerativeAI | undefined;
const modelCache = new Map<string, GenerativeModel>();

function getApiKey(): string {
  const apiKey = AI_CONFIG.geminiApiKey;
  if (!apiKey) {
    throw new AIProviderError('Gemini API key is not configured.', {
      provider: 'gemini',
      code: 'INVALID_KEY',
    });
  }
  return apiKey;
}

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getApiKey());
  }
  return geminiClient;
}

function getModel(modelName: string, systemInstruction?: string): GenerativeModel {
  const cacheKey = `${modelName}:${systemInstruction ?? ''}`;
  const existing = modelCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const model = getClient().getGenerativeModel({
    model: modelName,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  modelCache.set(cacheKey, model);
  return model;
}

function parseGeminiError(error: unknown): AIProviderError {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  const code = classifyGeminiError(error);
  return new AIProviderError(message, {
    provider: 'gemini',
    code,
    original: error,
  });
}

async function executeModel(
  prompt: string,
  modelName: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const model = getModel(modelName, options.systemInstruction);
  const maxOutputTokens = options.maxOutputTokens ?? 8192;
  const temperature = options.temperature ?? 0.35;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });

    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? estimateTokens(prompt);
    const outputTokens = usage?.candidatesTokenCount ?? estimateTokens(text);
    const totalTokens = inputTokens + outputTokens;

    return {
      text,
      model: modelName,
      provider: 'gemini',
      inputTokens,
      outputTokens,
      totalTokens,
    };
  } catch (error: unknown) {
    throw parseGeminiError(error);
  }
}

export class GeminiProvider implements AIProvider {
  public readonly name: AIProviderName = 'gemini';

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.geminiApiKey);
  }

  public async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const modelChain = options.model
      ? [options.model, ...GEMINI_MODEL_CHAIN.filter((model) => model !== options.model)]
      : [...GEMINI_MODEL_CHAIN];

    let lastError: AIProviderError | null = null;

    for (const model of modelChain) {
      try {
        const result = await withRetries(
          () => executeModel(prompt, model, options),
          (error) => isRetryableError(error.code),
          AI_CONFIG.maxRetries,
          AI_CONFIG.baseRetryDelayMs
        );

        return result;
      } catch (error: unknown) {
        if (error instanceof AIProviderError) {
          lastError = error;
          logger.warn('Gemini model failed', {
            provider: 'gemini',
            model,
            errorCode: error.code,
            requestId: options.requestId,
          });

          if (!['DAILY_QUOTA', 'INVALID_KEY', 'CONTEXT_LIMIT', 'SERVER', 'RATE_LIMIT'].includes(error.code)) {
            throw error;
          }

          continue;
        }

        throw parseGeminiError(error);
      }
    }

    throw (
      lastError ?? new AIProviderError('Gemini failed to generate content.', {
        provider: 'gemini',
        code: 'UNKNOWN',
      })
    );
  }
}

export const geminiProvider = new GeminiProvider();
