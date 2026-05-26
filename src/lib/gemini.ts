/**
 * Google Gemini client for BRAHMO Legal AI.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { estimateTokens, trackUsage } from '@/lib/token-manager';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';

const DEFAULT_TEMPERATURE = 0.35;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      '[BRAHMO Gemini] Missing GEMINI_API_KEY environment variable. Set it in .env.local.'
    );
  }

  return apiKey;
}

let geminiClient: GoogleGenerativeAI | undefined;
const modelCache = new Map<string, GenerativeModel>();

export const geminiModel: GenerativeModel | null = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  ? getModel(GEMINI_MODEL_NAME)
  : null;

export function getGeminiStatus(): { configured: boolean; model: string; envName?: string } {
  if (process.env.GEMINI_API_KEY) {
    return { configured: true, model: GEMINI_MODEL_NAME, envName: 'GEMINI_API_KEY' };
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { configured: true, model: GEMINI_MODEL_NAME, envName: 'GOOGLE_GENERATIVE_AI_API_KEY' };
  }

  return { configured: false, model: GEMINI_MODEL_NAME };
}

export function assertGeminiConfigured(): void {
  if (!getGeminiStatus().configured) {
    throw new Error('Gemini is not configured. Add GEMINI_API_KEY to .env.local before generation.');
  }
}

export function getModel(
  modelName: string = GEMINI_MODEL_NAME,
  systemInstruction?: string
): GenerativeModel {
  const cacheKey = `${modelName}:${systemInstruction ?? ''}`;
  const cached = modelCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const model = getClient().getGenerativeModel({
    model: modelName,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  modelCache.set(cacheKey, model);
  return model;
}

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getApiKey());
  }

  return geminiClient;
}

export async function generateContent(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const {
    model: modelName = GEMINI_MODEL_NAME,
    temperature = DEFAULT_TEMPERATURE,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    systemInstruction,
  } = options;

  const model = getModel(modelName, systemInstruction);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
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

      trackUsage(modelName, inputTokens, outputTokens);

      return {
        text,
        model: modelName,
        inputTokens,
        outputTokens,
        totalTokens,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(error) || attempt === MAX_RETRIES - 1) {
        break;
      }

      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  throw new Error(
    `[BRAHMO Gemini] Generation failed for ${modelName}: ${lastError?.message ?? 'unknown error'}`
  );
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  if (message.includes('rate limit') || message.includes('quota')) {
    return true;
  }

  return Array.from(RETRYABLE_STATUS_CODES).some((statusCode) =>
    message.includes(String(statusCode))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
